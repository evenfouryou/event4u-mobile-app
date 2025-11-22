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
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
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
  getProductByCodeAndCompany(code: string, companyId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;
  
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
  
  // Super admin analytics
  getSuperAdminAnalytics(): Promise<{
    companyMetrics: Array<{ companyId: string; companyName: string; eventCount: number; totalRevenue: number }>;
    topProducts: Array<{ productId: string; productName: string; totalConsumed: number }>;
    eventStatistics: { total: number; active: number; completed: number };
  }>;
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

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = await db.insert(users).values(userData as any).returning();
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
}

export const storage = new DatabaseStorage();
