// Event Four You (E4U) Module API Routes
import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import {
  eventLists,
  listEntries,
  tableTypes,
  tableReservations,
  tableGuests,
  tableBookings,
  e4uStaffAssignments,
  eventPrAssignments,
  prListAssignments,
  eventScanners,
  events,
  users,
  prProfiles,
  siaeTickets,
  siaeTicketedEvents,
  siaeEventSectors,
  siaeSubscriptions,
  siaeSubscriptionTypes,
  siaeTransactions,
  siaeCancellationReasons,
  publicCheckoutSessions,
  reservationPayments,
  insertEventListSchema,
  insertListEntrySchema,
  insertTableTypeSchema,
  insertTableReservationSchema,
  insertTableGuestSchema,
  insertE4uStaffAssignmentSchema,
  insertEventPrAssignmentSchema,
  insertEventScannerSchema,
} from "@shared/schema";
import { getUncachableStripeClient } from "./stripeClient";

// Helper to create validated partial schemas for PATCH operations
function makePatchSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial().strict().refine(
    (obj: Record<string, unknown>) => Object.keys(obj).length > 0,
    { message: "Payload vuoto non permesso" }
  );
}

// Create validated partial schemas for PATCH
const patchEventListSchema = makePatchSchema(insertEventListSchema.omit({ eventId: true, companyId: true }));
const patchListEntrySchema = makePatchSchema(insertListEntrySchema.omit({ listId: true, eventId: true, companyId: true }));
const patchTableTypeSchema = makePatchSchema(insertTableTypeSchema.omit({ eventId: true, companyId: true }));
const patchTableReservationSchema = makePatchSchema(insertTableReservationSchema.omit({ tableTypeId: true, eventId: true, companyId: true }));
const patchTableGuestSchema = makePatchSchema(insertTableGuestSchema.omit({ reservationId: true, eventId: true, companyId: true }));
const patchE4uStaffAssignmentSchema = makePatchSchema(insertE4uStaffAssignmentSchema.omit({ eventId: true, userId: true, companyId: true }));
const patchEventPrAssignmentSchema = makePatchSchema(insertEventPrAssignmentSchema.omit({ eventId: true, userId: true, companyId: true }));

const router = Router();

// Helper to extract user ID from session object
// Handles both OAuth format ({ claims: { sub: id } }) and direct format ({ id: id })
function getUserId(user: any): string {
  if (!user) return '';
  // OAuth/Replit auth format
  if (user.claims?.sub) return user.claims.sub;
  // Direct format (some legacy endpoints)
  if (user.id) return user.id;
  return '';
}

// Generate QR code in format: E4U-{type}-{id}-{random}
function generateQrCode(type: 'LST' | 'TBL', id: string): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `E4U-${type}-${id.substring(0, 8)}-${random}`;
}

// ==================== Authentication Middleware ====================

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check for passport authentication OR PR session authentication
  const prSession = (req.session as any)?.prProfile;
  
  if (prSession?.id) {
    // Always attach prProfileId to request for PR-related permission checks
    // This allows multi-role users (staff who are also PRs) to maintain both identities
    (req as any).prProfileId = prSession.id;
    
    // If user is already authenticated via Passport (staff/gestore/etc.), DON'T overwrite req.user
    // This preserves their real userId for staff assignments, scanner assignments, createdBy fields, etc.
    if (req.user) {
      // User is both passport-authenticated AND has PR session
      // Keep passport user, prProfileId is attached above for PR permission checks
      return next();
    }
    
    // Pure PR wallet user (no passport auth) - create virtual user object
    (req as any).user = {
      id: prSession.id,
      role: 'pr',
      companyId: prSession.companyId,
      isPrSession: true,
    };
    return next();
  }
  
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autorizzato" });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user as any).role !== 'super_admin') {
    return res.status(403).json({ message: "Accesso riservato ai Super Admin" });
  }
  next();
}

function requireGestore(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || (user.role !== 'super_admin' && user.role !== 'gestore')) {
    return res.status(403).json({ message: "Accesso riservato ai Gestori" });
  }
  next();
}

function requireStaffOrHigher(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['super_admin', 'gestore', 'capo_staff', 'pr'].includes(user.role)) {
    return res.status(403).json({ message: "Accesso non autorizzato" });
  }
  next();
}

// ==================== Permission Checking Helpers ====================

// Check if user has list management permission for event
// prProfileId: optional - pass from request for PR Wallet users (req as any).prProfileId || (req.session as any)?.prProfile?.id
// listId: optional - if provided, checks if PR has access to this specific list via prListAssignments
async function checkListPermission(userId: string, eventId: string, action: 'manage' | 'add', prProfileId?: string, listId?: string): Promise<boolean> {
  // For staff: check e4uStaffAssignments (only if userId is provided)
  if (userId) {
    const [staffAssignment] = await db.select()
      .from(e4uStaffAssignments)
      .where(and(
        eq(e4uStaffAssignments.eventId, eventId),
        eq(e4uStaffAssignments.userId, userId),
        eq(e4uStaffAssignments.isActive, true)
      ));
    
    if (staffAssignment) {
      return action === 'manage' ? staffAssignment.canManageLists : staffAssignment.canManageLists;
    }
  }
  
  // For PR: check eventPrAssignments (support both legacy userId and new prProfileId)
  if (action === 'add') {
    // First find the user's prProfile (if any) to match both legacy userId and new prProfileId
    let userPrProfileId = prProfileId; // Use session prProfileId if passed
    if (!userPrProfileId && userId) {
      const userPrProfile = await db.select({ id: prProfiles.id })
        .from(prProfiles)
        .where(eq(prProfiles.userId, userId))
        .limit(1);
      userPrProfileId = userPrProfile[0]?.id;
    }
    
    // Build query conditions - check legacy userId, prProfileId from prProfiles.userId, or session prProfileId
    let prConditions;
    if (userPrProfileId && userId) {
      prConditions = and(
        eq(eventPrAssignments.eventId, eventId),
        or(
          eq(eventPrAssignments.userId, userId),
          eq(eventPrAssignments.prProfileId, userPrProfileId)
        ),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (userPrProfileId) {
      prConditions = and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.prProfileId, userPrProfileId),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (userId) {
      prConditions = and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.userId, userId),
        eq(eventPrAssignments.isActive, true)
      );
    } else {
      return false; // No userId or prProfileId provided
    }
    
    const [prAssignment] = await db.select()
      .from(eventPrAssignments)
      .where(prConditions);
    
    if (prAssignment && prAssignment.canAddToLists) {
      // Check if there are specific list restrictions for this PR
      const listRestrictions = await db.select({ listId: prListAssignments.listId })
        .from(prListAssignments)
        .where(eq(prListAssignments.prAssignmentId, prAssignment.id));
      
      // If no prListAssignments exist, allow access to all lists (current behavior)
      if (listRestrictions.length === 0) {
        return true;
      }
      
      // If prListAssignments exist and a listId is provided, check if it's in the allowed lists
      if (listId) {
        const allowedListIds = listRestrictions.map(r => r.listId);
        return allowedListIds.includes(listId);
      }
      
      // If prListAssignments exist but no listId provided, PR has restricted access
      // Return true to indicate they have some list access (caller should check specific list)
      return true;
    }
  }
  
  return false;
}

// Check if user has table management permission for event
// prProfileId: optional - pass from request for PR Wallet users (req as any).prProfileId || (req.session as any)?.prProfile?.id
async function checkTablePermission(userId: string, eventId: string, action: 'manage' | 'propose' | 'approve', prProfileId?: string): Promise<boolean> {
  // For staff (only if userId is provided)
  if (userId) {
    const [staffAssignment] = await db.select()
      .from(e4uStaffAssignments)
      .where(and(
        eq(e4uStaffAssignments.eventId, eventId),
        eq(e4uStaffAssignments.userId, userId),
        eq(e4uStaffAssignments.isActive, true)
      ));
    
    if (staffAssignment) {
      if (action === 'approve') return staffAssignment.canApproveTables;
      return staffAssignment.canManageTables;
    }
  }
  
  // For PR: only can propose (support both legacy userId and new prProfileId)
  if (action === 'propose') {
    // First find the user's prProfile (if any) to match both legacy userId and new prProfileId
    let userPrProfileId = prProfileId; // Use session prProfileId if passed
    if (!userPrProfileId && userId) {
      const userPrProfile = await db.select({ id: prProfiles.id })
        .from(prProfiles)
        .where(eq(prProfiles.userId, userId))
        .limit(1);
      userPrProfileId = userPrProfile[0]?.id;
    }
    
    // Build query conditions - check legacy userId, prProfileId from prProfiles.userId, or session prProfileId
    let prConditions;
    if (userPrProfileId && userId) {
      prConditions = and(
        eq(eventPrAssignments.eventId, eventId),
        or(
          eq(eventPrAssignments.userId, userId),
          eq(eventPrAssignments.prProfileId, userPrProfileId)
        ),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (userPrProfileId) {
      prConditions = and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.prProfileId, userPrProfileId),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (userId) {
      prConditions = and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.userId, userId),
        eq(eventPrAssignments.isActive, true)
      );
    } else {
      return false; // No userId or prProfileId provided
    }
    
    const [prAssignment] = await db.select()
      .from(eventPrAssignments)
      .where(prConditions);
    
    if (prAssignment && prAssignment.canProposeTables) {
      return true;
    }
  }
  
  return false;
}

// Check if current time is within scanner's allowed work hours
function isWithinWorkHours(startTime: string | null, endTime: string | null): boolean {
  if (!startTime && !endTime) return true; // No time restrictions
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  if (startTime && endTime) {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    // Handle overnight shifts (e.g., 22:00 - 06:00)
    if (end < start) {
      return currentMinutes >= start || currentMinutes <= end;
    }
    return currentMinutes >= start && currentMinutes <= end;
  }
  
  if (startTime) {
    return currentMinutes >= parseTime(startTime);
  }
  
  if (endTime) {
    return currentMinutes <= parseTime(endTime);
  }
  
  return true;
}

// Check if user has scanner permission for event (with granular checks)
interface ScannerPermissionResult {
  allowed: boolean;
  scanner?: typeof eventScanners.$inferSelect;
  reason?: string;
}

async function checkScannerPermissionGranular(
  userId: string, 
  eventId: string, 
  scanType: 'lists' | 'tables' | 'tickets',
  itemId?: string // listId, tableTypeId, or sectorId
): Promise<ScannerPermissionResult> {
  const [scanner] = await db.select()
    .from(eventScanners)
    .where(and(
      eq(eventScanners.eventId, eventId),
      eq(eventScanners.userId, userId),
      eq(eventScanners.isActive, true)
    ));
  
  if (!scanner) {
    return { allowed: false, reason: "Non sei assegnato a questo evento" };
  }
  
  // Check work hours
  if (!isWithinWorkHours(scanner.startTime, scanner.endTime)) {
    return { 
      allowed: false, 
      scanner,
      reason: `Puoi operare solo dalle ${scanner.startTime || '00:00'} alle ${scanner.endTime || '23:59'}`
    };
  }
  
  // Check scan type permission
  switch (scanType) {
    case 'lists':
      if (!scanner.canScanLists) {
        return { allowed: false, scanner, reason: "Non hai i permessi per scansionare liste" };
      }
      // Check specific list permission
      if (itemId && scanner.allowedListIds && scanner.allowedListIds.length > 0) {
        if (!scanner.allowedListIds.includes(itemId)) {
          return { allowed: false, scanner, reason: "Non hai i permessi per questa lista specifica" };
        }
      }
      break;
      
    case 'tables':
      if (!scanner.canScanTables) {
        return { allowed: false, scanner, reason: "Non hai i permessi per scansionare tavoli" };
      }
      // Check specific table type permission
      if (itemId && scanner.allowedTableTypeIds && scanner.allowedTableTypeIds.length > 0) {
        if (!scanner.allowedTableTypeIds.includes(itemId)) {
          return { allowed: false, scanner, reason: "Non hai i permessi per questo tipo di tavolo" };
        }
      }
      break;
      
    case 'tickets':
      if (!scanner.canScanTickets) {
        return { allowed: false, scanner, reason: "Non hai i permessi per scansionare biglietti" };
      }
      // Check specific sector permission
      if (itemId && scanner.allowedSectorIds && scanner.allowedSectorIds.length > 0) {
        if (!scanner.allowedSectorIds.includes(itemId)) {
          return { allowed: false, scanner, reason: "Non hai i permessi per questo settore" };
        }
      }
      break;
      
    default:
      return { allowed: false, scanner, reason: "Tipo di scansione non riconosciuto" };
  }
  
  return { allowed: true, scanner };
}

// Legacy function for backward compatibility
async function checkScannerPermission(userId: string, eventId: string, scanType: 'lists' | 'tables' | 'tickets'): Promise<boolean> {
  const result = await checkScannerPermissionGranular(userId, eventId, scanType);
  return result.allowed;
}

