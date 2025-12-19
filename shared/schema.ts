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

// System Settings table - Global application settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// Users table - Required for Replit Auth + Extended for Event4U roles
// Roles: super_admin, gestore, gestore_covisione, capo_staff, pr, warehouse, bartender, cassiere, cliente
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone", { length: 20 }), // For PR OTP login
  passwordHash: varchar("password_hash"), // For classic email/password registration (optional - null for Replit Auth users)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default('gestore'), // super_admin, gestore, gestore_covisione, capo_staff, pr, warehouse, bartender, cassiere, cliente
  companyId: varchar("company_id").references(() => companies.id),
  parentUserId: varchar("parent_user_id"), // For PR: their Capo Staff; For Capo Staff: their Gestore
  emailVerified: boolean("email_verified").default(false), // Email verification status for classic registration
  phoneVerified: boolean("phone_verified").default(false), // Phone verification for PR OTP login
  verificationToken: varchar("verification_token"), // Token for email verification link
  resetPasswordToken: varchar("reset_password_token"), // Token for password reset
  resetPasswordExpires: timestamp("reset_password_expires"), // Token expiration time
  isActive: boolean("is_active").notNull().default(true), // User account active status
  defaultPrinterAgentId: varchar("default_printer_agent_id"), // For cassiere: assigned printer agent
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
  bridgeToken: varchar("bridge_token", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companiesRelations = relations(companies, ({ many, one }) => ({
  users: many(users),
  locations: many(locations),
  eventFormats: many(eventFormats),
  events: many(events),
  products: many(products),
  features: one(companyFeatures),
}));

// Company Features table - Controls which modules are enabled for each company
export const companyFeatures = pgTable("company_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id).unique(),
  beverageEnabled: boolean("beverage_enabled").notNull().default(true),
  contabilitaEnabled: boolean("contabilita_enabled").notNull().default(false),
  personaleEnabled: boolean("personale_enabled").notNull().default(false),
  cassaEnabled: boolean("cassa_enabled").notNull().default(false),
  nightFileEnabled: boolean("night_file_enabled").notNull().default(false),
  siaeEnabled: boolean("siae_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companyFeaturesRelations = relations(companyFeatures, ({ one }) => ({
  company: one(companies, {
    fields: [companyFeatures.companyId],
    references: [companies.id],
  }),
}));

