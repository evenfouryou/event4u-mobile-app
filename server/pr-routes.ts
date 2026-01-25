// PR Module API Routes - Gestione Liste, Tavoli, QR
import { Router, Request, Response, NextFunction } from "express";
import { prStorage } from "./pr-storage";
import { storage } from "./storage";
import { db } from "./db";
import {
  insertEventStaffAssignmentSchema,
  insertEventFloorplanSchema,
  insertEventTableSchema,
  insertTableBookingSchema,
  insertEventListSchema,
  insertListEntrySchema,
  siaeCustomers,
  eventPrAssignments,
  prListAssignments,
  listEntries,
  users,
  events,
  prProfiles,
  companies,
  eventStaffAssignments,
} from "@shared/schema";
import { z } from "zod";
import { like, or, eq, and, desc, isNull, inArray, sql } from "drizzle-orm";

const router = Router();

// Helper function to resolve PR identity from session and/or passport user
// Returns { userId, prProfileId } for use in eventPrAssignments queries
// Supports both passport login (req.user) and PR session login (/api/pr/login)
async function resolvePrIdentity(req: Request): Promise<{ userId: string | null; prProfileId: string | null }> {
  const user = req.user as any;
  const prSession = (req.session as any)?.prProfile;
  
  let userId: string | null = user?.id || null;
  let prProfileId: string | null = (req as any).prProfileId || prSession?.id || null;
  
  // If we have a userId but no prProfileId, try to find linked prProfile
  if (userId && !prProfileId) {
    const linkedPrProfile = await db.select({ id: prProfiles.id })
      .from(prProfiles)
      .where(eq(prProfiles.userId, userId))
      .limit(1);
    if (linkedPrProfile.length > 0) {
      prProfileId = linkedPrProfile[0].id;
    }
  }
  
  // If we have prProfileId but no userId, try to get userId from prProfile
  if (prProfileId && !userId) {
    const prProfile = await db.select({ userId: prProfiles.userId })
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    if (prProfile.length > 0 && prProfile[0].userId) {
      userId = prProfile[0].userId;
    }
  }
  
  return { userId, prProfileId };
}

// Middleware to check authentication
// FIX 2026-01-25: Accept both passport authentication AND PR session authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check passport authentication (normal login)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check PR session authentication (login via /api/pr/login)
  const prSession = (req.session as any)?.prProfile;
  if (prSession?.id) {
    // Attach prProfileId to request for downstream use
    (req as any).prProfileId = prSession.id;
    return next();
  }
  
  return res.status(401).json({ error: "Non autenticato" });
}

// Middleware to check gestore role (company admin)
function requireGestore(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['gestore', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ error: "Accesso negato. Richiesto ruolo Gestore." });
  }
  next();
}

// Middleware to check capo_staff role
function requireCapoStaff(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['gestore', 'gestore_covisione', 'capo_staff', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ error: "Accesso negato. Richiesto ruolo Capo Staff." });
  }
  next();
}

// Middleware to check PR role
// FIX 2026-01-25: Accept both passport users with PR role AND PR session authentication
function requirePr(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  
  // Allow passport users with appropriate roles
  if (user && ['gestore', 'gestore_covisione', 'capo_staff', 'pr', 'super_admin'].includes(user.role)) {
    return next();
  }
  
  // Allow PR session users (logged in via /api/pr/login)
  const prSession = (req.session as any)?.prProfile;
  if (prSession?.id) {
    return next();
  }
  
  return res.status(403).json({ error: "Accesso negato. Richiesto ruolo PR." });
}

// ==================== Event Staff Assignments ====================

