import { Router } from "express";
import { db } from "./db";
import { 
  referralCodes, 
  referralTracking, 
  referralSettings, 
  siaeCustomers,
  loyaltyPrograms,
  loyaltyPoints,
  loyaltyPointLedger,
} from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getAuthenticatedCustomer(req: any): Promise<any | null> {
  if (req.user && req.isAuthenticated && req.isAuthenticated()) {
    if (req.user.accountType === "customer" && req.user.customerId) {
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.id, req.user.customerId));
      return customer;
    }
    if (req.user.claims?.sub) {
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.userId, req.user.claims.sub));
      return customer;
    }
  }
  return null;
}

// ==================== ADMIN APIs ====================

router.get("/api/referral/settings", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [settings] = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.companyId, user.companyId));

    res.json(settings || null);
  } catch (error) {
    console.error("Error fetching referral settings:", error);
    res.status(500).json({ message: "Errore nel recupero delle impostazioni" });
  }
});

router.post("/api/referral/settings", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { referrerRewardPoints, referredDiscountPercent, minPurchaseAmount, isActive } = req.body;

    const [existing] = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.companyId, user.companyId));

    if (existing) {
      const [updated] = await db
        .update(referralSettings)
        .set({
          referrerRewardPoints: referrerRewardPoints ?? existing.referrerRewardPoints,
          referredDiscountPercent: referredDiscountPercent?.toString() ?? existing.referredDiscountPercent,
          minPurchaseAmount: minPurchaseAmount?.toString() ?? existing.minPurchaseAmount,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        })
        .where(eq(referralSettings.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [newSettings] = await db
      .insert(referralSettings)
      .values({
        companyId: user.companyId,
        referrerRewardPoints: referrerRewardPoints ?? 100,
        referredDiscountPercent: referredDiscountPercent?.toString() ?? "10",
        minPurchaseAmount: minPurchaseAmount?.toString() ?? "0",
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    res.json(newSettings);
  } catch (error) {
    console.error("Error saving referral settings:", error);
    res.status(500).json({ message: "Errore nel salvataggio delle impostazioni" });
  }
});

router.get("/api/referral/stats", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [totalReferrals] = await db
      .select({ count: count() })
      .from(referralTracking)
      .innerJoin(referralCodes, eq(referralTracking.referralCodeId, referralCodes.id))
      .where(eq(referralCodes.companyId, user.companyId));

    const [conversions] = await db
      .select({ count: count() })
      .from(referralTracking)
      .innerJoin(referralCodes, eq(referralTracking.referralCodeId, referralCodes.id))
      .where(and(
        eq(referralCodes.companyId, user.companyId),
        eq(referralTracking.status, "converted")
      ));

    const [totalCodes] = await db
      .select({ count: count() })
      .from(referralCodes)
      .where(eq(referralCodes.companyId, user.companyId));

    const totalReferralCount = totalReferrals?.count || 0;
    const conversionCount = conversions?.count || 0;
    const conversionRate = totalReferralCount > 0 
      ? Math.round((conversionCount / totalReferralCount) * 100) 
      : 0;

    res.json({
      totalReferrals: totalReferralCount,
      conversions: conversionCount,
      conversionRate,
      totalCodes: totalCodes?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(500).json({ message: "Errore nel recupero delle statistiche" });
  }
});

router.get("/api/referral/leaderboard", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const leaderboard = await db
      .select({
        customerId: referralCodes.customerId,
        code: referralCodes.code,
        usageCount: referralCodes.usageCount,
        totalEarnings: referralCodes.totalEarnings,
        firstName: siaeCustomers.firstName,
        lastName: siaeCustomers.lastName,
        email: siaeCustomers.email,
      })
      .from(referralCodes)
      .innerJoin(siaeCustomers, eq(referralCodes.customerId, siaeCustomers.id))
      .where(eq(referralCodes.companyId, user.companyId))
      .orderBy(desc(referralCodes.usageCount))
      .limit(10);

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Errore nel recupero della classifica" });
  }
});

// ==================== PUBLIC APIs ====================

