// Staff Module API Routes - Staff PR Management
import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  prProfiles,
  eventPrAssignments,
  listEntries,
  eventLists,
  tableReservations,
  prPayouts,
  events,
  companies,
  users,
  userCompanyRoles,
  insertPrProfileSchema,
  updatePrProfileSchema,
  insertEventPrAssignmentSchema,
  insertPrPayoutSchema,
} from "@shared/schema";
import { z } from "zod";
import { eq, and, desc, sql, isNull, gte, lte, inArray } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const router = Router();

// Helper to generate unique PR code
function generatePrCode(): string {
  return `PR${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// Middleware to require PR session (staff or regular PR)
function requirePrSession(req: Request, res: Response, next: NextFunction) {
  const prSession = (req.session as any)?.prProfile;
  if (!prSession) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  next();
}

// Middleware to require Staff role (isStaff = true)
function requireStaff(req: Request, res: Response, next: NextFunction) {
  const prSession = (req.session as any)?.prProfile;
  if (!prSession) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  if (!prSession.isStaff) {
    return res.status(403).json({ error: "Accesso negato. Richiesto ruolo Staff." });
  }
  next();
}

// ==================== Staff Profile ====================

// GET /api/staff/my-profile - Get staff profile with isStaff flag
router.get("/api/staff/my-profile", requirePrSession, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    const [profile] = await db.select({
      id: prProfiles.id,
      companyId: prProfiles.companyId,
      firstName: prProfiles.firstName,
      lastName: prProfiles.lastName,
      phone: prProfiles.phone,
      phonePrefix: prProfiles.phonePrefix,
      email: prProfiles.email,
      prCode: prProfiles.prCode,
      displayName: prProfiles.displayName,
      bio: prProfiles.bio,
      profileImageUrl: prProfiles.profileImageUrl,
      isStaff: prProfiles.isStaff,
      supervisorId: prProfiles.supervisorId,
      commissionPercentage: prProfiles.commissionPercentage,
      commissionFixedPerPerson: prProfiles.commissionFixedPerPerson,
      defaultListCommission: prProfiles.defaultListCommission,
      defaultTableCommission: prProfiles.defaultTableCommission,
      staffCommissionPercentage: prProfiles.staffCommissionPercentage,
      isActive: prProfiles.isActive,
      createdAt: prProfiles.createdAt,
    })
      .from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));

    if (!profile) {
      return res.status(404).json({ error: "Profilo non trovato" });
    }

    // Get company info
    const [company] = await db.select({
      id: companies.id,
      name: companies.name,
    })
      .from(companies)
      .where(eq(companies.id, profile.companyId));

    res.json({
      ...profile,
      company,
    });
  } catch (error: any) {
    console.error("Error getting staff profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Subordinates Management ====================

// GET /api/staff/subordinates - List PRs under this staff
router.get("/api/staff/subordinates", requireStaff, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    const subordinates = await db.select({
      id: prProfiles.id,
      firstName: prProfiles.firstName,
      lastName: prProfiles.lastName,
      phone: prProfiles.phone,
      phonePrefix: prProfiles.phonePrefix,
      email: prProfiles.email,
      prCode: prProfiles.prCode,
      displayName: prProfiles.displayName,
      profileImageUrl: prProfiles.profileImageUrl,
      commissionPercentage: prProfiles.commissionPercentage,
      commissionFixedPerPerson: prProfiles.commissionFixedPerPerson,
      defaultListCommission: prProfiles.defaultListCommission,
      defaultTableCommission: prProfiles.defaultTableCommission,
      isActive: prProfiles.isActive,
      createdAt: prProfiles.createdAt,
    })
      .from(prProfiles)
      .where(and(
        eq(prProfiles.supervisorId, prSession.id),
        eq(prProfiles.companyId, prSession.companyId)
      ))
      .orderBy(desc(prProfiles.createdAt));

    res.json(subordinates);
  } catch (error: any) {
    console.error("Error getting subordinates:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/staff/subordinates - Create new PR under this staff
router.post("/api/staff/subordinates", requireStaff, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    const createSchema = z.object({
      firstName: z.string().min(1, "Nome richiesto"),
      lastName: z.string().min(1, "Cognome richiesto"),
      phonePrefix: z.string().min(2).max(6).default('+39'),
      phone: z.string().min(9).max(15),
      email: z.string().email().optional().nullable(),
      commissionPercentage: z.string().default('0'),
      commissionFixedPerPerson: z.string().default('0'),
      defaultListCommission: z.string().optional(),
      defaultTableCommission: z.string().optional(),
    });
    
    const validated = createSchema.parse(req.body);
    
    // Check if phone already exists for this company
    const [existing] = await db.select({ id: prProfiles.id })
      .from(prProfiles)
      .where(and(
        eq(prProfiles.phone, validated.phone),
        eq(prProfiles.companyId, prSession.companyId)
      ));
    
    if (existing) {
      return res.status(400).json({ error: "Numero di telefono già registrato per questa azienda" });
    }
    
    // Generate unique PR code
    const prCode = generatePrCode();
    
    // Generate password for the new PR
    const password = crypto.randomBytes(4).toString('hex').toUpperCase();
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user account for the PR
    const fullPhone = `${validated.phonePrefix || '+39'}${validated.phone}`;
    const prEmail = validated.email || `pr-${validated.phone}@pr.event4u.local`;
    
    let userId: string | null = null;
    
    // PRIORITY 1: Check if phone exists as a registered customer/user in the SAME company
    const [existingPhoneUser] = await db.select({ id: users.id, companyId: users.companyId })
      .from(users)
      .where(eq(users.phone, fullPhone));
    
    if (existingPhoneUser && (!existingPhoneUser.companyId || existingPhoneUser.companyId === prSession.companyId)) {
      userId = existingPhoneUser.id;
      console.log(`[Staff-PR] Phone ${fullPhone} found as existing user, promoting to PR`);
      
      // Update user's role and companyId if needed
      await db.update(users)
        .set({ companyId: prSession.companyId, role: 'pr' })
        .where(eq(users.id, userId));
    }
    
    // PRIORITY 2: Check if email already exists in the SAME company
    if (!userId) {
      const [existingEmailUser] = await db.select({ id: users.id, companyId: users.companyId })
        .from(users)
        .where(eq(users.email, prEmail));
      
      if (existingEmailUser && existingEmailUser.companyId === prSession.companyId) {
        userId = existingEmailUser.id;
        console.log(`[Staff-PR] Email ${prEmail} already exists in same company, linking to user ${userId}`);
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
          companyId: prSession.companyId,
          emailVerified: false,
        }).returning();
        
        userId = newUser.id;
        console.log(`[Staff-PR] Created new user account ${userId} for subordinate PR`);
      }
    }
    
    // Create userCompanyRoles entry
    await db.insert(userCompanyRoles).values({
      userId: userId,
      companyId: prSession.companyId,
      role: 'pr',
    }).onConflictDoNothing();
    
    const [newPr] = await db.insert(prProfiles)
      .values({
        ...validated,
        userId: userId,
        companyId: prSession.companyId,
        supervisorId: prSession.id,
        isStaff: false,
        prCode,
        passwordHash,
        isActive: true,
      })
      .returning();

    // Return the new PR profile (password is sent via SMS, not in response)
    res.status(201).json(newPr);
  } catch (error: any) {
    console.error("Error creating subordinate:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/staff/subordinates/:id - Update subordinate PR
router.patch("/api/staff/subordinates/:id", requireStaff, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prSession = (req.session as any)?.prProfile;
    
    // Verify subordinate belongs to this staff
    const [existing] = await db.select({ id: prProfiles.id, supervisorId: prProfiles.supervisorId })
      .from(prProfiles)
      .where(eq(prProfiles.id, id));
    
    if (!existing) {
      return res.status(404).json({ error: "PR non trovato" });
    }
    
    if (existing.supervisorId !== prSession.id) {
      return res.status(403).json({ error: "Non puoi modificare questo PR" });
    }
    
    const updateSchema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional().nullable(),
      displayName: z.string().optional().nullable(),
      bio: z.string().optional().nullable(),
      commissionPercentage: z.string().optional(),
      commissionFixedPerPerson: z.string().optional(),
      defaultListCommission: z.string().optional(),
      defaultTableCommission: z.string().optional(),
    });
    
    const validated = updateSchema.parse(req.body);
    
    const [updated] = await db.update(prProfiles)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(prProfiles.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating subordinate:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/staff/subordinates/:id - Deactivate subordinate PR
router.delete("/api/staff/subordinates/:id", requireStaff, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prSession = (req.session as any)?.prProfile;
    
    // Verify subordinate belongs to this staff
    const [existing] = await db.select({ id: prProfiles.id, supervisorId: prProfiles.supervisorId })
      .from(prProfiles)
      .where(eq(prProfiles.id, id));
    
    if (!existing) {
      return res.status(404).json({ error: "PR non trovato" });
    }
    
    if (existing.supervisorId !== prSession.id) {
      return res.status(403).json({ error: "Non puoi disattivare questo PR" });
    }
    
    // Soft delete - set isActive to false
    await db.update(prProfiles)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(prProfiles.id, id));

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deactivating subordinate:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Event Assignments ====================

// GET /api/staff/events - Events assigned to staff
router.get("/api/staff/events", requireStaff, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    // Get events where staff is assigned
    const assignments = await db.select({
      id: eventPrAssignments.id,
      eventId: eventPrAssignments.eventId,
      canAddToLists: eventPrAssignments.canAddToLists,
      canProposeTables: eventPrAssignments.canProposeTables,
      isActive: eventPrAssignments.isActive,
      createdAt: eventPrAssignments.createdAt,
      eventName: events.name,
      eventStartDatetime: events.startDatetime,
      eventStatus: events.status,
    })
      .from(eventPrAssignments)
      .innerJoin(events, eq(eventPrAssignments.eventId, events.id))
      .where(and(
        eq(eventPrAssignments.prProfileId, prSession.id),
        eq(eventPrAssignments.isActive, true),
        eq(eventPrAssignments.companyId, prSession.companyId)
      ))
      .orderBy(desc(events.startDatetime));

    res.json(assignments);
  } catch (error: any) {
    console.error("Error getting staff events:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/staff/events/:eventId/subordinates - PRs enabled for event
router.get("/api/staff/events/:eventId/subordinates", requireStaff, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const prSession = (req.session as any)?.prProfile;
    
    // Get all subordinates
    const subordinates = await db.select({
      id: prProfiles.id,
      firstName: prProfiles.firstName,
      lastName: prProfiles.lastName,
      phone: prProfiles.phone,
      prCode: prProfiles.prCode,
      displayName: prProfiles.displayName,
      isActive: prProfiles.isActive,
    })
      .from(prProfiles)
      .where(and(
        eq(prProfiles.supervisorId, prSession.id),
        eq(prProfiles.companyId, prSession.companyId),
        eq(prProfiles.isActive, true)
      ));
    
    // Get event assignments for subordinates
    const subordinateIds = subordinates.map(s => s.id);
    
    let assignments: any[] = [];
    if (subordinateIds.length > 0) {
      assignments = await db.select({
        prProfileId: eventPrAssignments.prProfileId,
        canAddToLists: eventPrAssignments.canAddToLists,
        canProposeTables: eventPrAssignments.canProposeTables,
        isActive: eventPrAssignments.isActive,
      })
        .from(eventPrAssignments)
        .where(and(
          eq(eventPrAssignments.eventId, eventId),
          inArray(eventPrAssignments.prProfileId, subordinateIds)
        ));
    }
    
    // Combine data
    const result = subordinates.map(sub => {
      const assignment = assignments.find(a => a.prProfileId === sub.id);
      return {
        ...sub,
        eventAssignment: assignment || null,
        isEnabledForEvent: !!assignment?.isActive,
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error getting event subordinates:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/staff/events/:eventId/subordinates/:prId/enable - Enable PR for event
router.post("/api/staff/events/:eventId/subordinates/:prId/enable", requireStaff, async (req: Request, res: Response) => {
  try {
    const { eventId, prId } = req.params;
    const prSession = (req.session as any)?.prProfile;
    
    // Verify PR is a subordinate
    const [subordinate] = await db.select({ id: prProfiles.id, supervisorId: prProfiles.supervisorId })
      .from(prProfiles)
      .where(eq(prProfiles.id, prId));
    
    if (!subordinate || subordinate.supervisorId !== prSession.id) {
      return res.status(403).json({ error: "PR non è un tuo subordinato" });
    }
    
    // Check if assignment already exists
    const [existing] = await db.select({ id: eventPrAssignments.id })
      .from(eventPrAssignments)
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.prProfileId, prId)
      ));
    
    if (existing) {
      // Update existing assignment
      const [updated] = await db.update(eventPrAssignments)
        .set({
          isActive: true,
          canAddToLists: req.body.canAddToLists ?? true,
          canProposeTables: req.body.canProposeTables ?? true,
          staffUserId: prSession.userId,
          updatedAt: new Date(),
        })
        .where(eq(eventPrAssignments.id, existing.id))
        .returning();
      
      return res.json(updated);
    }
    
    // Create new assignment
    const [newAssignment] = await db.insert(eventPrAssignments)
      .values({
        eventId,
        prProfileId: prId,
        companyId: prSession.companyId,
        staffUserId: prSession.userId,
        canAddToLists: req.body.canAddToLists ?? true,
        canProposeTables: req.body.canProposeTables ?? true,
        isActive: true,
      })
      .returning();

    res.status(201).json(newAssignment);
  } catch (error: any) {
    console.error("Error enabling PR for event:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/staff/events/:eventId/subordinates/:prId/enable - Disable PR for event
router.delete("/api/staff/events/:eventId/subordinates/:prId/enable", requireStaff, async (req: Request, res: Response) => {
  try {
    const { eventId, prId } = req.params;
    const prSession = (req.session as any)?.prProfile;
    
    // Verify PR is a subordinate
    const [subordinate] = await db.select({ id: prProfiles.id, supervisorId: prProfiles.supervisorId })
      .from(prProfiles)
      .where(eq(prProfiles.id, prId));
    
    if (!subordinate || subordinate.supervisorId !== prSession.id) {
      return res.status(403).json({ error: "PR non è un tuo subordinato" });
    }
    
    // Update assignment to inactive
    await db.update(eventPrAssignments)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.prProfileId, prId)
      ));

    res.status(204).send();
  } catch (error: any) {
    console.error("Error disabling PR for event:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Table Proposals ====================

// GET /api/staff/table-proposals - Pending table proposals from subordinates
router.get("/api/staff/table-proposals", requireStaff, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    // Get all subordinate IDs
    const subordinates = await db.select({ id: prProfiles.id, userId: prProfiles.userId })
      .from(prProfiles)
      .where(and(
        eq(prProfiles.supervisorId, prSession.id),
        eq(prProfiles.companyId, prSession.companyId)
      ));
    
    const subordinateUserIds = subordinates.map(s => s.userId).filter(Boolean) as string[];
    
    if (subordinateUserIds.length === 0) {
      return res.json([]);
    }
    
    // Get pending table proposals from subordinates
    const proposals = await db.select({
      id: tableBookings.id,
      tableId: tableBookings.tableId,
      eventId: tableBookings.eventId,
      bookedByUserId: tableBookings.bookedByUserId,
      customerName: tableBookings.customerName,
      customerPhone: tableBookings.customerPhone,
      customerEmail: tableBookings.customerEmail,
      guestsCount: tableBookings.guestsCount,
      guestNames: tableBookings.guestNames,
      depositAmount: tableBookings.depositAmount,
      status: tableBookings.status,
      notes: tableBookings.notes,
      createdAt: tableBookings.createdAt,
      eventName: events.name,
      eventStartDatetime: events.startDatetime,
    })
      .from(tableBookings)
      .innerJoin(events, eq(tableBookings.eventId, events.id))
      .where(and(
        inArray(tableBookings.bookedByUserId, subordinateUserIds),
        eq(tableBookings.status, 'pending'),
        eq(tableBookings.companyId, prSession.companyId)
      ))
      .orderBy(desc(tableBookings.createdAt));

    // Add booker info
    const result = await Promise.all(proposals.map(async (proposal) => {
      const bookerProfile = subordinates.find(s => s.userId === proposal.bookedByUserId);
      let bookerInfo = null;
      
      if (bookerProfile) {
        const [prInfo] = await db.select({
          firstName: prProfiles.firstName,
          lastName: prProfiles.lastName,
          displayName: prProfiles.displayName,
        })
          .from(prProfiles)
          .where(eq(prProfiles.id, bookerProfile.id));
        bookerInfo = prInfo;
      }
      
      return {
        ...proposal,
        bookedBy: bookerInfo,
      };
    }));

    res.json(result);
  } catch (error: any) {
    console.error("Error getting table proposals:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/staff/table-proposals/:id/approve - Approve table proposal
router.patch("/api/staff/table-proposals/:id/approve", requireStaff, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prSession = (req.session as any)?.prProfile;
    
    // Get the booking
    const [booking] = await db.select()
      .from(tableBookings)
      .where(eq(tableBookings.id, id));
    
    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    
    if (booking.companyId !== prSession.companyId) {
      return res.status(403).json({ error: "Accesso negato" });
    }
    
    // Verify the booker is a subordinate
    const subordinates = await db.select({ userId: prProfiles.userId })
      .from(prProfiles)
      .where(eq(prProfiles.supervisorId, prSession.id));
    
    const subordinateUserIds = subordinates.map(s => s.userId);
    
    if (!subordinateUserIds.includes(booking.bookedByUserId)) {
      return res.status(403).json({ error: "Non puoi approvare questa prenotazione" });
    }
    
    // Update status to staff_approved (awaiting gestore approval)
    const [updated] = await db.update(tableBookings)
      .set({
        status: 'staff_approved',
        updatedAt: new Date(),
      })
      .where(eq(tableBookings.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Error approving table proposal:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/staff/table-proposals/:id/reject - Reject table proposal
router.patch("/api/staff/table-proposals/:id/reject", requireStaff, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prSession = (req.session as any)?.prProfile;
    const { reason } = req.body;
    
    // Get the booking
    const [booking] = await db.select()
      .from(tableBookings)
      .where(eq(tableBookings.id, id));
    
    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    
    if (booking.companyId !== prSession.companyId) {
      return res.status(403).json({ error: "Accesso negato" });
    }
    
    // Verify the booker is a subordinate
    const subordinates = await db.select({ userId: prProfiles.userId })
      .from(prProfiles)
      .where(eq(prProfiles.supervisorId, prSession.id));
    
    const subordinateUserIds = subordinates.map(s => s.userId);
    
    if (!subordinateUserIds.includes(booking.bookedByUserId)) {
      return res.status(403).json({ error: "Non puoi rifiutare questa prenotazione" });
    }
    
    // Update status to rejected
    const [updated] = await db.update(tableBookings)
      .set({
        status: 'rejected',
        notes: reason ? `Rifiutato da Staff: ${reason}` : booking.notes,
        updatedAt: new Date(),
      })
      .where(eq(tableBookings.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Error rejecting table proposal:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Stats ====================

// GET /api/staff/stats - Staff dashboard stats
router.get("/api/staff/stats", requireStaff, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    // Get subordinates count
    const [subordinatesCount] = await db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${prProfiles.isActive} = true)::int`,
    })
      .from(prProfiles)
      .where(and(
        eq(prProfiles.supervisorId, prSession.id),
        eq(prProfiles.companyId, prSession.companyId)
      ));
    
    // Get subordinate IDs and user IDs
    const subordinates = await db.select({ id: prProfiles.id, userId: prProfiles.userId })
      .from(prProfiles)
      .where(and(
        eq(prProfiles.supervisorId, prSession.id),
        eq(prProfiles.companyId, prSession.companyId)
      ));
    
    const subordinateUserIds = subordinates.map(s => s.userId).filter(Boolean) as string[];
    
    let guestStats = { total: 0, checkedIn: 0 };
    let tableStats = { total: 0, pending: 0, confirmed: 0 };
    
    if (subordinateUserIds.length > 0) {
      // Get guests added by subordinates (UNIFICATO: usa listEntries)
      const [guestCount] = await db.select({
        total: sql<number>`count(*)::int`,
        checkedIn: sql<number>`count(*) filter (where ${listEntries.qrScannedAt} is not null)::int`,
      })
        .from(listEntries)
        .where(inArray(listEntries.addedByUserId, subordinateUserIds));
      
      guestStats = guestCount || { total: 0, checkedIn: 0 };
      
      // Get table reservations by subordinates (UNIFICATO: usa tableReservations)
      const [tableCount] = await db.select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${tableReservations.status} = 'pending')::int`,
        confirmed: sql<number>`count(*) filter (where ${tableReservations.status} in ('approved'))::int`,
      })
        .from(tableReservations)
        .where(inArray(tableReservations.createdBy, subordinateUserIds));
      
      tableStats = tableCount || { total: 0, pending: 0, confirmed: 0 };
    }
    
    // Get pending approvals count
    const pendingApprovals = tableStats.pending;
    
    // Get total earnings from subordinates (simplified - would need proper commission calculation)
    const [earnings] = await db.select({
      total: sql<number>`coalesce(sum(${prPayouts.amount}::numeric), 0)::numeric`,
      pending: sql<number>`coalesce(sum(${prPayouts.amount}::numeric) filter (where ${prPayouts.status} = 'pending'), 0)::numeric`,
    })
      .from(prPayouts)
      .where(eq(prPayouts.prProfileId, prSession.id));

    res.json({
      subordinates: subordinatesCount || { total: 0, active: 0 },
      guests: guestStats,
      tables: tableStats,
      pendingApprovals,
      earnings: {
        total: parseFloat(earnings?.total?.toString() || '0'),
        pending: parseFloat(earnings?.pending?.toString() || '0'),
      },
    });
  } catch (error: any) {
    console.error("Error getting staff stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Wallet ====================

// GET /api/staff/wallet - Staff wallet data
router.get("/api/staff/wallet", requireStaff, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    // Get staff profile with commission info
    const [profile] = await db.select({
      staffCommissionPercentage: prProfiles.staffCommissionPercentage,
      commissionPercentage: prProfiles.commissionPercentage,
    })
      .from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));
    
    // Get payouts
    const payouts = await db.select()
      .from(prPayouts)
      .where(eq(prPayouts.prProfileId, prSession.id))
      .orderBy(desc(prPayouts.createdAt))
      .limit(20);
    
    // Calculate totals
    const [totals] = await db.select({
      totalEarned: sql<number>`coalesce(sum(${prPayouts.amount}::numeric), 0)::numeric`,
      totalPaid: sql<number>`coalesce(sum(${prPayouts.amount}::numeric) filter (where ${prPayouts.status} = 'paid'), 0)::numeric`,
      totalPending: sql<number>`coalesce(sum(${prPayouts.amount}::numeric) filter (where ${prPayouts.status} = 'pending'), 0)::numeric`,
    })
      .from(prPayouts)
      .where(eq(prPayouts.prProfileId, prSession.id));
    
    // Get subordinates earnings for reference
    const subordinates = await db.select({ id: prProfiles.id })
      .from(prProfiles)
      .where(eq(prProfiles.supervisorId, prSession.id));
    
    const subordinateIds = subordinates.map(s => s.id);
    
    let subordinateEarnings = { total: 0 };
    if (subordinateIds.length > 0) {
      const [subEarnings] = await db.select({
        total: sql<number>`coalesce(sum(${prPayouts.amount}::numeric), 0)::numeric`,
      })
        .from(prPayouts)
        .where(inArray(prPayouts.prProfileId, subordinateIds));
      
      subordinateEarnings = subEarnings || { total: 0 };
    }

    res.json({
      commissionRate: profile?.staffCommissionPercentage || profile?.commissionPercentage || '0',
      balance: {
        total: parseFloat(totals?.totalEarned?.toString() || '0'),
        paid: parseFloat(totals?.totalPaid?.toString() || '0'),
        pending: parseFloat(totals?.totalPending?.toString() || '0'),
        available: parseFloat(totals?.totalEarned?.toString() || '0') - parseFloat(totals?.totalPaid?.toString() || '0'),
      },
      subordinateEarnings: parseFloat(subordinateEarnings?.total?.toString() || '0'),
      recentPayouts: payouts,
    });
  } catch (error: any) {
    console.error("Error getting staff wallet:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/staff/wallet/payout-request - Request payout
router.post("/api/staff/wallet/payout-request", requireStaff, async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    const requestSchema = z.object({
      amount: z.number().positive("Importo deve essere positivo"),
      periodStart: z.string().transform(val => new Date(val)),
      periodEnd: z.string().transform(val => new Date(val)),
      paymentMethod: z.enum(['bank_transfer', 'cash', 'stripe']).optional(),
      notes: z.string().optional(),
    });
    
    const validated = requestSchema.parse(req.body);
    
    // Create payout request
    const [payout] = await db.insert(prPayouts)
      .values({
        companyId: prSession.companyId,
        prProfileId: prSession.id,
        amount: validated.amount.toString(),
        currency: 'EUR',
        status: 'pending',
        periodStart: validated.periodStart,
        periodEnd: validated.periodEnd,
        paymentMethod: validated.paymentMethod,
        notes: validated.notes,
        reservationCount: 0,
      })
      .returning();

    res.status(201).json(payout);
  } catch (error: any) {
    console.error("Error requesting payout:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
