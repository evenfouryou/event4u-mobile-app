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
  insertGuestListSchema,
  insertGuestListEntrySchema,
  siaeCustomers,
  eventPrAssignments,
  users,
  events,
  prProfiles,
  companies,
} from "@shared/schema";
import { z } from "zod";
import { like, or, eq, and, desc, isNull } from "drizzle-orm";

const router = Router();

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  next();
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
function requirePr(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['gestore', 'gestore_covisione', 'capo_staff', 'pr', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ error: "Accesso negato. Richiesto ruolo PR." });
  }
  next();
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

// Get my assignments (for PR users)
router.get("/api/pr/my-assignments", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const assignments = await prStorage.getEventStaffAssignmentsByUser(user.id);
    res.json(assignments);
  } catch (error: any) {
    console.error("Error getting my assignments:", error);
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
router.get("/api/pr/events/:eventId/guest-lists", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const lists = await prStorage.getGuestListsByEvent(eventId);
    res.json(lists);
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
    const validated = insertGuestListSchema.parse({
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
router.patch("/api/pr/guest-lists/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prStorage.updateGuestList(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Lista non trovata" });
    }
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
router.get("/api/pr/guest-lists/:listId/entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    const entries = await prStorage.getGuestListEntriesByList(listId);
    res.json(entries);
  } catch (error: any) {
    console.error("Error getting guest list entries:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get entries for an event (all lists)
router.get("/api/pr/events/:eventId/guest-entries", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const entries = await prStorage.getGuestListEntriesByEvent(eventId);
    res.json(entries);
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
    
    // Check max guests
    if (list.maxGuests && list.currentCount >= list.maxGuests) {
      return res.status(400).json({ error: "Lista piena" });
    }
    
    const validated = insertGuestListEntrySchema.omit({ qrCode: true }).parse({
      ...req.body,
      guestListId: listId,
      eventId: list.eventId,
      companyId: list.companyId,
      addedByUserId: user.id,
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
router.patch("/api/pr/guest-entries/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prStorage.updateGuestListEntry(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Ospite non trovato" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating guest list entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete guest list entry
router.delete("/api/pr/guest-entries/:id", requireAuth, requirePr, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await prStorage.deleteGuestListEntry(id);
    if (!deleted) {
      return res.status(404).json({ error: "Ospite non trovato" });
    }
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
        totalCapacity: guestListsData.reduce((sum, l) => sum + (l.maxGuests || 0), 0),
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
            updatedAt: new Date() 
          })
          .where(eq(eventPrAssignments.id, existing[0].id))
          .returning();
        return res.json(updated);
      }
      return res.status(409).json({ error: "PR già assegnato a questo evento" });
    }
    
    // Create new assignment using prProfileId (new column)
    const [assignment] = await db.insert(eventPrAssignments).values({
      eventId,
      prProfileId: prUserId, // Store in the new column
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
    
    // Get all active PR profiles that belong to the same company
    // By default, exclude Staff (isStaff=true) unless includeStaff=true
    // NOTE: isStaff can be NULL for old profiles, treat NULL as false (regular PR)
    const whereConditions = [
      eq(prProfiles.isActive, true),
    ];
    
    if (user.role !== 'super_admin') {
      whereConditions.push(eq(prProfiles.companyId, user.companyId));
    }
    
    let prProfilesList;
    
    if (includeStaff) {
      // Include all (both PR and Staff)
      prProfilesList = await db
        .select({
          id: prProfiles.id,
          firstName: prProfiles.firstName,
          lastName: prProfiles.lastName,
          email: prProfiles.email,
          phone: prProfiles.phone,
          prCode: prProfiles.prCode,
          displayName: prProfiles.displayName,
          isStaff: prProfiles.isStaff,
        })
        .from(prProfiles)
        .where(and(...whereConditions))
        .orderBy(prProfiles.lastName, prProfiles.firstName);
    } else {
      // Exclude Staff: isStaff=false OR isStaff IS NULL (old profiles without the field)
      prProfilesList = await db
        .select({
          id: prProfiles.id,
          firstName: prProfiles.firstName,
          lastName: prProfiles.lastName,
          email: prProfiles.email,
          phone: prProfiles.phone,
          prCode: prProfiles.prCode,
          displayName: prProfiles.displayName,
          isStaff: prProfiles.isStaff,
        })
        .from(prProfiles)
        .where(and(
          ...whereConditions,
          or(
            eq(prProfiles.isStaff, false),
            isNull(prProfiles.isStaff)
          )
        ))
        .orderBy(prProfiles.lastName, prProfiles.firstName);
    }
    
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

export default router;
