// Referenced from blueprints: javascript_database, javascript_log_in_with_replit
import {
  users,
  companies,
  locations,
  eventFormats,
  events,
  stations,
  products,
  suppliers,
  priceLists,
  priceListItems,
  stocks,
  stockMovements,
  purchaseOrders,
  purchaseOrderItems,
  // New module tables
  fixedCosts,
  extraCosts,
  maintenances,
  accountingDocuments,
  staff,
  staffAssignments,
  staffPayments,
  cashSectors,
  cashPositions,
  cashEntries,
  cashFunds,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Location,
  type InsertLocation,
  type EventFormat,
  type InsertEventFormat,
  type Event,
  type InsertEvent,
  type Station,
  type InsertStation,
  type Product,
  type InsertProduct,
  type Supplier,
  type InsertSupplier,
  type PriceList,
  type InsertPriceList,
  type PriceListItem,
  type InsertPriceListItem,
  type Stock,
  type StockMovement,
  type InsertStockMovement,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  // New module types
  type FixedCost,
  type InsertFixedCost,
  type ExtraCost,
  type InsertExtraCost,
  type Maintenance,
  type InsertMaintenance,
  type AccountingDocument,
  type InsertAccountingDocument,
  type Staff,
  type InsertStaff,
  type StaffAssignment,
  type InsertStaffAssignment,
  type StaffPayment,
  type InsertStaffPayment,
  type CashSector,
  type InsertCashSector,
  type CashPosition,
  type InsertCashPosition,
  type CashEntry,
  type InsertCashEntry,
  type CashFund,
  type InsertCashFund,
  nightFiles,
  type NightFile,
  type InsertNightFile,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, inArray, sql, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Company operations
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<Company>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<boolean>;
  
  // Location operations
  getLocationsByCompany(companyId: string): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<Location>): Promise<Location | undefined>;
  
  // Event Format operations
  getEventFormatsByCompany(companyId: string): Promise<EventFormat[]>;
  getEventFormat(id: string): Promise<EventFormat | undefined>;
  createEventFormat(format: InsertEventFormat): Promise<EventFormat>;
  updateEventFormat(id: string, format: Partial<EventFormat>): Promise<EventFormat | undefined>;
  deleteEventFormat(id: string): Promise<boolean>;
  
  // Event operations
  getEventsByCompany(companyId: string): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<Event>): Promise<Event | undefined>;
  // Recurring events operations
  getEventsBySeries(seriesId: string): Promise<Event[]>;
  createRecurringEvents(events: InsertEvent[]): Promise<Event[]>;
  
  // Station operations
  getStationsByEvent(eventId: string): Promise<Station[]>;
  getStationsByCompany(companyId: string): Promise<Station[]>;
  getGeneralStationsByCompany(companyId: string): Promise<Station[]>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: string, station: Partial<Station>): Promise<Station | undefined>;
  deleteStation(id: string): Promise<boolean>;
  
  // Product operations
  getProductsByCompany(companyId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByCodeAndCompany(code: string, companyId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;
  
  // Supplier operations
  getSuppliersByCompany(companyId: string): Promise<Supplier[]>;
  getSupplierById(id: string, companyId: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, companyId: string, supplier: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string, companyId: string): Promise<boolean>;
  
  // Stock operations
  getGeneralStocks(companyId: string): Promise<Stock[]>;
  getEventStocks(eventId: string): Promise<Stock[]>;
  getStationStocks(stationId: string): Promise<Stock[]>;
  upsertStock(stock: Partial<Stock> & { companyId: string; productId: string }): Promise<Stock>;
  
  // Stock movement operations
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  getMovementsByCompany(companyId: string): Promise<StockMovement[]>;
  getMovementsByEvent(eventId: string): Promise<StockMovement[]>;
  
  // Price list operations
  getPriceListsByCompany(companyId: string): Promise<PriceList[]>;
  getPriceListByIdAndCompany(id: string, companyId: string): Promise<PriceList | undefined>;
  createPriceList(priceList: InsertPriceList): Promise<PriceList>;
  updatePriceList(id: string, companyId: string, priceList: Partial<PriceList>): Promise<PriceList | undefined>;
  deletePriceList(id: string, companyId: string): Promise<boolean>;
  
  // Price list item operations
  getPriceListItems(priceListId: string, companyId: string): Promise<PriceListItem[]>;
  getPriceListItemWithCompanyCheck(id: string, companyId: string): Promise<PriceListItem | undefined>;
  createPriceListItem(item: InsertPriceListItem, companyId: string): Promise<PriceListItem>;
  updatePriceListItem(id: string, companyId: string, item: Partial<PriceListItem>): Promise<PriceListItem | undefined>;
  deletePriceListItem(id: string, companyId: string): Promise<boolean>;
  bulkCreatePriceListItems(items: InsertPriceListItem[], companyId: string): Promise<PriceListItem[]>;
  
  // Purchase Order operations
  getPurchaseOrdersByCompany(companyId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string, companyId: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, companyId: string, order: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string, companyId: string): Promise<boolean>;
  
  // Purchase Order Item operations
  getPurchaseOrderItems(orderId: string, companyId: string): Promise<PurchaseOrderItem[]>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem, companyId: string): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: string, companyId: string, item: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | undefined>;
  deletePurchaseOrderItem(id: string, companyId: string): Promise<boolean>;
  
  // AI Analysis operations
  analyzeWithAI(companyId: string, query: string, context?: string): Promise<{
    answer: string;
    data?: any;
  }>;
  generateInsights(companyId: string): Promise<Array<{
    title: string;
    description: string;
    type: 'info' | 'warning' | 'success';
    data?: any;
  }>>;
  
  // Suggested orders based on alerts and consumption
  generateSuggestedOrders(companyId: string): Promise<Array<{
    productId: string;
    productName: string;
    productCode: string;
    currentStock: number;
    minThreshold: number;
    avgConsumption: number;
    suggestedQuantity: number;
    reason: string;
  }>>;
  
  // Super admin analytics
  getSuperAdminAnalytics(): Promise<{
    companyMetrics: Array<{ companyId: string; companyName: string; eventCount: number; totalRevenue: number }>;
    topProducts: Array<{ productId: string; productName: string; totalConsumed: number }>;
    eventStatistics: { total: number; active: number; completed: number };
  }>;

  // ==================== MODULO CONTABILITÀ ====================
  
  // Fixed Costs operations
  getFixedCostsByCompany(companyId: string): Promise<FixedCost[]>;
  getFixedCostsByLocation(locationId: string, companyId: string): Promise<FixedCost[]>;
  getFixedCost(id: string, companyId: string): Promise<FixedCost | undefined>;
  createFixedCost(cost: InsertFixedCost): Promise<FixedCost>;
  updateFixedCost(id: string, companyId: string, cost: Partial<FixedCost>): Promise<FixedCost | undefined>;
  deleteFixedCost(id: string, companyId: string): Promise<boolean>;

  // Extra Costs operations
  getExtraCostsByCompany(companyId: string): Promise<ExtraCost[]>;
  getExtraCostsByEvent(eventId: string, companyId: string): Promise<ExtraCost[]>;
  getExtraCost(id: string, companyId: string): Promise<ExtraCost | undefined>;
  createExtraCost(cost: InsertExtraCost): Promise<ExtraCost>;
  updateExtraCost(id: string, companyId: string, cost: Partial<ExtraCost>): Promise<ExtraCost | undefined>;
  deleteExtraCost(id: string, companyId: string): Promise<boolean>;

  // Maintenances operations
  getMaintenancesByCompany(companyId: string): Promise<Maintenance[]>;
  getMaintenancesByLocation(locationId: string, companyId: string): Promise<Maintenance[]>;
  getMaintenance(id: string, companyId: string): Promise<Maintenance | undefined>;
  createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance>;
  updateMaintenance(id: string, companyId: string, maintenance: Partial<Maintenance>): Promise<Maintenance | undefined>;
  deleteMaintenance(id: string, companyId: string): Promise<boolean>;

  // Accounting Documents operations
  getAccountingDocumentsByCompany(companyId: string): Promise<AccountingDocument[]>;
  getAccountingDocumentsByEvent(eventId: string, companyId: string): Promise<AccountingDocument[]>;
  getAccountingDocument(id: string, companyId: string): Promise<AccountingDocument | undefined>;
  createAccountingDocument(doc: InsertAccountingDocument): Promise<AccountingDocument>;
  updateAccountingDocument(id: string, companyId: string, doc: Partial<AccountingDocument>): Promise<AccountingDocument | undefined>;
  deleteAccountingDocument(id: string, companyId: string): Promise<boolean>;

  // ==================== MODULO PERSONALE ====================
  
  // Staff operations
  getStaffByCompany(companyId: string): Promise<Staff[]>;
  getStaff(id: string, companyId: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, companyId: string, staff: Partial<Staff>): Promise<Staff | undefined>;
  deleteStaff(id: string, companyId: string): Promise<boolean>;

  // Staff Assignments operations
  getStaffAssignmentsByCompany(companyId: string): Promise<StaffAssignment[]>;
  getStaffAssignmentsByEvent(eventId: string, companyId: string): Promise<StaffAssignment[]>;
  getStaffAssignmentsByStaff(staffId: string, companyId: string): Promise<StaffAssignment[]>;
  getStaffAssignment(id: string, companyId: string): Promise<StaffAssignment | undefined>;
  createStaffAssignment(assignment: InsertStaffAssignment): Promise<StaffAssignment>;
  updateStaffAssignment(id: string, companyId: string, assignment: Partial<StaffAssignment>): Promise<StaffAssignment | undefined>;
  deleteStaffAssignment(id: string, companyId: string): Promise<boolean>;

  // Staff Payments operations
  getStaffPaymentsByCompany(companyId: string): Promise<StaffPayment[]>;
  getStaffPaymentsByStaff(staffId: string, companyId: string): Promise<StaffPayment[]>;
  getStaffPayment(id: string, companyId: string): Promise<StaffPayment | undefined>;
  createStaffPayment(payment: InsertStaffPayment): Promise<StaffPayment>;
  updateStaffPayment(id: string, companyId: string, payment: Partial<StaffPayment>): Promise<StaffPayment | undefined>;
  deleteStaffPayment(id: string, companyId: string): Promise<boolean>;

  // ==================== MODULO CASSA ====================
  
  // Cash Sectors operations
  getCashSectorsByCompany(companyId: string): Promise<CashSector[]>;
  getCashSector(id: string, companyId: string): Promise<CashSector | undefined>;
  createCashSector(sector: InsertCashSector): Promise<CashSector>;
  updateCashSector(id: string, companyId: string, sector: Partial<CashSector>): Promise<CashSector | undefined>;
  deleteCashSector(id: string, companyId: string): Promise<boolean>;

  // Cash Positions operations
  getCashPositionsByEvent(eventId: string, companyId: string): Promise<CashPosition[]>;
  getCashPositionsBySector(sectorId: string, companyId: string): Promise<CashPosition[]>;
  getCashPosition(id: string, companyId: string): Promise<CashPosition | undefined>;
  createCashPosition(position: InsertCashPosition): Promise<CashPosition>;
  updateCashPosition(id: string, companyId: string, position: Partial<CashPosition>): Promise<CashPosition | undefined>;
  deleteCashPosition(id: string, companyId: string): Promise<boolean>;

  // Cash Entries operations
  getCashEntriesByPosition(positionId: string, companyId: string): Promise<CashEntry[]>;
  getCashEntriesByEvent(eventId: string, companyId: string): Promise<CashEntry[]>;
  getCashEntry(id: string, companyId: string): Promise<CashEntry | undefined>;
  createCashEntry(entry: InsertCashEntry): Promise<CashEntry>;
  updateCashEntry(id: string, companyId: string, entry: Partial<CashEntry>): Promise<CashEntry | undefined>;
  deleteCashEntry(id: string, companyId: string): Promise<boolean>;

  // Cash Funds operations
  getCashFundsByPosition(positionId: string, companyId: string): Promise<CashFund[]>;
  getCashFundsByEvent(eventId: string, companyId: string): Promise<CashFund[]>;
  getCashFundsByCompany(companyId: string): Promise<CashFund[]>;
  getCashFund(id: string, companyId: string): Promise<CashFund | undefined>;
  createCashFund(fund: InsertCashFund): Promise<CashFund>;
  updateCashFund(id: string, companyId: string, fund: Partial<CashFund>): Promise<CashFund | undefined>;
  deleteCashFund(id: string, companyId: string): Promise<boolean>;
  
  // Cash Positions by company
  getCashPositionsByCompany(companyId: string): Promise<CashPosition[]>;
  
  // Cash Entries by company
  getCashEntriesByCompany(companyId: string): Promise<CashEntry[]>;
  
  // Night Files
  getNightFilesByCompany(companyId: string): Promise<NightFile[]>;
  getNightFileByEvent(eventId: string, companyId: string): Promise<NightFile | undefined>;
  getNightFile(id: string, companyId: string): Promise<NightFile | undefined>;
  createNightFile(nightFile: InsertNightFile): Promise<NightFile>;
  updateNightFile(id: string, companyId: string, nightFile: Partial<NightFile>): Promise<NightFile | undefined>;
  approveNightFile(id: string, companyId: string, userId: string): Promise<NightFile | undefined>;
  deleteNightFile(id: string, companyId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetPasswordToken, token));
    return user;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = await db.insert(users).values(userData as any).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Filter out undefined values to prevent overwriting existing fields with undefined
    const cleanedData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) => value !== undefined)
    );
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...cleanedData, // Only update fields that were actually provided
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Company operations
  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(companyData).returning();
    return company;
  }

  async updateCompany(id: string, companyData: Partial<Company>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ ...companyData, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async deleteCompany(id: string): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Location operations
  async getLocationsByCompany(companyId: string): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.companyId, companyId));
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(locationData: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(locationData).returning();
    return location;
  }

  async updateLocation(id: string, locationData: Partial<Location>): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set({ ...locationData, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }
  
  // Event Format operations
  async getEventFormatsByCompany(companyId: string): Promise<EventFormat[]> {
    return await db.select().from(eventFormats).where(eq(eventFormats.companyId, companyId));
  }

  async getEventFormat(id: string): Promise<EventFormat | undefined> {
    const [format] = await db.select().from(eventFormats).where(eq(eventFormats.id, id));
    return format;
  }

  async createEventFormat(formatData: InsertEventFormat): Promise<EventFormat> {
    const [format] = await db.insert(eventFormats).values(formatData).returning();
    return format;
  }

  async updateEventFormat(id: string, formatData: Partial<EventFormat>): Promise<EventFormat | undefined> {
    const [format] = await db
      .update(eventFormats)
      .set({ ...formatData, updatedAt: new Date() })
      .where(eq(eventFormats.id, id))
      .returning();
    return format;
  }

  async deleteEventFormat(id: string): Promise<boolean> {
    const result = await db.delete(eventFormats).where(eq(eventFormats.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Event operations
  async getEventsByCompany(companyId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.companyId, companyId));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData as any).returning();
    return event;
  }

  async updateEvent(id: string, eventData: Partial<Event>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...eventData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async getEventsBySeries(seriesId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.seriesId, seriesId));
  }

  async createRecurringEvents(eventsData: InsertEvent[]): Promise<Event[]> {
    if (eventsData.length === 0) return [];
    const createdEvents = await db.insert(events).values(eventsData as any).returning();
    return createdEvents;
  }
  
  // Station operations
  async getStationsByEvent(eventId: string): Promise<Station[]> {
    return await db.select().from(stations)
      .where(and(eq(stations.eventId, eventId), isNull(stations.deletedAt)));
  }

  async getStationsByCompany(companyId: string): Promise<Station[]> {
    return await db.select().from(stations)
      .where(and(eq(stations.companyId, companyId), isNull(stations.deletedAt)));
  }

  async getGeneralStationsByCompany(companyId: string): Promise<Station[]> {
    return await db.select().from(stations)
      .where(and(
        eq(stations.companyId, companyId), 
        isNull(stations.eventId),
        isNull(stations.deletedAt)
      ));
  }

  async createStation(stationData: InsertStation): Promise<Station> {
    const [station] = await db.insert(stations).values(stationData).returning();
    return station;
  }

  async updateStation(id: string, stationData: Partial<Station>): Promise<Station | undefined> {
    const [station] = await db
      .update(stations)
      .set({ ...stationData, updatedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();
    return station;
  }

  async deleteStation(id: string): Promise<boolean> {
    // Soft delete - preserves historical data for events
    const [station] = await db
      .update(stations)
      .set({ deletedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();
    return !!station;
  }
  
  // Product operations
  async getProductsByCompany(companyId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.companyId, companyId));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async getProductByCodeAndCompany(code: string, companyId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.code, code),
        eq(products.companyId, companyId)
      ));
    return product;
  }

  async bulkCreateProducts(productsList: InsertProduct[]): Promise<Product[]> {
    if (productsList.length === 0) return [];
    return await db.insert(products).values(productsList).returning();
  }
  
  // Supplier operations
  async getSuppliersByCompany(companyId: string): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
  }

  async getSupplierById(id: string, companyId: string): Promise<Supplier | undefined> {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.companyId, companyId)
      ));
    return supplier;
  }

  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(supplierData).returning();
    return supplier;
  }

  async updateSupplier(id: string, companyId: string, supplierData: Partial<Supplier>): Promise<Supplier | undefined> {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...supplierData, updatedAt: new Date() })
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.companyId, companyId)
      ))
      .returning();
    return supplier;
  }

  async deleteSupplier(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.companyId, companyId)
      ))
      .returning();
    return result.length > 0;
  }
  
  // Stock operations
  async getGeneralStocks(companyId: string): Promise<Stock[]> {
    return await db
      .select()
      .from(stocks)
      .where(and(
        eq(stocks.companyId, companyId),
        isNull(stocks.eventId),
        isNull(stocks.stationId)
      ));
  }

  async getEventStocks(eventId: string): Promise<Stock[]> {
    return await db
      .select()
      .from(stocks)
      .where(eq(stocks.eventId, eventId));
  }

  async getStationStocks(stationId: string): Promise<Stock[]> {
    return await db
      .select()
      .from(stocks)
      .where(eq(stocks.stationId, stationId));
  }

  async upsertStock(stockData: Partial<Stock> & { companyId: string; productId: string }): Promise<Stock> {
    const existing = await db
      .select()
      .from(stocks)
      .where(and(
        eq(stocks.companyId, stockData.companyId),
        eq(stocks.productId, stockData.productId),
        stockData.eventId ? eq(stocks.eventId, stockData.eventId) : isNull(stocks.eventId),
        stockData.stationId ? eq(stocks.stationId, stockData.stationId) : isNull(stocks.stationId)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(stocks)
        .set({ ...stockData, updatedAt: new Date() })
        .where(eq(stocks.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(stocks)
        .values(stockData as any)
        .returning();
      return created;
    }
  }
  
  // Stock movement operations
  async createStockMovement(movementData: InsertStockMovement): Promise<StockMovement> {
    const [movement] = await db.insert(stockMovements).values(movementData).returning();
    return movement;
  }

  async getMovementsByCompany(companyId: string): Promise<StockMovement[]> {
    return await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.companyId, companyId))
      .orderBy(stockMovements.createdAt);
  }

  async getMovementsByEvent(eventId: string): Promise<StockMovement[]> {
    return await db
      .select()
      .from(stockMovements)
      .where(or(
        eq(stockMovements.toEventId, eventId),
        eq(stockMovements.fromEventId, eventId)
      ))
      .orderBy(stockMovements.createdAt);
  }
  
  // Price list operations
  async getPriceListsByCompany(companyId: string): Promise<PriceList[]> {
    return await db
      .select()
      .from(priceLists)
      .where(eq(priceLists.companyId, companyId))
      .orderBy(priceLists.createdAt);
  }

  async getPriceList(id: string): Promise<PriceList | undefined> {
    const [priceList] = await db.select().from(priceLists).where(eq(priceLists.id, id));
    return priceList;
  }

  async getPriceListByIdAndCompany(id: string, companyId: string): Promise<PriceList | undefined> {
    const [priceList] = await db
      .select()
      .from(priceLists)
      .where(and(eq(priceLists.id, id), eq(priceLists.companyId, companyId)));
    return priceList;
  }

  async createPriceList(priceListData: InsertPriceList): Promise<PriceList> {
    const [priceList] = await db.insert(priceLists).values(priceListData).returning();
    return priceList;
  }

  async updatePriceList(id: string, companyId: string, priceListData: Partial<PriceList>): Promise<PriceList | undefined> {
    const [priceList] = await db
      .update(priceLists)
      .set({ ...priceListData, updatedAt: new Date() })
      .where(and(eq(priceLists.id, id), eq(priceLists.companyId, companyId)))
      .returning();
    return priceList;
  }

  async deletePriceList(id: string, companyId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(priceLists)
        .where(and(eq(priceLists.id, id), eq(priceLists.companyId, companyId)))
        .for('update');
      
      if (!existing) {
        return false;
      }

      await tx.delete(priceListItems).where(eq(priceListItems.priceListId, id));
      await tx.delete(priceLists).where(eq(priceLists.id, id));
      return true;
    });
  }
  
  // Price list item operations
  async getPriceListItems(priceListId: string, companyId: string): Promise<PriceListItem[]> {
    return await db
      .select({
        id: priceListItems.id,
        priceListId: priceListItems.priceListId,
        productId: priceListItems.productId,
        salePrice: priceListItems.salePrice,
        createdAt: priceListItems.createdAt,
        updatedAt: priceListItems.updatedAt,
      })
      .from(priceListItems)
      .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
      .where(and(
        eq(priceListItems.priceListId, priceListId),
        eq(priceLists.companyId, companyId)
      ))
      .orderBy(priceListItems.createdAt);
  }

  async getPriceListItem(id: string): Promise<PriceListItem | undefined> {
    const [item] = await db.select().from(priceListItems).where(eq(priceListItems.id, id));
    return item;
  }

  async createPriceListItem(itemData: InsertPriceListItem, companyId: string): Promise<PriceListItem> {
    return await db.transaction(async (tx) => {
      const [priceList] = await tx
        .select()
        .from(priceLists)
        .where(and(eq(priceLists.id, itemData.priceListId), eq(priceLists.companyId, companyId)))
        .for('update');
      
      if (!priceList) {
        throw new Error("Price list not found or access denied");
      }

      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, itemData.productId), eq(products.companyId, companyId)))
        .for('update');
      
      if (!product) {
        throw new Error("Product not found or access denied");
      }

      const [item] = await tx.insert(priceListItems).values(itemData).returning();
      return item;
    });
  }

  async updatePriceListItem(id: string, companyId: string, itemData: Partial<PriceListItem>): Promise<PriceListItem | undefined> {
    const { priceListId, productId, ...safeData } = itemData;
    
    const [item] = await db
      .update(priceListItems)
      .set({ ...safeData, updatedAt: new Date() })
      .where(
        and(
          eq(priceListItems.id, id),
          inArray(
            priceListItems.priceListId,
            db.select({ id: priceLists.id }).from(priceLists).where(eq(priceLists.companyId, companyId))
          )
        )
      )
      .returning();
    return item;
  }

  async deletePriceListItem(id: string, companyId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ item: priceListItems })
        .from(priceListItems)
        .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
        .where(and(eq(priceListItems.id, id), eq(priceLists.companyId, companyId)))
        .for('update');
      
      if (!existing) {
        return false;
      }

      await tx.delete(priceListItems).where(eq(priceListItems.id, id));
      return true;
    });
  }

  async getPriceListItemWithCompanyCheck(itemId: string, companyId: string): Promise<PriceListItem | undefined> {
    const [item] = await db
      .select()
      .from(priceListItems)
      .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
      .where(and(eq(priceListItems.id, itemId), eq(priceLists.companyId, companyId)));
    return item ? item.price_list_items : undefined;
  }

  async bulkCreatePriceListItems(itemsList: InsertPriceListItem[], companyId: string): Promise<PriceListItem[]> {
    if (itemsList.length === 0) return [];
    
    return await db.transaction(async (tx) => {
      const priceListId = itemsList[0].priceListId;
      const [priceList] = await tx
        .select()
        .from(priceLists)
        .where(and(eq(priceLists.id, priceListId), eq(priceLists.companyId, companyId)))
        .for('update');
      
      if (!priceList) {
        throw new Error("Price list not found or access denied");
      }

      const items = await tx.insert(priceListItems).values(itemsList).returning();
      return items;
    });
  }

  async getSuperAdminAnalytics(): Promise<{
    companyMetrics: Array<{ companyId: string; companyName: string; eventCount: number; totalRevenue: number }>;
    topProducts: Array<{ productId: string; productName: string; totalConsumed: number }>;
    eventStatistics: { total: number; active: number; completed: number };
  }> {
    const allCompanies = await db.select().from(companies);
    const allEvents = await db.select().from(events);
    const allMovements = await db.select().from(stockMovements).where(eq(stockMovements.type, 'CONSUME'));

    const companyMetrics = allCompanies.map((company) => {
      const companyEvents = allEvents.filter(e => e.companyId === company.id);
      const totalRevenue = companyEvents.reduce((sum, e) => {
        const revenue = parseFloat(e.actualRevenue || '0');
        return sum + revenue;
      }, 0);
      return {
        companyId: company.id,
        companyName: company.name,
        eventCount: companyEvents.length,
        totalRevenue,
      };
    });

    const productConsumptionMap = new Map<string, { productId: string; productName: string; totalConsumed: number }>();
    const allProducts = await db.select().from(products);
    
    for (const movement of allMovements) {
      const product = allProducts.find(p => p.id === movement.productId);
      if (product) {
        const existing = productConsumptionMap.get(movement.productId);
        const quantity = parseFloat(movement.quantity);
        if (existing) {
          existing.totalConsumed += quantity;
        } else {
          productConsumptionMap.set(movement.productId, {
            productId: movement.productId,
            productName: product.name,
            totalConsumed: quantity,
          });
        }
      }
    }

    const topProducts = Array.from(productConsumptionMap.values())
      .sort((a, b) => b.totalConsumed - a.totalConsumed)
      .slice(0, 10);

    const eventStatistics = {
      total: allEvents.length,
      active: allEvents.filter(e => e.status === 'active').length,
      completed: allEvents.filter(e => e.status === 'completed').length,
    };

    return { companyMetrics, topProducts, eventStatistics };
  }

  // Purchase Order operations
  async getPurchaseOrdersByCompany(companyId: string): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.companyId, companyId))
      .orderBy(desc(purchaseOrders.orderDate));
  }

  async getPurchaseOrder(id: string, companyId: string): Promise<PurchaseOrder | undefined> {
    const [order] = await db.select().from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.companyId, companyId)
      ));
    return order;
  }

  async createPurchaseOrder(orderData: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [order] = await db.insert(purchaseOrders).values(orderData).returning();
    return order;
  }

  async updatePurchaseOrder(id: string, companyId: string, orderData: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [order] = await db.update(purchaseOrders)
      .set({ ...orderData, updatedAt: new Date() })
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.companyId, companyId)
      ))
      .returning();
    return order;
  }

  async deletePurchaseOrder(id: string, companyId: string): Promise<boolean> {
    // Delete order items first
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    
    const result = await db.delete(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.companyId, companyId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Purchase Order Item operations
  async getPurchaseOrderItems(orderId: string, companyId: string): Promise<PurchaseOrderItem[]> {
    // Verify order belongs to company
    const order = await this.getPurchaseOrder(orderId, companyId);
    if (!order) return [];
    
    return await db.select().from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, orderId));
  }

  async createPurchaseOrderItem(itemData: InsertPurchaseOrderItem, companyId: string): Promise<PurchaseOrderItem> {
    // Verify order belongs to company
    const order = await this.getPurchaseOrder(itemData.purchaseOrderId, companyId);
    if (!order) {
      throw new Error('Purchase order not found or access denied');
    }
    
    const [item] = await db.insert(purchaseOrderItems).values(itemData).returning();
    return item;
  }

  async updatePurchaseOrderItem(id: string, companyId: string, itemData: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | undefined> {
    // First get the item to verify it belongs to a company order
    const [existingItem] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
    if (!existingItem) return undefined;
    
    const order = await this.getPurchaseOrder(existingItem.purchaseOrderId, companyId);
    if (!order) return undefined;
    
    const [item] = await db.update(purchaseOrderItems)
      .set({ ...itemData, updatedAt: new Date() })
      .where(eq(purchaseOrderItems.id, id))
      .returning();
    return item;
  }

  async deletePurchaseOrderItem(id: string, companyId: string): Promise<boolean> {
    // First get the item to verify it belongs to a company order
    const [existingItem] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
    if (!existingItem) return false;
    
    const order = await this.getPurchaseOrder(existingItem.purchaseOrderId, companyId);
    if (!order) return false;
    
    const result = await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Generate suggested orders based on alerts (low stock) and consumption patterns
  async generateSuggestedOrders(companyId: string): Promise<Array<{
    productId: string;
    productName: string;
    productCode: string;
    currentStock: number;
    minThreshold: number;
    avgConsumption: number;
    suggestedQuantity: number;
    reason: string;
  }>> {
    // Get all products with minimum thresholds
    const companyProducts = await db.select().from(products)
      .where(and(
        eq(products.companyId, companyId),
        eq(products.active, true)
      ));
    
    // Get general stocks
    const generalStocks = await this.getGeneralStocks(companyId);
    
    // Get consumption movements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const consumptionMovements = await db.select().from(stockMovements)
      .where(and(
        eq(stockMovements.companyId, companyId),
        eq(stockMovements.type, 'CONSUME')
      ));
    
    const suggestions = [];
    
    for (const product of companyProducts) {
      const stock = generalStocks.find(s => s.productId === product.id);
      const currentStock = stock ? parseFloat(stock.quantity) : 0;
      const minThreshold = product.minThreshold ? parseFloat(product.minThreshold) : 0;
      
      // Calculate average consumption from last 30 days
      const productConsumptions = consumptionMovements.filter(m => m.productId === product.id);
      const totalConsumed = productConsumptions.reduce((sum, m) => sum + parseFloat(m.quantity), 0);
      const avgConsumption = productConsumptions.length > 0 ? totalConsumed / 30 : 0; // Daily average
      
      let shouldOrder = false;
      let reason = '';
      let suggestedQuantity = 0;
      
      // Case 1: Stock below minimum threshold (ALERT)
      if (minThreshold > 0 && currentStock < minThreshold) {
        shouldOrder = true;
        reason = 'Scorta sotto soglia minima';
        // Order enough to reach 2x minimum threshold + 1 week consumption
        suggestedQuantity = (minThreshold * 2 - currentStock) + (avgConsumption * 7);
      }
      
      // Case 2: High consumption rate - predict stock out in next 7 days
      else if (avgConsumption > 0) {
        const daysUntilStockOut = currentStock / avgConsumption;
        if (daysUntilStockOut < 7) {
          shouldOrder = true;
          reason = 'Consumo elevato - scorta per meno di 7 giorni';
          // Order for 30 days consumption
          suggestedQuantity = avgConsumption * 30;
        }
      }
      
      if (shouldOrder && suggestedQuantity > 0) {
        suggestions.push({
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          currentStock,
          minThreshold,
          avgConsumption,
          suggestedQuantity: Math.ceil(suggestedQuantity), // Round up
          reason,
        });
      }
    }
    
    return suggestions.sort((a, b) => {
      // Sort by urgency: products with lower stock first
      const aUrgency = a.currentStock / (a.minThreshold || 1);
      const bUrgency = b.currentStock / (b.minThreshold || 1);
      return aUrgency - bUrgency;
    });
  }

  async analyzeWithAI(companyId: string, query: string, context?: string): Promise<{ answer: string; data?: any }> {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Gather company data for context
    const [products, events, stocks, movements] = await Promise.all([
      this.getProductsByCompany(companyId),
      this.getEventsByCompany(companyId),
      this.getGeneralStocks(companyId),
      this.getMovementsByCompany(companyId),
    ]);

    // Build context with relevant data
    const dataContext = {
      products: products.map(p => ({ 
        code: p.code, 
        name: p.name, 
        category: p.category, 
        unit: p.unitOfMeasure,
        minThreshold: p.minThreshold 
      })),
      events: events.map(e => ({ 
        name: e.name, 
        date: e.startDatetime, 
        status: e.status,
        locationId: e.locationId 
      })),
      inventory: stocks.map(s => {
        const product = products.find(p => p.id === s.productId);
        return {
          product: product?.name,
          code: product?.code,
          quantity: s.quantity,
          minThreshold: product?.minThreshold,
        };
      }),
      recentMovements: movements.slice(0, 100).map(m => {
        const product = products.find(p => p.id === m.productId);
        return {
          product: product?.name,
          type: m.type,
          quantity: m.quantity,
          reason: m.reason,
          timestamp: m.createdAt,
        };
      }),
    };

    const systemPrompt = `Sei un assistente AI esperto nell'analisi di dati per la gestione eventi e inventario.
Analizza i dati forniti e rispondi in italiano con informazioni chiare e actionable.
Concentrati su: consumi, pattern, ottimizzazioni, tendenze e suggerimenti pratici.

Dati disponibili:
- Prodotti: ${products.length} articoli
- Eventi: ${events.length} eventi
- Scorte attuali: ${stocks.length} prodotti in magazzino
- Movimenti recenti: ${movements.length} movimenti registrati

${context ? `Contesto aggiuntivo: ${context}` : ''}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Domanda: ${query}\n\nDati:\n${JSON.stringify(dataContext, null, 2)}` }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return {
      answer: completion.choices[0]?.message?.content || "Non sono riuscito a generare una risposta.",
      data: dataContext,
    };
  }

  async generateInsights(companyId: string): Promise<Array<{ title: string; description: string; type: 'info' | 'warning' | 'success'; data?: any }>> {
    const insights: Array<{ title: string; description: string; type: 'info' | 'warning' | 'success'; data?: any }> = [];

    const [products, stocks, movements, events] = await Promise.all([
      this.getProductsByCompany(companyId),
      this.getGeneralStocks(companyId),
      this.getMovementsByCompany(companyId),
      this.getEventsByCompany(companyId),
    ]);

    // Insight 1: Low stock alerts
    const lowStockItems = stocks.filter(s => {
      const product = products.find(p => p.id === s.productId);
      return product && product.minThreshold && parseFloat(product.minThreshold) > 0 && parseFloat(s.quantity) < parseFloat(product.minThreshold);
    });

    if (lowStockItems.length > 0) {
      insights.push({
        title: `⚠️ ${lowStockItems.length} prodotti sotto scorta minima`,
        description: `Controlla il magazzino: alcuni prodotti sono sotto la soglia di sicurezza.`,
        type: 'warning',
        data: { count: lowStockItems.length },
      });
    }

    // Insight 2: Top consumed products (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const consumptionMovements = movements.filter(m => 
      m.type === 'out' && 
      m.reason === 'consumption' &&
      m.createdAt && new Date(m.createdAt) >= thirtyDaysAgo
    );

    const consumptionByProduct = new Map<string, number>();
    consumptionMovements.forEach(m => {
      const current = consumptionByProduct.get(m.productId) || 0;
      consumptionByProduct.set(m.productId, current + parseFloat(m.quantity));
    });

    const topProducts = Array.from(consumptionByProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([productId, qty]) => {
        const product = products.find(p => p.id === productId);
        return { name: product?.name || 'Unknown', quantity: qty };
      });

    if (topProducts.length > 0) {
      insights.push({
        title: `📊 Top 3 prodotti più consumati`,
        description: `${topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.quantity.toFixed(0)} unità`).join(' | ')}`,
        type: 'info',
        data: { products: topProducts },
      });
    }

    // Insight 3: Upcoming events
    const upcomingEvents = events.filter(e => {
      if (!e.startDatetime) return false;
      const eventDate = new Date(e.startDatetime);
      const now = new Date();
      const inSevenDays = new Date();
      inSevenDays.setDate(inSevenDays.getDate() + 7);
      return eventDate >= now && eventDate <= inSevenDays;
    });

    if (upcomingEvents.length > 0) {
      insights.push({
        title: `📅 ${upcomingEvents.length} eventi nei prossimi 7 giorni`,
        description: `Verifica le scorte e le stazioni per gli eventi in arrivo.`,
        type: 'info',
        data: { events: upcomingEvents.map(e => ({ name: e.name, date: e.startDatetime })) },
      });
    }

    // Insight 4: Inventory health
    const totalProducts = products.length;
    const productsInStock = stocks.filter(s => parseFloat(s.quantity) > 0).length;
    const stockPercentage = totalProducts > 0 ? (productsInStock / totalProducts * 100) : 0;

    if (stockPercentage > 80) {
      insights.push({
        title: `✅ Magazzino in salute`,
        description: `${stockPercentage.toFixed(0)}% dei prodotti disponibili in magazzino.`,
        type: 'success',
        data: { percentage: stockPercentage },
      });
    } else if (stockPercentage < 50) {
      insights.push({
        title: `⚠️ Magazzino da rifornire`,
        description: `Solo ${stockPercentage.toFixed(0)}% dei prodotti disponibili.`,
        type: 'warning',
        data: { percentage: stockPercentage },
      });
    }

    return insights;
  }

  // ==================== MODULO CONTABILITÀ - Implementazioni ====================

  // Fixed Costs operations
  async getFixedCostsByCompany(companyId: string): Promise<FixedCost[]> {
    return await db.select().from(fixedCosts).where(eq(fixedCosts.companyId, companyId));
  }

  async getFixedCostsByLocation(locationId: string, companyId: string): Promise<FixedCost[]> {
    return await db.select().from(fixedCosts).where(
      and(eq(fixedCosts.locationId, locationId), eq(fixedCosts.companyId, companyId))
    );
  }

  async getFixedCost(id: string, companyId: string): Promise<FixedCost | undefined> {
    const [cost] = await db.select().from(fixedCosts).where(
      and(eq(fixedCosts.id, id), eq(fixedCosts.companyId, companyId))
    );
    return cost;
  }

  async createFixedCost(cost: InsertFixedCost): Promise<FixedCost> {
    const [newCost] = await db.insert(fixedCosts).values(cost).returning();
    return newCost;
  }

  async updateFixedCost(id: string, companyId: string, cost: Partial<FixedCost>): Promise<FixedCost | undefined> {
    const [updated] = await db.update(fixedCosts)
      .set({ ...cost, updatedAt: new Date() })
      .where(and(eq(fixedCosts.id, id), eq(fixedCosts.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteFixedCost(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(fixedCosts).where(
      and(eq(fixedCosts.id, id), eq(fixedCosts.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Extra Costs operations
  async getExtraCostsByCompany(companyId: string): Promise<ExtraCost[]> {
    return await db.select().from(extraCosts).where(eq(extraCosts.companyId, companyId));
  }

  async getExtraCostsByEvent(eventId: string, companyId: string): Promise<ExtraCost[]> {
    return await db.select().from(extraCosts).where(
      and(eq(extraCosts.eventId, eventId), eq(extraCosts.companyId, companyId))
    );
  }

  async getExtraCost(id: string, companyId: string): Promise<ExtraCost | undefined> {
    const [cost] = await db.select().from(extraCosts).where(
      and(eq(extraCosts.id, id), eq(extraCosts.companyId, companyId))
    );
    return cost;
  }

  async createExtraCost(cost: InsertExtraCost): Promise<ExtraCost> {
    const [newCost] = await db.insert(extraCosts).values(cost).returning();
    return newCost;
  }

  async updateExtraCost(id: string, companyId: string, cost: Partial<ExtraCost>): Promise<ExtraCost | undefined> {
    const [updated] = await db.update(extraCosts)
      .set({ ...cost, updatedAt: new Date() })
      .where(and(eq(extraCosts.id, id), eq(extraCosts.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteExtraCost(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(extraCosts).where(
      and(eq(extraCosts.id, id), eq(extraCosts.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Maintenances operations
  async getMaintenancesByCompany(companyId: string): Promise<Maintenance[]> {
    return await db.select().from(maintenances).where(eq(maintenances.companyId, companyId));
  }

  async getMaintenancesByLocation(locationId: string, companyId: string): Promise<Maintenance[]> {
    return await db.select().from(maintenances).where(
      and(eq(maintenances.locationId, locationId), eq(maintenances.companyId, companyId))
    );
  }

  async getMaintenance(id: string, companyId: string): Promise<Maintenance | undefined> {
    const [maintenance] = await db.select().from(maintenances).where(
      and(eq(maintenances.id, id), eq(maintenances.companyId, companyId))
    );
    return maintenance;
  }

  async createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance> {
    const [newMaintenance] = await db.insert(maintenances).values(maintenance).returning();
    return newMaintenance;
  }

  async updateMaintenance(id: string, companyId: string, maintenance: Partial<Maintenance>): Promise<Maintenance | undefined> {
    const [updated] = await db.update(maintenances)
      .set({ ...maintenance, updatedAt: new Date() })
      .where(and(eq(maintenances.id, id), eq(maintenances.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteMaintenance(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(maintenances).where(
      and(eq(maintenances.id, id), eq(maintenances.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Accounting Documents operations
  async getAccountingDocumentsByCompany(companyId: string): Promise<AccountingDocument[]> {
    return await db.select().from(accountingDocuments).where(eq(accountingDocuments.companyId, companyId));
  }

  async getAccountingDocumentsByEvent(eventId: string, companyId: string): Promise<AccountingDocument[]> {
    return await db.select().from(accountingDocuments).where(
      and(eq(accountingDocuments.eventId, eventId), eq(accountingDocuments.companyId, companyId))
    );
  }

  async getAccountingDocument(id: string, companyId: string): Promise<AccountingDocument | undefined> {
    const [doc] = await db.select().from(accountingDocuments).where(
      and(eq(accountingDocuments.id, id), eq(accountingDocuments.companyId, companyId))
    );
    return doc;
  }

  async createAccountingDocument(doc: InsertAccountingDocument): Promise<AccountingDocument> {
    const [newDoc] = await db.insert(accountingDocuments).values(doc).returning();
    return newDoc;
  }

  async updateAccountingDocument(id: string, companyId: string, doc: Partial<AccountingDocument>): Promise<AccountingDocument | undefined> {
    const [updated] = await db.update(accountingDocuments)
      .set({ ...doc, updatedAt: new Date() })
      .where(and(eq(accountingDocuments.id, id), eq(accountingDocuments.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteAccountingDocument(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(accountingDocuments).where(
      and(eq(accountingDocuments.id, id), eq(accountingDocuments.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ==================== MODULO PERSONALE - Implementazioni ====================

  // Staff operations
  async getStaffByCompany(companyId: string): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.companyId, companyId));
  }

  async getStaff(id: string, companyId: string): Promise<Staff | undefined> {
    const [member] = await db.select().from(staff).where(
      and(eq(staff.id, id), eq(staff.companyId, companyId))
    );
    return member;
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
  }

  async updateStaff(id: string, companyId: string, staffData: Partial<Staff>): Promise<Staff | undefined> {
    const [updated] = await db.update(staff)
      .set({ ...staffData, updatedAt: new Date() })
      .where(and(eq(staff.id, id), eq(staff.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteStaff(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(staff).where(
      and(eq(staff.id, id), eq(staff.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Staff Assignments operations
  async getStaffAssignmentsByCompany(companyId: string): Promise<StaffAssignment[]> {
    return await db.select().from(staffAssignments).where(eq(staffAssignments.companyId, companyId));
  }

  async getStaffAssignmentsByEvent(eventId: string, companyId: string): Promise<StaffAssignment[]> {
    return await db.select().from(staffAssignments).where(
      and(eq(staffAssignments.eventId, eventId), eq(staffAssignments.companyId, companyId))
    );
  }

  async getStaffAssignmentsByStaff(staffId: string, companyId: string): Promise<StaffAssignment[]> {
    return await db.select().from(staffAssignments).where(
      and(eq(staffAssignments.staffId, staffId), eq(staffAssignments.companyId, companyId))
    );
  }

  async getStaffAssignment(id: string, companyId: string): Promise<StaffAssignment | undefined> {
    const [assignment] = await db.select().from(staffAssignments).where(
      and(eq(staffAssignments.id, id), eq(staffAssignments.companyId, companyId))
    );
    return assignment;
  }

  async createStaffAssignment(assignment: InsertStaffAssignment): Promise<StaffAssignment> {
    const [newAssignment] = await db.insert(staffAssignments).values(assignment).returning();
    return newAssignment;
  }

  async updateStaffAssignment(id: string, companyId: string, assignment: Partial<StaffAssignment>): Promise<StaffAssignment | undefined> {
    const [updated] = await db.update(staffAssignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(and(eq(staffAssignments.id, id), eq(staffAssignments.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteStaffAssignment(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(staffAssignments).where(
      and(eq(staffAssignments.id, id), eq(staffAssignments.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Staff Payments operations
  async getStaffPaymentsByCompany(companyId: string): Promise<StaffPayment[]> {
    return await db.select().from(staffPayments).where(eq(staffPayments.companyId, companyId));
  }

  async getStaffPaymentsByStaff(staffId: string, companyId: string): Promise<StaffPayment[]> {
    return await db.select().from(staffPayments).where(
      and(eq(staffPayments.staffId, staffId), eq(staffPayments.companyId, companyId))
    );
  }

  async getStaffPayment(id: string, companyId: string): Promise<StaffPayment | undefined> {
    const [payment] = await db.select().from(staffPayments).where(
      and(eq(staffPayments.id, id), eq(staffPayments.companyId, companyId))
    );
    return payment;
  }

  async createStaffPayment(payment: InsertStaffPayment): Promise<StaffPayment> {
    const [newPayment] = await db.insert(staffPayments).values(payment).returning();
    return newPayment;
  }

  async updateStaffPayment(id: string, companyId: string, payment: Partial<StaffPayment>): Promise<StaffPayment | undefined> {
    const [updated] = await db.update(staffPayments)
      .set({ ...payment, updatedAt: new Date() })
      .where(and(eq(staffPayments.id, id), eq(staffPayments.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteStaffPayment(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(staffPayments).where(
      and(eq(staffPayments.id, id), eq(staffPayments.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ==================== MODULO CASSA - Implementazioni ====================

  // Cash Sectors operations
  async getCashSectorsByCompany(companyId: string): Promise<CashSector[]> {
    return await db.select().from(cashSectors).where(eq(cashSectors.companyId, companyId));
  }

  async getCashSector(id: string, companyId: string): Promise<CashSector | undefined> {
    const [sector] = await db.select().from(cashSectors).where(
      and(eq(cashSectors.id, id), eq(cashSectors.companyId, companyId))
    );
    return sector;
  }

  async createCashSector(sector: InsertCashSector): Promise<CashSector> {
    const [newSector] = await db.insert(cashSectors).values(sector).returning();
    return newSector;
  }

  async updateCashSector(id: string, companyId: string, sector: Partial<CashSector>): Promise<CashSector | undefined> {
    const [updated] = await db.update(cashSectors)
      .set({ ...sector, updatedAt: new Date() })
      .where(and(eq(cashSectors.id, id), eq(cashSectors.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteCashSector(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(cashSectors).where(
      and(eq(cashSectors.id, id), eq(cashSectors.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Cash Positions operations
  async getCashPositionsByEvent(eventId: string, companyId: string): Promise<CashPosition[]> {
    return await db.select().from(cashPositions).where(
      and(eq(cashPositions.eventId, eventId), eq(cashPositions.companyId, companyId))
    );
  }

  async getCashPositionsBySector(sectorId: string, companyId: string): Promise<CashPosition[]> {
    return await db.select().from(cashPositions).where(
      and(eq(cashPositions.sectorId, sectorId), eq(cashPositions.companyId, companyId))
    );
  }

  async getCashPosition(id: string, companyId: string): Promise<CashPosition | undefined> {
    const [position] = await db.select().from(cashPositions).where(
      and(eq(cashPositions.id, id), eq(cashPositions.companyId, companyId))
    );
    return position;
  }

  async createCashPosition(position: InsertCashPosition): Promise<CashPosition> {
    const [newPosition] = await db.insert(cashPositions).values(position).returning();
    return newPosition;
  }

  async updateCashPosition(id: string, companyId: string, position: Partial<CashPosition>): Promise<CashPosition | undefined> {
    const [updated] = await db.update(cashPositions)
      .set({ ...position, updatedAt: new Date() })
      .where(and(eq(cashPositions.id, id), eq(cashPositions.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteCashPosition(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(cashPositions).where(
      and(eq(cashPositions.id, id), eq(cashPositions.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Cash Entries operations
  async getCashEntriesByPosition(positionId: string, companyId: string): Promise<CashEntry[]> {
    return await db.select().from(cashEntries).where(
      and(eq(cashEntries.positionId, positionId), eq(cashEntries.companyId, companyId))
    );
  }

  async getCashEntriesByEvent(eventId: string, companyId: string): Promise<CashEntry[]> {
    return await db.select().from(cashEntries).where(
      and(eq(cashEntries.eventId, eventId), eq(cashEntries.companyId, companyId))
    );
  }

  async getCashEntry(id: string, companyId: string): Promise<CashEntry | undefined> {
    const [entry] = await db.select().from(cashEntries).where(
      and(eq(cashEntries.id, id), eq(cashEntries.companyId, companyId))
    );
    return entry;
  }

  async createCashEntry(entry: InsertCashEntry): Promise<CashEntry> {
    const [newEntry] = await db.insert(cashEntries).values(entry).returning();
    return newEntry;
  }

  async updateCashEntry(id: string, companyId: string, entry: Partial<CashEntry>): Promise<CashEntry | undefined> {
    const [updated] = await db.update(cashEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(and(eq(cashEntries.id, id), eq(cashEntries.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteCashEntry(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(cashEntries).where(
      and(eq(cashEntries.id, id), eq(cashEntries.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Cash Funds operations
  async getCashFundsByPosition(positionId: string, companyId: string): Promise<CashFund[]> {
    return await db.select().from(cashFunds).where(
      and(eq(cashFunds.positionId, positionId), eq(cashFunds.companyId, companyId))
    );
  }

  async getCashFundsByEvent(eventId: string, companyId: string): Promise<CashFund[]> {
    return await db.select().from(cashFunds).where(
      and(eq(cashFunds.eventId, eventId), eq(cashFunds.companyId, companyId))
    );
  }

  async getCashFund(id: string, companyId: string): Promise<CashFund | undefined> {
    const [fund] = await db.select().from(cashFunds).where(
      and(eq(cashFunds.id, id), eq(cashFunds.companyId, companyId))
    );
    return fund;
  }

  async createCashFund(fund: InsertCashFund): Promise<CashFund> {
    const [newFund] = await db.insert(cashFunds).values(fund).returning();
    return newFund;
  }

  async updateCashFund(id: string, companyId: string, fund: Partial<CashFund>): Promise<CashFund | undefined> {
    const [updated] = await db.update(cashFunds)
      .set({ ...fund, updatedAt: new Date() })
      .where(and(eq(cashFunds.id, id), eq(cashFunds.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteCashFund(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(cashFunds).where(
      and(eq(cashFunds.id, id), eq(cashFunds.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Get all cash positions by company
  async getCashPositionsByCompany(companyId: string): Promise<CashPosition[]> {
    return await db.select().from(cashPositions).where(eq(cashPositions.companyId, companyId));
  }

  // Get all cash entries by company
  async getCashEntriesByCompany(companyId: string): Promise<CashEntry[]> {
    return await db.select().from(cashEntries).where(eq(cashEntries.companyId, companyId)).orderBy(desc(cashEntries.entryTime));
  }

  // Get all cash funds by company
  async getCashFundsByCompany(companyId: string): Promise<CashFund[]> {
    return await db.select().from(cashFunds).where(eq(cashFunds.companyId, companyId)).orderBy(desc(cashFunds.recordedAt));
  }

  // Night Files operations
  async getNightFilesByCompany(companyId: string): Promise<NightFile[]> {
    return await db.select().from(nightFiles).where(eq(nightFiles.companyId, companyId)).orderBy(desc(nightFiles.generatedAt));
  }

  async getNightFileByEvent(eventId: string, companyId: string): Promise<NightFile | undefined> {
    const [nightFile] = await db.select().from(nightFiles).where(
      and(eq(nightFiles.eventId, eventId), eq(nightFiles.companyId, companyId))
    );
    return nightFile;
  }

  async getNightFile(id: string, companyId: string): Promise<NightFile | undefined> {
    const [nightFile] = await db.select().from(nightFiles).where(
      and(eq(nightFiles.id, id), eq(nightFiles.companyId, companyId))
    );
    return nightFile;
  }

  async createNightFile(nightFile: InsertNightFile): Promise<NightFile> {
    const [created] = await db.insert(nightFiles).values(nightFile).returning();
    return created;
  }

  async updateNightFile(id: string, companyId: string, nightFile: Partial<NightFile>): Promise<NightFile | undefined> {
    const [updated] = await db.update(nightFiles)
      .set({ ...nightFile, updatedAt: new Date() })
      .where(and(eq(nightFiles.id, id), eq(nightFiles.companyId, companyId)))
      .returning();
    return updated;
  }

  async approveNightFile(id: string, companyId: string, userId: string): Promise<NightFile | undefined> {
    const [updated] = await db.update(nightFiles)
      .set({ 
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(nightFiles.id, id), eq(nightFiles.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteNightFile(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(nightFiles).where(
      and(eq(nightFiles.id, id), eq(nightFiles.companyId, companyId))
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
