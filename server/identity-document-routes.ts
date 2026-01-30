import { Router, Request, Response } from "express";
import { db } from "./db";
import { identityDocuments, identityVerificationSettings, identities, users } from "@shared/schema";
import { eq, desc, and, or, isNull, sql, gte, lte } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";
import OpenAI from "openai";

const router = Router();
const objectStorageService = new ObjectStorageService();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

const DOCUMENT_TYPES = ['carta_identita', 'patente', 'passaporto', 'permesso_soggiorno'] as const;

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const adminRoles = ['super_admin', 'gestore', 'gestore_covisione'];
  if (!adminRoles.includes(req.session.role || '')) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

router.get("/api/identity-documents/upload-urls", requireAuth, async (req: Request, res: Response) => {
  try {
    const documentType = req.query.documentType as string || 'carta_identita';
    const needsBack = documentType !== 'passaporto';
    const needsSelfie = req.query.selfie === 'true';

    const frontUploadUrl = await objectStorageService.getObjectEntityUploadURL();
    const frontPath = objectStorageService.normalizeObjectEntityPath(frontUploadUrl);

    let backUploadUrl = null;
    let backPath = null;
    if (needsBack) {
      backUploadUrl = await objectStorageService.getObjectEntityUploadURL();
      backPath = objectStorageService.normalizeObjectEntityPath(backUploadUrl);
    }

    let selfieUploadUrl = null;
    let selfiePath = null;
    if (needsSelfie) {
      selfieUploadUrl = await objectStorageService.getObjectEntityUploadURL();
      selfiePath = objectStorageService.normalizeObjectEntityPath(selfieUploadUrl);
    }

    res.json({
      front: { uploadUrl: frontUploadUrl, objectPath: frontPath },
      back: needsBack ? { uploadUrl: backUploadUrl, objectPath: backPath } : null,
      selfie: needsSelfie ? { uploadUrl: selfieUploadUrl, objectPath: selfiePath } : null,
    });
  } catch (error) {
    console.error("[Identity Documents] Error generating upload URLs:", error);
    res.status(500).json({ error: "Failed to generate upload URLs" });
  }
});

