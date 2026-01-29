// PR Module Storage Operations - Gestione Liste, Tavoli, QR
import {
  eventStaffAssignments,
  eventFloorplans,
  eventTables,
  tableBookings,
  tableBookingParticipants,
  eventLists,
  listEntries,
  prOtpAttempts,
  users,
  siaeCustomers,
  type EventStaffAssignment,
  type InsertEventStaffAssignment,
  type EventFloorplan,
  type InsertEventFloorplan,
  type EventTable,
  type InsertEventTable,
  type TableBooking,
  type InsertTableBooking,
  type TableBookingParticipant,
  type InsertTableBookingParticipant,
  type EventList,
  type InsertEventList,
  type ListEntry,
  type InsertListEntry,
  type PrOtpAttempt,
  type InsertPrOtpAttempt,
} from "@shared/schema";
import { getPhoneVariants, normalizePhone } from "./phone-utils";

// Type aliases for backward compatibility
type GuestList = EventList;
type InsertGuestList = InsertEventList;
type GuestListEntry = ListEntry;
type InsertGuestListEntry = InsertListEntry;
import { db } from "./db";
import { eq, and, desc, sql, lt, isNull } from "drizzle-orm";
import crypto from "crypto";

// Helper to generate unique QR codes in E4U format compatible with /api/e4u/scan
function generateQrCode(type: 'LST' | 'TBL'): string {
  const id = crypto.randomUUID();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `E4U-${type}-${id.substring(0, 8)}-${random}`;
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
  approveTableBooking(id: string, approvedByUserId: string): Promise<TableBooking | undefined>;
  rejectTableBooking(id: string, approvedByUserId: string, reason: string): Promise<TableBooking | undefined>;
  getBookingsPendingApproval(companyId: string): Promise<TableBooking[]>;
  
  // ==================== Table Booking Participants ====================
  
  getParticipantsByBooking(bookingId: string): Promise<TableBookingParticipant[]>;
  getParticipantsByEvent(eventId: string): Promise<TableBookingParticipant[]>;
  getParticipant(id: string): Promise<TableBookingParticipant | undefined>;
  getParticipantByQr(qrCode: string): Promise<TableBookingParticipant | undefined>;
  getParticipantsByPhone(phone: string): Promise<TableBookingParticipant[]>;
  createParticipant(participant: Omit<InsertTableBookingParticipant, 'qrCode'>): Promise<TableBookingParticipant>;
  createParticipantsBatch(participants: Omit<InsertTableBookingParticipant, 'qrCode'>[]): Promise<TableBookingParticipant[]>;
  updateParticipant(id: string, data: Partial<TableBookingParticipant>): Promise<TableBookingParticipant | undefined>;
  deleteParticipant(id: string): Promise<boolean>;
  markParticipantScanned(id: string, scannedByUserId: string): Promise<TableBookingParticipant | undefined>;
  linkParticipantToUser(id: string, userId: string): Promise<TableBookingParticipant | undefined>;
  markParticipantNotified(id: string, method: string): Promise<TableBookingParticipant | undefined>;
  
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
  createGuestListEntriesBatch(entries: Omit<InsertGuestListEntry, 'qrCode'>[]): Promise<GuestListEntry[]>;
  updateGuestListEntry(id: string, entry: Partial<GuestListEntry>): Promise<GuestListEntry | undefined>;
  deleteGuestListEntry(id: string): Promise<boolean>;
  markGuestListEntryScanned(id: string, scannedByUserId: string): Promise<GuestListEntry | undefined>;
  findUserByPhone(phone: string): Promise<{ id: string } | undefined>;
  generateMissingQrCode(entryId: string): Promise<GuestListEntry | undefined>;
  
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
    const qrCode = generateQrCode('TBL');
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

  async approveTableBooking(id: string, approvedByUserId: string): Promise<TableBooking | undefined> {
    const [updated] = await db.update(tableBookings)
      .set({
        approvalStatus: 'approved',
        approvedByUserId,
        approvedAt: new Date(),
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tableBookings.id, id))
      .returning();
    return updated;
  }

  async rejectTableBooking(id: string, approvedByUserId: string, reason: string): Promise<TableBooking | undefined> {
    const [updated] = await db.update(tableBookings)
      .set({
        approvalStatus: 'rejected',
        approvedByUserId,
        approvedAt: new Date(),
        rejectionReason: reason,
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(tableBookings.id, id))
      .returning();
    return updated;
  }

  async getBookingsPendingApproval(companyId: string): Promise<TableBooking[]> {
    return await db.select().from(tableBookings)
      .where(and(
        eq(tableBookings.companyId, companyId),
        eq(tableBookings.approvalStatus, 'pending_approval')
      ))
      .orderBy(desc(tableBookings.createdAt));
  }

  // ==================== Table Booking Participants ====================

  async getParticipantsByBooking(bookingId: string): Promise<TableBookingParticipant[]> {
    return await db.select().from(tableBookingParticipants)
      .where(eq(tableBookingParticipants.bookingId, bookingId))
      .orderBy(desc(tableBookingParticipants.createdAt));
  }

  async getParticipantsByEvent(eventId: string): Promise<TableBookingParticipant[]> {
    return await db.select().from(tableBookingParticipants)
      .where(eq(tableBookingParticipants.eventId, eventId))
      .orderBy(desc(tableBookingParticipants.createdAt));
  }

  async getParticipant(id: string): Promise<TableBookingParticipant | undefined> {
    const [participant] = await db.select().from(tableBookingParticipants)
      .where(eq(tableBookingParticipants.id, id));
    return participant;
  }

  async getParticipantByQr(qrCode: string): Promise<TableBookingParticipant | undefined> {
    const [participant] = await db.select().from(tableBookingParticipants)
      .where(eq(tableBookingParticipants.qrCode, qrCode));
    return participant;
  }

  async getParticipantsByPhone(phone: string): Promise<TableBookingParticipant[]> {
    return await db.select().from(tableBookingParticipants)
      .where(eq(tableBookingParticipants.phone, phone))
      .orderBy(desc(tableBookingParticipants.createdAt));
  }

  async createParticipant(participant: Omit<InsertTableBookingParticipant, 'qrCode'>): Promise<TableBookingParticipant> {
    const qrCode = generateQrCode('TBL');
    const [created] = await db.insert(tableBookingParticipants)
      .values({ ...participant, qrCode })
      .returning();
    return created;
  }

  async createParticipantsBatch(participants: Omit<InsertTableBookingParticipant, 'qrCode'>[]): Promise<TableBookingParticipant[]> {
    if (participants.length === 0) return [];
    const withQr = participants.map(p => ({
      ...p,
      qrCode: generateQrCode('TBL')
    }));
    return await db.insert(tableBookingParticipants)
      .values(withQr)
      .returning();
  }

  async updateParticipant(id: string, data: Partial<TableBookingParticipant>): Promise<TableBookingParticipant | undefined> {
    const [updated] = await db.update(tableBookingParticipants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tableBookingParticipants.id, id))
      .returning();
    return updated;
  }

  async deleteParticipant(id: string): Promise<boolean> {
    const result = await db.delete(tableBookingParticipants)
      .where(eq(tableBookingParticipants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async markParticipantScanned(id: string, scannedByUserId: string): Promise<TableBookingParticipant | undefined> {
    const [updated] = await db.update(tableBookingParticipants)
      .set({
        qrScannedAt: new Date(),
        qrScannedByUserId: scannedByUserId,
        status: 'arrived',
        arrivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tableBookingParticipants.id, id))
      .returning();
    return updated;
  }

  async linkParticipantToUser(id: string, userId: string): Promise<TableBookingParticipant | undefined> {
    const [updated] = await db.update(tableBookingParticipants)
      .set({ linkedUserId: userId, updatedAt: new Date() })
      .where(eq(tableBookingParticipants.id, id))
      .returning();
    return updated;
  }

  async markParticipantNotified(id: string, method: string): Promise<TableBookingParticipant | undefined> {
    const [updated] = await db.update(tableBookingParticipants)
      .set({
        notificationSentAt: new Date(),
        notificationMethod: method,
        updatedAt: new Date()
      })
      .where(eq(tableBookingParticipants.id, id))
      .returning();
    return updated;
  }

  // ==================== Guest Lists ====================

  async getGuestListsByEvent(eventId: string): Promise<GuestList[]> {
    return await db.select().from(eventLists)
      .where(eq(eventLists.eventId, eventId))
      .orderBy(desc(eventLists.createdAt));
  }

  async getGuestListsByUser(userId: string): Promise<GuestList[]> {
    return await db.select().from(eventLists)
      .where(eq(eventLists.createdByUserId, userId))
      .orderBy(desc(eventLists.createdAt));
  }

  async getGuestListsByCompany(companyId: string): Promise<GuestList[]> {
    return await db.select().from(eventLists)
      .where(eq(eventLists.companyId, companyId))
      .orderBy(desc(eventLists.createdAt));
  }

  async getGuestList(id: string): Promise<GuestList | undefined> {
    const [list] = await db.select().from(eventLists)
      .where(eq(eventLists.id, id));
    return list;
  }

  async createGuestList(list: InsertGuestList): Promise<GuestList> {
    const [created] = await db.insert(eventLists)
      .values(list)
      .returning();
    return created;
  }

  async updateGuestList(id: string, list: Partial<GuestList>): Promise<GuestList | undefined> {
    const [updated] = await db.update(eventLists)
      .set({ ...list, updatedAt: new Date() })
      .where(eq(eventLists.id, id))
      .returning();
    return updated;
  }

  async deleteGuestList(id: string): Promise<boolean> {
    const result = await db.delete(eventLists)
      .where(eq(eventLists.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async closeGuestList(id: string): Promise<GuestList | undefined> {
    const [updated] = await db.update(eventLists)
      .set({
        isActive: false,
        closedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(eventLists.id, id))
      .returning();
    return updated;
  }

  // ==================== Guest List Entries ====================

  async getGuestListEntriesByList(guestListId: string): Promise<GuestListEntry[]> {
    return await db.select().from(listEntries)
      .where(eq(listEntries.listId, guestListId))
      .orderBy(desc(listEntries.createdAt));
  }

  async getGuestListEntriesByEvent(eventId: string): Promise<GuestListEntry[]> {
    return await db.select().from(listEntries)
      .where(eq(listEntries.eventId, eventId))
      .orderBy(desc(listEntries.createdAt));
  }

  async getGuestListEntriesByUser(userId: string): Promise<GuestListEntry[]> {
    return await db.select().from(listEntries)
      .where(eq(listEntries.addedByUserId, userId))
      .orderBy(desc(listEntries.createdAt));
  }

  async getGuestListEntriesByCompany(companyId: string): Promise<GuestListEntry[]> {
    return await db.select().from(listEntries)
      .where(eq(listEntries.companyId, companyId))
      .orderBy(desc(listEntries.createdAt));
  }

  async getGuestListEntry(id: string): Promise<GuestListEntry | undefined> {
    const [entry] = await db.select().from(listEntries)
      .where(eq(listEntries.id, id));
    return entry;
  }

  async getGuestListEntryByQr(qrCode: string): Promise<GuestListEntry | undefined> {
    const [entry] = await db.select().from(listEntries)
      .where(eq(listEntries.qrCode, qrCode));
    return entry;
  }

  async createGuestListEntry(entry: Omit<InsertGuestListEntry, 'qrCode'>): Promise<GuestListEntry> {
    const qrCode = generateQrCode('LST');
    
    // Try to match phone number with registered customers
    let customerId: string | undefined = undefined;
    if (entry.phone) {
      const phoneVariants = getPhoneVariants(entry.phone);
      console.log(`[PR-Storage] Matching phone variants for ${entry.phone}:`, phoneVariants);
      
      // Search for customer with matching phone
      for (const variant of phoneVariants) {
        const [customer] = await db.select({ id: siaeCustomers.id, phone: siaeCustomers.phone })
          .from(siaeCustomers)
          .where(eq(siaeCustomers.phone, variant))
          .limit(1);
        
        if (customer) {
          customerId = customer.id;
          console.log(`[PR-Storage] Matched customer ${customerId} with phone ${customer.phone}`);
          break;
        }
      }
      
      // Also try normalized matching
      if (!customerId) {
        const normalizedInput = normalizePhone(entry.phone);
        const allCustomers = await db.select({ id: siaeCustomers.id, phone: siaeCustomers.phone })
          .from(siaeCustomers)
          .where(sql`${siaeCustomers.phone} IS NOT NULL`);
        
        for (const customer of allCustomers) {
          if (customer.phone && normalizePhone(customer.phone) === normalizedInput) {
            customerId = customer.id;
            console.log(`[PR-Storage] Matched customer ${customerId} via normalized phone`);
            break;
          }
        }
      }
    }
    
    const [created] = await db.insert(listEntries)
      .values({ ...entry, qrCode, customerId })
      .returning();
    
    // Increment the guest list count
    await db.update(eventLists)
      .set({ 
        currentCount: sql`${eventLists.currentCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(eventLists.id, entry.listId));
    
    return created;
  }

  async createGuestListEntriesBatch(entries: Omit<InsertGuestListEntry, 'qrCode'>[]): Promise<GuestListEntry[]> {
    if (entries.length === 0) return [];
    
    // Preload all customers for phone matching (more efficient for batch)
    const allCustomers = await db.select({ id: siaeCustomers.id, phone: siaeCustomers.phone })
      .from(siaeCustomers)
      .where(sql`${siaeCustomers.phone} IS NOT NULL`);
    
    const withQrAndCustomer = entries.map(e => {
      let customerId: string | undefined = undefined;
      
      if (e.phone) {
        const phoneVariants = getPhoneVariants(e.phone);
        const normalizedInput = normalizePhone(e.phone);
        
        // Try to match with registered customers
        for (const customer of allCustomers) {
          if (!customer.phone) continue;
          
          // Check if any variant matches
          if (phoneVariants.includes(customer.phone) || 
              normalizePhone(customer.phone) === normalizedInput) {
            customerId = customer.id;
            console.log(`[PR-Storage Batch] Matched ${e.firstName} ${e.lastName} phone ${e.phone} to customer ${customerId}`);
            break;
          }
        }
      }
      
      return {
        ...e,
        qrCode: generateQrCode('LST'),
        customerId
      };
    });
    
    const created = await db.insert(listEntries)
      .values(withQrAndCustomer)
      .returning();
    
    // Note: List count update should be handled by the caller 
    // to avoid multiple updates for the same list
    
    return created;
  }

  async updateGuestListEntry(id: string, entry: Partial<GuestListEntry>): Promise<GuestListEntry | undefined> {
    const [updated] = await db.update(listEntries)
      .set({ ...entry })
      .where(eq(listEntries.id, id))
      .returning();
    return updated;
  }

  async deleteGuestListEntry(id: string): Promise<boolean> {
    // Get entry to decrement count
    const [entry] = await db.select().from(listEntries)
      .where(eq(listEntries.id, id));
    
    if (entry) {
      // Decrement the guest list count
      await db.update(eventLists)
        .set({ 
          currentCount: sql`GREATEST(0, ${eventLists.currentCount} - 1)`,
          updatedAt: new Date() 
        })
        .where(eq(eventLists.id, entry.listId));
    }
    
    const result = await db.delete(listEntries)
      .where(eq(listEntries.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async markGuestListEntryScanned(id: string, scannedByUserId: string): Promise<GuestListEntry | undefined> {
    const [updated] = await db.update(listEntries)
      .set({
        qrScannedAt: new Date(),
        qrScannedByUserId: scannedByUserId,
        status: 'arrived',
        checkedInAt: new Date()
      })
      .where(eq(listEntries.id, id))
      .returning();
    return updated;
  }

  async findUserByPhone(phone: string): Promise<{ id: string } | undefined> {
    const [user] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    return user;
  }

  async generateMissingQrCode(entryId: string): Promise<GuestListEntry | undefined> {
    const [entry] = await db.select().from(listEntries)
      .where(eq(listEntries.id, entryId))
      .limit(1);
    
    if (!entry) return undefined;
    if (entry.qrCode) return entry; // Already has QR code
    
    const qrCode = generateQrCode('LST');
    const [updated] = await db.update(listEntries)
      .set({ qrCode })
      .where(eq(listEntries.id, entryId))
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