router.get("/api/public/referral/my-code", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const companyId = req.query.companyId as string;
    if (!companyId) {
      return res.status(400).json({ message: "Company ID richiesto" });
    }

    let [existingCode] = await db
      .select()
      .from(referralCodes)
      .where(and(
        eq(referralCodes.customerId, customer.id),
        eq(referralCodes.companyId, companyId)
      ));

    if (existingCode) {
      return res.json(existingCode);
    }

    let code = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const [duplicate] = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.code, code));
      if (!duplicate) break;
      code = generateReferralCode();
      attempts++;
    }

    const [newCode] = await db
      .insert(referralCodes)
      .values({
        customerId: customer.id,
        companyId,
        code,
      })
      .returning();

    res.json(newCode);
  } catch (error) {
    console.error("Error getting referral code:", error);
    res.status(500).json({ message: "Errore nel recupero del codice referral" });
  }
});

router.get("/api/public/referral/my-referrals", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const referrals = await db
      .select({
        id: referralTracking.id,
        status: referralTracking.status,
        referrerRewardPoints: referralTracking.referrerRewardPoints,
        convertedAt: referralTracking.convertedAt,
        createdAt: referralTracking.createdAt,
        referredFirstName: siaeCustomers.firstName,
        referredLastName: siaeCustomers.lastName,
        referredEmail: siaeCustomers.email,
      })
      .from(referralTracking)
      .innerJoin(referralCodes, eq(referralTracking.referralCodeId, referralCodes.id))
      .innerJoin(siaeCustomers, eq(referralTracking.referredCustomerId, siaeCustomers.id))
      .where(eq(referralCodes.customerId, customer.id))
      .orderBy(desc(referralTracking.createdAt));

    const totalPoints = referrals
      .filter(r => r.status === "converted")
      .reduce((sum, r) => sum + (r.referrerRewardPoints || 0), 0);

    res.json({
      referrals,
      totalPoints,
    });
  } catch (error) {
    console.error("Error fetching my referrals:", error);
    res.status(500).json({ message: "Errore nel recupero dei referral" });
  }
});

router.get("/api/public/referral/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const [referralCode] = await db
      .select({
        id: referralCodes.id,
        code: referralCodes.code,
        companyId: referralCodes.companyId,
        isActive: referralCodes.isActive,
        referrerFirstName: siaeCustomers.firstName,
        referrerLastName: siaeCustomers.lastName,
      })
      .from(referralCodes)
      .innerJoin(siaeCustomers, eq(referralCodes.customerId, siaeCustomers.id))
      .where(eq(referralCodes.code, code.toUpperCase()));

    if (!referralCode || !referralCode.isActive) {
      return res.status(404).json({ valid: false, message: "Codice non valido" });
    }

    const [settings] = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.companyId, referralCode.companyId));

    if (!settings?.isActive) {
      return res.status(400).json({ valid: false, message: "Programma referral non attivo" });
    }

    res.json({
      valid: true,
      code: referralCode.code,
      referrerName: `${referralCode.referrerFirstName || ""} ${referralCode.referrerLastName || ""}`.trim() || "Un amico",
      discountPercent: settings.referredDiscountPercent,
    });
  } catch (error) {
    console.error("Error validating referral code:", error);
    res.status(500).json({ message: "Errore nella validazione del codice" });
  }
});

router.post("/api/public/referral/apply", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Codice richiesto" });
    }

    const [referralCode] = await db
      .select()
      .from(referralCodes)
      .where(and(
        eq(referralCodes.code, code.toUpperCase()),
        eq(referralCodes.isActive, true)
      ));

    if (!referralCode) {
      return res.status(404).json({ message: "Codice non valido" });
    }

    if (referralCode.customerId === customer.id) {
      return res.status(400).json({ message: "Non puoi usare il tuo stesso codice" });
    }

    const [existingTracking] = await db
      .select()
      .from(referralTracking)
      .where(eq(referralTracking.referredCustomerId, customer.id));

    if (existingTracking) {
      return res.status(400).json({ message: "Hai già applicato un codice referral" });
    }

    const [settings] = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.companyId, referralCode.companyId));

    if (!settings?.isActive) {
      return res.status(400).json({ message: "Programma referral non attivo" });
    }

    const [tracking] = await db
      .insert(referralTracking)
      .values({
        referralCodeId: referralCode.id,
        referrerId: referralCode.customerId,
        referredCustomerId: customer.id,
        status: "pending",
        referrerRewardPoints: settings.referrerRewardPoints,
        referredDiscountPercent: settings.referredDiscountPercent,
      })
      .returning();

    res.json({
      success: true,
      tracking,
      discountPercent: settings.referredDiscountPercent,
      message: `Codice applicato! Riceverai uno sconto del ${settings.referredDiscountPercent}% sul primo acquisto`,
    });
  } catch (error) {
    console.error("Error applying referral code:", error);
    res.status(500).json({ message: "Errore nell'applicazione del codice" });
  }
});

