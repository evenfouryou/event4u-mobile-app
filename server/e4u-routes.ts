// Event Four You (E4U) Module API Routes
import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import {
  eventLists,
  listEntries,
  tableTypes,
  tableReservations,
  tableGuests,
  e4uStaffAssignments,
  eventPrAssignments,
  eventScanners,
  events,
  users,
  insertEventListSchema,
  insertListEntrySchema,
  insertTableTypeSchema,
  insertTableReservationSchema,
  insertTableGuestSchema,
  insertE4uStaffAssignmentSchema,
  insertEventPrAssignmentSchema,
  insertEventScannerSchema,
} from "@shared/schema";

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

// Generate QR code in format: E4U-{type}-{id}-{random}
function generateQrCode(type: 'LST' | 'TBL', id: string): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `E4U-${type}-${id.substring(0, 8)}-${random}`;
}

// ==================== Authentication Middleware ====================

function requireAuth(req: Request, res: Response, next: NextFunction) {
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
async function checkListPermission(userId: string, eventId: string, action: 'manage' | 'add'): Promise<boolean> {
  // For staff: check e4uStaffAssignments
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
  
  // For PR: check eventPrAssignments
  if (action === 'add') {
    const [prAssignment] = await db.select()
      .from(eventPrAssignments)
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.userId, userId),
        eq(eventPrAssignments.isActive, true)
      ));
    
    if (prAssignment && prAssignment.canAddToLists) {
      return true;
    }
  }
  
  return false;
}

// Check if user has table management permission for event
async function checkTablePermission(userId: string, eventId: string, action: 'manage' | 'propose' | 'approve'): Promise<boolean> {
  // For staff
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
  
  // For PR: only can propose
  if (action === 'propose') {
    const [prAssignment] = await db.select()
      .from(eventPrAssignments)
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.userId, userId),
        eq(eventPrAssignments.isActive, true)
      ));
    
    if (prAssignment && prAssignment.canProposeTables) {
      return true;
    }
  }
  
  return false;
}

// Check if user has scanner permission for event
async function checkScannerPermission(userId: string, eventId: string, scanType: 'lists' | 'tables' | 'tickets'): Promise<boolean> {
  const [scanner] = await db.select()
    .from(eventScanners)
    .where(and(
      eq(eventScanners.eventId, eventId),
      eq(eventScanners.userId, userId),
      eq(eventScanners.isActive, true)
    ));
  
  if (!scanner) return false;
  
  switch (scanType) {
    case 'lists': return scanner.canScanLists;
    case 'tables': return scanner.canScanTables;
    case 'tickets': return scanner.canScanTickets;
    default: return false;
  }
}

