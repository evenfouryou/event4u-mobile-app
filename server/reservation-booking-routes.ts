// Reservation Booking API Routes - Sistema Prenotazioni Liste/Tavoli
// NOTA LEGALE: Questo è un "servizio di prenotazione", NON biglietteria SIAE
import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, sum, or } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { sendPrCredentialsSMS, generatePrPassword } from "./msg91-service";
import {
  prProfiles,
  reservationPayments,
  prPayouts,
  eventReservationSettings,
  events,
  users,
  listEntries,
  tableReservations,
  insertPrProfileSchema,
  updatePrProfileSchema,
  createPrByGestoreSchema,
  insertReservationPaymentSchema,
  updateReservationPaymentSchema,
  insertPrPayoutSchema,
  updatePrPayoutSchema,
  insertEventReservationSettingsSchema,
  updateEventReservationSettingsSchema,
} from "@shared/schema";

const router = Router();

// ==================== Authentication Middleware ====================

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  next();
}

function requireGestore(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['gestore', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ error: "Accesso negato. Richiesto ruolo Gestore." });
  }
  next();
}

function requirePrOrHigher(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['gestore', 'gestore_covisione', 'capo_staff', 'pr', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ error: "Accesso negato." });
  }
  next();
}

function requireScanner(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['gestore', 'gestore_covisione', 'capo_staff', 'scanner', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ error: "Accesso negato. Richiesto ruolo Scanner." });
  }
  next();
}

// ==================== Helper Functions ====================

function generateQrToken(eventId: string): string {
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `RES-${eventId.slice(0, 6).toUpperCase()}-${random}`;
}

function generatePrCode(): string {
  return `PR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function generateQrCodeDataUrl(token: string): Promise<string> {
  try {
    return await QRCode.toDataURL(token, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch {
    return '';
  }
}

function calculateCommission(
  amount: number,
  commissionType: string,
  commissionValue: number
): number {
  if (commissionType === 'percentage') {
    return (amount * commissionValue) / 100;
  }
  return commissionValue; // fixed amount
}

// ==================== PR Profile APIs ====================

// Get all PR profiles for company
router.get("/api/reservations/pr-profiles", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const profiles = await db.select({
      profile: prProfiles,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
      }
    })
      .from(prProfiles)
      .leftJoin(users, eq(prProfiles.userId, users.id))
      .where(eq(prProfiles.companyId, user.companyId))
      .orderBy(desc(prProfiles.createdAt));
    
    res.json(profiles.map(p => ({ ...p.profile, user: p.user })));
  } catch (error: any) {
    console.error("Error getting PR profiles:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single PR profile
router.get("/api/reservations/pr-profiles/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [profile] = await db.select({
      profile: prProfiles,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
      }
    })
      .from(prProfiles)
      .leftJoin(users, eq(prProfiles.userId, users.id))
      .where(eq(prProfiles.id, id));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    res.json({ ...profile.profile, user: profile.user });
  } catch (error: any) {
    console.error("Error getting PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my PR profile (for authenticated PR)
router.get("/api/reservations/my-profile", requireAuth, requirePrOrHigher, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.userId, user.id));
    
    if (!profile) {
      return res.status(404).json({ error: "Non hai un profilo PR attivo" });
    }
    
    res.json(profile);
  } catch (error: any) {
    console.error("Error getting my PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create PR profile (by Gestore) - sends SMS with credentials
router.post("/api/reservations/pr-profiles", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Validate input with gestore schema
    const validated = createPrByGestoreSchema.parse(req.body);
    
    // Check if phone already exists
    const [existingPhone] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.phone, validated.phone),
        eq(prProfiles.companyId, user.companyId)
      ));
    
    if (existingPhone) {
      return res.status(400).json({ error: "Questo numero di telefono è già registrato come PR" });
    }
    
    // Generate unique PR code
    let prCode = generatePrCode();
    let attempts = 0;
    while (attempts < 10) {
      const [existing] = await db.select().from(prProfiles).where(eq(prProfiles.prCode, prCode));
      if (!existing) break;
      prCode = generatePrCode();
      attempts++;
    }
    
    // Generate password and hash it
    const password = generatePrPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create PR profile
    const [profile] = await db.insert(prProfiles).values({
      companyId: user.companyId,
      firstName: validated.firstName,
      lastName: validated.lastName,
      phone: validated.phone,
      displayName: `${validated.firstName} ${validated.lastName}`,
      prCode,
      passwordHash,
      commissionType: validated.commissionType,
      commissionValue: validated.commissionValue,
      defaultListCommission: validated.defaultListCommission || '0',
      defaultTableCommission: validated.defaultTableCommission || '0',
    }).returning();
    
    // Build access link
    const baseUrl = process.env.CUSTOM_DOMAIN 
      ? `https://${process.env.CUSTOM_DOMAIN}` 
      : process.env.PUBLIC_URL || 'https://eventfouryou.com';
    const accessLink = `${baseUrl}/login`;
    
    // Send SMS with credentials
    const smsResult = await sendPrCredentialsSMS(
      validated.phone,
      validated.firstName,
      password,
      accessLink
    );
    
    console.log(`[PR] Created PR ${profile.id} for ${validated.firstName} ${validated.lastName}, SMS: ${smsResult.success ? 'sent' : 'failed'}`);
    
    res.status(201).json({
      ...profile,
      passwordHash: undefined, // Don't return hash
      smsSent: smsResult.success,
      smsMessage: smsResult.message
    });
  } catch (error: any) {
    console.error("Error creating PR profile:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update PR profile
router.patch("/api/reservations/pr-profiles/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = updatePrProfileSchema.parse(req.body);
    
    const [updated] = await db.update(prProfiles)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(prProfiles.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating PR profile:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete PR profile (soft delete - set inactive)
router.delete("/api/reservations/pr-profiles/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [updated] = await db.update(prProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(prProfiles.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resend PR credentials SMS
router.post("/api/reservations/pr-profiles/:id/resend-sms", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, id));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    // Generate new password
    const password = generatePrPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update password hash
    await db.update(prProfiles)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(prProfiles.id, id));
    
    // Build access link
    const baseUrl = process.env.CUSTOM_DOMAIN 
      ? `https://${process.env.CUSTOM_DOMAIN}` 
      : process.env.PUBLIC_URL || 'https://eventfouryou.com';
    const accessLink = `${baseUrl}/login`;
    
    // Send SMS
    const smsResult = await sendPrCredentialsSMS(
      profile.phone,
      profile.firstName,
      password,
      accessLink
    );
    
    res.json({ 
      success: smsResult.success, 
      message: smsResult.message 
    });
  } catch (error: any) {
    console.error("Error resending PR credentials:", error);
    res.status(500).json({ error: error.message });
  }
});

