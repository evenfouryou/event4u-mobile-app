import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - Required for Replit Auth + Extended for Event4U roles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // For classic email/password registration (optional - null for Replit Auth users)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default('gestore'), // super_admin, gestore, warehouse, bartender
  companyId: varchar("company_id").references(() => companies.id),
  emailVerified: boolean("email_verified").default(false), // Email verification status for classic registration
  verificationToken: varchar("verification_token"), // Token for email verification link
  isActive: boolean("is_active").notNull().default(true), // User account active status
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
}));

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 100 }),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  locations: many(locations),
  events: many(events),
  products: many(products),
}));

// Locations table
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  capacity: integer("capacity"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locationsRelations = relations(locations, ({ one, many }) => ({
  company: one(companies, {
    fields: [locations.companyId],
    references: [companies.id],
  }),
  events: many(events),
}));

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  locationId: varchar("location_id").notNull().references(() => locations.id),
  name: varchar("name", { length: 255 }).notNull(),
  startDatetime: timestamp("start_datetime").notNull(),
  endDatetime: timestamp("end_datetime").notNull(),
  capacity: integer("capacity"),
  status: varchar("status", { length: 50 }).notNull().default('draft'), // draft, scheduled, ongoing, closed
  priceListId: varchar("price_list_id").references(() => priceLists.id), // for revenue calculation
  actualRevenue: decimal("actual_revenue", { precision: 10, scale: 2 }), // actual cash/card collected
  notes: text("notes"),
  // Recurring events fields
  seriesId: varchar("series_id"), // UUID shared by all events in a recurring series
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: varchar("recurrence_pattern", { length: 20 }).default('none'), // none, daily, weekly, monthly
  recurrenceInterval: integer("recurrence_interval").default(1), // every N days/weeks/months
  recurrenceCount: integer("recurrence_count"), // total occurrences (null = infinite with end date)
  recurrenceEndDate: timestamp("recurrence_end_date"), // when recurrence ends
  parentEventId: varchar("parent_event_id").references((): any => events.id), // null for parent, points to parent for exceptions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  company: one(companies, {
    fields: [events.companyId],
    references: [companies.id],
  }),
  location: one(locations, {
    fields: [events.locationId],
    references: [locations.id],
  }),
  priceList: one(priceLists, {
    fields: [events.priceListId],
    references: [priceLists.id],
  }),
  stations: many(stations),
  stockMovements: many(stockMovements),
}));

// Stations (Postazioni) table
export const stations = pgTable("stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").references(() => events.id), // optional - null means general station
  name: varchar("name", { length: 255 }).notNull(),
  bartenderIds: varchar("bartender_ids").array().default(sql`ARRAY[]::varchar[]`), // Multiple bartenders per station
  deletedAt: timestamp("deleted_at"), // Soft delete - preserves historical data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stationsRelations = relations(stations, ({ one, many }) => ({
  company: one(companies, {
    fields: [stations.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [stations.eventId],
    references: [events.id],
  }),
  stocks: many(stocks),
}));

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  code: varchar("code", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // drink, bottle, food, etc
  unitOfMeasure: varchar("unit_of_measure", { length: 50 }).notNull(), // bottle, can, liter, case, piece
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  minThreshold: decimal("min_threshold", { precision: 10, scale: 2 }), // for alerts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  stocks: many(stocks),
  stockMovements: many(stockMovements),
  priceListItems: many(priceListItems),
}));

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  vatNumber: varchar("vat_number", { length: 50 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  company: one(companies, {
    fields: [suppliers.companyId],
    references: [companies.id],
  }),
  priceLists: many(priceLists),
  purchaseOrders: many(purchaseOrders),
}));

// Price Lists table
export const priceLists = pgTable("price_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  name: varchar("name", { length: 255 }).notNull(),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const priceListsRelations = relations(priceLists, ({ one, many }) => ({
  company: one(companies, {
    fields: [priceLists.companyId],
    references: [companies.id],
  }),
  supplier: one(suppliers, {
    fields: [priceLists.supplierId],
    references: [suppliers.id],
  }),
  items: many(priceListItems),
}));

// Price List Items table
export const priceListItems = pgTable("price_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  priceListId: varchar("price_list_id").notNull().references(() => priceLists.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const priceListItemsRelations = relations(priceListItems, ({ one }) => ({
  priceList: one(priceLists, {
    fields: [priceListItems.priceListId],
    references: [priceLists.id],
  }),
  product: one(products, {
    fields: [priceListItems.productId],
    references: [products.id],
  }),
}));

