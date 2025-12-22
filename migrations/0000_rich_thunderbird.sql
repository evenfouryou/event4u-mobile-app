CREATE TABLE "accounting_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar,
	"type" varchar(50) NOT NULL,
	"document_number" varchar(100),
	"issue_date" timestamp,
	"due_date" timestamp,
	"amount" numeric(10, 2),
	"supplier_id" varchar,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"file_url" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cash_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"position_id" varchar NOT NULL,
	"entry_type" varchar(50) NOT NULL,
	"product_id" varchar,
	"description" varchar(255),
	"quantity" numeric(10, 2),
	"unit_price" numeric(10, 2),
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"notes" text,
	"entry_time" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cash_funds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"position_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"expected_amount" numeric(10, 2),
	"difference" numeric(10, 2),
	"denominations" jsonb,
	"operator_id" varchar,
	"notes" text,
	"recorded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cash_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"sector_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"operator_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cash_sectors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cashier_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar,
	"user_id" varchar NOT NULL,
	"printer_agent_id" varchar,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp,
	"tickets_issued" integer DEFAULT 0,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"tax_id" varchar(100),
	"address" text,
	"active" boolean DEFAULT true NOT NULL,
	"bridge_token" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_features" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"beverage_enabled" boolean DEFAULT true NOT NULL,
	"contabilita_enabled" boolean DEFAULT false NOT NULL,
	"personale_enabled" boolean DEFAULT false NOT NULL,
	"cassa_enabled" boolean DEFAULT false NOT NULL,
	"night_file_enabled" boolean DEFAULT false NOT NULL,
	"siae_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "company_features_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "digital_ticket_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"primary_color" varchar(7) DEFAULT '#6366f1',
	"secondary_color" varchar(7) DEFAULT '#4f46e5',
	"background_color" varchar(7) DEFAULT '#1e1b4b',
	"text_color" varchar(7) DEFAULT '#ffffff',
	"accent_color" varchar(7) DEFAULT '#a855f7',
	"logo_url" text,
	"logo_position" varchar(20) DEFAULT 'top-center',
	"logo_size" varchar(20) DEFAULT 'medium',
	"qr_size" integer DEFAULT 200,
	"qr_position" varchar(20) DEFAULT 'center',
	"qr_style" varchar(20) DEFAULT 'square',
	"qr_foreground_color" varchar(7) DEFAULT '#ffffff',
	"qr_background_color" varchar(20) DEFAULT 'transparent',
	"background_style" varchar(20) DEFAULT 'gradient',
	"gradient_direction" varchar(20) DEFAULT 'to-bottom',
	"background_pattern" varchar(50),
	"show_event_name" boolean DEFAULT true NOT NULL,
	"show_event_date" boolean DEFAULT true NOT NULL,
	"show_event_time" boolean DEFAULT true NOT NULL,
	"show_venue" boolean DEFAULT true NOT NULL,
	"show_price" boolean DEFAULT true NOT NULL,
	"show_ticket_type" boolean DEFAULT true NOT NULL,
	"show_sector" boolean DEFAULT true NOT NULL,
	"show_seat" boolean DEFAULT false NOT NULL,
	"show_buyer_name" boolean DEFAULT true NOT NULL,
	"show_fiscal_seal" boolean DEFAULT true NOT NULL,
	"show_perforated_edge" boolean DEFAULT true NOT NULL,
	"font_family" varchar(100) DEFAULT 'Inter, system-ui, sans-serif',
	"title_font_size" integer DEFAULT 24,
	"body_font_size" integer DEFAULT 14,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "e4u_staff_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"can_manage_lists" boolean DEFAULT true NOT NULL,
	"can_manage_tables" boolean DEFAULT true NOT NULL,
	"can_create_pr" boolean DEFAULT true NOT NULL,
	"can_approve_tables" boolean DEFAULT false NOT NULL,
	"can_sell_tickets" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_floorplans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"image_url" text NOT NULL,
	"width" integer,
	"height" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_formats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3b82f6',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"max_capacity" integer,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"price" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_pr_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"staff_user_id" varchar,
	"company_id" varchar NOT NULL,
	"can_add_to_lists" boolean DEFAULT true NOT NULL,
	"can_propose_tables" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_scanners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"can_scan_lists" boolean DEFAULT true NOT NULL,
	"can_scan_tables" boolean DEFAULT true NOT NULL,
	"can_scan_tickets" boolean DEFAULT true NOT NULL,
	"allowedListIds" text[] DEFAULT ARRAY[]::text[],
	"allowedTableTypeIds" text[] DEFAULT ARRAY[]::text[],
	"allowedSectorIds" text[] DEFAULT ARRAY[]::text[],
	"start_time" varchar(5),
	"end_time" varchar(5),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_staff_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(50) NOT NULL,
	"assigned_by_user_id" varchar NOT NULL,
	"permissions" text[] DEFAULT ARRAY[]::text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_tables" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"floorplan_id" varchar,
	"company_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"table_type" varchar(50) DEFAULT 'standard' NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"min_spend" numeric(10, 2),
	"position_x" integer,
	"position_y" integer,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_zone_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticketed_event_id" varchar NOT NULL,
	"zone_id" varchar NOT NULL,
	"sector_id" varchar NOT NULL,
	"price_override" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"location_id" varchar NOT NULL,
	"format_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"start_datetime" timestamp NOT NULL,
	"end_datetime" timestamp NOT NULL,
	"capacity" integer,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"price_list_id" varchar,
	"actual_revenue" numeric(10, 2),
	"notes" text,
	"series_id" varchar,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_pattern" varchar(20) DEFAULT 'none',
	"recurrence_interval" integer,
	"recurrence_count" integer,
	"recurrence_end_date" timestamp,
	"parent_event_id" varchar,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extra_costs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar,
	"category" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"supplier_id" varchar,
	"invoice_number" varchar(100),
	"invoice_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fixed_costs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"location_id" varchar,
	"category" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"frequency" varchar(50) DEFAULT 'monthly' NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "floor_plan_seats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" varchar NOT NULL,
	"seat_label" varchar(20) NOT NULL,
	"row" varchar(10),
	"seat_number" integer,
	"pos_x" numeric(10, 4) NOT NULL,
	"pos_y" numeric(10, 4) NOT NULL,
	"is_accessible" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "floor_plan_zones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_plan_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"zone_type" varchar(50) NOT NULL,
	"coordinates" jsonb NOT NULL,
	"rect_x" numeric(10, 4),
	"rect_y" numeric(10, 4),
	"rect_width" numeric(10, 4),
	"rect_height" numeric(10, 4),
	"fill_color" varchar(20) DEFAULT '#3b82f6',
	"stroke_color" varchar(20) DEFAULT '#1d4ed8',
	"opacity" numeric(3, 2) DEFAULT '0.3',
	"capacity" integer,
	"table_number" varchar(20),
	"seats_per_table" integer,
	"default_sector_code" varchar(2),
	"is_selectable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guest_list_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_list_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"added_by_user_id" varchar NOT NULL,
	"customer_id" varchar,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"plus_ones" integer DEFAULT 0 NOT NULL,
	"plus_ones_names" text[] DEFAULT ARRAY[]::text[],
	"qr_code" varchar(100) NOT NULL,
	"qr_scanned_at" timestamp,
	"qr_scanned_by_user_id" varchar,
	"ticket_id" varchar,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp,
	"arrived_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "guest_list_entries_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "guest_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"list_type" varchar(50) DEFAULT 'standard' NOT NULL,
	"created_by_user_id" varchar NOT NULL,
	"max_guests" integer,
	"current_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"closed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "list_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"gender" varchar(1),
	"email" varchar(255),
	"client_user_id" varchar,
	"qr_code" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"checked_in_at" timestamp,
	"checked_in_by" varchar,
	"created_by" varchar,
	"created_by_role" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "list_entries_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"capacity" integer,
	"notes" text,
	"hero_image_url" text,
	"short_description" text,
	"opening_hours" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"siae_location_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"location_id" varchar,
	"event_id" varchar,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(10, 2),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"supplier_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "night_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"total_fixed_costs" numeric(10, 2),
	"total_extra_costs" numeric(10, 2),
	"total_maintenances" numeric(10, 2),
	"total_staff_count" integer,
	"total_staff_costs" numeric(10, 2),
	"total_cash_revenue" numeric(10, 2),
	"total_card_revenue" numeric(10, 2),
	"total_online_revenue" numeric(10, 2),
	"total_credits_revenue" numeric(10, 2),
	"total_revenue" numeric(10, 2),
	"total_expenses" numeric(10, 2),
	"net_result" numeric(10, 2),
	"opening_fund" numeric(10, 2),
	"closing_fund" numeric(10, 2),
	"fund_difference" numeric(10, 2),
	"notes" text,
	"approved_by" varchar,
	"approved_at" timestamp,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizer_commission_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"channel_online_type" varchar(20) DEFAULT 'percent' NOT NULL,
	"channel_online_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"channel_printed_type" varchar(20) DEFAULT 'percent' NOT NULL,
	"channel_printed_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"channel_pr_type" varchar(20) DEFAULT 'percent' NOT NULL,
	"channel_pr_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizer_commission_profiles_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "organizer_invoice_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"item_type" varchar(30) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizer_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp,
	"due_date" timestamp,
	"paid_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizer_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "organizer_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"duration_days" integer,
	"events_included" integer,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizer_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"billing_cycle" varchar(20) NOT NULL,
	"next_billing_date" timestamp,
	"events_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizer_wallet_ledger" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"wallet_id" varchar NOT NULL,
	"type" varchar(20) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"reference_type" varchar(20),
	"reference_id" varchar,
	"channel" varchar(20),
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizer_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"threshold_amount" numeric(12, 2) DEFAULT '1000' NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizer_wallets_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "pr_otp_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"phone" varchar(20) NOT NULL,
	"otp_code" varchar(10) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "price_list_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_list_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"supplier_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"agent_id" varchar,
	"profile_id" varchar,
	"ticket_id" varchar,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"printed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "printer_agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"user_id" varchar,
	"device_name" varchar(255) NOT NULL,
	"auth_token" varchar(128),
	"printer_model_id" varchar,
	"printer_name" varchar(255),
	"status" varchar(30) DEFAULT 'offline',
	"last_heartbeat" timestamp,
	"capabilities" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "printer_models" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"dpi" integer DEFAULT 203,
	"max_width_mm" integer DEFAULT 80,
	"connection_type" varchar(50) DEFAULT 'usb',
	"driver_notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "printer_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"agent_id" varchar,
	"printer_model_id" varchar,
	"name" varchar(100) NOT NULL,
	"paper_width_mm" integer DEFAULT 80 NOT NULL,
	"paper_height_mm" integer DEFAULT 50 NOT NULL,
	"margin_top_mm" integer DEFAULT 2,
	"margin_bottom_mm" integer DEFAULT 2,
	"margin_left_mm" integer DEFAULT 2,
	"margin_right_mm" integer DEFAULT 2,
	"template_json" jsonb,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"unit_of_measure" varchar(50) NOT NULL,
	"cost_price" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"min_threshold" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "public_cart_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"customer_id" varchar,
	"ticketed_event_id" varchar NOT NULL,
	"sector_id" varchar NOT NULL,
	"seat_id" varchar,
	"quantity" integer DEFAULT 1 NOT NULL,
	"ticket_type" varchar(20) DEFAULT 'intero' NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"participant_first_name" varchar(100),
	"participant_last_name" varchar(100),
	"reserved_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "public_checkout_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"customer_id" varchar NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_client_secret" varchar(500),
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"cart_snapshot" jsonb,
	"transaction_id" varchar,
	"refund_id" varchar(255),
	"refund_reason" text,
	"customer_ip" varchar(45),
	"customer_user_agent" text,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "public_customer_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "public_customer_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"supplier_id" varchar NOT NULL,
	"order_number" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"total_amount" numeric(10, 2),
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_badge_landings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"created_by_user_id" varchar NOT NULL,
	"school_name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"description" text,
	"authorized_domains" text[] DEFAULT ARRAY[]::text[],
	"primary_color" varchar(7) DEFAULT '#3b82f6',
	"is_active" boolean DEFAULT true NOT NULL,
	"require_phone" boolean DEFAULT true NOT NULL,
	"custom_welcome_text" text,
	"custom_thank_you_text" text,
	"terms_text" text,
	"privacy_text" text,
	"marketing_text" text,
	"require_terms" boolean DEFAULT true NOT NULL,
	"show_marketing" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "school_badge_landings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "school_badge_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landing_id" varchar NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255) NOT NULL,
	"verification_token" varchar(100),
	"token_expires_at" timestamp,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"ip_address" varchar(45),
	"accepted_terms" boolean DEFAULT false NOT NULL,
	"accepted_marketing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_badges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar NOT NULL,
	"unique_code" varchar(20) NOT NULL,
	"qr_code_url" text,
	"badge_image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "school_badges_unique_code_unique" UNIQUE("unique_code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siae_activation_cards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_code" varchar(20) NOT NULL,
	"system_code" varchar(8) NOT NULL,
	"company_id" varchar NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"activation_date" timestamp NOT NULL,
	"expiration_date" timestamp,
	"certificate_expiration" timestamp,
	"progressive_counter" integer DEFAULT 0 NOT NULL,
	"last_seal_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_activation_cards_card_code_unique" UNIQUE("card_code")
);
--> statement-breakpoint
CREATE TABLE "siae_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"user_id" varchar,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar,
	"description" text,
	"old_data" text,
	"new_data" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"fiscal_seal_code" varchar(16),
	"card_code" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_box_office_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"emission_channel_id" varchar NOT NULL,
	"location_id" varchar,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"cash_total" numeric(10, 2) DEFAULT '0',
	"card_total" numeric(10, 2) DEFAULT '0',
	"tickets_sold" integer DEFAULT 0 NOT NULL,
	"tickets_cancelled" integer DEFAULT 0 NOT NULL,
	"expected_cash" numeric(10, 2),
	"actual_cash" numeric(10, 2),
	"difference" numeric(10, 2),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_c1_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar,
	"ticketed_event_id" varchar,
	"report_date" timestamp NOT NULL,
	"report_data" jsonb,
	"status" varchar(20) DEFAULT 'draft',
	"transmitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_cancellation_reasons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"requires_reference" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_cancellation_reasons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "siae_cashier_allocations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"cashier_id" varchar NOT NULL,
	"sector_id" varchar,
	"quota_quantity" integer DEFAULT 0 NOT NULL,
	"quota_used" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_cashiers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"default_printer_agent_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_custom_ticket_prices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticketed_event_id" varchar,
	"name" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_customer_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_customer_wallets_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "siae_customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"unique_code" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password_hash" varchar(255),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"birth_date" timestamp,
	"birth_place" varchar(255),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"registration_completed" boolean DEFAULT false NOT NULL,
	"spid_code" varchar(100),
	"spid_provider" varchar(50),
	"registration_ip" varchar(45),
	"registration_date" timestamp DEFAULT now(),
	"authentication_type" varchar(10) DEFAULT 'OTP' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"blocked_until" timestamp,
	"block_reason" text,
	"reset_password_token" varchar(255),
	"reset_password_expires" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_customers_unique_code_unique" UNIQUE("unique_code"),
	CONSTRAINT "siae_customers_email_unique" UNIQUE("email"),
	CONSTRAINT "siae_customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "siae_emission_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"channel_code" varchar(8) NOT NULL,
	"channel_type" varchar(2) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location_id" varchar,
	"website_url" varchar(500),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"activated_at" timestamp DEFAULT now(),
	"deactivated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_emission_channels_channel_code_unique" UNIQUE("channel_code")
);
--> statement-breakpoint
CREATE TABLE "siae_event_genres" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(2) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"tax_type" varchar(1) DEFAULT 'S' NOT NULL,
	"vat_rate" numeric(5, 2),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_event_genres_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "siae_event_sectors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticketed_event_id" varchar NOT NULL,
	"sector_code" varchar(2) NOT NULL,
	"name" varchar(255) NOT NULL,
	"capacity" integer NOT NULL,
	"available_seats" integer NOT NULL,
	"is_numbered" boolean DEFAULT false NOT NULL,
	"price_intero" numeric(10, 2) NOT NULL,
	"price_ridotto" numeric(10, 2),
	"price_omaggio" numeric(10, 2) DEFAULT '0',
	"prevendita" numeric(10, 2) DEFAULT '0',
	"iva_rate" numeric(5, 2) DEFAULT '22',
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"sales_suspended" boolean DEFAULT false NOT NULL,
	"tickets_sold" integer DEFAULT 0 NOT NULL,
	"status_label" varchar(50) DEFAULT 'available',
	"availability_start" timestamp,
	"availability_end" timestamp,
	"custom_status_text" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_fiscal_seals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" varchar NOT NULL,
	"seal_code" varchar(16) NOT NULL,
	"progressive_number" integer NOT NULL,
	"emission_date" varchar(4) NOT NULL,
	"emission_time" varchar(4) NOT NULL,
	"amount" varchar(8) NOT NULL,
	"ticket_id" varchar,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_fiscal_seals_seal_code_unique" UNIQUE("seal_code")
);
--> statement-breakpoint
CREATE TABLE "siae_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"ticket_id" varchar,
	"transaction_id" varchar,
	"log_type" varchar(20) NOT NULL,
	"cf_organizzatore" varchar(16) NOT NULL,
	"cf_titolare" varchar(16) NOT NULL,
	"sigillo_fiscale" varchar(16),
	"codice_richiedente_emissione" varchar(8),
	"codice_locale" varchar(50),
	"tipo_genere" varchar(2),
	"data_evento" varchar(8),
	"ora_evento" varchar(4),
	"numero_progressivo" integer,
	"tipo_titolo" varchar(3),
	"codice_ordine" varchar(2),
	"corrispettivo_lordo" numeric(10, 2),
	"iva_corrispettivo" numeric(10, 2),
	"partecipante_nome" varchar(100),
	"partecipante_cognome" varchar(100),
	"codice_univoco_acquirente" varchar(50),
	"autenticazione" varchar(10),
	"causale_annullamento" varchar(3),
	"originale_riferimento_annullamento" integer,
	"carta_riferimento_annullamento" varchar(8),
	"xml_content" text,
	"transmission_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_name_changes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_ticket_id" varchar NOT NULL,
	"new_ticket_id" varchar,
	"requested_by_id" varchar NOT NULL,
	"requested_by_type" varchar(20) NOT NULL,
	"new_first_name" varchar(100) NOT NULL,
	"new_last_name" varchar(100) NOT NULL,
	"fee" numeric(10, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"processed_by_user_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_numbered_seats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector_id" varchar NOT NULL,
	"row_number" varchar(10) NOT NULL,
	"seat_number" varchar(10) NOT NULL,
	"category" varchar(50) DEFAULT 'standard',
	"price_multiplier" numeric(3, 2) DEFAULT '1.00',
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"x_position" numeric(8, 2),
	"y_position" numeric(8, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_otp_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar,
	"phone" varchar(20) NOT NULL,
	"otp_code" varchar(10) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_resales" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_ticket_id" varchar NOT NULL,
	"new_ticket_id" varchar,
	"seller_id" varchar NOT NULL,
	"buyer_id" varchar,
	"original_price" numeric(10, 2) NOT NULL,
	"resale_price" numeric(10, 2) NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0',
	"prezzo_massimo" numeric(10, 2),
	"causale_rivendita" varchar(3) DEFAULT 'IMP' NOT NULL,
	"causale_dettaglio" text,
	"venditore_verificato" boolean DEFAULT false NOT NULL,
	"venditore_documento_tipo" varchar(20),
	"venditore_documento_numero" varchar(50),
	"venditore_verifica_data" timestamp,
	"venditore_verifica_operatore" varchar(100),
	"acquirente_verificato" boolean DEFAULT false NOT NULL,
	"acquirente_documento_tipo" varchar(20),
	"acquirente_documento_numero" varchar(50),
	"acquirente_verifica_data" timestamp,
	"acquirente_verifica_operatore" varchar(100),
	"controllo_prezzo_eseguito" boolean DEFAULT false NOT NULL,
	"controllo_prezzo_superato" boolean DEFAULT false NOT NULL,
	"controllo_prezzo_data" timestamp,
	"controllo_prezzo_note" text,
	"log_controlli" text,
	"status" varchar(20) DEFAULT 'listed' NOT NULL,
	"motivo_rifiuto" varchar(255),
	"listed_at" timestamp DEFAULT now(),
	"sold_at" timestamp,
	"cancelled_at" timestamp,
	"expires_at" timestamp,
	"transmission_id" varchar,
	"sigillo_fiscale_rivendita" varchar(16),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_seats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector_id" varchar NOT NULL,
	"floor_plan_seat_id" varchar,
	"row" varchar(10),
	"seat_number" varchar(10) NOT NULL,
	"seat_label" varchar(30),
	"pos_x" numeric(10, 4),
	"pos_y" numeric(10, 4),
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"ticket_id" varchar,
	"is_accessible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_sector_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(2) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_sector_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "siae_service_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_service_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "siae_smart_card_seal_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"fiscal_seal_id" varchar,
	"ticket_id" varchar,
	"seal_code" varchar(16) NOT NULL,
	"progressive_number" integer NOT NULL,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "siae_smart_card_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reader_id" varchar(100) NOT NULL,
	"reader_name" varchar(255) NOT NULL,
	"reader_model" varchar(100) DEFAULT 'MiniLector EVO V3',
	"reader_vendor" varchar(100) DEFAULT 'Bit4id',
	"card_atr" varchar(100),
	"card_type" varchar(100),
	"card_serial_number" varchar(50),
	"status" varchar(20) DEFAULT 'connected' NOT NULL,
	"tickets_emitted_count" integer DEFAULT 0 NOT NULL,
	"seals_used_count" integer DEFAULT 0 NOT NULL,
	"user_id" varchar,
	"workstation_id" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"disconnected_at" timestamp,
	"last_error" text,
	"error_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siae_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"subscription_code" varchar(50) NOT NULL,
	"progressive_number" integer NOT NULL,
	"turn_type" varchar(1) DEFAULT 'F' NOT NULL,
	"events_count" integer NOT NULL,
	"events_used" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"rateo_per_event" numeric(10, 2),
	"rateo_vat" numeric(10, 2),
	"holder_first_name" varchar(100) NOT NULL,
	"holder_last_name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"ticketed_event_id" varchar,
	"sector_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_subscriptions_subscription_code_unique" UNIQUE("subscription_code")
);
--> statement-breakpoint
CREATE TABLE "siae_system_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar,
	"business_name" varchar(255),
	"business_address" text,
	"business_city" varchar(100),
	"business_province" varchar(2),
	"business_postal_code" varchar(10),
	"system_code" varchar(8),
	"tax_id" varchar(16),
	"vat_number" varchar(11),
	"pec_email" varchar(255),
	"siae_email" varchar(255),
	"captcha_enabled" boolean DEFAULT true NOT NULL,
	"captcha_min_chars" integer DEFAULT 5 NOT NULL,
	"captcha_image_width" integer DEFAULT 400 NOT NULL,
	"captcha_image_height" integer DEFAULT 200 NOT NULL,
	"captcha_fonts" text[] DEFAULT ARRAY['Arial', 'Verdana']::text[],
	"captcha_distortion" varchar(20) DEFAULT 'medium',
	"captcha_audio_enabled" boolean DEFAULT true NOT NULL,
	"otp_enabled" boolean DEFAULT true NOT NULL,
	"otp_digits" integer DEFAULT 6 NOT NULL,
	"otp_timeout_seconds" integer DEFAULT 300 NOT NULL,
	"otp_max_attempts" integer DEFAULT 3 NOT NULL,
	"otp_cooldown_seconds" integer DEFAULT 60 NOT NULL,
	"otp_provider" varchar(50) DEFAULT 'twilio',
	"otp_voice_enabled" boolean DEFAULT true NOT NULL,
	"spid_enabled" boolean DEFAULT false NOT NULL,
	"spid_level" integer DEFAULT 2 NOT NULL,
	"spid_providers" text[] DEFAULT ARRAY['poste', 'aruba']::text[],
	"max_tickets_per_event" integer DEFAULT 10 NOT NULL,
	"capacity_threshold" integer DEFAULT 5000 NOT NULL,
	"nominative_tickets_enabled" boolean DEFAULT true NOT NULL,
	"change_name_enabled" boolean DEFAULT true NOT NULL,
	"resale_enabled" boolean DEFAULT true NOT NULL,
	"ticket_template_pdf" text,
	"ticket_template_print" text,
	"auto_transmit_daily" boolean DEFAULT false NOT NULL,
	"transmission_pec_address" varchar(255) DEFAULT 'misuratorifiscali@pec.agenziaentrate.it',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_ticket_audit" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"ticket_id" varchar NOT NULL,
	"operation_type" varchar(20) NOT NULL,
	"performed_by" varchar NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_ticket_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_ticket_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "siae_ticketed_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"siae_event_code" varchar(50),
	"siae_location_code" varchar(50),
	"organizer_type" varchar(10),
	"genre_code" varchar(2) NOT NULL,
	"tax_type" varchar(1) DEFAULT 'S' NOT NULL,
	"iva_preassolta" varchar(1) DEFAULT 'N' NOT NULL,
	"total_capacity" integer NOT NULL,
	"requires_nominative" boolean DEFAULT true NOT NULL,
	"allows_change_name" boolean DEFAULT false NOT NULL,
	"allows_resale" boolean DEFAULT false NOT NULL,
	"sale_start_date" timestamp,
	"sale_end_date" timestamp,
	"max_tickets_per_user" integer DEFAULT 10 NOT NULL,
	"ticketing_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"tickets_sold" integer DEFAULT 0 NOT NULL,
	"tickets_cancelled" integer DEFAULT 0 NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_ticketed_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "siae_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticketed_event_id" varchar NOT NULL,
	"sector_id" varchar NOT NULL,
	"transaction_id" varchar,
	"customer_id" varchar,
	"fiscal_seal_id" varchar,
	"fiscal_seal_code" varchar(16),
	"progressive_number" integer NOT NULL,
	"card_code" varchar(20),
	"emission_channel_code" varchar(8),
	"emission_date" timestamp DEFAULT now() NOT NULL,
	"emission_date_str" varchar(8),
	"emission_time_str" varchar(4),
	"ticket_type_code" varchar(3) NOT NULL,
	"sector_code" varchar(2) NOT NULL,
	"seat_id" varchar,
	"row" varchar(10),
	"seat_number" varchar(10),
	"gross_amount" numeric(10, 2) NOT NULL,
	"net_amount" numeric(10, 2),
	"vat_amount" numeric(10, 2),
	"prevendita" numeric(10, 2) DEFAULT '0',
	"prevendita_vat" numeric(10, 2),
	"participant_first_name" varchar(100),
	"participant_last_name" varchar(100),
	"ticket_code" varchar(50),
	"ticket_type" varchar(30),
	"ticket_price" numeric(10, 2),
	"issued_by_user_id" varchar,
	"is_complimentary" boolean DEFAULT false,
	"payment_method" varchar(30),
	"status" varchar(20) DEFAULT 'valid' NOT NULL,
	"used_at" timestamp,
	"used_by_scanner_id" varchar,
	"cancellation_reason_code" varchar(3),
	"cancellation_date" timestamp,
	"cancelled_by_user_id" varchar,
	"original_ticket_id" varchar,
	"replaced_by_ticket_id" varchar,
	"refunded_at" timestamp,
	"refund_amount" numeric(10, 2),
	"stripe_refund_id" varchar(100),
	"refund_initiator_id" varchar,
	"refund_reason" varchar(255),
	"qr_code" text,
	"pdf_url" varchar(500),
	"custom_text" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_code" varchar(50) NOT NULL,
	"ticketed_event_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"emission_channel_code" varchar(8) NOT NULL,
	"customer_unique_code" varchar(50) NOT NULL,
	"customer_phone" varchar(20),
	"customer_email" varchar(255),
	"transaction_ip" varchar(45),
	"checkout_started_at" timestamp,
	"payment_completed_at" timestamp,
	"payment_method" varchar(50),
	"payment_reference" varchar(100),
	"total_amount" numeric(12, 2) NOT NULL,
	"total_vat" numeric(10, 2),
	"total_prevendita" numeric(10, 2),
	"tickets_count" integer DEFAULT 0 NOT NULL,
	"delivery_method" varchar(50),
	"delivery_address" text,
	"delivered_at" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "siae_transactions_transaction_code_unique" UNIQUE("transaction_code")
);
--> statement-breakpoint
CREATE TABLE "siae_transmissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"transmission_type" varchar(20) NOT NULL,
	"period_date" timestamp NOT NULL,
	"versione_tracciato" varchar(10) DEFAULT '2025.1' NOT NULL,
	"codice_intervento" varchar(3),
	"identificativo_mittente" varchar(50),
	"progressivo_invio" integer DEFAULT 1 NOT NULL,
	"motivo_rettifica" varchar(255),
	"riferimento_trasmissione_originale" varchar(50),
	"cf_organizzatore" varchar(16),
	"matricola_misuratore_fiscale" varchar(20),
	"file_name" varchar(255),
	"file_extension" varchar(4) DEFAULT '.XST' NOT NULL,
	"file_content" text,
	"file_hash" varchar(64),
	"digital_signature" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"sent_to_pec" varchar(255),
	"pec_message_id" varchar(255),
	"received_at" timestamp,
	"receipt_content" text,
	"receipt_protocol" varchar(50),
	"error_message" text,
	"error_code" varchar(10),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"tickets_count" integer DEFAULT 0 NOT NULL,
	"tickets_cancelled" integer DEFAULT 0 NOT NULL,
	"tickets_changed" integer DEFAULT 0 NOT NULL,
	"tickets_resold" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(12, 2),
	"total_iva" numeric(12, 2),
	"total_imposta_intrattenimento" numeric(12, 2),
	"total_esenti" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "siae_wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"description" text,
	"ticket_id" varchar,
	"transaction_id" varchar,
	"resale_id" varchar,
	"stripe_payment_intent_id" varchar(255),
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"user_id" varchar,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"fiscal_code" varchar(16),
	"email" varchar(255),
	"phone" varchar(50),
	"role" varchar(100) NOT NULL,
	"hourly_rate" numeric(10, 2),
	"fixed_rate" numeric(10, 2),
	"bank_iban" varchar(34),
	"address" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"staff_id" varchar NOT NULL,
	"role" varchar(100),
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"compensation_type" varchar(50) DEFAULT 'fixed',
	"compensation_amount" numeric(10, 2),
	"bonus" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"staff_id" varchar NOT NULL,
	"event_id" varchar,
	"assignment_id" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"payment_date" timestamp,
	"payment_method" varchar(50),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"event_id" varchar,
	"name" varchar(255) NOT NULL,
	"bartender_ids" varchar[] DEFAULT ARRAY[]::varchar[],
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"from_location_id" varchar,
	"from_event_id" varchar,
	"from_station_id" varchar,
	"to_location_id" varchar,
	"to_event_id" varchar,
	"to_station_id" varchar,
	"quantity" numeric(10, 2) NOT NULL,
	"type" varchar(50) NOT NULL,
	"reason" text,
	"supplier" varchar(255),
	"performed_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"location_id" varchar,
	"event_id" varchar,
	"station_id" varchar,
	"quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"vat_number" varchar(50),
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "table_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"booked_by_user_id" varchar,
	"customer_id" varchar,
	"customer_name" varchar(255),
	"customer_phone" varchar(20),
	"customer_email" varchar(255),
	"guests_count" integer DEFAULT 1 NOT NULL,
	"guest_names" text[] DEFAULT ARRAY[]::text[],
	"qr_code" varchar(100) NOT NULL,
	"qr_scanned_at" timestamp,
	"qr_scanned_by_user_id" varchar,
	"deposit_amount" numeric(10, 2),
	"deposit_paid" boolean DEFAULT false NOT NULL,
	"total_spent" numeric(10, 2),
	"payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp,
	"arrived_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "table_bookings_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "table_guests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"gender" varchar(1),
	"email" varchar(255),
	"client_user_id" varchar,
	"qr_code" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"checked_in_at" timestamp,
	"checked_in_by" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "table_guests_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "table_reservations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_type_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"reservation_name" varchar(255) NOT NULL,
	"reservation_phone" varchar(20),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"approved_by" varchar,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"created_by" varchar,
	"created_by_role" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "table_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"max_guests" integer NOT NULL,
	"total_quantity" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_template_elements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"field_key" varchar(100),
	"static_value" text,
	"x" numeric(8, 2) DEFAULT '0' NOT NULL,
	"y" numeric(8, 2) DEFAULT '0' NOT NULL,
	"width" numeric(8, 2) DEFAULT '20' NOT NULL,
	"height" numeric(8, 2) DEFAULT '5' NOT NULL,
	"rotation" integer DEFAULT 0,
	"font_family" varchar(100) DEFAULT 'Arial',
	"font_size" integer DEFAULT 12,
	"font_weight" varchar(20) DEFAULT 'normal',
	"text_align" varchar(20) DEFAULT 'left',
	"color" varchar(20) DEFAULT '#000000',
	"barcode_format" varchar(50),
	"qr_error_correction" varchar(1) DEFAULT 'M',
	"z_index" integer DEFAULT 0,
	"visibility_conditions" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar,
	"name" varchar(255) NOT NULL,
	"background_image_url" text,
	"paper_width_mm" integer DEFAULT 80 NOT NULL,
	"paper_height_mm" integer DEFAULT 50 NOT NULL,
	"print_orientation" varchar(20) DEFAULT 'auto',
	"dpi" integer DEFAULT 203,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_features" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"beverage_enabled" boolean DEFAULT true NOT NULL,
	"contabilita_enabled" boolean DEFAULT false NOT NULL,
	"personale_enabled" boolean DEFAULT false NOT NULL,
	"cassa_enabled" boolean DEFAULT false NOT NULL,
	"night_file_enabled" boolean DEFAULT false NOT NULL,
	"siae_enabled" boolean DEFAULT false NOT NULL,
	"can_create_products" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_features_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"phone" varchar(20),
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'gestore' NOT NULL,
	"company_id" varchar,
	"parent_user_id" varchar,
	"email_verified" boolean DEFAULT false,
	"phone_verified" boolean DEFAULT false,
	"verification_token" varchar,
	"reset_password_token" varchar,
	"reset_password_expires" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_printer_agent_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venue_floor_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"image_width" integer NOT NULL,
	"image_height" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounting_documents" ADD CONSTRAINT "accounting_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_documents" ADD CONSTRAINT "accounting_documents_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_documents" ADD CONSTRAINT "accounting_documents_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_position_id_cash_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."cash_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_funds" ADD CONSTRAINT "cash_funds_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_funds" ADD CONSTRAINT "cash_funds_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_funds" ADD CONSTRAINT "cash_funds_position_id_cash_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."cash_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_funds" ADD CONSTRAINT "cash_funds_operator_id_staff_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_positions" ADD CONSTRAINT "cash_positions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_positions" ADD CONSTRAINT "cash_positions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_positions" ADD CONSTRAINT "cash_positions_sector_id_cash_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."cash_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_positions" ADD CONSTRAINT "cash_positions_operator_id_staff_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sectors" ADD CONSTRAINT "cash_sectors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_sessions" ADD CONSTRAINT "cashier_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_sessions" ADD CONSTRAINT "cashier_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_sessions" ADD CONSTRAINT "cashier_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_sessions" ADD CONSTRAINT "cashier_sessions_printer_agent_id_printer_agents_id_fk" FOREIGN KEY ("printer_agent_id") REFERENCES "public"."printer_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_features" ADD CONSTRAINT "company_features_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_ticket_templates" ADD CONSTRAINT "digital_ticket_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e4u_staff_assignments" ADD CONSTRAINT "e4u_staff_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e4u_staff_assignments" ADD CONSTRAINT "e4u_staff_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e4u_staff_assignments" ADD CONSTRAINT "e4u_staff_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_floorplans" ADD CONSTRAINT "event_floorplans_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_floorplans" ADD CONSTRAINT "event_floorplans_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_formats" ADD CONSTRAINT "event_formats_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_lists" ADD CONSTRAINT "event_lists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_lists" ADD CONSTRAINT "event_lists_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_pr_assignments" ADD CONSTRAINT "event_pr_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_pr_assignments" ADD CONSTRAINT "event_pr_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_pr_assignments" ADD CONSTRAINT "event_pr_assignments_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_pr_assignments" ADD CONSTRAINT "event_pr_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_scanners" ADD CONSTRAINT "event_scanners_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_scanners" ADD CONSTRAINT "event_scanners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_scanners" ADD CONSTRAINT "event_scanners_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tables" ADD CONSTRAINT "event_tables_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tables" ADD CONSTRAINT "event_tables_floorplan_id_event_floorplans_id_fk" FOREIGN KEY ("floorplan_id") REFERENCES "public"."event_floorplans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tables" ADD CONSTRAINT "event_tables_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_zone_mappings" ADD CONSTRAINT "event_zone_mappings_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_zone_mappings" ADD CONSTRAINT "event_zone_mappings_zone_id_floor_plan_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."floor_plan_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_zone_mappings" ADD CONSTRAINT "event_zone_mappings_sector_id_siae_event_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."siae_event_sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_format_id_event_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "public"."event_formats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_costs" ADD CONSTRAINT "extra_costs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_costs" ADD CONSTRAINT "extra_costs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_costs" ADD CONSTRAINT "extra_costs_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plan_seats" ADD CONSTRAINT "floor_plan_seats_zone_id_floor_plan_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."floor_plan_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plan_zones" ADD CONSTRAINT "floor_plan_zones_floor_plan_id_venue_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."venue_floor_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_guest_list_id_guest_lists_id_fk" FOREIGN KEY ("guest_list_id") REFERENCES "public"."guest_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_qr_scanned_by_user_id_users_id_fk" FOREIGN KEY ("qr_scanned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_lists" ADD CONSTRAINT "guest_lists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_lists" ADD CONSTRAINT "guest_lists_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_lists" ADD CONSTRAINT "guest_lists_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_list_id_event_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."event_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_files" ADD CONSTRAINT "night_files_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_files" ADD CONSTRAINT "night_files_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_files" ADD CONSTRAINT "night_files_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_commission_profiles" ADD CONSTRAINT "organizer_commission_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_invoice_items" ADD CONSTRAINT "organizer_invoice_items_invoice_id_organizer_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."organizer_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_invoices" ADD CONSTRAINT "organizer_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_subscriptions" ADD CONSTRAINT "organizer_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_subscriptions" ADD CONSTRAINT "organizer_subscriptions_plan_id_organizer_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."organizer_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_wallet_ledger" ADD CONSTRAINT "organizer_wallet_ledger_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_wallet_ledger" ADD CONSTRAINT "organizer_wallet_ledger_wallet_id_organizer_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."organizer_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_wallets" ADD CONSTRAINT "organizer_wallets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_otp_attempts" ADD CONSTRAINT "pr_otp_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_agent_id_printer_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."printer_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_profile_id_printer_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."printer_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printer_agents" ADD CONSTRAINT "printer_agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printer_agents" ADD CONSTRAINT "printer_agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printer_agents" ADD CONSTRAINT "printer_agents_printer_model_id_printer_models_id_fk" FOREIGN KEY ("printer_model_id") REFERENCES "public"."printer_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printer_profiles" ADD CONSTRAINT "printer_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printer_profiles" ADD CONSTRAINT "printer_profiles_agent_id_printer_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."printer_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printer_profiles" ADD CONSTRAINT "printer_profiles_printer_model_id_printer_models_id_fk" FOREIGN KEY ("printer_model_id") REFERENCES "public"."printer_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_cart_items" ADD CONSTRAINT "public_cart_items_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_cart_items" ADD CONSTRAINT "public_cart_items_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_cart_items" ADD CONSTRAINT "public_cart_items_sector_id_siae_event_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."siae_event_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_cart_items" ADD CONSTRAINT "public_cart_items_seat_id_siae_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."siae_seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_checkout_sessions" ADD CONSTRAINT "public_checkout_sessions_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_checkout_sessions" ADD CONSTRAINT "public_checkout_sessions_transaction_id_siae_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."siae_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_customer_sessions" ADD CONSTRAINT "public_customer_sessions_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_badge_landings" ADD CONSTRAINT "school_badge_landings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_badge_landings" ADD CONSTRAINT "school_badge_landings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_badge_requests" ADD CONSTRAINT "school_badge_requests_landing_id_school_badge_landings_id_fk" FOREIGN KEY ("landing_id") REFERENCES "public"."school_badge_landings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_badges" ADD CONSTRAINT "school_badges_request_id_school_badge_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."school_badge_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_activation_cards" ADD CONSTRAINT "siae_activation_cards_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_audit_logs" ADD CONSTRAINT "siae_audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_box_office_sessions" ADD CONSTRAINT "siae_box_office_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_box_office_sessions" ADD CONSTRAINT "siae_box_office_sessions_emission_channel_id_siae_emission_channels_id_fk" FOREIGN KEY ("emission_channel_id") REFERENCES "public"."siae_emission_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_box_office_sessions" ADD CONSTRAINT "siae_box_office_sessions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_c1_reports" ADD CONSTRAINT "siae_c1_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_c1_reports" ADD CONSTRAINT "siae_c1_reports_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_cashier_allocations" ADD CONSTRAINT "siae_cashier_allocations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_cashier_allocations" ADD CONSTRAINT "siae_cashier_allocations_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_cashier_allocations" ADD CONSTRAINT "siae_cashier_allocations_cashier_id_siae_cashiers_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."siae_cashiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_cashier_allocations" ADD CONSTRAINT "siae_cashier_allocations_sector_id_siae_event_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."siae_event_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_cashiers" ADD CONSTRAINT "siae_cashiers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_custom_ticket_prices" ADD CONSTRAINT "siae_custom_ticket_prices_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_customer_wallets" ADD CONSTRAINT "siae_customer_wallets_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_customers" ADD CONSTRAINT "siae_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_emission_channels" ADD CONSTRAINT "siae_emission_channels_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_emission_channels" ADD CONSTRAINT "siae_emission_channels_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_event_sectors" ADD CONSTRAINT "siae_event_sectors_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_fiscal_seals" ADD CONSTRAINT "siae_fiscal_seals_card_id_siae_activation_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."siae_activation_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_logs" ADD CONSTRAINT "siae_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_logs" ADD CONSTRAINT "siae_logs_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_logs" ADD CONSTRAINT "siae_logs_transaction_id_siae_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."siae_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_logs" ADD CONSTRAINT "siae_logs_transmission_id_siae_transmissions_id_fk" FOREIGN KEY ("transmission_id") REFERENCES "public"."siae_transmissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_name_changes" ADD CONSTRAINT "siae_name_changes_original_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("original_ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_name_changes" ADD CONSTRAINT "siae_name_changes_new_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("new_ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_name_changes" ADD CONSTRAINT "siae_name_changes_processed_by_user_id_users_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_numbered_seats" ADD CONSTRAINT "siae_numbered_seats_sector_id_siae_event_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."siae_event_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_otp_attempts" ADD CONSTRAINT "siae_otp_attempts_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_resales" ADD CONSTRAINT "siae_resales_original_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("original_ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_resales" ADD CONSTRAINT "siae_resales_new_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("new_ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_resales" ADD CONSTRAINT "siae_resales_seller_id_siae_customers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_resales" ADD CONSTRAINT "siae_resales_buyer_id_siae_customers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_resales" ADD CONSTRAINT "siae_resales_transmission_id_siae_transmissions_id_fk" FOREIGN KEY ("transmission_id") REFERENCES "public"."siae_transmissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_seats" ADD CONSTRAINT "siae_seats_sector_id_siae_event_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."siae_event_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_smart_card_seal_logs" ADD CONSTRAINT "siae_smart_card_seal_logs_session_id_siae_smart_card_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."siae_smart_card_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_smart_card_seal_logs" ADD CONSTRAINT "siae_smart_card_seal_logs_fiscal_seal_id_siae_fiscal_seals_id_fk" FOREIGN KEY ("fiscal_seal_id") REFERENCES "public"."siae_fiscal_seals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_smart_card_seal_logs" ADD CONSTRAINT "siae_smart_card_seal_logs_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_smart_card_sessions" ADD CONSTRAINT "siae_smart_card_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_subscriptions" ADD CONSTRAINT "siae_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_subscriptions" ADD CONSTRAINT "siae_subscriptions_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_subscriptions" ADD CONSTRAINT "siae_subscriptions_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_subscriptions" ADD CONSTRAINT "siae_subscriptions_sector_id_siae_event_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."siae_event_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_system_config" ADD CONSTRAINT "siae_system_config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_ticket_audit" ADD CONSTRAINT "siae_ticket_audit_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_ticket_audit" ADD CONSTRAINT "siae_ticket_audit_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_ticketed_events" ADD CONSTRAINT "siae_ticketed_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_ticketed_events" ADD CONSTRAINT "siae_ticketed_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_tickets" ADD CONSTRAINT "siae_tickets_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_tickets" ADD CONSTRAINT "siae_tickets_sector_id_siae_event_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."siae_event_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_tickets" ADD CONSTRAINT "siae_tickets_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_tickets" ADD CONSTRAINT "siae_tickets_seat_id_siae_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."siae_seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_transactions" ADD CONSTRAINT "siae_transactions_ticketed_event_id_siae_ticketed_events_id_fk" FOREIGN KEY ("ticketed_event_id") REFERENCES "public"."siae_ticketed_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_transactions" ADD CONSTRAINT "siae_transactions_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_transmissions" ADD CONSTRAINT "siae_transmissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_wallet_transactions" ADD CONSTRAINT "siae_wallet_transactions_wallet_id_siae_customer_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."siae_customer_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_wallet_transactions" ADD CONSTRAINT "siae_wallet_transactions_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_wallet_transactions" ADD CONSTRAINT "siae_wallet_transactions_ticket_id_siae_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."siae_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_wallet_transactions" ADD CONSTRAINT "siae_wallet_transactions_transaction_id_siae_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."siae_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siae_wallet_transactions" ADD CONSTRAINT "siae_wallet_transactions_resale_id_siae_resales_id_fk" FOREIGN KEY ("resale_id") REFERENCES "public"."siae_resales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_payments" ADD CONSTRAINT "staff_payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_payments" ADD CONSTRAINT "staff_payments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_payments" ADD CONSTRAINT "staff_payments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_payments" ADD CONSTRAINT "staff_payments_assignment_id_staff_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."staff_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_event_id_events_id_fk" FOREIGN KEY ("from_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_station_id_stations_id_fk" FOREIGN KEY ("from_station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_event_id_events_id_fk" FOREIGN KEY ("to_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_station_id_stations_id_fk" FOREIGN KEY ("to_station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_bookings" ADD CONSTRAINT "table_bookings_table_id_event_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."event_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_bookings" ADD CONSTRAINT "table_bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_bookings" ADD CONSTRAINT "table_bookings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_bookings" ADD CONSTRAINT "table_bookings_booked_by_user_id_users_id_fk" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_bookings" ADD CONSTRAINT "table_bookings_customer_id_siae_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."siae_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_bookings" ADD CONSTRAINT "table_bookings_qr_scanned_by_user_id_users_id_fk" FOREIGN KEY ("qr_scanned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_guests" ADD CONSTRAINT "table_guests_reservation_id_table_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."table_reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_guests" ADD CONSTRAINT "table_guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_guests" ADD CONSTRAINT "table_guests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_guests" ADD CONSTRAINT "table_guests_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_guests" ADD CONSTRAINT "table_guests_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_table_type_id_table_types_id_fk" FOREIGN KEY ("table_type_id") REFERENCES "public"."table_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_types" ADD CONSTRAINT "table_types_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_types" ADD CONSTRAINT "table_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_template_elements" ADD CONSTRAINT "ticket_template_elements_template_id_ticket_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."ticket_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_templates" ADD CONSTRAINT "ticket_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_features" ADD CONSTRAINT "user_features_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_floor_plans" ADD CONSTRAINT "venue_floor_plans_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");