// Permanently delete PR profile
router.delete("/api/reservations/pr-profiles/:id/permanent", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Verify PR belongs to gestore's company
    const [profile] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.id, id),
        eq(prProfiles.companyId, user.companyId)
      ));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    // Delete PR profile permanently
    await db.delete(prProfiles).where(eq(prProfiles.id, id));
    
    console.log(`[PR] Permanently deleted PR ${id} by user ${user.id}`);
    
    res.status(204).send();
  } catch (error: any) {
    console.error("Error permanently deleting PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Impersonate PR (gestore logs in as PR)
router.post("/api/reservations/pr-profiles/:id/impersonate", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Verify PR belongs to gestore's company
    const [profile] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.id, id),
        eq(prProfiles.companyId, user.companyId)
      ));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    if (!profile.isActive) {
      return res.status(400).json({ error: "Il PR è disattivato" });
    }
    
    // Set PR session (impersonation)
    const prProfileData = {
      id: profile.id,
      companyId: profile.companyId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      prCode: profile.prCode,
      phone: profile.phone,
      email: profile.email,
      impersonatedBy: user.id // Track who impersonated
    };
    
    (req.session as any).prProfile = prProfileData;
    
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Error saving session:", saveErr);
        return res.status(500).json({ error: "Errore durante l'impersonazione" });
      }
      
      console.log(`[PR] User ${user.id} impersonating PR ${profile.id}`);
      
      res.json({ 
        success: true, 
        message: "Impersonazione attivata",
        prProfile: prProfileData
      });
    });
  } catch (error: any) {
    console.error("Error impersonating PR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR Authentication APIs ====================

// PR Login via phone + password
router.post("/api/pr/login", async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: "Telefono e password richiesti" });
    }
    
    // Find PR by phone
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.phone, phone));
    
    if (!profile) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }
    
    if (!profile.isActive) {
      return res.status(401).json({ error: "Account disattivato" });
    }
    
    if (!profile.passwordHash) {
      return res.status(401).json({ error: "Account non configurato. Contatta il gestore." });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, profile.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }
    
    // Update last login
    await db.update(prProfiles)
      .set({ 
        lastLoginAt: new Date(),
        phoneVerified: true 
      })
      .where(eq(prProfiles.id, profile.id));
    
    // Regenerate session for security (prevents session fixation)
    const prProfileData = {
      id: profile.id,
      companyId: profile.companyId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      prCode: profile.prCode,
      phone: profile.phone,
      email: profile.email
    };
    
    req.session.regenerate((err) => {
      if (err) {
        console.error("Error regenerating session:", err);
        return res.status(500).json({ error: "Errore durante il login" });
      }
      
      // Set PR session after regeneration
      (req.session as any).prProfile = prProfileData;
      
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Error saving session:", saveErr);
          return res.status(500).json({ error: "Errore durante il login" });
        }
        
        res.json({
          success: true,
          profile: {
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            prCode: profile.prCode,
            displayName: profile.displayName,
            phone: profile.phone,
            email: profile.email,
            commissionType: profile.commissionType,
            commissionValue: profile.commissionValue,
            totalEarnings: profile.totalEarnings,
            pendingEarnings: profile.pendingEarnings,
            paidEarnings: profile.paidEarnings
          }
        });
      });
    });
  } catch (error: any) {
    console.error("Error in PR login:", error);
    res.status(500).json({ error: "Errore durante il login" });
  }
});

