// SIAE Module Storage Operations
import {
  siaeEventGenres,
  siaeSectorCodes,
  siaeTicketTypes,
  siaeServiceCodes,
  siaeCancellationReasons,
  siaeActivationCards,
  siaeEmissionChannels,
  siaeSystemConfig,
  siaeCustomers,
  siaeOtpAttempts,
  siaeTicketedEvents,
  siaeEventSectors,
  siaeSeats,
  siaeFiscalSeals,
  siaeTickets,
  siaeTransactions,
  siaeNameChanges,
  siaeResales,
  siaeLogs,
  siaeTransmissions,
  siaeBoxOfficeSessions,
  siaeSubscriptions,
  siaeAuditLogs,
  siaeNumberedSeats,
  siaeSmartCardSessions,
  siaeSmartCardSealLogs,
  siaeCashierAllocations,
  siaeTicketAudit,
  type SiaeEventGenre,
  type InsertSiaeEventGenre,
  type SiaeSectorCode,
  type InsertSiaeSectorCode,
  type SiaeTicketType,
  type InsertSiaeTicketType,
  type SiaeServiceCode,
  type InsertSiaeServiceCode,
  type SiaeCancellationReason,
  type InsertSiaeCancellationReason,
  type SiaeActivationCard,
  type InsertSiaeActivationCard,
  type SiaeEmissionChannel,
  type InsertSiaeEmissionChannel,
  type SiaeSystemConfig,
  type InsertSiaeSystemConfig,
  type SiaeCustomer,
  type InsertSiaeCustomer,
  type SiaeOtpAttempt,
  type InsertSiaeOtpAttempt,
  type SiaeTicketedEvent,
  type InsertSiaeTicketedEvent,
  type SiaeEventSector,
  type InsertSiaeEventSector,
  type SiaeSeat,
  type InsertSiaeSeat,
  type SiaeFiscalSeal,
  type InsertSiaeFiscalSeal,
  type SiaeTicket,
  type InsertSiaeTicket,
  type SiaeTransaction,
  type InsertSiaeTransaction,
  type SiaeNameChange,
  type InsertSiaeNameChange,
  type SiaeResale,
  type InsertSiaeResale,
  type SiaeLog,
  type InsertSiaeLog,
  type SiaeTransmission,
  type InsertSiaeTransmission,
  type SiaeBoxOfficeSession,
  type InsertSiaeBoxOfficeSession,
  type SiaeSubscription,
  type InsertSiaeSubscription,
  type SiaeAuditLog,
  type InsertSiaeAuditLog,
  type SiaeNumberedSeat,
  type InsertSiaeNumberedSeat,
  type SiaeSmartCardSession,
  type InsertSiaeSmartCardSession,
  type SiaeSmartCardSealLog,
  type InsertSiaeSmartCardSealLog,
  type SiaeCashierAllocation,
  type InsertSiaeCashierAllocation,
  type SiaeTicketAudit,
  type InsertSiaeTicketAudit,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, lt, gt, isNull, count } from "drizzle-orm";
import { users, events, companies } from "@shared/schema";

export interface ISiaeStorage {
  // ==================== TAB.1-5 Reference Tables ====================
  
  getSiaeEventGenres(): Promise<SiaeEventGenre[]>;
  getSiaeEventGenre(code: string): Promise<SiaeEventGenre | undefined>;
  createSiaeEventGenre(genre: InsertSiaeEventGenre): Promise<SiaeEventGenre>;
  updateSiaeEventGenre(code: string, genre: Partial<SiaeEventGenre>): Promise<SiaeEventGenre | undefined>;
  
  getSiaeSectorCodes(): Promise<SiaeSectorCode[]>;
  getSiaeSectorCode(code: string): Promise<SiaeSectorCode | undefined>;
  createSiaeSectorCode(sector: InsertSiaeSectorCode): Promise<SiaeSectorCode>;
  updateSiaeSectorCode(code: string, sector: Partial<SiaeSectorCode>): Promise<SiaeSectorCode | undefined>;
  
  getSiaeTicketTypes(): Promise<SiaeTicketType[]>;
  getSiaeTicketType(code: string): Promise<SiaeTicketType | undefined>;
  createSiaeTicketType(ticketType: InsertSiaeTicketType): Promise<SiaeTicketType>;
  updateSiaeTicketType(code: string, ticketType: Partial<SiaeTicketType>): Promise<SiaeTicketType | undefined>;
  
  getSiaeServiceCodes(): Promise<SiaeServiceCode[]>;
  getSiaeServiceCode(code: string): Promise<SiaeServiceCode | undefined>;
  createSiaeServiceCode(service: InsertSiaeServiceCode): Promise<SiaeServiceCode>;
  updateSiaeServiceCode(code: string, service: Partial<SiaeServiceCode>): Promise<SiaeServiceCode | undefined>;
  
  getSiaeCancellationReasons(): Promise<SiaeCancellationReason[]>;
  getSiaeCancellationReason(code: string): Promise<SiaeCancellationReason | undefined>;
  createSiaeCancellationReason(reason: InsertSiaeCancellationReason): Promise<SiaeCancellationReason>;
  updateSiaeCancellationReason(code: string, reason: Partial<SiaeCancellationReason>): Promise<SiaeCancellationReason | undefined>;
  
  // ==================== Activation Cards ====================
  
  getSiaeActivationCards(): Promise<SiaeActivationCard[]>;
  getSiaeActivationCardsByCompany(companyId: string): Promise<SiaeActivationCard[]>;
  getSiaeActivationCard(id: string): Promise<SiaeActivationCard | undefined>;
  getSiaeActivationCardByCode(cardCode: string): Promise<SiaeActivationCard | undefined>;
  createSiaeActivationCard(card: InsertSiaeActivationCard): Promise<SiaeActivationCard>;
  updateSiaeActivationCard(id: string, card: Partial<SiaeActivationCard>): Promise<SiaeActivationCard | undefined>;
  
  // ==================== Emission Channels ====================
  
  getSiaeEmissionChannelsByCompany(companyId: string): Promise<SiaeEmissionChannel[]>;
  getSiaeEmissionChannel(id: string): Promise<SiaeEmissionChannel | undefined>;
  getSiaeEmissionChannelByCode(channelCode: string, companyId: string): Promise<SiaeEmissionChannel | undefined>;
  createSiaeEmissionChannel(channel: InsertSiaeEmissionChannel): Promise<SiaeEmissionChannel>;
  updateSiaeEmissionChannel(id: string, channel: Partial<SiaeEmissionChannel>): Promise<SiaeEmissionChannel | undefined>;
  
  // ==================== System Configuration ====================
  
  getSiaeSystemConfig(companyId: string): Promise<SiaeSystemConfig | undefined>;
  upsertSiaeSystemConfig(config: InsertSiaeSystemConfig): Promise<SiaeSystemConfig>;
  getGlobalSiaeSystemConfig(): Promise<SiaeSystemConfig | undefined>;
  upsertGlobalSiaeSystemConfig(config: InsertSiaeSystemConfig): Promise<SiaeSystemConfig>;
  
  // ==================== Customers ====================
  
  getSiaeCustomers(): Promise<SiaeCustomer[]>;
  getSiaeCustomer(id: string): Promise<SiaeCustomer | undefined>;
  getSiaeCustomerByPhone(phone: string): Promise<SiaeCustomer | undefined>;
  getSiaeCustomerByEmail(email: string): Promise<SiaeCustomer | undefined>;
  getSiaeCustomerByUniqueCode(uniqueCode: string): Promise<SiaeCustomer | undefined>;
  getSiaeCustomerByUserId(userId: string): Promise<SiaeCustomer | undefined>;
  createSiaeCustomer(customer: InsertSiaeCustomer): Promise<SiaeCustomer>;
  updateSiaeCustomer(id: string, customer: Partial<SiaeCustomer>): Promise<SiaeCustomer | undefined>;
  deleteSiaeCustomer(id: string): Promise<boolean>;
  
  // ==================== OTP Attempts ====================
  
  createSiaeOtpAttempt(attempt: InsertSiaeOtpAttempt): Promise<SiaeOtpAttempt>;
  getSiaeOtpAttempt(phone: string, otpCode: string): Promise<SiaeOtpAttempt | undefined>;
  markSiaeOtpVerified(id: string): Promise<void>;
  markSiaeOtpVerifiedByPhone(phone: string): Promise<void>;
  cleanupExpiredOtps(): Promise<void>;
  
  // ==================== Ticketed Events ====================
  
  getSiaeTicketedEventsByCompany(companyId: string): Promise<SiaeTicketedEvent[]>;
  getAllSiaeTicketedEventsAdmin(): Promise<any[]>;
  getSiaeTicketedEvent(id: string): Promise<SiaeTicketedEvent | undefined>;
  getSiaeTicketedEventByEventId(eventId: string): Promise<SiaeTicketedEvent | undefined>;
  createSiaeTicketedEvent(event: InsertSiaeTicketedEvent): Promise<SiaeTicketedEvent>;
  updateSiaeTicketedEvent(id: string, event: Partial<SiaeTicketedEvent>): Promise<SiaeTicketedEvent | undefined>;
  
  // ==================== Event Sectors ====================
  
  getSiaeEventSectors(ticketedEventId: string): Promise<SiaeEventSector[]>;
  getSiaeEventSector(id: string): Promise<SiaeEventSector | undefined>;
  createSiaeEventSector(sector: InsertSiaeEventSector): Promise<SiaeEventSector>;
  updateSiaeEventSector(id: string, sector: Partial<SiaeEventSector>): Promise<SiaeEventSector | undefined>;
  deleteSiaeEventSector(id: string): Promise<boolean>;
  
  // ==================== Seats ====================
  
  getSiaeSeats(sectorId: string): Promise<SiaeSeat[]>;
  getSiaeSeat(id: string): Promise<SiaeSeat | undefined>;
  createSiaeSeats(seats: InsertSiaeSeat[]): Promise<SiaeSeat[]>;
  updateSiaeSeat(id: string, seat: Partial<SiaeSeat>): Promise<SiaeSeat | undefined>;
  
  // ==================== Fiscal Seals ====================
  
  getSiaeFiscalSealsByCard(cardId: string): Promise<SiaeFiscalSeal[]>;
  getSiaeFiscalSeal(id: string): Promise<SiaeFiscalSeal | undefined>;
  getSiaeFiscalSealByCode(sealCode: string): Promise<SiaeFiscalSeal | undefined>;
  createSiaeFiscalSeal(seal: InsertSiaeFiscalSeal): Promise<SiaeFiscalSeal>;
  getNextFiscalSealProgressive(cardId: string): Promise<number>;
  
