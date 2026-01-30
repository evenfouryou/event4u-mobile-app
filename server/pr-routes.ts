// PR Module API Routes - Gestione Liste, Tavoli, QR
import { Router, Request, Response, NextFunction } from "express";
import { prStorage } from "./pr-storage";
import { storage } from "./storage";
import { db } from "./db";
import { sendOTP as sendMSG91OTP, verifyOTP as verifyMSG91OTP, isMSG91Configured } from "./msg91-service";
import {
  insertEventStaffAssignmentSchema,
  insertEventFloorplanSchema,
  insertEventTableSchema,
  insertTableBookingSchema,
  insertTableBookingParticipantSchema,
  insertEventListSchema,
  insertListEntrySchema,
  siaeCustomers,
  eventPrAssignments,
  prListAssignments,
  prTableAssignments,
  listEntries,
  users,
  events,
  prProfiles,
  companies,
  eventStaffAssignments,
  tableBookingParticipants,
  tableBookings,
  locations,
  tableReservations,
  cancellationRequests,
  eventLists,
  identities,
} from "@shared/schema";
import { z } from "zod";
import { like, or, eq, and, desc, isNull, inArray, sql, gt, gte, lte, not } from "drizzle-orm";
import { findOrCreateIdentity, findCustomerByIdentity } from "./identity-utils";

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
async function requireAuth(req: Request, res: Response, next: NextFunction) {
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
  
  // Check Bearer token authentication (for mobile app)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Token format: "pr_<profileId>" for PR profiles
    if (token.startsWith('pr_')) {
      const profileId = token.substring(3);
      try {
        const profile = await db.select().from(prProfiles).where(eq(prProfiles.id, profileId)).limit(1);
        if (profile.length > 0) {
          (req as any).prProfileId = profileId;
          // Also set up session-like data for consistency
          if (!req.session) {
            (req.session as any) = {};
          }
          (req.session as any).prProfile = profile[0];
          return next();
        }
      } catch (error) {
        console.error('[PR Auth] Token verification failed:', error);
      }
    }
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
// FIX 2026-01-27: Also accept Bearer token authentication (mobile app)
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
  
  // Allow Bearer token authenticated users (mobile app)
  // This is set by requireAuth middleware when validating Bearer token
  if ((req as any).prProfileId) {
    return next();
  }
  
  return res.status(403).json({ error: "Accesso negato. Richiesto ruolo PR." });
}

// ==================== Single Event Detail for PR ====================

