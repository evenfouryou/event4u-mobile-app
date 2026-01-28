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
  companies,
  listEntries,
  tableReservations,
  tableTypes,
  userCompanyRoles,
  siaeCustomers,
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
  // Check for passport authentication OR PR session authentication
  const prSession = (req.session as any)?.prProfile;
  
  if (prSession?.id) {
    // PR is authenticated via their session
    // Set a virtual user object for consistency
    (req as any).user = {
      id: prSession.id,
      role: 'pr',
      companyId: prSession.companyId,
      isPr: true
    };
    return next();
  }
  
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  next();
}

function requireGestore(req: Request, res: Response, next: NextFunction) {
  // Get user from req.user or session.passport.user (fallback for session issues)
  const passportUser = (req.session as any)?.passport?.user;
  const user = req.user || passportUser;
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
  commissionPercentage: number,
  commissionFixedPerPerson: number,
  personCount: number = 1
): number {
  let total = 0;
  if (commissionPercentage > 0) {
    total += (amount * commissionPercentage) / 100;
  }
  if (commissionFixedPerPerson > 0) {
    total += commissionFixedPerPerson * personCount;
  }
  return total;
}

// ==================== PR Profile APIs ====================

// Search users by phone for customer-to-PR promotion
router.get("/api/reservations/search-users", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const phone = req.query.phone as string;
    
    if (!phone || phone.length < 5) {
      return res.json([]);
    }
    
    // Clean phone number (remove spaces, dashes)
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    
    // Search for users by phone (partial match)
    const results = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      companyId: users.companyId,
    })
      .from(users)
      .where(
        and(
          sql`${users.phone} LIKE ${'%' + cleanPhone + '%'}`,
          or(
            eq(users.companyId, user.companyId),
            sql`${users.companyId} IS NULL`
          )
        )
      )
      .limit(10);
    
    // Check which users already have a PR profile for this company
    const userIds = results.map(u => u.id);
    const existingPrProfiles = userIds.length > 0 
      ? await db.select({ userId: prProfiles.userId })
          .from(prProfiles)
          .where(and(
            sql`${prProfiles.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`,
            eq(prProfiles.companyId, user.companyId)
          ))
      : [];
    
    const existingPrUserIds = new Set(existingPrProfiles.map(p => p.userId));
    
    // Return users with flag indicating if they're already PR
    const enrichedResults = results.map(u => ({
      ...u,
      isAlreadyPr: existingPrUserIds.has(u.id),
    }));
    
    res.json(enrichedResults);
  } catch (error: any) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all PR profiles for company