  // ==================== Tickets ====================
  
  getSiaeTicketsByCompany(companyId: string): Promise<SiaeTicket[]>;
  getSiaeTicketsBySector(sectorId: string): Promise<SiaeTicket[]>;
  getSiaeTicketsByEvent(ticketedEventId: string): Promise<SiaeTicket[]>;
  getSiaeTicketsByCustomer(customerId: string): Promise<SiaeTicket[]>;
  getSiaeTicketsByTransaction(transactionId: string): Promise<SiaeTicket[]>;
  getSiaeTicket(id: string): Promise<SiaeTicket | undefined>;
  getSiaeTicketByFiscalSeal(fiscalSealCode: string): Promise<SiaeTicket | undefined>;
  createSiaeTicket(ticket: InsertSiaeTicket): Promise<SiaeTicket>;
  updateSiaeTicket(id: string, ticket: Partial<SiaeTicket>): Promise<SiaeTicket | undefined>;
  cancelSiaeTicket(id: string, reasonCode: string, userId: string): Promise<SiaeTicket | undefined>;
  markSiaeTicketUsed(id: string, scannerId: string): Promise<SiaeTicket | undefined>;
  
  // ==================== Transactions ====================
  
  getSiaeTransactionsByEvent(ticketedEventId: string): Promise<SiaeTransaction[]>;
  getSiaeTransactionsByCustomer(customerId: string): Promise<SiaeTransaction[]>;
  getSiaeTransaction(id: string): Promise<SiaeTransaction | undefined>;
  getSiaeTransactionByCode(transactionCode: string): Promise<SiaeTransaction | undefined>;
  createSiaeTransaction(transaction: InsertSiaeTransaction): Promise<SiaeTransaction>;
  updateSiaeTransaction(id: string, transaction: Partial<SiaeTransaction>): Promise<SiaeTransaction | undefined>;
  
  // ==================== Name Changes ====================
  
  getSiaeNameChanges(ticketId: string): Promise<SiaeNameChange[]>;
  getSiaeNameChangesByCompany(companyId: string): Promise<SiaeNameChange[]>;
  createSiaeNameChange(change: InsertSiaeNameChange): Promise<SiaeNameChange>;
  updateSiaeNameChange(id: string, change: Partial<SiaeNameChange>): Promise<SiaeNameChange | undefined>;
  
  // ==================== Resales ====================
  
  getSiaeResalesBySeller(sellerId: string): Promise<SiaeResale[]>;
  getSiaeResalesByTicket(ticketId: string): Promise<SiaeResale[]>;
  getSiaeResalesByCompany(companyId: string): Promise<SiaeResale[]>;
  getAvailableSiaeResales(): Promise<SiaeResale[]>;
  getAvailableSiaeResalesByEvent(eventId: string): Promise<SiaeResale[]>;
  getSiaeResale(id: string): Promise<SiaeResale | undefined>;
  createSiaeResale(resale: InsertSiaeResale): Promise<SiaeResale>;
  updateSiaeResale(id: string, resale: Partial<SiaeResale>): Promise<SiaeResale | undefined>;
  
  // ==================== Logs ====================
  
  createSiaeLog(log: InsertSiaeLog): Promise<SiaeLog>;
  getSiaeLogs(companyId: string, limit?: number): Promise<SiaeLog[]>;
  getSiaeLogsByTicket(ticketId: string): Promise<SiaeLog[]>;
  
  // ==================== Transmissions ====================
  
  getSiaeTransmissionsByCompany(companyId: string): Promise<SiaeTransmission[]>;
  getSiaeTransmission(id: string): Promise<SiaeTransmission | undefined>;
  createSiaeTransmission(transmission: InsertSiaeTransmission): Promise<SiaeTransmission>;
  updateSiaeTransmission(id: string, transmission: Partial<SiaeTransmission>): Promise<SiaeTransmission | undefined>;
  
  // ==================== Box Office Sessions ====================
  
  getSiaeBoxOfficeSessions(channelId: string): Promise<SiaeBoxOfficeSession[]>;
  getAllSiaeBoxOfficeSessions(): Promise<SiaeBoxOfficeSession[]>;
  getAllSiaeBoxOfficeSessionsAdmin(): Promise<any[]>;
  getActiveSiaeBoxOfficeSession(userId: string): Promise<SiaeBoxOfficeSession | undefined>;
  getSiaeBoxOfficeSession(id: string): Promise<SiaeBoxOfficeSession | undefined>;
  createSiaeBoxOfficeSession(session: InsertSiaeBoxOfficeSession): Promise<SiaeBoxOfficeSession>;
  closeSiaeBoxOfficeSession(id: string, closingData: Partial<SiaeBoxOfficeSession>): Promise<SiaeBoxOfficeSession | undefined>;
  
  // ==================== Subscriptions ====================
  
  getSiaeSubscriptionsByCompany(companyId: string): Promise<SiaeSubscription[]>;
  getSiaeSubscriptionsByCustomer(customerId: string): Promise<SiaeSubscription[]>;
  getSiaeSubscription(id: string): Promise<SiaeSubscription | undefined>;
  createSiaeSubscription(subscription: InsertSiaeSubscription): Promise<SiaeSubscription>;
  updateSiaeSubscription(id: string, subscription: Partial<SiaeSubscription>): Promise<SiaeSubscription | undefined>;
  
  // ==================== Audit Logs ====================
  
  getSiaeAuditLogsByCompany(companyId: string): Promise<SiaeAuditLog[]>;
  getSiaeAuditLogsByEntity(entityType: string, entityId: string): Promise<SiaeAuditLog[]>;
  createSiaeAuditLog(log: InsertSiaeAuditLog): Promise<SiaeAuditLog>;
  
  // ==================== Numbered Seats ====================
  
  getSiaeNumberedSeatsBySector(sectorId: string): Promise<SiaeNumberedSeat[]>;
  getSiaeNumberedSeat(id: string): Promise<SiaeNumberedSeat | undefined>;
  createSiaeNumberedSeat(seat: InsertSiaeNumberedSeat): Promise<SiaeNumberedSeat>;
  updateSiaeNumberedSeat(id: string, seat: Partial<SiaeNumberedSeat>): Promise<SiaeNumberedSeat | undefined>;
  deleteSiaeNumberedSeat(id: string): Promise<boolean>;
  
  // ==================== Cashier Allocations ====================
  
  getCashierAllocationsByEvent(eventId: string): Promise<SiaeCashierAllocation[]>;
  getCashierAllocationsByCashier(cashierId: string): Promise<SiaeCashierAllocation[]>;
  getCashierAllocationByCashierAndEvent(cashierId: string, eventId: string): Promise<SiaeCashierAllocation | undefined>;
  getCashierAllocation(id: string): Promise<SiaeCashierAllocation | undefined>;
  createCashierAllocation(data: InsertSiaeCashierAllocation): Promise<SiaeCashierAllocation>;
  updateCashierAllocation(id: string, data: Partial<SiaeCashierAllocation>): Promise<SiaeCashierAllocation | undefined>;
  deleteCashierAllocation(id: string): Promise<boolean>;
  incrementCashierQuotaUsed(id: string): Promise<SiaeCashierAllocation | undefined>;
  decrementCashierQuotaUsed(id: string): Promise<SiaeCashierAllocation | undefined>;
  
  // ==================== Ticket Audit ====================
  
  createTicketAudit(data: InsertSiaeTicketAudit): Promise<SiaeTicketAudit>;
  getTicketAuditByTicket(ticketId: string): Promise<SiaeTicketAudit[]>;
  getTicketAuditByCompany(companyId: string, limit?: number): Promise<SiaeTicketAudit[]>;
  getTicketAuditByUser(userId: string, limit?: number): Promise<SiaeTicketAudit[]>;
  getTodayTicketsByUser(userId: string, eventId: string): Promise<SiaeTicket[]>;
  
  // ==================== Atomic Transaction Methods ====================
  
  emitTicketWithAtomicQuota(params: {
    allocationId: string;
    eventId: string;
    sectorId: string;
    ticketCode: string;
    ticketType: string;
    ticketPrice: number;
    customerId: string | null;
    issuedByUserId: string;
    participantFirstName: string | null;
    participantLastName: string | null;
    isComplimentary: boolean;
    paymentMethod: string;
    currentTicketsSold: number;
    currentTotalRevenue: number;
    currentAvailableSeats: number;
  }): Promise<{ success: boolean; ticket?: SiaeTicket; error?: string }>;
  
  cancelTicketWithAtomicQuotaRestore(params: {
    ticketId: string;
    cancelledByUserId: string;
    cancellationReason: string;
    issuedByUserId: string | null;
    ticketedEventId: string;
    sectorId: string;
    ticketPrice: number;
  }): Promise<{ success: boolean; ticket?: SiaeTicket; error?: string }>;
  
  // ==================== Seed Functions ====================
  
  seedSiaeTables(): Promise<void>;
}

export class SiaeStorage implements ISiaeStorage {
  // ==================== TAB.1 - Event Genres ====================
  
  async getSiaeEventGenres(): Promise<SiaeEventGenre[]> {
    return await db.select().from(siaeEventGenres).orderBy(siaeEventGenres.code);
  }
  
  async getSiaeEventGenre(code: string): Promise<SiaeEventGenre | undefined> {
    const [genre] = await db.select().from(siaeEventGenres).where(eq(siaeEventGenres.code, code));
    return genre;
  }
  
  async createSiaeEventGenre(genre: InsertSiaeEventGenre): Promise<SiaeEventGenre> {
    const [created] = await db.insert(siaeEventGenres).values(genre).returning();
    return created;
  }
  
  async updateSiaeEventGenre(code: string, genre: Partial<SiaeEventGenre>): Promise<SiaeEventGenre | undefined> {
    const [updated] = await db.update(siaeEventGenres)
      .set({ ...genre, updatedAt: new Date() })
      .where(eq(siaeEventGenres.code, code))
      .returning();
    return updated;
  }
  
  // ==================== TAB.2 - Sector Codes ====================
  
  async getSiaeSectorCodes(): Promise<SiaeSectorCode[]> {
    return await db.select().from(siaeSectorCodes).orderBy(siaeSectorCodes.code);
  }
  
  async getSiaeSectorCode(code: string): Promise<SiaeSectorCode | undefined> {
    const [sector] = await db.select().from(siaeSectorCodes).where(eq(siaeSectorCodes.code, code));
    return sector;
  }
  