// Check if user is gestore/super_admin or has event assignment
// prProfileId: optional - pass from request for PR Wallet users (req as any).prProfileId || (req.session as any)?.prProfile?.id
async function checkEventAccess(user: any, eventId: string, prProfileId?: string): Promise<boolean> {
  // Super admins and gestores have full access to their company's events
  if (user && (user.role === 'super_admin' || user.role === 'gestore')) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    return event && event.companyId === user.companyId;
  }
  
  const userId = user ? getUserId(user) : '';
  
  // Check if user has any assignment to this event (only if userId is provided)
  if (userId) {
    const [staffAssignment] = await db.select()
      .from(e4uStaffAssignments)
      .where(and(eq(e4uStaffAssignments.eventId, eventId), eq(e4uStaffAssignments.userId, userId)));
    if (staffAssignment) return true;
  }
  
  // Check PR assignment (support both legacy userId and new prProfileId)
  let userPrProfileId = prProfileId; // Use session prProfileId if passed
  if (!userPrProfileId && userId) {
    const userPrProfile = await db.select({ id: prProfiles.id })
      .from(prProfiles)
      .where(eq(prProfiles.userId, userId))
      .limit(1);
    userPrProfileId = userPrProfile[0]?.id;
  }
  
  // Build query conditions - check legacy userId, prProfileId from prProfiles.userId, or session prProfileId
  let prConditions;
  if (userPrProfileId && userId) {
    prConditions = and(
      eq(eventPrAssignments.eventId, eventId),
      or(
        eq(eventPrAssignments.userId, userId),
        eq(eventPrAssignments.prProfileId, userPrProfileId)
      )
    );
  } else if (userPrProfileId) {
    prConditions = and(
      eq(eventPrAssignments.eventId, eventId),
      eq(eventPrAssignments.prProfileId, userPrProfileId)
    );
  } else if (userId) {
    prConditions = and(eq(eventPrAssignments.eventId, eventId), eq(eventPrAssignments.userId, userId));
  } else {
    return false; // No userId or prProfileId provided
  }
  
  const [prAssignment] = await db.select()
    .from(eventPrAssignments)
    .where(prConditions);
  if (prAssignment) return true;
  
  // Check scanner assignment (only if userId is provided)
  if (userId) {
    const [scannerAssignment] = await db.select()
      .from(eventScanners)
      .where(and(eq(eventScanners.eventId, eventId), eq(eventScanners.userId, userId)));
    if (scannerAssignment) return true;
  }
  
  return false;
}

// Check if user is gestore/super_admin for the company that owns the event
async function isGestoreForEvent(user: any, eventId: string): Promise<boolean> {
  if (user.role !== 'super_admin' && user.role !== 'gestore') {
    return false;
  }
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  return event && event.companyId === user.companyId;
}

// ==================== LISTS API ====================

// GET /api/e4u/events/:eventId/lists - Get all lists for event
router.get("/api/e4u/events/:eventId/lists", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const lists = await db.select()
      .from(eventLists)
      .where(eq(eventLists.eventId, eventId))
      .orderBy(desc(eventLists.createdAt));
    res.json(lists);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/events/:eventId/lists - Create a new list
router.post("/api/e4u/events/:eventId/lists", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    // Get event to verify it exists and get companyId
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check permissions: gestore/super_admin OR staff with canManageLists
    const isGestore = await isGestoreForEvent(user, eventId);
    const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
    const hasListPermission = await checkListPermission(getUserId(user), eventId, 'manage', sessionPrProfileId);
    
    if (!isGestore && !hasListPermission) {
      return res.status(403).json({ message: "Non hai i permessi per creare liste per questo evento" });
    }
    
    const data = insertEventListSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
      createdByUserId: getUserId(user), // FIX: Always set creator
    });
    
    const [list] = await db.insert(eventLists).values(data).returning();
    res.status(201).json(list);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/lists/:id - Update a list