router.post("/api/identity-documents", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const {
      documentType,
      documentNumber,
      frontImageUrl,
      backImageUrl,
      selfieImageUrl,
      issuingCountry,
      issuingAuthority,
      issueDate,
      expiryDate,
      enableOcr,
    } = req.body;

    if (!DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ error: "Invalid document type" });
    }

    if (!frontImageUrl) {
      return res.status(400).json({ error: "Front image is required" });
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]?.identityId) {
      return res.status(400).json({ error: "User identity not found" });
    }

    const identityId = user[0].identityId;

    const existingDocs = await db.select()
      .from(identityDocuments)
      .where(and(
        eq(identityDocuments.identityId, identityId),
        or(
          eq(identityDocuments.verificationStatus, 'pending'),
          eq(identityDocuments.verificationStatus, 'under_review'),
          eq(identityDocuments.verificationStatus, 'approved')
        )
      ));

    if (existingDocs.length > 0 && existingDocs.some(d => d.verificationStatus === 'approved')) {
      return res.status(400).json({ error: "You already have an approved document" });
    }

    const settings = await db.select()
      .from(identityVerificationSettings)
      .where(isNull(identityVerificationSettings.companyId))
      .limit(1);

    const ocrEnabled = enableOcr ?? settings[0]?.ocrEnabled ?? false;

    const platform = req.headers['x-platform'] as string || 'web';
    const clientIp = req.ip || req.headers['x-forwarded-for'] as string || '';

    const [newDoc] = await db.insert(identityDocuments).values({
      identityId,
      documentType,
      documentNumber: documentNumber || null,
      frontImageUrl,
      backImageUrl: backImageUrl || null,
      selfieImageUrl: selfieImageUrl || null,
      issuingCountry: issuingCountry || 'IT',
      issuingAuthority: issuingAuthority || null,
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      ocrEnabled,
      ocrStatus: ocrEnabled ? 'pending' : null,
      verificationStatus: 'pending',
      uploadedFromPlatform: platform,
      uploadedIp: clientIp,
    }).returning();

    if (ocrEnabled) {
      processOcrAsync(newDoc.id, frontImageUrl, backImageUrl).catch(err => {
        console.error("[Identity Documents] OCR processing error:", err);
      });
    }

    res.json({
      ok: true,
      document: {
        id: newDoc.id,
        documentType: newDoc.documentType,
        verificationStatus: newDoc.verificationStatus,
        ocrEnabled: newDoc.ocrEnabled,
        ocrStatus: newDoc.ocrStatus,
      },
    });
  } catch (error) {
    console.error("[Identity Documents] Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.get("/api/identity-documents/my", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user[0]?.identityId) {
      return res.json({ documents: [] });
    }

    const docs = await db.select()
      .from(identityDocuments)
      .where(eq(identityDocuments.identityId, user[0].identityId))
      .orderBy(desc(identityDocuments.createdAt));

    const safeDocs = docs.map(doc => ({
      id: doc.id,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      verificationStatus: doc.verificationStatus,
      verificationMethod: doc.verificationMethod,
      verifiedAt: doc.verifiedAt,
      rejectionReason: doc.rejectionReason,
      ocrEnabled: doc.ocrEnabled,
      ocrStatus: doc.ocrStatus,
      ocrConfidenceScore: doc.ocrConfidenceScore,
      isExpired: doc.isExpired,
      expiryDate: doc.expiryDate,
      createdAt: doc.createdAt,
    }));

    res.json({ documents: safeDocs });
  } catch (error) {
    console.error("[Identity Documents] Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/api/admin/identity-documents", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    let whereCondition = undefined;
    if (status && status !== 'all') {
      whereCondition = eq(identityDocuments.verificationStatus, status as string);
    }

    const docs = await db.select({
      document: identityDocuments,
      identity: {
        id: identities.id,
        firstName: identities.firstName,
        lastName: identities.lastName,
        email: identities.email,
        phone: identities.phone,
        fiscalCode: identities.fiscalCode,
      },
    })
      .from(identityDocuments)
      .leftJoin(identities, eq(identityDocuments.identityId, identities.id))
      .where(whereCondition)
      .orderBy(desc(identityDocuments.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(identityDocuments)
      .where(whereCondition);

    res.json({
      documents: docs.map(d => ({
        ...d.document,
        identity: d.identity,
      })),
      total: Number(count),
      page: pageNum,
      totalPages: Math.ceil(Number(count) / limitNum),
    });
  } catch (error) {
    console.error("[Identity Documents] Error fetching admin documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/api/admin/identity-documents/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const [pending] = await db.select({ count: sql<number>`count(*)` })
      .from(identityDocuments)
      .where(eq(identityDocuments.verificationStatus, 'pending'));

    const [underReview] = await db.select({ count: sql<number>`count(*)` })
      .from(identityDocuments)
      .where(eq(identityDocuments.verificationStatus, 'under_review'));

    const [approved] = await db.select({ count: sql<number>`count(*)` })
      .from(identityDocuments)
      .where(eq(identityDocuments.verificationStatus, 'approved'));

    const [rejected] = await db.select({ count: sql<number>`count(*)` })
      .from(identityDocuments)
      .where(eq(identityDocuments.verificationStatus, 'rejected'));

    const [ocrPending] = await db.select({ count: sql<number>`count(*)` })
      .from(identityDocuments)
      .where(and(
        eq(identityDocuments.ocrEnabled, true),
        eq(identityDocuments.ocrStatus, 'pending')
      ));

    res.json({
      pending: Number(pending.count),
      underReview: Number(underReview.count),
      approved: Number(approved.count),
      rejected: Number(rejected.count),
      ocrPending: Number(ocrPending.count),
    });
  } catch (error) {
    console.error("[Identity Documents] Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/api/admin/identity-documents/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [doc] = await db.select({
      document: identityDocuments,
      identity: identities,
    })
      .from(identityDocuments)
      .leftJoin(identities, eq(identityDocuments.identityId, identities.id))
      .where(eq(identityDocuments.id, id));

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      ...doc.document,
      identity: doc.identity,
    });
  } catch (error) {
    console.error("[Identity Documents] Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

router.patch("/api/admin/identity-documents/:id/verify", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, documentNumber, expiryDate } = req.body;
    const adminId = req.session!.userId;

    if (!['approve', 'reject', 'mark_under_review'].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const [doc] = await db.select().from(identityDocuments).where(eq(identityDocuments.id, id));
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (action === 'approve') {
      updateData.verificationStatus = 'approved';
      updateData.verificationMethod = doc.ocrEnabled ? 'ocr_manual' : 'manual';
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = adminId;
      if (documentNumber) updateData.documentNumber = documentNumber;
      if (expiryDate) updateData.expiryDate = new Date(expiryDate);
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      updateData.verificationStatus = 'rejected';
      updateData.verificationMethod = 'manual';
      updateData.rejectionReason = rejectionReason;
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = adminId;
    } else if (action === 'mark_under_review') {
      updateData.verificationStatus = 'under_review';
    }

    await db.update(identityDocuments)
      .set(updateData)
      .where(eq(identityDocuments.id, id));

    res.json({ ok: true, status: updateData.verificationStatus });
  } catch (error) {
    console.error("[Identity Documents] Error verifying document:", error);
    res.status(500).json({ error: "Failed to verify document" });
  }
});

router.post("/api/admin/identity-documents/:id/reprocess-ocr", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [doc] = await db.select().from(identityDocuments).where(eq(identityDocuments.id, id));
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    await db.update(identityDocuments)
      .set({
        ocrEnabled: true,
        ocrStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(identityDocuments.id, id));

    processOcrAsync(id, doc.frontImageUrl, doc.backImageUrl).catch(err => {
      console.error("[Identity Documents] OCR reprocessing error:", err);
    });

    res.json({ ok: true, message: "OCR processing started" });
  } catch (error) {
    console.error("[Identity Documents] Error reprocessing OCR:", error);
    res.status(500).json({ error: "Failed to reprocess OCR" });
  }
});

