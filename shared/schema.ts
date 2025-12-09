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
// Roles: super_admin, gestore, gestore_covisione, capo_staff, pr, warehouse, bartender, cliente
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone", { length: 20 }), // For PR OTP login
  passwordHash: varchar("password_hash"), // For classic email/password registration (optional - null for Replit Auth users)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default('gestore'), // super_admin, gestore, gestore_covisione, capo_staff, pr, warehouse, bartender, cliente
  companyId: varchar("company_id").references(() => companies.id),
  parentUserId: varchar("parent_user_id"), // For PR: their Capo Staff; For Capo Staff: their Gestore
  emailVerified: boolean("email_verified").default(false), // Email verification status for classic registration
  phoneVerified: boolean("phone_verified").default(false), // Phone verification for PR OTP login
  verificationToken: varchar("verification_token"), // Token for email verification link
  resetPasswordToken: varchar("reset_password_token"), // Token for password reset
  resetPasswordExpires: timestamp("reset_password_expires"), // Token expiration time
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
  cardCode: varchar("card_code", { length: 8 }).notNull().unique(), // Codice univoco carta 8 caratteri
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siaeCustomersRelations = relations(siaeCustomers, ({ many }) => ({
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
  cardCode: varchar("card_code", { length: 8 }), // Codice carta attivazione
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
  // Stato
  status: varchar("status", { length: 20 }).notNull().default('valid'), // valid, used, cancelled
  usedAt: timestamp("used_at"), // Quando è stato usato per entrare
  usedByScannerId: varchar("used_by_scanner_id"), // ID scanner che ha validato
  // Annullamento
  cancellationReasonCode: varchar("cancellation_reason_code", { length: 3 }), // TAB.5
  cancellationDate: timestamp("cancellation_date"),
  cancelledByUserId: varchar("cancelled_by_user_id").references(() => users.id),
  // Riferimento annullamento (per cambio nominativo/rimessa)
  originalTicketId: varchar("original_ticket_id"), // Se derivato da cambio/rimessa
  replacedByTicketId: varchar("replaced_by_ticket_id"), // Se sostituito
  // QR Code
  qrCode: text("qr_code"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
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
  cancelledByUser: one(users, {
    fields: [siaeTickets.cancelledByUserId],
    references: [users.id],
  }),
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
}));

// ==================== SIAE Audit Logs ====================
export const siaeAuditLogs = pgTable("siae_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").references(() => users.id),
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
  cardCode: varchar("card_code", { length: 8 }),
  // Timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

export const siaeAuditLogsRelations = relations(siaeAuditLogs, ({ one }) => ({
  company: one(companies, {
    fields: [siaeAuditLogs.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [siaeAuditLogs.userId],
    references: [users.id],
  }),
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
  type: z.enum(['LOAD', 'UNLOAD', 'TRANSFER', 'CONSUME', 'RETURN', 'ADJUSTMENT']),
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
  status: varchar("status", { length: 30 }).notNull().default('pending'), // pending, processing, completed, failed, expired
  cartSnapshot: jsonb("cart_snapshot"), // Snapshot carrello al momento del checkout
  transactionId: varchar("transaction_id").references(() => siaeTransactions.id), // Dopo completamento
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