// Get single event detail for PR dashboard
router.get("/api/pr/events/:eventId", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    console.log("[PR Event] Getting event:", eventId, "for userId:", userId, "prProfileId:", prProfileId);
    
    if (!prProfileId && !userId) {
      console.log("[PR Event] No profile found");
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    // First check if PR has access to this event via assignment
    const assignmentConditions = [];
    if (prProfileId) {
      assignmentConditions.push(eq(eventPrAssignments.prProfileId, prProfileId));
    }
    if (userId) {
      assignmentConditions.push(eq(eventPrAssignments.userId, userId));
    }
    
    const assignment = await db
      .select()
      .from(eventPrAssignments)
      .where(and(
        eq(eventPrAssignments.eventId, eventId),
        or(...assignmentConditions)
      ))
      .limit(1);
    
    console.log("[PR Event] Assignment found:", assignment.length > 0, assignment);
    
    if (assignment.length === 0) {
      console.log("[PR Event] No assignment found for this event");
      return res.status(404).json({ error: "Evento non trovato o accesso non autorizzato" });
    }
    
    // Get event details
    const [event] = await db
      .select({
        id: events.id,
        eventId: events.id,
        name: events.name,
        eventName: events.name,
        imageUrl: events.imageUrl,
        eventImageUrl: events.imageUrl,
        startDate: events.startDatetime,
        eventStart: events.startDatetime,
        endDate: events.endDatetime,
        eventEnd: events.endDatetime,
        status: events.status,
        locationId: events.locationId,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    
    if (!event) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    // Get location details if available
    let locationName = "";
    let locationAddress = "";
    if (event.locationId) {
      const location = await storage.getLocation(event.locationId);
      if (location) {
        locationName = location.name;
        locationAddress = location.address || "";
      }
    }
    
    res.json({
      ...event,
      locationName,
      locationAddress,
    });
  } catch (error: any) {
    console.error("Error getting event detail for PR:", error);
    res.status(500).json({ error: error.message });
  }
});

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

// Book a table (PR creates booking for client)
router.post("/api/pr/tables/:tableId/book", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { tableId } = req.params;
    const { customerName, customerPhone, customerEmail, guestCount, notes, booker, participants } = req.body;
    
    const { prProfileId } = await resolvePrIdentity(req);
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    // Get table to find event and company
    const table = await prStorage.getEventTable(tableId);
    if (!table) {
      return res.status(404).json({ error: "Tavolo non trovato" });
    }
    
    // Get event to find company
    const event = await db.select({ companyId: events.companyId })
      .from(events)
      .where(eq(events.id, table.eventId))
      .then(r => r[0]);
    
    if (!event) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    // Check if table is already booked
    if (table.status === 'booked') {
      return res.status(400).json({ error: "Tavolo già prenotato" });
    }
    
    // Get PR user ID
    const prProfile = await db.select({ userId: prProfiles.userId })
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .then(r => r[0]);
    
    // Create booking with pending_approval status
    const booking = await prStorage.createTableBooking({
      tableId,
      eventId: table.eventId,
      companyId: event.companyId,
      bookedByUserId: prProfile?.userId || null,
      customerName: customerName || `${booker.firstName} ${booker.lastName}`,
      customerPhone: customerPhone || booker.phone,
      customerEmail: customerEmail || null,
      guestsCount: guestCount || 1,
      notes: notes || null,
      approvalStatus: 'pending_approval',
    });
    
    // Create booker participant
    const bookerParticipant = await prStorage.createParticipant({
      bookingId: booking.id,
      eventId: table.eventId,
      companyId: event.companyId,
      firstName: booker.firstName,
      lastName: booker.lastName,
      phone: booker.phone,
      email: customerEmail || null,
      gender: booker.gender,
      isBooker: true,
      status: 'pending',
    });
    
    // Create additional participants
    const createdParticipants = [bookerParticipant];
    if (participants && Array.isArray(participants) && participants.length > 0) {
      const additionalParticipants = await prStorage.createParticipantsBatch(
        participants.slice(0, 10).map((p: any) => ({
          bookingId: booking.id,
          eventId: table.eventId,
          companyId: event.companyId,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          gender: p.gender || 'M',
          isBooker: false,
          status: 'pending',
        }))
      );
      createdParticipants.push(...additionalParticipants);
    }
    
    // Update table status to pending
    await prStorage.updateEventTable(tableId, { status: 'pending' });
    
    res.status(201).json({
      booking,
      participants: createdParticipants,
      message: "Prenotazione creata. In attesa di approvazione dal gestore.",
    });
  } catch (error: any) {
    console.error("Error booking table:", error);
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

// ==================== Table Booking Approval (Gestore only) ====================

// Get bookings pending approval with enriched data
router.get("/api/pr/bookings/pending-approval", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.query;
    
    let bookings = await prStorage.getBookingsPendingApproval(user.companyId);
    
    // Filter by event if specified
    if (eventId && typeof eventId === 'string') {
      bookings = bookings.filter(b => b.eventId === eventId);
    }
    
    // Enrich with event, table, PR and participant data
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      const [table, event, participants, prUser] = await Promise.all([
        prStorage.getEventTable(booking.tableId),
        db.select({ name: events.name, startDatetime: events.startDatetime })
          .from(events)
          .where(eq(events.id, booking.eventId))
          .then(r => r[0]),
        prStorage.getParticipantsByBooking(booking.id),
        booking.bookedByUserId 
          ? db.select({ firstName: users.firstName, lastName: users.lastName })
              .from(users)
              .where(eq(users.id, booking.bookedByUserId))
              .then(r => r[0])
          : null
      ]);
      
      return {
        ...booking,
        tableName: table?.name || 'Sconosciuto',
        tableCapacity: table?.capacity || 0,
        eventName: event?.name || 'Evento',
        eventDate: event?.startDatetime?.toISOString() || booking.createdAt,
        prName: prUser ? `${prUser.firstName || ''} ${prUser.lastName || ''}`.trim() : null,
        participants: participants.map(p => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          gender: p.gender,
          isBooker: p.isBooker,
        })),
      };
    }));
    
    res.json(enrichedBookings);
  } catch (error: any) {
    console.error("Error getting pending bookings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Approve booking
router.post("/api/pr/bookings/:id/approve", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    const booking = await prStorage.getTableBooking(id);
    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    if (booking.companyId !== user.companyId) {
      return res.status(403).json({ error: "Non autorizzato" });
    }
    if (booking.approvalStatus !== 'pending_approval') {
      return res.status(400).json({ error: "Prenotazione già processata" });
    }
    
    const approved = await prStorage.approveTableBooking(id, user.id);
    res.json(approved);
  } catch (error: any) {
    console.error("Error approving booking:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reject booking
router.post("/api/pr/bookings/:id/reject", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user as any;
    
    if (!reason) {
      return res.status(400).json({ error: "Motivo del rifiuto obbligatorio" });
    }
    
    const booking = await prStorage.getTableBooking(id);
    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    if (booking.companyId !== user.companyId) {
      return res.status(403).json({ error: "Non autorizzato" });
    }
    if (booking.approvalStatus !== 'pending_approval') {
      return res.status(400).json({ error: "Prenotazione già processata" });
    }
    
    // Restore table status
    await prStorage.updateEventTable(booking.tableId, { status: 'available' });
    
    const rejected = await prStorage.rejectTableBooking(id, user.id, reason);
    res.json(rejected);
  } catch (error: any) {
    console.error("Error rejecting booking:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Table Booking Participants ====================

// Get participants for a booking
router.get("/api/pr/bookings/:bookingId/participants", requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const participants = await prStorage.getParticipantsByBooking(bookingId);
    res.json(participants);
  } catch (error: any) {
    console.error("Error getting participants:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add single participant
router.post("/api/pr/bookings/:bookingId/participants", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const user = req.user as any;
    
    const booking = await prStorage.getTableBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    
    const validated = insertTableBookingParticipantSchema.omit({ qrCode: true }).parse({
      ...req.body,
      bookingId,
      eventId: booking.eventId,
      companyId: booking.companyId,
    });
    
    const participant = await prStorage.createParticipant(validated);
    
    // Try to link to existing user by phone
    const existingUser = await prStorage.findUserByPhone(participant.phone);
    if (existingUser) {
      await prStorage.linkParticipantToUser(participant.id, existingUser.id);
    }
    
    // Update guests count on booking
    const participants = await prStorage.getParticipantsByBooking(bookingId);
    await prStorage.updateTableBooking(bookingId, { guestsCount: participants.length });
    
    res.status(201).json(participant);
  } catch (error: any) {
    console.error("Error creating participant:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Add batch participants (max 10)
router.post("/api/pr/bookings/:bookingId/participants/batch", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { participants: participantsData } = req.body;
    
    if (!Array.isArray(participantsData) || participantsData.length === 0) {
      return res.status(400).json({ error: "Lista partecipanti vuota" });
    }
    if (participantsData.length > 10) {
      return res.status(400).json({ error: "Massimo 10 partecipanti per richiesta" });
    }
    
    const booking = await prStorage.getTableBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata" });
    }
    
    const validated = participantsData.map((p: any) => 
      insertTableBookingParticipantSchema.omit({ qrCode: true }).parse({
        ...p,
        bookingId,
        eventId: booking.eventId,
        companyId: booking.companyId,
      })
    );
    
    const created = await prStorage.createParticipantsBatch(validated);
    
    // Try to link each to existing users
    for (const participant of created) {
      const existingUser = await prStorage.findUserByPhone(participant.phone);
      if (existingUser) {
        await prStorage.linkParticipantToUser(participant.id, existingUser.id);
      }
    }
    
    // Update guests count on booking
    const allParticipants = await prStorage.getParticipantsByBooking(bookingId);
    await prStorage.updateTableBooking(bookingId, { guestsCount: allParticipants.length });
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating batch participants:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update participant
router.patch("/api/pr/participants/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prStorage.updateParticipant(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Partecipante non trovato" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating participant:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete participant
router.delete("/api/pr/participants/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const participant = await prStorage.getParticipant(id);
    if (!participant) {
      return res.status(404).json({ error: "Partecipante non trovato" });
    }
    
    const deleted = await prStorage.deleteParticipant(id);
    if (!deleted) {
      return res.status(404).json({ error: "Partecipante non trovato" });
    }
    
    // Update guests count on booking
    const participants = await prStorage.getParticipantsByBooking(participant.bookingId);
    await prStorage.updateTableBooking(participant.bookingId, { guestsCount: participants.length });
    
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting participant:", error);
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
// FIX 2026-01-27: Support PR without linked userId - use prProfileId fallback
router.get("/api/pr/events/:eventId/guest-entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    const allEntries = await prStorage.getGuestListEntriesByEvent(eventId);
    
    console.log("[PR GetGuests] eventId:", eventId, "total entries:", allEntries.length);
    
    // Gestore/Super Admin vedono tutti gli ospiti
    if (user && ['gestore', 'super_admin', 'gestore_covisione'].includes(user.role)) {
      console.log("[PR GetGuests] Admin role, returning all entries");
      return res.json(allEntries);
    }
    
    // FIX 2026-01-25: Use helper to resolve identity
    const { userId, prProfileId } = await resolvePrIdentity(req);
    console.log("[PR GetGuests] Resolved identity - userId:", userId, "prProfileId:", prProfileId);
    
    // FIX 2026-01-27: PR without linked userId - if prProfileId exists, get the PR's assignment to find their entries
    // For now, if PR has prProfileId but no userId, show entries they added (addedByUserId will be null in those cases)
    // Also check if entries were created with their prProfileId stored somewhere
    
    // PR/Capo Staff vedono solo gli ospiti che hanno aggiunto loro
    // FIX 2026-01-28: Check BOTH addedByPrProfileId AND addedByUserId for backwards compatibility
    // Old entries may only have addedByUserId, new entries have both
    let userEntries: typeof allEntries = [];
    
    userEntries = allEntries.filter(entry => {
      const entryPrProfileId = (entry as any).addedByPrProfileId;
      const entryUserId = entry.addedByUserId;
      
      // Match if:
      // 1. Entry's prProfileId matches our prProfileId
      // 2. OR entry's addedByUserId matches our userId (for legacy entries)
      const matchesPrProfile = prProfileId && entryPrProfileId === prProfileId;
      const matchesUserId = userId && entryUserId === userId;
      
      return matchesPrProfile || matchesUserId;
    });
    
    console.log("[PR GetGuests] Filtered by prProfileId:", prProfileId, "OR userId:", userId, "found:", userEntries.length);
    
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

// Add batch guests to a list (max 10)
// POST /api/pr/guest-lists/:listId/entries/batch
router.post("/api/pr/guest-lists/:listId/entries/batch", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const { guests } = req.body;
    const user = req.user as any;
    
    if (!Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ error: "Lista ospiti vuota" });
    }
    if (guests.length > 10) {
      return res.status(400).json({ error: "Massimo 10 ospiti per richiesta" });
    }
    
    // Get the list
    const list = await prStorage.getGuestList(listId);
    if (!list) {
      return res.status(404).json({ error: "Lista non trovata" });
    }
    
    // Check if list is still open
    if (!list.isActive) {
      return res.status(400).json({ error: "Lista chiusa" });
    }
    
    // Check max guests
    if (list.maxCapacity && list.currentCount + guests.length > list.maxCapacity) {
      return res.status(400).json({ 
        error: `Limite lista superato. Spazio disponibile: ${list.maxCapacity - list.currentCount}` 
      });
    }
    
    // Resolve PR identity
    const { userId, prProfileId } = await resolvePrIdentity(req);
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    // Validate all guests
    const validated = guests.map((g: any) => 
      insertListEntrySchema.omit({ qrCode: true }).parse({
        ...g,
        listId,
        eventId: list.eventId,
        companyId: list.companyId,
        addedByUserId: userId,
      })
    );
    
    // Create all entries
    const created = await prStorage.createGuestListEntriesBatch(validated);
    
    // Link to existing users by phone
    for (const entry of created) {
      if (entry.phone) {
        const existingUser = await prStorage.findUserByPhone(entry.phone);
        if (existingUser) {
          await prStorage.updateGuestListEntry(entry.id, { clientUserId: existingUser.id });
        }
      }
    }
    
    // Update list count
    await prStorage.updateGuestList(listId, { 
      currentCount: list.currentCount + created.length 
    });
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating batch guest list entries:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dati non validi", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Add guest directly to an event (auto-selects first available list)
// POST /api/pr/events/:eventId/guests
router.post("/api/pr/events/:eventId/guests", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    console.log("[PR AddGuest] === START ===");
    console.log("[PR AddGuest] eventId:", eventId);
    console.log("[PR AddGuest] req.body:", JSON.stringify(req.body));
    console.log("[PR AddGuest] req.user:", user?.id, user?.role);
    console.log("[PR AddGuest] prProfileId from req:", (req as any).prProfileId);
    
    // Resolve PR identity
    // FIX 2026-01-27: Accept either userId OR prProfileId (mobile app PR may not have linked userId)
    const { userId, prProfileId } = await resolvePrIdentity(req);
    console.log("[PR AddGuest] Resolved identity - userId:", userId, "prProfileId:", prProfileId);
    
    if (!userId && !prProfileId) {
      console.log("[PR AddGuest] FAIL: No identity resolved");
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    // Find all lists for this event that PR has access to
    const allLists = await prStorage.getGuestListsByEvent(eventId);
    console.log("[PR AddGuest] All lists for event:", allLists.length);
    
    if (allLists.length === 0) {
      console.log("[PR AddGuest] FAIL: No lists for event");
      return res.status(404).json({ error: "Nessuna lista disponibile per questo evento" });
    }
    
    // Filter active lists
    const activeLists = allLists.filter(l => l.isActive);
    console.log("[PR AddGuest] Active lists:", activeLists.length);
    
    if (activeLists.length === 0) {
      console.log("[PR AddGuest] FAIL: No active lists");
      return res.status(400).json({ error: "Nessuna lista attiva per questo evento" });
    }
    
    // Find lists where PR has access (created by PR or assigned via prListAssignments)
    const prAssignments = await db.select()
      .from(eventPrAssignments)
      .where(
        and(
          eq(eventPrAssignments.eventId, eventId),
          or(
            userId ? eq(eventPrAssignments.userId, userId) : sql`false`,
            prProfileId ? eq(eventPrAssignments.prProfileId, prProfileId) : sql`false`
          )
        )
      );
    console.log("[PR AddGuest] PR assignments found:", prAssignments.length, prAssignments.map(a => ({ id: a.id, userId: a.userId, prProfileId: a.prProfileId })));
    
    // Get list assignments if PR has specific ones
    let accessibleListIds: string[] = [];
    if (prAssignments.length > 0) {
      const prAssignmentIds = prAssignments.map(a => a.id);
      const listAssignments = await db.select()
        .from(prListAssignments)
        .where(inArray(prListAssignments.prAssignmentId, prAssignmentIds));
      
      console.log("[PR AddGuest] List assignments:", listAssignments.length);
      
      if (listAssignments.length > 0) {
        accessibleListIds = listAssignments.map(la => la.listId);
      }
    }
    
    // Also include lists created by the PR
    const listsCreatedByPr = activeLists.filter(l => l.createdByUserId === userId);
    const listsCreatedByPrIds = listsCreatedByPr.map(l => l.id);
    console.log("[PR AddGuest] Lists created by PR:", listsCreatedByPrIds.length);
    
    // Combine: assigned lists + lists created by PR
    const allAccessibleIds = Array.from(new Set([...accessibleListIds, ...listsCreatedByPrIds]));
    console.log("[PR AddGuest] All accessible list IDs:", allAccessibleIds);
    
    // If PR has no specific assignments, they can add to any active list
    let targetList;
    if (allAccessibleIds.length > 0) {
      targetList = activeLists.find(l => allAccessibleIds.includes(l.id));
    } else {
      // Fallback: use first active list
      console.log("[PR AddGuest] Using fallback - first active list");
      targetList = activeLists[0];
    }
    
    if (!targetList) {
      console.log("[PR AddGuest] FAIL: No accessible list found");
      return res.status(400).json({ error: "Nessuna lista accessibile trovata" });
    }
    
    console.log("[PR AddGuest] Target list:", targetList.id, targetList.name, "capacity:", targetList.currentCount, "/", targetList.maxCapacity);
    
    // Check capacity
    if (targetList.maxCapacity && targetList.currentCount >= targetList.maxCapacity) {
      console.log("[PR AddGuest] FAIL: List full");
      return res.status(400).json({ error: "Lista piena" });
    }
    
    // Create entry
    // FIX 2026-01-28: Use addedByPrProfileId to track which PR added the entry
    // FIX 2026-01-28: Auto-link entry to existing client by phone or email
    // Search in BOTH users table AND siaeCustomers table (which has userId link)
    let clientUserId: string | null = null;
    
    const guestPhone = req.body.phone;
    const guestEmail = req.body.email;
    
    if (guestPhone || guestEmail) {
      const { users: usersTable, siaeCustomers } = await import("@shared/schema");
      const normalizePhone = (p: string) => p.replace(/\D/g, '');
      
      let existingUser = null;
      
      if (guestPhone) {
        const phoneDigits = normalizePhone(guestPhone);
        // Build phone conditions for multiple formats
        const phoneFormats = [
          guestPhone,
          phoneDigits,
          '+39' + phoneDigits,
          '39' + phoneDigits,
          '+39' + phoneDigits.replace(/^39/, ''),
        ];
        if (phoneDigits.startsWith('39') && phoneDigits.length > 10) {
          phoneFormats.push(phoneDigits.slice(2));
        }
        // Remove duplicates
        const uniqueFormats = Array.from(new Set(phoneFormats));
        
        // 1. First search in users table
        const userPhoneConditions = uniqueFormats.map(f => eq(usersTable.phone, f));
        const [foundInUsers] = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(or(...userPhoneConditions))
          .limit(1);
        
        if (foundInUsers) {
          existingUser = foundInUsers;
          console.log("[PR AddGuest] Found user by phone in users table:", foundInUsers.id);
        } else {
          // 2. Search in siaeCustomers table (mobile app customers)
          const customerPhoneConditions = uniqueFormats.map(f => eq(siaeCustomers.phone, f));
          const [foundInCustomers] = await db.select({ 
            id: siaeCustomers.id,
            userId: siaeCustomers.userId 
          })
            .from(siaeCustomers)
            .where(or(...customerPhoneConditions))
            .limit(1);
          
          if (foundInCustomers && foundInCustomers.userId) {
            existingUser = { id: foundInCustomers.userId };
            console.log("[PR AddGuest] Found customer by phone in siaeCustomers, linked userId:", foundInCustomers.userId);
          }
        }
      }
      
      if (!existingUser && guestEmail) {
        // 1. First search in users table
        const [foundInUsers] = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(or(
            eq(usersTable.email, guestEmail),
            eq(usersTable.email, guestEmail.toLowerCase())
          ))
          .limit(1);
        
        if (foundInUsers) {
          existingUser = foundInUsers;
          console.log("[PR AddGuest] Found user by email in users table:", foundInUsers.id);
        } else {
          // 2. Search in siaeCustomers table
          const [foundInCustomers] = await db.select({ 
            id: siaeCustomers.id,
            userId: siaeCustomers.userId 
          })
            .from(siaeCustomers)
            .where(or(
              eq(siaeCustomers.email, guestEmail),
              eq(siaeCustomers.email, guestEmail.toLowerCase())
            ))
            .limit(1);
          
          if (foundInCustomers && foundInCustomers.userId) {
            existingUser = { id: foundInCustomers.userId };
            console.log("[PR AddGuest] Found customer by email in siaeCustomers, linked userId:", foundInCustomers.userId);
          }
        }
      }
      
      if (existingUser) {
        clientUserId = existingUser.id;
        console.log("[PR AddGuest] Setting clientUserId:", clientUserId);
      }
    }
    
    const entryData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone || null,
      email: req.body.email || null,
      gender: req.body.gender || null,
      notes: req.body.notes || null,
      listId: targetList.id,
      eventId: eventId,
      companyId: targetList.companyId,
      status: 'pending', // Explicit default
      plusOnes: req.body.plusOnes || 0, // Explicit default
      clientUserId: clientUserId, // Link to existing client if found
      addedByUserId: userId || null, // Can be null for PR without linked user account
      addedByPrProfileId: prProfileId || null, // PR profile ID for filtering
      createdBy: userId || null, // Must be valid users.id
      createdByRole: 'pr',
    };
    console.log("[PR AddGuest] Entry data before validation:", JSON.stringify(entryData));
    
    const validated = insertListEntrySchema.omit({ qrCode: true }).parse(entryData);
    console.log("[PR AddGuest] Validated entry:", JSON.stringify(validated));
    
    const entry = await prStorage.createGuestListEntry(validated);
    console.log("[PR AddGuest] SUCCESS - Created entry:", entry.id, entry.firstName, entry.lastName, entry.qrCode);
    
    res.status(201).json(entry);
  } catch (error: any) {
    console.error("[PR AddGuest] ERROR:", error.message, error.stack);
    if (error instanceof z.ZodError) {
      console.error("[PR AddGuest] Zod validation errors:", JSON.stringify(error.errors));
      return res.status(400).json({ error: "Dati non validi: " + error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '), details: error.errors });
    }
    // Return detailed error for debugging
    res.status(500).json({ error: `Errore server: ${error.message}` });
  }
});

// Search guests by phone number
// GET /api/pr/search-phone?phone=xxx&eventId=yyy
router.get("/api/pr/search-phone", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { phone, eventId } = req.query;
    
    if (!phone || typeof phone !== 'string' || phone.length < 3) {
      return res.status(400).json({ error: "Numero telefono richiesto (min 3 caratteri)" });
    }
    
    const { userId } = await resolvePrIdentity(req);
    if (!userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    
    // Search in guest list entries
    const results = await db.select({
      id: listEntries.id,
      firstName: listEntries.firstName,
      lastName: listEntries.lastName,
      phone: listEntries.phone,
      email: listEntries.email,
      gender: listEntries.gender,
      eventId: listEntries.eventId,
    })
      .from(listEntries)
      .where(
        and(
          like(listEntries.phone, `%${phone}%`),
          eventId ? eq(listEntries.eventId, eventId as string) : sql`true`
        )
      )
      .limit(10);
    
    res.json(results);
  } catch (error: any) {
    console.error("Error searching by phone:", error);
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
    
    // Phone normalization for matching
    const normalizePhone = (p: string) => p.replace(/\D/g, '');
    const getPhoneVariants = (phone: string): string[] => {
      const digits = normalizePhone(phone);
      let basePhone = digits;
      if (basePhone.startsWith('0039')) basePhone = basePhone.slice(4);
      else if (basePhone.startsWith('39') && basePhone.length > 10) basePhone = basePhone.slice(2);
      return [phone, digits, basePhone, '+39' + basePhone, '39' + basePhone, '0039' + basePhone];
    };
    const phoneVariants = getPhoneVariants(phone);
    
    // Find user by phone with normalization
    const users = await storage.getAllUsers();
    const prUser = users.find(u => {
      if (!u.phone || u.role !== 'pr') return false;
      const userPhone = u.phone;
      return phoneVariants.some(v => v === userPhone || normalizePhone(userPhone) === normalizePhone(v));
    });
    
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

// Search users/customers by phone or name (for mobile app compatibility)
// GET /api/users/search?q=xxx - Search registered customers
router.get("/api/users/search", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }
    
    const searchTerm = q.toLowerCase().replace(/\s/g, '');
    
    // Search in siaeCustomers by phone, firstName, lastName
    const customers = await db.select({
      id: siaeCustomers.id,
      firstName: siaeCustomers.firstName,
      lastName: siaeCustomers.lastName,
      phone: siaeCustomers.phone,
    })
    .from(siaeCustomers)
    .where(
      or(
        like(siaeCustomers.phone, `%${searchTerm}%`),
        like(sql`LOWER(${siaeCustomers.firstName})`, `%${searchTerm}%`),
        like(sql`LOWER(${siaeCustomers.lastName})`, `%${searchTerm}%`)
      )
    )
    .limit(10);
    
    res.json(customers);
  } catch (error: any) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: error.message });
  }
});

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
    
    // Phone normalization for better matching
    const normalizePhone = (p: string) => p.replace(/\D/g, '');
    const getPhoneVariants = (phone: string): string[] => {
      const digits = normalizePhone(phone);
      let basePhone = digits;
      if (basePhone.startsWith('0039')) basePhone = basePhone.slice(4);
      else if (basePhone.startsWith('39') && basePhone.length > 10) basePhone = basePhone.slice(2);
      return [phone, digits, basePhone, '+39' + basePhone, '39' + basePhone, '0039' + basePhone];
    };
    const phoneVariants = getPhoneVariants(phone);
    
    // If exact match exists (with normalization), prioritize it
    const exactMatch = customers.find(c => c.phone && phoneVariants.some(v => v === c.phone || normalizePhone(c.phone) === normalizePhone(v)));
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
    
    // Use centralized identity helper to find or create identity
    const { identity, created: identityCreated } = await findOrCreateIdentity({
      phone,
      firstName,
      lastName,
      gender: gender || undefined,
      birthDate: birthDate ? new Date(birthDate) : undefined,
    });
    
    console.log(`[PR-CUSTOMER] Identity ${identityCreated ? 'created' : 'found'}: ${identity.id} (phone: ${identity.phoneNormalized})`);
    
    // Check if customer already exists for this identity
    const existingCustomer = await findCustomerByIdentity(identity.id);
    
    if (existingCustomer) {
      console.log(`[PR-CUSTOMER] Reusing existing customer ${existingCustomer.id} linked to identity ${identity.id}`);
      return res.status(200).json({
        id: existingCustomer.id,
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        gender: existingCustomer.gender,
        phone: existingCustomer.phone,
        birthDate: existingCustomer.birthDate,
        reused: true,
      });
    }
    
    // No customer exists - create new customer linked to identity
    const uniqueCode = `PR_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const [customer] = await db.insert(siaeCustomers).values({
      phone,
      firstName,
      lastName,
      gender: gender || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      email: `${uniqueCode.toLowerCase()}@placeholder.temp`,
      uniqueCode,
      authenticationType: 'BO',
      registrationCompleted: false,
      phoneVerified: false,
      emailVerified: false,
      identityId: identity.id,
    }).returning();
    
    console.log(`[PR-CUSTOMER] Created new customer ${customer.id} linked to identity ${identity.id}`);
    
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
    
    // Save list assignments if provided
    const { listAssignments, tableAssignments } = req.body;
    if (listAssignments && Array.isArray(listAssignments) && listAssignments.length > 0) {
      for (const la of listAssignments) {
        if (la.listId) {
          await db.insert(prListAssignments).values({
            prAssignmentId: assignment.id,
            listId: la.listId,
            quota: la.quota || null,
          });
        }
      }
    }
    
    // Save table type assignments if provided
    if (tableAssignments && Array.isArray(tableAssignments) && tableAssignments.length > 0) {
      for (const ta of tableAssignments) {
        if (ta.tableTypeId) {
          await db.insert(prTableAssignments).values({
            prAssignmentId: assignment.id,
            tableTypeId: ta.tableTypeId,
            quota: ta.quota || null,
          });
        }
      }
    }
    
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

// ==================== PR Dashboard APIs ====================

// Get PR's assigned events (for PR dashboard)
router.get("/api/pr/my-events", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    const { locations, eventPrAssignments } = await import("@shared/schema");
    
    // Get PR profile to get companyId
    const prProfile = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    
    if (prProfile.length === 0) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    const companyId = prProfile[0].companyId;
    
    // Get events assigned to this PR via eventPrAssignments
    const assignments = await db.select({
      id: eventPrAssignments.id,
      eventId: eventPrAssignments.eventId,
      canAddToLists: eventPrAssignments.canAddToLists,
      canProposeTables: eventPrAssignments.canProposeTables,
    })
      .from(eventPrAssignments)
      .where(and(
        eq(eventPrAssignments.companyId, companyId),
        eq(eventPrAssignments.isActive, true),
        or(
          eq(eventPrAssignments.prProfileId, prProfileId),
          userId ? eq(eventPrAssignments.userId, userId) : sql`false`
        )
      ));
    
    if (assignments.length === 0) {
      return res.json([]);
    }
    
    const eventIds = assignments.map(a => a.eventId);
    
    // Get full event details with location
    // FIX 2026-01-28: Only show active/upcoming events (not cancelled, not in the past)
    const now = new Date();
    const eventsList = await db.select({
      id: events.id,
      name: events.name,
      description: events.description,
      startDatetime: events.startDatetime,
      endDatetime: events.endDatetime,
      imageUrl: events.imageUrl,
      status: events.status,
      locationId: events.locationId,
      locationName: locations.name,
      locationAddress: locations.address,
    })
      .from(events)
      .leftJoin(locations, eq(events.locationId, locations.id))
      .where(and(
        inArray(events.id, eventIds),
        or(
          // Future events (end date is in the future)
          gt(events.endDatetime, now),
          // Or events ending today
          and(
            gte(events.endDatetime, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
            lte(events.endDatetime, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
          )
        ),
        // Not cancelled
        not(eq(events.status, 'cancelled'))
      ))
      .orderBy(desc(events.startDatetime));
    
    // Combine with assignment permissions
    const eventsWithPermissions = eventsList.map(event => {
      const assignment = assignments.find(a => a.eventId === event.id);
      return {
        id: assignment?.id || event.id,
        eventId: event.id,
        eventName: event.name,
        eventDescription: event.description,
        eventImageUrl: event.imageUrl,
        eventStart: event.startDatetime,
        eventEnd: event.endDatetime,
        eventStatus: event.status,
        locationName: event.locationName || "Location non specificata",
        locationAddress: event.locationAddress,
        canAddToLists: assignment?.canAddToLists ?? true,
        canProposeTables: assignment?.canProposeTables ?? true,
      };
    });
    
    res.json(eventsWithPermissions);
  } catch (error: any) {
    console.error("Error getting PR events:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR profile (for mobile app)
router.get("/api/pr/profile", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    // Get full PR profile
    const prProfile = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    
    if (prProfile.length === 0) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    const profile = prProfile[0];
    
    // Try to get firstName/lastName/email from linked customer if not present in PR profile
    let firstName = profile.firstName;
    let lastName = profile.lastName;
    let email = profile.email;
    
    if ((!firstName || !lastName || !email) && profile.identityId) {
      const [linkedCustomer] = await db.select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.identityId, profile.identityId));
      
      if (linkedCustomer) {
        firstName = firstName || linkedCustomer.firstName;
        lastName = lastName || linkedCustomer.lastName;
        email = email || linkedCustomer.email;
      }
    }
    
    // Also try by phone match if identity didn't work
    if ((!firstName || !lastName) && profile.phone) {
      const phoneToSearch = profile.phonePrefix ? 
        (profile.phonePrefix + profile.phone).replace(/\D/g, '') : 
        profile.phone.replace(/\D/g, '');
      
      const allCustomers = await db.select().from(siaeCustomers);
      const linkedByPhone = allCustomers.find(c => {
        if (!c.phone) return false;
        const custPhone = c.phone.replace(/\D/g, '');
        return custPhone === phoneToSearch || 
               custPhone.endsWith(profile.phone) || 
               phoneToSearch.endsWith(custPhone);
      });
      
      if (linkedByPhone) {
        firstName = firstName || linkedByPhone.firstName;
        lastName = lastName || linkedByPhone.lastName;
        email = email || linkedByPhone.email;
      }
    }
    
    res.json({
      id: profile.id,
      companyId: profile.companyId,
      userId: profile.userId,
      firstName: firstName,
      lastName: lastName,
      phone: profile.phone,
      phonePrefix: profile.phonePrefix || '+39',
      email: email,
      displayName: profile.displayName,
      prCode: profile.prCode,
      commissionType: Number(profile.commissionFixedPerPerson || 0) > 0 ? 'fixed' : 'percentage',
      commissionValue: Number(profile.commissionFixedPerPerson || 0) > 0 
        ? String(profile.commissionFixedPerPerson) 
        : String(profile.commissionPercentage),
      status: profile.isActive ? 'active' : 'inactive',
      createdAt: profile.createdAt,
    });
  } catch (error: any) {
    console.error("Error getting PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update PR profile (for mobile app)
router.patch("/api/pr/profile", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    const { displayName, email, bio, profileImageUrl } = req.body;
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
    updateData.updatedAt = new Date();
    
    if (Object.keys(updateData).length === 1) {
      return res.status(400).json({ error: "Nessun campo da aggiornare" });
    }
    
    await db.update(prProfiles)
      .set(updateData)
      .where(eq(prProfiles.id, prProfileId));
    
    // Return updated profile
    const updated = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    
    if (updated.length === 0) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    const profile = updated[0];
    res.json({
      id: profile.id,
      companyId: profile.companyId,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email,
      displayName: profile.displayName,
      prCode: profile.prCode,
      commissionType: Number(profile.commissionFixedPerPerson || 0) > 0 ? 'fixed' : 'percentage',
      commissionValue: Number(profile.commissionFixedPerPerson || 0) > 0 
        ? String(profile.commissionFixedPerPerson) 
        : String(profile.commissionPercentage),
      status: profile.isActive ? 'active' : 'inactive',
      createdAt: profile.createdAt,
    });
  } catch (error: any) {
    console.error("Error updating PR profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Store pending phone changes (in-memory, could use Redis for production)
const pendingPhoneChanges = new Map<string, { newPhone: string; newPhonePrefix: string; expiresAt: Date }>();

// Request phone number change - sends OTP to new number
router.post("/api/pr/phone/request-change", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { prProfileId } = await resolvePrIdentity(req);
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    const { newPhone, newPhonePrefix = '+39' } = req.body;
    
    if (!newPhone || newPhone.length < 9) {
      return res.status(400).json({ error: "Numero di telefono non valido (minimo 9 cifre)" });
    }
    
    // Get current PR profile to check if phone is the same
    const [currentPr] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId));
    
    // If phone is the same as current, accept immediately without OTP
    if (currentPr && currentPr.phonePrefix === newPhonePrefix && currentPr.phone === newPhone) {
      return res.json({ success: true, samePhone: true, message: "Numero di telefono già corretto" });
    }
    
    // Check if MSG91 is configured
    if (!isMSG91Configured()) {
      return res.status(503).json({ error: "Servizio OTP non configurato" });
    }
    
    // Format phone for OTP
    const fullPhone = `${newPhonePrefix}${newPhone}`;
    
    // Check if this phone is already used by another PR in same company
    const [existingPr] = await db.select()
      .from(prProfiles)
      .where(and(
        eq(prProfiles.phone, newPhone),
        eq(prProfiles.phonePrefix, newPhonePrefix),
        sql`${prProfiles.id} != ${prProfileId}`
      ));
    
    if (existingPr) {
      return res.status(400).json({ error: "Questo numero è già utilizzato da un altro PR" });
    }
    
    // Send OTP to new phone
    const otpResult = await sendMSG91OTP(fullPhone);
    
    if (!otpResult.success) {
      console.error(`[PR-PHONE] Failed to send OTP to ${fullPhone}:`, otpResult.message);
      return res.status(500).json({ error: "Errore nell'invio del codice OTP" });
    }
    
    // Store pending change
    pendingPhoneChanges.set(prProfileId, {
      newPhone,
      newPhonePrefix,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    console.log(`[PR-PHONE] OTP sent to ${fullPhone} for PR ${prProfileId}`);
    res.json({ success: true, message: "Codice OTP inviato al nuovo numero" });
  } catch (error: any) {
    console.error("Error requesting phone change:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP and complete phone change
router.post("/api/pr/phone/verify-change", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { prProfileId } = await resolvePrIdentity(req);
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    const { otp } = req.body;
    
    if (!otp || otp.length < 4) {
      return res.status(400).json({ error: "Codice OTP non valido" });
    }
    
    // Get pending change
    const pendingChange = pendingPhoneChanges.get(prProfileId);
    if (!pendingChange) {
      return res.status(400).json({ error: "Nessuna richiesta di cambio numero in corso. Richiedi prima l'OTP." });
    }
    
    if (pendingChange.expiresAt < new Date()) {
      pendingPhoneChanges.delete(prProfileId);
      return res.status(400).json({ error: "Codice OTP scaduto. Richiedi un nuovo codice." });
    }
    
    // Verify OTP
    const fullPhone = `${pendingChange.newPhonePrefix}${pendingChange.newPhone}`;
    const verifyResult = await verifyMSG91OTP(fullPhone, otp);
    
    if (!verifyResult.success) {
      return res.status(400).json({ error: "Codice OTP non valido" });
    }
    
    // Update phone number in prProfiles
    await db.update(prProfiles)
      .set({
        phone: pendingChange.newPhone,
        phonePrefix: pendingChange.newPhonePrefix,
        phoneVerified: true,
        updatedAt: new Date()
      })
      .where(eq(prProfiles.id, prProfileId));
    
    // Also update in identities table for unified identity matching
    const [prProfile] = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId));
    
    if (prProfile?.identityId) {
      await db.update(identities)
        .set({
          phone: pendingChange.newPhone,
          phonePrefix: pendingChange.newPhonePrefix,
          phoneNormalized: fullPhone,
          phoneVerified: true,
          updatedAt: new Date()
        })
        .where(eq(identities.id, prProfile.identityId));
      console.log(`[PR-PHONE] Identity ${prProfile.identityId} also updated with new phone ${fullPhone}`);
    }
    
    // Clean up
    pendingPhoneChanges.delete(prProfileId);
    
    console.log(`[PR-PHONE] Phone updated for PR ${prProfileId} to ${fullPhone}`);
    res.json({ 
      success: true, 
      message: "Numero di telefono aggiornato con successo",
      phone: pendingChange.newPhone,
      phonePrefix: pendingChange.newPhonePrefix
    });
  } catch (error: any) {
    console.error("Error verifying phone change:", error);
    res.status(500).json({ error: error.message });
  }
});

// Request payout (for mobile app)
router.post("/api/pr/wallet/payout", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    // Get PR profile
    const prProfile = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    
    if (prProfile.length === 0) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    const profile = prProfile[0];
    const availableBalance = Number(profile.totalEarnings || 0) - Number(profile.paidEarnings || 0);
    
    if (availableBalance < 10) {
      return res.status(400).json({ 
        success: false, 
        message: "Il saldo minimo per richiedere un pagamento è 10€" 
      });
    }
    
    // TODO: Create payout request record and notification to gestore
    // For now, just return success message
    res.json({ 
      success: true, 
      message: `Richiesta di pagamento di €${availableBalance.toFixed(2)} inviata. Sarai contattato dal gestore.` 
    });
  } catch (error: any) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get PR stats (for PR dashboard)
router.get("/api/pr/stats", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    const { tableBookings, eventPrAssignments, siaeTickets } = await import("@shared/schema");
    
    // Get PR profile
    const prProfile = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    
    if (prProfile.length === 0) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    const companyId = prProfile[0].companyId;
    
    // Count active events assigned to this PR
    const activeEventsCount = await db.select({ count: sql<number>`count(*)` })
      .from(eventPrAssignments)
      .innerJoin(events, eq(eventPrAssignments.eventId, events.id))
      .where(and(
        eq(eventPrAssignments.companyId, companyId),
        eq(eventPrAssignments.isActive, true),
        or(
          eq(eventPrAssignments.prProfileId, prProfileId),
          userId ? eq(eventPrAssignments.userId, userId) : sql`false`
        ),
        sql`${events.startDatetime} >= NOW()`
      ));
    
    // Get PR profile's linked userId for guest/table counting
    const prLinkedUserId = prProfile[0].userId;
    
    // Count total guests from list entries (added by this PR via userId)
    const guestCount = prLinkedUserId 
      ? await db.select({ count: sql<number>`count(*)` })
          .from(listEntries)
          .where(eq(listEntries.addedByUserId, prLinkedUserId))
      : [{ count: 0 }];
    
    // Count table bookings (booked by this PR via userId)
    const tableCount = prLinkedUserId
      ? await db.select({ count: sql<number>`count(*)` })
          .from(tableBookings)
          .where(eq(tableBookings.bookedByUserId, prLinkedUserId))
      : [{ count: 0 }];
    
    // Count tickets sold with PR code
    const ticketStats = await db.select({
      count: sql<number>`count(*)`,
      revenue: sql<number>`COALESCE(SUM(CAST(${siaeTickets.grossAmount} AS DECIMAL)), 0)`,
      commission: sql<number>`COALESCE(SUM(CAST(${siaeTickets.prCommissionAmount} AS DECIMAL)), 0)`,
    })
      .from(siaeTickets)
      .where(eq(siaeTickets.prProfileId, prProfileId));
    
    const stats = {
      totalGuests: Number(guestCount[0]?.count || 0),
      totalTables: Number(tableCount[0]?.count || 0),
      ticketsSold: Number(ticketStats[0]?.count || 0),
      totalRevenue: Number(ticketStats[0]?.revenue || 0),
      commissionEarned: Number(prProfile[0].totalEarnings || 0),
      activeEvents: Number(activeEventsCount[0]?.count || 0),
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error("Error getting PR stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get PR wallet info
router.get("/api/pr/wallet", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    // Get PR profile with earnings
    const prProfile = await db.select({
      totalEarnings: prProfiles.totalEarnings,
      pendingEarnings: prProfiles.pendingEarnings,
    })
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    
    if (prProfile.length === 0) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    const wallet = {
      balance: prProfile[0].totalEarnings || "0",
      pendingPayout: prProfile[0].pendingEarnings || "0",
      currency: "EUR",
    };
    
    res.json(wallet);
  } catch (error: any) {
    console.error("Error getting PR wallet:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all rewards for PR (across all assigned events)
router.get("/api/pr/rewards", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { prProfileId } = await resolvePrIdentity(req);
    
    if (!prProfileId) {
      return res.status(403).json({ error: "Profilo PR non trovato" });
    }
    
    const { prRewards, prRewardProgress } = await import("@shared/schema");
    
    // Get PR profile to get companyId
    const prProfile = await db.select()
      .from(prProfiles)
      .where(eq(prProfiles.id, prProfileId))
      .limit(1);
    
    if (prProfile.length === 0) {
      return res.status(404).json({ error: "Profilo PR non trovato" });
    }
    
    const companyId = prProfile[0].companyId;
    
    // Get all active rewards for this company
    const rewardsList = await db.select()
      .from(prRewards)
      .where(and(
        eq(prRewards.companyId, companyId),
        eq(prRewards.isActive, true)
      ))
      .orderBy(prRewards.name);
    
    // Get progress for each reward
    const rewardsWithProgress = await Promise.all(
      rewardsList.map(async (reward) => {
        const progress = await db.select()
          .from(prRewardProgress)
          .where(and(
            eq(prRewardProgress.rewardId, reward.id),
            eq(prRewardProgress.prProfileId, prProfileId)
          ))
          .limit(1);
        
        return {
          ...reward,
          progress: progress[0] || null,
          currentProgress: progress[0]?.currentValue || 0,
          isClaimed: progress[0]?.rewardClaimed || false,
        };
      })
    );
    
    res.json(rewardsWithProgress);
  } catch (error: any) {
    console.error("Error getting PR rewards:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== User QR Codes (I Miei QR) ====================

// Get user's table reservations
router.get("/api/my/table-reservations", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.id) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    // Find all participants linked to this user
    const userParticipants = await db.select({
      participant: tableBookingParticipants,
      booking: tableBookings,
    })
      .from(tableBookingParticipants)
      .innerJoin(tableBookings, eq(tableBookingParticipants.bookingId, tableBookings.id))
      .where(eq(tableBookingParticipants.linkedUserId, user.id));

    // Enrich with event and table data
    const reservations = await Promise.all(userParticipants.map(async ({ participant, booking }) => {
      const [table, event] = await Promise.all([
        prStorage.getEventTable(booking.tableId),
        db.select({ name: events.name, startDatetime: events.startDatetime, locationId: events.locationId })
          .from(events)
          .where(eq(events.id, booking.eventId))
          .then(r => r[0]),
      ]);

      let venueName = 'Location';
      if (event?.locationId) {
        const location = await db.select({ name: locations.name })
          .from(locations)
          .where(eq(locations.id, event.locationId))
          .then(r => r[0]);
        venueName = location?.name || 'Location';
      }

      return {
        id: booking.id,
        eventName: event?.name || 'Evento',
        eventDate: event?.startDatetime?.toISOString() || booking.createdAt,
        tableName: table?.name || 'Tavolo',
        venueName,
        approvalStatus: booking.approvalStatus,
        qrCode: participant.qrCode,
        participantId: participant.id,
        isBooker: participant.isBooker || false,
        firstName: participant.firstName,
        lastName: participant.lastName,
      };
    }));

    res.json(reservations);
  } catch (error: any) {
    console.error("Error getting user table reservations:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's guest list entries
router.get("/api/my/guest-list-entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user?.id) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const { eventLists, listEntries: listEntriesTable, siaeCustomers } = await import("@shared/schema");

    console.log("[DEBUG-QR] ========================================");
    console.log("[DEBUG-QR] Endpoint /api/my/guest-list-entries called");
    console.log("[DEBUG-QR] User data:", JSON.stringify({ id: user.id, email: user.email, phone: user.phone, role: user.role }));
    
    // DEBUG: Count total entries in database
    const [totalCount] = await db.select({ count: sql<number>`count(*)` }).from(listEntriesTable);
    console.log("[DEBUG-QR] Total list_entries in database:", totalCount?.count);
    
    // DEBUG: Get sample entries to see what's in DB
    const sampleEntries = await db.select({
      id: listEntriesTable.id,
      email: listEntriesTable.email,
      phone: listEntriesTable.phone,
      clientUserId: listEntriesTable.clientUserId,
      qrCode: listEntriesTable.qrCode,
      firstName: listEntriesTable.firstName,
      lastName: listEntriesTable.lastName
    }).from(listEntriesTable).limit(5);
    console.log("[DEBUG-QR] Sample entries:", JSON.stringify(sampleEntries));
    
    console.log("[DEBUG-QR] Searching for user:", { id: user.id, email: user.email, phone: user.phone });

    // Normalize phone number - strip all non-digits
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    
    // FIX 2026-01-28: Also get phone/email from siaeCustomers if user is linked
    let customerPhone: string | null = null;
    let customerEmail: string | null = null;
    
    const [linkedCustomer] = await db.select({
      phone: siaeCustomers.phone,
      email: siaeCustomers.email
    })
      .from(siaeCustomers)
      .where(eq(siaeCustomers.userId, user.id))
      .limit(1);
    
    if (linkedCustomer) {
      customerPhone = linkedCustomer.phone;
      customerEmail = linkedCustomer.email;
      console.log("[my/guest-list-entries] Found linked siaeCustomer:", { phone: customerPhone, email: customerEmail });
    }
    
    // Build conditions to find list entries by clientUserId, email, or phone
    const conditions = [eq(listEntriesTable.clientUserId, user.id)];
    
    // Add user email conditions
    if (user.email) {
      conditions.push(eq(listEntriesTable.email, user.email));
      conditions.push(eq(listEntriesTable.email, user.email.toLowerCase()));
    }
    
    // Add customer email conditions (from siaeCustomers)
    if (customerEmail && customerEmail !== user.email) {
      conditions.push(eq(listEntriesTable.email, customerEmail));
      conditions.push(eq(listEntriesTable.email, customerEmail.toLowerCase()));
    }
    
    // Helper to get base phone (without country code) and all variants
    const getPhoneVariants = (phone: string): string[] => {
      const digits = normalizePhone(phone);
      let basePhone = digits;
      // Remove Italian prefix if present
      if (basePhone.startsWith('0039')) {
        basePhone = basePhone.slice(4);
      } else if (basePhone.startsWith('39') && basePhone.length > 10) {
        basePhone = basePhone.slice(2);
      }
      // Return all possible formats
      return [
        phone,                    // Original as-is
        digits,                   // Just digits
        basePhone,                // Without country code
        '+39' + basePhone,        // With +39 prefix
        '39' + basePhone,         // With 39 prefix
        '0039' + basePhone,       // With 0039 prefix
      ];
    };
    
    // Add user phone conditions
    if (user.phone) {
      const variants = getPhoneVariants(user.phone);
      console.log("[DEBUG-QR] User phone variants:", variants);
      for (const variant of variants) {
        conditions.push(eq(listEntriesTable.phone, variant));
      }
    }
    
    // Add customer phone conditions (from siaeCustomers)
    if (customerPhone) {
      const variants = getPhoneVariants(customerPhone);
      console.log("[DEBUG-QR] Customer phone variants:", variants);
      for (const variant of variants) {
        conditions.push(eq(listEntriesTable.phone, variant));
      }
    }

    console.log("[DEBUG-QR] Search conditions count:", conditions.length);
    console.log("[DEBUG-QR] Searching with phone variants for user.phone:", user.phone);
    console.log("[DEBUG-QR] Searching with phone variants for customer.phone:", customerPhone);
    
    // Find all list entries linked to this user by clientUserId, email, or phone
    const userEntries = await db.select({
      entry: listEntriesTable,
      list: eventLists,
    })
      .from(listEntriesTable)
      .innerJoin(eventLists, eq(listEntriesTable.listId, eventLists.id))
      .where(or(...conditions));
    
    console.log("[DEBUG-QR] Query completed. Found", userEntries.length, "entries");
    if (userEntries.length > 0) {
      console.log("[DEBUG-QR] First entry:", JSON.stringify({
        id: userEntries[0].entry.id,
        firstName: userEntries[0].entry.firstName,
        lastName: userEntries[0].entry.lastName,
        qrCode: userEntries[0].entry.qrCode,
        email: userEntries[0].entry.email,
        phone: userEntries[0].entry.phone,
        clientUserId: userEntries[0].entry.clientUserId
      }));
    } else {
      console.log("[DEBUG-QR] NO ENTRIES FOUND - checking possible reasons...");
      // Check if there are ANY entries with matching email/phone (ignoring clientUserId)
      if (user.email) {
        const byEmail = await db.select({ id: listEntriesTable.id, email: listEntriesTable.email })
          .from(listEntriesTable)
          .where(sql`LOWER(${listEntriesTable.email}) = LOWER(${user.email})`)
          .limit(3);
        console.log("[DEBUG-QR] Entries with matching email (case-insensitive):", JSON.stringify(byEmail));
      }
      if (user.phone) {
        const phoneDigits = user.phone.replace(/\D/g, '');
        const byPhone = await db.select({ id: listEntriesTable.id, phone: listEntriesTable.phone })
          .from(listEntriesTable)
          .where(sql`REPLACE(REPLACE(REPLACE(${listEntriesTable.phone}, '+', ''), ' ', ''), '-', '') LIKE ${'%' + phoneDigits.slice(-9)}`)
          .limit(3);
        console.log("[DEBUG-QR] Entries with matching phone (last 9 digits):", JSON.stringify(byPhone));
      }
    }
    console.log("[DEBUG-QR] ========================================");

    // Enrich with event data
    const entries = await Promise.all(userEntries.map(async ({ entry, list }) => {
      const event = await db.select({ name: events.name, startDatetime: events.startDatetime, locationId: events.locationId })
        .from(events)
        .where(eq(events.id, list.eventId))
        .then(r => r[0]);

      let venueName = 'Location';
      if (event?.locationId) {
        const location = await db.select({ name: locations.name })
          .from(locations)
          .where(eq(locations.id, event.locationId))
          .then(r => r[0]);
        venueName = location?.name || 'Location';
      }

      return {
        id: entry.id,
        eventName: event?.name || 'Evento',
        eventDate: event?.startDatetime?.toISOString() || entry.createdAt,
        listName: list.name,
        venueName,
        qrCode: entry.qrCode,
        status: entry.status || 'pending',
        firstName: entry.firstName,
        lastName: entry.lastName,
      };
    }));

    res.json(entries);
  } catch (error: any) {
    console.error("Error getting user guest list entries:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CANCELLATION REQUESTS ====================

// PR requests cancellation of a list entry or table reservation
router.post("/api/pr/cancellation-requests", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { reservationType, listEntryId, tableReservationId, requestReason } = req.body;
    const { userId, prProfileId } = await resolvePrIdentity(req);
    
    if (!reservationType || (!listEntryId && !tableReservationId)) {
      return res.status(400).json({ error: "Tipo di prenotazione e ID sono obbligatori" });
    }
    
    let eventId: string;
    let companyId: string;
    let autoApprove = false;
    
    if (reservationType === 'list_entry' && listEntryId) {
      // Get list entry and check if PR owns it
      const [entry] = await db.select().from(listEntries).where(eq(listEntries.id, listEntryId));
      if (!entry) {
        return res.status(404).json({ error: "Prenotazione lista non trovata" });
      }
      
      // Check if entry status allows cancellation
      if (entry.status === 'cancelled' || entry.status === 'arrived') {
        return res.status(400).json({ error: "Non è possibile cancellare questa prenotazione" });
      }
      
      eventId = entry.eventId;
      companyId = entry.companyId;
      
      // Check auto-approve setting on the list
      const [list] = await db.select().from(eventLists).where(eq(eventLists.id, entry.listId));
      if (list?.autoApproveCancellations) {
        autoApprove = true;
      }
    } else if (reservationType === 'table_reservation' && tableReservationId) {
      // Get table reservation
      const [reservation] = await db.select().from(tableReservations).where(eq(tableReservations.id, tableReservationId));
      if (!reservation) {
        return res.status(404).json({ error: "Prenotazione tavolo non trovata" });
      }
      
      if (reservation.status === 'cancelled') {
        return res.status(400).json({ error: "Non è possibile cancellare questa prenotazione" });
      }
      
      eventId = reservation.eventId;
      companyId = reservation.companyId;
    } else {
      return res.status(400).json({ error: "Dati di prenotazione non validi" });
    }
    
    // Check if there's already a pending cancellation request
    const existingRequest = await db.select().from(cancellationRequests).where(
      and(
        eq(cancellationRequests.status, 'pending'),
        reservationType === 'list_entry' 
          ? eq(cancellationRequests.listEntryId, listEntryId!)
          : eq(cancellationRequests.tableReservationId, tableReservationId!)
      )
    );
    
    if (existingRequest.length > 0) {
      return res.status(400).json({ error: "Esiste già una richiesta di cancellazione in attesa" });
    }
    
    // Create cancellation request
    const [request] = await db.insert(cancellationRequests).values({
      eventId,
      companyId,
      reservationType,
      listEntryId: reservationType === 'list_entry' ? listEntryId : null,
      tableReservationId: reservationType === 'table_reservation' ? tableReservationId : null,
      requestedByUserId: userId,
      requestedByPrProfileId: prProfileId,
      requestReason,
      status: autoApprove ? 'approved' : 'pending',
      autoApproved: autoApprove,
      processedAt: autoApprove ? new Date() : null,
    }).returning();
    
    // If auto-approved, also update the original entry/reservation
    if (autoApprove) {
      if (reservationType === 'list_entry' && listEntryId) {
        await db.update(listEntries)
          .set({ status: 'cancelled' })
          .where(eq(listEntries.id, listEntryId));
      } else if (reservationType === 'table_reservation' && tableReservationId) {
        await db.update(tableReservations)
          .set({ status: 'cancelled' })
          .where(eq(tableReservations.id, tableReservationId));
      }
    }
    
    res.json({ 
      ...request, 
      message: autoApprove 
        ? 'Prenotazione cancellata automaticamente' 
        : 'Richiesta di cancellazione inviata al gestore' 
    });
  } catch (error: any) {
    console.error("Error creating cancellation request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get cancellation requests for PR (their own requests)
router.get("/api/pr/cancellation-requests", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { userId, prProfileId } = await resolvePrIdentity(req);
    const { eventId, status } = req.query;
    
    let conditions = [];
    if (prProfileId) {
      conditions.push(eq(cancellationRequests.requestedByPrProfileId, prProfileId));
    }
    if (userId) {
      conditions.push(eq(cancellationRequests.requestedByUserId, userId));
    }
    
    let whereClause = or(...conditions)!;
    
    if (eventId) {
      whereClause = and(whereClause, eq(cancellationRequests.eventId, eventId as string))!;
    }
    if (status) {
      whereClause = and(whereClause, eq(cancellationRequests.status, status as string))!;
    }
    
    const requests = await db.select().from(cancellationRequests)
      .where(whereClause)
      .orderBy(desc(cancellationRequests.createdAt));
    
    res.json(requests);
  } catch (error: any) {
    console.error("Error getting PR cancellation requests:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get cancellation requests for Gestore (all pending for their company/event)
router.get("/api/gestore/cancellation-requests", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId, status } = req.query;
    
    let whereClause: any = eq(cancellationRequests.companyId, user.companyId);
    
    if (eventId) {
      whereClause = and(whereClause, eq(cancellationRequests.eventId, eventId as string));
    }
    if (status) {
      whereClause = and(whereClause, eq(cancellationRequests.status, status as string));
    }
    
    const requests = await db.select({
      id: cancellationRequests.id,
      eventId: cancellationRequests.eventId,
      companyId: cancellationRequests.companyId,
      reservationType: cancellationRequests.reservationType,
      listEntryId: cancellationRequests.listEntryId,
      tableReservationId: cancellationRequests.tableReservationId,
      requestedByUserId: cancellationRequests.requestedByUserId,
      requestedByPrProfileId: cancellationRequests.requestedByPrProfileId,
      requestReason: cancellationRequests.requestReason,
      status: cancellationRequests.status,
      processedAt: cancellationRequests.processedAt,
      processedByUserId: cancellationRequests.processedByUserId,
      processedNote: cancellationRequests.processedNote,
      autoApproved: cancellationRequests.autoApproved,
      createdAt: cancellationRequests.createdAt,
    })
      .from(cancellationRequests)
      .where(whereClause)
      .orderBy(desc(cancellationRequests.createdAt));
    
    // Enrich with details about the reservation
    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      let reservationDetails: any = {};
      
      if (request.reservationType === 'list_entry' && request.listEntryId) {
        const [entry] = await db.select().from(listEntries).where(eq(listEntries.id, request.listEntryId));
        if (entry) {
          reservationDetails = {
            guestName: `${entry.firstName} ${entry.lastName}`,
            phone: entry.phone,
            email: entry.email,
          };
          // Get list name
          const [list] = await db.select().from(eventLists).where(eq(eventLists.id, entry.listId));
          if (list) {
            reservationDetails.listName = list.name;
          }
        }
      } else if (request.reservationType === 'table_reservation' && request.tableReservationId) {
        const [reservation] = await db.select().from(tableReservations).where(eq(tableReservations.id, request.tableReservationId));
        if (reservation) {
          reservationDetails = {
            reservationName: reservation.reservationName,
            phone: reservation.reservationPhone,
          };
        }
      }
      
      // Get requester info
      let requesterName = '';
      if (request.requestedByPrProfileId) {
        const [pr] = await db.select().from(prProfiles).where(eq(prProfiles.id, request.requestedByPrProfileId));
        if (pr) {
          requesterName = pr.displayName || `${pr.firstName} ${pr.lastName}`;
        }
      } else if (request.requestedByUserId) {
        const [reqUser] = await db.select().from(users).where(eq(users.id, request.requestedByUserId));
        if (reqUser) {
          requesterName = reqUser.firstName && reqUser.lastName 
            ? `${reqUser.firstName} ${reqUser.lastName}` 
            : (reqUser.email || '');
        }
      }
      
      return {
        ...request,
        reservationDetails,
        requesterName,
      };
    }));
    
    res.json(enrichedRequests);
  } catch (error: any) {
    console.error("Error getting gestore cancellation requests:", error);
    res.status(500).json({ error: error.message });
  }
});

// Gestore approves or rejects a cancellation request
router.post("/api/gestore/cancellation-requests/:id/process", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { action, processedNote } = req.body; // action: 'approve' or 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Azione non valida. Usa 'approve' o 'reject'" });
    }
    
    // Get the request
    const [request] = await db.select().from(cancellationRequests).where(
      and(
        eq(cancellationRequests.id, id),
        eq(cancellationRequests.companyId, user.companyId)
      )
    );
    
    if (!request) {
      return res.status(404).json({ error: "Richiesta non trovata" });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Questa richiesta è già stata elaborata" });
    }
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // Update the request
    await db.update(cancellationRequests)
      .set({
        status: newStatus,
        processedAt: new Date(),
        processedByUserId: user.id,
        processedNote,
      })
      .where(eq(cancellationRequests.id, id));
    
    // If approved, update the original reservation status
    if (action === 'approve') {
      if (request.reservationType === 'list_entry' && request.listEntryId) {
        await db.update(listEntries)
          .set({ status: 'cancelled' })
          .where(eq(listEntries.id, request.listEntryId));
      } else if (request.reservationType === 'table_reservation' && request.tableReservationId) {
        await db.update(tableReservations)
          .set({ status: 'cancelled' })
          .where(eq(tableReservations.id, request.tableReservationId));
      }
    }
    
    res.json({ 
      success: true, 
      message: action === 'approve' 
        ? 'Richiesta di cancellazione approvata' 
        : 'Richiesta di cancellazione rifiutata' 
    });
  } catch (error: any) {
    console.error("Error processing cancellation request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get count of pending cancellation requests for gestore dashboard
router.get("/api/gestore/cancellation-requests/count", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.query;
    
    let whereClause = and(
      eq(cancellationRequests.companyId, user.companyId),
      eq(cancellationRequests.status, 'pending')
    );
    
    if (eventId) {
      whereClause = and(whereClause, eq(cancellationRequests.eventId, eventId as string));
    }
    
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(cancellationRequests)
      .where(whereClause);
    
    res.json({ count: result?.count || 0 });
  } catch (error: any) {
    console.error("Error getting cancellation requests count:", error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle auto-approve cancellations for a list
router.patch("/api/gestore/lists/:listId/auto-approve-cancellations", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { listId } = req.params;
    const { enabled } = req.body;
    
    // Verify list belongs to gestore's company
    const [list] = await db.select().from(eventLists).where(
      and(
        eq(eventLists.id, listId),
        eq(eventLists.companyId, user.companyId)
      )
    );
    
    if (!list) {
      return res.status(404).json({ error: "Lista non trovata" });
    }
    
    await db.update(eventLists)
      .set({ autoApproveCancellations: enabled })
      .where(eq(eventLists.id, listId));
    
    res.json({ success: true, message: enabled ? 'Approvazione automatica attivata' : 'Approvazione automatica disattivata' });
  } catch (error: any) {
    console.error("Error updating auto-approve setting:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