// Check if user is gestore/super_admin or has event assignment
async function checkEventAccess(user: any, eventId: string): Promise<boolean> {
  // Super admins and gestores have full access to their company's events
  if (user.role === 'super_admin' || user.role === 'gestore') {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    return event && event.companyId === user.companyId;
  }
  
  // Check if user has any assignment to this event
  const [staffAssignment] = await db.select()
    .from(e4uStaffAssignments)
    .where(and(eq(e4uStaffAssignments.eventId, eventId), eq(e4uStaffAssignments.userId, user.id)));
  if (staffAssignment) return true;
  
  const [prAssignment] = await db.select()
    .from(eventPrAssignments)
    .where(and(eq(eventPrAssignments.eventId, eventId), eq(eventPrAssignments.userId, user.id)));
  if (prAssignment) return true;
  
  const [scannerAssignment] = await db.select()
    .from(eventScanners)
    .where(and(eq(eventScanners.eventId, eventId), eq(eventScanners.userId, user.id)));
  if (scannerAssignment) return true;
  
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
    const hasListPermission = await checkListPermission(user.id, eventId, 'manage');
    
    if (!isGestore && !hasListPermission) {
      return res.status(403).json({ message: "Non hai i permessi per creare liste per questo evento" });
    }
    
    const data = insertEventListSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
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
      const hasPermission = await checkListPermission(user.id, list.eventId, 'add');
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
      createdBy: user.id,
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
      const hasPermission = await checkListPermission(user.id, entry.eventId, 'manage');
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
      const hasPermission = await checkListPermission(user.id, entry.eventId, 'manage');
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
      const canScan = await checkScannerPermission(user.id, entry.eventId, 'lists');
      if (!canScan) {
        return res.status(403).json({ message: "Non hai i permessi per fare check-in su questa lista" });
      }
    }
    
    const [updated] = await db.update(listEntries)
      .set({
        status: 'checked_in',
        checkedInAt: new Date(),
        checkedInBy: user.id,
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
      const hasPermission = await checkTablePermission(user.id, eventId, 'manage');
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
      const hasPermission = await checkTablePermission(user.id, tableType.eventId, 'manage');
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
      const hasPermission = await checkTablePermission(user.id, tableType.eventId, 'manage');
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
      const canManage = await checkTablePermission(user.id, eventId, 'manage');
      const canPropose = await checkTablePermission(user.id, eventId, 'propose');
      if (!canManage && !canPropose) {
        return res.status(403).json({ message: "Non hai i permessi per creare prenotazioni tavoli" });
      }
    }
    
    const data = insertTableReservationSchema.parse({
      ...req.body,
      eventId,
      companyId: event.companyId,
      createdBy: user.id,
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
      const canApprove = await checkTablePermission(user.id, reservation.eventId, 'approve');
      if (!canApprove) {
        return res.status(403).json({ message: "Non hai i permessi per approvare prenotazioni" });
      }
    }
    
    const [updated] = await db.update(tableReservations)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: user.id,
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
      const canApprove = await checkTablePermission(user.id, reservation.eventId, 'approve');
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
        checkedInBy: user.id,
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
      staffUserId: user.role === 'capo_staff' ? user.id : req.body.staffUserId,
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
    const sanitizedSectorIds = [...new Set(
      rawSectorIds
        .filter((id: unknown) => id && typeof id === 'string')
        .map((id: string) => id.trim())
    )];
    
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
    
    const [deleted] = await db.delete(eventScanners)
      .where(eq(eventScanners.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Scanner non trovato" });
    }
    res.json({ message: "Scanner rimosso dall'evento" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/e4u/scan - Scan QR code (for lists/tables)
// SECURITY: Verifica permessi scanner per ogni operazione
router.post("/api/e4u/scan", requireAuth, async (req: Request, res: Response) => {
  try {
    const { qrCode, eventId } = req.body;
    const user = req.user as any;
    
    if (!qrCode) {
      return res.status(400).json({ message: "Codice QR mancante" });
    }
    
    // Parse QR code format: E4U-{type}-{id}-{random}
    const parts = qrCode.split('-');
    if (parts.length !== 4 || parts[0] !== 'E4U') {
      return res.status(400).json({ message: "Formato codice QR non valido" });
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
      
      // SECURITY: Verifica permessi scanner per questo evento
      // PR semplice NON può accedere senza permesso esplicito di scansione
      const isGestore = await isGestoreForEvent(user, entry.eventId);
      if (!isGestore) {
        const canScan = await checkScannerPermission(user.id, entry.eventId, 'lists');
        if (!canScan) {
          return res.status(403).json({ 
            message: "Non hai i permessi di scansione per questo evento. Contatta l'organizzatore.",
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
          checkedInBy: user.id,
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
      
      // SECURITY: Verifica permessi scanner per questo evento
      // PR semplice NON può accedere senza permesso esplicito di scansione
      const isGestore = await isGestoreForEvent(user, guest.eventId);
      if (!isGestore) {
        const canScan = await checkScannerPermission(user.id, guest.eventId, 'tables');
        if (!canScan) {
          return res.status(403).json({ 
            message: "Non hai i permessi di scansione per questo evento. Contatta l'organizzatore.",
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
          checkedInBy: user.id,
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
      eq(e4uStaffAssignments.userId, user.id),
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
    const prAssignments = await db.select({
      eventId: eventPrAssignments.eventId,
      canAddToLists: eventPrAssignments.canAddToLists,
      canProposeTables: eventPrAssignments.canProposeTables,
      staffUserId: eventPrAssignments.staffUserId,
      isActive: eventPrAssignments.isActive,
    })
    .from(eventPrAssignments)
    .where(and(
      eq(eventPrAssignments.userId, user.id),
      eq(eventPrAssignments.isActive, true)
    ));
    
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
      eq(eventScanners.userId, user.id),
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
      .where(eq(listEntries.createdBy, user.id));
    
    // Count check-ins (entries where user scanned)
    const checkIns = await db.select({ count: sql<number>`count(*)::int` })
      .from(listEntries)
      .where(and(
        eq(listEntries.checkedInBy, user.id),
        eq(listEntries.status, 'checked_in')
      ));
    
    // Count tables proposed
    const tablesProposed = await db.select({ count: sql<number>`count(*)::int` })
      .from(tableReservations)
      .where(eq(tableReservations.createdBy, user.id));
    
    // Count active events assigned
    const staffEvents = await db.select({ count: sql<number>`count(*)::int` })
      .from(e4uStaffAssignments)
      .where(and(eq(e4uStaffAssignments.userId, user.id), eq(e4uStaffAssignments.isActive, true)));
    
    const prEvents = await db.select({ count: sql<number>`count(*)::int` })
      .from(eventPrAssignments)
      .where(and(eq(eventPrAssignments.userId, user.id), eq(eventPrAssignments.isActive, true)));
    
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
          ? sql`(${listEntries.clientUserId} = ${user.id} OR ${listEntries.phone} = ${user.phone})`
          : eq(listEntries.clientUserId, user.id)
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
          ? sql`(${tableGuests.clientUserId} = ${user.id} OR ${tableGuests.phone} = ${user.phone})`
          : eq(tableGuests.clientUserId, user.id)
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

export default router;
