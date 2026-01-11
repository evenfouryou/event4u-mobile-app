// PR Module Storage Operations - Gestione Liste, Tavoli, QR
import {
  eventStaffAssignments,
  eventFloorplans,
  eventTables,
  tableBookings,
  guestLists,
  guestListEntries,
  prOtpAttempts,
  type EventStaffAssignment,
  type InsertEventStaffAssignment,
  type EventFloorplan,
  type InsertEventFloorplan,
  type EventTable,
  type InsertEventTable,
  type TableBooking,
  type InsertTableBooking,
  type GuestList,
  type InsertGuestList,
  type GuestListEntry,
  type InsertGuestListEntry,
  type PrOtpAttempt,
  type InsertPrOtpAttempt,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, lt, isNull } from "drizzle-orm";
import crypto from "crypto";

// Helper to generate unique QR codes
function generateQrCode(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

// Helper to generate OTP code
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface IPrStorage {
  // ==================== Event Staff Assignments ====================
  
  getEventStaffAssignmentsByEvent(eventId: string): Promise<EventStaffAssignment[]>;
  getEventStaffAssignmentsByCompany(companyId: string, eventId?: string): Promise<EventStaffAssignment[]>;
  getEventStaffAssignment(id: string): Promise<EventStaffAssignment | undefined>;
  getEventStaffAssignmentByUserAndEvent(userId: string, eventId: string): Promise<EventStaffAssignment | undefined>;
  createEventStaffAssignment(assignment: InsertEventStaffAssignment): Promise<EventStaffAssignment>;
  updateEventStaffAssignment(id: string, assignment: Partial<EventStaffAssignment>): Promise<EventStaffAssignment | undefined>;
  deleteEventStaffAssignment(id: string): Promise<boolean>;
  
  // ==================== Event Floorplans ====================
  
  getEventFloorplansByEvent(eventId: string): Promise<EventFloorplan[]>;
  getEventFloorplansByCompany(companyId: string): Promise<EventFloorplan[]>;
  getEventFloorplan(id: string): Promise<EventFloorplan | undefined>;
  createEventFloorplan(floorplan: InsertEventFloorplan): Promise<EventFloorplan>;
  updateEventFloorplan(id: string, floorplan: Partial<EventFloorplan>): Promise<EventFloorplan | undefined>;
  deleteEventFloorplan(id: string): Promise<boolean>;
  
  // ==================== Event Tables ====================
  
  getEventTablesByEvent(eventId: string): Promise<EventTable[]>;
  getEventTablesByFloorplan(floorplanId: string): Promise<EventTable[]>;
  getEventTablesByCompany(companyId: string): Promise<EventTable[]>;
  getEventTable(id: string): Promise<EventTable | undefined>;
  createEventTable(table: InsertEventTable): Promise<EventTable>;
  updateEventTable(id: string, table: Partial<EventTable>): Promise<EventTable | undefined>;
  deleteEventTable(id: string): Promise<boolean>;
  bulkCreateEventTables(tables: InsertEventTable[]): Promise<EventTable[]>;
  
  // ==================== Table Bookings ====================
  
  getTableBookingsByEvent(eventId: string): Promise<TableBooking[]>;
  getTableBookingsByTable(tableId: string): Promise<TableBooking[]>;
  getTableBookingsByUser(userId: string): Promise<TableBooking[]>;
  getTableBookingsByCompany(companyId: string): Promise<TableBooking[]>;
  getTableBooking(id: string): Promise<TableBooking | undefined>;
  getTableBookingByQr(qrCode: string): Promise<TableBooking | undefined>;
  createTableBooking(booking: Omit<InsertTableBooking, 'qrCode'>): Promise<TableBooking>;
  updateTableBooking(id: string, booking: Partial<TableBooking>): Promise<TableBooking | undefined>;
  deleteTableBooking(id: string): Promise<boolean>;
  markTableBookingScanned(id: string, scannedByUserId: string): Promise<TableBooking | undefined>;
  
  // ==================== Guest Lists ====================
  
  getGuestListsByEvent(eventId: string): Promise<GuestList[]>;
  getGuestListsByUser(userId: string): Promise<GuestList[]>;
  getGuestListsByCompany(companyId: string): Promise<GuestList[]>;
  getGuestList(id: string): Promise<GuestList | undefined>;
  createGuestList(list: InsertGuestList): Promise<GuestList>;
  updateGuestList(id: string, list: Partial<GuestList>): Promise<GuestList | undefined>;
  deleteGuestList(id: string): Promise<boolean>;
  closeGuestList(id: string): Promise<GuestList | undefined>;
  
  // ==================== Guest List Entries ====================
  
  getGuestListEntriesByList(guestListId: string): Promise<GuestListEntry[]>;
  getGuestListEntriesByEvent(eventId: string): Promise<GuestListEntry[]>;
  getGuestListEntriesByUser(userId: string): Promise<GuestListEntry[]>;
  getGuestListEntriesByCompany(companyId: string): Promise<GuestListEntry[]>;
  getGuestListEntry(id: string): Promise<GuestListEntry | undefined>;
  getGuestListEntryByQr(qrCode: string): Promise<GuestListEntry | undefined>;
  createGuestListEntry(entry: Omit<InsertGuestListEntry, 'qrCode'>): Promise<GuestListEntry>;
  updateGuestListEntry(id: string, entry: Partial<GuestListEntry>): Promise<GuestListEntry | undefined>;
  deleteGuestListEntry(id: string): Promise<boolean>;
  markGuestListEntryScanned(id: string, scannedByUserId: string): Promise<GuestListEntry | undefined>;
  
  // ==================== PR OTP Attempts ====================
  
  createPrOtpAttempt(phone: string, userId?: string): Promise<PrOtpAttempt>;
  getPrOtpAttempt(phone: string, otpCode: string): Promise<PrOtpAttempt | undefined>;
  markPrOtpVerified(id: string): Promise<void>;
  incrementPrOtpAttempts(id: string): Promise<void>;
  cleanupExpiredPrOtps(): Promise<void>;
}

export class PrStorage implements IPrStorage {
  // ==================== Event Staff Assignments ====================

  async getEventStaffAssignmentsByEvent(eventId: string): Promise<EventStaffAssignment[]> {
    return await db.select().from(eventStaffAssignments)
      .where(eq(eventStaffAssignments.eventId, eventId))
      .orderBy(desc(eventStaffAssignments.createdAt));
  }

  async getEventStaffAssignmentsByCompany(companyId: string, eventId?: string): Promise<EventStaffAssignment[]> {
    const conditions = eventId 
      ? and(eq(eventStaffAssignments.eventId, eventId))
      : undefined;
    
    return await db.select().from(eventStaffAssignments)
      .where(conditions)
      .orderBy(desc(eventStaffAssignments.createdAt));
  }

  async getEventStaffAssignment(id: string): Promise<EventStaffAssignment | undefined> {
    const [assignment] = await db.select().from(eventStaffAssignments)
      .where(eq(eventStaffAssignments.id, id));
    return assignment;
  }

  async getEventStaffAssignmentByUserAndEvent(userId: string, eventId: string): Promise<EventStaffAssignment | undefined> {
    const [assignment] = await db.select().from(eventStaffAssignments)
      .where(and(
        eq(eventStaffAssignments.userId, userId),
        eq(eventStaffAssignments.eventId, eventId),
        eq(eventStaffAssignments.isActive, true)
      ));
    return assignment;
  }

  async createEventStaffAssignment(assignment: InsertEventStaffAssignment): Promise<EventStaffAssignment> {
    const [created] = await db.insert(eventStaffAssignments)
      .values(assignment)
      .returning();
    return created;
  }

  async updateEventStaffAssignment(id: string, assignment: Partial<EventStaffAssignment>): Promise<EventStaffAssignment | undefined> {
    const [updated] = await db.update(eventStaffAssignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(eventStaffAssignments.id, id))
      .returning();
    return updated;
  }

  async deleteEventStaffAssignment(id: string): Promise<boolean> {
    const result = await db.delete(eventStaffAssignments)
      .where(eq(eventStaffAssignments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ==================== Event Floorplans ====================

  async getEventFloorplansByEvent(eventId: string): Promise<EventFloorplan[]> {
    return await db.select().from(eventFloorplans)
      .where(eq(eventFloorplans.eventId, eventId))
      .orderBy(desc(eventFloorplans.createdAt));
  }

  async getEventFloorplansByCompany(companyId: string): Promise<EventFloorplan[]> {
    return await db.select().from(eventFloorplans)
      .where(eq(eventFloorplans.companyId, companyId))
      .orderBy(desc(eventFloorplans.createdAt));
  }

  async getEventFloorplan(id: string): Promise<EventFloorplan | undefined> {
    const [floorplan] = await db.select().from(eventFloorplans)
      .where(eq(eventFloorplans.id, id));
    return floorplan;
  }

  async createEventFloorplan(floorplan: InsertEventFloorplan): Promise<EventFloorplan> {
    const [created] = await db.insert(eventFloorplans)
      .values(floorplan)
      .returning();
    return created;
  }

  async updateEventFloorplan(id: string, floorplan: Partial<EventFloorplan>): Promise<EventFloorplan | undefined> {
    const [updated] = await db.update(eventFloorplans)
      .set({ ...floorplan, updatedAt: new Date() })
      .where(eq(eventFloorplans.id, id))
      .returning();
    return updated;
  }

  async deleteEventFloorplan(id: string): Promise<boolean> {
    const result = await db.delete(eventFloorplans)
      .where(eq(eventFloorplans.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ==================== Event Tables ====================

  async getEventTablesByEvent(eventId: string): Promise<EventTable[]> {
    return await db.select().from(eventTables)
      .where(eq(eventTables.eventId, eventId))
      .orderBy(eventTables.name);
  }

  async getEventTablesByFloorplan(floorplanId: string): Promise<EventTable[]> {
    return await db.select().from(eventTables)
      .where(eq(eventTables.floorplanId, floorplanId))
      .orderBy(eventTables.name);
  }

  async getEventTablesByCompany(companyId: string): Promise<EventTable[]> {
    return await db.select().from(eventTables)
      .where(eq(eventTables.companyId, companyId))
      .orderBy(eventTables.name);
  }

  async getEventTable(id: string): Promise<EventTable | undefined> {
    const [table] = await db.select().from(eventTables)
      .where(eq(eventTables.id, id));
    return table;
  }

  async createEventTable(table: InsertEventTable): Promise<EventTable> {
    const [created] = await db.insert(eventTables)
      .values(table)
      .returning();
    return created;
  }

  async updateEventTable(id: string, table: Partial<EventTable>): Promise<EventTable | undefined> {
    const [updated] = await db.update(eventTables)
      .set({ ...table, updatedAt: new Date() })
      .where(eq(eventTables.id, id))
      .returning();
    return updated;
  }

  async deleteEventTable(id: string): Promise<boolean> {
    const result = await db.delete(eventTables)
      .where(eq(eventTables.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async bulkCreateEventTables(tables: InsertEventTable[]): Promise<EventTable[]> {
    if (tables.length === 0) return [];
    return await db.insert(eventTables)
      .values(tables)
      .returning();
  }

  // ==================== Table Bookings ====================

  async getTableBookingsByEvent(eventId: string): Promise<TableBooking[]> {
    return await db.select().from(tableBookings)
      .where(eq(tableBookings.eventId, eventId))
      .orderBy(desc(tableBookings.createdAt));
  }

  async getTableBookingsByTable(tableId: string): Promise<TableBooking[]> {
    return await db.select().from(tableBookings)
      .where(eq(tableBookings.tableId, tableId))
      .orderBy(desc(tableBookings.createdAt));
  }

  async getTableBookingsByUser(userId: string): Promise<TableBooking[]> {
    return await db.select().from(tableBookings)
      .where(eq(tableBookings.bookedByUserId, userId))
      .orderBy(desc(tableBookings.createdAt));
  }

  async getTableBookingsByCompany(companyId: string): Promise<TableBooking[]> {
    return await db.select().from(tableBookings)
      .where(eq(tableBookings.companyId, companyId))
      .orderBy(desc(tableBookings.createdAt));
  }

  async getTableBooking(id: string): Promise<TableBooking | undefined> {
    const [booking] = await db.select().from(tableBookings)
      .where(eq(tableBookings.id, id));
    return booking;
  }

  async getTableBookingByQr(qrCode: string): Promise<TableBooking | undefined> {
    const [booking] = await db.select().from(tableBookings)
      .where(eq(tableBookings.qrCode, qrCode));
    return booking;
  }

  async createTableBooking(booking: Omit<InsertTableBooking, 'qrCode'>): Promise<TableBooking> {
    const qrCode = generateQrCode('TB');
    const [created] = await db.insert(tableBookings)
      .values({ ...booking, qrCode })
      .returning();
    return created;
  }

  async updateTableBooking(id: string, booking: Partial<TableBooking>): Promise<TableBooking | undefined> {
    const [updated] = await db.update(tableBookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(eq(tableBookings.id, id))
      .returning();
    return updated;
  }

  async deleteTableBooking(id: string): Promise<boolean> {
    const result = await db.delete(tableBookings)
      .where(eq(tableBookings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async markTableBookingScanned(id: string, scannedByUserId: string): Promise<TableBooking | undefined> {
    const [updated] = await db.update(tableBookings)
      .set({
        qrScannedAt: new Date(),
        qrScannedByUserId: scannedByUserId,
        status: 'arrived',
        arrivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tableBookings.id, id))
      .returning();
    return updated;
  }

  // ==================== Guest Lists ====================

  async getGuestListsByEvent(eventId: string): Promise<GuestList[]> {
    return await db.select().from(guestLists)
      .where(eq(guestLists.eventId, eventId))
      .orderBy(desc(guestLists.createdAt));
  }

  async getGuestListsByUser(userId: string): Promise<GuestList[]> {
    return await db.select().from(guestLists)
      .where(eq(guestLists.createdByUserId, userId))
      .orderBy(desc(guestLists.createdAt));
  }

  async getGuestListsByCompany(companyId: string): Promise<GuestList[]> {
    return await db.select().from(guestLists)
      .where(eq(guestLists.companyId, companyId))
      .orderBy(desc(guestLists.createdAt));
  }

  async getGuestList(id: string): Promise<GuestList | undefined> {
    const [list] = await db.select().from(guestLists)
      .where(eq(guestLists.id, id));
    return list;
  }

  async createGuestList(list: InsertGuestList): Promise<GuestList> {
    const [created] = await db.insert(guestLists)
      .values(list)
      .returning();
    return created;
  }

  async updateGuestList(id: string, list: Partial<GuestList>): Promise<GuestList | undefined> {
    const [updated] = await db.update(guestLists)
      .set({ ...list, updatedAt: new Date() })
      .where(eq(guestLists.id, id))
      .returning();
    return updated;
  }

  async deleteGuestList(id: string): Promise<boolean> {
    const result = await db.delete(guestLists)
      .where(eq(guestLists.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async closeGuestList(id: string): Promise<GuestList | undefined> {
    const [updated] = await db.update(guestLists)
      .set({
        isActive: false,
        closedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(guestLists.id, id))
      .returning();
    return updated;
  }

  // ==================== Guest List Entries ====================

  async getGuestListEntriesByList(guestListId: string): Promise<GuestListEntry[]> {
    return await db.select().from(guestListEntries)
      .where(eq(guestListEntries.guestListId, guestListId))
      .orderBy(desc(guestListEntries.createdAt));
  }

  async getGuestListEntriesByEvent(eventId: string): Promise<GuestListEntry[]> {
    return await db.select().from(guestListEntries)
      .where(eq(guestListEntries.eventId, eventId))
      .orderBy(desc(guestListEntries.createdAt));
  }

  async getGuestListEntriesByUser(userId: string): Promise<GuestListEntry[]> {
    return await db.select().from(guestListEntries)
      .where(eq(guestListEntries.addedByUserId, userId))
      .orderBy(desc(guestListEntries.createdAt));
  }

  async getGuestListEntriesByCompany(companyId: string): Promise<GuestListEntry[]> {
    return await db.select().from(guestListEntries)
      .where(eq(guestListEntries.companyId, companyId))
      .orderBy(desc(guestListEntries.createdAt));
  }

  async getGuestListEntry(id: string): Promise<GuestListEntry | undefined> {
    const [entry] = await db.select().from(guestListEntries)
      .where(eq(guestListEntries.id, id));
    return entry;
  }

  async getGuestListEntryByQr(qrCode: string): Promise<GuestListEntry | undefined> {
    const [entry] = await db.select().from(guestListEntries)
      .where(eq(guestListEntries.qrCode, qrCode));
    return entry;
  }

  async createGuestListEntry(entry: Omit<InsertGuestListEntry, 'qrCode'>): Promise<GuestListEntry> {
    const qrCode = generateQrCode('GL');
    const [created] = await db.insert(guestListEntries)
      .values({ ...entry, qrCode })
      .returning();
    
    // Increment the guest list count
    await db.update(guestLists)
      .set({ 
        currentCount: sql`${guestLists.currentCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(guestLists.id, entry.guestListId));
    
    return created;
  }

  async updateGuestListEntry(id: string, entry: Partial<GuestListEntry>): Promise<GuestListEntry | undefined> {
    const [updated] = await db.update(guestListEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(guestListEntries.id, id))
      .returning();
    return updated;
  }

  async deleteGuestListEntry(id: string): Promise<boolean> {
    // Get entry to decrement count
    const [entry] = await db.select().from(guestListEntries)
      .where(eq(guestListEntries.id, id));
    
    if (entry) {
      // Decrement the guest list count
      await db.update(guestLists)
        .set({ 
          currentCount: sql`GREATEST(0, ${guestLists.currentCount} - 1)`,
          updatedAt: new Date() 
        })
        .where(eq(guestLists.id, entry.guestListId));
    }
    
    const result = await db.delete(guestListEntries)
      .where(eq(guestListEntries.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async markGuestListEntryScanned(id: string, scannedByUserId: string): Promise<GuestListEntry | undefined> {
    const [updated] = await db.update(guestListEntries)
      .set({
        qrScannedAt: new Date(),
        qrScannedByUserId: scannedByUserId,
        status: 'arrived',
        arrivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(guestListEntries.id, id))
      .returning();
    return updated;
  }

  // ==================== PR OTP Attempts ====================

  async createPrOtpAttempt(phone: string, userId?: string): Promise<PrOtpAttempt> {
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const [created] = await db.insert(prOtpAttempts)
      .values({
        phone,
        userId: userId || null,
        otpCode,
        purpose: 'login',
        status: 'pending',
        expiresAt,
      })
      .returning();
    return created;
  }

  async getPrOtpAttempt(phone: string, otpCode: string): Promise<PrOtpAttempt | undefined> {
    const [attempt] = await db.select().from(prOtpAttempts)
      .where(and(
        eq(prOtpAttempts.phone, phone),
        eq(prOtpAttempts.otpCode, otpCode),
        eq(prOtpAttempts.status, 'pending')
      ))
      .orderBy(desc(prOtpAttempts.createdAt));
    return attempt;
  }

  async markPrOtpVerified(id: string): Promise<void> {
    await db.update(prOtpAttempts)
      .set({
        status: 'verified',
        verifiedAt: new Date()
      })
      .where(eq(prOtpAttempts.id, id));
  }

  async incrementPrOtpAttempts(id: string): Promise<void> {
    await db.update(prOtpAttempts)
      .set({
        attemptsCount: sql`${prOtpAttempts.attemptsCount} + 1`
      })
      .where(eq(prOtpAttempts.id, id));
  }

  async cleanupExpiredPrOtps(): Promise<void> {
    await db.update(prOtpAttempts)
      .set({ status: 'expired' })
      .where(and(
        eq(prOtpAttempts.status, 'pending'),
        lt(prOtpAttempts.expiresAt, new Date())
      ));
  }
}

export const prStorage = new PrStorage();