router.get("/api/reservations/pr-profiles", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const includeStaff = req.query.includeStaff === 'true';
    console.log(`[PR-PROFILES] User ${user.id} (company: ${user.companyId}) fetching PR profiles, includeStaff=${includeStaff}`);
    
    const whereConditions = [eq(prProfiles.companyId, user.companyId)];
    
    // By default, exclude Staff members (isStaff = true) unless specifically requested
    if (!includeStaff) {
      whereConditions.push(eq(prProfiles.isStaff, false));
    }
    
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
      .where(and(...whereConditions))
      .orderBy(desc(prProfiles.createdAt));
    
    const result = profiles.map(p => ({ ...p.profile, user: p.user }));
    console.log(`[PR-PROFILES] Found ${result.length} profiles:`, result.map(r => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, isStaff: r.isStaff })));
    
    res.json(result);
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
    
    // Check if phone already exists for THIS company
    const fullPhone = `${validated.phonePrefix || '+39'}${validated.phone}`;
    const [existingInCompany] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.phone, validated.phone),
        eq(prProfiles.phonePrefix, validated.phonePrefix || '+39'),
        eq(prProfiles.companyId, user.companyId)
      ));
    
    if (existingInCompany) {
      return res.status(400).json({ error: "Questo numero di telefono è già registrato come PR nella tua azienda" });
    }
    
    // Check if phone exists in OTHER companies (multi-company PR support)
    const [existingInOtherCompany] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.phone, validated.phone),
        eq(prProfiles.phonePrefix, validated.phonePrefix || '+39')
      ));
    
    // Check if this phone is a registered customer
    const [existingCustomer] = await db.select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.phone, fullPhone));
    
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
    
    let userId: string | null = null;
    let isExistingUser = false;
    
    // PRIORITY 1: Check if existingUserId is provided (promotion from customer search)
    if (req.body.existingUserId) {
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.id, req.body.existingUserId));
      
      if (existingUser) {
        // Verify user belongs to same company or has no company (customer)
        if (!existingUser.companyId || existingUser.companyId === user.companyId) {
          userId = existingUser.id;
          isExistingUser = true;
          console.log(`[PR] Promoting existing user ${userId} to PR (customer -> PR)`);
          
          // Always update user's role to 'pr' and set companyId if needed
          await db.update(users)
            .set({ companyId: user.companyId, role: 'pr' })
            .where(eq(users.id, userId));
        }
      }
    }
    
    // PRIORITY 2: Check if phone exists in other company (multi-company PR)
    if (!userId && existingInOtherCompany && existingInOtherCompany.userId) {
      userId = existingInOtherCompany.userId;
      isExistingUser = true;
      console.log(`[PR] Phone ${fullPhone} already PR in another company, linking to existing user ${userId}`);
    }
    
    // PRIORITY 3: Check if phone exists as a registered customer/user in the SAME company
    if (!userId) {
      const [existingPhoneUser] = await db.select({ id: users.id, companyId: users.companyId, role: users.role })
        .from(users)
        .where(eq(users.phone, fullPhone));
      
      if (existingPhoneUser && (!existingPhoneUser.companyId || existingPhoneUser.companyId === user.companyId)) {
        userId = existingPhoneUser.id;
        isExistingUser = true;
        console.log(`[PR] Phone ${fullPhone} found as existing user, promoting to PR`);
        
        // Update user's role and companyId if needed
        await db.update(users)
          .set({ 
            companyId: user.companyId, 
            role: 'pr' 
          })
          .where(eq(users.id, userId));
      }
    }
    
    // PRIORITY 4: If no existing user found, create a new user account
    if (!userId) {
      const prEmail = (req.body.email as string) || `pr-${validated.phone}@pr.event4u.local`;
      
      // Check if email already exists in the SAME company
      const [existingEmailUser] = await db.select({ id: users.id, companyId: users.companyId })
        .from(users)
        .where(eq(users.email, prEmail));
      
      if (existingEmailUser && existingEmailUser.companyId === user.companyId) {
        // Only link to existing user if in the same company
        userId = existingEmailUser.id;
        isExistingUser = true;
        console.log(`[PR] Email ${prEmail} already exists in same company, linking to user ${userId}`);
      } else {
        // Generate unique email to avoid conflicts with other companies
        const uniqueEmail = existingEmailUser 
          ? `pr-${validated.phone}-${Date.now()}@pr.event4u.local`
          : prEmail;
        
        // Create new user account
        const [newUser] = await db.insert(users).values({
          email: uniqueEmail,
          passwordHash: passwordHash,
          firstName: validated.firstName,
          lastName: validated.lastName,
          phone: fullPhone,
          role: 'pr',
          companyId: user.companyId,
          emailVerified: false,
        }).returning();
        
        userId = newUser.id;
        console.log(`[PR] Created new user account ${userId} for PR ${validated.firstName} ${validated.lastName}`);
      }
    }
    
    // Create PR profile for this company
    const [profile] = await db.insert(prProfiles).values({
      userId: userId,
      companyId: user.companyId,
      firstName: validated.firstName,
      lastName: validated.lastName,
      phonePrefix: validated.phonePrefix || '+39',
      phone: validated.phone,
      displayName: `${validated.firstName} ${validated.lastName}`,
      prCode,
      passwordHash,
      commissionPercentage: validated.commissionPercentage || '0',
      commissionFixedPerPerson: validated.commissionFixedPerPerson || '0',
      defaultListCommission: validated.defaultListCommission || '0',
      defaultTableCommission: validated.defaultTableCommission || '0',
    }).returning();
    
    // Create userCompanyRoles entry for multi-company tracking
    if (userId) {
      await db.insert(userCompanyRoles).values({
        userId: userId,
        companyId: user.companyId,
        role: 'pr',
        parentUserId: user.id, // The gestore who added them
      }).onConflictDoNothing();
    }
    
    // If customer exists with same phone, link the accounts
    // Otherwise, create a new customer automatically for seamless switch
    let linkedCustomerId: string | null = null;
    
    if (existingCustomer && profile.id) {
      // Link to existing customer
      linkedCustomerId = existingCustomer.id;
      if (userId) {
        await db.update(users)
          .set({ siaeCustomerId: existingCustomer.id })
          .where(eq(users.id, userId));
      }
      console.log(`[PR] Linked PR ${profile.id} to existing customer ${existingCustomer.id}`);
    } else {
      // Auto-create a customer for this PR to enable seamless switching
      try {
        // Generate unique code for the auto-created customer
        const uniqueCode = `PR-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        // Generate a placeholder email for auto-created customer (PR can update later)
        const customerEmail = `pr-${validated.phone}@auto.event4u.local`;
        
        const [newCustomer] = await db.insert(siaeCustomers).values({
          uniqueCode,
          email: customerEmail,
          phone: fullPhone,
          firstName: validated.firstName,
          lastName: validated.lastName,
          phoneVerified: true, // PR customers are pre-verified
          emailVerified: false, // Placeholder email not verified
          registrationCompleted: true,
          authenticationType: 'BO', // Back-office created
        }).returning();
        
        linkedCustomerId = newCustomer.id;
        
        if (userId) {
          await db.update(users)
            .set({ siaeCustomerId: newCustomer.id })
            .where(eq(users.id, userId));
        }
        console.log(`[PR] Auto-created customer ${newCustomer.id} for PR ${profile.id}`);
      } catch (err) {
        console.error(`[PR] Failed to auto-create customer for PR ${profile.id}:`, err);
        // Non-critical error - PR can still work without linked customer
      }
    }
    
    // Build access link
    const baseUrl = process.env.CUSTOM_DOMAIN 
      ? `https://${process.env.CUSTOM_DOMAIN}` 
      : process.env.PUBLIC_URL || 'https://eventfouryou.com';
    const accessLink = `${baseUrl}/login`;
    
    // Only send SMS if new user (existing users already have credentials)
    let smsResult = { success: true, message: 'Credenziali già esistenti' };
    if (!isExistingUser) {
      smsResult = await sendPrCredentialsSMS(
        fullPhone,
        validated.firstName,
        password,
        accessLink
      );
    }
    
    console.log(`[PR] Created PR ${profile.id} for ${validated.firstName} ${validated.lastName}, Existing: ${isExistingUser}, SMS: ${smsResult.success ? 'sent' : 'skipped'}`);
    
    res.status(201).json({
      ...profile,
      passwordHash: undefined, // Don't return hash
      smsSent: smsResult.success,
      smsMessage: isExistingUser ? 'Il PR esiste già in un\'altra azienda. Può accedere con le stesse credenziali.' : smsResult.message,
      isExistingUser
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
    
    // Send SMS (use full phone with prefix)
    const fullPhone = `${profile.phonePrefix || '+39'}${profile.phone}`;
    const smsResult = await sendPrCredentialsSMS(
      fullPhone,
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
    
    // Get user from session.passport.user (Passport stores user data here)
    const passportUser = (req.session as any)?.passport?.user;
    const user = req.user || passportUser;
    
    console.log(`[PR-IMPERSONATE] Starting impersonation for PR ${id} by user ${user?.id} (company: ${user?.companyId})`);
    
    // Verify PR belongs to gestore's company
    const [profile] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.id, id),
        eq(prProfiles.companyId, user.companyId)
      ));
    
    if (!profile) {
      console.log(`[PR-IMPERSONATE] PR ${id} not found for company ${user.companyId}`);
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    if (!profile.isActive) {
      console.log(`[PR-IMPERSONATE] PR ${id} is inactive`);
      return res.status(400).json({ error: "Il PR è disattivato" });
    }
    
    if (!user?.id || !user?.companyId) {
      console.error("[PR-IMPERSONATE] User data incomplete in session");
      return res.status(401).json({ error: "Sessione non valida. Effettua nuovamente il login." });
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
        console.error("[PR-IMPERSONATE] Error saving session:", saveErr);
        return res.status(500).json({ error: "Errore durante l'impersonazione" });
      }
      
      console.log(`[PR-IMPERSONATE] Success - User ${user.id} now impersonating PR ${profile.id}`);
      
      res.json({ 
        success: true, 
        message: "Impersonazione attivata",
        prProfile: prProfileData
      });
    });
  } catch (error: any) {
    console.error("[PR-IMPERSONATE] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR Authentication APIs ====================

// PR Login via phone + password
router.post("/api/pr/login", async (req: Request, res: Response) => {
  try {
    const { phone, phonePrefix, phoneNumber, password } = req.body;
    
    if ((!phone && !phoneNumber) || !password) {
      return res.status(400).json({ error: "Telefono e password richiesti" });
    }
    
    // Build search criteria based on input format
    // New format: phonePrefix + phoneNumber (from structured login form)
    // Old format: phone (full phone string)
    let profile;
    
    if (phonePrefix && phoneNumber) {
      // New structured format: search by prefix + number
      [profile] = await db.select()
        .from(prProfiles)
        .where(and(
          eq(prProfiles.phonePrefix, phonePrefix),
          eq(prProfiles.phone, phoneNumber)
        ));
      
      // If not found, try just the number (for legacy data)
      if (!profile) {
        [profile] = await db.select()
          .from(prProfiles)
          .where(eq(prProfiles.phone, phoneNumber));
      }
    } else {
      // Legacy format: normalize phone and search
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Extract the number part by removing common country code prefixes
      let numberPart = cleanPhone;
      
      // Remove Italian prefix
      if (cleanPhone.startsWith('39') && cleanPhone.length >= 12) {
        numberPart = cleanPhone.substring(2);
      } 
      // Remove US/Canada prefix  
      else if (cleanPhone.startsWith('1') && cleanPhone.length >= 11) {
        numberPart = cleanPhone.substring(1);
      }
      // Remove other common European prefixes
      else if (['44', '33', '49', '34', '41', '43', '32', '31'].some(c => 
        cleanPhone.startsWith(c) && cleanPhone.length >= 10 + c.length
      )) {
        const prefix = ['44', '33', '49', '34', '41', '43', '32', '31'].find(c => 
          cleanPhone.startsWith(c)
        );
        if (prefix) {
          numberPart = cleanPhone.substring(prefix.length);
        }
      }
      
      // Search by normalized number (without country code)
      [profile] = await db.select()
        .from(prProfiles)
        .where(eq(prProfiles.phone, numberPart));
      
      // If still not found, try the raw cleaned phone (for truly legacy data)
      if (!profile) {
        [profile] = await db.select()
          .from(prProfiles)
          .where(eq(prProfiles.phone, cleanPhone));
      }
    }
    
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
    
    // Silently ensure customer profile exists for this PR (background task)
    (async () => {
      try {
        const normalizePhone = (phone: string): string => {
          let normalized = phone.replace(/[^\d+]/g, '');
          if (normalized.startsWith('0039')) normalized = '+39' + normalized.slice(4);
          if (normalized.startsWith('39') && !normalized.startsWith('+')) normalized = '+' + normalized;
          if (!normalized.startsWith('+')) normalized = '+39' + normalized;
          if (normalized.startsWith('+390')) normalized = '+39' + normalized.slice(4);
          return normalized;
        };
        
        const prFullPhone = normalizePhone(`${profile.phonePrefix || '+39'}${profile.phone}`);
        const customers = await db.select().from(siaeCustomers);
        let existingCustomer = customers.find(c => c.phone && normalizePhone(c.phone) === prFullPhone) || null;
        
        if (!existingCustomer && profile.email) {
          const [byEmail] = await db.select().from(siaeCustomers)
            .where(sql`lower(${siaeCustomers.email}) = lower(${profile.email})`);
          existingCustomer = byEmail || null;
        }
        
        if (!existingCustomer) {
          const uniqueCode = `PR-${profile.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
          await db.insert(siaeCustomers).values({
            uniqueCode,
            firstName: profile.firstName || 'PR',
            lastName: profile.lastName || 'User',
            email: profile.email || `pr-${profile.id}@temp.local`,
            phone: prFullPhone,
            phoneVerified: profile.phoneVerified || false,
            emailVerified: false,
            authenticationType: 'BO',
          });
          console.log(`[PR-LOGIN] Auto-created customer profile for PR ${profile.id}`);
        }
      } catch (err) {
        console.log(`[PR-LOGIN] Could not auto-create customer (may already exist): ${err}`);
      }
    })();
    
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
            commissionPercentage: profile.commissionPercentage,
            commissionFixedPerPerson: profile.commissionFixedPerPerson,
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
    
    console.log(`[PR-ME] Checking PR session - exists: ${!!prSession}, sessionId: ${req.session?.id?.substring(0,8)}...`);
    
    if (!prSession) {
      console.log(`[PR-ME] No prProfile in session`);
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
      commissionPercentage: profile.commissionPercentage,
      commissionFixedPerPerson: profile.commissionFixedPerPerson,
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

// PR Switch to Customer Mode - Seamlessly switch to linked customer account or create one
router.post("/api/pr/switch-to-customer", async (req: Request, res: Response) => {
  try {
    // Support both PR session auth and normal user auth
    const prSession = (req.session as any).prProfile;
    const user = (req as any).user;
    
    let prProfile = null;
    
    if (prSession) {
      // PR session auth - get profile by session ID
      const [profile] = await db.select()
        .from(prProfiles)
        .where(eq(prProfiles.id, prSession.id));
      prProfile = profile;
    } else if (user) {
      // Normal user auth - check if user has a PR profile linked
      const [profile] = await db.select()
        .from(prProfiles)
        .where(eq(prProfiles.userId, user.id));
      prProfile = profile;
      
      // If no PR profile by userId, try by email
      if (!prProfile && user.email) {
        const [profileByEmail] = await db.select()
          .from(prProfiles)
          .where(sql`lower(${prProfiles.email}) = lower(${user.email})`);
        prProfile = profileByEmail;
      }
    }
    
    if (!prProfile) {
      return res.status(401).json({ error: "Non sei un PR o non hai un profilo PR collegato" });
    }
    
    // Normalize phone number: remove all non-digits except +, ensure +39 prefix
    const normalizePhone = (phone: string): string => {
      let normalized = phone.replace(/[^\d+]/g, '');
      if (normalized.startsWith('0039')) {
        normalized = '+39' + normalized.slice(4);
      }
      if (normalized.startsWith('39') && !normalized.startsWith('+')) {
        normalized = '+' + normalized;
      }
      if (!normalized.startsWith('+')) {
        normalized = '+39' + normalized;
      }
      if (normalized.startsWith('+390')) {
        normalized = '+39' + normalized.slice(4);
      }
      return normalized;
    };
    
    // Look for a customer with the same phone number or email
    let customer = null;
    
    if (prProfile.phone) {
      const prFullPhone = normalizePhone(`${prProfile.phonePrefix || '+39'}${prProfile.phone}`);
      const customers = await db.select().from(siaeCustomers);
      customer = customers.find(c => c.phone && normalizePhone(c.phone) === prFullPhone) || null;
    }
    
    // If not found by phone, try email (case insensitive)
    if (!customer && prProfile.email) {
      const [foundByEmail] = await db.select()
        .from(siaeCustomers)
        .where(sql`lower(${siaeCustomers.email}) = lower(${prProfile.email})`);
      customer = foundByEmail;
    }
    
    // If customer not found, CREATE a new customer profile
    if (!customer) {
      const fullPhone = prProfile.phone 
        ? normalizePhone(`${prProfile.phonePrefix || '+39'}${prProfile.phone}`)
        : null;
      
      // Extract first/last name from displayName or firstName/lastName fields
      let firstName = prProfile.firstName || '';
      let lastName = prProfile.lastName || '';
      
      if (!firstName && !lastName && prProfile.displayName) {
        const nameParts = prProfile.displayName.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Generate unique code for the customer
      const uniqueCode = `PR-${prProfile.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
      
      const [newCustomer] = await db.insert(siaeCustomers).values({
        uniqueCode,
        firstName: firstName || 'PR',
        lastName: lastName || prProfile.displayName || 'User',
        email: prProfile.email || `pr-${prProfile.id}@temp.local`,
        phone: fullPhone || `+39000${Date.now().toString().slice(-7)}`,
        phoneVerified: prProfile.phoneVerified || false,
        emailVerified: false,
        authenticationType: 'BO',
      }).returning();
      
      customer = newCustomer;
      console.log(`[PR-SWITCH] Created new customer ${customer.id} for PR ${prProfile.id}`);
    }
    
    // Store original PR session for switching back later
    if ((req.session as any).prProfile) {
      (req.session as any).originalPrSession = {
        prProfileId: (req.session as any).prProfile.id,
        companyId: (req.session as any).prProfile.companyId,
        prCode: (req.session as any).prProfile.prCode,
      };
      // Remove active PR profile from session
      delete (req.session as any).prProfile;
    }
    
    // Set up customer session
    (req.session as any).customer = {
      id: customer.id,
    };
    
    // Set activeRole to cliente for auth compatibility
    (req.session as any).activeRole = 'cliente';
    
    // Also set customerMode for compatibility
    (req.session as any).customerMode = {
      customerId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
    };
    
    console.log(`[PR-SWITCH] PR ${prProfile!.id} switched to customer ${customer.id}, stored original PR session`);
    
    // Save the session with customer mode activated
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session after switch:", err);
        return res.status(500).json({ error: "Errore nel cambio modalità" });
      }
      res.json({ 
        success: true, 
        message: "Modalità cliente attivata",
        customerId: customer!.id,
        redirect: "/account"
      });
    });
  } catch (error: any) {
    console.error("Error switching to customer mode:", error);
    res.status(500).json({ error: error.message });
  }
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
        startDatetime: events.startDatetime,
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [payout] = await db.insert(prPayouts).values({
      prProfileId: prSession.id,
      companyId: prSession.companyId,
      amount: profile.pendingEarnings,
      status: 'pending',
      periodStart: startOfMonth,
      periodEnd: now,
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
        
        // Calculate commission (both percentage and fixed per person)
        const amount = parseFloat(data.amount || '0');
        const personCount = parseInt(data.personCount || '1', 10) || 1;
        const commission = calculateCommission(
          amount,
          parseFloat(prProfile.commissionPercentage || '0'),
          parseFloat(prProfile.commissionFixedPerPerson || '0'),
          personCount
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
      commissionPercentage: profile.commissionPercentage,
      commissionFixedPerPerson: profile.commissionFixedPerPerson,
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

// ==================== PR Session Work APIs ====================
// These endpoints use session.prProfile for PR phone authentication

// Middleware to require PR session with database validation
async function requirePrSession(req: Request, res: Response, next: NextFunction) {
  const prSession = (req.session as any).prProfile;
  if (!prSession || !prSession.id || !prSession.companyId) {
    return res.status(401).json({ error: "Non autenticato come PR" });
  }
  
  // Validate PR session against database
  const [profile] = await db.select()
    .from(prProfiles)
    .where(and(
      eq(prProfiles.id, prSession.id),
      eq(prProfiles.companyId, prSession.companyId),
      eq(prProfiles.isActive, true)
    ));
  
  if (!profile) {
    delete (req.session as any).prProfile;
    return res.status(401).json({ error: "Sessione PR non valida" });
  }
  
  // Refresh session data
  (req.session as any).prProfile = {
    ...prSession,
    companyId: profile.companyId
  };
  
  next();
}

// Helper to validate event belongs to PR's company
async function validateEventOwnership(eventId: string, companyId: string): Promise<boolean> {
  const [event] = await db.select({ id: events.id })
    .from(events)
    .where(and(
      eq(events.id, eventId),
      eq(events.companyId, companyId)
    ));
  return !!event;
}

// Get events for PR (events with their list entries or table reservations)
router.get("/api/pr-session/events", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    // Get all events from PR's company that are upcoming or recent
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const eventsList = await db.select()
      .from(events)
      .where(and(
        eq(events.companyId, prSession.companyId),
        gte(events.startDatetime, thirtyDaysAgo)
      ))
      .orderBy(desc(events.startDatetime));
    
    res.json(eventsList);
  } catch (error: any) {
    console.error("Error getting PR events:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR's list entries for an event
router.get("/api/pr-session/events/:eventId/list-entries", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    const { eventId } = req.params;
    
    // Validate event belongs to PR's company
    const eventOwned = await validateEventOwnership(eventId, prSession.companyId);
    if (!eventOwned) {
      return res.status(403).json({ error: "Evento non trovato o non autorizzato" });
    }
    
    // Get entries for this event (scoped to company for security)
    const entries = await db.select()
      .from(listEntries)
      .where(and(
        eq(listEntries.eventId, eventId),
        eq(listEntries.companyId, prSession.companyId)
      ))
      .orderBy(desc(listEntries.createdAt));
    
    res.json(entries);
  } catch (error: any) {
    console.error("Error getting PR list entries:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add list entry (PR session)
router.post("/api/pr-session/events/:eventId/list-entries", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    const { eventId } = req.params;
    const { firstName, lastName, phone, email, gender, notes, listId } = req.body;
    
    // Validate event belongs to PR's company
    const eventOwned = await validateEventOwnership(eventId, prSession.companyId);
    if (!eventOwned) {
      return res.status(403).json({ error: "Evento non trovato o non autorizzato" });
    }
    
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: "Nome, cognome e telefono sono obbligatori" });
    }
    
    // Generate QR code
    const qrCode = `LST-${eventId.slice(0, 6).toUpperCase()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    
    const [entry] = await db.insert(listEntries).values({
      listId: listId || eventId, // Use eventId as fallback if no specific list
      eventId,
      companyId: prSession.companyId,
      firstName,
      lastName,
      phone,
      email: email || null,
      gender: gender || null,
      notes: notes || null,
      qrCode,
      status: 'pending',
      createdByRole: 'pr',
    }).returning();
    
    res.status(201).json(entry);
  } catch (error: any) {
    console.error("Error creating list entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR's table reservations for an event  
router.get("/api/pr-session/events/:eventId/table-reservations", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    const { eventId } = req.params;
    
    // Validate event belongs to PR's company
    const eventOwned = await validateEventOwnership(eventId, prSession.companyId);
    if (!eventOwned) {
      return res.status(403).json({ error: "Evento non trovato o non autorizzato" });
    }
    
    const reservations = await db.select()
      .from(tableReservations)
      .where(and(
        eq(tableReservations.eventId, eventId),
        eq(tableReservations.companyId, prSession.companyId)
      ))
      .orderBy(desc(tableReservations.createdAt));
    
    res.json(reservations);
  } catch (error: any) {
    console.error("Error getting PR table reservations:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add table reservation (PR session)
router.post("/api/pr-session/events/:eventId/table-reservations", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    const { eventId } = req.params;
    const { tableTypeId, reservationName, reservationPhone, notes } = req.body;
    
    // Validate event belongs to PR's company
    const eventOwned = await validateEventOwnership(eventId, prSession.companyId);
    if (!eventOwned) {
      return res.status(403).json({ error: "Evento non trovato o non autorizzato" });
    }
    
    if (!tableTypeId || !reservationName) {
      return res.status(400).json({ error: "Tipo tavolo e nome prenotazione sono obbligatori" });
    }
    
    // Validate tableType belongs to company
    const [tableType] = await db.select()
      .from(tableTypes)
      .where(and(
        eq(tableTypes.id, tableTypeId),
        eq(tableTypes.companyId, prSession.companyId)
      ));
    
    if (!tableType) {
      return res.status(403).json({ error: "Tipo tavolo non autorizzato" });
    }
    
    const [reservation] = await db.insert(tableReservations).values({
      tableTypeId,
      eventId,
      companyId: prSession.companyId,
      reservationName,
      reservationPhone: reservationPhone || null,
      notes: notes || null,
      status: 'pending',
      createdByRole: 'pr',
    }).returning();
    
    res.status(201).json(reservation);
  } catch (error: any) {
    console.error("Error creating table reservation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR statistics (entries, reservations, cancellations)
router.get("/api/pr-session/stats", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    // Get list entries stats
    const listStats = await db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) FILTER (WHERE status = 'pending')::int`,
      confirmed: sql<number>`count(*) FILTER (WHERE status = 'confirmed')::int`,
      checkedIn: sql<number>`count(*) FILTER (WHERE status = 'checked_in' OR checked_in_at IS NOT NULL)::int`,
      cancelled: sql<number>`count(*) FILTER (WHERE status = 'cancelled')::int`,
    })
      .from(listEntries)
      .where(eq(listEntries.companyId, prSession.companyId));
    
    // Get table reservations stats
    const tableStats = await db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) FILTER (WHERE status = 'pending')::int`,
      approved: sql<number>`count(*) FILTER (WHERE status = 'approved')::int`,
      rejected: sql<number>`count(*) FILTER (WHERE status = 'rejected')::int`,
    })
      .from(tableReservations)
      .where(eq(tableReservations.companyId, prSession.companyId));
    
    // Get paid reservations stats (from reservation payments)
    const paidStats = await db.select({
      total: sql<number>`count(*)::int`,
      totalAmount: sql<string>`COALESCE(SUM(amount), 0)`,
      totalCommission: sql<string>`COALESCE(SUM(pr_commission_amount), 0)`,
    })
      .from(reservationPayments)
      .where(and(
        eq(reservationPayments.prProfileId, prSession.id),
        eq(reservationPayments.paymentStatus, 'paid')
      ));
    
    res.json({
      lists: listStats[0] || { total: 0, pending: 0, confirmed: 0, checkedIn: 0, cancelled: 0 },
      tables: tableStats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 },
      paidReservations: {
        total: paidStats[0]?.total || 0,
        totalAmount: parseFloat(paidStats[0]?.totalAmount) || 0,
        totalCommission: parseFloat(paidStats[0]?.totalCommission) || 0,
      },
    });
  } catch (error: any) {
    console.error("Error getting PR stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR contacts/rubrica (unique customers from entries)
router.get("/api/pr-session/contacts", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    
    // Get unique contacts from list entries
    const contacts = await db.select({
      firstName: listEntries.firstName,
      lastName: listEntries.lastName,
      phone: listEntries.phone,
      email: listEntries.email,
      gender: listEntries.gender,
      lastSeen: sql<string>`MAX(${listEntries.createdAt})`,
      entryCount: sql<number>`count(*)::int`,
    })
      .from(listEntries)
      .where(eq(listEntries.companyId, prSession.companyId))
      .groupBy(listEntries.firstName, listEntries.lastName, listEntries.phone, listEntries.email, listEntries.gender)
      .orderBy(sql`MAX(${listEntries.createdAt}) DESC`)
      .limit(500);
    
    res.json(contacts);
  } catch (error: any) {
    console.error("Error getting PR contacts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer attendance stats
router.get("/api/pr-session/customer-stats", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({ error: "Telefono richiesto" });
    }
    
    // Get all entries for this customer
    const customerEntries = await db.select({
      entry: listEntries,
      eventName: events.name,
      eventDate: events.startDatetime,
    })
      .from(listEntries)
      .leftJoin(events, eq(listEntries.eventId, events.id))
      .where(and(
        eq(listEntries.companyId, prSession.companyId),
        eq(listEntries.phone, phone as string)
      ))
      .orderBy(desc(listEntries.createdAt));
    
    const stats = {
      totalEntries: customerEntries.length,
      checkedIn: customerEntries.filter(e => e.entry.checkedInAt).length,
      noShow: customerEntries.filter(e => !e.entry.checkedInAt && e.entry.status !== 'cancelled').length,
      cancelled: customerEntries.filter(e => e.entry.status === 'cancelled').length,
      history: customerEntries.map(e => ({
        eventName: e.eventName,
        eventDate: e.eventDate,
        status: e.entry.status,
        checkedIn: !!e.entry.checkedInAt,
        createdAt: e.entry.createdAt,
      })),
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error("Error getting customer stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete list entry (PR session)
router.delete("/api/pr-session/list-entries/:id", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    const { id } = req.params;
    
    // Only delete if belongs to PR's company
    const [deleted] = await db.delete(listEntries)
      .where(and(
        eq(listEntries.id, id),
        eq(listEntries.companyId, prSession.companyId)
      ))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Voce non trovata" });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting list entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table reservation (PR session)
router.delete("/api/pr-session/table-reservations/:id", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any).prProfile;
    const { id } = req.params;
    
    // Only delete if belongs to PR's company and is pending
    const [deleted] = await db.delete(tableReservations)
      .where(and(
        eq(tableReservations.id, id),
        eq(tableReservations.companyId, prSession.companyId),
        eq(tableReservations.status, 'pending')
      ))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Prenotazione non trovata o già confermata" });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting table reservation:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Role Switching APIs ====================

// Switch from PR to Customer mode
router.post("/api/switch-role/customer", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const prSession = (req.session as any)?.prProfile;
    
    // Only PR users can switch to customer mode
    if (user.role !== 'pr' || !prSession?.id) {
      return res.status(403).json({ error: "Solo i PR possono passare alla modalità cliente" });
    }
    
    // Get the PR profile
    const [profile] = await db.select().from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));
    
    if (!profile) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    // Find linked customer account by multiple methods
    let customer = null;
    
    // Method 1: Check if PR profile has userId with siaeCustomerId
    if (profile.userId) {
      const [linkedUser] = await db.select().from(users)
        .where(eq(users.id, profile.userId));
      if (linkedUser?.siaeCustomerId) {
        const [linkedCustomer] = await db.select().from(siaeCustomers)
          .where(eq(siaeCustomers.id, linkedUser.siaeCustomerId));
        if (linkedCustomer) customer = linkedCustomer;
      }
    }
    
    // Method 2: Find customer by phone match
    if (!customer) {
      const fullPhone = `${profile.phonePrefix || '+39'}${profile.phone}`;
      const [phoneCustomer] = await db.select().from(siaeCustomers)
        .where(eq(siaeCustomers.phone, fullPhone));
      if (phoneCustomer) customer = phoneCustomer;
    }
    
    // Method 3: Find customer by email match
    if (!customer && profile.email) {
      const [emailCustomer] = await db.select().from(siaeCustomers)
        .where(eq(siaeCustomers.email, profile.email));
      if (emailCustomer) customer = emailCustomer;
    }
    
    // Method 4: Auto-create customer account from PR profile if none exists
    if (!customer) {
      const fullPhone = `${profile.phonePrefix || '+39'}${profile.phone}`;
      const uniqueCode = `PR-${crypto.randomUUID().slice(0, 12)}`;
      const customerEmail = profile.email || `pr_${crypto.randomUUID().slice(0, 8)}@event4u.app`;
      
      try {
        const [newCustomer] = await db.insert(siaeCustomers)
          .values({
            uniqueCode: uniqueCode,
            firstName: profile.firstName || 'PR',
            lastName: profile.lastName || 'User',
            phone: fullPhone,
            email: customerEmail,
            userId: profile.userId || null,
            registrationCompleted: true,
            authenticationType: 'BO',
            phoneVerified: true,
            emailVerified: !!profile.email,
          })
          .returning();
        customer = newCustomer;
        console.log(`[ROLE-SWITCH] Created customer account ${customer.id} for PR ${profile.id}`);
      } catch (insertError: any) {
        // Handle unique constraint violations - try to find existing customer by phone/email again
        console.error(`[ROLE-SWITCH] Insert failed for PR ${profile.id}:`, insertError.message);
        
        // Try one more time with phone only (might have been race condition)
        const [existingByPhone] = await db.select().from(siaeCustomers)
          .where(eq(siaeCustomers.phone, fullPhone));
        if (existingByPhone) {
          customer = existingByPhone;
          console.log(`[ROLE-SWITCH] Found existing customer ${customer.id} by phone after insert failure`);
        } else if (profile.email) {
          const [existingByEmail] = await db.select().from(siaeCustomers)
            .where(eq(siaeCustomers.email, profile.email));
          if (existingByEmail) {
            customer = existingByEmail;
            console.log(`[ROLE-SWITCH] Found existing customer ${customer.id} by email after insert failure`);
          }
        }
        
        if (!customer) {
          return res.status(400).json({ 
            error: "Impossibile creare account cliente. Contatta l'assistenza.",
            details: insertError.message 
          });
        }
      }
    }
    
    // Store original PR data in session for switching back
    (req.session as any).originalPrSession = {
      prProfileId: prSession.id,
      companyId: prSession.companyId,
    };
    
    // Update session to customer mode
    (req.session as any).activeRole = 'cliente';
    (req.session as any).customerMode = {
      customerId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
    };
    
    req.session.save((err) => {
      if (err) {
        console.error("[ROLE-SWITCH] Error saving session:", err);
        return res.status(500).json({ error: "Errore nel cambio ruolo" });
      }
      
      console.log(`[ROLE-SWITCH] PR ${prSession.id} switched to customer mode (customer: ${customer.id})`);
      res.json({ 
        success: true, 
        message: "Passato a modalità cliente",
        redirectTo: '/'
      });
    });
  } catch (error: any) {
    console.error("Error switching to customer mode:", error);
    res.status(500).json({ error: error.message });
  }
});

// Switch from Customer back to PR mode
router.post("/api/switch-role/pr", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const session = req.session as any;
    
    // Check if there's an original PR session to restore
    if (!session.originalPrSession) {
      return res.status(400).json({ error: "Nessuna sessione PR originale da ripristinare" });
    }
    
    // Clear customer mode
    delete session.customerMode;
    delete session.activeRole;
    delete session.originalPrSession;
    
    req.session.save((err) => {
      if (err) {
        console.error("[ROLE-SWITCH] Error saving session:", err);
        return res.status(500).json({ error: "Errore nel cambio ruolo" });
      }
      
      console.log(`[ROLE-SWITCH] User ${user.id} switched back to PR mode`);
      res.json({ 
        success: true, 
        message: "Tornato a modalità PR",
        redirectTo: '/staff-pr-home'
      });
    });
  } catch (error: any) {
    console.error("Error switching to PR mode:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get current active role (for UI display)
router.get("/api/switch-role/current", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const session = req.session as any;
    
    res.json({
      userId: user.id,
      baseRole: user.role,
      activeRole: session.activeRole || user.role,
      isCustomerMode: !!session.customerMode,
      customerData: session.customerMode || null,
      canSwitchToCustomer: user.role === 'pr' && !!user.siaeCustomerId,
      canSwitchToPr: !!session.originalPrSession,
    });
  } catch (error: any) {
    console.error("Error getting current role:", error);
    res.status(500).json({ error: error.message });
  }
});

// Switch from Customer to PR mode - for customers with linked PR profiles
router.post("/api/customer/switch-to-pr", async (req: Request, res: Response) => {
  try {
    const customerSession = (req.session as any).customer;
    
    if (!customerSession?.id) {
      return res.status(401).json({ error: "Non autenticato come cliente" });
    }
    
    // Get customer data
    const [customer] = await db.select().from(siaeCustomers)
      .where(eq(siaeCustomers.id, customerSession.id));
    
    if (!customer) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    
    // Find linked PR profile by phone or email
    let prProfile = null;
    
    // Method 1: Check by phone
    if (customer.phone) {
      const [profileByPhone] = await db.select().from(prProfiles)
        .where(and(
          eq(prProfiles.isActive, true),
          or(
            eq(prProfiles.phone, customer.phone),
            eq(prProfiles.phone, customer.phone.replace(/^\+39/, '')),
            eq(prProfiles.phone, '+39' + customer.phone.replace(/^\+39/, ''))
          )
        ));
      if (profileByPhone) prProfile = profileByPhone;
    }
    
    // Method 2: Check by email
    if (!prProfile && customer.email) {
      const [profileByEmail] = await db.select().from(prProfiles)
        .where(and(
          eq(prProfiles.isActive, true),
          eq(prProfiles.email, customer.email)
        ));
      if (profileByEmail) prProfile = profileByEmail;
    }
    
    if (!prProfile) {
      return res.status(404).json({ error: "Nessun profilo PR collegato trovato" });
    }
    
    // Store original customer session for switching back
    (req.session as any).originalCustomerSession = {
      customerId: customerSession.id,
    };
    
    // Clear customer session to prevent conflicts
    delete (req.session as any).customer;
    delete (req.session as any).customerMode;
    delete (req.session as any).activeRole;
    
    // Set up PR session
    (req.session as any).prProfile = {
      id: prProfile.id,
      companyId: prProfile.companyId,
      prCode: prProfile.prCode,
    };
    
    req.session.save((err) => {
      if (err) {
        console.error("[CUSTOMER-TO-PR] Error saving session:", err);
        return res.status(500).json({ error: "Errore nel cambio ruolo" });
      }
      
      console.log(`[CUSTOMER-TO-PR] Customer ${customerSession.id} switched to PR mode (PR: ${prProfile.id})`);
      res.json({ 
        success: true, 
        message: "Passato a modalità PR",
        redirectTo: '/pr/dashboard'
      });
    });
  } catch (error: any) {
    console.error("Error switching customer to PR mode:", error);
    res.status(500).json({ error: error.message });
  }
});

// Switch back from Customer to PR mode (for users who switched from PR to Customer earlier)
router.post("/api/customer/switch-back-to-pr", async (req: Request, res: Response) => {
  try {
    const originalPrSession = (req.session as any).originalPrSession;
    
    if (!originalPrSession?.prProfileId) {
      return res.status(400).json({ error: "Nessuna sessione PR originale trovata" });
    }
    
    // Verify the PR profile still exists and is active
    const [prProfile] = await db.select().from(prProfiles)
      .where(and(
        eq(prProfiles.id, originalPrSession.prProfileId),
        eq(prProfiles.isActive, true)
      ));
    
    if (!prProfile) {
      delete (req.session as any).originalPrSession;
      return res.status(404).json({ error: "Il profilo PR non è più attivo" });
    }
    
    // Clear customer session data
    delete (req.session as any).customer;
    delete (req.session as any).customerMode;
    delete (req.session as any).originalPrSession;
    
    // Restore PR session
    (req.session as any).prProfile = {
      id: prProfile.id,
      companyId: prProfile.companyId,
      prCode: prProfile.prCode,
    };
    
    req.session.save((err) => {
      if (err) {
        console.error("[SWITCH-BACK-PR] Error saving session:", err);
        return res.status(500).json({ error: "Errore nel ripristino della sessione PR" });
      }
      
      console.log(`[SWITCH-BACK-PR] Customer switched back to PR mode (PR: ${prProfile.id})`);
      res.json({ 
        success: true, 
        message: "Tornato alla modalità PR",
        redirectTo: '/pr/dashboard'
      });
    });
  } catch (error: any) {
    console.error("Error switching back to PR mode:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check if the current session has an original PR session (for switching back)
router.get("/api/session/pr-switch-status", (req: Request, res: Response) => {
  const originalPrSession = (req.session as any).originalPrSession;
  res.json({
    hasOriginalPrSession: !!originalPrSession?.prProfileId,
  });
});

// Check if the current session has an original customer session (for switching back)
router.get("/api/session/customer-switch-status", (req: Request, res: Response) => {
  const originalCustomerSession = (req.session as any).originalCustomerSession;
  res.json({
    hasOriginalCustomerSession: !!originalCustomerSession?.customerId,
  });
});

// Switch back from PR to Customer mode (for customers who switched from Customer to PR earlier)
router.post("/api/pr/switch-back-to-customer", async (req: Request, res: Response) => {
  try {
    const originalCustomerSession = (req.session as any).originalCustomerSession;
    
    if (!originalCustomerSession?.customerId) {
      return res.status(400).json({ error: "Nessuna sessione cliente originale trovata" });
    }
    
    // Verify the customer still exists
    const [customer] = await db.select().from(siaeCustomers)
      .where(eq(siaeCustomers.id, originalCustomerSession.customerId));
    
    if (!customer) {
      delete (req.session as any).originalCustomerSession;
      return res.status(404).json({ error: "Account cliente non trovato" });
    }
    
    // Clear PR session data
    delete (req.session as any).prProfile;
    delete (req.session as any).originalCustomerSession;
    
    // Restore customer session
    (req.session as any).customer = {
      id: customer.id,
    };
    
    req.session.save((err) => {
      if (err) {
        console.error("[SWITCH-BACK-CUSTOMER] Error saving session:", err);
        return res.status(500).json({ error: "Errore nel ripristino della sessione cliente" });
      }
      
      console.log(`[SWITCH-BACK-CUSTOMER] PR switched back to customer mode (customer: ${customer.id})`);
      res.json({ 
        success: true, 
        message: "Tornato alla modalità cliente",
        redirectTo: '/account'
      });
    });
  } catch (error: any) {
    console.error("Error switching back to customer mode:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
