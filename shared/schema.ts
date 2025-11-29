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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  locations: many(locations),
  eventFormats: many(eventFormats),
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