// User Features table - Controls which modules are enabled for each user
export const userFeatures = pgTable("user_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  beverageEnabled: boolean("beverage_enabled").notNull().default(true),
  contabilitaEnabled: boolean("contabilita_enabled").notNull().default(false),
  personaleEnabled: boolean("personale_enabled").notNull().default(false),
  cassaEnabled: boolean("cassa_enabled").notNull().default(false),
  nightFileEnabled: boolean("night_file_enabled").notNull().default(false),
  siaeEnabled: boolean("siae_enabled").notNull().default(false),
  canCreateProducts: boolean("can_create_products").notNull().default(false), // Warehouse permission to create products
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userFeaturesRelations = relations(userFeatures, ({ one }) => ({
  user: one(users, {
    fields: [userFeatures.userId],
    references: [users.id],
  }),
}));

// Locations table
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  capacity: integer("capacity"),
  notes: text("notes"),
  // Campi per vetrina pubblica
  heroImageUrl: text("hero_image_url"),
  shortDescription: text("short_description"),
  openingHours: text("opening_hours"),
  isPublic: boolean("is_public").notNull().default(false), // Mostra nella vetrina pubblica
  siaeLocationCode: varchar("siae_location_code", { length: 50 }), // Codice locale SIAE
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

// Event Formats table
export const eventFormats = pgTable("event_formats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default('#3b82f6'), // hex color for badge
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventFormatsRelations = relations(eventFormats, ({ one, many }) => ({
  company: one(companies, {
    fields: [eventFormats.companyId],
    references: [companies.id],
  }),
  events: many(events),
}));

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  locationId: varchar("location_id").notNull().references(() => locations.id),
  formatId: varchar("format_id").references(() => eventFormats.id), // optional event format/category
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"), // Public description for event page
  imageUrl: text("image_url"), // Public image URL for event page
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
  recurrenceInterval: integer("recurrence_interval"), // every N days/weeks/months (required for automatic, optional for manual)
  recurrenceCount: integer("recurrence_count"), // total occurrences (null = infinite with end date)
  recurrenceEndDate: timestamp("recurrence_end_date"), // when recurrence ends
  parentEventId: varchar("parent_event_id").references((): any => events.id), // null for parent, points to parent for exceptions
  isPublic: boolean("is_public").notNull().default(false), // Mostra nella vetrina pubblica e abilita link biglietti
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
  format: one(eventFormats, {
    fields: [events.formatId],
    references: [eventFormats.id],
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
  type: varchar("type", { length: 50 }).notNull(), // LOAD, UNLOAD, TRANSFER, CONSUME, RETURN, ADJUSTMENT, DIRECT_LOAD, DIRECT_CONSUME
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

// ==================== MODULO CONTABILITÀ ====================

// Fixed Costs (Costi fissi location)
export const fixedCosts = pgTable("fixed_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  locationId: varchar("location_id").references(() => locations.id),
  category: varchar("category", { length: 100 }).notNull(), // affitto, service, permessi, sicurezza, amministrativi
  name: varchar("name", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull().default('monthly'), // monthly, yearly, per_event
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fixedCostsRelations = relations(fixedCosts, ({ one }) => ({
  company: one(companies, {
    fields: [fixedCosts.companyId],
    references: [companies.id],
  }),
  location: one(locations, {
    fields: [fixedCosts.locationId],
    references: [locations.id],
  }),
}));

// Extra Costs (Costi extra per evento)
export const extraCosts = pgTable("extra_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").references(() => events.id),
  category: varchar("category", { length: 100 }).notNull(), // personale, service, noleggi, acquisti
  name: varchar("name", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceDate: timestamp("invoice_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const extraCostsRelations = relations(extraCosts, ({ one }) => ({
  company: one(companies, {
    fields: [extraCosts.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [extraCosts.eventId],
    references: [events.id],
  }),
  supplier: one(suppliers, {
    fields: [extraCosts.supplierId],
    references: [suppliers.id],
  }),
}));

// Maintenances (Manutenzioni)
export const maintenances = pgTable("maintenances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  locationId: varchar("location_id").references(() => locations.id),
  eventId: varchar("event_id").references(() => events.id),
  type: varchar("type", { length: 50 }).notNull(), // ordinaria, straordinaria
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, scheduled, completed
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const maintenancesRelations = relations(maintenances, ({ one }) => ({
  company: one(companies, {
    fields: [maintenances.companyId],
    references: [companies.id],
  }),
  location: one(locations, {
    fields: [maintenances.locationId],
    references: [locations.id],
  }),
  event: one(events, {
    fields: [maintenances.eventId],
    references: [events.id],
  }),
  supplier: one(suppliers, {
    fields: [maintenances.supplierId],
    references: [suppliers.id],
  }),
}));

// Accounting Documents (Documenti contabili)
export const accountingDocuments = pgTable("accounting_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").references(() => events.id),
  type: varchar("type", { length: 50 }).notNull(), // fattura, preventivo, ricevuta, contratto
  documentNumber: varchar("document_number", { length: 100 }),
  issueDate: timestamp("issue_date"),
  dueDate: timestamp("due_date"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, paid, cancelled
  fileUrl: varchar("file_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountingDocumentsRelations = relations(accountingDocuments, ({ one }) => ({
  company: one(companies, {
    fields: [accountingDocuments.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [accountingDocuments.eventId],
    references: [events.id],
  }),
  supplier: one(suppliers, {
    fields: [accountingDocuments.supplierId],
    references: [suppliers.id],
  }),
}));

// ==================== MODULO PERSONALE ====================

// Staff (Anagrafica personale)
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").references(() => users.id), // Optional link to user account
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  fiscalCode: varchar("fiscal_code", { length: 16 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 100 }).notNull(), // pr, barista, sicurezza, fotografo, dj, tecnico
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  fixedRate: decimal("fixed_rate", { precision: 10, scale: 2 }), // Compenso fisso per serata
  bankIban: varchar("bank_iban", { length: 34 }),
  address: text("address"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const staffRelations = relations(staff, ({ one, many }) => ({
  company: one(companies, {
    fields: [staff.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [staff.userId],
    references: [users.id],
  }),
  assignments: many(staffAssignments),
  payments: many(staffPayments),
}));

// Staff Assignments (Assegnazione personale agli eventi)
export const staffAssignments = pgTable("staff_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  role: varchar("role", { length: 100 }), // Role for this specific event
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  status: varchar("status", { length: 50 }).notNull().default('scheduled'), // scheduled, confirmed, present, absent, replaced
  compensationType: varchar("compensation_type", { length: 50 }).default('fixed'), // fixed, hourly
  compensationAmount: decimal("compensation_amount", { precision: 10, scale: 2 }),
  bonus: decimal("bonus", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const staffAssignmentsRelations = relations(staffAssignments, ({ one }) => ({
  company: one(companies, {
    fields: [staffAssignments.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [staffAssignments.eventId],
    references: [events.id],
  }),
  staff: one(staff, {
    fields: [staffAssignments.staffId],
    references: [staff.id],
  }),
}));

// Staff Payments (Pagamenti personale)
export const staffPayments = pgTable("staff_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  staffId: varchar("staff_id").notNull().references(() => staff.id),
  eventId: varchar("event_id").references(() => events.id),
  assignmentId: varchar("assignment_id").references(() => staffAssignments.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }), // cash, bank_transfer, other
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, paid, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const staffPaymentsRelations = relations(staffPayments, ({ one }) => ({
  company: one(companies, {
    fields: [staffPayments.companyId],
    references: [companies.id],
  }),
  staff: one(staff, {
    fields: [staffPayments.staffId],
    references: [staff.id],
  }),
  event: one(events, {
    fields: [staffPayments.eventId],
    references: [events.id],
  }),
  assignment: one(staffAssignments, {
    fields: [staffPayments.assignmentId],
    references: [staffAssignments.id],
  }),
}));

// ==================== MODULO CASSA ====================

// Cash Sectors (Settori cassa)
export const cashSectors = pgTable("cash_sectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 100 }).notNull(), // Ingressi, Beverage, Guardaroba, Extra
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cashSectorsRelations = relations(cashSectors, ({ one, many }) => ({
  company: one(companies, {
    fields: [cashSectors.companyId],
    references: [companies.id],
  }),
  positions: many(cashPositions),
}));

// Cash Positions (Postazioni cassa)
export const cashPositions = pgTable("cash_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  sectorId: varchar("sector_id").notNull().references(() => cashSectors.id),
  name: varchar("name", { length: 100 }).notNull(), // Bar 1, Biglietteria, VIP Bar
  operatorId: varchar("operator_id").references(() => staff.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cashPositionsRelations = relations(cashPositions, ({ one, many }) => ({
  company: one(companies, {
    fields: [cashPositions.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [cashPositions.eventId],
    references: [events.id],
  }),
  sector: one(cashSectors, {
    fields: [cashPositions.sectorId],
    references: [cashSectors.id],
  }),
  operator: one(staff, {
    fields: [cashPositions.operatorId],
    references: [staff.id],
  }),
  entries: many(cashEntries),
  funds: many(cashFunds),
}));

// Cash Entries (Registrazioni incassi)
export const cashEntries = pgTable("cash_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  positionId: varchar("position_id").notNull().references(() => cashPositions.id),
  entryType: varchar("entry_type", { length: 50 }).notNull(), // quantity, monetary
  productId: varchar("product_id").references(() => products.id), // For quantity-based entries
  description: varchar("description", { length: 255 }), // For custom entries
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // cash, card, online, credits
  notes: text("notes"),
  entryTime: timestamp("entry_time").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cashEntriesRelations = relations(cashEntries, ({ one }) => ({
  company: one(companies, {
    fields: [cashEntries.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [cashEntries.eventId],
    references: [events.id],
  }),
  position: one(cashPositions, {
    fields: [cashEntries.positionId],
    references: [cashPositions.id],
  }),
  product: one(products, {
    fields: [cashEntries.productId],
    references: [products.id],
  }),
}));

// Cash Funds (Fondi cassa - apertura/chiusura)
export const cashFunds = pgTable("cash_funds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  positionId: varchar("position_id").notNull().references(() => cashPositions.id),
  type: varchar("type", { length: 50 }).notNull(), // opening, closing
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }), // For closing - calculated
  difference: decimal("difference", { precision: 10, scale: 2 }), // Closing: actual - expected
  denominations: jsonb("denominations"), // Optional breakdown by coin/bill
  operatorId: varchar("operator_id").references(() => staff.id),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cashFundsRelations = relations(cashFunds, ({ one }) => ({
  company: one(companies, {
    fields: [cashFunds.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [cashFunds.eventId],
    references: [events.id],
  }),
  position: one(cashPositions, {
    fields: [cashFunds.positionId],
    references: [cashPositions.id],
  }),
  operator: one(staff, {
    fields: [cashFunds.operatorId],
    references: [staff.id],
  }),
}));

// ==================== MODULO FILE DELLA SERATA ====================

// Night Files (Documento riepilogativo serata)
export const nightFiles = pgTable("night_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  status: varchar("status", { length: 50 }).notNull().default('draft'), // draft, pending_review, approved, closed
  // Riepilogo Contabilità
  totalFixedCosts: decimal("total_fixed_costs", { precision: 10, scale: 2 }),
  totalExtraCosts: decimal("total_extra_costs", { precision: 10, scale: 2 }),
  totalMaintenances: decimal("total_maintenances", { precision: 10, scale: 2 }),
  // Riepilogo Personale
  totalStaffCount: integer("total_staff_count"),
  totalStaffCosts: decimal("total_staff_costs", { precision: 10, scale: 2 }),
  // Riepilogo Cassa
  totalCashRevenue: decimal("total_cash_revenue", { precision: 10, scale: 2 }),
  totalCardRevenue: decimal("total_card_revenue", { precision: 10, scale: 2 }),
  totalOnlineRevenue: decimal("total_online_revenue", { precision: 10, scale: 2 }),
  totalCreditsRevenue: decimal("total_credits_revenue", { precision: 10, scale: 2 }),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }),
  totalExpenses: decimal("total_expenses", { precision: 10, scale: 2 }),
  netResult: decimal("net_result", { precision: 10, scale: 2 }),
  // Fund Reconciliation
  openingFund: decimal("opening_fund", { precision: 10, scale: 2 }),
  closingFund: decimal("closing_fund", { precision: 10, scale: 2 }),
  fundDifference: decimal("fund_difference", { precision: 10, scale: 2 }),
  // Note e Approvazione
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nightFilesRelations = relations(nightFiles, ({ one }) => ({
  company: one(companies, {
    fields: [nightFiles.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [nightFiles.eventId],
    references: [events.id],
  }),
  approver: one(users, {
    fields: [nightFiles.approvedBy],
    references: [users.id],
  }),
}));

// ==================== MODULO BIGLIETTERIA SIAE ====================

// TAB.1 - Generi Evento (Event Types) - Decreto 23/07/2001
export const siaeEventGenres = pgTable("siae_event_genres", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 2 }).notNull().unique(), // 01-97
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  taxType: varchar("tax_type", { length: 1 }).notNull().default('S'), // S=spettacolo, I=intrattenimento
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }), // Aliquota IVA
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TAB.2 - Ordini di Posto (Sector Codes) - Decreto 23/07/2001
export const siaeSectorCodes = pgTable("siae_sector_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 2 }).notNull().unique(), // AA, AB, PT, etc.
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TAB.3 - Tipi Titolo (Ticket Types) - Decreto 23/07/2001
export const siaeTicketTypes = pgTable("siae_ticket_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 3 }).notNull().unique(), // I, R1-R6, RX, O1-O6, OX, S, etc.
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // intero, ridotto, omaggio, servizio, prestazione, cessione
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TAB.4 - Prestazioni Complementari (Complementary Services)
export const siaeServiceCodes = pgTable("siae_service_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 3 }).notNull().unique(), // GR, PR, CO, etc.
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TAB.5 - Causali Annullamento (Cancellation Reasons) - Allegato B
export const siaeCancellationReasons = pgTable("siae_cancellation_reasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 3 }).notNull().unique(), // 001-010
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  requiresReference: boolean("requires_reference").notNull().default(false), // Se richiede riferimento a titolo originale
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Carte di Attivazione SIAE (Activation Cards) - Decreto Art. 3-5
export const siaeActivationCards = pgTable("siae_activation_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardCode: varchar("card_code", { length: 20 }).notNull().unique(), // Codice univoco carta (seriale smart card fino a 16+ caratteri)
  systemCode: varchar("system_code", { length: 8 }).notNull(), // Codice sistema emissione associato
  companyId: varchar("company_id").notNull().references(() => companies.id),
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, expired, revoked, maintenance
  activationDate: timestamp("activation_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  certificateExpiration: timestamp("certificate_expiration"), // X.509 certificate expiry
  progressiveCounter: integer("progressive_counter").notNull().default(0), // Numeratore progressivo sigilli
  lastSealDate: timestamp("last_seal_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeActivationCardsRelations = relations(siaeActivationCards, ({ one, many }) => ({
  company: one(companies, {
    fields: [siaeActivationCards.companyId],
    references: [companies.id],
  }),
  fiscalSeals: many(siaeFiscalSeals),
}));

// Codici Canale Emissione (Emission Channel Codes - C1) - Allegato B 1.a
export const siaeEmissionChannels = pgTable("siae_emission_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  channelCode: varchar("channel_code", { length: 8 }).notNull().unique(), // 8 caratteri: 2 tipo + 6 univoco
  channelType: varchar("channel_type", { length: 2 }).notNull(), // 01=PV, 02=SW, 03=CL, 04=CW, 05=AP
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  locationId: varchar("location_id").references(() => locations.id), // Per PV - associazione punto vendita
  websiteUrl: varchar("website_url", { length: 500 }), // Per SW - URL sito web
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, inactive, suspended
  activatedAt: timestamp("activated_at").defaultNow(),
  deactivatedAt: timestamp("deactivated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeEmissionChannelsRelations = relations(siaeEmissionChannels, ({ one, many }) => ({
  company: one(companies, {
    fields: [siaeEmissionChannels.companyId],
    references: [companies.id],
  }),
  location: one(locations, {
    fields: [siaeEmissionChannels.locationId],
    references: [locations.id],
  }),
  tickets: many(siaeTickets),
}));

// Configurazione Sistema SIAE (Globale - una sola istanza)
export const siaeSystemConfig = pgTable("siae_system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id), // Opzionale - per compatibilità
  // Dati Azienda Titolare Sistema Biglietteria
  businessName: varchar("business_name", { length: 255 }), // Ragione Sociale
  businessAddress: text("business_address"), // Indirizzo sede legale
  businessCity: varchar("business_city", { length: 100 }), // Città sede legale
  businessProvince: varchar("business_province", { length: 2 }), // Provincia (sigla)
  businessPostalCode: varchar("business_postal_code", { length: 10 }), // CAP
  systemCode: varchar("system_code", { length: 8 }), // Codice sistema emissione SIAE
  taxId: varchar("tax_id", { length: 16 }), // Codice Fiscale Titolare (CFTitolare)
  vatNumber: varchar("vat_number", { length: 11 }), // Partita IVA
  pecEmail: varchar("pec_email", { length: 255 }), // PEC per comunicazioni SIAE
  siaeEmail: varchar("siae_email", { length: 255 }), // Email assegnata da SIAE
  // Configurazione CAPTCHA
  captchaEnabled: boolean("captcha_enabled").notNull().default(true),
  captchaMinChars: integer("captcha_min_chars").notNull().default(5),
  captchaImageWidth: integer("captcha_image_width").notNull().default(400),
  captchaImageHeight: integer("captcha_image_height").notNull().default(200),
  captchaFonts: text("captcha_fonts").array().default(sql`ARRAY['Arial', 'Verdana']::text[]`),
  captchaDistortion: varchar("captcha_distortion", { length: 20 }).default('medium'), // low, medium, high
  captchaAudioEnabled: boolean("captcha_audio_enabled").notNull().default(true),
  // Configurazione OTP
  otpEnabled: boolean("otp_enabled").notNull().default(true),
  otpDigits: integer("otp_digits").notNull().default(6),
  otpTimeoutSeconds: integer("otp_timeout_seconds").notNull().default(300), // 5 minuti
  otpMaxAttempts: integer("otp_max_attempts").notNull().default(3),
  otpCooldownSeconds: integer("otp_cooldown_seconds").notNull().default(60),
  otpProvider: varchar("otp_provider", { length: 50 }).default('twilio'), // twilio, nexmo, custom
  otpVoiceEnabled: boolean("otp_voice_enabled").notNull().default(true),
  // Configurazione SPID
  spidEnabled: boolean("spid_enabled").notNull().default(false),
  spidLevel: integer("spid_level").notNull().default(2), // 1, 2, 3
  spidProviders: text("spid_providers").array().default(sql`ARRAY['poste', 'aruba']::text[]`),
  // Limiti e Policy
  maxTicketsPerEvent: integer("max_tickets_per_event").notNull().default(10), // Limite acquisto per utente
  capacityThreshold: integer("capacity_threshold").notNull().default(5000), // Soglia per cambio nominativo
  nominativeTicketsEnabled: boolean("nominative_tickets_enabled").notNull().default(true),
  changeNameEnabled: boolean("change_name_enabled").notNull().default(true),
  resaleEnabled: boolean("resale_enabled").notNull().default(true),
  // Template biglietti
  ticketTemplatePdf: text("ticket_template_pdf"),
  ticketTemplatePrint: text("ticket_template_print"),
  // Trasmissioni
  autoTransmitDaily: boolean("auto_transmit_daily").notNull().default(false),
  transmissionPecAddress: varchar("transmission_pec_address", { length: 255 }).default('misuratorifiscali@pec.agenziaentrate.it'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeSystemConfigRelations = relations(siaeSystemConfig, ({ one }) => ({
  company: one(companies, {
    fields: [siaeSystemConfig.companyId],
    references: [companies.id],
  }),
}));

// Clienti Biglietteria (Ticket Customers) - Allegato A 3.3
export const siaeCustomers = pgTable("siae_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Collegamento all'utente unificato
  uniqueCode: varchar("unique_code", { length: 50 }).notNull().unique(), // Codice univoco per log (NO dati anagrafici)
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(), // Con prefisso internazionale
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  birthDate: timestamp("birth_date"),
  birthPlace: varchar("birth_place", { length: 255 }), // ISO 3166 conforme
  // Stato verifica
  phoneVerified: boolean("phone_verified").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  registrationCompleted: boolean("registration_completed").notNull().default(false),
  // SPID
  spidCode: varchar("spid_code", { length: 100 }), // Se registrato via SPID
  spidProvider: varchar("spid_provider", { length: 50 }),
  // Metadati registrazione
  registrationIp: varchar("registration_ip", { length: 45 }), // IPv4 o IPv6
  registrationDate: timestamp("registration_date").defaultNow(),
  authenticationType: varchar("authentication_type", { length: 10 }).notNull().default('OTP'), // SPID, OTP, BO
  // Stato account
  isActive: boolean("is_active").notNull().default(true),
  blockedUntil: timestamp("blocked_until"),
  blockReason: text("block_reason"),
  // Password reset
  resetPasswordToken: varchar("reset_password_token", { length: 255 }),
  resetPasswordExpires: timestamp("reset_password_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeCustomersRelations = relations(siaeCustomers, ({ one, many }) => ({
  user: one(users, {
    fields: [siaeCustomers.userId],
    references: [users.id],
  }),
  transactions: many(siaeTransactions),
  tickets: many(siaeTickets),
  otpAttempts: many(siaeOtpAttempts),
}));

// Tentativi OTP (OTP Attempts Log)
export const siaeOtpAttempts = pgTable("siae_otp_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => siaeCustomers.id),
  phone: varchar("phone", { length: 20 }).notNull(),
  otpCode: varchar("otp_code", { length: 10 }).notNull(), // Codice OTP generato
  purpose: varchar("purpose", { length: 50 }).notNull(), // registration, login, phone_change
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, verified, expired, failed
  attemptsCount: integer("attempts_count").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siaeOtpAttemptsRelations = relations(siaeOtpAttempts, ({ one }) => ({
  customer: one(siaeCustomers, {
    fields: [siaeOtpAttempts.customerId],
    references: [siaeCustomers.id],
  }),
}));

// Eventi Biglietteria (Ticketed Events)
export const siaeTicketedEvents = pgTable("siae_ticketed_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id).unique(),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // Dati SIAE
  siaeEventCode: varchar("siae_event_code", { length: 50 }), // Codice evento SIAE
  siaeLocationCode: varchar("siae_location_code", { length: 50 }), // Codice locale SIAE
  organizerType: varchar("organizer_type", { length: 10 }), // Tipo organizzatore SIAE
  genreCode: varchar("genre_code", { length: 2 }).notNull(), // TAB.1
  taxType: varchar("tax_type", { length: 1 }).notNull().default('S'), // S=spettacolo, I=intrattenimento
  ivaPreassolta: varchar("iva_preassolta", { length: 1 }).notNull().default('N'), // N, B, F
  // Capienza e nominatività
  totalCapacity: integer("total_capacity").notNull(),
  requiresNominative: boolean("requires_nominative").notNull().default(true),
  allowsChangeName: boolean("allows_change_name").notNull().default(false), // Solo se >5000
  allowsResale: boolean("allows_resale").notNull().default(false), // Solo se >5000
  // Date vendita
  saleStartDate: timestamp("sale_start_date"),
  saleEndDate: timestamp("sale_end_date"),
  maxTicketsPerUser: integer("max_tickets_per_user").notNull().default(10),
  // Stato
  ticketingStatus: varchar("ticketing_status", { length: 20 }).notNull().default('draft'), // draft, active, suspended, closed
  // Contatori
  ticketsSold: integer("tickets_sold").notNull().default(0),
  ticketsCancelled: integer("tickets_cancelled").notNull().default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeTicketedEventsRelations = relations(siaeTicketedEvents, ({ one, many }) => ({
  event: one(events, {
    fields: [siaeTicketedEvents.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [siaeTicketedEvents.companyId],
    references: [companies.id],
  }),
  sectors: many(siaeEventSectors),
  tickets: many(siaeTickets),
  transactions: many(siaeTransactions),
}));

// Settori Evento (Event Sectors) - con prezzi
export const siaeEventSectors = pgTable("siae_event_sectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketedEventId: varchar("ticketed_event_id").notNull().references(() => siaeTicketedEvents.id),
  sectorCode: varchar("sector_code", { length: 2 }).notNull(), // TAB.2
  name: varchar("name", { length: 255 }).notNull(),
  capacity: integer("capacity").notNull(),
  availableSeats: integer("available_seats").notNull(),
  isNumbered: boolean("is_numbered").notNull().default(false), // Posti numerati
  // Prezzi per tipo titolo
  priceIntero: decimal("price_intero", { precision: 10, scale: 2 }).notNull(), // Prezzo intero
  priceRidotto: decimal("price_ridotto", { precision: 10, scale: 2 }),
  priceOmaggio: decimal("price_omaggio", { precision: 10, scale: 2 }).default('0'),
  prevendita: decimal("prevendita", { precision: 10, scale: 2 }).default('0'), // Diritto prevendita
  ivaRate: decimal("iva_rate", { precision: 5, scale: 2 }).default('22'), // Aliquota IVA
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeEventSectorsRelations = relations(siaeEventSectors, ({ one, many }) => ({
  ticketedEvent: one(siaeTicketedEvents, {
    fields: [siaeEventSectors.ticketedEventId],
    references: [siaeTicketedEvents.id],
  }),
  tickets: many(siaeTickets),
  seats: many(siaeSeats),
}));

// Posti Numerati (Numbered Seats)
export const siaeSeats = pgTable("siae_seats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectorId: varchar("sector_id").notNull().references(() => siaeEventSectors.id),
  row: varchar("row", { length: 10 }),
  seatNumber: varchar("seat_number", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('available'), // available, reserved, sold, blocked
  ticketId: varchar("ticket_id"), // No FK reference to avoid circular dependency - relationship is via siaeTickets.seatId
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeSeatsRelations = relations(siaeSeats, ({ one }) => ({
  sector: one(siaeEventSectors, {
    fields: [siaeSeats.sectorId],
    references: [siaeEventSectors.id],
  }),
}));

// Sigilli Fiscali (Fiscal Seals) - Decreto Art. 4
export const siaeFiscalSeals = pgTable("siae_fiscal_seals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardId: varchar("card_id").notNull().references(() => siaeActivationCards.id),
  sealCode: varchar("seal_code", { length: 16 }).notNull().unique(), // 16 caratteri alfanumerici
  progressiveNumber: integer("progressive_number").notNull(), // Progressivo per carta
  emissionDate: varchar("emission_date", { length: 4 }).notNull(), // MMGG
  emissionTime: varchar("emission_time", { length: 4 }).notNull(), // HHMM
  amount: varchar("amount", { length: 8 }).notNull(), // 8 caratteri importo
  ticketId: varchar("ticket_id"), // No FK reference to avoid circular dependency - relationship is via siaeTickets.fiscalSealId
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const siaeFiscalSealsRelations = relations(siaeFiscalSeals, ({ one }) => ({
  card: one(siaeActivationCards, {
    fields: [siaeFiscalSeals.cardId],
    references: [siaeActivationCards.id],
  }),
}));

// Biglietti (Tickets) - Allegato B
export const siaeTickets = pgTable("siae_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketedEventId: varchar("ticketed_event_id").notNull().references(() => siaeTicketedEvents.id),
  sectorId: varchar("sector_id").notNull().references(() => siaeEventSectors.id),
  transactionId: varchar("transaction_id"), // No FK to avoid circular dependency - siaeTransactions defined after this
  customerId: varchar("customer_id").references(() => siaeCustomers.id),
  // Sigillo Fiscale
  fiscalSealId: varchar("fiscal_seal_id"), // No FK to avoid circular dependency - managed via application logic
  fiscalSealCode: varchar("fiscal_seal_code", { length: 16 }), // Copia per query rapide
  progressiveNumber: integer("progressive_number").notNull(), // Numero progressivo sistema
  // Carta e Canale
  cardCode: varchar("card_code", { length: 20 }), // Codice carta attivazione (seriale smart card)
  emissionChannelCode: varchar("emission_channel_code", { length: 8 }), // Codice C1
  // Date emissione
  emissionDate: timestamp("emission_date").notNull().defaultNow(),
  emissionDateStr: varchar("emission_date_str", { length: 8 }), // AAAAMMGG
  emissionTimeStr: varchar("emission_time_str", { length: 4 }), // HHMM
  // Tipo titolo
  ticketTypeCode: varchar("ticket_type_code", { length: 3 }).notNull(), // TAB.3
  sectorCode: varchar("sector_code", { length: 2 }).notNull(), // TAB.2
  // Posto (se numerato)
  seatId: varchar("seat_id").references(() => siaeSeats.id),
  row: varchar("row", { length: 10 }),
  seatNumber: varchar("seat_number", { length: 10 }),
  // Prezzi
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(), // Corrispettivo lordo con IVA
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }), // Importo netto
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }), // IVA
  prevendita: decimal("prevendita", { precision: 10, scale: 2 }).default('0'),
  prevenditaVat: decimal("prevendita_vat", { precision: 10, scale: 2 }),
  // Nominatività
  participantFirstName: varchar("participant_first_name", { length: 100 }),
  participantLastName: varchar("participant_last_name", { length: 100 }),
  // Emissione cassiere
  ticketCode: varchar("ticket_code", { length: 50 }), // Codice univoco biglietto
  ticketType: varchar("ticket_type", { length: 30 }), // Tipo biglietto (intero, ridotto, omaggio)
  ticketPrice: decimal("ticket_price", { precision: 10, scale: 2 }), // Prezzo biglietto
  issuedByUserId: varchar("issued_by_user_id"), // ID cassiere/utente che ha emesso il biglietto
  isComplimentary: boolean("is_complimentary").default(false), // Biglietto omaggio
  paymentMethod: varchar("payment_method", { length: 30 }), // Metodo pagamento (cash, card, etc.)
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('valid'), // valid, used, cancelled
  usedAt: timestamp("used_at"), // Quando è stato usato per entrare
  usedByScannerId: varchar("used_by_scanner_id"), // ID scanner che ha validato
  // Annullamento
  cancellationReasonCode: varchar("cancellation_reason_code", { length: 3 }), // TAB.5
  cancellationDate: timestamp("cancellation_date"),
  cancelledByUserId: varchar("cancelled_by_user_id"), // Can be users.id OR siaeCashiers.id
  // Riferimento annullamento (per cambio nominativo/rimessa)
  originalTicketId: varchar("original_ticket_id"), // Se derivato da cambio/rimessa
  replacedByTicketId: varchar("replaced_by_ticket_id"), // Se sostituito
  // QR Code
  qrCode: text("qr_code"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  // Testo libero personalizzabile (inserito dalla cassa)
  customText: varchar("custom_text", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeTicketsRelations = relations(siaeTickets, ({ one }) => ({
  ticketedEvent: one(siaeTicketedEvents, {
    fields: [siaeTickets.ticketedEventId],
    references: [siaeTicketedEvents.id],
  }),
  sector: one(siaeEventSectors, {
    fields: [siaeTickets.sectorId],
    references: [siaeEventSectors.id],
  }),
  customer: one(siaeCustomers, {
    fields: [siaeTickets.customerId],
    references: [siaeCustomers.id],
  }),
  // cancelledByUserId can be either users.id OR siaeCashiers.id, so no direct relation
}));

// Transazioni (Transactions) - Allegato B
export const siaeTransactions = pgTable("siae_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionCode: varchar("transaction_code", { length: 50 }).notNull().unique(), // Codice univoco transazione
  ticketedEventId: varchar("ticketed_event_id").notNull().references(() => siaeTicketedEvents.id),
  customerId: varchar("customer_id").notNull().references(() => siaeCustomers.id),
  emissionChannelCode: varchar("emission_channel_code", { length: 8 }).notNull(), // Codice C1
  // Dati acquirente per log
  customerUniqueCode: varchar("customer_unique_code", { length: 50 }).notNull(), // Codice univoco (NO dati personali)
  customerPhone: varchar("customer_phone", { length: 20 }), // Con prefisso 0039
  customerEmail: varchar("customer_email", { length: 255 }),
  // Metadati transazione
  transactionIp: varchar("transaction_ip", { length: 45 }),
  checkoutStartedAt: timestamp("checkout_started_at"),
  paymentCompletedAt: timestamp("payment_completed_at"),
  // Pagamento
  paymentMethod: varchar("payment_method", { length: 50 }), // card, bank_transfer, cash, paypal
  paymentReference: varchar("payment_reference", { length: 100 }), // CRO o riferimento
  // Importi
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  totalVat: decimal("total_vat", { precision: 10, scale: 2 }),
  totalPrevendita: decimal("total_prevendita", { precision: 10, scale: 2 }),
  ticketsCount: integer("tickets_count").notNull().default(0),
  // Consegna
  deliveryMethod: varchar("delivery_method", { length: 50 }), // email, download, courier, box_office
  deliveryAddress: text("delivery_address"),
  deliveredAt: timestamp("delivered_at"),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, completed, failed, refunded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeTransactionsRelations = relations(siaeTransactions, ({ one, many }) => ({
  ticketedEvent: one(siaeTicketedEvents, {
    fields: [siaeTransactions.ticketedEventId],
    references: [siaeTicketedEvents.id],
  }),
  customer: one(siaeCustomers, {
    fields: [siaeTransactions.customerId],
    references: [siaeCustomers.id],
  }),
  tickets: many(siaeTickets),
}));

// Cambio Nominativo (Name Change) - Provvedimento 356768/2025 6.1-6.3
export const siaeNameChanges = pgTable("siae_name_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalTicketId: varchar("original_ticket_id").notNull().references(() => siaeTickets.id),
  newTicketId: varchar("new_ticket_id").references(() => siaeTickets.id),
  requestedById: varchar("requested_by_id").notNull(), // Customer o User ID
  requestedByType: varchar("requested_by_type", { length: 20 }).notNull(), // customer, operator
  // Nuovo nominativo
  newFirstName: varchar("new_first_name", { length: 100 }).notNull(),
  newLastName: varchar("new_last_name", { length: 100 }).notNull(),
  // Costi
  fee: decimal("fee", { precision: 10, scale: 2 }).default('0'),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, completed, rejected
  processedAt: timestamp("processed_at"),
  processedByUserId: varchar("processed_by_user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeNameChangesRelations = relations(siaeNameChanges, ({ one }) => ({
  originalTicket: one(siaeTickets, {
    fields: [siaeNameChanges.originalTicketId],
    references: [siaeTickets.id],
  }),
  processedByUser: one(users, {
    fields: [siaeNameChanges.processedByUserId],
    references: [users.id],
  }),
}));

// Rimessa in Vendita (Resale) - Provvedimento 356768/2025 6.4
export const siaeResales = pgTable("siae_resales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalTicketId: varchar("original_ticket_id").notNull().references(() => siaeTickets.id),
  newTicketId: varchar("new_ticket_id").references(() => siaeTickets.id),
  sellerId: varchar("seller_id").notNull().references(() => siaeCustomers.id),
  buyerId: varchar("buyer_id").references(() => siaeCustomers.id),
  // Prezzi
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  resalePrice: decimal("resale_price", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default('0'),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('listed'), // listed, sold, cancelled, expired
  listedAt: timestamp("listed_at").defaultNow(),
  soldAt: timestamp("sold_at"),
  cancelledAt: timestamp("cancelled_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeResalesRelations = relations(siaeResales, ({ one }) => ({
  originalTicket: one(siaeTickets, {
    fields: [siaeResales.originalTicketId],
    references: [siaeTickets.id],
  }),
  seller: one(siaeCustomers, {
    fields: [siaeResales.sellerId],
    references: [siaeCustomers.id],
  }),
  buyer: one(siaeCustomers, {
    fields: [siaeResales.buyerId],
    references: [siaeCustomers.id],
  }),
}));

// Log SIAE (Transaction Logs for XML) - Allegato B
export const siaeLogs = pgTable("siae_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  ticketId: varchar("ticket_id").references(() => siaeTickets.id),
  transactionId: varchar("transaction_id").references(() => siaeTransactions.id),
  logType: varchar("log_type", { length: 20 }).notNull(), // emission, cancellation, change, resale
  // Dati fiscali obbligatori
  cfOrganizzatore: varchar("cf_organizzatore", { length: 16 }).notNull(),
  cfTitolare: varchar("cf_titolare", { length: 16 }).notNull(),
  sigilloFiscale: varchar("sigillo_fiscale", { length: 16 }),
  codiceRichiedenteEmissione: varchar("codice_richiedente_emissione", { length: 8 }),
  // Dati evento
  codiceLocale: varchar("codice_locale", { length: 50 }),
  tipoGenere: varchar("tipo_genere", { length: 2 }),
  dataEvento: varchar("data_evento", { length: 8 }), // AAAAMMGG
  oraEvento: varchar("ora_evento", { length: 4 }), // HHMM
  // Dati biglietto
  numeroProgressivo: integer("numero_progressivo"),
  tipoTitolo: varchar("tipo_titolo", { length: 3 }),
  codiceOrdine: varchar("codice_ordine", { length: 2 }),
  corrispettivoLordo: decimal("corrispettivo_lordo", { precision: 10, scale: 2 }),
  ivaCorrispettivo: decimal("iva_corrispettivo", { precision: 10, scale: 2 }),
  // Nominatività
  partecipanteNome: varchar("partecipante_nome", { length: 100 }),
  partecipanteCognome: varchar("partecipante_cognome", { length: 100 }),
  // Acquirente (solo codici, NO dati personali)
  codiceUnivocoAcquirente: varchar("codice_univoco_acquirente", { length: 50 }),
  autenticazione: varchar("autenticazione", { length: 10 }), // SPID, OTP, BO
  // Annullamento
  causaleAnnullamento: varchar("causale_annullamento", { length: 3 }),
  originaleRiferimentoAnnullamento: integer("originale_riferimento_annullamento"),
  cartaRiferimentoAnnullamento: varchar("carta_riferimento_annullamento", { length: 8 }),
  // XML generato
  xmlContent: text("xml_content"),
  transmissionId: varchar("transmission_id").references(() => siaeTransmissions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siaeLogsRelations = relations(siaeLogs, ({ one }) => ({
  company: one(companies, {
    fields: [siaeLogs.companyId],
    references: [companies.id],
  }),
  ticket: one(siaeTickets, {
    fields: [siaeLogs.ticketId],
    references: [siaeTickets.id],
  }),
  transaction: one(siaeTransactions, {
    fields: [siaeLogs.transactionId],
    references: [siaeTransactions.id],
  }),
  transmission: one(siaeTransmissions, {
    fields: [siaeLogs.transmissionId],
    references: [siaeTransmissions.id],
  }),
}));

// Trasmissioni SIAE (SIAE Transmissions) - Decreto Art. 10-14
export const siaeTransmissions = pgTable("siae_transmissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  transmissionType: varchar("transmission_type", { length: 20 }).notNull(), // daily, monthly, corrective
  periodDate: timestamp("period_date").notNull(), // Data periodo (giorno o mese)
  // File
  fileName: varchar("file_name", { length: 255 }), // Formato: AAAA>MM>GG>SSSSSSSS>MP>TT>V
  fileExtension: varchar("file_extension", { length: 4 }).notNull().default('.XST'), // .XST o .XSI
  fileContent: text("file_content"), // Contenuto XML
  fileHash: varchar("file_hash", { length: 64 }), // SHA-256 hash
  digitalSignature: text("digital_signature"), // Firma digitale
  // Invio
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, sent, received, error
  sentAt: timestamp("sent_at"),
  sentToPec: varchar("sent_to_pec", { length: 255 }),
  pecMessageId: varchar("pec_message_id", { length: 255 }),
  // Risposta
  receivedAt: timestamp("received_at"),
  receiptContent: text("receipt_content"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  // Statistiche
  ticketsCount: integer("tickets_count").notNull().default(0),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeTransmissionsRelations = relations(siaeTransmissions, ({ one, many }) => ({
  company: one(companies, {
    fields: [siaeTransmissions.companyId],
    references: [companies.id],
  }),
  logs: many(siaeLogs),
}));

// Box Office Sessions (Sessioni Cassa) - Per operatori PV
export const siaeBoxOfficeSessions = pgTable("siae_box_office_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  emissionChannelId: varchar("emission_channel_id").notNull().references(() => siaeEmissionChannels.id),
  locationId: varchar("location_id").references(() => locations.id),
  // Turno
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  // Incassi
  cashTotal: decimal("cash_total", { precision: 10, scale: 2 }).default('0'),
  cardTotal: decimal("card_total", { precision: 10, scale: 2 }).default('0'),
  ticketsSold: integer("tickets_sold").notNull().default(0),
  ticketsCancelled: integer("tickets_cancelled").notNull().default(0),
  // Quadratura
  expectedCash: decimal("expected_cash", { precision: 10, scale: 2 }),
  actualCash: decimal("actual_cash", { precision: 10, scale: 2 }),
  difference: decimal("difference", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default('open'), // open, closed, reconciled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeBoxOfficeSessionsRelations = relations(siaeBoxOfficeSessions, ({ one }) => ({
  user: one(users, {
    fields: [siaeBoxOfficeSessions.userId],
    references: [users.id],
  }),
  emissionChannel: one(siaeEmissionChannels, {
    fields: [siaeBoxOfficeSessions.emissionChannelId],
    references: [siaeEmissionChannels.id],
  }),
  location: one(locations, {
    fields: [siaeBoxOfficeSessions.locationId],
    references: [locations.id],
  }),
}));

// Abbonamenti (Subscriptions) - Allegato B
export const siaeSubscriptions = pgTable("siae_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  customerId: varchar("customer_id").notNull().references(() => siaeCustomers.id),
  subscriptionCode: varchar("subscription_code", { length: 50 }).notNull().unique(),
  progressiveNumber: integer("progressive_number").notNull(),
  // Tipo abbonamento
  turnType: varchar("turn_type", { length: 1 }).notNull().default('F'), // F=fisso, L=libero
  eventsCount: integer("events_count").notNull(), // Quantità eventi abilitati
  eventsUsed: integer("events_used").notNull().default(0),
  // Validità
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  // Prezzo
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  rateoPerEvent: decimal("rateo_per_event", { precision: 10, scale: 2 }),
  rateoVat: decimal("rateo_vat", { precision: 10, scale: 2 }),
  // Nominatività
  holderFirstName: varchar("holder_first_name", { length: 100 }).notNull(),
  holderLastName: varchar("holder_last_name", { length: 100 }).notNull(),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, expired, cancelled
  // Collegamento opzionale a evento/settore per vendita da cassa
  ticketedEventId: varchar("ticketed_event_id").references(() => siaeTicketedEvents.id),
  sectorId: varchar("sector_id").references(() => siaeEventSectors.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeSubscriptionsRelations = relations(siaeSubscriptions, ({ one, many }) => ({
  company: one(companies, {
    fields: [siaeSubscriptions.companyId],
    references: [companies.id],
  }),
  customer: one(siaeCustomers, {
    fields: [siaeSubscriptions.customerId],
    references: [siaeCustomers.id],
  }),
  ticketedEvent: one(siaeTicketedEvents, {
    fields: [siaeSubscriptions.ticketedEventId],
    references: [siaeTicketedEvents.id],
  }),
  sector: one(siaeEventSectors, {
    fields: [siaeSubscriptions.sectorId],
    references: [siaeEventSectors.id],
  }),
}));

// ==================== SIAE Audit Logs ====================
export const siaeAuditLogs = pgTable("siae_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id"), // Can be users.id OR siaeCashiers.id
  // Operazione
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, cancel, emit, validate, transmit
  entityType: varchar("entity_type", { length: 50 }).notNull(), // ticket, transaction, customer, event, sector, etc.
  entityId: varchar("entity_id"), // ID dell'entità modificata
  // Dettagli
  description: text("description"),
  oldData: text("old_data"), // JSON snapshot prima della modifica
  newData: text("new_data"), // JSON snapshot dopo la modifica
  // Metadati
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  // Riferimenti fiscali
  fiscalSealCode: varchar("fiscal_seal_code", { length: 16 }),
  cardCode: varchar("card_code", { length: 20 }), // Seriale smart card
  // Timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

export const siaeAuditLogsRelations = relations(siaeAuditLogs, ({ one }) => ({
  company: one(companies, {
    fields: [siaeAuditLogs.companyId],
    references: [companies.id],
  }),
  // userId can be either users.id OR siaeCashiers.id, so no direct relation
}));

// ==================== SIAE Numbered Seats ====================
export const siaeNumberedSeats = pgTable("siae_numbered_seats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectorId: varchar("sector_id").notNull().references(() => siaeEventSectors.id),
  // Identificazione posto
  rowNumber: varchar("row_number", { length: 10 }).notNull(),
  seatNumber: varchar("seat_number", { length: 10 }).notNull(),
  // Categoria e prezzo
  category: varchar("category", { length: 50 }).default('standard'), // standard, vip, premium, accessibility
  priceMultiplier: decimal("price_multiplier", { precision: 3, scale: 2 }).default('1.00'),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('available'), // available, sold, reserved, blocked
  // Coordinate per mappa (opzionale)
  xPosition: decimal("x_position", { precision: 8, scale: 2 }),
  yPosition: decimal("y_position", { precision: 8, scale: 2 }),
  // Note
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeNumberedSeatsRelations = relations(siaeNumberedSeats, ({ one }) => ({
  sector: one(siaeEventSectors, {
    fields: [siaeNumberedSeats.sectorId],
    references: [siaeEventSectors.id],
  }),
}));

// ==================== Smart Card Reader Sessions ====================
// Traccia le sessioni di connessione del lettore MiniLector EVO V3 per sigilli fiscali
export const siaeSmartCardSessions = pgTable("siae_smart_card_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Identificazione lettore
  readerId: varchar("reader_id", { length: 100 }).notNull(), // ID univoco lettore (es. "Bit4id miniLector")
  readerName: varchar("reader_name", { length: 255 }).notNull(),
  readerModel: varchar("reader_model", { length: 100 }).default('MiniLector EVO V3'),
  readerVendor: varchar("reader_vendor", { length: 100 }).default('Bit4id'),
  // Carta inserita
  cardAtr: varchar("card_atr", { length: 100 }), // Answer To Reset della carta
  cardType: varchar("card_type", { length: 100 }), // Tipo carta (SIAE Fiscal Card)
  cardSerialNumber: varchar("card_serial_number", { length: 50 }), // Seriale carta
  // Stato sessione
  status: varchar("status", { length: 20 }).notNull().default('connected'), // connected, disconnected, error, card_removed
  // Contatori sessione
  ticketsEmittedCount: integer("tickets_emitted_count").notNull().default(0),
  sealsUsedCount: integer("seals_used_count").notNull().default(0),
  // Utente e postazione
  userId: varchar("user_id").references(() => users.id),
  workstationId: varchar("workstation_id", { length: 100 }), // Identificativo postazione
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  // Timestamp
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
  // Errori
  lastError: text("last_error"),
  errorCount: integer("error_count").notNull().default(0),
});

export const siaeSmartCardSessionsRelations = relations(siaeSmartCardSessions, ({ one }) => ({
  user: one(users, {
    fields: [siaeSmartCardSessions.userId],
    references: [users.id],
  }),
}));

// ==================== Smart Card Seal Generation Log ====================
// Log dettagliato di ogni sigillo generato dalla smart card
export const siaeSmartCardSealLogs = pgTable("siae_smart_card_seal_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => siaeSmartCardSessions.id),
  fiscalSealId: varchar("fiscal_seal_id").references(() => siaeFiscalSeals.id),
  ticketId: varchar("ticket_id").references(() => siaeTickets.id),
  // Dettagli generazione
  sealCode: varchar("seal_code", { length: 16 }).notNull(),
  progressiveNumber: integer("progressive_number").notNull(),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('success'), // success, failed, cancelled
  errorMessage: text("error_message"),
  // Timing
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"), // Tempo di generazione in millisecondi
});

export const siaeSmartCardSealLogsRelations = relations(siaeSmartCardSealLogs, ({ one }) => ({
  session: one(siaeSmartCardSessions, {
    fields: [siaeSmartCardSealLogs.sessionId],
    references: [siaeSmartCardSessions.id],
  }),
  fiscalSeal: one(siaeFiscalSeals, {
    fields: [siaeSmartCardSealLogs.fiscalSealId],
    references: [siaeFiscalSeals.id],
  }),
  ticket: one(siaeTickets, {
    fields: [siaeSmartCardSealLogs.ticketId],
    references: [siaeTickets.id],
  }),
}));

// ==================== Customer Wallet ====================
export const siaeCustomerWallets = pgTable("siae_customer_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => siaeCustomers.id).unique(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default('0'),
  currency: varchar("currency", { length: 3 }).notNull().default('EUR'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeCustomerWalletsRelations = relations(siaeCustomerWallets, ({ one, many }) => ({
  customer: one(siaeCustomers, {
    fields: [siaeCustomerWallets.customerId],
    references: [siaeCustomers.id],
  }),
  transactions: many(siaeWalletTransactions),
}));

// Wallet Transactions
export const siaeWalletTransactions = pgTable("siae_wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => siaeCustomerWallets.id),
  customerId: varchar("customer_id").notNull().references(() => siaeCustomers.id),
  type: varchar("type", { length: 20 }).notNull(), // credit, debit, hold, release, refund
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  // Riferimenti opzionali
  ticketId: varchar("ticket_id").references(() => siaeTickets.id),
  transactionId: varchar("transaction_id").references(() => siaeTransactions.id),
  resaleId: varchar("resale_id").references(() => siaeResales.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  // Metadati
  status: varchar("status", { length: 20 }).notNull().default('completed'), // pending, completed, failed, cancelled
  metadata: text("metadata"), // JSON per dati aggiuntivi
  createdAt: timestamp("created_at").defaultNow(),
});

export const siaeWalletTransactionsRelations = relations(siaeWalletTransactions, ({ one }) => ({
  wallet: one(siaeCustomerWallets, {
    fields: [siaeWalletTransactions.walletId],
    references: [siaeCustomerWallets.id],
  }),
  customer: one(siaeCustomers, {
    fields: [siaeWalletTransactions.customerId],
    references: [siaeCustomers.id],
  }),
  ticket: one(siaeTickets, {
    fields: [siaeWalletTransactions.ticketId],
    references: [siaeTickets.id],
  }),
  transaction: one(siaeTransactions, {
    fields: [siaeWalletTransactions.transactionId],
    references: [siaeTransactions.id],
  }),
  resale: one(siaeResales, {
    fields: [siaeWalletTransactions.resaleId],
    references: [siaeResales.id],
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

export const insertCompanyFeaturesSchema = createInsertSchema(companyFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCompanyFeaturesSchema = createInsertSchema(companyFeatures).omit({
  id: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertUserFeaturesSchema = createInsertSchema(userFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserFeaturesSchema = createInsertSchema(userFeatures).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventFormatSchema = createInsertSchema(eventFormats).omit({
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
    // NOTE: interval/count/endDate validation is handled in backend
    // to allow different requirements for manual vs automatic date selection
  }
  return true;
}, {
  message: "Eventi ricorrenti richiedono pattern valido",
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
  type: z.enum(['LOAD', 'UNLOAD', 'TRANSFER', 'CONSUME', 'RETURN', 'ADJUSTMENT', 'DIRECT_LOAD', 'DIRECT_CONSUME']),
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

export type CompanyFeatures = typeof companyFeatures.$inferSelect;
export type InsertCompanyFeatures = z.infer<typeof insertCompanyFeaturesSchema>;
export type UpdateCompanyFeatures = z.infer<typeof updateCompanyFeaturesSchema>;

export type UserFeatures = typeof userFeatures.$inferSelect;
export type InsertUserFeatures = z.infer<typeof insertUserFeaturesSchema>;
export type UpdateUserFeatures = z.infer<typeof updateUserFeaturesSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type EventFormat = typeof eventFormats.$inferSelect;
export type InsertEventFormat = z.infer<typeof insertEventFormatSchema>;

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

// ==================== MODULO CONTABILITÀ - Schemas ====================

export const insertFixedCostSchema = createInsertSchema(fixedCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  validFrom: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  validTo: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const updateFixedCostSchema = insertFixedCostSchema.partial().omit({ companyId: true });

export const insertExtraCostSchema = createInsertSchema(extraCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  invoiceDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const updateExtraCostSchema = insertExtraCostSchema.partial().omit({ companyId: true });

export const insertMaintenanceSchema = createInsertSchema(maintenances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  scheduledDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  completedDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const updateMaintenanceSchema = insertMaintenanceSchema.partial().omit({ companyId: true });

export const insertAccountingDocumentSchema = createInsertSchema(accountingDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  issueDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  dueDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const updateAccountingDocumentSchema = insertAccountingDocumentSchema.partial().omit({ companyId: true });

// ==================== MODULO PERSONALE - Schemas ====================

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  hourlyRate: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  fixedRate: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
});

export const updateStaffSchema = insertStaffSchema.partial().omit({ companyId: true });

export const insertStaffAssignmentSchema = createInsertSchema(staffAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledStart: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  scheduledEnd: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  actualStart: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  actualEnd: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  compensationAmount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  bonus: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
});

export const updateStaffAssignmentSchema = insertStaffAssignmentSchema.partial().omit({ companyId: true, eventId: true, staffId: true });

export const insertStaffPaymentSchema = createInsertSchema(staffPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  paymentDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const updateStaffPaymentSchema = insertStaffPaymentSchema.partial().omit({ companyId: true, staffId: true });

// ==================== MODULO CASSA - Schemas ====================

export const insertCashSectorSchema = createInsertSchema(cashSectors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCashSectorSchema = insertCashSectorSchema.partial().omit({ companyId: true });

export const insertCashPositionSchema = createInsertSchema(cashPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCashPositionSchema = insertCashPositionSchema.partial().omit({ companyId: true, eventId: true });

export const insertCashEntrySchema = createInsertSchema(cashEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  quantity: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  unitPrice: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalAmount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  entryTime: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : new Date()
  ).optional(),
});

export const updateCashEntrySchema = insertCashEntrySchema.partial().omit({ companyId: true, eventId: true, positionId: true });

export const insertCashFundSchema = createInsertSchema(cashFunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  expectedAmount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  difference: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  recordedAt: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : new Date()
  ).optional(),
});

export const updateCashFundSchema = insertCashFundSchema.partial().omit({ companyId: true, eventId: true, positionId: true });

// ==================== MODULO CONTABILITÀ - Types ====================

export type FixedCost = typeof fixedCosts.$inferSelect;
export type InsertFixedCost = z.infer<typeof insertFixedCostSchema>;
export type UpdateFixedCost = z.infer<typeof updateFixedCostSchema>;

export type ExtraCost = typeof extraCosts.$inferSelect;
export type InsertExtraCost = z.infer<typeof insertExtraCostSchema>;
export type UpdateExtraCost = z.infer<typeof updateExtraCostSchema>;

export type Maintenance = typeof maintenances.$inferSelect;
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type UpdateMaintenance = z.infer<typeof updateMaintenanceSchema>;

export type AccountingDocument = typeof accountingDocuments.$inferSelect;
export type InsertAccountingDocument = z.infer<typeof insertAccountingDocumentSchema>;
export type UpdateAccountingDocument = z.infer<typeof updateAccountingDocumentSchema>;

// ==================== MODULO PERSONALE - Types ====================

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type UpdateStaff = z.infer<typeof updateStaffSchema>;

export type StaffAssignment = typeof staffAssignments.$inferSelect;
export type InsertStaffAssignment = z.infer<typeof insertStaffAssignmentSchema>;
export type UpdateStaffAssignment = z.infer<typeof updateStaffAssignmentSchema>;

export type StaffPayment = typeof staffPayments.$inferSelect;
export type InsertStaffPayment = z.infer<typeof insertStaffPaymentSchema>;
export type UpdateStaffPayment = z.infer<typeof updateStaffPaymentSchema>;

// ==================== MODULO CASSA - Types ====================

export type CashSector = typeof cashSectors.$inferSelect;
export type InsertCashSector = z.infer<typeof insertCashSectorSchema>;
export type UpdateCashSector = z.infer<typeof updateCashSectorSchema>;

export type CashPosition = typeof cashPositions.$inferSelect;
export type InsertCashPosition = z.infer<typeof insertCashPositionSchema>;
export type UpdateCashPosition = z.infer<typeof updateCashPositionSchema>;

export type CashEntry = typeof cashEntries.$inferSelect;
export type InsertCashEntry = z.infer<typeof insertCashEntrySchema>;
export type UpdateCashEntry = z.infer<typeof updateCashEntrySchema>;

export type CashFund = typeof cashFunds.$inferSelect;
export type InsertCashFund = z.infer<typeof insertCashFundSchema>;
export type UpdateCashFund = z.infer<typeof updateCashFundSchema>;

// ==================== MODULO FILE DELLA SERATA - Schemas & Types ====================

export const insertNightFileSchema = createInsertSchema(nightFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  generatedAt: true,
}).extend({
  totalFixedCosts: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalExtraCosts: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalMaintenances: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalStaffCosts: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalCashRevenue: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalCardRevenue: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalOnlineRevenue: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalCreditsRevenue: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalRevenue: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalExpenses: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  netResult: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  openingFund: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  closingFund: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  fundDifference: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  approvedAt: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const updateNightFileSchema = insertNightFileSchema.partial();

export type NightFile = typeof nightFiles.$inferSelect;
export type InsertNightFile = z.infer<typeof insertNightFileSchema>;
export type UpdateNightFile = z.infer<typeof updateNightFileSchema>;

// ==================== MODULO BIGLIETTERIA SIAE - Schemas ====================

// TAB.1 - Generi Evento
export const insertSiaeEventGenreSchema = createInsertSchema(siaeEventGenres).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeEventGenreSchema = insertSiaeEventGenreSchema.partial();

// TAB.2 - Ordini di Posto
export const insertSiaeSectorCodeSchema = createInsertSchema(siaeSectorCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeSectorCodeSchema = insertSiaeSectorCodeSchema.partial();

// TAB.3 - Tipi Titolo
export const insertSiaeTicketTypeSchema = createInsertSchema(siaeTicketTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeTicketTypeSchema = insertSiaeTicketTypeSchema.partial();

// TAB.4 - Prestazioni Complementari
export const insertSiaeServiceCodeSchema = createInsertSchema(siaeServiceCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeServiceCodeSchema = insertSiaeServiceCodeSchema.partial();

// TAB.5 - Causali Annullamento
export const insertSiaeCancellationReasonSchema = createInsertSchema(siaeCancellationReasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeCancellationReasonSchema = insertSiaeCancellationReasonSchema.partial();

// Carte di Attivazione
export const insertSiaeActivationCardSchema = createInsertSchema(siaeActivationCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  activationDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  expirationDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  certificateExpiration: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});
export const updateSiaeActivationCardSchema = insertSiaeActivationCardSchema.partial().omit({ companyId: true });

// Codici Canale Emissione
export const insertSiaeEmissionChannelSchema = createInsertSchema(siaeEmissionChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeEmissionChannelSchema = insertSiaeEmissionChannelSchema.partial().omit({ companyId: true });

// Configurazione Sistema
export const insertSiaeSystemConfigSchema = createInsertSchema(siaeSystemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeSystemConfigSchema = insertSiaeSystemConfigSchema.partial().omit({ companyId: true });

// Clienti
export const insertSiaeCustomerSchema = createInsertSchema(siaeCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  birthDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});
export const updateSiaeCustomerSchema = insertSiaeCustomerSchema.partial();

// OTP Attempts
export const insertSiaeOtpAttemptSchema = createInsertSchema(siaeOtpAttempts).omit({
  id: true,
  createdAt: true,
}).extend({
  expiresAt: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// Eventi Biglietteria
export const insertSiaeTicketedEventSchema = createInsertSchema(siaeTicketedEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  saleStartDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
  saleEndDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});
export const updateSiaeTicketedEventSchema = insertSiaeTicketedEventSchema.partial().omit({ eventId: true, companyId: true });

// Settori Evento
export const insertSiaeEventSectorSchema = createInsertSchema(siaeEventSectors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  priceIntero: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  priceRidotto: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
});
export const updateSiaeEventSectorSchema = insertSiaeEventSectorSchema.partial().omit({ ticketedEventId: true });

// Posti Numerati
export const insertSiaeSeatSchema = createInsertSchema(siaeSeats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeSeatSchema = insertSiaeSeatSchema.partial().omit({ sectorId: true });

// Sigilli Fiscali
export const insertSiaeFiscalSealSchema = createInsertSchema(siaeFiscalSeals).omit({
  id: true,
  createdAt: true,
});

// Biglietti
export const insertSiaeTicketSchema = createInsertSchema(siaeTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  emissionDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  grossAmount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  netAmount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  vatAmount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
});
export const updateSiaeTicketSchema = insertSiaeTicketSchema.partial().omit({ ticketedEventId: true, sectorId: true });

// Transazioni
export const insertSiaeTransactionSchema = createInsertSchema(siaeTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalAmount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});
export const updateSiaeTransactionSchema = insertSiaeTransactionSchema.partial().omit({ ticketedEventId: true, customerId: true });

// Cambio Nominativo
export const insertSiaeNameChangeSchema = createInsertSchema(siaeNameChanges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeNameChangeSchema = insertSiaeNameChangeSchema.partial().omit({ originalTicketId: true });

// Rimessa in Vendita
export const insertSiaeResaleSchema = createInsertSchema(siaeResales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  originalPrice: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  resalePrice: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});
export const updateSiaeResaleSchema = insertSiaeResaleSchema.partial().omit({ originalTicketId: true, sellerId: true });

// Log SIAE
export const insertSiaeLogSchema = createInsertSchema(siaeLogs).omit({
  id: true,
  createdAt: true,
});

// Trasmissioni SIAE
export const insertSiaeTransmissionSchema = createInsertSchema(siaeTransmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  periodDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});
export const updateSiaeTransmissionSchema = insertSiaeTransmissionSchema.partial().omit({ companyId: true });

// Box Office Sessions
export const insertSiaeBoxOfficeSessionSchema = createInsertSchema(siaeBoxOfficeSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeBoxOfficeSessionSchema = insertSiaeBoxOfficeSessionSchema.partial().omit({ userId: true, emissionChannelId: true });

// Abbonamenti
export const insertSiaeSubscriptionSchema = createInsertSchema(siaeSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validFrom: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  validTo: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  totalAmount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});
export const updateSiaeSubscriptionSchema = insertSiaeSubscriptionSchema.partial().omit({ companyId: true, customerId: true });

// Audit Logs
export const insertSiaeAuditLogSchema = createInsertSchema(siaeAuditLogs).omit({
  id: true,
  createdAt: true,
});

// Posti Numerati
export const insertSiaeNumberedSeatSchema = createInsertSchema(siaeNumberedSeats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeNumberedSeatSchema = insertSiaeNumberedSeatSchema.partial().omit({ sectorId: true });

// Smart Card Sessions
export const insertSiaeSmartCardSessionSchema = createInsertSchema(siaeSmartCardSessions).omit({
  id: true,
  connectedAt: true,
});
export const updateSiaeSmartCardSessionSchema = insertSiaeSmartCardSessionSchema.partial().omit({ readerId: true, readerName: true });

// Smart Card Seal Logs
export const insertSiaeSmartCardSealLogSchema = createInsertSchema(siaeSmartCardSealLogs).omit({
  id: true,
  requestedAt: true,
});

// Customer Wallet
export const insertSiaeCustomerWalletSchema = createInsertSchema(siaeCustomerWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeCustomerWalletSchema = insertSiaeCustomerWalletSchema.partial().omit({ customerId: true });

// Wallet Transactions
export const insertSiaeWalletTransactionSchema = createInsertSchema(siaeWalletTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  balanceAfter: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});

// ==================== MODULO BIGLIETTERIA SIAE - Types ====================

// TAB.1-5
export type SiaeEventGenre = typeof siaeEventGenres.$inferSelect;
export type InsertSiaeEventGenre = z.infer<typeof insertSiaeEventGenreSchema>;
export type UpdateSiaeEventGenre = z.infer<typeof updateSiaeEventGenreSchema>;

export type SiaeSectorCode = typeof siaeSectorCodes.$inferSelect;
export type InsertSiaeSectorCode = z.infer<typeof insertSiaeSectorCodeSchema>;
export type UpdateSiaeSectorCode = z.infer<typeof updateSiaeSectorCodeSchema>;

export type SiaeTicketType = typeof siaeTicketTypes.$inferSelect;
export type InsertSiaeTicketType = z.infer<typeof insertSiaeTicketTypeSchema>;
export type UpdateSiaeTicketType = z.infer<typeof updateSiaeTicketTypeSchema>;

export type SiaeServiceCode = typeof siaeServiceCodes.$inferSelect;
export type InsertSiaeServiceCode = z.infer<typeof insertSiaeServiceCodeSchema>;
export type UpdateSiaeServiceCode = z.infer<typeof updateSiaeServiceCodeSchema>;

export type SiaeCancellationReason = typeof siaeCancellationReasons.$inferSelect;
export type InsertSiaeCancellationReason = z.infer<typeof insertSiaeCancellationReasonSchema>;
export type UpdateSiaeCancellationReason = z.infer<typeof updateSiaeCancellationReasonSchema>;

// Carte e Canali
export type SiaeActivationCard = typeof siaeActivationCards.$inferSelect;
export type InsertSiaeActivationCard = z.infer<typeof insertSiaeActivationCardSchema>;
export type UpdateSiaeActivationCard = z.infer<typeof updateSiaeActivationCardSchema>;

export type SiaeEmissionChannel = typeof siaeEmissionChannels.$inferSelect;
export type InsertSiaeEmissionChannel = z.infer<typeof insertSiaeEmissionChannelSchema>;
export type UpdateSiaeEmissionChannel = z.infer<typeof updateSiaeEmissionChannelSchema>;

// Configurazione
export type SiaeSystemConfig = typeof siaeSystemConfig.$inferSelect;
export type InsertSiaeSystemConfig = z.infer<typeof insertSiaeSystemConfigSchema>;
export type UpdateSiaeSystemConfig = z.infer<typeof updateSiaeSystemConfigSchema>;

// Clienti
export type SiaeCustomer = typeof siaeCustomers.$inferSelect;
export type InsertSiaeCustomer = z.infer<typeof insertSiaeCustomerSchema>;
export type UpdateSiaeCustomer = z.infer<typeof updateSiaeCustomerSchema>;

export type SiaeOtpAttempt = typeof siaeOtpAttempts.$inferSelect;
export type InsertSiaeOtpAttempt = z.infer<typeof insertSiaeOtpAttemptSchema>;

// Eventi e Settori
export type SiaeTicketedEvent = typeof siaeTicketedEvents.$inferSelect;
export type InsertSiaeTicketedEvent = z.infer<typeof insertSiaeTicketedEventSchema>;
export type UpdateSiaeTicketedEvent = z.infer<typeof updateSiaeTicketedEventSchema>;

export type SiaeEventSector = typeof siaeEventSectors.$inferSelect;
export type InsertSiaeEventSector = z.infer<typeof insertSiaeEventSectorSchema>;
export type UpdateSiaeEventSector = z.infer<typeof updateSiaeEventSectorSchema>;

export type SiaeSeat = typeof siaeSeats.$inferSelect;
export type InsertSiaeSeat = z.infer<typeof insertSiaeSeatSchema>;
export type UpdateSiaeSeat = z.infer<typeof updateSiaeSeatSchema>;

// Sigilli e Biglietti
export type SiaeFiscalSeal = typeof siaeFiscalSeals.$inferSelect;
export type InsertSiaeFiscalSeal = z.infer<typeof insertSiaeFiscalSealSchema>;

export type SiaeTicket = typeof siaeTickets.$inferSelect;
export type InsertSiaeTicket = z.infer<typeof insertSiaeTicketSchema>;
export type UpdateSiaeTicket = z.infer<typeof updateSiaeTicketSchema>;

// Transazioni
export type SiaeTransaction = typeof siaeTransactions.$inferSelect;
export type InsertSiaeTransaction = z.infer<typeof insertSiaeTransactionSchema>;
export type UpdateSiaeTransaction = z.infer<typeof updateSiaeTransactionSchema>;

// Cambio Nominativo e Rimessa
export type SiaeNameChange = typeof siaeNameChanges.$inferSelect;
export type InsertSiaeNameChange = z.infer<typeof insertSiaeNameChangeSchema>;
export type UpdateSiaeNameChange = z.infer<typeof updateSiaeNameChangeSchema>;

export type SiaeResale = typeof siaeResales.$inferSelect;
export type InsertSiaeResale = z.infer<typeof insertSiaeResaleSchema>;
export type UpdateSiaeResale = z.infer<typeof updateSiaeResaleSchema>;

// Log e Trasmissioni
export type SiaeLog = typeof siaeLogs.$inferSelect;
export type InsertSiaeLog = z.infer<typeof insertSiaeLogSchema>;

export type SiaeTransmission = typeof siaeTransmissions.$inferSelect;
export type InsertSiaeTransmission = z.infer<typeof insertSiaeTransmissionSchema>;
export type UpdateSiaeTransmission = z.infer<typeof updateSiaeTransmissionSchema>;

// Box Office
export type SiaeBoxOfficeSession = typeof siaeBoxOfficeSessions.$inferSelect;
export type InsertSiaeBoxOfficeSession = z.infer<typeof insertSiaeBoxOfficeSessionSchema>;
export type UpdateSiaeBoxOfficeSession = z.infer<typeof updateSiaeBoxOfficeSessionSchema>;

// Abbonamenti
export type SiaeSubscription = typeof siaeSubscriptions.$inferSelect;
export type InsertSiaeSubscription = z.infer<typeof insertSiaeSubscriptionSchema>;
export type UpdateSiaeSubscription = z.infer<typeof updateSiaeSubscriptionSchema>;

// Audit Logs
export type SiaeAuditLog = typeof siaeAuditLogs.$inferSelect;
export type InsertSiaeAuditLog = z.infer<typeof insertSiaeAuditLogSchema>;

// Posti Numerati
export type SiaeNumberedSeat = typeof siaeNumberedSeats.$inferSelect;
export type InsertSiaeNumberedSeat = z.infer<typeof insertSiaeNumberedSeatSchema>;
export type UpdateSiaeNumberedSeat = z.infer<typeof updateSiaeNumberedSeatSchema>;

// Smart Card Sessions
export type SiaeSmartCardSession = typeof siaeSmartCardSessions.$inferSelect;
export type InsertSiaeSmartCardSession = z.infer<typeof insertSiaeSmartCardSessionSchema>;
export type UpdateSiaeSmartCardSession = z.infer<typeof updateSiaeSmartCardSessionSchema>;

// Smart Card Seal Logs
export type SiaeSmartCardSealLog = typeof siaeSmartCardSealLogs.$inferSelect;
export type InsertSiaeSmartCardSealLog = z.infer<typeof insertSiaeSmartCardSealLogSchema>;

// Customer Wallet
export type SiaeCustomerWallet = typeof siaeCustomerWallets.$inferSelect;
export type InsertSiaeCustomerWallet = z.infer<typeof insertSiaeCustomerWalletSchema>;
export type UpdateSiaeCustomerWallet = z.infer<typeof updateSiaeCustomerWalletSchema>;

export type SiaeWalletTransaction = typeof siaeWalletTransactions.$inferSelect;
export type InsertSiaeWalletTransaction = z.infer<typeof insertSiaeWalletTransactionSchema>;

// ==================== PORTALE PUBBLICO ACQUISTO BIGLIETTI ====================

// Carrello - memorizza gli articoli selezionati dal cliente
export const publicCartItems = pgTable("public_cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 100 }).notNull(), // Browser session ID (cookie)
  customerId: varchar("customer_id").references(() => siaeCustomers.id), // Optional se già loggato
  ticketedEventId: varchar("ticketed_event_id").notNull().references(() => siaeTicketedEvents.id),
  sectorId: varchar("sector_id").notNull().references(() => siaeEventSectors.id),
  seatId: varchar("seat_id").references(() => siaeSeats.id), // Per posti numerati
  quantity: integer("quantity").notNull().default(1), // Per posti non numerati
  ticketType: varchar("ticket_type", { length: 20 }).notNull().default('intero'), // intero, ridotto, omaggio
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  participantFirstName: varchar("participant_first_name", { length: 100 }), // Nominatività
  participantLastName: varchar("participant_last_name", { length: 100 }),
  reservedUntil: timestamp("reserved_until"), // TTL per blocco posto
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const publicCartItemsRelations = relations(publicCartItems, ({ one }) => ({
  customer: one(siaeCustomers, {
    fields: [publicCartItems.customerId],
    references: [siaeCustomers.id],
  }),
  ticketedEvent: one(siaeTicketedEvents, {
    fields: [publicCartItems.ticketedEventId],
    references: [siaeTicketedEvents.id],
  }),
  sector: one(siaeEventSectors, {
    fields: [publicCartItems.sectorId],
    references: [siaeEventSectors.id],
  }),
  seat: one(siaeSeats, {
    fields: [publicCartItems.seatId],
    references: [siaeSeats.id],
  }),
}));

// Sessioni Checkout - per pagamenti Stripe
export const publicCheckoutSessions = pgTable("public_checkout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  customerId: varchar("customer_id").notNull().references(() => siaeCustomers.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeClientSecret: varchar("stripe_client_secret", { length: 500 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('EUR'),
  status: varchar("status", { length: 30 }).notNull().default('pending'), // pending, processing, completed, failed, expired, refunded, refund_pending
  cartSnapshot: jsonb("cart_snapshot"), // Snapshot carrello al momento del checkout
  transactionId: varchar("transaction_id").references(() => siaeTransactions.id), // Dopo completamento
  refundId: varchar("refund_id", { length: 255 }), // Stripe refund ID se stornato
  refundReason: text("refund_reason"), // Motivo dello storno
  customerIp: varchar("customer_ip", { length: 45 }),
  customerUserAgent: text("customer_user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const publicCheckoutSessionsRelations = relations(publicCheckoutSessions, ({ one }) => ({
  customer: one(siaeCustomers, {
    fields: [publicCheckoutSessions.customerId],
    references: [siaeCustomers.id],
  }),
  transaction: one(siaeTransactions, {
    fields: [publicCheckoutSessions.transactionId],
    references: [siaeTransactions.id],
  }),
}));

// Sessioni Cliente Pubblico - per autenticazione cliente
export const publicCustomerSessions = pgTable("public_customer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => siaeCustomers.id),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const publicCustomerSessionsRelations = relations(publicCustomerSessions, ({ one }) => ({
  customer: one(siaeCustomers, {
    fields: [publicCustomerSessions.customerId],
    references: [siaeCustomers.id],
  }),
}));

// Schemas per validazione
export const insertPublicCartItemSchema = createInsertSchema(publicCartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unitPrice: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  reservedUntil: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const insertPublicCheckoutSessionSchema = createInsertSchema(publicCheckoutSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalAmount: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  expiresAt: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  completedAt: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : null
  ).optional(),
});

export const insertPublicCustomerSessionSchema = createInsertSchema(publicCustomerSessions).omit({
  id: true,
  createdAt: true,
}).extend({
  expiresAt: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// Types
export type PublicCartItem = typeof publicCartItems.$inferSelect;
export type InsertPublicCartItem = z.infer<typeof insertPublicCartItemSchema>;

export type PublicCheckoutSession = typeof publicCheckoutSessions.$inferSelect;
export type InsertPublicCheckoutSession = z.infer<typeof insertPublicCheckoutSessionSchema>;

export type PublicCustomerSession = typeof publicCustomerSessions.$inferSelect;
export type InsertPublicCustomerSession = z.infer<typeof insertPublicCustomerSessionSchema>;

// ==================== MODULO GESTORE/PR/LISTE ====================

// Abilitazioni Staff per Evento - Chi può operare su quale evento
export const eventStaffAssignments = pgTable("event_staff_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 50 }).notNull(), // gestore_covisione, capo_staff, pr
  assignedByUserId: varchar("assigned_by_user_id").notNull().references(() => users.id),
  permissions: text("permissions").array().default(sql`ARRAY[]::text[]`), // gestione_liste, gestione_tavoli, check_in, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventStaffAssignmentsRelations = relations(eventStaffAssignments, ({ one }) => ({
  event: one(events, {
    fields: [eventStaffAssignments.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventStaffAssignments.userId],
    references: [users.id],
  }),
  assignedByUser: one(users, {
    fields: [eventStaffAssignments.assignedByUserId],
    references: [users.id],
  }),
}));

// Planimetrie Evento - Immagine della sala con posizioni tavoli
export const eventFloorplans = pgTable("event_floorplans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url").notNull(),
  width: integer("width"), // Larghezza immagine in pixel
  height: integer("height"), // Altezza immagine in pixel
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventFloorplansRelations = relations(eventFloorplans, ({ one, many }) => ({
  event: one(events, {
    fields: [eventFloorplans.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [eventFloorplans.companyId],
    references: [companies.id],
  }),
  tables: many(eventTables),
}));

// Tavoli Evento - Posizionati sulla planimetria
export const eventTables = pgTable("event_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  floorplanId: varchar("floorplan_id").references(() => eventFloorplans.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 100 }).notNull(), // Es: "Tavolo 1", "VIP 3"
  tableType: varchar("table_type", { length: 50 }).notNull().default('standard'), // standard, vip, prive
  capacity: integer("capacity").notNull().default(4),
  minSpend: decimal("min_spend", { precision: 10, scale: 2 }), // Spesa minima (cambusa)
  // Posizione sulla planimetria
  positionX: integer("position_x"),
  positionY: integer("position_y"),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('available'), // available, reserved, occupied, blocked
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventTablesRelations = relations(eventTables, ({ one, many }) => ({
  event: one(events, {
    fields: [eventTables.eventId],
    references: [events.id],
  }),
  floorplan: one(eventFloorplans, {
    fields: [eventTables.floorplanId],
    references: [eventFloorplans.id],
  }),
  company: one(companies, {
    fields: [eventTables.companyId],
    references: [companies.id],
  }),
  bookings: many(tableBookings),
}));

// Prenotazioni Tavoli - Con QR univoco
export const tableBookings = pgTable("table_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: varchar("table_id").notNull().references(() => eventTables.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // Chi ha prenotato
  bookedByUserId: varchar("booked_by_user_id").references(() => users.id), // PR che ha prenotato
  customerId: varchar("customer_id").references(() => siaeCustomers.id), // Cliente intestatario
  // Dati cliente (se non registrato)
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  // Ospiti al tavolo
  guestsCount: integer("guests_count").notNull().default(1),
  guestNames: text("guest_names").array().default(sql`ARRAY[]::text[]`),
  // QR Code univoco per questa prenotazione
  qrCode: varchar("qr_code", { length: 100 }).notNull().unique(),
  qrScannedAt: timestamp("qr_scanned_at"), // Quando è stato usato all'ingresso
  qrScannedByUserId: varchar("qr_scanned_by_user_id").references(() => users.id),
  // Pagamento cambusa
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default('pending'), // pending, partial, paid
  // Stato prenotazione
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, confirmed, arrived, completed, cancelled, no_show
  confirmedAt: timestamp("confirmed_at"),
  arrivedAt: timestamp("arrived_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tableBookingsRelations = relations(tableBookings, ({ one }) => ({
  table: one(eventTables, {
    fields: [tableBookings.tableId],
    references: [eventTables.id],
  }),
  event: one(events, {
    fields: [tableBookings.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [tableBookings.companyId],
    references: [companies.id],
  }),
  bookedByUser: one(users, {
    fields: [tableBookings.bookedByUserId],
    references: [users.id],
  }),
  customer: one(siaeCustomers, {
    fields: [tableBookings.customerId],
    references: [siaeCustomers.id],
  }),
}));

// Liste Ospiti - Con QR univoco per ogni voce
export const guestLists = pgTable("guest_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(), // Es: "Lista PR Mario", "Lista VIP"
  listType: varchar("list_type", { length: 50 }).notNull().default('standard'), // standard, vip, staff, press
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id), // Gestore o PR
  // Limiti
  maxGuests: integer("max_guests"), // Limite massimo ospiti
  currentCount: integer("current_count").notNull().default(0),
  // Stato
  isActive: boolean("is_active").notNull().default(true),
  closedAt: timestamp("closed_at"), // Quando la lista è stata chiusa
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const guestListsRelations = relations(guestLists, ({ one, many }) => ({
  event: one(events, {
    fields: [guestLists.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [guestLists.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [guestLists.createdByUserId],
    references: [users.id],
  }),
  entries: many(guestListEntries),
}));

// Voci Lista Ospiti - Ogni ospite con QR univoco
export const guestListEntries = pgTable("guest_list_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestListId: varchar("guest_list_id").notNull().references(() => guestLists.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  // Chi ha inserito
  addedByUserId: varchar("added_by_user_id").notNull().references(() => users.id), // PR che ha inserito
  // Cliente (se registrato)
  customerId: varchar("customer_id").references(() => siaeCustomers.id),
  // Dati ospite
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  // Accompagnatori
  plusOnes: integer("plus_ones").notNull().default(0), // Numero accompagnatori
  plusOnesNames: text("plus_ones_names").array().default(sql`ARRAY[]::text[]`),
  // QR Code univoco per questa voce lista
  qrCode: varchar("qr_code", { length: 100 }).notNull().unique(),
  qrScannedAt: timestamp("qr_scanned_at"), // Quando è stato usato all'ingresso
  qrScannedByUserId: varchar("qr_scanned_by_user_id").references(() => users.id),
  // Biglietto SIAE collegato (se acquistato)
  ticketId: varchar("ticket_id").references(() => siaeTickets.id),
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, confirmed, arrived, cancelled, no_show
  confirmedAt: timestamp("confirmed_at"),
  arrivedAt: timestamp("arrived_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const guestListEntriesRelations = relations(guestListEntries, ({ one }) => ({
  guestList: one(guestLists, {
    fields: [guestListEntries.guestListId],
    references: [guestLists.id],
  }),
  event: one(events, {
    fields: [guestListEntries.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [guestListEntries.companyId],
    references: [companies.id],
  }),
  addedByUser: one(users, {
    fields: [guestListEntries.addedByUserId],
    references: [users.id],
  }),
  customer: one(siaeCustomers, {
    fields: [guestListEntries.customerId],
    references: [siaeCustomers.id],
  }),
  ticket: one(siaeTickets, {
    fields: [guestListEntries.ticketId],
    references: [siaeTickets.id],
  }),
}));

// OTP per login PR via telefono
export const prOtpAttempts = pgTable("pr_otp_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  phone: varchar("phone", { length: 20 }).notNull(),
  otpCode: varchar("otp_code", { length: 10 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull(), // login, phone_verify
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, verified, expired, failed
  attemptsCount: integer("attempts_count").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const prOtpAttemptsRelations = relations(prOtpAttempts, ({ one }) => ({
  user: one(users, {
    fields: [prOtpAttempts.userId],
    references: [users.id],
  }),
}));

// ==================== SCHEMAS MODULO GESTORE/PR/LISTE ====================

export const insertEventStaffAssignmentSchema = createInsertSchema(eventStaffAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateEventStaffAssignmentSchema = insertEventStaffAssignmentSchema.partial().omit({ eventId: true, userId: true });

export const insertEventFloorplanSchema = createInsertSchema(eventFloorplans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateEventFloorplanSchema = insertEventFloorplanSchema.partial().omit({ eventId: true, companyId: true });

export const insertEventTableSchema = createInsertSchema(eventTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  minSpend: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
});
export const updateEventTableSchema = insertEventTableSchema.partial().omit({ eventId: true, companyId: true });

export const insertTableBookingSchema = createInsertSchema(tableBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  depositAmount: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
  totalSpent: z.union([z.string(), z.coerce.number(), z.null(), z.undefined()]).transform(val => 
    val === null || val === undefined ? null : typeof val === 'number' ? val.toString() : val
  ).optional(),
});
export const updateTableBookingSchema = insertTableBookingSchema.partial().omit({ tableId: true, eventId: true, companyId: true });

export const insertGuestListSchema = createInsertSchema(guestLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateGuestListSchema = insertGuestListSchema.partial().omit({ eventId: true, companyId: true });

export const insertGuestListEntrySchema = createInsertSchema(guestListEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateGuestListEntrySchema = insertGuestListEntrySchema.partial().omit({ guestListId: true, eventId: true, companyId: true });

export const insertPrOtpAttemptSchema = createInsertSchema(prOtpAttempts).omit({
  id: true,
  createdAt: true,
}).extend({
  expiresAt: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// ==================== TYPES MODULO GESTORE/PR/LISTE ====================

export type EventStaffAssignment = typeof eventStaffAssignments.$inferSelect;
export type InsertEventStaffAssignment = z.infer<typeof insertEventStaffAssignmentSchema>;
export type UpdateEventStaffAssignment = z.infer<typeof updateEventStaffAssignmentSchema>;

export type EventFloorplan = typeof eventFloorplans.$inferSelect;
export type InsertEventFloorplan = z.infer<typeof insertEventFloorplanSchema>;
export type UpdateEventFloorplan = z.infer<typeof updateEventFloorplanSchema>;

export type EventTable = typeof eventTables.$inferSelect;
export type InsertEventTable = z.infer<typeof insertEventTableSchema>;
export type UpdateEventTable = z.infer<typeof updateEventTableSchema>;

export type TableBooking = typeof tableBookings.$inferSelect;
export type InsertTableBooking = z.infer<typeof insertTableBookingSchema>;
export type UpdateTableBooking = z.infer<typeof updateTableBookingSchema>;

export type GuestList = typeof guestLists.$inferSelect;
export type InsertGuestList = z.infer<typeof insertGuestListSchema>;
export type UpdateGuestList = z.infer<typeof updateGuestListSchema>;

export type GuestListEntry = typeof guestListEntries.$inferSelect;
export type InsertGuestListEntry = z.infer<typeof insertGuestListEntrySchema>;
export type UpdateGuestListEntry = z.infer<typeof updateGuestListEntrySchema>;

export type PrOtpAttempt = typeof prOtpAttempts.$inferSelect;
export type InsertPrOtpAttempt = z.infer<typeof insertPrOtpAttemptSchema>;

// ==================== SCHOOL BADGE SYSTEM ====================

// School Badge Landings - Created by organizers
export const schoolBadgeLandings = pgTable("school_badge_landings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  schoolName: varchar("school_name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL-friendly identifier
  logoUrl: text("logo_url"),
  description: text("description"),
  authorizedDomains: text("authorized_domains").array().default(sql`ARRAY[]::text[]`), // email domains
  primaryColor: varchar("primary_color", { length: 7 }).default('#3b82f6'),
  isActive: boolean("is_active").notNull().default(true),
  requirePhone: boolean("require_phone").notNull().default(true),
  customWelcomeText: text("custom_welcome_text"),
  customThankYouText: text("custom_thank_you_text"),
  // Policy fields
  termsText: text("terms_text"), // Custom terms and conditions text
  privacyText: text("privacy_text"), // Custom privacy policy text
  marketingText: text("marketing_text"), // Custom marketing consent text
  requireTerms: boolean("require_terms").notNull().default(true), // Require terms acceptance
  showMarketing: boolean("show_marketing").notNull().default(true), // Show marketing checkbox
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolBadgeLandingsRelations = relations(schoolBadgeLandings, ({ one, many }) => ({
  company: one(companies, {
    fields: [schoolBadgeLandings.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [schoolBadgeLandings.createdByUserId],
    references: [users.id],
  }),
  requests: many(schoolBadgeRequests),
}));

// School Badge Requests - From users
export const schoolBadgeRequests = pgTable("school_badge_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingId: varchar("landing_id").notNull().references(() => schoolBadgeLandings.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }).notNull(),
  verificationToken: varchar("verification_token", { length: 100 }),
  tokenExpiresAt: timestamp("token_expires_at"),
  status: varchar("status", { length: 30 }).notNull().default('pending'), // pending, verified, badge_generated, revoked
  verifiedAt: timestamp("verified_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  // Consent fields
  acceptedTerms: boolean("accepted_terms").notNull().default(false),
  acceptedMarketing: boolean("accepted_marketing").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolBadgeRequestsRelations = relations(schoolBadgeRequests, ({ one, many }) => ({
  landing: one(schoolBadgeLandings, {
    fields: [schoolBadgeRequests.landingId],
    references: [schoolBadgeLandings.id],
  }),
  badges: many(schoolBadges),
}));

// School Badges - Generated badges
export const schoolBadges = pgTable("school_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => schoolBadgeRequests.id),
  uniqueCode: varchar("unique_code", { length: 20 }).notNull().unique(), // Short code for QR
  qrCodeUrl: text("qr_code_url"),
  badgeImageUrl: text("badge_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schoolBadgesRelations = relations(schoolBadges, ({ one }) => ({
  request: one(schoolBadgeRequests, {
    fields: [schoolBadges.requestId],
    references: [schoolBadgeRequests.id],
  }),
}));

// ==================== SCHEMAS SCHOOL BADGE ====================

export const insertSchoolBadgeLandingSchema = createInsertSchema(schoolBadgeLandings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSchoolBadgeLandingSchema = insertSchoolBadgeLandingSchema.partial().omit({ companyId: true, createdByUserId: true });

export const insertSchoolBadgeRequestSchema = createInsertSchema(schoolBadgeRequests).omit({
  id: true,
  verificationToken: true,
  tokenExpiresAt: true,
  status: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchoolBadgeSchema = createInsertSchema(schoolBadges).omit({
  id: true,
  createdAt: true,
});

// ==================== TYPES SCHOOL BADGE ====================

export type SchoolBadgeLanding = typeof schoolBadgeLandings.$inferSelect;
export type InsertSchoolBadgeLanding = z.infer<typeof insertSchoolBadgeLandingSchema>;
export type UpdateSchoolBadgeLanding = z.infer<typeof updateSchoolBadgeLandingSchema>;

export type SchoolBadgeRequest = typeof schoolBadgeRequests.$inferSelect;
export type InsertSchoolBadgeRequest = z.infer<typeof insertSchoolBadgeRequestSchema>;

export type SchoolBadge = typeof schoolBadges.$inferSelect;
export type InsertSchoolBadge = z.infer<typeof insertSchoolBadgeSchema>;

// ==================== PRINTER MANAGEMENT SYSTEM ====================

// Printer Models - Supported printer hardware models (admin-managed)
export const printerModels = pgTable("printer_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendor: varchar("vendor", { length: 100 }).notNull(), // e.g., "X PRINTER", "Epson", "Zebra"
  model: varchar("model", { length: 100 }).notNull(), // e.g., "XP-420B", "TM-T20"
  dpi: integer("dpi").default(203), // Print resolution
  maxWidthMm: integer("max_width_mm").default(80), // Maximum paper width
  connectionType: varchar("connection_type", { length: 50 }).default('usb'), // usb, tcp, bluetooth
  driverNotes: text("driver_notes"), // Driver installation notes
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Printer Agents - Connected desktop apps (per-company, per-user)
export const printerAgents = pgTable("printer_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").references(() => users.id), // Owner of this agent
  deviceName: varchar("device_name", { length: 255 }).notNull(), // Computer name
  authToken: varchar("auth_token", { length: 128 }), // Hashed token for authentication
  printerModelId: varchar("printer_model_id").references(() => printerModels.id),
  printerName: varchar("printer_name", { length: 255 }), // OS printer name
  status: varchar("status", { length: 30 }).default('offline'), // online, offline, printing, error
  lastHeartbeat: timestamp("last_heartbeat"),
  capabilities: jsonb("capabilities"), // Paper sizes, features
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Printer Profiles - Paper/ticket configurations (per-company)
export const printerProfiles = pgTable("printer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  agentId: varchar("agent_id").references(() => printerAgents.id), // Optional: link profile to specific agent
  printerModelId: varchar("printer_model_id").references(() => printerModels.id),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Biglietto Standard", "Ingresso VIP"
  paperWidthMm: integer("paper_width_mm").notNull().default(80),
  paperHeightMm: integer("paper_height_mm").notNull().default(50),
  marginTopMm: integer("margin_top_mm").default(2),
  marginBottomMm: integer("margin_bottom_mm").default(2),
  marginLeftMm: integer("margin_left_mm").default(2),
  marginRightMm: integer("margin_right_mm").default(2),
  templateJson: jsonb("template_json"), // Layout template
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Print Jobs - Queue of print requests
export const printJobs = pgTable("print_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  agentId: varchar("agent_id").references(() => printerAgents.id),
  profileId: varchar("profile_id").references(() => printerProfiles.id),
  ticketId: varchar("ticket_id"), // Reference to SIAE ticket if applicable
  status: varchar("status", { length: 30 }).notNull().default('pending'), // pending, printing, completed, failed
  payload: jsonb("payload").notNull(), // Print data
  errorMessage: text("error_message"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  printedAt: timestamp("printed_at"),
});

// Cashier Sessions - Box office audit trail (normativa italiana)
export const cashierSessions = pgTable("cashier_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id), // Cassiere
  printerAgentId: varchar("printer_agent_id").references(() => printerAgents.id),
  status: varchar("status", { length: 30 }).notNull().default('active'), // active, closed
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  ticketsIssued: integer("tickets_issued").default(0),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default('0'),
  notes: text("notes"),
});

// Relations
export const printerModelsRelations = relations(printerModels, ({ many }) => ({
  agents: many(printerAgents),
  profiles: many(printerProfiles),
}));

export const printerAgentsRelations = relations(printerAgents, ({ one, many }) => ({
  company: one(companies, {
    fields: [printerAgents.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [printerAgents.userId],
    references: [users.id],
  }),
  model: one(printerModels, {
    fields: [printerAgents.printerModelId],
    references: [printerModels.id],
  }),
  jobs: many(printJobs),
  sessions: many(cashierSessions),
}));

export const printerProfilesRelations = relations(printerProfiles, ({ one }) => ({
  company: one(companies, {
    fields: [printerProfiles.companyId],
    references: [companies.id],
  }),
  model: one(printerModels, {
    fields: [printerProfiles.printerModelId],
    references: [printerModels.id],
  }),
}));

export const printJobsRelations = relations(printJobs, ({ one }) => ({
  company: one(companies, {
    fields: [printJobs.companyId],
    references: [companies.id],
  }),
  agent: one(printerAgents, {
    fields: [printJobs.agentId],
    references: [printerAgents.id],
  }),
  profile: one(printerProfiles, {
    fields: [printJobs.profileId],
    references: [printerProfiles.id],
  }),
  createdByUser: one(users, {
    fields: [printJobs.createdBy],
    references: [users.id],
  }),
}));

export const cashierSessionsRelations = relations(cashierSessions, ({ one }) => ({
  company: one(companies, {
    fields: [cashierSessions.companyId],
    references: [companies.id],
  }),
  event: one(events, {
    fields: [cashierSessions.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [cashierSessions.userId],
    references: [users.id],
  }),
  printerAgent: one(printerAgents, {
    fields: [cashierSessions.printerAgentId],
    references: [printerAgents.id],
  }),
}));

// ==================== SCHEMAS PRINTER ====================

export const insertPrinterModelSchema = createInsertSchema(printerModels).omit({
  id: true,
  createdAt: true,
});
export const updatePrinterModelSchema = insertPrinterModelSchema.partial();

export const insertPrinterAgentSchema = createInsertSchema(printerAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updatePrinterAgentSchema = insertPrinterAgentSchema.partial();

export const insertPrinterProfileSchema = createInsertSchema(printerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updatePrinterProfileSchema = insertPrinterProfileSchema.partial();

export const insertPrintJobSchema = createInsertSchema(printJobs).omit({
  id: true,
  createdAt: true,
  printedAt: true,
});

export const insertCashierSessionSchema = createInsertSchema(cashierSessions).omit({
  id: true,
  openedAt: true,
  closedAt: true,
});

// ==================== TYPES PRINTER ====================

export type PrinterModel = typeof printerModels.$inferSelect;
export type InsertPrinterModel = z.infer<typeof insertPrinterModelSchema>;
export type UpdatePrinterModel = z.infer<typeof updatePrinterModelSchema>;

export type PrinterAgent = typeof printerAgents.$inferSelect;
export type InsertPrinterAgent = z.infer<typeof insertPrinterAgentSchema>;
export type UpdatePrinterAgent = z.infer<typeof updatePrinterAgentSchema>;

export type PrinterProfile = typeof printerProfiles.$inferSelect;
export type InsertPrinterProfile = z.infer<typeof insertPrinterProfileSchema>;
export type UpdatePrinterProfile = z.infer<typeof updatePrinterProfileSchema>;

export type PrintJob = typeof printJobs.$inferSelect;
export type InsertPrintJob = z.infer<typeof insertPrintJobSchema>;

export type CashierSession = typeof cashierSessions.$inferSelect;
export type InsertCashierSession = z.infer<typeof insertCashierSessionSchema>;

// ==================== TICKET TEMPLATE BUILDER ====================

// Ticket Templates - Visual ticket layout templates (per-company)
export const ticketTemplates = pgTable("ticket_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Template Standard", "VIP Gold"
  backgroundImageUrl: text("background_image_url"), // Uploaded background image
  paperWidthMm: integer("paper_width_mm").notNull().default(80),
  paperHeightMm: integer("paper_height_mm").notNull().default(50),
  printOrientation: varchar("print_orientation", { length: 20 }).default('auto'), // auto, portrait, landscape
  dpi: integer("dpi").default(203), // Print resolution for accurate sizing
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").default(1), // Template versioning
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ticket Template Elements - Positioned fields on the template
export const ticketTemplateElements = pgTable("ticket_template_elements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => ticketTemplates.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // text, qrcode, barcode, image, line, rect
  fieldKey: varchar("field_key", { length: 100 }), // Dynamic field: event_name, event_date, price, ticket_number, organizer_name, etc.
  staticValue: text("static_value"), // For static text/images
  // Position (in mm, relative to paper)
  x: decimal("x", { precision: 8, scale: 2 }).notNull().default('0'),
  y: decimal("y", { precision: 8, scale: 2 }).notNull().default('0'),
  width: decimal("width", { precision: 8, scale: 2 }).notNull().default('20'),
  height: decimal("height", { precision: 8, scale: 2 }).notNull().default('5'),
  rotation: integer("rotation").default(0), // Degrees
  // Text styling
  fontFamily: varchar("font_family", { length: 100 }).default('Arial'),
  fontSize: integer("font_size").default(12), // Points
  fontWeight: varchar("font_weight", { length: 20 }).default('normal'), // normal, bold
  textAlign: varchar("text_align", { length: 20 }).default('left'), // left, center, right
  color: varchar("color", { length: 20 }).default('#000000'),
  // QR/Barcode settings
  barcodeFormat: varchar("barcode_format", { length: 50 }), // CODE128, EAN13, QR
  qrErrorCorrection: varchar("qr_error_correction", { length: 1 }).default('M'), // L, M, Q, H
  // Display order
  zIndex: integer("z_index").default(0),
  // Visibility conditions (JSON for conditional display)
  visibilityConditions: jsonb("visibility_conditions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const ticketTemplatesRelations = relations(ticketTemplates, ({ one, many }) => ({
  company: one(companies, {
    fields: [ticketTemplates.companyId],
    references: [companies.id],
  }),
  elements: many(ticketTemplateElements),
}));

export const ticketTemplateElementsRelations = relations(ticketTemplateElements, ({ one }) => ({
  template: one(ticketTemplates, {
    fields: [ticketTemplateElements.templateId],
    references: [ticketTemplates.id],
  }),
}));

// ==================== SCHEMAS TICKET TEMPLATE ====================

export const insertTicketTemplateSchema = createInsertSchema(ticketTemplates).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export const updateTicketTemplateSchema = insertTicketTemplateSchema.partial();

export const insertTicketTemplateElementSchema = createInsertSchema(ticketTemplateElements).omit({
  id: true,
  createdAt: true,
});
export const updateTicketTemplateElementSchema = insertTicketTemplateElementSchema.partial();

// ==================== TYPES TICKET TEMPLATE ====================

export type TicketTemplate = typeof ticketTemplates.$inferSelect;
export type InsertTicketTemplate = z.infer<typeof insertTicketTemplateSchema>;
export type UpdateTicketTemplate = z.infer<typeof updateTicketTemplateSchema>;

export type TicketTemplateElement = typeof ticketTemplateElements.$inferSelect;
export type InsertTicketTemplateElement = z.infer<typeof insertTicketTemplateElementSchema>;
export type UpdateTicketTemplateElement = z.infer<typeof updateTicketTemplateElementSchema>;

// ==================== EVENT FOUR YOU - LISTE & TAVOLI ====================

// Event Lists - Liste per evento
export const eventLists = pgTable("event_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  maxCapacity: integer("max_capacity"),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  price: decimal("price", { precision: 10, scale: 2 }).default('0'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// List Entries - Persone iscritte alle liste
export const listEntries = pgTable("list_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull().references(() => eventLists.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  gender: varchar("gender", { length: 1 }),
  email: varchar("email", { length: 255 }),
  clientUserId: varchar("client_user_id").references(() => users.id),
  qrCode: varchar("qr_code", { length: 100 }).unique(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: varchar("checked_in_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdByRole: varchar("created_by_role", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table Types - Tipologie tavolo per evento
export const tableTypes = pgTable("table_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxGuests: integer("max_guests").notNull(),
  totalQuantity: integer("total_quantity").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table Reservations - Prenotazioni tavolo
export const tableReservations = pgTable("table_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableTypeId: varchar("table_type_id").notNull().references(() => tableTypes.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  reservationName: varchar("reservation_name", { length: 255 }).notNull(),
  reservationPhone: varchar("reservation_phone", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdBy: varchar("created_by").references(() => users.id),
  createdByRole: varchar("created_by_role", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table Guests - Persone associate a prenotazione tavolo
export const tableGuests = pgTable("table_guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservationId: varchar("reservation_id").notNull().references(() => tableReservations.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  gender: varchar("gender", { length: 1 }),
  email: varchar("email", { length: 255 }),
  clientUserId: varchar("client_user_id").references(() => users.id),
  qrCode: varchar("qr_code", { length: 100 }).unique(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: varchar("checked_in_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// E4U Staff Assignments - Abilitazione staff per evento (Event Four You)
// Note: Named e4uStaffAssignments to avoid conflict with existing eventStaffAssignments
export const e4uStaffAssignments = pgTable("e4u_staff_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  canManageLists: boolean("can_manage_lists").notNull().default(true),
  canManageTables: boolean("can_manage_tables").notNull().default(true),
  canCreatePr: boolean("can_create_pr").notNull().default(true),
  canApproveTables: boolean("can_approve_tables").notNull().default(false),
  canSellTickets: boolean("can_sell_tickets").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event PR Assignments - Abilitazione PR per evento (sotto Staff)
export const eventPrAssignments = pgTable("event_pr_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  staffUserId: varchar("staff_user_id").references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  canAddToLists: boolean("can_add_to_lists").notNull().default(true),
  canProposeTables: boolean("can_propose_tables").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Scanners - Scanner abilitati per evento
export const eventScanners = pgTable("event_scanners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  canScanLists: boolean("can_scan_lists").notNull().default(true),
  canScanTables: boolean("can_scan_tables").notNull().default(true),
  canScanTickets: boolean("can_scan_tickets").notNull().default(true),
  allowedSectorIds: text().array().default(sql`ARRAY[]::text[]`), // Empty array = all sectors allowed
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== RELATIONS EVENT FOUR YOU ====================

export const eventListsRelations = relations(eventLists, ({ one, many }) => ({
  event: one(events, {
    fields: [eventLists.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [eventLists.companyId],
    references: [companies.id],
  }),
  entries: many(listEntries),
}));

export const listEntriesRelations = relations(listEntries, ({ one }) => ({
  list: one(eventLists, {
    fields: [listEntries.listId],
    references: [eventLists.id],
  }),
  event: one(events, {
    fields: [listEntries.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [listEntries.companyId],
    references: [companies.id],
  }),
  clientUser: one(users, {
    fields: [listEntries.clientUserId],
    references: [users.id],
  }),
  checkedInByUser: one(users, {
    fields: [listEntries.checkedInBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [listEntries.createdBy],
    references: [users.id],
  }),
}));

export const tableTypesRelations = relations(tableTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [tableTypes.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [tableTypes.companyId],
    references: [companies.id],
  }),
  reservations: many(tableReservations),
}));

export const tableReservationsRelations = relations(tableReservations, ({ one, many }) => ({
  tableType: one(tableTypes, {
    fields: [tableReservations.tableTypeId],
    references: [tableTypes.id],
  }),
  event: one(events, {
    fields: [tableReservations.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [tableReservations.companyId],
    references: [companies.id],
  }),
  approvedByUser: one(users, {
    fields: [tableReservations.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [tableReservations.createdBy],
    references: [users.id],
  }),
  guests: many(tableGuests),
}));

export const tableGuestsRelations = relations(tableGuests, ({ one }) => ({
  reservation: one(tableReservations, {
    fields: [tableGuests.reservationId],
    references: [tableReservations.id],
  }),
  event: one(events, {
    fields: [tableGuests.eventId],
    references: [events.id],
  }),
  company: one(companies, {
    fields: [tableGuests.companyId],
    references: [companies.id],
  }),
  clientUser: one(users, {
    fields: [tableGuests.clientUserId],
    references: [users.id],
  }),
  checkedInByUser: one(users, {
    fields: [tableGuests.checkedInBy],
    references: [users.id],
  }),
}));

export const e4uStaffAssignmentsRelations = relations(e4uStaffAssignments, ({ one }) => ({
  event: one(events, {
    fields: [e4uStaffAssignments.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [e4uStaffAssignments.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [e4uStaffAssignments.companyId],
    references: [companies.id],
  }),
}));

export const eventPrAssignmentsRelations = relations(eventPrAssignments, ({ one }) => ({
  event: one(events, {
    fields: [eventPrAssignments.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventPrAssignments.userId],
    references: [users.id],
  }),
  staffUser: one(users, {
    fields: [eventPrAssignments.staffUserId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [eventPrAssignments.companyId],
    references: [companies.id],
  }),
}));

export const eventScannersRelations = relations(eventScanners, ({ one }) => ({
  event: one(events, {
    fields: [eventScanners.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventScanners.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [eventScanners.companyId],
    references: [companies.id],
  }),
}));

// ==================== SCHEMAS EVENT FOUR YOU ====================

export const insertEventListSchema = createInsertSchema(eventLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateEventListSchema = insertEventListSchema.partial().omit({ eventId: true, companyId: true });

export const insertListEntrySchema = createInsertSchema(listEntries).omit({
  id: true,
  createdAt: true,
});
export const updateListEntrySchema = insertListEntrySchema.partial().omit({ listId: true, eventId: true, companyId: true });

export const insertTableTypeSchema = createInsertSchema(tableTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  price: z.union([z.string(), z.coerce.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});
export const updateTableTypeSchema = insertTableTypeSchema.partial().omit({ eventId: true, companyId: true });

export const insertTableReservationSchema = createInsertSchema(tableReservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateTableReservationSchema = insertTableReservationSchema.partial().omit({ tableTypeId: true, eventId: true, companyId: true });

export const insertTableGuestSchema = createInsertSchema(tableGuests).omit({
  id: true,
  createdAt: true,
});
export const updateTableGuestSchema = insertTableGuestSchema.partial().omit({ reservationId: true, eventId: true, companyId: true });

export const insertE4uStaffAssignmentSchema = createInsertSchema(e4uStaffAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateE4uStaffAssignmentSchema = insertE4uStaffAssignmentSchema.partial().omit({ eventId: true, userId: true, companyId: true });

export const insertEventPrAssignmentSchema = createInsertSchema(eventPrAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateEventPrAssignmentSchema = insertEventPrAssignmentSchema.partial().omit({ eventId: true, userId: true, companyId: true });

export const insertEventScannerSchema = createInsertSchema(eventScanners).omit({
  id: true,
  createdAt: true,
});
export const updateEventScannerSchema = insertEventScannerSchema.partial().omit({ eventId: true, userId: true, companyId: true });

// ==================== TYPES EVENT FOUR YOU ====================

export type EventList = typeof eventLists.$inferSelect;
export type InsertEventList = z.infer<typeof insertEventListSchema>;
export type UpdateEventList = z.infer<typeof updateEventListSchema>;

export type ListEntry = typeof listEntries.$inferSelect;
export type InsertListEntry = z.infer<typeof insertListEntrySchema>;
export type UpdateListEntry = z.infer<typeof updateListEntrySchema>;

export type TableType = typeof tableTypes.$inferSelect;
export type InsertTableType = z.infer<typeof insertTableTypeSchema>;
export type UpdateTableType = z.infer<typeof updateTableTypeSchema>;

export type TableReservation = typeof tableReservations.$inferSelect;
export type InsertTableReservation = z.infer<typeof insertTableReservationSchema>;
export type UpdateTableReservation = z.infer<typeof updateTableReservationSchema>;

export type TableGuest = typeof tableGuests.$inferSelect;
export type InsertTableGuest = z.infer<typeof insertTableGuestSchema>;
export type UpdateTableGuest = z.infer<typeof updateTableGuestSchema>;

export type E4uStaffAssignment = typeof e4uStaffAssignments.$inferSelect;
export type InsertE4uStaffAssignment = z.infer<typeof insertE4uStaffAssignmentSchema>;
export type UpdateE4uStaffAssignment = z.infer<typeof updateE4uStaffAssignmentSchema>;

export type EventPrAssignment = typeof eventPrAssignments.$inferSelect;
export type InsertEventPrAssignment = z.infer<typeof insertEventPrAssignmentSchema>;
export type UpdateEventPrAssignment = z.infer<typeof updateEventPrAssignmentSchema>;

export type EventScanner = typeof eventScanners.$inferSelect;
export type InsertEventScanner = z.infer<typeof insertEventScannerSchema>;
export type UpdateEventScanner = z.infer<typeof updateEventScannerSchema>;

// ==================== TABELLE PER COMPATIBILITÀ PRODUZIONE ====================

// User Companies - Associazione utenti a più company
export const userCompanies = pgTable("user_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  role: varchar("role", { length: 50 }).default('member'),
  createdAt: timestamp("created_at").defaultNow(),
});

// SIAE Custom Ticket Prices - Prezzi personalizzati biglietti
export const siaeCustomTicketPrices = pgTable("siae_custom_ticket_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketedEventId: varchar("ticketed_event_id").references(() => siaeTicketedEvents.id),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// SIAE C1 Reports - Report C1 SIAE
export const siaeC1Reports = pgTable("siae_c1_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  ticketedEventId: varchar("ticketed_event_id").references(() => siaeTicketedEvents.id),
  reportDate: timestamp("report_date").notNull(),
  reportData: jsonb("report_data"),
  status: varchar("status", { length: 20 }).default('draft'),
  transmittedAt: timestamp("transmitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== MODULO CASSA BIGLIETTI ====================

// Allocazione Cassieri - Quota assegnata a ciascun cassiere per evento
export const siaeCashierAllocations = pgTable("siae_cashier_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  eventId: varchar("event_id").notNull().references(() => siaeTicketedEvents.id),
  cashierId: varchar("cashier_id").notNull().references(() => siaeCashiers.id),
  sectorId: varchar("sector_id").references(() => siaeEventSectors.id),
  quotaQuantity: integer("quota_quantity").notNull().default(0),
  quotaUsed: integer("quota_used").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeCashierAllocationsRelations = relations(siaeCashierAllocations, ({ one }) => ({
  company: one(companies, {
    fields: [siaeCashierAllocations.companyId],
    references: [companies.id],
  }),
  event: one(siaeTicketedEvents, {
    fields: [siaeCashierAllocations.eventId],
    references: [siaeTicketedEvents.id],
  }),
  cashier: one(siaeCashiers, {
    fields: [siaeCashierAllocations.cashierId],
    references: [siaeCashiers.id],
  }),
  sector: one(siaeEventSectors, {
    fields: [siaeCashierAllocations.sectorId],
    references: [siaeEventSectors.id],
  }),
}));

// Audit Biglietti - Log di tutte le operazioni su biglietti
export const siaeTicketAudit = pgTable("siae_ticket_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  ticketId: varchar("ticket_id").notNull().references(() => siaeTickets.id),
  operationType: varchar("operation_type", { length: 20 }).notNull(), // emission, cancellation, reprint
  performedBy: varchar("performed_by").notNull(), // Can be users.id OR siaeCashiers.id
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siaeTicketAuditRelations = relations(siaeTicketAudit, ({ one }) => ({
  company: one(companies, {
    fields: [siaeTicketAudit.companyId],
    references: [companies.id],
  }),
  ticket: one(siaeTickets, {
    fields: [siaeTicketAudit.ticketId],
    references: [siaeTickets.id],
  }),
  // performedBy can be either users.id OR siaeCashiers.id, so no direct relation
}));

// Schemas per validazione
export const insertSiaeCashierAllocationSchema = createInsertSchema(siaeCashierAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeCashierAllocationSchema = insertSiaeCashierAllocationSchema.partial().omit({ companyId: true, eventId: true, cashierId: true });

export const insertSiaeTicketAuditSchema = createInsertSchema(siaeTicketAudit).omit({
  id: true,
  createdAt: true,
});

// Types
export type SiaeCashierAllocation = typeof siaeCashierAllocations.$inferSelect;
export type InsertSiaeCashierAllocation = z.infer<typeof insertSiaeCashierAllocationSchema>;
export type UpdateSiaeCashierAllocation = z.infer<typeof updateSiaeCashierAllocationSchema>;

export type SiaeTicketAudit = typeof siaeTicketAudit.$inferSelect;
export type InsertSiaeTicketAudit = z.infer<typeof insertSiaeTicketAuditSchema>;

// ==================== SIAE CASHIERS (Internal) ====================

export const siaeCashiers = pgTable("siae_cashiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  username: varchar("username", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  defaultPrinterAgentId: varchar("default_printer_agent_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeCashiersRelations = relations(siaeCashiers, ({ one }) => ({
  company: one(companies, {
    fields: [siaeCashiers.companyId],
    references: [companies.id],
  }),
}));

export const insertSiaeCashierSchema = createInsertSchema(siaeCashiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSiaeCashierSchema = insertSiaeCashierSchema.partial().omit({ companyId: true });

export type SiaeCashier = typeof siaeCashiers.$inferSelect;
export type InsertSiaeCashier = z.infer<typeof insertSiaeCashierSchema>;
export type UpdateSiaeCashier = z.infer<typeof updateSiaeCashierSchema>;

// ==================== ORGANIZER SUBSCRIPTION + COMMISSION + BILLING ====================

// Organizer Plans - Subscription plan catalog
export const organizerPlans = pgTable("organizer_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'monthly' | 'per_event'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationDays: integer("duration_days"), // for monthly plans
  eventsIncluded: integer("events_included"), // for per_event plans
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizerPlansRelations = relations(organizerPlans, ({ many }) => ({
  subscriptions: many(organizerSubscriptions),
}));

// Organizer Subscriptions - Assigned subscriptions
export const organizerSubscriptions = pgTable("organizer_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  planId: varchar("plan_id").notNull().references(() => organizerPlans.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).notNull().default('active'), // 'active' | 'suspended' | 'expired'
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull(), // 'monthly' | 'per_event'
  nextBillingDate: timestamp("next_billing_date"), // for monthly
  eventsUsed: integer("events_used").notNull().default(0), // for per_event
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizerSubscriptionsRelations = relations(organizerSubscriptions, ({ one }) => ({
  company: one(companies, {
    fields: [organizerSubscriptions.companyId],
    references: [companies.id],
  }),
  plan: one(organizerPlans, {
    fields: [organizerSubscriptions.planId],
    references: [organizerPlans.id],
  }),
}));

// Organizer Commission Profiles - Commission rates per channel
export const organizerCommissionProfiles = pgTable("organizer_commission_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id).unique(),
  channelOnlineType: varchar("channel_online_type", { length: 20 }).notNull().default('percent'), // 'percent' | 'fixed'
  channelOnlineValue: decimal("channel_online_value", { precision: 10, scale: 2 }).notNull().default('0'),
  channelPrintedType: varchar("channel_printed_type", { length: 20 }).notNull().default('percent'), // 'percent' | 'fixed'
  channelPrintedValue: decimal("channel_printed_value", { precision: 10, scale: 2 }).notNull().default('0'),
  channelPrType: varchar("channel_pr_type", { length: 20 }).notNull().default('percent'), // 'percent' | 'fixed'
  channelPrValue: decimal("channel_pr_value", { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizerCommissionProfilesRelations = relations(organizerCommissionProfiles, ({ one }) => ({
  company: one(companies, {
    fields: [organizerCommissionProfiles.companyId],
    references: [companies.id],
  }),
}));

// Organizer Wallets - Wallet for each company
export const organizerWallets = pgTable("organizer_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id).unique(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default('0'), // negative = debt
  thresholdAmount: decimal("threshold_amount", { precision: 12, scale: 2 }).notNull().default('1000'), // invoice threshold
  currency: varchar("currency", { length: 3 }).notNull().default('EUR'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizerWalletsRelations = relations(organizerWallets, ({ one, many }) => ({
  company: one(companies, {
    fields: [organizerWallets.companyId],
    references: [companies.id],
  }),
  ledgerEntries: many(organizerWalletLedger),
}));

// Organizer Wallet Ledger - Wallet transactions
export const organizerWalletLedger = pgTable("organizer_wallet_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  walletId: varchar("wallet_id").notNull().references(() => organizerWallets.id),
  type: varchar("type", { length: 20 }).notNull(), // 'commission' | 'subscription' | 'invoice' | 'payment' | 'adjustment'
  direction: varchar("direction", { length: 10 }).notNull(), // 'debit' | 'credit'
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  referenceType: varchar("reference_type", { length: 20 }), // 'order' | 'event' | 'invoice' | 'subscription' | null
  referenceId: varchar("reference_id"),
  channel: varchar("channel", { length: 20 }), // 'online' | 'printed' | 'pr' | null
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organizerWalletLedgerRelations = relations(organizerWalletLedger, ({ one }) => ({
  company: one(companies, {
    fields: [organizerWalletLedger.companyId],
    references: [companies.id],
  }),
  wallet: one(organizerWallets, {
    fields: [organizerWalletLedger.walletId],
    references: [organizerWallets.id],
  }),
}));

// Organizer Invoices - Generated invoices
export const organizerInvoices = pgTable("organizer_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('draft'), // 'draft' | 'issued' | 'paid' | 'void'
  issuedAt: timestamp("issued_at"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizerInvoicesRelations = relations(organizerInvoices, ({ one, many }) => ({
  company: one(companies, {
    fields: [organizerInvoices.companyId],
    references: [companies.id],
  }),
  items: many(organizerInvoiceItems),
}));

// Organizer Invoice Items - Invoice line items
export const organizerInvoiceItems = pgTable("organizer_invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => organizerInvoices.id),
  itemType: varchar("item_type", { length: 30 }).notNull(), // 'subscription' | 'commissions_online' | 'commissions_printed' | 'commissions_pr' | 'adjustment'
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organizerInvoiceItemsRelations = relations(organizerInvoiceItems, ({ one }) => ({
  invoice: one(organizerInvoices, {
    fields: [organizerInvoiceItems.invoiceId],
    references: [organizerInvoices.id],
  }),
}));

// ==================== SCHEMAS ORGANIZER BILLING ====================

export const insertOrganizerPlanSchema = createInsertSchema(organizerPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateOrganizerPlanSchema = insertOrganizerPlanSchema.partial();

export const insertOrganizerSubscriptionSchema = createInsertSchema(organizerSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateOrganizerSubscriptionSchema = insertOrganizerSubscriptionSchema.partial().omit({ companyId: true, planId: true });

export const insertOrganizerCommissionProfileSchema = createInsertSchema(organizerCommissionProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateOrganizerCommissionProfileSchema = insertOrganizerCommissionProfileSchema.partial().omit({ companyId: true });

export const insertOrganizerWalletSchema = createInsertSchema(organizerWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateOrganizerWalletSchema = insertOrganizerWalletSchema.partial().omit({ companyId: true });

export const insertOrganizerWalletLedgerSchema = createInsertSchema(organizerWalletLedger).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizerInvoiceSchema = createInsertSchema(organizerInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateOrganizerInvoiceSchema = insertOrganizerInvoiceSchema.partial().omit({ companyId: true, invoiceNumber: true });

export const insertOrganizerInvoiceItemSchema = createInsertSchema(organizerInvoiceItems).omit({
  id: true,
  createdAt: true,
});

// ==================== TYPES ORGANIZER BILLING ====================

export type OrganizerPlan = typeof organizerPlans.$inferSelect;
export type InsertOrganizerPlan = z.infer<typeof insertOrganizerPlanSchema>;
export type UpdateOrganizerPlan = z.infer<typeof updateOrganizerPlanSchema>;

export type OrganizerSubscription = typeof organizerSubscriptions.$inferSelect;
export type InsertOrganizerSubscription = z.infer<typeof insertOrganizerSubscriptionSchema>;
export type UpdateOrganizerSubscription = z.infer<typeof updateOrganizerSubscriptionSchema>;

export type OrganizerCommissionProfile = typeof organizerCommissionProfiles.$inferSelect;
export type InsertOrganizerCommissionProfile = z.infer<typeof insertOrganizerCommissionProfileSchema>;
export type UpdateOrganizerCommissionProfile = z.infer<typeof updateOrganizerCommissionProfileSchema>;

export type OrganizerWallet = typeof organizerWallets.$inferSelect;
export type InsertOrganizerWallet = z.infer<typeof insertOrganizerWalletSchema>;
export type UpdateOrganizerWallet = z.infer<typeof updateOrganizerWalletSchema>;

export type OrganizerWalletLedger = typeof organizerWalletLedger.$inferSelect;
export type InsertOrganizerWalletLedger = z.infer<typeof insertOrganizerWalletLedgerSchema>;

export type OrganizerInvoice = typeof organizerInvoices.$inferSelect;
export type InsertOrganizerInvoice = z.infer<typeof insertOrganizerInvoiceSchema>;
export type UpdateOrganizerInvoice = z.infer<typeof updateOrganizerInvoiceSchema>;

export type OrganizerInvoiceItem = typeof organizerInvoiceItems.$inferSelect;
export type InsertOrganizerInvoiceItem = z.infer<typeof insertOrganizerInvoiceItemSchema>;
