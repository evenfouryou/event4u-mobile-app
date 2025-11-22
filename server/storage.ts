// Referenced from blueprints: javascript_database, javascript_log_in_with_replit
import {
  users,
  companies,
  locations,
  events,
  stations,
  products,
  priceLists,
  priceListItems,
  stocks,
  stockMovements,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Location,
  type InsertLocation,
  type Event,
  type InsertEvent,
  type Station,
  type InsertStation,
  type Product,
  type InsertProduct,
  type PriceList,
  type InsertPriceList,
  type PriceListItem,
  type InsertPriceListItem,
  type Stock,
  type StockMovement,
  type InsertStockMovement,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  
  // Company operations
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<Company>): Promise<Company | undefined>;
  
  // Location operations
  getLocationsByCompany(companyId: string): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<Location>): Promise<Location | undefined>;
  
  // Event operations
  getEventsByCompany(companyId: string): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<Event>): Promise<Event | undefined>;
  
  // Station operations
  getStationsByEvent(eventId: string): Promise<Station[]>;
  createStation(station: InsertStation): Promise<Station>;
  
  // Product operations
  getProductsByCompany(companyId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  
  // Stock operations
  getGeneralStocks(companyId: string): Promise<Stock[]>;
  getEventStocks(eventId: string): Promise<Stock[]>;
  getStationStocks(stationId: string): Promise<Stock[]>;
  upsertStock(stock: Partial<Stock> & { companyId: string; productId: string }): Promise<Stock>;
  
  // Stock movement operations
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  getMovementsByCompany(companyId: string): Promise<StockMovement[]>;
  getMovementsByEvent(eventId: string): Promise<StockMovement[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
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
  
  // Event operations
  async getEventsByCompany(companyId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.companyId, companyId));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData).returning();
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
  
  // Station operations
  async getStationsByEvent(eventId: string): Promise<Station[]> {
    return await db.select().from(stations).where(eq(stations.eventId, eventId));
  }

  async createStation(stationData: InsertStation): Promise<Station> {
    const [station] = await db.insert(stations).values(stationData).returning();
    return station;
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
      .where(eq(stockMovements.toEventId, eventId))
      .orderBy(stockMovements.createdAt);
  }
}

export const storage = new DatabaseStorage();