// Get staff assignments for an event
router.get("/api/pr/events/:eventId/staff", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const assignments = await prStorage.getEventStaffAssignmentsByEvent(eventId);
    res.json(assignments);
  } catch (error: any) {
    console.error("Error getting staff assignments:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create staff assignment
router.post("/api/pr/events/:eventId/staff", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const validated = insertEventStaffAssignmentSchema.parse({
      ...req.body,
      eventId,
      assignedByUserId: user.id,
    });
    const assignment = await prStorage.createEventStaffAssignment(validated);
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error creating staff assignment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update staff assignment
router.patch("/api/pr/staff-assignments/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prStorage.updateEventStaffAssignment(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Assegnazione non trovata" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating staff assignment:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete staff assignment
router.delete("/api/pr/staff-assignments/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await prStorage.deleteEventStaffAssignment(id);
    if (!deleted) {
      return res.status(404).json({ error: "Assegnazione non trovata" });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting staff assignment:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Event Floorplans ====================

// Get floorplans for an event
router.get("/api/pr/events/:eventId/floorplans", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const floorplans = await prStorage.getEventFloorplansByEvent(eventId);
    res.json(floorplans);
  } catch (error: any) {
    console.error("Error getting floorplans:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create floorplan
router.post("/api/pr/events/:eventId/floorplans", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const validated = insertEventFloorplanSchema.parse({
      ...req.body,
      eventId,
      companyId: user.companyId,
    });
    const floorplan = await prStorage.createEventFloorplan(validated);
    res.status(201).json(floorplan);
  } catch (error: any) {
    console.error("Error creating floorplan:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update floorplan
router.patch("/api/pr/floorplans/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prStorage.updateEventFloorplan(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Planimetria non trovata" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating floorplan:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete floorplan
router.delete("/api/pr/floorplans/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await prStorage.deleteEventFloorplan(id);
    if (!deleted) {
      return res.status(404).json({ error: "Planimetria non trovata" });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting floorplan:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Event Tables ====================

// Get tables for an event
router.get("/api/pr/events/:eventId/tables", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const tables = await prStorage.getEventTablesByEvent(eventId);
    res.json(tables);
  } catch (error: any) {
    console.error("Error getting tables:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create table
router.post("/api/pr/events/:eventId/tables", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const validated = insertEventTableSchema.parse({
      ...req.body,
      eventId,
      companyId: user.companyId,
    });
    const table = await prStorage.createEventTable(validated);
    res.status(201).json(table);
  } catch (error: any) {
    console.error("Error creating table:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Bulk create tables
router.post("/api/pr/events/:eventId/tables/bulk", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const { tables: tableData } = req.body;
    
    const validated = tableData.map((t: any) => insertEventTableSchema.parse({
      ...t,
      eventId,
      companyId: user.companyId,
    }));
    
    const tables = await prStorage.bulkCreateEventTables(validated);
    res.status(201).json(tables);
  } catch (error: any) {
    console.error("Error bulk creating tables:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update table
router.patch("/api/pr/tables/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prStorage.updateEventTable(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Tavolo non trovato" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table
router.delete("/api/pr/tables/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await prStorage.deleteEventTable(id);
    if (!deleted) {
      return res.status(404).json({ error: "Tavolo non trovato" });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting table:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Table Bookings ====================

// Get bookings for an event
router.get("/api/pr/events/:eventId/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const bookings = await prStorage.getTableBookingsByEvent(eventId);
    res.json(bookings);
  } catch (error: any) {
    console.error("Error getting bookings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my bookings (for PR)
router.get("/api/pr/my-bookings", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const bookings = await prStorage.getTableBookingsByUser(user.id);
    res.json(bookings);
  } catch (error: any) {
    console.error("Error getting my bookings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create booking
router.post("/api/pr/events/:eventId/bookings", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const validated = insertTableBookingSchema.omit({ qrCode: true }).parse({
      ...req.body,
      eventId,
      companyId: user.companyId,
      bookedByUserId: user.id,
    });
    
    // Update table status
    await prStorage.updateEventTable(validated.tableId, { status: 'reserved' });
    
    const booking = await prStorage.createTableBooking(validated);
    res.status(201).json(booking);
  } catch (error: any) {
    console.error("Error creating booking:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update booking
router.patch("/api/pr/bookings/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prStorage.updateTableBooking(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete booking
router.delete("/api/pr/bookings/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get booking to restore table status
    const booking = await prStorage.getTableBooking(id);
    if (booking) {
      await prStorage.updateEventTable(booking.tableId, { status: 'available' });
    }
    
    const deleted = await prStorage.deleteTableBooking(id);
    if (!deleted) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Guest Lists ====================

// Get guest lists for an event
// FIX 2026-01-25: PR vede liste proprie + liste assegnate via prListAssignments
router.get("/api/pr/events/:eventId/guest-lists", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const allLists = await prStorage.getGuestListsByEvent(eventId);
    
    console.log(`[PR-LISTS] User: ${user?.id}, role: ${user?.role}, eventId: ${eventId}`);
    console.log(`[PR-LISTS] Total lists for event: ${allLists.length}`);
    
    // Gestore/Super Admin vedono tutte le liste
    if (user && ['gestore', 'super_admin', 'gestore_covisione'].includes(user.role)) {
      console.log(`[PR-LISTS] Gestore/Admin - returning all ${allLists.length} lists`);
      return res.json(allLists);
    }
    
    // PR/Capo Staff vedono liste proprie + liste assegnate
    // FIX 2026-01-25: Use helper to resolve identity from both passport and PR session
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    console.log(`[PR-LISTS] Resolved identity: userId=${userId}, prProfileId=${prProfileId}`);
    
    // If no identity could be resolved, return empty
    if (!userId && !prProfileId) {
      console.log(`[PR-LISTS] No identity resolved, returning empty`);
      return res.json([]);
    }
    
    // Build predicates array based on available identity
    const prAssignmentPredicates: any[] = [];
    if (userId) {
      prAssignmentPredicates.push(eq(eventPrAssignments.userId, userId));
    }
    if (prProfileId) {
      prAssignmentPredicates.push(eq(eventPrAssignments.prProfileId, prProfileId));
    }
    
    const prAssignments = await db.select()
      .from(eventPrAssignments)
      .where(
        and(
          eq(eventPrAssignments.eventId, eventId),
          eq(eventPrAssignments.isActive, true),
          prAssignmentPredicates.length > 1 ? or(...prAssignmentPredicates) : prAssignmentPredicates[0]
        )
      );
    
    console.log(`[PR-LISTS] Found ${prAssignments.length} PR assignments for this user/event`);
    console.log(`[PR-LISTS] Searching for userId=${userId} OR prProfileId=${prProfileId}`);
    
    // If PR is not assigned to this event, return empty
    if (prAssignments.length === 0) {
      console.log(`[PR-LISTS] PR not assigned to event, returning empty`);
      return res.json([]);
    }
    
    // Check if PR has canAddToLists permission
    const hasListPermission = prAssignments.some(a => a.canAddToLists);
    console.log(`[PR-LISTS] PR has canAddToLists permission: ${hasListPermission}`);
    console.log(`[PR-LISTS] Assignment IDs: ${prAssignments.map(a => a.id).join(', ')}`);
    
    // 3. Get list IDs assigned to those PR assignments
    const prAssignmentIds = prAssignments.map(a => a.id);
    const listAssignments = await db.select()
      .from(prListAssignments)
      .where(inArray(prListAssignments.prAssignmentId, prAssignmentIds));
    const assignedListIds = listAssignments.map(la => la.listId);
    console.log(`[PR-LISTS] Found ${listAssignments.length} specific list assignments, listIds: ${assignedListIds.join(', ')}`);
    
    // 4. Determine which lists to show
    // FIX 2026-01-25: If PR has canAddToLists=true but no specific list assignments,
    // show ALL lists for the event (fallback behavior for easier UX)
    if (hasListPermission && assignedListIds.length === 0) {
      console.log(`[PR-LISTS] PR has canAddToLists but no specific assignments - showing all ${allLists.length} lists`);
      return res.json(allLists);
    }
    
    // Otherwise filter: lists created by user OR specifically assigned
    const userLists = allLists.filter(list => 
      (userId && list.createdByUserId === userId) || assignedListIds.includes(list.id)
    );
    console.log(`[PR-LISTS] Final result: ${userLists.length} lists (created by user or assigned)`);
    res.json(userLists);
  } catch (error: any) {
    console.error("Error getting guest lists:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my guest lists (for PR)
router.get("/api/pr/my-guest-lists", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const lists = await prStorage.getGuestListsByUser(user.id);
    res.json(lists);
  } catch (error: any) {
    console.error("Error getting my guest lists:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create guest list
router.post("/api/pr/events/:eventId/guest-lists", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const validated = insertEventListSchema.parse({
      ...req.body,
      eventId,
      companyId: user.companyId,
      createdByUserId: user.id,
    });
    const list = await prStorage.createGuestList(validated);
    res.status(201).json(list);
  } catch (error: any) {
    console.error("Error creating guest list:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update guest list
// FIX 2026-01-22: Controllo ownership - PR può modificare solo le proprie liste
router.patch("/api/pr/guest-lists/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Verifica ownership (Gestore può modificare tutte, PR solo le proprie)
    const list = await prStorage.getGuestList(id);
    if (!list) {
      return res.status(404).json({ error: "Lista non trovata" });
    }
    
    if (!['gestore', 'super_admin', 'gestore_covisione'].includes(user.role) && list.createdByUserId !== user.id) {
      return res.status(403).json({ error: "Non puoi modificare liste di altri PR" });
    }
    
    const updated = await prStorage.updateGuestList(id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating guest list:", error);
    res.status(500).json({ error: error.message });
  }
});

// Close guest list
router.post("/api/pr/guest-lists/:id/close", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const closed = await prStorage.closeGuestList(id);
    if (!closed) {
      return res.status(404).json({ error: "Lista non trovata" });
    }
    res.json(closed);
  } catch (error: any) {
    console.error("Error closing guest list:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete guest list
router.delete("/api/pr/guest-lists/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await prStorage.deleteGuestList(id);
    if (!deleted) {
      return res.status(404).json({ error: "Lista non trovata" });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting guest list:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Guest List Entries ====================

// Get entries for a guest list
// FIX 2026-01-25: PR vede tutti gli ospiti se ha creato la lista O se è assegnato ad essa
router.get("/api/pr/guest-lists/:listId/entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const user = req.user as any;
    const allEntries = await prStorage.getGuestListEntriesByList(listId);
    
    // Gestore/Super Admin vedono tutti gli ospiti
    if (user && ['gestore', 'super_admin', 'gestore_covisione'].includes(user.role)) {
      return res.json(allEntries);
    }
    
    // FIX 2026-01-25: Use helper to resolve identity from both passport and PR session
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    // Check if user created the list
    const list = await prStorage.getGuestList(listId);
    if (list && userId && list.createdByUserId === userId) {
      return res.json(allEntries);
    }
    
    // Check if user is assigned to this list via prListAssignments
    if (list && (userId || prProfileId)) {
      // Build predicates array based on available identity
      const prAssignmentPredicates: any[] = [];
      if (userId) {
        prAssignmentPredicates.push(eq(eventPrAssignments.userId, userId));
      }
      if (prProfileId) {
        prAssignmentPredicates.push(eq(eventPrAssignments.prProfileId, prProfileId));
      }
      
      const prAssignments = await db.select()
        .from(eventPrAssignments)
        .where(
          and(
            eq(eventPrAssignments.eventId, list.eventId),
            prAssignmentPredicates.length > 1 ? or(...prAssignmentPredicates) : prAssignmentPredicates[0]
          )
        );
      
      if (prAssignments.length > 0) {
        const prAssignmentIds = prAssignments.map(a => a.id);
        const listAssignments = await db.select()
          .from(prListAssignments)
          .where(
            and(
              inArray(prListAssignments.prAssignmentId, prAssignmentIds),
              eq(prListAssignments.listId, listId)
            )
          );
        
        // If user is assigned to this list, show all entries
        if (listAssignments.length > 0) {
          return res.json(allEntries);
        }
      }
    }
    
    // Otherwise, PR/Capo Staff vedono solo gli ospiti che hanno aggiunto loro
    const userEntries = allEntries.filter(entry => userId && entry.addedByUserId === userId);
    res.json(userEntries);
  } catch (error: any) {
    console.error("Error getting guest list entries:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get entries for an event (all lists)
// FIX 2026-01-22: PR vede solo i propri ospiti, Gestore vede tutti
// FIX 2026-01-25: Use resolvePrIdentity helper for session support
router.get("/api/pr/events/:eventId/guest-entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const allEntries = await prStorage.getGuestListEntriesByEvent(eventId);
    
    // Gestore/Super Admin vedono tutti gli ospiti
    if (user && ['gestore', 'super_admin', 'gestore_covisione'].includes(user.role)) {
      return res.json(allEntries);
    }
    
    // FIX 2026-01-25: Use helper to resolve identity
    const { userId } = await resolvePrIdentity(req);
    
    // PR/Capo Staff vedono solo gli ospiti che hanno aggiunto loro
    const userEntries = allEntries.filter(entry => userId && entry.addedByUserId === userId);
    res.json(userEntries);
  } catch (error: any) {
    console.error("Error getting event guest entries:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create guest list entry
router.post("/api/pr/guest-lists/:listId/entries", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const user = req.user as any;
    
    // Get the list to get eventId
    const list = await prStorage.getGuestList(listId);
    if (!list) {
      return res.status(404).json({ error: "Lista non trovata" });
    }
    
    // Check if list is still open
    if (!list.isActive) {
      return res.status(400).json({ error: "Lista chiusa" });
    }
    
    // Check max guests (maxCapacity in unified schema)
    if (list.maxCapacity && list.currentCount >= list.maxCapacity) {
      return res.status(400).json({ error: "Lista piena" });
    }
    
    // FIX 2026-01-25: Use helper to resolve identity from both passport and PR session
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    // If no identity could be resolved, deny access
    if (!userId && !prProfileId) {
      return res.status(403).json({ 
        error: "Non autorizzato", 
        message: "Identità PR non riconosciuta" 
      });
    }
    
    // Build predicates array based on available identity
    const prAssignmentPredicates: any[] = [];
    if (userId) {
      prAssignmentPredicates.push(eq(eventPrAssignments.userId, userId));
    }
    if (prProfileId) {
      prAssignmentPredicates.push(eq(eventPrAssignments.prProfileId, prProfileId));
    }
    
    const prAssignments = await db.select()
      .from(eventPrAssignments)
      .where(
        and(
          eq(eventPrAssignments.eventId, list.eventId!),
          eq(eventPrAssignments.isActive, true),
          prAssignmentPredicates.length > 1 ? or(...prAssignmentPredicates) : prAssignmentPredicates[0]
        )
      );
    
    // FIX: Verify PR has canAddToLists permission for this event
    const hasListPermission = prAssignments.some(a => a.canAddToLists);
    const isListCreator = userId && list.createdByUserId === userId;
    
    if (!hasListPermission && !isListCreator) {
      return res.status(403).json({ 
        error: "Non autorizzato", 
        message: "Non hai i permessi per aggiungere ospiti a questa lista" 
      });
    }
    
    // Check if specific list assignments exist and verify access
    if (prAssignments.length > 0 && hasListPermission) {
      const prAssignmentIds = prAssignments.map(a => a.id);
      const listAssignments = await db.select()
        .from(prListAssignments)
        .where(inArray(prListAssignments.prAssignmentId, prAssignmentIds));
      
      // If PR has specific list assignments, verify this list is in them
      if (listAssignments.length > 0) {
        const assignedListIds = listAssignments.map(la => la.listId);
        const hasAccessToList = assignedListIds.includes(listId) || isListCreator;
        
        if (!hasAccessToList) {
          return res.status(403).json({ 
            error: "Non autorizzato", 
            message: "Non sei assegnato a questa lista" 
          });
        }
        
        // Check quota for this specific list
        const listQuota = listAssignments.find(la => la.listId === listId);
        if (listQuota && listQuota.quota !== null && userId) {
          const existingEntries = await db.select({ count: sql<number>`count(*)` })
            .from(listEntries)
            .where(
              and(
                eq(listEntries.listId, listId),
                eq(listEntries.addedByUserId, userId)
              )
            );
          
          const currentCount = Number(existingEntries[0]?.count || 0);
          if (currentCount >= listQuota.quota) {
            return res.status(400).json({ 
              error: "Quota raggiunta", 
              message: `Hai raggiunto il limite di ${listQuota.quota} persone per questa lista` 
            });
          }
        }
      }
      // If no specific list assignments, PR can add to any list (fallback behavior)
    }
    
    const validated = insertListEntrySchema.omit({ qrCode: true }).parse({
      ...req.body,
      listId: listId,
      eventId: list.eventId,
      companyId: list.companyId,
      addedByUserId: userId || user?.id, // Use resolved userId or fallback to user.id
    });
    
    const entry = await prStorage.createGuestListEntry(validated);
    res.status(201).json(entry);
  } catch (error: any) {
    console.error("Error creating guest list entry:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update guest list entry
// FIX 2026-01-22: Controllo ownership - PR può modificare solo i propri ospiti
router.patch("/api/pr/guest-entries/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Verifica ownership
    const entry = await prStorage.getGuestListEntry(id);
    if (!entry) {
      return res.status(404).json({ error: "Ospite non trovato" });
    }
    
    if (!['gestore', 'super_admin', 'gestore_covisione'].includes(user.role) && entry.addedByUserId !== user.id) {
      return res.status(403).json({ error: "Non puoi modificare ospiti aggiunti da altri PR" });
    }
    
    const updated = await prStorage.updateGuestListEntry(id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating guest list entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete guest list entry
// FIX 2026-01-22: Controllo ownership - PR può eliminare solo i propri ospiti
router.delete("/api/pr/guest-entries/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Verifica ownership
    const entry = await prStorage.getGuestListEntry(id);
    if (!entry) {
      return res.status(404).json({ error: "Ospite non trovato" });
    }
    
    if (!['gestore', 'super_admin', 'gestore_covisione'].includes(user.role) && entry.addedByUserId !== user.id) {
      return res.status(403).json({ error: "Non puoi eliminare ospiti aggiunti da altri PR" });
    }
    
    const deleted = await prStorage.deleteGuestListEntry(id);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting guest list entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== QR Code Scanning ====================

// Scan QR code (check-in)
router.post("/api/pr/scan-qr", requireAuth, requireCapoStaff, async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.body;
    const user = req.user as any;
    
    if (!qrCode) {
      return res.status(400).json({ error: "QR code richiesto" });
    }
    
    // Try to find as table booking
    const booking = await prStorage.getTableBookingByQr(qrCode);
    if (booking) {
      if (booking.qrScannedAt) {
        return res.status(400).json({ 
          error: "QR già utilizzato",
          type: "booking",
          data: booking 
        });
      }
      
      const updated = await prStorage.markTableBookingScanned(booking.id, user.id);
      return res.json({
        type: "booking",
        message: "Check-in tavolo completato",
        data: updated
      });
    }
    
    // Try to find as guest list entry
    const entry = await prStorage.getGuestListEntryByQr(qrCode);
    if (entry) {
      if (entry.qrScannedAt) {
        return res.status(400).json({ 
          error: "QR già utilizzato",
          type: "guest",
          data: entry 
        });
      }
      
      const updated = await prStorage.markGuestListEntryScanned(entry.id, user.id);
      return res.json({
        type: "guest",
        message: "Check-in ospite completato",
        data: updated
      });
    }
    
    return res.status(404).json({ error: "QR code non valido" });
  } catch (error: any) {
    console.error("Error scanning QR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR OTP Login ====================

// Request OTP for PR phone login
router.post("/api/pr/request-otp", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Numero di telefono richiesto" });
    }
    
    // Find user by phone
    const users = await storage.getAllUsers();
    const prUser = users.find(u => u.phone === phone && u.role === 'pr');
    
    if (!prUser) {
      return res.status(404).json({ error: "Nessun PR trovato con questo numero" });
    }
    
    // Create OTP attempt
    const attempt = await prStorage.createPrOtpAttempt(phone, prUser.id);
    
    // TODO: Send SMS with OTP code
    // For now, log it (in production, use SMS service)
    console.log(`OTP for ${phone}: ${attempt.otpCode}`);
    
    res.json({ 
      message: "OTP inviato",
      expiresAt: attempt.expiresAt
    });
  } catch (error: any) {
    console.error("Error requesting OTP:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP and login
router.post("/api/pr/verify-otp", async (req: Request, res: Response) => {
  try {
    const { phone, otpCode } = req.body;
    
    if (!phone || !otpCode) {
      return res.status(400).json({ error: "Telefono e OTP richiesti" });
    }
    
    // Cleanup expired OTPs
    await prStorage.cleanupExpiredPrOtps();
    
    // Find OTP attempt
    const attempt = await prStorage.getPrOtpAttempt(phone, otpCode);
    
    if (!attempt) {
      return res.status(400).json({ error: "OTP non valido o scaduto" });
    }
    
    // Check if expired
    if (new Date() > new Date(attempt.expiresAt)) {
      return res.status(400).json({ error: "OTP scaduto" });
    }
    
    // Check max attempts (3)
    if (attempt.attemptsCount >= 3) {
      return res.status(400).json({ error: "Troppi tentativi. Richiedi un nuovo OTP." });
    }
    
    // Verify OTP
    if (attempt.otpCode !== otpCode) {
      await prStorage.incrementPrOtpAttempts(attempt.id);
      return res.status(400).json({ error: "OTP non valido" });
    }
    
    // Mark as verified
    await prStorage.markPrOtpVerified(attempt.id);
    
    // Get user and login
    if (attempt.userId) {
      const user = await storage.getUser(attempt.userId);
      if (user) {
        // Update phone verified status
        await storage.updateUser(user.id, { phoneVerified: true });
        
        // Login user (create session)
        req.login(user, (err: any) => {
          if (err) {
            return res.status(500).json({ error: "Errore di login" });
          }
          return res.json({ 
            message: "Login completato",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              companyId: user.companyId
            }
          });
        });
      } else {
        return res.status(404).json({ error: "Utente non trovato" });
      }
    } else {
      return res.status(404).json({ error: "Utente non associato" });
    }
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Stats & Dashboard ====================

// Get PR stats for an event
router.get("/api/pr/events/:eventId/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const [tables, bookings, guestListsData, entries] = await Promise.all([
      prStorage.getEventTablesByEvent(eventId),
      prStorage.getTableBookingsByEvent(eventId),
      prStorage.getGuestListsByEvent(eventId),
      prStorage.getGuestListEntriesByEvent(eventId)
    ]);
    
    const stats = {
      tables: {
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
      },
      bookings: {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        arrived: bookings.filter(b => b.status === 'arrived').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
      },
      guestLists: {
        total: guestListsData.length,
        active: guestListsData.filter(l => l.isActive).length,
        totalCapacity: guestListsData.reduce((sum, l) => sum + (l.maxCapacity || 0), 0),
        currentGuests: guestListsData.reduce((sum, l) => sum + l.currentCount, 0),
      },
      entries: {
        total: entries.length,
        pending: entries.filter(e => e.status === 'pending').length,
        confirmed: entries.filter(e => e.status === 'confirmed').length,
        arrived: entries.filter(e => e.status === 'arrived').length,
        cancelled: entries.filter(e => e.status === 'cancelled').length,
        plusOnesTotal: entries.reduce((sum, e) => sum + e.plusOnes, 0),
      }
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error("Error getting PR stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Customer Search ====================

// Search customer by phone (partial or complete)
router.get("/api/pr/customers/search", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;
    
    if (!phone || typeof phone !== 'string' || phone.length < 3) {
      return res.json({ found: false, customer: null });
    }
    
    // Search for customer by phone (partial match)
    const customers = await db.select({
      id: siaeCustomers.id,
      firstName: siaeCustomers.firstName,
      lastName: siaeCustomers.lastName,
      gender: siaeCustomers.gender,
      phone: siaeCustomers.phone,
      birthDate: siaeCustomers.birthDate,
    })
    .from(siaeCustomers)
    .where(like(siaeCustomers.phone, `%${phone}%`))
    .limit(5);
    
    if (customers.length === 0) {
      return res.json({ found: false, customer: null });
    }
    
    // If exact match exists, prioritize it
    const exactMatch = customers.find(c => c.phone === phone);
    const customer = exactMatch || customers[0];
    
    res.json({
      found: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        gender: customer.gender,
        phone: customer.phone,
        birthDate: customer.birthDate,
      },
      suggestions: customers.length > 1 ? customers : undefined,
    });
  } catch (error: any) {
    console.error("Error searching customer:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create quick customer (for new guest registration)
router.post("/api/pr/customers/quick-create", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { phone, firstName, lastName, gender, birthDate } = req.body;
    
    if (!phone || !firstName || !lastName) {
      return res.status(400).json({ error: "Telefono, nome e cognome richiesti" });
    }
    
    // Check if phone already exists
    const existing = await db.select({ id: siaeCustomers.id })
      .from(siaeCustomers)
      .where(eq(siaeCustomers.phone, phone))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: "Telefono già registrato", customerId: existing[0].id });
    }
    
    // Generate unique code
    const uniqueCode = `PR_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create customer with minimal data
    const [customer] = await db.insert(siaeCustomers).values({
      phone,
      firstName,
      lastName,
      gender: gender || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      email: `${uniqueCode.toLowerCase()}@placeholder.temp`, // Placeholder email
      uniqueCode,
      authenticationType: 'BO', // Back-office registration
      registrationCompleted: false,
      phoneVerified: false,
      emailVerified: false,
    }).returning();
    
    res.status(201).json({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      gender: customer.gender,
      phone: customer.phone,
      birthDate: customer.birthDate,
    });
  } catch (error: any) {
    console.error("Error creating quick customer:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Event PR Assignments ====================

// GET /api/events/:eventId/pr-assignments - List all PRs assigned to an event
router.get("/api/events/:eventId/pr-assignments", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    // Verify event exists and user has access (owns the company)
    const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event.length) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    // Check if user has access to this event's company
    if (user.role !== 'super_admin' && event[0].companyId !== user.companyId) {
      return res.status(403).json({ error: "Accesso negato a questo evento" });
    }
    
    // Fetch all assignments
    const rawAssignments = await db
      .select()
      .from(eventPrAssignments)
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.isActive, true)
      ))
      .orderBy(desc(eventPrAssignments.createdAt));
    
    // Enrich with PR profile or user data
    const enrichedAssignments = await Promise.all(rawAssignments.map(async (assignment) => {
      let prProfile = null;
      
      // Try to get PR profile first (new system - by prProfileId)
      if (assignment.prProfileId) {
        const [profile] = await db.select({
          id: prProfiles.id,
          firstName: prProfiles.firstName,
          lastName: prProfiles.lastName,
          email: prProfiles.email,
          phone: prProfiles.phone,
          prCode: prProfiles.prCode,
          displayName: prProfiles.displayName,
        }).from(prProfiles).where(eq(prProfiles.id, assignment.prProfileId));
        prProfile = profile || null;
      }
      
      // Fallback for legacy records: try multiple strategies
      if (!prProfile && assignment.userId) {
        // Strategy 1: userId might actually be a prProfile ID (old code stored prProfileId in userId)
        const [directProfile] = await db.select({
          id: prProfiles.id,
          firstName: prProfiles.firstName,
          lastName: prProfiles.lastName,
          email: prProfiles.email,
          phone: prProfiles.phone,
          prCode: prProfiles.prCode,
          displayName: prProfiles.displayName,
        }).from(prProfiles).where(eq(prProfiles.id, assignment.userId));
        
        if (directProfile) {
          prProfile = directProfile;
        } else {
          // Strategy 2: Try to find a prProfile linked to this userId
          const [linkedProfile] = await db.select({
            id: prProfiles.id,
            firstName: prProfiles.firstName,
            lastName: prProfiles.lastName,
            email: prProfiles.email,
            phone: prProfiles.phone,
            prCode: prProfiles.prCode,
            displayName: prProfiles.displayName,
          }).from(prProfiles).where(eq(prProfiles.userId, assignment.userId));
          
          if (linkedProfile) {
            prProfile = linkedProfile;
          } else {
            // Strategy 3: Ultimate fallback - get user data directly
            const [userRecord] = await db.select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              phone: users.phone,
            }).from(users).where(eq(users.id, assignment.userId));
            if (userRecord) {
              prProfile = {
                id: userRecord.id,
                firstName: userRecord.firstName,
                lastName: userRecord.lastName,
                email: userRecord.email,
                phone: userRecord.phone,
                prCode: null,
                displayName: null,
              };
            }
          }
        }
      }
      
      return {
        id: assignment.id,
        eventId: assignment.eventId,
        prUserId: assignment.prProfileId || assignment.userId, // For frontend compatibility
        prProfileId: assignment.prProfileId,
        userId: assignment.userId,
        staffUserId: assignment.staffUserId,
        companyId: assignment.companyId,
        canAddToLists: assignment.canAddToLists,
        canProposeTables: assignment.canProposeTables,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt,
        prProfile,
      };
    }));
    
    res.json(enrichedAssignments);
  } catch (error: any) {
    console.error("Error getting PR assignments:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events/:eventId/pr-assignments - Assign a PR profile to an event
router.post("/api/events/:eventId/pr-assignments", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { prUserId, canAddToLists = true, canProposeTables = true } = req.body; // prUserId is prProfileId from frontend
    const user = req.user as any;
    
    if (!prUserId) {
      return res.status(400).json({ error: "prUserId è obbligatorio" });
    }
    
    // Verify event exists and user has access
    const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event.length) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    if (user.role !== 'super_admin' && event[0].companyId !== user.companyId) {
      return res.status(403).json({ error: "Accesso negato a questo evento" });
    }
    
    // Verify PR profile exists and is active
    const prProfile = await db.select().from(prProfiles).where(eq(prProfiles.id, prUserId)).limit(1);
    if (!prProfile.length) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    if (!prProfile[0].isActive) {
      return res.status(400).json({ error: "Il profilo PR selezionato non è attivo" });
    }
    
    // Check if assignment already exists - check both prProfileId and legacy userId
    // Strategy 1: Check new prProfileId column
    let existing = await db
      .select()
      .from(eventPrAssignments)
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.prProfileId, prUserId)
      ))
      .limit(1);
    
    // Strategy 2: Check legacy userId column (old code stored prProfileId in userId)
    if (!existing.length) {
      existing = await db
        .select()
        .from(eventPrAssignments)
        .where(and(
          eq(eventPrAssignments.eventId, eventId),
          eq(eventPrAssignments.userId, prUserId)
        ))
        .limit(1);
    }
    
    if (existing.length > 0) {
      // Reactivate if deactivated
      if (!existing[0].isActive) {
        const [updated] = await db
          .update(eventPrAssignments)
          .set({ 
            isActive: true, 
            prProfileId: prUserId, // Backfill prProfileId for legacy records
            userId: prProfile[0].userId || existing[0].userId || null, // Backfill userId if available
            updatedAt: new Date() 
          })
          .where(eq(eventPrAssignments.id, existing[0].id))
          .returning();
        return res.json(updated);
      }
      return res.status(409).json({ error: "PR già assegnato a questo evento" });
    }
    
    // Create new assignment using prProfileId (new column) and userId if available
    const [assignment] = await db.insert(eventPrAssignments).values({
      eventId,
      prProfileId: prUserId, // Store in the new column
      userId: prProfile[0].userId || null, // Also populate userId if PR has a linked user account
      companyId: event[0].companyId,
      staffUserId: user.id,
      canAddToLists,
      canProposeTables,
      isActive: true,
    }).returning();
    
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error creating PR assignment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:eventId/pr-assignments/:prUserId - Remove PR from event
router.delete("/api/events/:eventId/pr-assignments/:prUserId", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId, prUserId } = req.params; // prUserId is actually prProfileId
    const user = req.user as any;
    
    // Verify event exists and user has access
    const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event.length) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    if (user.role !== 'super_admin' && event[0].companyId !== user.companyId) {
      return res.status(403).json({ error: "Accesso negato a questo evento" });
    }
    
    // Find and soft-delete the assignment (set isActive = false)
    // Try prProfileId first, then fall back to legacy userId
    let deleted = await db
      .update(eventPrAssignments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        eq(eventPrAssignments.prProfileId, prUserId)
      ))
      .returning();
    
    // Fallback to legacy userId if not found by prProfileId
    if (!deleted.length) {
      deleted = await db
        .update(eventPrAssignments)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(eventPrAssignments.eventId, eventId),
          eq(eventPrAssignments.userId, prUserId)
        ))
        .returning();
    }
    
    if (!deleted.length) {
      return res.status(404).json({ error: "Assegnazione non trovata" });
    }
    
    res.status(204).send();
  } catch (error: any) {
    console.error("Error removing PR assignment:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/prs - List all PR profiles for selection (from prProfiles table)
// By default excludes Staff profiles (isStaff=true). Use ?includeStaff=true to include them.
router.get("/api/users/prs", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const includeStaff = req.query.includeStaff === 'true';
    
    console.log(`[PR-LIST] User ${user.id} (role: ${user.role}, company: ${user.companyId}) requesting PR list, includeStaff=${includeStaff}`);
    
    // DEBUG: Get all profiles to understand the data
    const allProfiles = await db.select({
      id: prProfiles.id,
      firstName: prProfiles.firstName,
      lastName: prProfiles.lastName,
      isStaff: prProfiles.isStaff,
      isActive: prProfiles.isActive,
      companyId: prProfiles.companyId,
    }).from(prProfiles);
    console.log(`[PR-LIST] All profiles in DB:`, JSON.stringify(allProfiles, null, 2));
    
    // Get all PR profiles that belong to the same company
    // By default, exclude Staff (isStaff=true) unless includeStaff=true
    // NOTE: isStaff can be NULL for old profiles, treat NULL as false (regular PR)
    // NOTE: We now include inactive PRs to match /api/reservations/pr-profiles behavior
    const whereConditions: any[] = [];
    
    // Always filter by company (use user.companyId for all roles including super_admin)
    whereConditions.push(eq(prProfiles.companyId, user.companyId));
    
    // Align with /api/reservations/pr-profiles: no isActive or isStaff filter
    // Just filter by companyId to match Gestione PR behavior
    const prProfilesList = await db
      .select({
        id: prProfiles.id,
        firstName: prProfiles.firstName,
        lastName: prProfiles.lastName,
        email: prProfiles.email,
        phone: prProfiles.phone,
        prCode: prProfiles.prCode,
        displayName: prProfiles.displayName,
        isStaff: prProfiles.isStaff,
        isActive: prProfiles.isActive,
      })
      .from(prProfiles)
      .where(and(...whereConditions))
      .orderBy(prProfiles.lastName, prProfiles.firstName);
    
    console.log(`[PR-LIST] Returning ${prProfilesList.length} profiles:`, JSON.stringify(prProfilesList, null, 2));
    res.json(prProfilesList);
  } catch (error: any) {
    console.error("Error getting PR profiles:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR Multi-Company Support ====================

// Get all companies/profiles for the current PR (multi-company support)
router.get("/api/pr/my-companies", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    // Get current profile to find phone
    const [currentProfile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));
    
    if (!currentProfile) {
      return res.status(404).json({ error: "Profilo non trovato" });
    }
    
    // Find all profiles with same phone number (primary identifier)
    const allProfiles = await db.select({
      id: prProfiles.id,
      companyId: prProfiles.companyId,
      firstName: prProfiles.firstName,
      lastName: prProfiles.lastName,
      prCode: prProfiles.prCode,
      phone: prProfiles.phone,
      email: prProfiles.email,
      displayName: prProfiles.displayName,
      userId: prProfiles.userId,
      isActive: prProfiles.isActive,
      companyName: companies.name,
    })
    .from(prProfiles)
    .leftJoin(companies, eq(prProfiles.companyId, companies.id))
    .where(and(
      eq(prProfiles.phone, currentProfile.phone),
      eq(prProfiles.isActive, true)
    ))
    .orderBy(companies.name);
    
    res.json({
      currentProfileId: prSession.id,
      profiles: allProfiles.map(p => ({
        id: p.id,
        companyId: p.companyId,
        companyName: p.companyName || 'Azienda sconosciuta',
        firstName: p.firstName,
        lastName: p.lastName,
        prCode: p.prCode,
        displayName: p.displayName,
        userId: p.userId,
        isCurrent: p.id === prSession.id,
      })),
    });
  } catch (error: any) {
    console.error("Error getting PR companies:", error);
    res.status(500).json({ error: error.message });
  }
});

// Zod schema for switch-company request body
const switchCompanySchema = z.object({
  prProfileId: z.string().min(1, "prProfileId richiesto"),
});

// Switch to a different company profile
router.post("/api/pr/switch-company", async (req: Request, res: Response) => {
  try {
    const prSession = (req.session as any)?.prProfile;
    
    if (!prSession) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    // Validate request body with zod
    const parseResult = switchCompanySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Dati non validi", details: parseResult.error.errors });
    }
    
    const { prProfileId } = parseResult.data;
    
    // Get current profile to verify phone
    const [currentProfile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prSession.id));
    
    if (!currentProfile) {
      return res.status(404).json({ error: "Profilo corrente non trovato" });
    }
    
    // Get the target profile and verify it belongs to the same PR (same phone)
    const [targetProfile] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.id, prProfileId),
        eq(prProfiles.phone, currentProfile.phone),
        eq(prProfiles.isActive, true)
      ));
    
    if (!targetProfile) {
      return res.status(403).json({ error: "Non autorizzato a cambiare a questo profilo" });
    }
    
    // Update session with new profile
    (req.session as any).prProfile = {
      id: targetProfile.id,
      firstName: targetProfile.firstName,
      lastName: targetProfile.lastName,
      phone: targetProfile.phone,
      prCode: targetProfile.prCode,
      email: targetProfile.email,
      companyId: targetProfile.companyId,
    };
    
    // Update last login timestamp
    await db.update(prProfiles)
      .set({ lastLoginAt: new Date() })
      .where(eq(prProfiles.id, targetProfile.id));
    
    res.json({
      success: true,
      profile: {
        id: targetProfile.id,
        firstName: targetProfile.firstName,
        lastName: targetProfile.lastName,
        prCode: targetProfile.prCode,
        displayName: targetProfile.displayName,
        phone: targetProfile.phone,
        email: targetProfile.email,
        companyId: targetProfile.companyId,
      },
    });
  } catch (error: any) {
    console.error("Error switching PR company:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PR Event Dashboard Endpoints ====================

// Get all PR performance stats for an event (for Event Hub)
router.get("/api/events/:eventId/pr-performance", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Get all PR assignments for this event using eventPrAssignments table
    const assignments = await db.select({
      prProfileId: eventPrAssignments.prProfileId,
      prProfile: prProfiles,
    })
    .from(eventPrAssignments)
    .leftJoin(prProfiles, eq(eventPrAssignments.prProfileId, prProfiles.id))
    .where(eq(eventPrAssignments.eventId, eventId));
    
    const { siaeTickets, siaeTicketedEvents } = await import("@shared/schema");
    
    // Get the ticketed event
    const [ticketedEvent] = await db.select({ id: siaeTicketedEvents.id })
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.eventId, eventId))
      .limit(1);
    
    // Build performance data for each PR
    const performanceData = await Promise.all(
      assignments.map(async (assignment) => {
        const prProfile = assignment.prProfile;
        if (!prProfile) return null;
        
        let ticketsSold = 0;
        let revenue = 0;
        let commission = 0;
        
        if (ticketedEvent) {
          const [stats] = await db.select({
            count: sql<number>`count(*)`,
            revenue: sql<number>`coalesce(sum(${siaeTickets.grossAmount}), 0)`,
            commission: sql<number>`coalesce(sum(${siaeTickets.prCommissionAmount}), 0)`,
          })
          .from(siaeTickets)
          .where(and(
            eq(siaeTickets.ticketedEventId, ticketedEvent.id),
            eq(siaeTickets.prCode, prProfile.prCode),
            eq(siaeTickets.status, 'valid')
          ));
          
          ticketsSold = Number(stats?.count || 0);
          revenue = Number(stats?.revenue || 0);
          commission = Number(stats?.commission || 0);
        }
        
        // Generate tracking link
        const trackingLink = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://manage.eventfouryou.com'}/e/${eventId}?pr=${prProfile.prCode}`;
        
        return {
          prProfileId: prProfile.id,
          prCode: prProfile.prCode,
          firstName: prProfile.firstName,
          lastName: prProfile.lastName,
          email: prProfile.email,
          phone: prProfile.phone,
          ticketsSold,
          revenue,
          commission,
          trackingLink,
        };
      })
    );
    
    res.json(performanceData.filter(Boolean));
  } catch (error: any) {
    console.error("Error getting PR performance:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get ticket stats for a PR on an event
router.get("/api/pr/events/:eventId/ticket-stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    // Get PR's prCode
    const [prProfile] = await db.select({ prCode: prProfiles.prCode })
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId));
    
    if (!prProfile) {
      return res.json({ sold: 0, revenue: 0, commission: 0 });
    }
    
    // Get tickets sold with this prCode for this event
    // Import siaeTickets at the top if not already done
    const { siaeTickets, siaeTicketedEvents } = await import("@shared/schema");
    
    // First get the ticketed event for this event
    const [ticketedEvent] = await db.select({ id: siaeTicketedEvents.id })
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.eventId, eventId))
      .limit(1);
    
    if (!ticketedEvent) {
      return res.json({ sold: 0, revenue: 0, commission: 0 });
    }
    
    // Get tickets with prCode
    const ticketsSold = await db.select({
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${siaeTickets.grossAmount}), 0)`,
      commission: sql<number>`coalesce(sum(${siaeTickets.prCommissionAmount}), 0)`,
    })
    .from(siaeTickets)
    .where(and(
      eq(siaeTickets.ticketedEventId, ticketedEvent.id),
      eq(siaeTickets.prCode, prProfile.prCode),
      eq(siaeTickets.status, 'valid')
    ));
    
    res.json({
      sold: Number(ticketsSold[0]?.count || 0),
      revenue: Number(ticketsSold[0]?.revenue || 0),
      commission: Number(ticketsSold[0]?.commission || 0),
    });
  } catch (error: any) {
    console.error("Error getting PR ticket stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR rewards for an event
router.get("/api/pr/events/:eventId/rewards", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    // Get PR's company
    const [prProfile] = await db.select({ companyId: prProfiles.companyId })
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId));
    
    if (!prProfile) {
      return res.json([]);
    }
    
    const { prRewards, prRewardProgress } = await import("@shared/schema");
    
    // Get rewards for this event or company-wide rewards
    const rewardsList = await db.select()
      .from(prRewards)
      .where(and(
        eq(prRewards.companyId, prProfile.companyId),
        eq(prRewards.isActive, true),
        or(
          eq(prRewards.eventId, eventId),
          isNull(prRewards.eventId)
        )
      ))
      .orderBy(prRewards.name);
    
    // Get progress for each reward
    const rewardsWithProgress = await Promise.all(
      rewardsList.map(async (reward) => {
        const [progress] = await db.select()
          .from(prRewardProgress)
          .where(and(
            eq(prRewardProgress.rewardId, reward.id),
            eq(prRewardProgress.prProfileId, prProfileId)
          ));
        return { ...reward, progress };
      })
    );
    
    res.json(rewardsWithProgress);
  } catch (error: any) {
    console.error("Error getting PR rewards:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR activity logs (cancellations) for an event
router.get("/api/pr/events/:eventId/activity-logs", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    const { prActivityLogs } = await import("@shared/schema");
    
    const logs = await db.select()
      .from(prActivityLogs)
      .where(and(
        eq(prActivityLogs.eventId, eventId),
        eq(prActivityLogs.prProfileId, prProfileId)
      ))
      .orderBy(desc(prActivityLogs.createdAt))
      .limit(50);
    
    res.json(logs);
  } catch (error: any) {
    console.error("Error getting PR activity logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Event Activity Logs (for Event Hub) ====================

// Get all PR activity logs for an event (gestore view)
router.get("/api/events/:eventId/pr-activity-logs", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { prActivityLogs } = await import("@shared/schema");
    
    const logs = await db.select({
      log: prActivityLogs,
      prProfile: prProfiles,
    })
    .from(prActivityLogs)
    .leftJoin(prProfiles, eq(prActivityLogs.prProfileId, prProfiles.id))
    .where(eq(prActivityLogs.eventId, eventId))
    .orderBy(desc(prActivityLogs.createdAt))
    .limit(100);
    
    res.json(logs.map(l => ({
      ...l.log,
      prProfile: l.prProfile,
    })));
  } catch (error: any) {
    console.error("Error getting PR activity logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Event Rewards Management (for Event Hub) ====================

// Get all rewards for an event (gestore view)
router.get("/api/events/:eventId/rewards", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    const { prRewards, prRewardProgress } = await import("@shared/schema");
    
    // Get event to find company
    const [event] = await db.select({ companyId: events.companyId })
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    // Get rewards for this event or company-wide
    const rewardsList = await db.select()
      .from(prRewards)
      .where(and(
        eq(prRewards.companyId, event.companyId),
        or(
          eq(prRewards.eventId, eventId),
          isNull(prRewards.eventId)
        )
      ))
      .orderBy(prRewards.name);
    
    // Get progress for each reward across all PRs
    const rewardsWithProgress = await Promise.all(
      rewardsList.map(async (reward) => {
        const progress = await db.select()
          .from(prRewardProgress)
          .where(eq(prRewardProgress.rewardId, reward.id));
        return { ...reward, progress };
      })
    );
    
    res.json(rewardsWithProgress);
  } catch (error: any) {
    console.error("Error getting event rewards:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create reward for event
router.post("/api/events/:eventId/rewards", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    const { prRewards, insertPrRewardSchema } = await import("@shared/schema");
    
    // Get event to find company
    const [event] = await db.select({ companyId: events.companyId })
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    const validated = insertPrRewardSchema.parse({
      ...req.body,
      eventId: req.body.isGlobal ? null : eventId,
      companyId: event.companyId,
    });
    
    const [reward] = await db.insert(prRewards).values(validated).returning();
    res.status(201).json(reward);
  } catch (error: any) {
    console.error("Error creating reward:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update reward
router.patch("/api/rewards/:rewardId", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { rewardId } = req.params;
    const { prRewards } = await import("@shared/schema");
    
    const [updated] = await db.update(prRewards)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(prRewards.id, rewardId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Premio non trovato" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating reward:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete reward
router.delete("/api/rewards/:rewardId", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { rewardId } = req.params;
    const { prRewards } = await import("@shared/schema");
    
    const [deleted] = await db.delete(prRewards)
      .where(eq(prRewards.id, rewardId))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Premio non trovato" });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting reward:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