// Get current PR session
router.get("/api/pr/me", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    // Get fresh profile data
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));
    
    if (!profile || !profile.isActive) {
      delete (req.session as any).prProfile;
      return res.status(401).json({ error: "Sessione non valida" });
    }
    
    res.json({
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      prCode: profile.prCode,
      displayName: profile.displayName,
      phone: profile.phone,
      email: profile.email,
      commissionType: profile.commissionType,
      commissionValue: profile.commissionValue,
      totalEarnings: profile.totalEarnings,
      pendingEarnings: profile.pendingEarnings,
      paidEarnings: profile.paidEarnings,
      companyId: profile.companyId
    });
  } catch (error: any) {
    console.error("Error getting PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// PR Logout
router.post("/api/pr/logout", (req: Request, res: Response) => {
  // Regenerate session on logout for security
  req.session.regenerate((err) => {
    if (err) {
      console.error("Error regenerating session on logout:", err);
    }
    res.json({ success: true });
  });
});

// PR Update own profile (add email, update displayName)
router.patch("/api/pr/me", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const { email, displayName, bio } = req.body;
    
    const updateData: any = { updatedAt: new Date() };
    if (email !== undefined) updateData.email = email;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    
    const [updated] = await db.update(prProfiles)
      .set(updateData)
      .where(eq(prProfiles.id, prSession.id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Profilo non trovato" });
    }
    
    // Update session
    (req.session as any).prProfile = {
      ...prSession,
      email: updated.email
    };
    
    res.json({
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      prCode: updated.prCode,
      displayName: updated.displayName,
      phone: updated.phone,
      email: updated.email
    });
  } catch (error: any) {
    console.error("Error updating PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// PR Change password
router.post("/api/pr/change-password", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Password attuale e nuova password richieste" });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "La nuova password deve avere almeno 6 caratteri" });
    }
    
    // Get current profile
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));
    
    if (!profile || !profile.passwordHash) {
      return res.status(400).json({ error: "Account non configurato" });
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, profile.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Password attuale non corretta" });
    }
    
    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.update(prProfiles)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(prProfiles.id, prSession.id));
    
    res.json({ success: true, message: "Password aggiornata con successo" });
  } catch (error: any) {
    console.error("Error changing PR password:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR Wallet APIs (for PR session) ====================

// Get PR wallet data (for PR session, not gestore)
router.get("/api/pr/wallet", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const prId = prSession.id;
    
    // Get profile data
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prId));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo non trovato" });
    }
    
    // Calculate this month's stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthReservations = await db.select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`COALESCE(SUM(${reservationPayments.prCommissionAmount}), 0)`,
    })
      .from(reservationPayments)
      .where(and(
        eq(reservationPayments.prProfileId, prId),
        gte(reservationPayments.createdAt, startOfMonth)
      ));
    
    // Get recent payouts
    const recentPayouts = await db.select()
      .from(prPayouts)
      .where(eq(prPayouts.prProfileId, prId))
      .orderBy(desc(prPayouts.createdAt))
      .limit(10);
    
    res.json({
      pendingEarnings: parseFloat(profile.pendingEarnings) || 0,
      paidEarnings: parseFloat(profile.paidEarnings) || 0,
      totalEarnings: parseFloat(profile.totalEarnings) || 0,
      availableForPayout: parseFloat(profile.pendingEarnings) || 0,
      thisMonthReservations: monthReservations[0]?.count || 0,
      thisMonthEarnings: parseFloat(monthReservations[0]?.total) || 0,
      recentPayouts,
    });
  } catch (error: any) {
    console.error("Error getting PR wallet:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR reservations (for PR session)
router.get("/api/pr/reservations", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const reservations = await db.select({
      reservation: reservationPayments,
      event: {
        id: events.id,
        name: events.name,
        date: events.date,
      }
    })
      .from(reservationPayments)
      .leftJoin(events, eq(reservationPayments.eventId, events.id))
      .where(eq(reservationPayments.prProfileId, prSession.id))
      .orderBy(desc(reservationPayments.createdAt))
      .limit(50);
    
    res.json(reservations.map(r => ({
      ...r.reservation,
      event: r.event
    })));
  } catch (error: any) {
    console.error("Error getting PR reservations:", error);
    res.status(500).json({ error: error.message });
  }
});