  async createSiaeSectorCode(sector: InsertSiaeSectorCode): Promise<SiaeSectorCode> {
    const [created] = await db.insert(siaeSectorCodes).values(sector).returning();
    return created;
  }
  
  async updateSiaeSectorCode(code: string, sector: Partial<SiaeSectorCode>): Promise<SiaeSectorCode | undefined> {
    const [updated] = await db.update(siaeSectorCodes)
      .set({ ...sector, updatedAt: new Date() })
      .where(eq(siaeSectorCodes.code, code))
      .returning();
    return updated;
  }
  
  // ==================== TAB.3 - Ticket Types ====================
  
  async getSiaeTicketTypes(): Promise<SiaeTicketType[]> {
    return await db.select().from(siaeTicketTypes).orderBy(siaeTicketTypes.code);
  }
  
  async getSiaeTicketType(code: string): Promise<SiaeTicketType | undefined> {
    const [ticketType] = await db.select().from(siaeTicketTypes).where(eq(siaeTicketTypes.code, code));
    return ticketType;
  }
  
  async createSiaeTicketType(ticketType: InsertSiaeTicketType): Promise<SiaeTicketType> {
    const [created] = await db.insert(siaeTicketTypes).values(ticketType).returning();
    return created;
  }
  
  async updateSiaeTicketType(code: string, ticketType: Partial<SiaeTicketType>): Promise<SiaeTicketType | undefined> {
    const [updated] = await db.update(siaeTicketTypes)
      .set({ ...ticketType, updatedAt: new Date() })
      .where(eq(siaeTicketTypes.code, code))
      .returning();
    return updated;
  }
  
  // ==================== TAB.4 - Service Codes ====================
  
  async getSiaeServiceCodes(): Promise<SiaeServiceCode[]> {
    return await db.select().from(siaeServiceCodes).orderBy(siaeServiceCodes.code);
  }
  
  async getSiaeServiceCode(code: string): Promise<SiaeServiceCode | undefined> {
    const [service] = await db.select().from(siaeServiceCodes).where(eq(siaeServiceCodes.code, code));
    return service;
  }
  
  async createSiaeServiceCode(service: InsertSiaeServiceCode): Promise<SiaeServiceCode> {
    const [created] = await db.insert(siaeServiceCodes).values(service).returning();
    return created;
  }
  
  async updateSiaeServiceCode(code: string, service: Partial<SiaeServiceCode>): Promise<SiaeServiceCode | undefined> {
    const [updated] = await db.update(siaeServiceCodes)
      .set({ ...service, updatedAt: new Date() })
      .where(eq(siaeServiceCodes.code, code))
      .returning();
    return updated;
  }
  
  // ==================== TAB.5 - Cancellation Reasons ====================
  
  async getSiaeCancellationReasons(): Promise<SiaeCancellationReason[]> {
    return await db.select().from(siaeCancellationReasons).orderBy(siaeCancellationReasons.code);
  }
  
  async getSiaeCancellationReason(code: string): Promise<SiaeCancellationReason | undefined> {
    const [reason] = await db.select().from(siaeCancellationReasons).where(eq(siaeCancellationReasons.code, code));
    return reason;
  }
  
  async createSiaeCancellationReason(reason: InsertSiaeCancellationReason): Promise<SiaeCancellationReason> {
    const [created] = await db.insert(siaeCancellationReasons).values(reason).returning();
    return created;
  }
  
  async updateSiaeCancellationReason(code: string, reason: Partial<SiaeCancellationReason>): Promise<SiaeCancellationReason | undefined> {
    const [updated] = await db.update(siaeCancellationReasons)
      .set({ ...reason, updatedAt: new Date() })
      .where(eq(siaeCancellationReasons.code, code))
      .returning();
    return updated;
  }
  
  // ==================== Activation Cards ====================
  
  async getSiaeActivationCards(): Promise<SiaeActivationCard[]> {
    return await db.select().from(siaeActivationCards).orderBy(desc(siaeActivationCards.activationDate));
  }
  
  async getSiaeActivationCardsByCompany(companyId: string): Promise<SiaeActivationCard[]> {
    return await db.select().from(siaeActivationCards)
      .where(eq(siaeActivationCards.companyId, companyId))
      .orderBy(desc(siaeActivationCards.activationDate));
  }
  
  async getSiaeActivationCard(id: string): Promise<SiaeActivationCard | undefined> {
    const [card] = await db.select().from(siaeActivationCards).where(eq(siaeActivationCards.id, id));
    return card;
  }
  
  async getSiaeActivationCardByCode(cardCode: string): Promise<SiaeActivationCard | undefined> {
    const [card] = await db.select().from(siaeActivationCards).where(eq(siaeActivationCards.cardCode, cardCode));
    return card;
  }
  
  async createSiaeActivationCard(card: InsertSiaeActivationCard): Promise<SiaeActivationCard> {
    const [created] = await db.insert(siaeActivationCards).values(card).returning();
    return created;
  }
  