router.patch("/api/e4u/lists/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = patchEventListSchema.parse(req.body);
    
    const [updated] = await db.update(eventLists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(eventLists.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Lista non trovata" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/e4u/lists/:id - Delete a list
router.delete("/api/e4u/lists/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First delete all entries in this list
    await db.delete(listEntries).where(eq(listEntries.listId, id));
    
    const [deleted] = await db.delete(eventLists)
      .where(eq(eventLists.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Lista non trovata" });
    }
    res.json({ message: "Lista eliminata con successo" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/lists/:listId/entries - Get all entries for a list
router.get("/api/e4u/lists/:listId/entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const entries = await db.select()
      .from(listEntries)
      .where(eq(listEntries.listId, listId))
      .orderBy(desc(listEntries.createdAt));
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/lists/:listId/entries - Add person to list
router.post("/api/e4u/lists/:listId/entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const user = req.user as any;
    
    // Get list to verify and get eventId/companyId
    const [list] = await db.select().from(eventLists).where(eq(eventLists.id, listId));
    if (!list) {
      return res.status(404).json({ message: "Lista non trovata" });
    }
    
    // Check permissions: gestore/super_admin OR user with list add permission
    const isGestore = await isGestoreForEvent(user, list.eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const hasPermission = await checkListPermission(getUserId(user), list.eventId, 'add', sessionPrProfileId);
      if (!hasPermission) {
        return res.status(403).json({ message: "Non hai i permessi per aggiungere persone a questa lista" });
      }
    }
    
    // Generate QR code
    const qrCode = generateQrCode('LST', listId);
    
    const data = insertListEntrySchema.parse({
      ...req.body,
      listId,
      eventId: list.eventId,
      companyId: list.companyId,
      qrCode,
      createdBy: getUserId(user),
      createdByRole: user.role,
      status: 'confirmed',
    });
    
    const [entry] = await db.insert(listEntries).values(data).returning();
    res.status(201).json(entry);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/entries/:id - Update entry
router.patch("/api/e4u/entries/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Get the entry to check permissions
    const [entry] = await db.select().from(listEntries).where(eq(listEntries.id, id));
    if (!entry) {
      return res.status(404).json({ message: "Voce non trovata" });
    }
    
    // Check permissions: gestore/super_admin OR user with list manage permission
    const isGestore = await isGestoreForEvent(user, entry.eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const hasPermission = await checkListPermission(getUserId(user), entry.eventId, 'manage', sessionPrProfileId);
      if (!hasPermission) {
        return res.status(403).json({ message: "Non hai i permessi per modificare questa voce" });
      }
    }
    
    const data = patchListEntrySchema.parse(req.body);
    
    const [updated] = await db.update(listEntries)
      .set(data)
      .where(eq(listEntries.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/e4u/entries/:id - Remove from list
router.delete("/api/e4u/entries/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Get the entry to check permissions
    const [entry] = await db.select().from(listEntries).where(eq(listEntries.id, id));
    if (!entry) {
      return res.status(404).json({ message: "Voce non trovata" });
    }
    
    // Check permissions: gestore/super_admin OR user with list manage permission
    const isGestore = await isGestoreForEvent(user, entry.eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const hasPermission = await checkListPermission(getUserId(user), entry.eventId, 'manage', sessionPrProfileId);
      if (!hasPermission) {
        return res.status(403).json({ message: "Non hai i permessi per eliminare questa voce" });
      }
    }
    
    const [deleted] = await db.delete(listEntries)
      .where(eq(listEntries.id, id))
      .returning();
    
    res.json({ message: "Voce eliminata con successo" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/entries/:id/check-in - Check in person
router.post("/api/e4u/entries/:id/check-in", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Get the entry to check event
    const [entry] = await db.select().from(listEntries).where(eq(listEntries.id, id));
    if (!entry) {
      return res.status(404).json({ message: "Voce non trovata" });
    }
    
    // Check permissions: gestore/super_admin OR scanner with canScanLists
    const isGestore = await isGestoreForEvent(user, entry.eventId);
    if (!isGestore) {
      const canScan = await checkScannerPermission(getUserId(user), entry.eventId, 'lists');
      if (!canScan) {
        return res.status(403).json({ message: "Non hai i permessi per fare check-in su questa lista" });
      }
    }
    
    const [updated] = await db.update(listEntries)
      .set({
        status: 'checked_in',
        checkedInAt: new Date(),
        checkedInBy: getUserId(user),
      })
      .where(eq(listEntries.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== TABLES API ====================

// GET /api/e4u/events/:eventId/table-types - Get all table types for event
router.get("/api/e4u/events/:eventId/table-types", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const types = await db.select()
      .from(tableTypes)
      .where(eq(tableTypes.eventId, eventId))
      .orderBy(desc(tableTypes.createdAt));
    res.json(types);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/events/:eventId/table-types - Create table type
router.post("/api/e4u/events/:eventId/table-types", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check permissions: gestore/super_admin OR staff with canManageTables
    const isGestore = await isGestoreForEvent(user, eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const hasPermission = await checkTablePermission(getUserId(user), eventId, 'manage', sessionPrProfileId);
      if (!hasPermission) {
        return res.status(403).json({ message: "Non hai i permessi per gestire i tipi di tavolo" });
      }
    }
    
    const data = insertTableTypeSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
    });
    
    const [tableType] = await db.insert(tableTypes).values(data).returning();
    res.status(201).json(tableType);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/table-types/:id - Update table type
router.patch("/api/e4u/table-types/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Get table type to check event permissions
    const [tableType] = await db.select().from(tableTypes).where(eq(tableTypes.id, id));
    if (!tableType) {
      return res.status(404).json({ message: "Tipo tavolo non trovato" });
    }
    
    // Check permissions: gestore/super_admin OR staff with canManageTables
    const isGestore = await isGestoreForEvent(user, tableType.eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const hasPermission = await checkTablePermission(getUserId(user), tableType.eventId, 'manage', sessionPrProfileId);
      if (!hasPermission) {
        return res.status(403).json({ message: "Non hai i permessi per modificare i tipi di tavolo" });
      }
    }
    
    const data = patchTableTypeSchema.parse(req.body);
    
    const [updated] = await db.update(tableTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tableTypes.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/e4u/table-types/:id - Delete table type
router.delete("/api/e4u/table-types/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Get table type to check event permissions
    const [tableType] = await db.select().from(tableTypes).where(eq(tableTypes.id, id));
    if (!tableType) {
      return res.status(404).json({ message: "Tipo tavolo non trovato" });
    }
    
    // Check permissions: gestore/super_admin OR staff with canManageTables
    const isGestore = await isGestoreForEvent(user, tableType.eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const hasPermission = await checkTablePermission(getUserId(user), tableType.eventId, 'manage', sessionPrProfileId);
      if (!hasPermission) {
        return res.status(403).json({ message: "Non hai i permessi per eliminare i tipi di tavolo" });
      }
    }
    
    // Check if there are reservations for this table type
    const reservations = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.tableTypeId, id));
    
    if (reservations.length > 0) {
      return res.status(400).json({ message: "Impossibile eliminare: esistono prenotazioni per questo tipo tavolo" });
    }
    
    const [deleted] = await db.delete(tableTypes)
      .where(eq(tableTypes.id, id))
      .returning();
    
    res.json({ message: "Tipo tavolo eliminato con successo" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/events/:eventId/reservations - Get all reservations for event
router.get("/api/e4u/events/:eventId/reservations", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const reservations = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.eventId, eventId))
      .orderBy(desc(tableReservations.createdAt));
    res.json(reservations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/events/:eventId/reservations - Create reservation
router.post("/api/e4u/events/:eventId/reservations", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check permissions: gestore, staff with canManageTables, or PR with canProposeTables
    const isGestore = await isGestoreForEvent(user, eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const canManage = await checkTablePermission(getUserId(user), eventId, 'manage', sessionPrProfileId);
      const canPropose = await checkTablePermission(getUserId(user), eventId, 'propose', sessionPrProfileId);
      if (!canManage && !canPropose) {
        return res.status(403).json({ message: "Non hai i permessi per creare prenotazioni tavoli" });
      }
    }
    
    const data = insertTableReservationSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
      createdBy: getUserId(user),
      createdByRole: user.role,
      status: 'pending',
    });
    
    const [reservation] = await db.insert(tableReservations).values(data).returning();
    res.status(201).json(reservation);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/reservations/:id - Update reservation
router.patch("/api/e4u/reservations/:id", requireAuth, requireStaffOrHigher, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = patchTableReservationSchema.parse(req.body);
    
    const [updated] = await db.update(tableReservations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tableReservations.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/e4u/reservations/:id/approve - Approve reservation
router.post("/api/e4u/reservations/:id/approve", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Get reservation to check event
    const [reservation] = await db.select().from(tableReservations).where(eq(tableReservations.id, id));
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }
    
    // Check permissions: gestore/super_admin OR staff with canApproveTables (NOT PR)
    const isGestore = await isGestoreForEvent(user, reservation.eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const canApprove = await checkTablePermission(getUserId(user), reservation.eventId, 'approve', sessionPrProfileId);
      if (!canApprove) {
        return res.status(403).json({ message: "Non hai i permessi per approvare prenotazioni" });
      }
    }
    
    const [updated] = await db.update(tableReservations)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: getUserId(user),
        updatedAt: new Date(),
      })
      .where(eq(tableReservations.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/reservations/:id/reject - Reject reservation
router.post("/api/e4u/reservations/:id/reject", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const { reason } = req.body;
    
    // Get reservation to check event
    const [reservation] = await db.select().from(tableReservations).where(eq(tableReservations.id, id));
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }
    
    // Check permissions: gestore/super_admin OR staff with canApproveTables (NOT PR)
    const isGestore = await isGestoreForEvent(user, reservation.eventId);
    if (!isGestore) {
      const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
      const canApprove = await checkTablePermission(getUserId(user), reservation.eventId, 'approve', sessionPrProfileId);
      if (!canApprove) {
        return res.status(403).json({ message: "Non hai i permessi per rifiutare prenotazioni" });
      }
    }
    
    const [updated] = await db.update(tableReservations)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(tableReservations.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/reservations/:reservationId/guests - Get guests for reservation
router.get("/api/e4u/reservations/:reservationId/guests", requireAuth, async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.params;
    const guests = await db.select()
      .from(tableGuests)
      .where(eq(tableGuests.reservationId, reservationId))
      .orderBy(desc(tableGuests.createdAt));
    res.json(guests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/reservations/:reservationId/guests - Add guest to reservation
router.post("/api/e4u/reservations/:reservationId/guests", requireAuth, requireStaffOrHigher, async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.params;
    
    // Get reservation to verify and get eventId/companyId
    const [reservation] = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.id, reservationId));
    
    if (!reservation) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }
    
    // Generate QR code
    const qrCode = generateQrCode('TBL', reservationId);
    
    const data = insertTableGuestSchema.parse({
      ...req.body,
      reservationId,
      eventId: reservation.eventId,
      companyId: reservation.companyId,
      qrCode,
      status: 'confirmed',
    });
    
    const [guest] = await db.insert(tableGuests).values(data).returning();
    res.status(201).json(guest);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/guests/:id - Update guest
router.patch("/api/e4u/guests/:id", requireAuth, requireStaffOrHigher, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = patchTableGuestSchema.parse(req.body);
    
    const [updated] = await db.update(tableGuests)
      .set(data)
      .where(eq(tableGuests.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Ospite non trovato" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/e4u/guests/:id - Remove guest
router.delete("/api/e4u/guests/:id", requireAuth, requireStaffOrHigher, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await db.delete(tableGuests)
      .where(eq(tableGuests.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Ospite non trovato" });
    }
    res.json({ message: "Ospite rimosso con successo" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/guests/:id/check-in - Check in guest
router.post("/api/e4u/guests/:id/check-in", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    const [updated] = await db.update(tableGuests)
      .set({
        status: 'checked_in',
        checkedInAt: new Date(),
        checkedInBy: getUserId(user),
      })
      .where(eq(tableGuests.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Ospite non trovato" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== STAFF & PR API ====================

// GET /api/e4u/events/:eventId/staff - Get assigned staff for event
router.get("/api/e4u/events/:eventId/staff", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const staffAssignments = await db.select({
      assignment: e4uStaffAssignments,
      user: users,
    })
      .from(e4uStaffAssignments)
      .leftJoin(users, eq(e4uStaffAssignments.userId, users.id))
      .where(eq(e4uStaffAssignments.eventId, eventId))
      .orderBy(desc(e4uStaffAssignments.createdAt));
    res.json(staffAssignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/events/:eventId/staff - Assign staff to event
router.post("/api/e4u/events/:eventId/staff", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    const data = insertE4uStaffAssignmentSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
    });
    
    const [assignment] = await db.insert(e4uStaffAssignments).values(data).returning();
    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/staff/:id - Update staff permissions
router.patch("/api/e4u/staff/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = patchE4uStaffAssignmentSchema.parse(req.body);
    
    const [updated] = await db.update(e4uStaffAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(e4uStaffAssignments.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Assegnazione staff non trovata" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/e4u/staff/:id - Remove staff from event
router.delete("/api/e4u/staff/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await db.delete(e4uStaffAssignments)
      .where(eq(e4uStaffAssignments.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Assegnazione staff non trovata" });
    }
    res.json({ message: "Staff rimosso dall'evento" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/events/:eventId/pr - Get assigned PR for event
router.get("/api/e4u/events/:eventId/pr", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const prAssignments = await db.select({
      assignment: eventPrAssignments,
      user: users,
    })
      .from(eventPrAssignments)
      .leftJoin(users, eq(eventPrAssignments.userId, users.id))
      .where(eq(eventPrAssignments.eventId, eventId))
      .orderBy(desc(eventPrAssignments.createdAt));
    res.json(prAssignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/events/:eventId/pr - Assign PR to event
router.post("/api/e4u/events/:eventId/pr", requireAuth, requireStaffOrHigher, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    const data = insertEventPrAssignmentSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
      staffUserId: user.role === 'capo_staff' ? getUserId(user) : req.body.staffUserId,
    });
    
    const [assignment] = await db.insert(eventPrAssignments).values(data).returning();
    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/pr/:id - Update PR permissions
router.patch("/api/e4u/pr/:id", requireAuth, requireStaffOrHigher, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = patchEventPrAssignmentSchema.parse(req.body);
    
    const [updated] = await db.update(eventPrAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(eventPrAssignments.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Assegnazione PR non trovata" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/e4u/pr/:id - Remove PR from event
router.delete("/api/e4u/pr/:id", requireAuth, requireStaffOrHigher, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await db.delete(eventPrAssignments)
      .where(eq(eventPrAssignments.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Assegnazione PR non trovata" });
    }
    res.json({ message: "PR rimosso dall'evento" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== PR LIST ASSIGNMENTS API ====================

// GET /api/e4u/pr-assignments/:assignmentId/lists - Get list assignments for a PR
router.get("/api/e4u/pr-assignments/:assignmentId/lists", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const user = req.user as any;
    
    const [prAssignment] = await db.select()
      .from(eventPrAssignments)
      .where(eq(eventPrAssignments.id, assignmentId));
    
    if (!prAssignment) {
      return res.status(404).json({ message: "Assegnazione PR non trovata" });
    }
    
    if (user.role !== 'super_admin' && prAssignment.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato per questa azienda" });
    }
    
    const listAssignments = await db.select({
      assignment: prListAssignments,
      list: eventLists,
    })
      .from(prListAssignments)
      .innerJoin(eventLists, eq(prListAssignments.listId, eventLists.id))
      .where(eq(prListAssignments.prAssignmentId, assignmentId))
      .orderBy(desc(prListAssignments.createdAt));
    
    res.json(listAssignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/pr-assignments/:assignmentId/lists - Set list assignments for a PR
// Supporta due formati:
// - Vecchio: { listIds: string[] } - backward compatible, quota null
// - Nuovo: { listAssignments: [{listId: string, quota?: number}] } - con quota
router.post("/api/e4u/pr-assignments/:assignmentId/lists", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { listIds, listAssignments: listAssignmentsInput } = req.body;
    const user = req.user as any;
    
    // Supporta entrambi i formati
    let assignments: { listId: string; quota?: number | null }[] = [];
    
    if (listAssignmentsInput && Array.isArray(listAssignmentsInput)) {
      // Nuovo formato con quota
      assignments = listAssignmentsInput.map((a: any) => ({
        listId: a.listId,
        quota: a.quota ?? null,
      }));
    } else if (listIds && Array.isArray(listIds)) {
      // Vecchio formato senza quota
      assignments = listIds.map((listId: string) => ({
        listId,
        quota: null,
      }));
    } else {
      return res.status(400).json({ message: "listIds o listAssignments deve essere un array" });
    }
    
    const [prAssignment] = await db.select()
      .from(eventPrAssignments)
      .where(eq(eventPrAssignments.id, assignmentId));
    
    if (!prAssignment) {
      return res.status(404).json({ message: "Assegnazione PR non trovata" });
    }
    
    if (user.role !== 'super_admin' && prAssignment.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato per questa azienda" });
    }
    
    await db.delete(prListAssignments)
      .where(eq(prListAssignments.prAssignmentId, assignmentId));
    
    if (assignments.length === 0) {
      return res.json([]);
    }
    
    const newAssignments = assignments.map((a) => ({
      prAssignmentId: assignmentId,
      listId: a.listId,
      quota: a.quota,
    }));
    
    await db.insert(prListAssignments).values(newAssignments);
    
    const listAssignmentsResult = await db.select({
      assignment: prListAssignments,
      list: eventLists,
    })
      .from(prListAssignments)
      .innerJoin(eventLists, eq(prListAssignments.listId, eventLists.id))
      .where(eq(prListAssignments.prAssignmentId, assignmentId))
      .orderBy(desc(prListAssignments.createdAt));
    
    res.status(201).json(listAssignmentsResult);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/e4u/pr-assignments/:assignmentId/lists/:listId - Remove a list assignment
router.delete("/api/e4u/pr-assignments/:assignmentId/lists/:listId", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { assignmentId, listId } = req.params;
    const user = req.user as any;
    
    const [prAssignment] = await db.select()
      .from(eventPrAssignments)
      .where(eq(eventPrAssignments.id, assignmentId));
    
    if (!prAssignment) {
      return res.status(404).json({ message: "Assegnazione PR non trovata" });
    }
    
    if (user.role !== 'super_admin' && prAssignment.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato per questa azienda" });
    }
    
    const [deleted] = await db.delete(prListAssignments)
      .where(and(
        eq(prListAssignments.prAssignmentId, assignmentId),
        eq(prListAssignments.listId, listId)
      ))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Assegnazione lista non trovata" });
    }
    
    res.json({ message: "Lista rimossa dalle assegnazioni PR" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SCANNER API ====================

// GET /api/e4u/events/:eventId/scanners - Get scanners for event
router.get("/api/e4u/events/:eventId/scanners", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const scanners = await db.select({
      scanner: eventScanners,
      user: users,
    })
      .from(eventScanners)
      .leftJoin(users, eq(eventScanners.userId, users.id))
      .where(eq(eventScanners.eventId, eventId))
      .orderBy(desc(eventScanners.createdAt));
    res.json(scanners);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/events/:eventId/scanners - Assign scanner to event
router.post("/api/e4u/events/:eventId/scanners", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    const data = insertEventScannerSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
    });
    
    const [scanner] = await db.insert(eventScanners).values(data).returning();
    res.status(201).json(scanner);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/e4u/scanners/:id/access - Update scanner sector access
router.patch("/api/e4u/scanners/:id/access", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const { allowedSectorIds } = req.body;
    
    // Verify the scanner exists and belongs to user's company
    const [existingScanner] = await db.select()
      .from(eventScanners)
      .where(eq(eventScanners.id, id));
    
    if (!existingScanner) {
      return res.status(404).json({ message: "Scanner non trovato" });
    }
    
    // Verify scanner belongs to user's company
    if (existingScanner.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a modificare questo scanner" });
    }
    
    // Default to empty array if not provided, validate it's an array
    const rawSectorIds = allowedSectorIds ?? [];
    if (!Array.isArray(rawSectorIds)) {
      return res.status(400).json({ message: "allowedSectorIds deve essere un array" });
    }
    
    // Sanitize: filter falsy values, remove duplicates, ensure strings only
    const filteredIds = rawSectorIds
      .filter((id: unknown) => id && typeof id === 'string')
      .map((id: string) => id.trim());
    const sanitizedSectorIds = Array.from(new Set(filteredIds));
    
    // Update the scanner with sanitized sector access
    const [updated] = await db.update(eventScanners)
      .set({ allowedSectorIds: sanitizedSectorIds })
      .where(eq(eventScanners.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/e4u/scanners/:id - Remove scanner
router.delete("/api/e4u/scanners/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // First verify the scanner exists and belongs to user's company
    const [existingScanner] = await db.select()
      .from(eventScanners)
      .where(eq(eventScanners.id, id));
    
    if (!existingScanner) {
      return res.status(404).json({ message: "Scanner non trovato" });
    }
    
    // Security check: verify company ownership (super_admin bypasses)
    if (existingScanner.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a rimuovere questo scanner" });
    }
    
    const [deleted] = await db.delete(eventScanners)
      .where(eq(eventScanners.id, id))
      .returning();
    
    res.json({ message: "Scanner rimosso dall'evento" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/events/:eventId/scan-stats - Get scan statistics for event
router.get("/api/e4u/events/:eventId/scan-stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    // SECURITY: Verify user has access to this event
    const isGestore = await isGestoreForEvent(user, eventId);
    if (!isGestore) {
      // Check if user is an assigned scanner for this event
      const [scannerAssignment] = await db.select()
        .from(eventScanners)
        .where(and(eq(eventScanners.userId, getUserId(user)), eq(eventScanners.eventId, eventId)));
      
      if (!scannerAssignment) {
        return res.status(403).json({ message: "Non hai accesso a questo evento" });
      }
    }
    
    // Get lists stats
    const lists = await db.select().from(eventLists).where(eq(eventLists.eventId, eventId));
    const listIds = lists.map(l => l.id);
    
    let totalLists = 0;
    let checkedInLists = 0;
    
    if (listIds.length > 0) {
      for (const listId of listIds) {
        const entries = await db.select().from(listEntries).where(eq(listEntries.listId, listId));
        totalLists += entries.length;
        checkedInLists += entries.filter(e => e.status === 'checked_in').length;
      }
    }
    
    // Get table stats
    const reservations = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.eventId, eventId));
    
    let totalTables = 0;
    let checkedInTables = 0;
    
    for (const reservation of reservations) {
      const guests = await db.select()
        .from(tableGuests)
        .where(eq(tableGuests.reservationId, reservation.id));
      totalTables += guests.length;
      checkedInTables += guests.filter(g => g.status === 'checked_in').length;
    }
    
    // Get ticket stats
    const [ticketedEvent] = await db.select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.eventId, eventId));
    
    let totalTickets = 0;
    let checkedInTickets = 0;
    
    if (ticketedEvent) {
      const tickets = await db.select()
        .from(siaeTickets)
        .where(eq(siaeTickets.ticketedEventId, ticketedEvent.id));
      
      totalTickets = tickets.filter(t => t.status !== 'cancelled').length;
      checkedInTickets = tickets.filter(t => t.status === 'used').length;
    }
    
    res.json({
      totalLists,
      checkedInLists,
      totalTables,
      checkedInTables,
      totalTickets,
      checkedInTickets,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/events/:eventId/checked-in - Get checked in people for event
router.get("/api/e4u/events/:eventId/checked-in", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    // SECURITY: Verify user has access to this event
    const isGestore = await isGestoreForEvent(user, eventId);
    if (!isGestore) {
      // Check if user is an assigned scanner for this event
      const [scannerAssignment] = await db.select()
        .from(eventScanners)
        .where(and(eq(eventScanners.userId, getUserId(user)), eq(eventScanners.eventId, eventId)));
      
      if (!scannerAssignment) {
        return res.status(403).json({ message: "Non hai accesso a questo evento" });
      }
    }
    
    const checkedInPeople: any[] = [];
    
    // Get list entries that are checked in
    const lists = await db.select().from(eventLists).where(eq(eventLists.eventId, eventId));
    for (const list of lists) {
      const entries = await db.select()
        .from(listEntries)
        .where(and(eq(listEntries.listId, list.id), eq(listEntries.status, 'checked_in')));
      
      for (const entry of entries) {
        checkedInPeople.push({
          id: entry.id,
          firstName: entry.firstName,
          lastName: entry.lastName,
          phone: entry.phone,
          type: 'list',
          checkedInAt: entry.checkedInAt,
          listName: list.name,
        });
      }
    }
    
    // Get table guests that are checked in
    const reservations = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.eventId, eventId));
    
    for (const reservation of reservations) {
      const guests = await db.select()
        .from(tableGuests)
        .where(and(eq(tableGuests.reservationId, reservation.id), eq(tableGuests.status, 'checked_in')));
      
      for (const guest of guests) {
        checkedInPeople.push({
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
          type: 'table',
          checkedInAt: guest.checkedInAt,
          tableName: reservation.reservationName,
        });
      }
    }
    
    // Get tickets that are checked in (used)
    const [ticketedEvent] = await db.select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.eventId, eventId));
    
    if (ticketedEvent) {
      const tickets = await db.select()
        .from(siaeTickets)
        .where(and(eq(siaeTickets.ticketedEventId, ticketedEvent.id), eq(siaeTickets.status, 'used')));
      
      for (const ticket of tickets) {
        checkedInPeople.push({
          id: ticket.id,
          firstName: ticket.participantFirstName || '',
          lastName: ticket.participantLastName || '',
          phone: '',
          type: 'ticket',
          checkedInAt: ticket.usedAt,
          ticketType: ticket.ticketType,
        });
      }
    }
    
    // Sort by check-in time (most recent first)
    checkedInPeople.sort((a, b) => 
      new Date(b.checkedInAt || 0).getTime() - new Date(a.checkedInAt || 0).getTime()
    );
    
    res.json(checkedInPeople);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/events/:eventId/all-entries - Get ALL entries (checked in and not) for event
// This is for the scanner to see the full list of titles to scan
router.get("/api/e4u/events/:eventId/all-entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    // SECURITY: Verify user has access to this event
    const isGestore = await isGestoreForEvent(user, eventId);
    if (!isGestore) {
      // Check if user is an assigned scanner for this event
      const [scannerAssignment] = await db.select()
        .from(eventScanners)
        .where(and(eq(eventScanners.userId, getUserId(user)), eq(eventScanners.eventId, eventId)));
      
      if (!scannerAssignment) {
        return res.status(403).json({ message: "Non hai accesso a questo evento" });
      }
    }
    
    const allEntries: any[] = [];
    
    // Get all list entries
    const lists = await db.select().from(eventLists).where(eq(eventLists.eventId, eventId));
    for (const list of lists) {
      const entries = await db.select()
        .from(listEntries)
        .where(eq(listEntries.listId, list.id));
      
      for (const entry of entries) {
        allEntries.push({
          id: entry.id,
          firstName: entry.firstName,
          lastName: entry.lastName,
          phone: entry.phone,
          type: 'list',
          status: entry.status,
          isCheckedIn: entry.status === 'checked_in',
          checkedInAt: entry.checkedInAt,
          listName: list.name,
          qrCode: entry.qrCode,
          plusOnes: entry.plusOnes,
        });
      }
    }
    
    // Get all table guests
    const reservations = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.eventId, eventId));
    
    for (const reservation of reservations) {
      const guests = await db.select()
        .from(tableGuests)
        .where(eq(tableGuests.reservationId, reservation.id));
      
      // Get table type info
      const [tableType] = await db.select()
        .from(tableTypes)
        .where(eq(tableTypes.id, reservation.tableTypeId));
      
      for (const guest of guests) {
        allEntries.push({
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
          type: 'table',
          status: guest.status,
          isCheckedIn: guest.status === 'checked_in',
          checkedInAt: guest.checkedInAt,
          tableName: reservation.reservationName,
          tableTypeName: tableType?.name,
          qrCode: guest.qrCode,
        });
      }
    }
    
    // Get all tickets
    const [ticketedEvent] = await db.select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.eventId, eventId));
    
    if (ticketedEvent) {
      const tickets = await db.select()
        .from(siaeTickets)
        .where(eq(siaeTickets.ticketedEventId, ticketedEvent.id));
      
      for (const ticket of tickets) {
        // Skip cancelled tickets
        if (ticket.status === 'cancelled') continue;
        
        allEntries.push({
          id: ticket.id,
          firstName: ticket.participantFirstName || '',
          lastName: ticket.participantLastName || '',
          phone: '',
          type: 'ticket',
          status: ticket.status,
          isCheckedIn: ticket.status === 'used',
          checkedInAt: ticket.usedAt,
          ticketType: ticket.ticketType,
          ticketCode: ticket.ticketCode,
          sector: ticket.sectorName,
          price: ticket.ticketPrice,
          qrCode: ticket.qrCode,
        });
      }
    }
    
    // Sort: not checked in first, then by name
    allEntries.sort((a, b) => {
      // Not checked in first
      if (!a.isCheckedIn && b.isCheckedIn) return -1;
      if (a.isCheckedIn && !b.isCheckedIn) return 1;
      // Then by name
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
    });
    
    res.json(allEntries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/scanner/events - Get all events assigned to the scanner
router.get("/api/e4u/scanner/events", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = getUserId(user);
    
    console.log('[Scanner Events] User object:', JSON.stringify(user));
    console.log('[Scanner Events] Extracted userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }
    
    // Get all scanner assignments for this user
    const scannerAssignments = await db.select({
      assignment: eventScanners,
      event: events,
    })
    .from(eventScanners)
    .innerJoin(events, eq(eventScanners.eventId, events.id))
    .where(eq(eventScanners.userId, userId))
    .orderBy(desc(events.startDatetime));
    
    const result = [];
    
    for (const { assignment, event } of scannerAssignments) {
      // Count list entries
      let totalGuests = 0;
      let checkedIn = 0;
      
      // Count list entries
      const lists = await db.select().from(eventLists).where(eq(eventLists.eventId, event.id));
      for (const list of lists) {
        const entries = await db.select().from(listEntries).where(eq(listEntries.listId, list.id));
        totalGuests += entries.length;
        checkedIn += entries.filter(e => e.status === 'checked_in').length;
      }
      
      // Count table guests
      const reservations = await db.select()
        .from(tableReservations)
        .where(eq(tableReservations.eventId, event.id));
      
      for (const reservation of reservations) {
        const guests = await db.select()
          .from(tableGuests)
          .where(eq(tableGuests.reservationId, reservation.id));
        totalGuests += guests.length;
        checkedIn += guests.filter(g => g.status === 'checked_in').length;
      }
      
      // Count tickets
      const [ticketedEvent] = await db.select()
        .from(siaeTicketedEvents)
        .where(eq(siaeTicketedEvents.eventId, event.id));
      
      if (ticketedEvent) {
        const tickets = await db.select()
          .from(siaeTickets)
          .where(eq(siaeTickets.ticketedEventId, ticketedEvent.id));
        
        totalGuests += tickets.filter(t => t.status !== 'cancelled').length;
        checkedIn += tickets.filter(t => t.status === 'used').length;
      }
      
      result.push({
        id: assignment.id,
        eventId: event.id,
        eventName: event.name,
        eventImageUrl: event.imageUrl,
        eventStart: event.startDatetime,
        eventEnd: event.endDatetime,
        locationName: 'Location',
        totalGuests,
        checkedIn,
        canScanLists: assignment.canScanLists ?? true,
        canScanTables: assignment.canScanTables ?? true,
        canScanTickets: assignment.canScanTickets ?? true,
      });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Error getting scanner events:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/scanner/stats - Get scanner stats summary
router.get("/api/e4u/scanner/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = getUserId(user);
    
    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }
    
    // Get all scanner assignments
    const scannerAssignments = await db.select()
      .from(eventScanners)
      .where(eq(eventScanners.userId, userId));
    
    let totalScans = 0;
    let todayScans = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const assignment of scannerAssignments) {
      const eventId = assignment.eventId;
      
      // Count checked-in list entries
      const lists = await db.select().from(eventLists).where(eq(eventLists.eventId, eventId));
      for (const list of lists) {
        const entries = await db.select().from(listEntries).where(eq(listEntries.listId, list.id));
        const checkedInEntries = entries.filter(e => e.status === 'checked_in');
        totalScans += checkedInEntries.length;
        
        // Count today's check-ins
        todayScans += checkedInEntries.filter(e => {
          if (!e.checkedInAt) return false;
          const checkInDate = new Date(e.checkedInAt);
          return checkInDate >= today;
        }).length;
      }
      
      // Count checked-in table guests
      const reservations = await db.select()
        .from(tableReservations)
        .where(eq(tableReservations.eventId, eventId));
      
      for (const reservation of reservations) {
        const guests = await db.select()
          .from(tableGuests)
          .where(eq(tableGuests.reservationId, reservation.id));
        
        const checkedInGuests = guests.filter(g => g.status === 'checked_in');
        totalScans += checkedInGuests.length;
        
        todayScans += checkedInGuests.filter(g => {
          if (!g.checkedInAt) return false;
          const checkInDate = new Date(g.checkedInAt);
          return checkInDate >= today;
        }).length;
      }
    }
    
    res.json({
      totalScans,
      todayScans,
      eventsAssigned: scannerAssignments.length,
    });
  } catch (error: any) {
    console.error('Error getting scanner stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/scanner/total-stats - Get total scan stats for scanner (all events)
router.get("/api/e4u/scanner/total-stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Get all events the scanner has access to
    const scannerAssignments = await db.select()
      .from(eventScanners)
      .where(eq(eventScanners.userId, getUserId(user)));
    
    let totalLists = 0;
    let checkedInLists = 0;
    let totalTables = 0;
    let checkedInTables = 0;
    let totalTickets = 0;
    let checkedInTickets = 0;
    
    for (const assignment of scannerAssignments) {
      const eventId = assignment.eventId;
      
      // Get lists stats
      const lists = await db.select().from(eventLists).where(eq(eventLists.eventId, eventId));
      for (const list of lists) {
        const entries = await db.select().from(listEntries).where(eq(listEntries.listId, list.id));
        totalLists += entries.length;
        checkedInLists += entries.filter(e => e.status === 'checked_in').length;
      }
      
      // Get table stats
      const reservations = await db.select()
        .from(tableReservations)
        .where(eq(tableReservations.eventId, eventId));
      
      for (const reservation of reservations) {
        const guests = await db.select()
          .from(tableGuests)
          .where(eq(tableGuests.reservationId, reservation.id));
        totalTables += guests.length;
        checkedInTables += guests.filter(g => g.status === 'checked_in').length;
      }
      
      // Get ticket stats
      const [ticketedEvent] = await db.select()
        .from(siaeTicketedEvents)
        .where(eq(siaeTicketedEvents.eventId, eventId));
      
      if (ticketedEvent) {
        const tickets = await db.select()
          .from(siaeTickets)
          .where(eq(siaeTickets.ticketedEventId, ticketedEvent.id));
        
        totalTickets += tickets.filter(t => t.status !== 'cancelled').length;
        checkedInTickets += tickets.filter(t => t.status === 'used').length;
      }
    }
    
    res.json({
      totalLists,
      checkedInLists,
      totalTables,
      checkedInTables,
      totalTickets,
      checkedInTickets,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/scanner/search/:eventId - Search guests in lists and tables by phone or name
router.get("/api/e4u/scanner/search/:eventId", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json([]);
    }
    
    const searchTerm = q.trim().toLowerCase();
    const results: any[] = [];
    
    // Search in list entries
    const listEntriesData = await db.select({
      entry: listEntries,
      list: eventLists,
    })
    .from(listEntries)
    .innerJoin(eventLists, eq(listEntries.listId, eventLists.id))
    .where(eq(listEntries.eventId, eventId));
    
    for (const { entry, list } of listEntriesData) {
      const firstName = (entry.firstName || '').toLowerCase();
      const lastName = (entry.lastName || '').toLowerCase();
      const phone = (entry.phone || '').replace(/\s/g, '');
      const searchPhone = searchTerm.replace(/\s/g, '');
      
      if (firstName.includes(searchTerm) || 
          lastName.includes(searchTerm) ||
          `${firstName} ${lastName}`.includes(searchTerm) ||
          (phone && phone.includes(searchPhone))) {
        results.push({
          id: entry.id,
          type: 'lista',
          firstName: entry.firstName,
          lastName: entry.lastName,
          phone: entry.phone,
          listName: list.name,
          status: entry.status,
          checkedInAt: entry.checkedInAt,
          qrCode: entry.qrCode,
        });
      }
    }
    
    // Search in table guests
    const tableGuestsData = await db.select({
      guest: tableGuests,
      reservation: tableReservations,
      tableType: tableTypes,
    })
    .from(tableGuests)
    .innerJoin(tableReservations, eq(tableGuests.reservationId, tableReservations.id))
    .innerJoin(tableTypes, eq(tableReservations.tableTypeId, tableTypes.id))
    .where(eq(tableGuests.eventId, eventId));
    
    for (const { guest, reservation, tableType } of tableGuestsData) {
      const firstName = (guest.firstName || '').toLowerCase();
      const lastName = (guest.lastName || '').toLowerCase();
      const phone = (guest.phone || '').replace(/\s/g, '');
      const searchPhone = searchTerm.replace(/\s/g, '');
      
      if (firstName.includes(searchTerm) || 
          lastName.includes(searchTerm) ||
          `${firstName} ${lastName}`.includes(searchTerm) ||
          (phone && phone.includes(searchPhone))) {
        results.push({
          id: guest.id,
          type: 'tavolo',
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
          tableName: `${tableType.name} - ${reservation.reservationName}`,
          status: guest.status,
          checkedInAt: guest.checkedInAt,
          qrCode: guest.qrCode,
        });
      }
    }
    
    // Search in SIAE tickets (join with customers for name/phone)
    const [ticketedEvent] = await db.select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.eventId, eventId));
    
    if (ticketedEvent) {
      const ticketsData = await db.select({
        ticket: siaeTickets,
        customer: siaeCustomers,
        sector: siaeEventSectors,
      })
      .from(siaeTickets)
      .leftJoin(siaeCustomers, eq(siaeTickets.customerId, siaeCustomers.id))
      .leftJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .where(eq(siaeTickets.ticketedEventId, ticketedEvent.id));
      
      for (const { ticket, customer, sector } of ticketsData) {
        if (ticket.status === 'cancelled') continue;
        
        const firstName = (customer?.firstName || '').toLowerCase();
        const lastName = (customer?.lastName || '').toLowerCase();
        const phone = (customer?.phone || '').replace(/\s/g, '');
        const searchPhone = searchTerm.replace(/\s/g, '');
        const ticketCode = (ticket.ticketCode || '').toLowerCase();
        
        if (firstName.includes(searchTerm) || 
            lastName.includes(searchTerm) ||
            `${firstName} ${lastName}`.includes(searchTerm) ||
            (phone && phone.includes(searchPhone)) ||
            ticketCode.includes(searchTerm)) {
          results.push({
            id: ticket.id,
            type: 'biglietto',
            firstName: customer?.firstName || 'N/D',
            lastName: customer?.lastName || '',
            phone: customer?.phone,
            ticketCode: ticket.ticketCode,
            sector: sector?.name,
            status: ticket.status,
            checkedInAt: ticket.validatedAt,
            qrCode: `E4U-TKT-${ticket.id.substring(0, 8)}-${ticket.ticketCode}`,
          });
        }
      }
    }
    
    // Limit results
    res.json(results.slice(0, 20));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/scanners/assignments - Get all scanner assignments for company
router.get("/api/e4u/scanners/assignments", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;
    
    // Always require company scope for gestore
    if (!companyId) {
      if (user.role !== 'super_admin') {
        return res.status(403).json({ message: "Nessuna company associata" });
      }
    }
    
    // For gestore, always scope to their company
    // For super_admin without company, return empty (they should pick a context)
    if (!companyId && user.role === 'super_admin') {
      // Super admin without company context - return empty
      return res.json([]);
    }
    
    // Query only assignments for the user's company
    const assignments = await db.select()
      .from(eventScanners)
      .where(eq(eventScanners.companyId, companyId))
      .orderBy(desc(eventScanners.createdAt));
    
    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/scan - Scan QR code (for lists/tables/tickets)
// SECURITY: Verifica permessi scanner per ogni operazione
router.post("/api/e4u/scan", requireAuth, async (req: Request, res: Response) => {
  try {
    const { qrCode, eventId } = req.body;
    const user = req.user as any;
    
    if (!qrCode) {
      return res.status(400).json({ message: "Codice QR mancante" });
    }
    
    // Parse QR code - supports multiple formats:
    // E4U-{type}-{id}-{random} for lists/tables
    // SIAE-TKT-{ticketId} for SIAE tickets
    const parts = qrCode.split('-');
    
    // Check if it's a SIAE ticket QR code (format: SIAE-TKT-{uuid})
    // UUID contains dashes, so we need to rejoin the parts after TKT
    if (parts.length >= 3 && parts[0] === 'SIAE' && parts[1] === 'TKT') {
      const ticketId = parts.slice(2).join('-');
      
      // Find ticket by ID
      const [ticket] = await db.select({
        id: siaeTickets.id,
        ticketCode: siaeTickets.ticketCode,
        ticketType: siaeTickets.ticketType,
        ticketPrice: siaeTickets.ticketPrice,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        status: siaeTickets.status,
        usedAt: siaeTickets.usedAt,
        ticketedEventId: siaeTickets.ticketedEventId,
        sectorId: siaeTickets.sectorId,
      })
        .from(siaeTickets)
        .where(eq(siaeTickets.id, ticketId));
      
      if (!ticket) {
        return res.status(404).json({ message: "Biglietto non trovato" });
      }
      
      // Get event info
      const [ticketedEvent] = await db.select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
      })
        .from(siaeTicketedEvents)
        .where(eq(siaeTicketedEvents.id, ticket.ticketedEventId));
      
      if (!ticketedEvent) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Get sector info
      const [sector] = await db.select({
        name: siaeEventSectors.name,
      })
        .from(siaeEventSectors)
        .where(eq(siaeEventSectors.id, ticket.sectorId));
      
      // SECURITY: Verifica permessi scanner per questo evento (con verifica settore)
      const isGestore = await isGestoreForEvent(user, ticketedEvent.eventId);
      if (!isGestore) {
        const permResult = await checkScannerPermissionGranular(getUserId(user), ticketedEvent.eventId, 'tickets', ticket.sectorId);
        if (!permResult.allowed) {
          return res.status(403).json({ 
            message: permResult.reason || "Non hai i permessi di scansione biglietti per questo evento. Contatta l'organizzatore.",
            errorCode: "SCANNER_PERMISSION_DENIED"
          });
        }
      }
      
      // Check ticket status
      if (ticket.status === 'used' || ticket.usedAt) {
        return res.status(400).json({ 
          message: "Biglietto già utilizzato",
          ticket: {
            id: ticket.id,
            ticketCode: ticket.ticketCode,
            firstName: ticket.participantFirstName,
            lastName: ticket.participantLastName,
            ticketType: ticket.ticketType,
            sector: sector?.name,
            usedAt: ticket.usedAt,
          },
          alreadyCheckedIn: true,
        });
      }
      
      if (ticket.status === 'cancelled') {
        return res.status(400).json({ 
          message: "Biglietto annullato",
          ticket: {
            id: ticket.id,
            ticketCode: ticket.ticketCode,
          },
          isCancelled: true,
        });
      }
      
      // Validate ticket - mark as used
      const [updated] = await db.update(siaeTickets)
        .set({
          status: 'used',
          usedAt: new Date(),
          usedByScannerId: getUserId(user),
          updatedAt: new Date(),
        })
        .where(eq(siaeTickets.id, ticket.id))
        .returning();
      
      return res.json({
        success: true,
        type: 'ticket',
        message: "Ingresso registrato con successo",
        person: {
          firstName: ticket.participantFirstName || '',
          lastName: ticket.participantLastName || '',
          type: 'biglietto',
          ticketType: ticket.ticketType,
          ticketCode: ticket.ticketCode,
          sector: sector?.name,
          price: ticket.ticketPrice,
        },
      });
    }
    
    // Check if it's a SIAE subscription QR code (format: SIAE-SUB-{subscriptionId})
    // UUID contains dashes, so we need to rejoin the parts after SUB
    if (parts.length >= 3 && parts[0] === 'SIAE' && parts[1] === 'SUB') {
      const subscriptionId = parts.slice(2).join('-');
      
      // Find subscription by ID
      const [subscription] = await db.select()
        .from(siaeSubscriptions)
        .where(eq(siaeSubscriptions.id, subscriptionId));
      
      if (!subscription) {
        return res.status(404).json({ message: "Abbonamento non trovato" });
      }
      
      // Get ticketed event info
      const [ticketedEvent] = await db.select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
      })
        .from(siaeTicketedEvents)
        .where(eq(siaeTicketedEvents.id, subscription.ticketedEventId));
      
      if (!ticketedEvent) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Get subscription type info
      const [subType] = await db.select({
        name: siaeSubscriptionTypes.name,
      })
        .from(siaeSubscriptionTypes)
        .where(eq(siaeSubscriptionTypes.id, subscription.subscriptionTypeId));
      
      // SECURITY: Verify scanner permissions for this event
      const isGestore = await isGestoreForEvent(user, ticketedEvent.eventId);
      if (!isGestore) {
        const permResult = await checkScannerPermissionGranular(getUserId(user), ticketedEvent.eventId, 'tickets');
        if (!permResult.allowed) {
          return res.status(403).json({ 
            message: permResult.reason || "Non hai i permessi di scansione abbonamenti per questo evento. Contatta l'organizzatore.",
            errorCode: "SCANNER_PERMISSION_DENIED"
          });
        }
      }
      
      // Check subscription status
      if (subscription.status === 'cancelled') {
        return res.status(400).json({ 
          message: "Abbonamento annullato",
          subscription: {
            id: subscription.id,
            subscriptionCode: subscription.subscriptionCode,
          },
          isCancelled: true,
        });
      }
      
      if (subscription.status === 'suspended') {
        return res.status(400).json({ 
          message: "Abbonamento sospeso",
          subscription: {
            id: subscription.id,
            subscriptionCode: subscription.subscriptionCode,
          },
        });
      }
      
      // Check validity period
      const now = new Date();
      if (subscription.validFrom && new Date(subscription.validFrom) > now) {
        return res.status(400).json({ 
          message: `Abbonamento non ancora valido. Valido dal ${new Date(subscription.validFrom).toLocaleDateString('it-IT')}`,
        });
      }
      
      if (subscription.validTo && new Date(subscription.validTo) < now) {
        return res.status(400).json({ 
          message: "Abbonamento scaduto",
          subscription: {
            id: subscription.id,
            subscriptionCode: subscription.subscriptionCode,
            validTo: subscription.validTo,
          },
        });
      }
      
      // Check events usage
      if (subscription.eventsCount !== null && subscription.eventsUsed !== null) {
        if (subscription.eventsUsed >= subscription.eventsCount) {
          return res.status(400).json({ 
            message: `Abbonamento esaurito. Utilizzati ${subscription.eventsUsed}/${subscription.eventsCount} eventi`,
            subscription: {
              id: subscription.id,
              subscriptionCode: subscription.subscriptionCode,
              eventsUsed: subscription.eventsUsed,
              eventsCount: subscription.eventsCount,
            },
          });
        }
      }
      
      // Validate subscription - increment eventsUsed
      const newEventsUsed = (subscription.eventsUsed || 0) + 1;
      const [updated] = await db.update(siaeSubscriptions)
        .set({
          eventsUsed: newEventsUsed,
          updatedAt: new Date(),
        })
        .where(eq(siaeSubscriptions.id, subscription.id))
        .returning();
      
      return res.json({
        success: true,
        type: 'subscription',
        message: "Ingresso abbonamento registrato con successo",
        person: {
          firstName: subscription.holderFirstName || '',
          lastName: subscription.holderLastName || '',
          type: 'abbonamento',
          ticketType: subType?.name || 'Abbonamento',
          ticketCode: subscription.subscriptionCode,
          eventsUsed: newEventsUsed,
          eventsCount: subscription.eventsCount,
        },
      });
    }
    
    // Check if it's a paid reservation QR code (format: RES-{eventId}-{random})
    if (parts[0] === 'RES' && parts.length >= 2) {
      // Find reservation by QR code
      const [reservation] = await db.select()
        .from(reservationPayments)
        .where(eq(reservationPayments.qrCode, qrCode));
      
      if (!reservation) {
        return res.status(404).json({ message: "Prenotazione non trovata" });
      }
      
      if (eventId && reservation.eventId !== eventId) {
        return res.status(400).json({ message: "QR code non valido per questo evento" });
      }
      
      // SECURITY: Verify scanner permissions for this event
      const isGestore = await isGestoreForEvent(user, reservation.eventId);
      if (!isGestore) {
        // For reservations, check if user has scanner permission for lists or tables
        const listPermResult = await checkScannerPermissionGranular(getUserId(user), reservation.eventId, 'lists');
        const tablePermResult = await checkScannerPermissionGranular(getUserId(user), reservation.eventId, 'tables');
        if (!listPermResult.allowed && !tablePermResult.allowed) {
          return res.status(403).json({ 
            message: "Non hai i permessi di scansione per questo evento. Contatta l'organizzatore.",
            errorCode: "SCANNER_PERMISSION_DENIED"
          });
        }
      }
      
      // Check payment status
      if (reservation.paymentStatus !== 'completed') {
        return res.status(400).json({ 
          message: `Pagamento non completato. Stato: ${reservation.paymentStatus === 'pending' ? 'In attesa' : 'Fallito'}`,
          reservation: {
            id: reservation.id,
            customerName: reservation.customerName,
            paymentStatus: reservation.paymentStatus,
          },
        });
      }
      
      // Check if already checked in
      if (reservation.checkedIn) {
        return res.status(400).json({ 
          message: "Prenotazione già verificata",
          success: false,
          person: {
            firstName: reservation.customerName.split(' ')[0] || '',
            lastName: reservation.customerName.split(' ').slice(1).join(' ') || '',
            type: reservation.reservationType === 'list' ? 'prenotazione_lista' : 'prenotazione_tavolo',
            reservationType: reservation.reservationType,
            listName: reservation.listName || undefined,
            tableTypeName: reservation.tableTypeName || undefined,
          },
          alreadyCheckedIn: true,
          checkedInAt: reservation.checkedInAt,
        });
      }
      
      // Check in the reservation
      const [updated] = await db.update(reservationPayments)
        .set({
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: getUserId(user),
        })
        .where(eq(reservationPayments.id, reservation.id))
        .returning();
      
      return res.json({
        success: true,
        type: 'reservation',
        message: "Prenotazione verificata con successo",
        person: {
          firstName: updated.customerName.split(' ')[0] || '',
          lastName: updated.customerName.split(' ').slice(1).join(' ') || '',
          type: updated.reservationType === 'list' ? 'prenotazione_lista' : 'prenotazione_tavolo',
          phone: updated.customerPhone || undefined,
          reservationType: updated.reservationType,
          listName: updated.listName || undefined,
          tableTypeName: updated.tableTypeName || undefined,
          guestCount: updated.guestCount || undefined,
          amount: updated.amount,
        },
      });
    }
    
    // Legacy format support: GL_timestamp_random for lists, TB_timestamp_random for tables
    if (qrCode.startsWith('GL_') || qrCode.startsWith('TB_')) {
      const isTable = qrCode.startsWith('TB_');
      
      if (isTable) {
        // Find table booking by QR code
        const [booking] = await db.select()
          .from(tableBookings)
          .where(eq(tableBookings.qrCode, qrCode));
        
        if (!booking) {
          return res.status(404).json({ message: "Prenotazione tavolo non trovata" });
        }
        
        if (eventId && booking.eventId !== eventId) {
          return res.status(400).json({ message: "QR code non valido per questo evento" });
        }
        
        // Check permissions
        const isGestore = await isGestoreForEvent(user, booking.eventId);
        if (!isGestore) {
          const permResult = await checkScannerPermissionGranular(getUserId(user), booking.eventId, 'tables');
          if (!permResult.allowed) {
            return res.status(403).json({ 
              message: permResult.reason || "Non hai i permessi di scansione tavoli per questo evento.",
              errorCode: "SCANNER_PERMISSION_DENIED"
            });
          }
        }
        
        if (booking.qrScannedAt) {
          return res.status(400).json({ 
            message: "Già entrato",
            alreadyCheckedIn: true,
            checkedInAt: booking.qrScannedAt,
          });
        }
        
        // Check in
        const [updated] = await db.update(tableBookings)
          .set({
            qrScannedAt: new Date(),
            qrScannedByUserId: getUserId(user),
            status: 'checked_in',
          })
          .where(eq(tableBookings.id, booking.id))
          .returning();
        
        return res.json({
          success: true,
          type: 'table',
          message: "Check-in tavolo completato",
          person: {
            firstName: updated.guestName?.split(' ')[0] || '',
            lastName: updated.guestName?.split(' ').slice(1).join(' ') || '',
            type: 'tavolo',
          },
        });
      } else {
        // Find list entry by QR code
        const [entry] = await db.select()
          .from(listEntries)
          .where(eq(listEntries.qrCode, qrCode));
        
        if (!entry) {
          return res.status(404).json({ message: "Ospite non trovato nella lista" });
        }
        
        if (eventId && entry.eventId !== eventId) {
          return res.status(400).json({ message: "QR code non valido per questo evento" });
        }
        
        // Check permissions
        const isGestore = await isGestoreForEvent(user, entry.eventId);
        if (!isGestore) {
          const permResult = await checkScannerPermissionGranular(getUserId(user), entry.eventId, 'lists', entry.listId);
          if (!permResult.allowed) {
            return res.status(403).json({ 
              message: permResult.reason || "Non hai i permessi di scansione liste per questo evento.",
              errorCode: "SCANNER_PERMISSION_DENIED"
            });
          }
        }
        
        if (entry.checkedInAt || entry.status === 'checked_in' || entry.status === 'arrived') {
          return res.status(400).json({ 
            message: "Già entrato",
            alreadyCheckedIn: true,
            checkedInAt: entry.checkedInAt,
          });
        }
        
        // Check in
        const [updated] = await db.update(listEntries)
          .set({
            status: 'checked_in',
            checkedInAt: new Date(),
            checkedInBy: getUserId(user),
            qrScannedAt: new Date(),
            qrScannedByUserId: getUserId(user),
          })
          .where(eq(listEntries.id, entry.id))
          .returning();
        
        return res.json({
          success: true,
          type: 'list',
          message: "Check-in completato",
          person: {
            firstName: updated.firstName || '',
            lastName: updated.lastName || '',
            type: 'lista',
            plusOnes: updated.plusOnes || 0,
          },
        });
      }
    }
    
    // Original E4U format: E4U-{type}-{id}-{random}
    if (parts.length !== 4 || parts[0] !== 'E4U') {
      return res.status(400).json({ message: "Formato codice QR non valido. Formati supportati: E4U-LST-*, E4U-TBL-*, SIAE-TKT-*, SIAE-SUB-*, RES-*, GL_*, TB_*" });
    }
    
    const type = parts[1]; // LST or TBL
    
    if (type === 'LST') {
      // Find list entry by QR code
      const [entry] = await db.select()
        .from(listEntries)
        .where(eq(listEntries.qrCode, qrCode));
      
      if (!entry) {
        return res.status(404).json({ message: "Voce lista non trovata" });
      }
      
      if (eventId && entry.eventId !== eventId) {
        return res.status(400).json({ message: "QR code non valido per questo evento" });
      }
      
      // SECURITY: Verifica permessi scanner per questo evento (con verifica lista specifica)
      // PR semplice NON può accedere senza permesso esplicito di scansione
      const isGestore = await isGestoreForEvent(user, entry.eventId);
      if (!isGestore) {
        const permResult = await checkScannerPermissionGranular(getUserId(user), entry.eventId, 'lists', entry.listId);
        if (!permResult.allowed) {
          return res.status(403).json({ 
            message: permResult.reason || "Non hai i permessi di scansione per questo evento. Contatta l'organizzatore.",
            errorCode: "SCANNER_PERMISSION_DENIED"
          });
        }
      }
      
      if (entry.status === 'checked_in') {
        return res.status(400).json({ 
          message: "Già entrato",
          entry,
          alreadyCheckedIn: true,
        });
      }
      
      // Check in
      const [updated] = await db.update(listEntries)
        .set({
          status: 'checked_in',
          checkedInAt: new Date(),
          checkedInBy: getUserId(user),
        })
        .where(eq(listEntries.id, entry.id))
        .returning();
      
      return res.json({
        type: 'list',
        entry: updated,
        message: "Check-in completato con successo",
      });
    } else if (type === 'TBL') {
      // Find table guest by QR code
      const [guest] = await db.select()
        .from(tableGuests)
        .where(eq(tableGuests.qrCode, qrCode));
      
      if (!guest) {
        return res.status(404).json({ message: "Ospite tavolo non trovato" });
      }
      
      if (eventId && guest.eventId !== eventId) {
        return res.status(400).json({ message: "QR code non valido per questo evento" });
      }
      
      // Get table type from reservation for granular permission check
      let tableTypeId: string | undefined;
      if (guest.reservationId) {
        const [reservation] = await db.select({ tableTypeId: tableReservations.tableTypeId })
          .from(tableReservations)
          .where(eq(tableReservations.id, guest.reservationId));
        tableTypeId = reservation?.tableTypeId;
      }
      
      // SECURITY: Verifica permessi scanner per questo evento (con verifica tipo tavolo)
      // PR semplice NON può accedere senza permesso esplicito di scansione
      const isGestore = await isGestoreForEvent(user, guest.eventId);
      if (!isGestore) {
        const permResult = await checkScannerPermissionGranular(getUserId(user), guest.eventId, 'tables', tableTypeId);
        if (!permResult.allowed) {
          return res.status(403).json({ 
            message: permResult.reason || "Non hai i permessi di scansione per questo evento. Contatta l'organizzatore.",
            errorCode: "SCANNER_PERMISSION_DENIED"
          });
        }
      }
      
      if (guest.status === 'checked_in') {
        return res.status(400).json({ 
          message: "Già entrato",
          guest,
          alreadyCheckedIn: true,
        });
      }
      
      // Check in
      const [updated] = await db.update(tableGuests)
        .set({
          status: 'checked_in',
          checkedInAt: new Date(),
          checkedInBy: getUserId(user),
        })
        .where(eq(tableGuests.id, guest.id))
        .returning();
      
      return res.json({
        type: 'table',
        guest: updated,
        message: "Check-in completato con successo",
      });
    } else {
      return res.status(400).json({ message: "Tipo QR code non riconosciuto" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== STATS API ====================

// GET /api/e4u/events/:eventId/stats - Get event statistics
router.get("/api/e4u/events/:eventId/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Get lists stats
    const lists = await db.select().from(eventLists).where(eq(eventLists.eventId, eventId));
    const listIds = lists.map(l => l.id);
    
    let totalListEntries = 0;
    let checkedInListEntries = 0;
    
    if (listIds.length > 0) {
      for (const listId of listIds) {
        const entries = await db.select().from(listEntries).where(eq(listEntries.listId, listId));
        totalListEntries += entries.length;
        checkedInListEntries += entries.filter(e => e.status === 'checked_in').length;
      }
    }
    
    // Get table stats
    const types = await db.select().from(tableTypes).where(eq(tableTypes.eventId, eventId));
    const reservations = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.eventId, eventId));
    
    const approvedReservations = reservations.filter(r => r.status === 'approved');
    const pendingReservations = reservations.filter(r => r.status === 'pending');
    
    let totalTableGuests = 0;
    let checkedInTableGuests = 0;
    
    for (const reservation of reservations) {
      const guests = await db.select()
        .from(tableGuests)
        .where(eq(tableGuests.reservationId, reservation.id));
      totalTableGuests += guests.length;
      checkedInTableGuests += guests.filter(g => g.status === 'checked_in').length;
    }
    
    // Get staff and PR counts
    const staffCount = await db.select()
      .from(e4uStaffAssignments)
      .where(eq(e4uStaffAssignments.eventId, eventId));
    
    const prCount = await db.select()
      .from(eventPrAssignments)
      .where(eq(eventPrAssignments.eventId, eventId));
    
    const scannerCount = await db.select()
      .from(eventScanners)
      .where(eq(eventScanners.eventId, eventId));
    
    // Get hourly check-in data for entrance chart
    const hourlyCheckIns: Record<string, number> = {};
    
    // Collect all check-in times from list entries
    for (const listId of listIds) {
      const entries = await db.select().from(listEntries).where(eq(listEntries.listId, listId));
      for (const entry of entries) {
        if (entry.status === 'checked_in' && entry.checkedInAt) {
          const hour = new Date(entry.checkedInAt).getHours().toString().padStart(2, '0') + ':00';
          hourlyCheckIns[hour] = (hourlyCheckIns[hour] || 0) + 1;
        }
      }
    }
    
    // Collect all check-in times from table guests
    for (const reservation of reservations) {
      const guests = await db.select()
        .from(tableGuests)
        .where(eq(tableGuests.reservationId, reservation.id));
      for (const guest of guests) {
        if (guest.status === 'checked_in' && guest.checkedInAt) {
          const hour = new Date(guest.checkedInAt).getHours().toString().padStart(2, '0') + ':00';
          hourlyCheckIns[hour] = (hourlyCheckIns[hour] || 0) + 1;
        }
      }
    }
    
    // Convert to array format for the chart, sorted by hour
    const hourlyData = Object.entries(hourlyCheckIns)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, entries]) => ({ time, entries }));
    
    // Add cumulative data
    let cumulative = 0;
    const entranceFlowData = hourlyData.map(item => {
      cumulative += item.entries;
      return { ...item, cumulative };
    });

    res.json({
      lists: {
        total: lists.length,
        entries: totalListEntries,
        checkedIn: checkedInListEntries,
      },
      tables: {
        tableTypes: types.length,
        totalReservations: reservations.length,
        approvedReservations: approvedReservations.length,
        pendingReservations: pendingReservations.length,
        totalGuests: totalTableGuests,
        checkedInGuests: checkedInTableGuests,
      },
      staff: staffCount.length,
      pr: prCount.length,
      scanners: scannerCount.length,
      totalCheckIns: checkedInListEntries + checkedInTableGuests,
      entranceFlowData,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== EVENT REPORT API ====================

// GET /api/e4u/events/:eventId/report - Get event performance report
router.get("/api/e4u/events/:eventId/report", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Get all lists for event
    const allLists = await db.select()
      .from(eventLists)
      .where(eq(eventLists.eventId, eventId));
    
    // Get all list entries for event
    const allEntries = await db.select()
      .from(listEntries)
      .where(eq(listEntries.eventId, eventId));
    
    // Get all table types for event
    const allTableTypes = await db.select()
      .from(tableTypes)
      .where(eq(tableTypes.eventId, eventId));
    
    // Get all reservations for event
    const allReservations = await db.select()
      .from(tableReservations)
      .where(eq(tableReservations.eventId, eventId));
    
    // Get all table guests for event
    const allTableGuests = await db.select()
      .from(tableGuests)
      .where(eq(tableGuests.eventId, eventId));
    
    // Get staff assignments
    const staffAssignments = await db.select({
      assignment: e4uStaffAssignments,
      user: users,
    })
      .from(e4uStaffAssignments)
      .leftJoin(users, eq(e4uStaffAssignments.userId, users.id))
      .where(eq(e4uStaffAssignments.eventId, eventId));
    
    // Get PR assignments
    const prAssignments = await db.select({
      assignment: eventPrAssignments,
      user: users,
    })
      .from(eventPrAssignments)
      .leftJoin(users, eq(eventPrAssignments.userId, users.id))
      .where(eq(eventPrAssignments.eventId, eventId));
    
    // Calculate totals
    const totalEntries = allEntries.length;
    const checkedInEntries = allEntries.filter(e => e.status === 'checked_in').length;
    const checkedInTableGuests = allTableGuests.filter(g => g.status === 'checked_in').length;
    const totalCheckIns = checkedInEntries + checkedInTableGuests;
    const totalPeopleInLists = allEntries.length + allTableGuests.length;
    const checkInRate = totalPeopleInLists > 0 ? Math.round((totalCheckIns / totalPeopleInLists) * 100) : 0;
    
    // Calculate revenue from lists (entries * list price)
    let listRevenue = 0;
    for (const entry of allEntries) {
      const list = allLists.find(l => l.id === entry.listId);
      if (list && list.price && entry.status === 'checked_in') {
        listRevenue += Number(list.price) || 0;
      }
    }
    
    // Calculate revenue from tables
    let tableRevenue = 0;
    for (const reservation of allReservations.filter(r => r.status === 'approved' || r.status === 'confirmed')) {
      const tableType = allTableTypes.find(t => t.id === reservation.tableTypeId);
      if (tableType && tableType.price) {
        tableRevenue += Number(tableType.price) || 0;
      }
    }
    
    // Staff performance
    const staffPerformance = staffAssignments.map(({ assignment, user }) => {
      const staffUserId = assignment.userId;
      
      // Count lists - eventLists doesn't have createdBy, so we skip this metric
      const staffLists: typeof allLists = [];
      
      // Count entries added by this staff
      const staffEntries = allEntries.filter(e => e.createdBy === staffUserId);
      
      // Get PRs under this staff
      const staffPrs = prAssignments.filter(p => p.assignment.staffUserId === staffUserId);
      const staffPrIds = staffPrs.map(p => p.assignment.userId);
      
      // Count entries added by PRs under this staff
      const prEntries = allEntries.filter(e => staffPrIds.includes(e.createdBy || ''));
      
      // Count tables proposed by this staff or their PRs
      const staffTablesProposed = allReservations.filter(r => 
        r.createdBy === staffUserId || staffPrIds.includes(r.createdBy || '')
      );
      const staffTablesApproved = staffTablesProposed.filter(r => r.status === 'approved' || r.status === 'confirmed');
      
      // Count check-ins for PRs under this staff
      const prCheckIns = allEntries.filter(e => 
        e.status === 'checked_in' && staffPrIds.includes(e.createdBy || '')
      ).length;
      
      return {
        staffId: staffUserId,
        staffName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Sconosciuto',
        listsCreated: staffLists.length,
        entriesAdded: staffEntries.length + prEntries.length,
        tablesProposed: staffTablesProposed.length,
        tablesApproved: staffTablesApproved.length,
        prCheckIns: prCheckIns,
        prCount: staffPrs.length,
      };
    });
    
    // PR performance
    const prPerformance = prAssignments.map(({ assignment, user }) => {
      const prUserId = assignment.userId;
      
      // Find responsible staff
      const responsibleStaff = staffAssignments.find(s => s.assignment.userId === assignment.staffUserId);
      
      // Count entries added by this PR
      const prEntries = allEntries.filter(e => e.createdBy === prUserId);
      
      // Count check-ins from entries added by this PR
      const prCheckIns = prEntries.filter(e => e.status === 'checked_in').length;
      
      // Count tables proposed by this PR
      const prTablesProposed = allReservations.filter(r => r.createdBy === prUserId);
      const prTablesApproved = prTablesProposed.filter(r => r.status === 'approved' || r.status === 'confirmed');
      
      return {
        prId: prUserId,
        prName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Sconosciuto',
        staffId: assignment.staffUserId,
        staffName: responsibleStaff?.user 
          ? `${responsibleStaff.user.firstName || ''} ${responsibleStaff.user.lastName || ''}`.trim() || responsibleStaff.user.email 
          : 'N/D',
        entriesAdded: prEntries.length,
        checkIns: prCheckIns,
        tablesProposed: prTablesProposed.length,
        tablesApproved: prTablesApproved.length,
      };
    });
    
    // Hourly check-ins chart data
    const hourlyCheckIns: Record<string, number> = {};
    for (const entry of allEntries) {
      if (entry.status === 'checked_in' && entry.checkedInAt) {
        const hour = new Date(entry.checkedInAt).getHours();
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
        hourlyCheckIns[hourLabel] = (hourlyCheckIns[hourLabel] || 0) + 1;
      }
    }
    for (const guest of allTableGuests) {
      if (guest.status === 'checked_in' && guest.checkedInAt) {
        const hour = new Date(guest.checkedInAt).getHours();
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
        hourlyCheckIns[hourLabel] = (hourlyCheckIns[hourLabel] || 0) + 1;
      }
    }
    
    // Sort hourly data
    const hourlyChartData = Object.entries(hourlyCheckIns)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, checkIns: count }));
    
    res.json({
      overview: {
        totalCheckIns,
        totalPeopleInLists,
        checkInRate,
        listRevenue,
        tableRevenue,
        totalEntries,
        checkedInEntries,
        checkedInTableGuests,
        totalReservations: allReservations.length,
        approvedReservations: allReservations.filter(r => r.status === 'approved' || r.status === 'confirmed').length,
      },
      staffPerformance,
      prPerformance,
      hourlyCheckIns: hourlyChartData,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== MY EVENTS API (for PR/Staff) ====================

// GET /api/e4u/my-events - Get events the current user is assigned to
router.get("/api/e4u/my-events", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Gestore/SuperAdmin see all company events - redirect to normal events API
    if (user.role === 'super_admin' || user.role === 'gestore') {
      const allEvents = await db.select()
        .from(events)
        .where(eq(events.companyId, user.companyId))
        .orderBy(desc(events.startDatetime));
      return res.json(allEvents.map(e => ({ 
        ...e, 
        assignmentType: 'owner',
        permissions: { 
          canManageLists: true, 
          canManageTables: true, 
          canCreatePr: true, 
          canApproveTables: true,
          canAddToLists: true,
          canProposeTables: true,
        }
      })));
    }
    
    const result: any[] = [];
    
    // For Staff (capo_staff): get their assignments
    const staffAssignments = await db.select({
      eventId: e4uStaffAssignments.eventId,
      canManageLists: e4uStaffAssignments.canManageLists,
      canManageTables: e4uStaffAssignments.canManageTables,
      canCreatePr: e4uStaffAssignments.canCreatePr,
      canApproveTables: e4uStaffAssignments.canApproveTables,
      isActive: e4uStaffAssignments.isActive,
    })
    .from(e4uStaffAssignments)
    .where(and(
      eq(e4uStaffAssignments.userId, getUserId(user)),
      eq(e4uStaffAssignments.isActive, true)
    ));
    
    // Get event details for staff assignments
    for (const assignment of staffAssignments) {
      const [event] = await db.select().from(events).where(eq(events.id, assignment.eventId));
      if (event) {
        result.push({
          ...event,
          assignmentType: 'staff',
          permissions: {
            canManageLists: assignment.canManageLists,
            canManageTables: assignment.canManageTables,
            canCreatePr: assignment.canCreatePr,
            canApproveTables: assignment.canApproveTables,
            canAddToLists: assignment.canManageLists,
            canProposeTables: assignment.canManageTables,
          }
        });
      }
    }
    
    // For PR: get their assignments
    // Check for PR session first (PR Wallet login), then fall back to user-linked prProfile
    const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
    const userId = getUserId(user);
    
    // Find user's prProfile (if any) to match both legacy userId and new prProfileId
    let userPrProfileId = sessionPrProfileId;
    if (!userPrProfileId && userId) {
      const userPrProfile = await db.select({ id: prProfiles.id })
        .from(prProfiles)
        .where(eq(prProfiles.userId, userId))
        .limit(1);
      userPrProfileId = userPrProfile[0]?.id;
    }
    
    // Build query conditions - check both legacy userId and new prProfileId
    let prConditions;
    if (userPrProfileId && userId) {
      prConditions = and(
        or(
          eq(eventPrAssignments.userId, userId),
          eq(eventPrAssignments.prProfileId, userPrProfileId)
        ),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (userPrProfileId) {
      prConditions = and(
        eq(eventPrAssignments.prProfileId, userPrProfileId),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (userId) {
      prConditions = and(
        eq(eventPrAssignments.userId, userId),
        eq(eventPrAssignments.isActive, true)
      );
    }
    
    const prAssignments = prConditions ? await db.select({
      eventId: eventPrAssignments.eventId,
      canAddToLists: eventPrAssignments.canAddToLists,
      canProposeTables: eventPrAssignments.canProposeTables,
      staffUserId: eventPrAssignments.staffUserId,
      isActive: eventPrAssignments.isActive,
    })
    .from(eventPrAssignments)
    .where(prConditions) : [];
    
    // Get event details for PR assignments (avoid duplicates)
    const addedEventIds = new Set(result.map(r => r.id));
    for (const assignment of prAssignments) {
      if (!addedEventIds.has(assignment.eventId)) {
        const [event] = await db.select().from(events).where(eq(events.id, assignment.eventId));
        if (event) {
          result.push({
            ...event,
            assignmentType: 'pr',
            permissions: {
              canManageLists: false,
              canManageTables: false,
              canCreatePr: false,
              canApproveTables: false,
              canAddToLists: assignment.canAddToLists,
              canProposeTables: assignment.canProposeTables,
            },
            staffUserId: assignment.staffUserId,
          });
        }
      }
    }
    
    // For Scanner: get their assignments
    const scannerAssignments = await db.select({
      eventId: eventScanners.eventId,
      canScanLists: eventScanners.canScanLists,
      canScanTables: eventScanners.canScanTables,
      canScanTickets: eventScanners.canScanTickets,
      isActive: eventScanners.isActive,
    })
    .from(eventScanners)
    .where(and(
      eq(eventScanners.userId, getUserId(user)),
      eq(eventScanners.isActive, true)
    ));
    
    // Get event details for scanner assignments (avoid duplicates)
    for (const assignment of scannerAssignments) {
      if (!addedEventIds.has(assignment.eventId)) {
        const [event] = await db.select().from(events).where(eq(events.id, assignment.eventId));
        if (event) {
          result.push({
            ...event,
            assignmentType: 'scanner',
            permissions: {
              canScanLists: assignment.canScanLists,
              canScanTables: assignment.canScanTables,
              canScanTickets: assignment.canScanTickets,
            }
          });
          addedEventIds.add(assignment.eventId);
        }
      }
    }
    
    // Sort by event date
    result.sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime());
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/e4u/my-stats - Get personal stats for current user
router.get("/api/e4u/my-stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Count entries created by this user
    const entriesCreated = await db.select({ count: sql<number>`count(*)::int` })
      .from(listEntries)
      .where(eq(listEntries.createdBy, getUserId(user)));
    
    // Count check-ins (entries where user scanned)
    const checkIns = await db.select({ count: sql<number>`count(*)::int` })
      .from(listEntries)
      .where(and(
        eq(listEntries.checkedInBy, getUserId(user)),
        eq(listEntries.status, 'checked_in')
      ));
    
    // Count tables proposed
    const tablesProposed = await db.select({ count: sql<number>`count(*)::int` })
      .from(tableReservations)
      .where(eq(tableReservations.createdBy, getUserId(user)));
    
    // Count active events assigned
    const staffEvents = await db.select({ count: sql<number>`count(*)::int` })
      .from(e4uStaffAssignments)
      .where(and(eq(e4uStaffAssignments.userId, getUserId(user)), eq(e4uStaffAssignments.isActive, true)));
    
    // Count PR events (support both legacy userId, new prProfileId, and session prProfileId)
    const sessionPrProfileId = (req as any).prProfileId || (req.session as any)?.prProfile?.id;
    const currentUserId = getUserId(user);
    
    let statsUserPrProfileId = sessionPrProfileId;
    if (!statsUserPrProfileId && currentUserId) {
      const userPrProfile = await db.select({ id: prProfiles.id })
        .from(prProfiles)
        .where(eq(prProfiles.userId, currentUserId))
        .limit(1);
      statsUserPrProfileId = userPrProfile[0]?.id;
    }
    
    let prConditions;
    if (statsUserPrProfileId && currentUserId) {
      prConditions = and(
        or(
          eq(eventPrAssignments.userId, currentUserId),
          eq(eventPrAssignments.prProfileId, statsUserPrProfileId)
        ),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (statsUserPrProfileId) {
      prConditions = and(
        eq(eventPrAssignments.prProfileId, statsUserPrProfileId),
        eq(eventPrAssignments.isActive, true)
      );
    } else if (currentUserId) {
      prConditions = and(
        eq(eventPrAssignments.userId, currentUserId),
        eq(eventPrAssignments.isActive, true)
      );
    }
    
    const prEvents = prConditions 
      ? await db.select({ count: sql<number>`count(*)::int` })
          .from(eventPrAssignments)
          .where(prConditions)
      : [{ count: 0 }];
    
    res.json({
      entriesCreated: entriesCreated[0]?.count || 0,
      checkIns: checkIns[0]?.count || 0,
      tablesProposed: tablesProposed[0]?.count || 0,
      activeEvents: (staffEvents[0]?.count || 0) + (prEvents[0]?.count || 0),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== CLIENT WALLET API ====================

// GET /api/e4u/wallet/my - Get current user's list entries and table guests
router.get("/api/e4u/wallet/my", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Get all list entries for the user (by clientUserId or by phone)
    const userListEntries = await db.select({
      entry: listEntries,
      list: eventLists,
      event: events,
    })
      .from(listEntries)
      .innerJoin(eventLists, eq(listEntries.listId, eventLists.id))
      .innerJoin(events, eq(listEntries.eventId, events.id))
      .where(
        user.phone
          ? sql`(${listEntries.clientUserId} = ${getUserId(user)} OR ${listEntries.phone} = ${user.phone})`
          : eq(listEntries.clientUserId, getUserId(user))
      )
      .orderBy(desc(events.startDatetime));
    
    // Get all table guests for the user (by clientUserId or by phone)
    const userTableGuests = await db.select({
      guest: tableGuests,
      reservation: tableReservations,
      tableType: tableTypes,
      event: events,
    })
      .from(tableGuests)
      .innerJoin(tableReservations, eq(tableGuests.reservationId, tableReservations.id))
      .innerJoin(tableTypes, eq(tableReservations.tableTypeId, tableTypes.id))
      .innerJoin(events, eq(tableGuests.eventId, events.id))
      .where(
        user.phone
          ? sql`(${tableGuests.clientUserId} = ${getUserId(user)} OR ${tableGuests.phone} = ${user.phone})`
          : eq(tableGuests.clientUserId, getUserId(user))
      )
      .orderBy(desc(events.startDatetime));
    
    res.json({
      listEntries: userListEntries,
      tableGuests: userTableGuests,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SIAE SUBSCRIPTIONS API ====================

// GET /api/siae/ticketed-events/:id/subscriptions - Get issued subscriptions for a ticketed event
router.get("/api/siae/ticketed-events/:id/subscriptions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subscriptions = await db.select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.ticketedEventId, id))
      .orderBy(desc(siaeSubscriptions.createdAt));
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SIAE CANCELLATION ENDPOINTS ====================

// GET /api/siae/cancellation-reasons - Get all SIAE cancellation reasons
router.get("/api/siae/cancellation-reasons", requireAuth, async (req: Request, res: Response) => {
  try {
    const reasons = await db.select()
      .from(siaeCancellationReasons)
      .where(eq(siaeCancellationReasons.active, true))
      .orderBy(siaeCancellationReasons.code);
    res.json(reasons);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/siae/tickets/:id/cancel - Cancel a ticket with optional Stripe refund
router.post("/api/siae/tickets/:id/cancel", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const { reasonCode, reasonNote, requestRefund } = req.body;

    // Validate request body
    if (!reasonCode) {
      return res.status(400).json({ message: "Codice causale annullamento obbligatorio" });
    }

    // Find ticket by ID
    const [ticket] = await db.select()
      .from(siaeTickets)
      .where(eq(siaeTickets.id, id));

    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }

    // Get the ticketed event to check company ownership
    const [ticketedEvent] = await db.select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, ticket.ticketedEventId));

    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento associato non trovato" });
    }

    // Company scope check
    if (ticketedEvent.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a modificare questo biglietto" });
    }

    // Validate ticket status
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ message: "Biglietto già annullato" });
    }
    if (ticket.status === 'used') {
      return res.status(400).json({ message: "Impossibile annullare un biglietto già utilizzato" });
    }
    if (ticket.status !== 'valid') {
      return res.status(400).json({ message: `Stato biglietto non valido per annullamento: ${ticket.status}` });
    }

    let stripeRefundId: string | null = null;
    let refundedAt: Date | null = null;
    let refundAmount: string | null = null;

    // If refund requested, process Stripe refund
    if (requestRefund) {
      // Find the transaction to get payment reference
      let paymentIntentId: string | null = null;

      if (ticket.transactionId) {
        // Get payment intent from transaction
        const [transaction] = await db.select()
          .from(siaeTransactions)
          .where(eq(siaeTransactions.id, ticket.transactionId));

        if (transaction?.paymentReference) {
          paymentIntentId = transaction.paymentReference;
        }
      }

      // Fallback: try to find checkout session with this ticket
      if (!paymentIntentId) {
        // Try to find checkout session through customer
        if (ticket.customerId) {
          const [checkoutSession] = await db.select()
            .from(publicCheckoutSessions)
            .where(
              and(
                eq(publicCheckoutSessions.customerId, ticket.customerId),
                eq(publicCheckoutSessions.status, "completed")
              )
            )
            .orderBy(desc(publicCheckoutSessions.createdAt))
            .limit(1);

          if (checkoutSession?.stripePaymentIntentId) {
            paymentIntentId = checkoutSession.stripePaymentIntentId;
          }
        }
      }

      if (!paymentIntentId) {
        return res.status(400).json({ 
          message: "Impossibile elaborare il rimborso: nessun pagamento Stripe trovato per questo biglietto" 
        });
      }

      try {
        const stripe = await getUncachableStripeClient();
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(parseFloat(ticket.grossAmount) * 100), // Amount in cents
          reason: 'requested_by_customer',
          metadata: {
            ticketId: ticket.id,
            reasonCode: reasonCode,
            reasonNote: reasonNote || '',
            cancelledBy: getUserId(user),
          }
        });

        stripeRefundId = refund.id;
        refundedAt = new Date();
        refundAmount = ticket.grossAmount;

        console.log(`[SIAE] Refund created for ticket ${id}: ${refund.id}, status: ${refund.status}`);
      } catch (stripeError: any) {
        console.error(`[SIAE] Stripe refund failed for ticket ${id}:`, stripeError.message);
        
        // Translate common Stripe error messages to Italian
        let userMessage = stripeError.message;
        if (stripeError.message?.includes('already been refunded')) {
          userMessage = "Questo pagamento è già stato rimborsato in precedenza.";
        } else if (stripeError.message?.includes('insufficient funds')) {
          userMessage = "Fondi insufficienti per elaborare il rimborso.";
        } else if (stripeError.message?.includes('charge_already_refunded')) {
          userMessage = "Questo pagamento è già stato rimborsato in precedenza.";
        } else if (stripeError.message?.includes('No such payment_intent')) {
          userMessage = "Pagamento non trovato. Potrebbe essere stato già rimborsato o non esiste.";
        }
        
        return res.status(400).json({ 
          message: userMessage,
          code: "STRIPE_REFUND_FAILED"
        });
      }
    }

    // Update ticket with cancellation details
    const [updatedTicket] = await db.update(siaeTickets)
      .set({
        status: 'cancelled',
        cancellationReasonCode: reasonCode,
        cancellationDate: new Date(),
        cancelledByUserId: getUserId(user),
        ...(stripeRefundId && {
          stripeRefundId,
          refundedAt,
          refundAmount,
          refundInitiatorId: getUserId(user),
          refundReason: reasonNote || `Annullamento con causale ${reasonCode}`,
        }),
        updatedAt: new Date(),
      })
      .where(eq(siaeTickets.id, id))
      .returning();

    res.json({
      success: true,
      ticket: updatedTicket,
      refunded: !!stripeRefundId,
      refundId: stripeRefundId,
    });
  } catch (error: any) {
    console.error(`[SIAE] Error cancelling ticket:`, error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/siae/subscriptions/:id/cancel - Cancel a subscription with optional Stripe refund
router.post("/api/siae/subscriptions/:id/cancel", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const { reasonCode, reasonNote, requestRefund } = req.body;

    // Validate request body
    if (!reasonCode) {
      return res.status(400).json({ message: "Codice causale annullamento obbligatorio" });
    }

    // Find subscription by ID
    const [subscription] = await db.select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.id, id));

    if (!subscription) {
      return res.status(404).json({ message: "Abbonamento non trovato" });
    }

    // Company scope check
    if (subscription.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a modificare questo abbonamento" });
    }

    // Validate subscription status
    if (subscription.status === 'cancelled') {
      return res.status(400).json({ message: "Abbonamento già annullato" });
    }
    if (subscription.status !== 'active') {
      return res.status(400).json({ message: `Stato abbonamento non valido per annullamento: ${subscription.status}` });
    }

    // Check if subscription has been used (scanned)
    if (subscription.eventsUsed && subscription.eventsUsed > 0) {
      return res.status(400).json({ 
        message: `Impossibile annullare: l'abbonamento è già stato utilizzato per ${subscription.eventsUsed} evento/i. Gli abbonamenti già scansionati non possono essere annullati.` 
      });
    }

    let refundId: string | null = null;
    let refundStatus: string | null = null;

    // If refund requested, process Stripe refund
    if (requestRefund) {
      // Try to find checkout session for this subscription
      let paymentIntentId: string | null = null;

      if (subscription.customerId) {
        const [checkoutSession] = await db.select()
          .from(publicCheckoutSessions)
          .where(
            and(
              eq(publicCheckoutSessions.customerId, subscription.customerId),
              eq(publicCheckoutSessions.status, "completed")
            )
          )
          .orderBy(desc(publicCheckoutSessions.createdAt))
          .limit(1);

        if (checkoutSession?.stripePaymentIntentId) {
          paymentIntentId = checkoutSession.stripePaymentIntentId;
        }
      }

      if (!paymentIntentId) {
        return res.status(400).json({ 
          message: "Impossibile elaborare il rimborso: nessun pagamento Stripe trovato per questo abbonamento" 
        });
      }

      try {
        const stripe = await getUncachableStripeClient();
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(parseFloat(subscription.totalAmount) * 100), // Amount in cents
          reason: 'requested_by_customer',
          metadata: {
            subscriptionId: subscription.id,
            reasonCode: reasonCode,
            reasonNote: reasonNote || '',
            cancelledBy: getUserId(user),
          }
        });

        refundId = refund.id;
        refundStatus = refund.status;

        console.log(`[SIAE] Refund created for subscription ${id}: ${refund.id}, status: ${refund.status}`);
      } catch (stripeError: any) {
        console.error(`[SIAE] Stripe refund failed for subscription ${id}:`, stripeError.message);
        
        // Translate common Stripe error messages to Italian
        let userMessage = stripeError.message;
        if (stripeError.message?.includes('already been refunded')) {
          userMessage = "Questo pagamento è già stato rimborsato in precedenza.";
        } else if (stripeError.message?.includes('insufficient funds')) {
          userMessage = "Fondi insufficienti per elaborare il rimborso.";
        } else if (stripeError.message?.includes('charge_already_refunded')) {
          userMessage = "Questo pagamento è già stato rimborsato in precedenza.";
        } else if (stripeError.message?.includes('No such payment_intent')) {
          userMessage = "Pagamento non trovato. Potrebbe essere stato già rimborsato o non esiste.";
        }
        
        return res.status(400).json({ 
          message: userMessage,
          code: "STRIPE_REFUND_FAILED"
        });
      }
    }

    // Update subscription with cancellation details
    const [updatedSubscription] = await db.update(siaeSubscriptions)
      .set({
        status: 'cancelled',
        cancellationReasonCode: reasonCode,
        cancellationDate: new Date(),
        cancelledByUserId: getUserId(user),
        refundRequested: requestRefund || false,
        ...(refundId && {
          refundId,
          refundStatus,
        }),
        updatedAt: new Date(),
      })
      .where(eq(siaeSubscriptions.id, id))
      .returning();

    res.json({
      success: true,
      subscription: updatedSubscription,
      refunded: !!refundId,
      refundId: refundId,
    });
  } catch (error: any) {
    console.error(`[SIAE] Error cancelling subscription:`, error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
