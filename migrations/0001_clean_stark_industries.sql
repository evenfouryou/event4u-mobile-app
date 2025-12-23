ALTER TABLE "user_companies" ALTER COLUMN "role" SET DEFAULT 'owner';--> statement-breakpoint
ALTER TABLE "user_companies" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_companies" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE INDEX "idx_user_companies_user" ON "user_companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_companies_company" ON "user_companies" USING btree ("company_id");