// Stocks table - tracks current inventory levels
export const stocks = pgTable("stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  locationId: varchar("location_id").references(() => locations.id), // null for general warehouse
  eventId: varchar("event_id").references(() => events.id), // null for general warehouse
  stationId: varchar("station_id").references(() => stations.id), // null for event-level stock
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stocksRelations = relations(stocks, ({ one }) => ({
  company: one(companies, {
    fields: [stocks.companyId],
    references: [companies.id],
  }),
  product: one(products, {
    fields: [stocks.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [stocks.locationId],
    references: [locations.id],
  }),
  event: one(events, {
    fields: [stocks.eventId],
    references: [events.id],
  }),
  station: one(stations, {
    fields: [stocks.stationId],
    references: [stations.id],
  }),
}));

// Stock Movements table - audit log of all inventory changes
export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  fromLocationId: varchar("from_location_id").references(() => locations.id),
  fromEventId: varchar("from_event_id").references(() => events.id),
  fromStationId: varchar("from_station_id").references(() => stations.id),
  toLocationId: varchar("to_location_id").references(() => locations.id),
  toEventId: varchar("to_event_id").references(() => events.id),
  toStationId: varchar("to_station_id").references(() => stations.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // LOAD, UNLOAD, TRANSFER, CONSUME
  reason: text("reason"),
  supplier: varchar("supplier", { length: 255 }), // for LOAD operations
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  company: one(companies, {
    fields: [stockMovements.companyId],
    references: [companies.id],
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  fromEvent: one(events, {
    fields: [stockMovements.fromEventId],
    references: [events.id],
  }),
  toEvent: one(events, {
    fields: [stockMovements.toEventId],
    references: [events.id],
  }),
  performedByUser: one(users, {
    fields: [stockMovements.performedBy],
    references: [users.id],
  }),
}));

// Purchase Orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  orderNumber: varchar("order_number", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('draft'), // draft, sent, confirmed, received, cancelled
  orderDate: timestamp("order_date").notNull().defaultNow(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  company: one(companies, {
    fields: [purchaseOrders.companyId],
    references: [companies.id],
  }),
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  createdByUser: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
}));

// Purchase Order Items table
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const baseEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDatetime: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endDatetime: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  actualRevenue: z.union([z.string(), z.coerce.number(), z.null()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  recurrenceEndDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val && typeof val === 'string' ? new Date(val) : val || undefined
  ).optional(),
});

export const insertEventSchema = baseEventSchema.refine((data) => {
  // If recurring, validate recurrence parameters
  if (data.isRecurring && data.recurrencePattern && data.recurrencePattern !== 'none') {
    // Must have valid pattern
    if (!['daily', 'weekly', 'monthly'].includes(data.recurrencePattern)) {
      return false;
    }
    // Must have interval >= 1
    if (!data.recurrenceInterval || data.recurrenceInterval < 1) {
      return false;
    }
    // Must have either end date or count
    if (!data.recurrenceEndDate && !data.recurrenceCount) {
      return false;
    }
  }
  return true;
}, {
  message: "Eventi ricorrenti richiedono pattern valido, intervallo >= 1, e data fine o numero occorrenze",
});

export const updateEventSchema = baseEventSchema.partial().omit({ companyId: true });

export const insertStationSchema = createInsertSchema(stations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  bartenderIds: z.array(z.string()).optional().default([]),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSupplierSchema = insertSupplierSchema.partial().omit({ companyId: true });

export const insertPriceListSchema = createInsertSchema(priceLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validFrom: z.union([z.string(), z.null()]).transform(val => val ? new Date(val) : new Date()),
  validTo: z.union([z.string(), z.null(), z.undefined()]).transform(val => val ? new Date(val) : undefined).optional(),
});

export const updatePriceListSchema = insertPriceListSchema.partial().omit({ companyId: true, supplierId: true });

export const insertPriceListItemSchema = createInsertSchema(priceListItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  salePrice: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});

export const updatePriceListItemSchema = insertPriceListItemSchema.partial().omit({ priceListId: true, productId: true });

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(['LOAD', 'UNLOAD', 'TRANSFER', 'CONSUME', 'RETURN']),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  orderDate: z.union([z.string(), z.date(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : new Date()
  ).optional(),
  expectedDeliveryDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  actualDeliveryDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  totalAmount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
});

export const updatePurchaseOrderSchema = insertPurchaseOrderSchema.partial().omit({ companyId: true, createdBy: true });

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  quantity: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  unitPrice: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  totalPrice: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});

export const updatePurchaseOrderItemSchema = insertPurchaseOrderItemSchema.partial().omit({ purchaseOrderId: true, productId: true });

// TypeScript types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Station = typeof stations.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type UpdateSupplier = z.infer<typeof updateSupplierSchema>;

export type PriceList = typeof priceLists.$inferSelect;
export type InsertPriceList = z.infer<typeof insertPriceListSchema>;
export type UpdatePriceList = z.infer<typeof updatePriceListSchema>;

export type PriceListItem = typeof priceListItems.$inferSelect;
export type InsertPriceListItem = z.infer<typeof insertPriceListItemSchema>;
export type UpdatePriceListItem = z.infer<typeof updatePriceListItemSchema>;

export type Stock = typeof stocks.$inferSelect;

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type UpdatePurchaseOrder = z.infer<typeof updatePurchaseOrderSchema>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type UpdatePurchaseOrderItem = z.infer<typeof updatePurchaseOrderItemSchema>;