  async updateSiaeActivationCard(id: string, card: Partial<SiaeActivationCard>): Promise<SiaeActivationCard | undefined> {
    const [updated] = await db.update(siaeActivationCards)
      .set({ ...card, updatedAt: new Date() })
      .where(eq(siaeActivationCards.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Emission Channels ====================
  
  async getSiaeEmissionChannelsByCompany(companyId: string): Promise<SiaeEmissionChannel[]> {
    return await db.select().from(siaeEmissionChannels)
      .where(eq(siaeEmissionChannels.companyId, companyId))
      .orderBy(siaeEmissionChannels.channelCode);
  }
  
  async getSiaeEmissionChannel(id: string): Promise<SiaeEmissionChannel | undefined> {
    const [channel] = await db.select().from(siaeEmissionChannels).where(eq(siaeEmissionChannels.id, id));
    return channel;
  }
  
  async getSiaeEmissionChannelByCode(channelCode: string, companyId: string): Promise<SiaeEmissionChannel | undefined> {
    const [channel] = await db.select().from(siaeEmissionChannels)
      .where(and(eq(siaeEmissionChannels.channelCode, channelCode), eq(siaeEmissionChannels.companyId, companyId)));
    return channel;
  }
  
  async createSiaeEmissionChannel(channel: InsertSiaeEmissionChannel): Promise<SiaeEmissionChannel> {
    const [created] = await db.insert(siaeEmissionChannels).values(channel).returning();
    return created;
  }
  
  async updateSiaeEmissionChannel(id: string, channel: Partial<SiaeEmissionChannel>): Promise<SiaeEmissionChannel | undefined> {
    const [updated] = await db.update(siaeEmissionChannels)
      .set({ ...channel, updatedAt: new Date() })
      .where(eq(siaeEmissionChannels.id, id))
      .returning();
    return updated;
  }
  
  // ==================== System Configuration ====================
  
  async getSiaeSystemConfig(companyId: string): Promise<SiaeSystemConfig | undefined> {
    const [config] = await db.select().from(siaeSystemConfig).where(eq(siaeSystemConfig.companyId, companyId));
    return config;
  }
  
  async upsertSiaeSystemConfig(config: InsertSiaeSystemConfig): Promise<SiaeSystemConfig> {
    const existing = await this.getSiaeSystemConfig(config.companyId!);
    if (existing) {
      const [updated] = await db.update(siaeSystemConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(siaeSystemConfig.companyId, config.companyId!))
        .returning();
      return updated;
    }
    const [created] = await db.insert(siaeSystemConfig).values(config).returning();
    return created;
  }

  // Configurazione globale (prima riga della tabella, senza filtro companyId)
  async getGlobalSiaeSystemConfig(): Promise<SiaeSystemConfig | undefined> {
    const [config] = await db.select().from(siaeSystemConfig).limit(1);
    return config;
  }
  
  async upsertGlobalSiaeSystemConfig(config: InsertSiaeSystemConfig): Promise<SiaeSystemConfig> {
    const existing = await this.getGlobalSiaeSystemConfig();
    if (existing) {
      const [updated] = await db.update(siaeSystemConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(siaeSystemConfig.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(siaeSystemConfig).values(config).returning();
    return created;
  }
  
  // ==================== Customers ====================
  
  async getSiaeCustomers(): Promise<SiaeCustomer[]> {
    return await db.select().from(siaeCustomers).orderBy(desc(siaeCustomers.createdAt));
  }
  
  async getSiaeCustomer(id: string): Promise<SiaeCustomer | undefined> {
    const [customer] = await db.select().from(siaeCustomers).where(eq(siaeCustomers.id, id));
    return customer;
  }
  
  async getSiaeCustomerByPhone(phone: string): Promise<SiaeCustomer | undefined> {
    const [customer] = await db.select().from(siaeCustomers).where(eq(siaeCustomers.phone, phone));
    return customer;
  }
  
  async getSiaeCustomerByEmail(email: string): Promise<SiaeCustomer | undefined> {
    const [customer] = await db.select().from(siaeCustomers).where(eq(siaeCustomers.email, email));
    return customer;
  }
  
  async getSiaeCustomerByUniqueCode(uniqueCode: string): Promise<SiaeCustomer | undefined> {
    const [customer] = await db.select().from(siaeCustomers).where(eq(siaeCustomers.uniqueCode, uniqueCode));
    return customer;
  }
  
  async getSiaeCustomerByUserId(userId: string): Promise<SiaeCustomer | undefined> {
    const [customer] = await db.select().from(siaeCustomers).where(eq(siaeCustomers.userId, userId));
    return customer;
  }
  
  async createSiaeCustomer(customer: InsertSiaeCustomer): Promise<SiaeCustomer> {
    const [created] = await db.insert(siaeCustomers).values(customer).returning();
    return created;
  }
  
  async updateSiaeCustomer(id: string, customer: Partial<SiaeCustomer>): Promise<SiaeCustomer | undefined> {
    const [updated] = await db.update(siaeCustomers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(siaeCustomers.id, id))
      .returning();
    return updated;
  }
  
  async deleteSiaeCustomer(id: string): Promise<boolean> {
    const result = await db.delete(siaeCustomers).where(eq(siaeCustomers.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // ==================== OTP Attempts ====================
  
  async createSiaeOtpAttempt(attempt: InsertSiaeOtpAttempt): Promise<SiaeOtpAttempt> {
    const [created] = await db.insert(siaeOtpAttempts).values(attempt).returning();
    return created;
  }
  
  async getSiaeOtpAttempt(phone: string, otpCode: string): Promise<SiaeOtpAttempt | undefined> {
    // Return matching attempt without filtering by status/expiry
    // Route must explicitly check status='pending' and expiresAt > now
    const [attempt] = await db.select().from(siaeOtpAttempts)
      .where(and(
        eq(siaeOtpAttempts.phone, phone),
        eq(siaeOtpAttempts.otpCode, otpCode)
      ))
      .orderBy(desc(siaeOtpAttempts.createdAt))
      .limit(1);
    return attempt;
  }
  
  async markSiaeOtpVerified(id: string): Promise<void> {
    await db.update(siaeOtpAttempts)
      .set({ status: 'verified', verifiedAt: new Date() })
      .where(eq(siaeOtpAttempts.id, id));
  }
  
  async markSiaeOtpVerifiedByPhone(phone: string): Promise<void> {
    await db.update(siaeOtpAttempts)
      .set({ status: 'verified', verifiedAt: new Date() })
      .where(and(
        eq(siaeOtpAttempts.phone, phone),
        eq(siaeOtpAttempts.status, 'pending')
      ));
  }
  
  async cleanupExpiredOtps(): Promise<void> {
    await db.update(siaeOtpAttempts)
      .set({ status: 'expired' })
      .where(and(
        lt(siaeOtpAttempts.expiresAt, new Date()),
        eq(siaeOtpAttempts.status, 'pending')
      ));
  }
  
  // ==================== Ticketed Events ====================
  
  async getSiaeTicketedEventsByCompany(companyId: string) {
    return await db.select({
      id: siaeTicketedEvents.id,
      eventId: siaeTicketedEvents.eventId,
      companyId: siaeTicketedEvents.companyId,
      siaeEventCode: siaeTicketedEvents.siaeEventCode,
      siaeLocationCode: siaeTicketedEvents.siaeLocationCode,
      organizerType: siaeTicketedEvents.organizerType,
      genreCode: siaeTicketedEvents.genreCode,
      taxType: siaeTicketedEvents.taxType,
      ivaPreassolta: siaeTicketedEvents.ivaPreassolta,
      totalCapacity: siaeTicketedEvents.totalCapacity,
      requiresNominative: siaeTicketedEvents.requiresNominative,
      allowsChangeName: siaeTicketedEvents.allowsChangeName,
      allowsResale: siaeTicketedEvents.allowsResale,
      saleStartDate: siaeTicketedEvents.saleStartDate,
      saleEndDate: siaeTicketedEvents.saleEndDate,
      maxTicketsPerUser: siaeTicketedEvents.maxTicketsPerUser,
      ticketingStatus: siaeTicketedEvents.ticketingStatus,
      ticketsSold: siaeTicketedEvents.ticketsSold,
      ticketsCancelled: siaeTicketedEvents.ticketsCancelled,
      totalRevenue: siaeTicketedEvents.totalRevenue,
      createdAt: siaeTicketedEvents.createdAt,
      updatedAt: siaeTicketedEvents.updatedAt,
      eventName: events.name,
      eventDate: events.startDatetime,
      status: events.status,
      eventLocation: events.locationId,
    })
    .from(siaeTicketedEvents)
    .leftJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .where(eq(siaeTicketedEvents.companyId, companyId))
    .orderBy(desc(siaeTicketedEvents.createdAt));
  }
  
  async getAllSiaeTicketedEventsAdmin() {
    return await db.select({
      id: siaeTicketedEvents.id,
      eventId: siaeTicketedEvents.eventId,
      companyId: siaeTicketedEvents.companyId,
      siaeEventCode: siaeTicketedEvents.siaeEventCode,
      siaeLocationCode: siaeTicketedEvents.siaeLocationCode,
      organizerType: siaeTicketedEvents.organizerType,
      genreCode: siaeTicketedEvents.genreCode,
      taxType: siaeTicketedEvents.taxType,
      ivaPreassolta: siaeTicketedEvents.ivaPreassolta,
      totalCapacity: siaeTicketedEvents.totalCapacity,
      requiresNominative: siaeTicketedEvents.requiresNominative,
      allowsChangeName: siaeTicketedEvents.allowsChangeName,
      allowsResale: siaeTicketedEvents.allowsResale,
      saleStartDate: siaeTicketedEvents.saleStartDate,
      saleEndDate: siaeTicketedEvents.saleEndDate,
      maxTicketsPerUser: siaeTicketedEvents.maxTicketsPerUser,
      ticketingStatus: siaeTicketedEvents.ticketingStatus,
      ticketsSold: siaeTicketedEvents.ticketsSold,
      ticketsCancelled: siaeTicketedEvents.ticketsCancelled,
      totalRevenue: siaeTicketedEvents.totalRevenue,
      createdAt: siaeTicketedEvents.createdAt,
      updatedAt: siaeTicketedEvents.updatedAt,
      eventName: events.name,
      eventDate: events.startDatetime,
      status: events.status,
      eventLocation: events.locationId,
      companyName: companies.name,
    })
    .from(siaeTicketedEvents)
    .leftJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .leftJoin(companies, eq(siaeTicketedEvents.companyId, companies.id))
    .orderBy(companies.name, desc(siaeTicketedEvents.createdAt));
  }
  
  async getSiaeTicketedEvent(id: string): Promise<SiaeTicketedEvent | undefined> {
    const [event] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, id));
    return event;
  }
  
  async getSiaeTicketedEventByEventId(eventId: string): Promise<SiaeTicketedEvent | undefined> {
    const [event] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.eventId, eventId));
    return event;
  }
  
  async createSiaeTicketedEvent(event: InsertSiaeTicketedEvent): Promise<SiaeTicketedEvent> {
    const [created] = await db.insert(siaeTicketedEvents).values(event).returning();
    return created;
  }
  
  async updateSiaeTicketedEvent(id: string, event: Partial<SiaeTicketedEvent>): Promise<SiaeTicketedEvent | undefined> {
    const [updated] = await db.update(siaeTicketedEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(siaeTicketedEvents.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Event Sectors ====================
  
  async getSiaeEventSectors(ticketedEventId: string): Promise<SiaeEventSector[]> {
    return await db.select().from(siaeEventSectors)
      .where(eq(siaeEventSectors.ticketedEventId, ticketedEventId))
      .orderBy(siaeEventSectors.sectorCode);
  }
  
  async getSiaeEventSector(id: string): Promise<SiaeEventSector | undefined> {
    const [sector] = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.id, id));
    return sector;
  }
  
  async createSiaeEventSector(sector: InsertSiaeEventSector): Promise<SiaeEventSector> {
    const [created] = await db.insert(siaeEventSectors).values(sector).returning();
    return created;
  }
  
  async updateSiaeEventSector(id: string, sector: Partial<SiaeEventSector>): Promise<SiaeEventSector | undefined> {
    const [updated] = await db.update(siaeEventSectors)
      .set({ ...sector, updatedAt: new Date() })
      .where(eq(siaeEventSectors.id, id))
      .returning();
    return updated;
  }
  
  async deleteSiaeEventSector(id: string): Promise<boolean> {
    const result = await db.delete(siaeEventSectors).where(eq(siaeEventSectors.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // ==================== Seats ====================
  
  async getSiaeSeats(sectorId: string): Promise<SiaeSeat[]> {
    return await db.select().from(siaeSeats)
      .where(eq(siaeSeats.sectorId, sectorId))
      .orderBy(siaeSeats.row, siaeSeats.seatNumber);
  }
  
  async getSiaeSeat(id: string): Promise<SiaeSeat | undefined> {
    const [seat] = await db.select().from(siaeSeats).where(eq(siaeSeats.id, id));
    return seat;
  }
  
  async createSiaeSeats(seats: InsertSiaeSeat[]): Promise<SiaeSeat[]> {
    if (seats.length === 0) return [];
    return await db.insert(siaeSeats).values(seats).returning();
  }
  
  async updateSiaeSeat(id: string, seat: Partial<SiaeSeat>): Promise<SiaeSeat | undefined> {
    const [updated] = await db.update(siaeSeats)
      .set({ ...seat, updatedAt: new Date() })
      .where(eq(siaeSeats.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Fiscal Seals ====================
  
  async getSiaeFiscalSealsByCard(cardId: string): Promise<SiaeFiscalSeal[]> {
    return await db.select().from(siaeFiscalSeals)
      .where(eq(siaeFiscalSeals.cardId, cardId))
      .orderBy(desc(siaeFiscalSeals.progressiveNumber));
  }
  
  async getSiaeFiscalSeal(id: string): Promise<SiaeFiscalSeal | undefined> {
    const [seal] = await db.select().from(siaeFiscalSeals).where(eq(siaeFiscalSeals.id, id));
    return seal;
  }
  
  async getSiaeFiscalSealByCode(sealCode: string): Promise<SiaeFiscalSeal | undefined> {
    const [seal] = await db.select().from(siaeFiscalSeals).where(eq(siaeFiscalSeals.sealCode, sealCode));
    return seal;
  }
  
  async createSiaeFiscalSeal(seal: InsertSiaeFiscalSeal): Promise<SiaeFiscalSeal> {
    const [created] = await db.insert(siaeFiscalSeals).values(seal).returning();
    return created;
  }
  
  async getNextFiscalSealProgressive(cardId: string): Promise<number> {
    const [result] = await db.select({ maxProg: sql<number>`COALESCE(MAX(${siaeFiscalSeals.progressiveNumber}), 0) + 1` })
      .from(siaeFiscalSeals)
      .where(eq(siaeFiscalSeals.cardId, cardId));
    return result?.maxProg || 1;
  }
  
  // ==================== Tickets ====================
  
  async getSiaeTicketsByCompany(companyId: string): Promise<SiaeTicket[]> {
    // Join through ticketed events to get tickets for a company
    return await db.select({
      id: siaeTickets.id,
      ticketedEventId: siaeTickets.ticketedEventId,
      sectorId: siaeTickets.sectorId,
      seatId: siaeTickets.seatId,
      customerId: siaeTickets.customerId,
      transactionId: siaeTickets.transactionId,
      fiscalSealId: siaeTickets.fiscalSealId,
      fiscalSealCode: siaeTickets.fiscalSealCode,
      fiscalSeal: siaeTickets.fiscalSeal,
      ticketTypeCode: siaeTickets.ticketTypeCode,
      serviceCode: siaeTickets.serviceCode,
      emissionChannelCode: siaeTickets.emissionChannelCode,
      progressiveNumber: siaeTickets.progressiveNumber,
      holderFirstName: siaeTickets.holderFirstName,
      holderLastName: siaeTickets.holderLastName,
      holderFiscalCode: siaeTickets.holderFiscalCode,
      holderDocumentType: siaeTickets.holderDocumentType,
      holderDocumentNumber: siaeTickets.holderDocumentNumber,
      grossPrice: siaeTickets.grossPrice,
      netPrice: siaeTickets.netPrice,
      vatRate: siaeTickets.vatRate,
      vatAmount: siaeTickets.vatAmount,
      siaeFee: siaeTickets.siaeFee,
      emissionDate: siaeTickets.emissionDate,
      eventDate: siaeTickets.eventDate,
      qrCode: siaeTickets.qrCode,
      barcode: siaeTickets.barcode,
      status: siaeTickets.status,
      usedAt: siaeTickets.usedAt,
      usedByScannerId: siaeTickets.usedByScannerId,
      cancellationReasonCode: siaeTickets.cancellationReasonCode,
      cancellationDate: siaeTickets.cancellationDate,
      cancelledByUserId: siaeTickets.cancelledByUserId,
      refundAmount: siaeTickets.refundAmount,
      pdfUrl: siaeTickets.pdfUrl,
      sentToCustomer: siaeTickets.sentToCustomer,
      sentAt: siaeTickets.sentAt,
      createdAt: siaeTickets.createdAt,
      updatedAt: siaeTickets.updatedAt,
    })
      .from(siaeTickets)
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeTicketedEvents.companyId, companyId))
      .orderBy(desc(siaeTickets.emissionDate));
  }
  
  async getSiaeTicketsBySector(sectorId: string): Promise<SiaeTicket[]> {
    return await db.select().from(siaeTickets)
      .where(eq(siaeTickets.sectorId, sectorId))
      .orderBy(desc(siaeTickets.emissionDate));
  }
  
  async getSiaeTicketsByEvent(ticketedEventId: string): Promise<SiaeTicket[]> {
    return await db.select().from(siaeTickets)
      .where(eq(siaeTickets.ticketedEventId, ticketedEventId))
      .orderBy(desc(siaeTickets.emissionDate));
  }
  
  async getSiaeTicketsByCustomer(customerId: string): Promise<SiaeTicket[]> {
    return await db.select().from(siaeTickets)
      .where(eq(siaeTickets.customerId, customerId))
      .orderBy(desc(siaeTickets.emissionDate));
  }
  
  async getSiaeTicketsByTransaction(transactionId: string): Promise<SiaeTicket[]> {
    return await db.select().from(siaeTickets)
      .where(eq(siaeTickets.transactionId, transactionId))
      .orderBy(siaeTickets.progressiveNumber);
  }
  
  async getSiaeTicket(id: string): Promise<SiaeTicket | undefined> {
    const [ticket] = await db.select().from(siaeTickets).where(eq(siaeTickets.id, id));
    return ticket;
  }
  
  async getSiaeTicketByFiscalSeal(fiscalSealCode: string): Promise<SiaeTicket | undefined> {
    const [ticket] = await db.select().from(siaeTickets).where(eq(siaeTickets.fiscalSealCode, fiscalSealCode));
    return ticket;
  }
  
  async createSiaeTicket(ticket: InsertSiaeTicket): Promise<SiaeTicket> {
    const [created] = await db.insert(siaeTickets).values(ticket).returning();
    return created;
  }
  
  async updateSiaeTicket(id: string, ticket: Partial<SiaeTicket>): Promise<SiaeTicket | undefined> {
    const [updated] = await db.update(siaeTickets)
      .set({ ...ticket, updatedAt: new Date() })
      .where(eq(siaeTickets.id, id))
      .returning();
    return updated;
  }
  
  async cancelSiaeTicket(id: string, reasonCode: string, userId: string): Promise<SiaeTicket | undefined> {
    const [updated] = await db.update(siaeTickets)
      .set({
        status: 'cancelled',
        cancellationReasonCode: reasonCode,
        cancellationDate: new Date(),
        cancelledByUserId: userId,
        updatedAt: new Date()
      })
      .where(eq(siaeTickets.id, id))
      .returning();
    return updated;
  }
  
  async markSiaeTicketUsed(id: string, scannerId: string): Promise<SiaeTicket | undefined> {
    const [updated] = await db.update(siaeTickets)
      .set({
        status: 'used',
        usedAt: new Date(),
        usedByScannerId: scannerId,
        updatedAt: new Date()
      })
      .where(eq(siaeTickets.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Transactions ====================
  
  async getSiaeTransactionsByEvent(ticketedEventId: string): Promise<SiaeTransaction[]> {
    return await db.select().from(siaeTransactions)
      .where(eq(siaeTransactions.ticketedEventId, ticketedEventId))
      .orderBy(desc(siaeTransactions.createdAt));
  }
  
  async getSiaeTransactionsByCustomer(customerId: string): Promise<SiaeTransaction[]> {
    return await db.select().from(siaeTransactions)
      .where(eq(siaeTransactions.customerId, customerId))
      .orderBy(desc(siaeTransactions.createdAt));
  }
  
  async getSiaeTransaction(id: string): Promise<SiaeTransaction | undefined> {
    const [transaction] = await db.select().from(siaeTransactions).where(eq(siaeTransactions.id, id));
    return transaction;
  }
  
  async getSiaeTransactionByCode(transactionCode: string): Promise<SiaeTransaction | undefined> {
    const [transaction] = await db.select().from(siaeTransactions).where(eq(siaeTransactions.transactionCode, transactionCode));
    return transaction;
  }
  
  async createSiaeTransaction(transaction: InsertSiaeTransaction): Promise<SiaeTransaction> {
    const [created] = await db.insert(siaeTransactions).values(transaction).returning();
    return created;
  }
  
  async updateSiaeTransaction(id: string, transaction: Partial<SiaeTransaction>): Promise<SiaeTransaction | undefined> {
    const [updated] = await db.update(siaeTransactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(siaeTransactions.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Name Changes ====================
  
  async getSiaeNameChanges(ticketId: string): Promise<SiaeNameChange[]> {
    return await db.select().from(siaeNameChanges)
      .where(eq(siaeNameChanges.originalTicketId, ticketId))
      .orderBy(desc(siaeNameChanges.createdAt));
  }
  
  async getSiaeNameChangesByCompany(companyId: string): Promise<SiaeNameChange[]> {
    return await db.select({ nameChange: siaeNameChanges })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeEventSectors.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeTicketedEvents.companyId, companyId))
      .orderBy(desc(siaeNameChanges.createdAt))
      .then(rows => rows.map(r => r.nameChange));
  }
  
  async createSiaeNameChange(change: InsertSiaeNameChange): Promise<SiaeNameChange> {
    const [created] = await db.insert(siaeNameChanges).values(change).returning();
    return created;
  }
  
  async updateSiaeNameChange(id: string, change: Partial<SiaeNameChange>): Promise<SiaeNameChange | undefined> {
    const [updated] = await db.update(siaeNameChanges)
      .set({ ...change, updatedAt: new Date() })
      .where(eq(siaeNameChanges.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Resales ====================
  
  async getSiaeResalesBySeller(sellerId: string): Promise<SiaeResale[]> {
    return await db.select().from(siaeResales)
      .where(eq(siaeResales.sellerId, sellerId))
      .orderBy(desc(siaeResales.createdAt));
  }
  
  async getSiaeResalesByTicket(ticketId: string): Promise<SiaeResale[]> {
    return await db.select().from(siaeResales)
      .where(eq(siaeResales.originalTicketId, ticketId))
      .orderBy(desc(siaeResales.createdAt));
  }
  
  async getSiaeResalesByCompany(companyId: string): Promise<SiaeResale[]> {
    return await db.select({ resale: siaeResales })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeEventSectors.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeTicketedEvents.companyId, companyId))
      .orderBy(desc(siaeResales.createdAt))
      .then(rows => rows.map(r => r.resale));
  }
  
  async getAvailableSiaeResales(): Promise<SiaeResale[]> {
    return await db.select().from(siaeResales)
      .where(eq(siaeResales.status, 'listed'))
      .orderBy(siaeResales.resalePrice);
  }
  
  async getAvailableSiaeResalesByEvent(eventId: string): Promise<SiaeResale[]> {
    return await db.select({ resale: siaeResales })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .where(and(
        eq(siaeResales.status, 'listed'),
        eq(siaeTickets.eventId, eventId)
      ))
      .orderBy(siaeResales.resalePrice)
      .then(rows => rows.map(r => r.resale));
  }
  
  async getSiaeResale(id: string): Promise<SiaeResale | undefined> {
    const [resale] = await db.select().from(siaeResales).where(eq(siaeResales.id, id));
    return resale;
  }
  
  async createSiaeResale(resale: InsertSiaeResale): Promise<SiaeResale> {
    const [created] = await db.insert(siaeResales).values(resale).returning();
    return created;
  }
  
  async updateSiaeResale(id: string, resale: Partial<SiaeResale>): Promise<SiaeResale | undefined> {
    const [updated] = await db.update(siaeResales)
      .set({ ...resale, updatedAt: new Date() })
      .where(eq(siaeResales.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Logs ====================
  
  async createSiaeLog(log: InsertSiaeLog): Promise<SiaeLog> {
    const [created] = await db.insert(siaeLogs).values(log).returning();
    return created;
  }
  
  async getSiaeLogs(companyId: string, limit: number = 100): Promise<SiaeLog[]> {
    return await db.select().from(siaeLogs)
      .where(eq(siaeLogs.companyId, companyId))
      .orderBy(desc(siaeLogs.createdAt))
      .limit(limit);
  }
  
  async getSiaeLogsByTicket(ticketId: string): Promise<SiaeLog[]> {
    return await db.select().from(siaeLogs)
      .where(eq(siaeLogs.ticketId, ticketId))
      .orderBy(desc(siaeLogs.createdAt));
  }
  
  // ==================== Transmissions ====================
  
  async getSiaeTransmissionsByCompany(companyId: string): Promise<SiaeTransmission[]> {
    return await db.select().from(siaeTransmissions)
      .where(eq(siaeTransmissions.companyId, companyId))
      .orderBy(desc(siaeTransmissions.createdAt));
  }
  
  async getSiaeTransmission(id: string): Promise<SiaeTransmission | undefined> {
    const [transmission] = await db.select().from(siaeTransmissions).where(eq(siaeTransmissions.id, id));
    return transmission;
  }
  
  async createSiaeTransmission(transmission: InsertSiaeTransmission): Promise<SiaeTransmission> {
    const [created] = await db.insert(siaeTransmissions).values(transmission).returning();
    return created;
  }
  
  async updateSiaeTransmission(id: string, transmission: Partial<SiaeTransmission>): Promise<SiaeTransmission | undefined> {
    const [updated] = await db.update(siaeTransmissions)
      .set({ ...transmission, updatedAt: new Date() })
      .where(eq(siaeTransmissions.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Box Office Sessions ====================
  
  async getSiaeBoxOfficeSessions(channelId: string): Promise<SiaeBoxOfficeSession[]> {
    return await db.select().from(siaeBoxOfficeSessions)
      .where(eq(siaeBoxOfficeSessions.emissionChannelId, channelId))
      .orderBy(desc(siaeBoxOfficeSessions.openedAt));
  }
  
  async getAllSiaeBoxOfficeSessions(): Promise<SiaeBoxOfficeSession[]> {
    return await db.select().from(siaeBoxOfficeSessions)
      .orderBy(desc(siaeBoxOfficeSessions.openedAt));
  }
  
  async getAllSiaeBoxOfficeSessionsAdmin(): Promise<any[]> {
    // Use users table as primary source for company info (more reliable than emission channels)
    const results = await db
      .select({
        id: siaeBoxOfficeSessions.id,
        userId: siaeBoxOfficeSessions.userId,
        emissionChannelId: siaeBoxOfficeSessions.emissionChannelId,
        locationId: siaeBoxOfficeSessions.locationId,
        openedAt: siaeBoxOfficeSessions.openedAt,
        closedAt: siaeBoxOfficeSessions.closedAt,
        cashTotal: siaeBoxOfficeSessions.cashTotal,
        cardTotal: siaeBoxOfficeSessions.cardTotal,
        ticketsSold: siaeBoxOfficeSessions.ticketsSold,
        ticketsCancelled: siaeBoxOfficeSessions.ticketsCancelled,
        expectedCash: siaeBoxOfficeSessions.expectedCash,
        actualCash: siaeBoxOfficeSessions.actualCash,
        difference: siaeBoxOfficeSessions.difference,
        status: siaeBoxOfficeSessions.status,
        notes: siaeBoxOfficeSessions.notes,
        createdAt: siaeBoxOfficeSessions.createdAt,
        updatedAt: siaeBoxOfficeSessions.updatedAt,
        companyName: sql<string>`COALESCE(${companies.name}, 'Organizzatore Sconosciuto')`,
        companyId: sql<string>`COALESCE(${companies.id}, ${users.companyId}, 'unknown')`,
        userName: sql<string>`COALESCE(NULLIF(TRIM(${users.firstName} || ' ' || ${users.lastName}), ''), ${users.email}, 'Operatore')`,
      })
      .from(siaeBoxOfficeSessions)
      .leftJoin(users, eq(siaeBoxOfficeSessions.userId, users.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .orderBy(sql`COALESCE(${companies.name}, 'ZZZ')`, desc(siaeBoxOfficeSessions.openedAt));
    
    return results;
  }
  
  async getActiveSiaeBoxOfficeSession(userId: string): Promise<SiaeBoxOfficeSession | undefined> {
    const [session] = await db.select().from(siaeBoxOfficeSessions)
      .where(and(
        eq(siaeBoxOfficeSessions.userId, userId),
        isNull(siaeBoxOfficeSessions.closedAt)
      ));
    return session;
  }
  
  async getSiaeBoxOfficeSession(id: string): Promise<SiaeBoxOfficeSession | undefined> {
    const [session] = await db.select().from(siaeBoxOfficeSessions).where(eq(siaeBoxOfficeSessions.id, id));
    return session;
  }
  
  async createSiaeBoxOfficeSession(session: InsertSiaeBoxOfficeSession): Promise<SiaeBoxOfficeSession> {
    const [created] = await db.insert(siaeBoxOfficeSessions).values(session).returning();
    return created;
  }
  
  async closeSiaeBoxOfficeSession(id: string, closingData: Partial<SiaeBoxOfficeSession>): Promise<SiaeBoxOfficeSession | undefined> {
    const [updated] = await db.update(siaeBoxOfficeSessions)
      .set({
        ...closingData,
        closedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(siaeBoxOfficeSessions.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Subscriptions ====================
  
  async getSiaeSubscriptionsByCompany(companyId: string): Promise<SiaeSubscription[]> {
    return await db.select().from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.companyId, companyId))
      .orderBy(desc(siaeSubscriptions.createdAt));
  }
  
  async getSiaeSubscriptionsByCustomer(customerId: string): Promise<SiaeSubscription[]> {
    return await db.select().from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.customerId, customerId))
      .orderBy(desc(siaeSubscriptions.createdAt));
  }
  
  async getSiaeSubscription(id: string): Promise<SiaeSubscription | undefined> {
    const [subscription] = await db.select().from(siaeSubscriptions).where(eq(siaeSubscriptions.id, id));
    return subscription;
  }
  
  async createSiaeSubscription(subscription: InsertSiaeSubscription): Promise<SiaeSubscription> {
    const [created] = await db.insert(siaeSubscriptions).values(subscription).returning();
    return created;
  }
  
  async updateSiaeSubscription(id: string, subscription: Partial<SiaeSubscription>): Promise<SiaeSubscription | undefined> {
    const [updated] = await db.update(siaeSubscriptions)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(siaeSubscriptions.id, id))
      .returning();
    return updated;
  }
  
  // ==================== Audit Logs ====================
  
  async getSiaeAuditLogsByCompany(companyId: string): Promise<SiaeAuditLog[]> {
    return await db.select().from(siaeAuditLogs)
      .where(eq(siaeAuditLogs.companyId, companyId))
      .orderBy(desc(siaeAuditLogs.createdAt));
  }
  
  async getSiaeAuditLogsByEntity(entityType: string, entityId: string): Promise<SiaeAuditLog[]> {
    return await db.select().from(siaeAuditLogs)
      .where(and(
        eq(siaeAuditLogs.entityType, entityType),
        eq(siaeAuditLogs.entityId, entityId)
      ))
      .orderBy(desc(siaeAuditLogs.createdAt));
  }
  
  async createSiaeAuditLog(log: InsertSiaeAuditLog): Promise<SiaeAuditLog> {
    const [created] = await db.insert(siaeAuditLogs).values(log).returning();
    return created;
  }
  
  // ==================== Numbered Seats ====================
  
  async getSiaeNumberedSeatsBySector(sectorId: string): Promise<SiaeNumberedSeat[]> {
    return await db.select().from(siaeNumberedSeats)
      .where(eq(siaeNumberedSeats.sectorId, sectorId))
      .orderBy(siaeNumberedSeats.rowNumber, siaeNumberedSeats.seatNumber);
  }
  
  async getSiaeNumberedSeat(id: string): Promise<SiaeNumberedSeat | undefined> {
    const [seat] = await db.select().from(siaeNumberedSeats).where(eq(siaeNumberedSeats.id, id));
    return seat;
  }
  
  async createSiaeNumberedSeat(seat: InsertSiaeNumberedSeat): Promise<SiaeNumberedSeat> {
    const [created] = await db.insert(siaeNumberedSeats).values(seat).returning();
    return created;
  }
  
  async updateSiaeNumberedSeat(id: string, seat: Partial<SiaeNumberedSeat>): Promise<SiaeNumberedSeat | undefined> {
    const [updated] = await db.update(siaeNumberedSeats)
      .set({ ...seat, updatedAt: new Date() })
      .where(eq(siaeNumberedSeats.id, id))
      .returning();
    return updated;
  }
  
  async deleteSiaeNumberedSeat(id: string): Promise<boolean> {
    const result = await db.delete(siaeNumberedSeats).where(eq(siaeNumberedSeats.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // ==================== Seed Functions ====================
  
  async seedSiaeTables(): Promise<void> {
    const existingGenres = await this.getSiaeEventGenres();
    if (existingGenres.length > 0) {
      console.log('SIAE tables already seeded, skipping...');
      return;
    }
    
    console.log('Seeding SIAE reference tables...');
    
    // TAB.1 - Generi Evento (per Decreto 23/07/2001 Allegato A)
    const eventGenres: InsertSiaeEventGenre[] = [
      { code: '01', name: 'Concerti musica classica', taxType: 'S', active: true },
      { code: '02', name: 'Concerti musica leggera', taxType: 'S', active: true },
      { code: '03', name: 'Concerti musica jazz', taxType: 'S', active: true },
      { code: '04', name: 'Balletti e spettacoli di danza', taxType: 'S', active: true },
      { code: '05', name: 'Opere liriche', taxType: 'S', active: true },
      { code: '06', name: 'Operette', taxType: 'S', active: true },
      { code: '07', name: 'Commedie musicali', taxType: 'S', active: true },
      { code: '08', name: 'Spettacoli di prosa', taxType: 'S', active: true },
      { code: '09', name: 'Spettacoli di varietà e rivista', taxType: 'S', active: true },
      { code: '10', name: 'Circo e spettacoli viaggianti', taxType: 'S', active: true },
      { code: '11', name: 'Cinema', taxType: 'S', active: true },
      { code: '12', name: 'Manifestazioni sportive', taxType: 'S', active: true },
      { code: '13', name: 'Discoteche e sale da ballo', taxType: 'I', active: true },
      { code: '14', name: 'Parchi di divertimento', taxType: 'I', active: true },
      { code: '15', name: 'Mostre ed esposizioni', taxType: 'I', active: true },
      { code: '16', name: 'Fiere', taxType: 'I', active: true },
      { code: '17', name: 'Convegni e congressi', taxType: 'I', active: true },
      { code: '18', name: 'Sfilate di moda', taxType: 'S', active: true },
      { code: '19', name: 'Festival', taxType: 'S', active: true },
      { code: '20', name: 'Altri spettacoli ed intrattenimenti', taxType: 'S', active: true },
    ];
    
    for (const genre of eventGenres) {
      await this.createSiaeEventGenre(genre);
    }
    
    // TAB.2 - Ordini di Posto (Sector Codes)
    const sectorCodes: InsertSiaeSectorCode[] = [
      { code: '01', name: 'Platea', sortOrder: 1, active: true },
      { code: '02', name: 'Poltrona', sortOrder: 2, active: true },
      { code: '03', name: 'Poltroncina', sortOrder: 3, active: true },
      { code: '04', name: 'Galleria', sortOrder: 4, active: true },
      { code: '05', name: 'Palco', sortOrder: 5, active: true },
      { code: '06', name: 'Loggione', sortOrder: 6, active: true },
      { code: '07', name: 'Tribuna', sortOrder: 7, active: true },
      { code: '08', name: 'Curva', sortOrder: 8, active: true },
      { code: '09', name: 'Gradinata', sortOrder: 9, active: true },
      { code: '10', name: 'Prato', sortOrder: 10, active: true },
      { code: '11', name: 'Parterre', sortOrder: 11, active: true },
      { code: '12', name: 'VIP / Premium', sortOrder: 12, active: true },
      { code: '13', name: 'Posto in piedi', sortOrder: 13, active: true },
      { code: '14', name: 'Posto unico', sortOrder: 14, active: true },
      { code: '99', name: 'Altro settore', sortOrder: 99, active: true },
    ];
    
    for (const sector of sectorCodes) {
      await this.createSiaeSectorCode(sector);
    }
    
    // TAB.3 - Tipi Titolo (Ticket Types)
    const ticketTypes: InsertSiaeTicketType[] = [
      { code: 'I', name: 'Biglietto intero', category: 'intero', active: true },
      { code: 'R1', name: 'Ridotto bambini', category: 'ridotto', active: true },
      { code: 'R2', name: 'Ridotto anziani', category: 'ridotto', active: true },
      { code: 'R3', name: 'Ridotto studenti', category: 'ridotto', active: true },
      { code: 'R4', name: 'Ridotto disabili', category: 'ridotto', active: true },
      { code: 'R5', name: 'Ridotto gruppi', category: 'ridotto', active: true },
      { code: 'R6', name: 'Ridotto convenzione', category: 'ridotto', active: true },
      { code: 'RX', name: 'Ridotto altro', category: 'ridotto', active: true },
      { code: 'O1', name: 'Omaggio stampa', category: 'omaggio', active: true },
      { code: 'O2', name: 'Omaggio sponsor', category: 'omaggio', active: true },
      { code: 'O3', name: 'Omaggio artisti', category: 'omaggio', active: true },
      { code: 'O4', name: 'Omaggio autorità', category: 'omaggio', active: true },
      { code: 'O5', name: 'Omaggio accompagnatore', category: 'omaggio', active: true },
      { code: 'OX', name: 'Omaggio altro', category: 'omaggio', active: true },
      { code: 'S', name: 'Abbonamento', category: 'servizio', active: true },
    ];
    
    for (const ticketType of ticketTypes) {
      await this.createSiaeTicketType(ticketType);
    }
    
    // TAB.4 - Prestazioni Complementari (Service Codes)
    const serviceCodes: InsertSiaeServiceCode[] = [
      { code: 'GR', name: 'Guardaroba', category: 'servizio', active: true },
      { code: 'PR', name: 'Parcheggio', category: 'servizio', active: true },
      { code: 'CO', name: 'Servizio catering', category: 'servizio', active: true },
      { code: 'BI', name: 'Noleggio binocolo', category: 'servizio', active: true },
      { code: 'CU', name: 'Noleggio cuffie', category: 'servizio', active: true },
      { code: 'PS', name: 'Programma di sala', category: 'servizio', active: true },
      { code: 'DR', name: 'Drink incluso', category: 'servizio', active: true },
      { code: 'CE', name: 'Cena inclusa', category: 'servizio', active: true },
      { code: 'TR', name: 'Trasporto incluso', category: 'servizio', active: true },
      { code: 'VG', name: 'Visita guidata', category: 'servizio', active: true },
      { code: 'MG', name: 'Meet & Greet', category: 'servizio', active: true },
      { code: 'FR', name: 'Foto ricordo', category: 'servizio', active: true },
      { code: 'ME', name: 'Merchandise', category: 'servizio', active: true },
      { code: 'XX', name: 'Altro servizio', category: 'servizio', active: true },
    ];
    
    for (const service of serviceCodes) {
      await this.createSiaeServiceCode(service);
    }
    
    // TAB.5 - Causali Annullamento (Cancellation Reasons) - Art. 9
    const cancellationReasons: InsertSiaeCancellationReason[] = [
      { code: '01', name: 'Annullamento evento', requiresProof: true, active: true },
      { code: '02', name: 'Rinvio evento', requiresProof: true, active: true },
      { code: '03', name: 'Modifica evento', requiresProof: true, active: true },
      { code: '04', name: 'Richiesta cliente - rimborso', requiresProof: false, active: true },
      { code: '05', name: 'Richiesta cliente - cambio data', requiresProof: false, active: true },
      { code: '06', name: 'Errore emissione', requiresProof: true, active: true },
      { code: '07', name: 'Duplicato', requiresProof: true, active: true },
      { code: '08', name: 'Frode accertata', requiresProof: true, active: true },
      { code: '09', name: 'Mancato pagamento', requiresProof: false, active: true },
      { code: '10', name: 'Cambio nominativo - vecchio titolo', requiresProof: false, active: true },
      { code: '11', name: 'Rimessa in vendita - vecchio titolo', requiresProof: false, active: true },
      { code: '12', name: 'Revoca per forza maggiore', requiresProof: true, active: true },
      { code: '99', name: 'Altra causale', requiresProof: true, active: true },
    ];
    
    for (const reason of cancellationReasons) {
      await this.createSiaeCancellationReason(reason);
    }
    
    console.log('SIAE reference tables seeded successfully!');
  }

  // ==================== Smart Card Sessions ====================
  
  async getActiveSmartCardSession(userId: string): Promise<SiaeSmartCardSession | null> {
    const [session] = await db
      .select()
      .from(siaeSmartCardSessions)
      .where(
        and(
          eq(siaeSmartCardSessions.userId, userId),
          isNull(siaeSmartCardSessions.disconnectedAt)
        )
      )
      .orderBy(desc(siaeSmartCardSessions.connectedAt))
      .limit(1);
    return session || null;
  }

  async getSmartCardSessionById(id: string): Promise<SiaeSmartCardSession | null> {
    const [session] = await db
      .select()
      .from(siaeSmartCardSessions)
      .where(eq(siaeSmartCardSessions.id, id))
      .limit(1);
    return session || null;
  }

  async createSmartCardSession(data: InsertSiaeSmartCardSession): Promise<SiaeSmartCardSession> {
    const [session] = await db
      .insert(siaeSmartCardSessions)
      .values(data)
      .returning();
    return session;
  }

  async updateSmartCardSession(id: string, data: Partial<InsertSiaeSmartCardSession>): Promise<SiaeSmartCardSession | null> {
    const [session] = await db
      .update(siaeSmartCardSessions)
      .set(data)
      .where(eq(siaeSmartCardSessions.id, id))
      .returning();
    return session || null;
  }

  async closeSmartCardSession(id: string): Promise<void> {
    await db
      .update(siaeSmartCardSessions)
      .set({
        status: 'disconnected',
        disconnectedAt: new Date()
      })
      .where(eq(siaeSmartCardSessions.id, id));
  }

  async closeActiveSmartCardSessions(userId: string): Promise<void> {
    await db
      .update(siaeSmartCardSessions)
      .set({
        status: 'disconnected',
        disconnectedAt: new Date()
      })
      .where(
        and(
          eq(siaeSmartCardSessions.userId, userId),
          isNull(siaeSmartCardSessions.disconnectedAt)
        )
      );
  }

  async incrementSmartCardSessionCounters(sessionId: string): Promise<void> {
    await db
      .update(siaeSmartCardSessions)
      .set({
        ticketsEmittedCount: sql`${siaeSmartCardSessions.ticketsEmittedCount} + 1`,
        sealsUsedCount: sql`${siaeSmartCardSessions.sealsUsedCount} + 1`,
        lastActivityAt: new Date()
      })
      .where(eq(siaeSmartCardSessions.id, sessionId));
  }

  // ==================== Smart Card Seal Logs ====================

  async createSmartCardSealLog(data: InsertSiaeSmartCardSealLog): Promise<SiaeSmartCardSealLog> {
    const [log] = await db
      .insert(siaeSmartCardSealLogs)
      .values(data)
      .returning();
    return log;
  }

  async getSmartCardSealLogsBySession(sessionId: string): Promise<SiaeSmartCardSealLog[]> {
    return await db
      .select()
      .from(siaeSmartCardSealLogs)
      .where(eq(siaeSmartCardSealLogs.sessionId, sessionId))
      .orderBy(desc(siaeSmartCardSealLogs.requestedAt));
  }

  // ==================== Audit Log Helper ====================

  async createAuditLog(data: {
    companyId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    description?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    fiscalSealCode?: string | null;
    cardCode?: string | null;
  }): Promise<SiaeAuditLog> {
    const [log] = await db
      .insert(siaeAuditLogs)
      .values({
        companyId: data.companyId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        description: data.description || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        fiscalSealCode: data.fiscalSealCode || null,
        cardCode: data.cardCode || null
      })
      .returning();
    return log;
  }

  // ==================== Activation Card Usage Stats ====================

  async getActivationCardUsageStats(cardId: string): Promise<{
    totalSeals: number;
    totalTickets: number;
    organizers: {
      userId: string;
      username: string;
      fullName: string;
      ticketCount: number;
      lastEmission: Date | null;
    }[];
  }> {
    // Get total seals for this card
    const sealsResult = await db
      .select({ count: count() })
      .from(siaeFiscalSeals)
      .where(eq(siaeFiscalSeals.cardId, cardId));
    
    const totalSeals = sealsResult[0]?.count || 0;

    // Get tickets with organizer info grouped by user
    const ticketsWithOrganizers = await db
      .select({
        userId: siaeTickets.issuedByUserId,
        username: users.username,
        fullName: users.fullName,
        ticketCount: count(),
        lastEmission: sql<Date>`MAX(${siaeTickets.emissionDate})`,
      })
      .from(siaeTickets)
      .innerJoin(siaeFiscalSeals, eq(siaeTickets.fiscalSealId, siaeFiscalSeals.id))
      .innerJoin(users, eq(siaeTickets.issuedByUserId, users.id))
      .where(eq(siaeFiscalSeals.cardId, cardId))
      .groupBy(siaeTickets.issuedByUserId, users.username, users.fullName);

    // Get total tickets
    const totalTicketsResult = await db
      .select({ count: count() })
      .from(siaeTickets)
      .innerJoin(siaeFiscalSeals, eq(siaeTickets.fiscalSealId, siaeFiscalSeals.id))
      .where(eq(siaeFiscalSeals.cardId, cardId));

    const totalTickets = totalTicketsResult[0]?.count || 0;

    return {
      totalSeals,
      totalTickets,
      organizers: ticketsWithOrganizers.map(row => ({
        userId: row.userId || '',
        username: row.username || '',
        fullName: row.fullName || '',
        ticketCount: Number(row.ticketCount),
        lastEmission: row.lastEmission,
      })),
    };
  }

  // Get activation card by card serial (matching physical card)
  async getActivationCardBySerial(serial: string): Promise<SiaeActivationCard | undefined> {
    // Try matching against cardCode field first
    const [card] = await db
      .select()
      .from(siaeActivationCards)
      .where(eq(siaeActivationCards.cardCode, serial));
    return card;
  }

  // ==================== Cashier Allocations ====================

  async getCashierAllocationsByEvent(eventId: string): Promise<SiaeCashierAllocation[]> {
    return await db
      .select()
      .from(siaeCashierAllocations)
      .where(eq(siaeCashierAllocations.eventId, eventId))
      .orderBy(desc(siaeCashierAllocations.createdAt));
  }

  async getCashierAllocationByCashierAndEvent(cashierId: string, eventId: string): Promise<SiaeCashierAllocation | undefined> {
    const [allocation] = await db
      .select()
      .from(siaeCashierAllocations)
      .where(and(
        eq(siaeCashierAllocations.cashierId, cashierId),
        eq(siaeCashierAllocations.eventId, eventId),
        eq(siaeCashierAllocations.isActive, true)
      ));
    return allocation;
  }

  async getCashierAllocation(id: string): Promise<SiaeCashierAllocation | undefined> {
    const [allocation] = await db
      .select()
      .from(siaeCashierAllocations)
      .where(eq(siaeCashierAllocations.id, id));
    return allocation;
  }

  async createCashierAllocation(data: InsertSiaeCashierAllocation): Promise<SiaeCashierAllocation> {
    const [allocation] = await db
      .insert(siaeCashierAllocations)
      .values(data)
      .returning();
    return allocation;
  }

  async updateCashierAllocation(id: string, data: Partial<SiaeCashierAllocation>): Promise<SiaeCashierAllocation | undefined> {
    const [allocation] = await db
      .update(siaeCashierAllocations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(siaeCashierAllocations.id, id))
      .returning();
    return allocation;
  }

  async incrementCashierQuotaUsed(id: string): Promise<SiaeCashierAllocation | undefined> {
    const [allocation] = await db
      .update(siaeCashierAllocations)
      .set({ 
        quotaUsed: sql`${siaeCashierAllocations.quotaUsed} + 1`,
        updatedAt: new Date()
      })
      .where(eq(siaeCashierAllocations.id, id))
      .returning();
    return allocation;
  }

  async decrementCashierQuotaUsed(id: string): Promise<SiaeCashierAllocation | undefined> {
    const [allocation] = await db
      .update(siaeCashierAllocations)
      .set({ 
        quotaUsed: sql`GREATEST(0, ${siaeCashierAllocations.quotaUsed} - 1)`,
        updatedAt: new Date()
      })
      .where(eq(siaeCashierAllocations.id, id))
      .returning();
    return allocation;
  }

  async getCashierAllocationsByCashier(cashierId: string): Promise<SiaeCashierAllocation[]> {
    return await db
      .select()
      .from(siaeCashierAllocations)
      .where(and(
        eq(siaeCashierAllocations.cashierId, cashierId),
        eq(siaeCashierAllocations.isActive, true)
      ))
      .orderBy(desc(siaeCashierAllocations.createdAt));
  }

  async deleteCashierAllocation(id: string): Promise<boolean> {
    const result = await db
      .delete(siaeCashierAllocations)
      .where(eq(siaeCashierAllocations.id, id));
    return true;
  }

  // ==================== Ticket Audit ====================

  async createTicketAudit(data: InsertSiaeTicketAudit): Promise<SiaeTicketAudit> {
    const [audit] = await db
      .insert(siaeTicketAudit)
      .values(data)
      .returning();
    return audit;
  }

  async getTicketAuditByTicket(ticketId: string): Promise<SiaeTicketAudit[]> {
    return await db
      .select()
      .from(siaeTicketAudit)
      .where(eq(siaeTicketAudit.ticketId, ticketId))
      .orderBy(desc(siaeTicketAudit.createdAt));
  }

  async getTicketAuditByCompany(companyId: string, limit: number = 100): Promise<SiaeTicketAudit[]> {
    return await db
      .select()
      .from(siaeTicketAudit)
      .where(eq(siaeTicketAudit.companyId, companyId))
      .orderBy(desc(siaeTicketAudit.createdAt))
      .limit(limit);
  }

  async getTicketAuditByUser(userId: string, limit: number = 100): Promise<SiaeTicketAudit[]> {
    return await db
      .select()
      .from(siaeTicketAudit)
      .where(eq(siaeTicketAudit.performedBy, userId))
      .orderBy(desc(siaeTicketAudit.createdAt))
      .limit(limit);
  }

  async getTodayTicketsByUser(userId: string, eventId: string): Promise<SiaeTicket[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(siaeTickets)
      .where(and(
        eq(siaeTickets.issuedByUserId, userId),
        eq(siaeTickets.ticketedEventId, eventId),
        gt(siaeTickets.emissionDate, today),
        lt(siaeTickets.emissionDate, tomorrow)
      ))
      .orderBy(desc(siaeTickets.emissionDate));
  }

  // ==================== Atomic Transaction Methods ====================

  async emitTicketWithAtomicQuota(params: {
    allocationId: string;
    eventId: string;
    sectorId: string;
    ticketCode: string;
    ticketType: string;
    ticketPrice: number;
    customerId: string | null;
    issuedByUserId: string;
    participantFirstName: string | null;
    participantLastName: string | null;
    isComplimentary: boolean;
    paymentMethod: string;
    currentTicketsSold: number;
    currentTotalRevenue: number;
    currentAvailableSeats: number;
  }): Promise<{ success: boolean; ticket?: SiaeTicket; error?: string }> {
    try {
      const result = await db.transaction(async (tx) => {
        // Step 1: Lock row with SELECT FOR UPDATE to prevent race conditions
        const lockedAllocation = await tx.execute(
          sql`SELECT * FROM siae_cashier_allocations 
              WHERE id = ${params.allocationId} FOR UPDATE`
        );
        
        const allocation = lockedAllocation.rows?.[0] as any;
        if (!allocation) {
          throw new Error("ALLOCATION_NOT_FOUND");
        }
        
        // Check quota AFTER acquiring lock
        if (allocation.quota_used >= allocation.quota_quantity) {
          throw new Error("QUOTA_EXCEEDED");
        }
        
        // Step 2: Now safe to update quota (row is locked)
        await tx
          .update(siaeCashierAllocations)
          .set({
            quotaUsed: sql`${siaeCashierAllocations.quotaUsed} + 1`,
            updatedAt: new Date()
          })
          .where(eq(siaeCashierAllocations.id, params.allocationId));

        // Step 3: Create ticket
        const progressiveNumber = params.currentTicketsSold + 1;
        const [ticket] = await tx
          .insert(siaeTickets)
          .values({
            ticketedEventId: params.eventId,
            sectorId: params.sectorId,
            ticketCode: params.ticketCode,
            progressiveNumber,
            ticketType: params.ticketType,
            ticketPrice: params.ticketPrice.toString(),
            emissionDate: new Date(),
            status: 'active',
            issuedByUserId: params.issuedByUserId,
            customerId: params.customerId,
            participantFirstName: params.participantFirstName,
            participantLastName: params.participantLastName,
            isComplimentary: params.isComplimentary,
            paymentMethod: params.paymentMethod
          })
          .returning();

        // Step 3: Update event stats
        await tx
          .update(siaeTicketedEvents)
          .set({
            ticketsSold: progressiveNumber,
            totalRevenue: (params.currentTotalRevenue + params.ticketPrice).toString(),
            updatedAt: new Date()
          })
          .where(eq(siaeTicketedEvents.id, params.eventId));

        // Step 4: Update sector availability
        await tx
          .update(siaeEventSectors)
          .set({
            availableSeats: sql`${siaeEventSectors.availableSeats} - 1`,
            updatedAt: new Date()
          })
          .where(eq(siaeEventSectors.id, params.sectorId));

        return ticket;
      });

      return { success: true, ticket: result };
    } catch (error: any) {
      if (error.message === "QUOTA_EXCEEDED") {
        return { success: false, error: "Quota biglietti esaurita. Contatta il gestore per aumentare la quota." };
      }
      throw error;
    }
  }

  async cancelTicketWithAtomicQuotaRestore(params: {
    ticketId: string;
    cancelledByUserId: string;
    cancellationReason: string;
    issuedByUserId: string | null;
    ticketedEventId: string;
    sectorId: string;
    ticketPrice: number;
  }): Promise<{ success: boolean; ticket?: SiaeTicket; error?: string }> {
    try {
      const result = await db.transaction(async (tx) => {
        // Step 1: Update ticket status to cancelled
        const [cancelledTicket] = await tx
          .update(siaeTickets)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledByUserId: params.cancelledByUserId,
            cancellationReason: params.cancellationReason,
            updatedAt: new Date()
          })
          .where(and(
            eq(siaeTickets.id, params.ticketId),
            sql`${siaeTickets.status} != 'cancelled'`
          ))
          .returning();

        if (!cancelledTicket) {
          throw new Error("ALREADY_CANCELLED");
        }

        // Step 2: Restore sector availability
        await tx
          .update(siaeEventSectors)
          .set({
            availableSeats: sql`${siaeEventSectors.availableSeats} + 1`,
            updatedAt: new Date()
          })
          .where(eq(siaeEventSectors.id, params.sectorId));

        // Step 3: Update event stats
        await tx
          .update(siaeTicketedEvents)
          .set({
            ticketsCancelled: sql`COALESCE(${siaeTicketedEvents.ticketsCancelled}, 0) + 1`,
            totalRevenue: sql`GREATEST(0, COALESCE(${siaeTicketedEvents.totalRevenue}::numeric, 0) - ${params.ticketPrice})::text`,
            updatedAt: new Date()
          })
          .where(eq(siaeTicketedEvents.id, params.ticketedEventId));

        // Step 4: Restore cashier quota if issued by a cashier
        if (params.issuedByUserId) {
          await tx
            .update(siaeCashierAllocations)
            .set({
              quotaUsed: sql`GREATEST(0, ${siaeCashierAllocations.quotaUsed} - 1)`,
              updatedAt: new Date()
            })
            .where(and(
              eq(siaeCashierAllocations.cashierId, params.issuedByUserId),
              eq(siaeCashierAllocations.eventId, params.ticketedEventId),
              eq(siaeCashierAllocations.isActive, true)
            ));
        }

        return cancelledTicket;
      });

      return { success: true, ticket: result };
    } catch (error: any) {
      if (error.message === "ALREADY_CANCELLED") {
        return { success: false, error: "Il biglietto è già stato annullato" };
      }
      throw error;
    }
  }
}

export const siaeStorage = new SiaeStorage();