router.get("/api/admin/identity-verification-settings", requireAdmin, async (req: Request, res: Response) => {
  try {
    const [settings] = await db.select()
      .from(identityVerificationSettings)
      .where(isNull(identityVerificationSettings.companyId));

    if (!settings) {
      const [newSettings] = await db.insert(identityVerificationSettings).values({
        companyId: null,
        verificationMode: 'manual_only',
        ocrEnabled: false,
        ocrProvider: 'openai_vision',
        ocrAutoApproveThreshold: "0.95",
        requireDocument: false,
        requireSelfie: false,
        acceptedDocumentTypes: JSON.stringify(['carta_identita', 'patente', 'passaporto']),
        blockOnExpiredDocument: true,
        expiryWarningDays: 30,
      }).returning();
      return res.json(newSettings);
    }

    res.json(settings);
  } catch (error) {
    console.error("[Identity Documents] Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.patch("/api/admin/identity-verification-settings", requireAdmin, async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    const [existing] = await db.select()
      .from(identityVerificationSettings)
      .where(isNull(identityVerificationSettings.companyId));

    if (!existing) {
      const [newSettings] = await db.insert(identityVerificationSettings).values({
        companyId: null,
        ...updates,
      }).returning();
      return res.json(newSettings);
    }

    const [updated] = await db.update(identityVerificationSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(identityVerificationSettings.id, existing.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("[Identity Documents] Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

async function processOcrAsync(documentId: string, frontImageUrl: string, backImageUrl: string | null) {
  console.log(`[Identity Documents OCR] Starting OCR for document ${documentId}`);

  try {
    await db.update(identityDocuments)
      .set({ ocrStatus: 'processing', updatedAt: new Date() })
      .where(eq(identityDocuments.id, documentId));

    const frontFullUrl = frontImageUrl.startsWith('/')
      ? `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}${frontImageUrl}`
      : frontImageUrl;

    const messages: any[] = [
      {
        role: "system",
        content: `You are an OCR specialist for identity document verification. Extract all visible text and data from the document images provided. Return a JSON object with the following fields:
- documentType: carta_identita, patente, passaporto, or permesso_soggiorno
- documentNumber: the document number/ID
- firstName: first name
- lastName: last name
- birthDate: in ISO format (YYYY-MM-DD)
- birthPlace: place of birth
- gender: M or F
- fiscalCode: Italian fiscal code if visible
- nationality: nationality
- issueDate: in ISO format
- expiryDate: in ISO format
- issuingAuthority: issuing authority
- address: residence address if visible
- confidence: overall confidence score 0-1

Only return the JSON object, nothing else.`
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract all data from this identity document (front side):" },
          { type: "image_url", image_url: { url: frontFullUrl } },
        ],
      },
    ];

    if (backImageUrl) {
      const backFullUrl = backImageUrl.startsWith('/')
        ? `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}${backImageUrl}`
        : backImageUrl;

      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Also analyze the back side of the document:" },
          { type: "image_url", image_url: { url: backFullUrl } },
        ],
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content || '';

    let extractedData: any = {};
    let confidence = 0;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
        confidence = extractedData.confidence || 0.5;
      }
    } catch (parseError) {
      console.error("[Identity Documents OCR] Failed to parse OCR response:", parseError);
      extractedData = { rawText: content, parseError: true };
      confidence = 0.3;
    }

    const settings = await db.select()
      .from(identityVerificationSettings)
      .where(isNull(identityVerificationSettings.companyId))
      .limit(1);

    const autoApproveThreshold = parseFloat(settings[0]?.ocrAutoApproveThreshold || "0.95");
    const verificationMode = settings[0]?.verificationMode || 'manual_only';

    let verificationStatus = 'pending';
    let verificationMethod = null;

    if (verificationMode === 'ocr_auto_approve' && confidence >= autoApproveThreshold) {
      verificationStatus = 'approved';
      verificationMethod = 'ocr_auto';
    } else if (verificationMode === 'ocr_with_manual_review') {
      verificationStatus = 'under_review';
      verificationMethod = 'ocr_manual';
    }

    await db.update(identityDocuments)
      .set({
        ocrStatus: 'completed',
        ocrExtractedData: JSON.stringify(extractedData),
        ocrConfidenceScore: String(confidence),
        ocrProcessedAt: new Date(),
        ocrProvider: 'openai_vision',
        documentNumber: extractedData.documentNumber || undefined,
        expiryDate: extractedData.expiryDate ? new Date(extractedData.expiryDate) : undefined,
        issueDate: extractedData.issueDate ? new Date(extractedData.issueDate) : undefined,
        issuingAuthority: extractedData.issuingAuthority || undefined,
        verificationStatus,
        verificationMethod,
        verifiedAt: verificationStatus === 'approved' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(identityDocuments.id, documentId));

    if (extractedData.firstName || extractedData.lastName || extractedData.birthDate || extractedData.fiscalCode) {
      const [doc] = await db.select().from(identityDocuments).where(eq(identityDocuments.id, documentId));
      if (doc?.identityId) {
        const identityUpdates: any = {};
        if (extractedData.firstName) identityUpdates.firstName = extractedData.firstName;
        if (extractedData.lastName) identityUpdates.lastName = extractedData.lastName;
        if (extractedData.birthDate) identityUpdates.birthDate = new Date(extractedData.birthDate);
        if (extractedData.birthPlace) identityUpdates.birthPlace = extractedData.birthPlace;
        if (extractedData.gender) identityUpdates.gender = extractedData.gender;
        if (extractedData.fiscalCode) identityUpdates.fiscalCode = extractedData.fiscalCode;

        if (Object.keys(identityUpdates).length > 0) {
          await db.update(identities)
            .set({ ...identityUpdates, updatedAt: new Date() })
            .where(eq(identities.id, doc.identityId));
        }
      }
    }

    console.log(`[Identity Documents OCR] Completed for document ${documentId}, confidence: ${confidence}`);
  } catch (error) {
    console.error(`[Identity Documents OCR] Failed for document ${documentId}:`, error);

    await db.update(identityDocuments)
      .set({
        ocrStatus: 'failed',
        ocrExtractedData: JSON.stringify({ error: String(error) }),
        updatedAt: new Date(),
      })
      .where(eq(identityDocuments.id, documentId));
  }
}

export default router;