// Funzione esportata per convertire referral su acquisto
export async function convertReferralOnPurchase(
  customerId: string,
  transactionId: string,
  purchaseAmount: number
): Promise<{ converted: boolean; referrerId?: string; pointsCredited?: number }> {
  try {
    const [pendingReferral] = await db
      .select()
      .from(referralTracking)
      .where(and(
        eq(referralTracking.referredCustomerId, customerId),
        eq(referralTracking.status, "pending")
      ));

    if (!pendingReferral) {
      return { converted: false };
    }

    const [referralCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.id, pendingReferral.referralCodeId));

    if (!referralCode) {
      return { converted: false };
    }

    const [settings] = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.companyId, referralCode.companyId));

    if (!settings?.isActive) {
      return { converted: false };
    }

    const minAmount = parseFloat(settings.minPurchaseAmount || "0");
    if (purchaseAmount < minAmount) {
      return { converted: false };
    }

    await db
      .update(referralTracking)
      .set({
        status: "converted",
        convertedAt: new Date(),
        transactionId,
      })
      .where(eq(referralTracking.id, pendingReferral.id));

    await db
      .update(referralCodes)
      .set({
        usageCount: sql`${referralCodes.usageCount} + 1`,
      })
      .where(eq(referralCodes.id, referralCode.id));

    const pointsToCredit = pendingReferral.referrerRewardPoints || 0;
    if (pointsToCredit > 0) {
      const [program] = await db
        .select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.companyId, referralCode.companyId));

      if (program) {
        const [existingPoints] = await db
          .select()
          .from(loyaltyPoints)
          .where(and(
            eq(loyaltyPoints.programId, program.id),
            eq(loyaltyPoints.customerId, pendingReferral.referrerId)
          ));

        if (existingPoints) {
          await db
            .update(loyaltyPoints)
            .set({
              totalPoints: sql`${loyaltyPoints.totalPoints} + ${pointsToCredit}`,
              lifetimePoints: sql`${loyaltyPoints.lifetimePoints} + ${pointsToCredit}`,
              updatedAt: new Date(),
            })
            .where(eq(loyaltyPoints.id, existingPoints.id));
        } else {
          await db.insert(loyaltyPoints).values({
            programId: program.id,
            customerId: pendingReferral.referrerId,
            totalPoints: pointsToCredit,
            lifetimePoints: pointsToCredit,
          });
        }

        await db.insert(loyaltyPointLedger).values({
          programId: program.id,
          customerId: pendingReferral.referrerId,
          points: pointsToCredit,
          type: "referral",
          description: `Bonus referral per invito completato`,
          referenceId: transactionId,
        });
      }
    }

    return {
      converted: true,
      referrerId: pendingReferral.referrerId,
      pointsCredited: pointsToCredit,
    };
  } catch (error) {
    console.error("Error converting referral:", error);
    return { converted: false };
  }
}

// Funzione per ottenere lo sconto referral pendente per un cliente
export async function getPendingReferralDiscount(
  customerId: string
): Promise<{ hasDiscount: boolean; discountPercent?: number; referralTrackingId?: string }> {
  try {
    const [pendingReferral] = await db
      .select()
      .from(referralTracking)
      .where(and(
        eq(referralTracking.referredCustomerId, customerId),
        eq(referralTracking.status, "pending")
      ));

    if (!pendingReferral) {
      return { hasDiscount: false };
    }

    const discountPercent = parseFloat(pendingReferral.referredDiscountPercent || "0");
    return {
      hasDiscount: discountPercent > 0,
      discountPercent,
      referralTrackingId: pendingReferral.id,
    };
  } catch (error) {
    console.error("Error getting pending referral discount:", error);
    return { hasDiscount: false };
  }
}

export default router;