// Request payout (for PR session)
router.post("/api/pr/payouts", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    // Get profile to check available balance
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo non trovato" });
    }
    
    const availableAmount = parseFloat(profile.pendingEarnings) || 0;
    
    if (availableAmount <= 0) {
      return res.status(400).json({ error: "Nessun importo disponibile per il prelievo" });
    }
    
    // Count pending reservations for this payout
    const pendingReservations = await db.select({
      count: sql<number>`count(*)::int`,
    })
      .from(reservationPayments)
      .where(and(
        eq(reservationPayments.prProfileId, prSession.id),
        eq(reservationPayments.prCommissionPaid, false),
        sql`${reservationPayments.prCommissionAmount} > 0`
      ));
    
    // Create payout request
    const [payout] = await db.insert(prPayouts).values({
      prProfileId: prSession.id,
      companyId: prSession.companyId,
      amount: profile.pendingEarnings,
      status: 'pending',
      requestedAt: new Date(),
      reservationCount: pendingReservations[0]?.count || 0,
    }).returning();
    
    res.status(201).json(payout);
  } catch (error: any) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR payouts (for PR session)
router.get("/api/pr/payouts", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    const payouts = await db.select()
      .from(prPayouts)
      .where(eq(prPayouts.prProfileId, prSession.id))
      .orderBy(desc(prPayouts.createdAt));
    
    res.json(payouts);
  } catch (error: any) {
    console.error("Error getting PR payouts:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Event Reservation Settings APIs ====================

// Get event reservation settings
router.get("/api/reservations/events/:eventId/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const [settings] = await db.select()
      .from(eventReservationSettings)
      .where(eq(eventReservationSettings.eventId, eventId));
    
    if (!settings) {
      // Return default settings if none exist
      return res.json({
        eventId,
        listsEnabled: true,
        tablesEnabled: true,
        paidReservationsEnabled: false,
        listReservationFee: '0',
        listReservationFeeDescription: 'Servizio di prenotazione prioritaria',
        accessDisclaimer: "L'accesso è subordinato al rispetto delle condizioni del locale e alla verifica in fase di accreditamento.",
      });
    }
    
    res.json(settings);
  } catch (error: any) {
    console.error("Error getting event reservation settings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create/update event reservation settings
router.post("/api/reservations/events/:eventId/settings", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    // Check if settings exist
    const [existing] = await db.select()
      .from(eventReservationSettings)
      .where(eq(eventReservationSettings.eventId, eventId));
    
    if (existing) {
      // Update
      const validated = updateEventReservationSettingsSchema.parse(req.body);
      const [updated] = await db.update(eventReservationSettings)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(eventReservationSettings.eventId, eventId))
        .returning();
      return res.json(updated);
    }
    
    // Create
    const validated = insertEventReservationSettingsSchema.parse({
      ...req.body,
      eventId,
      companyId: user.companyId,
    });
    
    const [created] = await db.insert(eventReservationSettings).values(validated).returning();
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error saving event reservation settings:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// ==================== Reservation Payment APIs ====================

// Get all reservation payments for event
router.get("/api/reservations/events/:eventId/payments", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, type } = req.query;
    
    let query = db.select({
      payment: reservationPayments,
      prProfile: {
        id: prProfiles.id,
        displayName: prProfiles.displayName,
        prCode: prProfiles.prCode,
      }
    })
      .from(reservationPayments)
      .leftJoin(prProfiles, eq(reservationPayments.prProfileId, prProfiles.id))
      .where(eq(reservationPayments.eventId, eventId))
      .orderBy(desc(reservationPayments.createdAt));
    
    const payments = await query;
    
    let result = payments.map(p => ({ ...p.payment, prProfile: p.prProfile }));
    
    // Filter by status if provided
    if (status) {
      result = result.filter(p => p.paymentStatus === status);
    }
    
    // Filter by type if provided
    if (type) {
      result = result.filter(p => p.reservationType === type);
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("Error getting reservation payments:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single payment
router.get("/api/reservations/payments/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [payment] = await db.select()
      .from(reservationPayments)
      .where(eq(reservationPayments.id, id));
    
    if (!payment) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    
    res.json(payment);
  } catch (error: any) {
    console.error("Error getting reservation payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create reservation payment
router.post("/api/reservations/payments", requireAuth, requirePrOrHigher, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId, prCode, ...data } = req.body;
    
    // Generate QR token
    const qrToken = generateQrToken(eventId);
    const qrCodeUrl = await generateQrCodeDataUrl(qrToken);
    
    // Look up PR profile if prCode provided
    let prProfileId: string | null = null;
    let prCommissionAmount = '0';
    
    if (prCode) {
      const [prProfile] = await db.select()
        .from(prProfiles)
        .where(and(
          eq(prProfiles.prCode, prCode),
          eq(prProfiles.isActive, true)
        ));
      
      if (prProfile) {
        prProfileId = prProfile.id;
        
        // Calculate commission
        const amount = parseFloat(data.amount || '0');
        const commission = calculateCommission(
          amount,
          prProfile.commissionType,
          parseFloat(prProfile.commissionValue || '0')
        );
        prCommissionAmount = commission.toFixed(2);
      }
    }
    
    const validated = insertReservationPaymentSchema.parse({
      ...data,
      eventId,
      companyId: user.companyId,
      qrToken,
      qrCodeUrl,
      prProfileId,
      prCode: prCode || null,
      prCommissionAmount,
    });
    
    const [payment] = await db.insert(reservationPayments).values(validated).returning();
    res.status(201).json(payment);
  } catch (error: any) {
    console.error("Error creating reservation payment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update reservation payment
router.patch("/api/reservations/payments/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const validated = updateReservationPaymentSchema.parse(req.body);
    
    // Get current payment to check for status changes
    const [currentPayment] = await db.select()
      .from(reservationPayments)
      .where(eq(reservationPayments.id, id));
    
    if (!currentPayment) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    
    // If payment is being marked as paid, update PR wallet
    if (validated.paymentStatus === 'paid' && currentPayment.paymentStatus !== 'paid') {
      if (currentPayment.prProfileId) {
        const commission = parseFloat(currentPayment.prCommissionAmount || '0');
        
        // Update PR pending and total earnings (wallet credit)
        await db.update(prProfiles)
          .set({
            pendingEarnings: sql`pending_earnings + ${commission}`,
            totalEarnings: sql`total_earnings + ${commission}`,
            updatedAt: new Date(),
          })
          .where(eq(prProfiles.id, currentPayment.prProfileId));
      }
      
      // Set paidAt timestamp
      (validated as any).paidAt = new Date();
    }
    
    const [updated] = await db.update(reservationPayments)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(reservationPayments.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating reservation payment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR Wallet & Tracking APIs ====================

// Get reservations by PR code
router.get("/api/reservations/pr/:prCode/reservations", requireAuth, async (req: Request, res: Response) => {
  try {
    const { prCode } = req.params;
    const { eventId, status } = req.query;
    
    let conditions = [eq(reservationPayments.prCode, prCode)];
    
    if (eventId) {
      conditions.push(eq(reservationPayments.eventId, eventId as string));
    }
    
    const payments = await db.select()
      .from(reservationPayments)
      .where(and(...conditions))
      .orderBy(desc(reservationPayments.createdAt));
    
    let result = payments;
    if (status) {
      result = result.filter(p => p.paymentStatus === status);
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("Error getting PR reservations:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR wallet stats
router.get("/api/reservations/pr/:prCode/wallet", requireAuth, async (req: Request, res: Response) => {
  try {
    const { prCode } = req.params;
    
    // Get PR profile
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.prCode, prCode));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    // Get reservation stats
    const reservations = await db.select()
      .from(reservationPayments)
      .where(eq(reservationPayments.prProfileId, profile.id));
    
    const stats = {
      // Wallet balances
      pendingEarnings: parseFloat(profile.pendingEarnings || '0'),
      paidEarnings: parseFloat(profile.paidEarnings || '0'),
      totalEarnings: parseFloat(profile.totalEarnings || '0'),
      availableForPayout: parseFloat(profile.pendingEarnings || '0'),
      
      // Reservation counts
      totalReservations: reservations.length,
      paidReservations: reservations.filter(r => r.paymentStatus === 'paid').length,
      checkedInReservations: reservations.filter(r => r.checkedIn).length,
      pendingReservations: reservations.filter(r => r.paymentStatus === 'pending').length,
      
      // Commission summary
      totalCommissionEarned: reservations
        .filter(r => r.paymentStatus === 'paid')
        .reduce((sum, r) => sum + parseFloat(r.prCommissionAmount || '0'), 0),
      
      // Profile info
      prCode: profile.prCode,
      displayName: profile.displayName,
      commissionType: profile.commissionType,
      commissionValue: profile.commissionValue,
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error("Error getting PR wallet stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my wallet (for authenticated PR)
router.get("/api/reservations/my-wallet", requireAuth, requirePrOrHigher, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.userId, user.id));
    
    if (!profile) {
      return res.status(404).json({ error: "Non hai un profilo PR attivo" });
    }
    
    // Get reservation stats
    const reservations = await db.select()
      .from(reservationPayments)
      .where(eq(reservationPayments.prProfileId, profile.id));
    
    // Get payout history
    const payouts = await db.select()
      .from(prPayouts)
      .where(eq(prPayouts.prProfileId, profile.id))
      .orderBy(desc(prPayouts.createdAt));
    
    const wallet = {
      // Balances
      pendingEarnings: parseFloat(profile.pendingEarnings || '0'),
      paidEarnings: parseFloat(profile.paidEarnings || '0'),
      totalEarnings: parseFloat(profile.totalEarnings || '0'),
      availableForPayout: parseFloat(profile.pendingEarnings || '0'),
      
      // Stats this month
      thisMonthReservations: reservations.filter(r => {
        const created = new Date(r.createdAt!);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
      thisMonthEarnings: reservations
        .filter(r => {
          const created = new Date(r.createdAt!);
          const now = new Date();
          return created.getMonth() === now.getMonth() && 
                 created.getFullYear() === now.getFullYear() &&
                 r.paymentStatus === 'paid';
        })
        .reduce((sum, r) => sum + parseFloat(r.prCommissionAmount || '0'), 0),
      
      // Recent payouts
      recentPayouts: payouts.slice(0, 5),
      
      // Profile
      prCode: profile.prCode,
      displayName: profile.displayName,
    };
    
    res.json(wallet);
  } catch (error: any) {
    console.error("Error getting my wallet:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Check-in / Scanner APIs ====================

// Scan QR code for check-in
router.post("/api/reservations/scan", requireAuth, requireScanner, async (req: Request, res: Response) => {
  try {
    const { qrToken } = req.body;
    const user = req.user as any;
    
    if (!qrToken) {
      return res.status(400).json({ error: "QR code richiesto" });
    }
    
    // Find reservation by QR token
    const [reservation] = await db.select({
      payment: reservationPayments,
      event: {
        id: events.id,
        name: events.name,
        startDatetime: events.startDatetime,
      }
    })
      .from(reservationPayments)
      .leftJoin(events, eq(reservationPayments.eventId, events.id))
      .where(eq(reservationPayments.qrToken, qrToken));
    
    if (!reservation) {
      return res.status(404).json({ 
        error: "Prenotazione non trovata",
        valid: false,
      });
    }
    
    const payment = reservation.payment;
    
    // Check if already checked in
    if (payment.checkedIn) {
      return res.status(400).json({
        error: "Prenotazione già validata",
        valid: false,
        checkedInAt: payment.checkedInAt,
        data: {
          customerName: `${payment.customerFirstName} ${payment.customerLastName}`,
          reservationType: payment.reservationType,
          event: reservation.event,
        }
      });
    }
    
    // Check if payment is valid
    if (payment.paymentStatus !== 'paid') {
      return res.status(400).json({
        error: "Pagamento non completato",
        valid: false,
        paymentStatus: payment.paymentStatus,
        data: {
          customerName: `${payment.customerFirstName} ${payment.customerLastName}`,
          reservationType: payment.reservationType,
          amount: payment.amount,
        }
      });
    }
    
    // Check if access was denied
    if (payment.accessDenied) {
      return res.status(400).json({
        error: "Accesso negato",
        valid: false,
        reason: payment.accessDeniedReason,
        data: {
          customerName: `${payment.customerFirstName} ${payment.customerLastName}`,
        }
      });
    }
    
    // Mark as checked in
    const [updated] = await db.update(reservationPayments)
      .set({
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(reservationPayments.id, payment.id))
      .returning();
    
    res.json({
      valid: true,
      message: "Check-in completato con successo",
      data: {
        customerName: `${updated.customerFirstName} ${updated.customerLastName}`,
        reservationType: updated.reservationType,
        event: reservation.event,
        checkedInAt: updated.checkedInAt,
      }
    });
  } catch (error: any) {
    console.error("Error scanning reservation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verify reservation by QR token (read-only, no check-in)
router.get("/api/reservations/verify/:qrToken", async (req: Request, res: Response) => {
  try {
    const { qrToken } = req.params;
    
    const [reservation] = await db.select({
      payment: reservationPayments,
      event: {
        id: events.id,
        name: events.name,
        startDatetime: events.startDatetime,
      }
    })
      .from(reservationPayments)
      .leftJoin(events, eq(reservationPayments.eventId, events.id))
      .where(eq(reservationPayments.qrToken, qrToken));
    
    if (!reservation) {
      return res.status(404).json({ 
        valid: false,
        error: "Prenotazione non trovata" 
      });
    }
    
    const payment = reservation.payment;
    
    res.json({
      valid: payment.paymentStatus === 'paid' && !payment.accessDenied,
      status: payment.paymentStatus,
      checkedIn: payment.checkedIn,
      checkedInAt: payment.checkedInAt,
      reservationType: payment.reservationType,
      customerFirstName: payment.customerFirstName,
      customerLastName: payment.customerLastName,
      event: reservation.event,
      accessDenied: payment.accessDenied,
      accessDeniedReason: payment.accessDeniedReason,
    });
  } catch (error: any) {
    console.error("Error verifying reservation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deny access (for scanner - marks reservation as access denied)
router.post("/api/reservations/deny-access/:id", requireAuth, requireScanner, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const [updated] = await db.update(reservationPayments)
      .set({
        accessDenied: true,
        accessDeniedReason: reason || "Accesso negato all'ingresso",
        updatedAt: new Date(),
      })
      .where(eq(reservationPayments.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error denying access:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR Payout APIs ====================

// Get all payouts (for gestore)
router.get("/api/reservations/payouts", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { status, prProfileId } = req.query;
    
    let conditions = [eq(prPayouts.companyId, user.companyId)];
    
    if (prProfileId) {
      conditions.push(eq(prPayouts.prProfileId, prProfileId as string));
    }
    
    const payouts = await db.select({
      payout: prPayouts,
      prProfile: {
        id: prProfiles.id,
        displayName: prProfiles.displayName,
        prCode: prProfiles.prCode,
      },
      prUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
      .from(prPayouts)
      .leftJoin(prProfiles, eq(prPayouts.prProfileId, prProfiles.id))
      .leftJoin(users, eq(prProfiles.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(prPayouts.createdAt));
    
    let result = payouts.map(p => ({ 
      ...p.payout, 
      prProfile: p.prProfile,
      prUser: p.prUser,
    }));
    
    if (status) {
      result = result.filter(p => p.status === status);
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("Error getting payouts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my payouts (for PR)
router.get("/api/reservations/my-payouts", requireAuth, requirePrOrHigher, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.userId, user.id));
    
    if (!profile) {
      return res.status(404).json({ error: "Non hai un profilo PR attivo" });
    }
    
    const payouts = await db.select()
      .from(prPayouts)
      .where(eq(prPayouts.prProfileId, profile.id))
      .orderBy(desc(prPayouts.createdAt));
    
    res.json(payouts);
  } catch (error: any) {
    console.error("Error getting my payouts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Request payout (for PR)
router.post("/api/reservations/request-payout", requireAuth, requirePrOrHigher, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    const [profile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.userId, user.id));
    
    if (!profile) {
      return res.status(404).json({ error: "Non hai un profilo PR attivo" });
    }
    
    const availableAmount = parseFloat(profile.pendingEarnings || '0');
    
    if (availableAmount <= 0) {
      return res.status(400).json({ error: "Nessun importo disponibile per il payout" });
    }
    
    // Get count of reservations in pending earnings
    const pendingReservations = await db.select()
      .from(reservationPayments)
      .where(and(
        eq(reservationPayments.prProfileId, profile.id),
        eq(reservationPayments.paymentStatus, 'paid'),
        eq(reservationPayments.prCommissionPaid, false)
      ));
    
    // Create payout request
    const [payout] = await db.insert(prPayouts).values({
      companyId: profile.companyId,
      prProfileId: profile.id,
      amount: availableAmount.toFixed(2),
      currency: 'EUR',
      status: 'pending',
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      periodEnd: new Date(),
      reservationCount: pendingReservations.length,
      notes: `Richiesta payout da ${profile.displayName || 'PR'}`,
    }).returning();
    
    res.status(201).json({
      payout,
      message: "Richiesta di payout inviata. Verrà processata entro 3-5 giorni lavorativi.",
    });
  } catch (error: any) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ error: error.message });
  }
});

// Process payout (for gestore - marks as paid)
router.patch("/api/reservations/payouts/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const { status, paymentMethod, paymentReference, notes } = req.body;
    
    // Get current payout
    const [currentPayout] = await db.select()
      .from(prPayouts)
      .where(eq(prPayouts.id, id));
    
    if (!currentPayout) {
      return res.status(404).json({ error: "Payout non trovato" });
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (paymentReference) updateData.paymentReference = paymentReference;
    if (notes) updateData.notes = notes;
    
    // If marking as paid, update PR wallet
    if (status === 'paid' && currentPayout.status !== 'paid') {
      const amount = parseFloat(currentPayout.amount || '0');
      
      // Move from pending to paid in PR wallet
      await db.update(prProfiles)
        .set({
          pendingEarnings: sql`pending_earnings - ${amount}`,
          paidEarnings: sql`paid_earnings + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(prProfiles.id, currentPayout.prProfileId));
      
      // Mark all related reservations as commission paid
      await db.update(reservationPayments)
        .set({
          prCommissionPaid: true,
          prCommissionPaidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(reservationPayments.prProfileId, currentPayout.prProfileId),
          eq(reservationPayments.paymentStatus, 'paid'),
          eq(reservationPayments.prCommissionPaid, false)
        ));
      
      updateData.paidAt = new Date();
      updateData.paidBy = user.id;
    }
    
    const [updated] = await db.update(prPayouts)
      .set(updateData)
      .where(eq(prPayouts.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating payout:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create payout manually (for gestore)
router.post("/api/reservations/payouts", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validated = insertPrPayoutSchema.parse({
      ...req.body,
      companyId: user.companyId,
    });
    
    const [payout] = await db.insert(prPayouts).values(validated).returning();
    res.status(201).json(payout);
  } catch (error: any) {
    console.error("Error creating payout:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
