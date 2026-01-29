import { db } from '../db';
import { sql } from 'drizzle-orm';

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  let normalized = phone.replace(/[^\d+]/g, '');
  
  if (normalized.startsWith('0039')) {
    normalized = '+39' + normalized.slice(4);
  }
  if (normalized.startsWith('39') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  if (!normalized.startsWith('+')) {
    normalized = '+39' + normalized;
  }
  if (normalized.startsWith('+390')) {
    normalized = '+39' + normalized.slice(4);
  }
  
  return normalized.length >= 10 ? normalized : null;
}

export async function runIdentityUnificationMigration(): Promise<void> {
  console.log('[IDENTITY-MIGRATION] Starting identity unification migration...');
  console.log('[IDENTITY-MIGRATION] Environment:', process.env.NODE_ENV || 'unknown');
  console.log('[IDENTITY-MIGRATION] Database URL prefix:', process.env.DATABASE_URL?.substring(0, 30) + '...');
  
  try {
    // Log current record counts
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const customerCount = await db.execute(sql`SELECT COUNT(*) as count FROM siae_customers`);
    const prCount = await db.execute(sql`SELECT COUNT(*) as count FROM pr_profiles`);
    console.log('[IDENTITY-MIGRATION] Current counts - Users:', userCount.rows[0]?.count, 
                'Customers:', customerCount.rows[0]?.count, 
                'PR Profiles:', prCount.rows[0]?.count);
    
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'identities'
      ) as exists
    `);
    
    const exists = tableExists.rows[0]?.exists === true;
    
    if (!exists) {
      console.log('[IDENTITY-MIGRATION] Creating identities table...');
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS identities (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255),
          email_verified BOOLEAN DEFAULT false,
          phone VARCHAR(30),
          phone_normalized VARCHAR(20),
          phone_verified BOOLEAN DEFAULT false,
          gender VARCHAR(1),
          birth_date TIMESTAMP,
          birth_place VARCHAR(255),
          street VARCHAR(255),
          city VARCHAR(100),
          province VARCHAR(5),
          postal_code VARCHAR(10),
          country VARCHAR(2) DEFAULT 'IT',
          merged_from_ids TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_identities_phone_normalized ON identities(phone_normalized)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_identities_email ON identities(email)
      `);
      
      console.log('[IDENTITY-MIGRATION] Identities table created successfully');
    } else {
      console.log('[IDENTITY-MIGRATION] Identities table already exists');
    }
    
    const usersHasIdentityId = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'identity_id'
      ) as exists
    `);
    
    if (!usersHasIdentityId.rows[0]?.exists) {
      console.log('[IDENTITY-MIGRATION] Adding identity_id column to users table...');
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN identity_id VARCHAR REFERENCES identities(id)
      `);
    }
    
    const siaeHasIdentityId = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'siae_customers' AND column_name = 'identity_id'
      ) as exists
    `);
    
    if (!siaeHasIdentityId.rows[0]?.exists) {
      console.log('[IDENTITY-MIGRATION] Adding identity_id column to siae_customers table...');
      await db.execute(sql`
        ALTER TABLE siae_customers ADD COLUMN identity_id VARCHAR REFERENCES identities(id)
      `);
    }
    
    const prHasIdentityId = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pr_profiles' AND column_name = 'identity_id'
      ) as exists
    `);
    
    if (!prHasIdentityId.rows[0]?.exists) {
      console.log('[IDENTITY-MIGRATION] Adding identity_id column to pr_profiles table...');
      await db.execute(sql`
        ALTER TABLE pr_profiles ADD COLUMN identity_id VARCHAR REFERENCES identities(id)
      `);
    }
    
    console.log('[IDENTITY-MIGRATION] Backfilling identities from existing data...');
    
    const usersResult = await db.execute(sql`
      SELECT id, first_name, last_name, email, phone, email_verified, phone_verified
      FROM users
      WHERE identity_id IS NULL
    `);
    
    let usersProcessed = 0;
    let usersLinked = 0;
    let usersCreated = 0;
    
    for (const user of usersResult.rows) {
      const phoneNormalized = normalizePhone(user.phone as string);
      const email = user.email as string;
      const firstName = (user.first_name as string) || 'User';
      const lastName = (user.last_name as string) || 'Account';
      
      let identityId: string | null = null;
      
      if (phoneNormalized) {
        const existingByPhone = await db.execute(sql`
          SELECT id FROM identities WHERE phone_normalized = ${phoneNormalized} LIMIT 1
        `);
        if (existingByPhone.rows.length > 0) {
          identityId = existingByPhone.rows[0].id as string;
          usersLinked++;
        }
      }
      
      if (!identityId && email) {
        const existingByEmail = await db.execute(sql`
          SELECT id FROM identities WHERE LOWER(email) = LOWER(${email}) LIMIT 1
        `);
        if (existingByEmail.rows.length > 0) {
          identityId = existingByEmail.rows[0].id as string;
          usersLinked++;
        }
      }
      
      if (!identityId) {
        const newIdentity = await db.execute(sql`
          INSERT INTO identities (first_name, last_name, email, email_verified, phone, phone_normalized, phone_verified)
          VALUES (${firstName}, ${lastName}, ${email}, ${user.email_verified || false}, ${user.phone}, ${phoneNormalized}, ${user.phone_verified || false})
          RETURNING id
        `);
        identityId = newIdentity.rows[0].id as string;
        usersCreated++;
      }
      
      await db.execute(sql`
        UPDATE users SET identity_id = ${identityId} WHERE id = ${user.id}
      `);
      
      usersProcessed++;
    }
    
    console.log(`[IDENTITY-MIGRATION] Users: ${usersProcessed} processed, ${usersLinked} linked to existing, ${usersCreated} new identities created`);
    
    const siaeResult = await db.execute(sql`
      SELECT id, first_name, last_name, email, phone, email_verified, phone_verified, 
             gender, birth_date, birth_place, street, city, province, postal_code, country
      FROM siae_customers
      WHERE identity_id IS NULL
    `);
    
    let siaeProcessed = 0;
    let siaeLinked = 0;
    let siaeCreated = 0;
    
    for (const customer of siaeResult.rows) {
      const phoneNormalized = normalizePhone(customer.phone as string);
      const email = customer.email as string;
      const firstName = customer.first_name as string;
      const lastName = customer.last_name as string;
      
      let identityId: string | null = null;
      
      if (phoneNormalized) {
        const existingByPhone = await db.execute(sql`
          SELECT id FROM identities WHERE phone_normalized = ${phoneNormalized} LIMIT 1
        `);
        if (existingByPhone.rows.length > 0) {
          identityId = existingByPhone.rows[0].id as string;
          siaeLinked++;
          
          await db.execute(sql`
            UPDATE identities SET
              gender = COALESCE(gender, ${customer.gender}),
              birth_date = COALESCE(birth_date, ${customer.birth_date}),
              birth_place = COALESCE(birth_place, ${customer.birth_place}),
              street = COALESCE(street, ${customer.street}),
              city = COALESCE(city, ${customer.city}),
              province = COALESCE(province, ${customer.province}),
              postal_code = COALESCE(postal_code, ${customer.postal_code}),
              country = COALESCE(country, ${customer.country}),
              updated_at = NOW()
            WHERE id = ${identityId}
          `);
        }
      }
      
      if (!identityId && email) {
        const existingByEmail = await db.execute(sql`
          SELECT id FROM identities WHERE LOWER(email) = LOWER(${email}) LIMIT 1
        `);
        if (existingByEmail.rows.length > 0) {
          identityId = existingByEmail.rows[0].id as string;
          siaeLinked++;
          
          await db.execute(sql`
            UPDATE identities SET
              gender = COALESCE(gender, ${customer.gender}),
              birth_date = COALESCE(birth_date, ${customer.birth_date}),
              birth_place = COALESCE(birth_place, ${customer.birth_place}),
              street = COALESCE(street, ${customer.street}),
              city = COALESCE(city, ${customer.city}),
              province = COALESCE(province, ${customer.province}),
              postal_code = COALESCE(postal_code, ${customer.postal_code}),
              country = COALESCE(country, ${customer.country}),
              updated_at = NOW()
            WHERE id = ${identityId}
          `);
        }
      }
      
      if (!identityId) {
        const newIdentity = await db.execute(sql`
          INSERT INTO identities (
            first_name, last_name, email, email_verified, phone, phone_normalized, phone_verified,
            gender, birth_date, birth_place, street, city, province, postal_code, country
          )
          VALUES (
            ${firstName}, ${lastName}, ${email}, ${customer.email_verified || false}, 
            ${customer.phone}, ${phoneNormalized}, ${customer.phone_verified || false},
            ${customer.gender}, ${customer.birth_date}, ${customer.birth_place},
            ${customer.street}, ${customer.city}, ${customer.province}, ${customer.postal_code}, ${customer.country}
          )
          RETURNING id
        `);
        identityId = newIdentity.rows[0].id as string;
        siaeCreated++;
      }
      
      await db.execute(sql`
        UPDATE siae_customers SET identity_id = ${identityId} WHERE id = ${customer.id}
      `);
      
      siaeProcessed++;
    }
    
    console.log(`[IDENTITY-MIGRATION] SIAE Customers: ${siaeProcessed} processed, ${siaeLinked} linked to existing, ${siaeCreated} new identities created`);
    
    const prResult = await db.execute(sql`
      SELECT id, first_name, last_name, email, phone, phone_prefix, phone_verified
      FROM pr_profiles
      WHERE identity_id IS NULL
    `);
    
    let prProcessed = 0;
    let prLinked = 0;
    let prCreated = 0;
    
    for (const pr of prResult.rows) {
      const fullPhone = `${pr.phone_prefix || '+39'}${pr.phone}`;
      const phoneNormalized = normalizePhone(fullPhone);
      const email = pr.email as string;
      const firstName = pr.first_name as string;
      const lastName = pr.last_name as string;
      
      let identityId: string | null = null;
      
      if (phoneNormalized) {
        const existingByPhone = await db.execute(sql`
          SELECT id FROM identities WHERE phone_normalized = ${phoneNormalized} LIMIT 1
        `);
        if (existingByPhone.rows.length > 0) {
          identityId = existingByPhone.rows[0].id as string;
          prLinked++;
        }
      }
      
      if (!identityId && email) {
        const existingByEmail = await db.execute(sql`
          SELECT id FROM identities WHERE LOWER(email) = LOWER(${email}) LIMIT 1
        `);
        if (existingByEmail.rows.length > 0) {
          identityId = existingByEmail.rows[0].id as string;
          prLinked++;
        }
      }
      
      if (!identityId) {
        const newIdentity = await db.execute(sql`
          INSERT INTO identities (first_name, last_name, email, phone, phone_normalized, phone_verified)
          VALUES (${firstName}, ${lastName}, ${email}, ${fullPhone}, ${phoneNormalized}, ${pr.phone_verified || false})
          RETURNING id
        `);
        identityId = newIdentity.rows[0].id as string;
        prCreated++;
      }
      
      await db.execute(sql`
        UPDATE pr_profiles SET identity_id = ${identityId} WHERE id = ${pr.id}
      `);
      
      prProcessed++;
    }
    
    console.log(`[IDENTITY-MIGRATION] PR Profiles: ${prProcessed} processed, ${prLinked} linked to existing, ${prCreated} new identities created`);
    
    console.log('[IDENTITY-MIGRATION] Syncing legacy links (users.siae_customer_id, siae_customers.user_id)...');
    
    await db.execute(sql`
      UPDATE users u
      SET siae_customer_id = sc.id
      FROM siae_customers sc
      WHERE u.identity_id = sc.identity_id
        AND u.siae_customer_id IS NULL
        AND sc.identity_id IS NOT NULL
    `);
    
    await db.execute(sql`
      UPDATE siae_customers sc
      SET user_id = u.id
      FROM users u
      WHERE sc.identity_id = u.identity_id
        AND sc.user_id IS NULL
        AND u.identity_id IS NOT NULL
    `);
    
    // ============================================
    // PHASE 2: Merge duplicate records physically
    // ============================================
    console.log('[IDENTITY-MIGRATION] Phase 2: Merging duplicate records...');
    
    // Merge duplicate siae_customers (same identity)
    const duplicateCustomers = await db.execute(sql`
      SELECT identity_id, array_agg(id ORDER BY created_at ASC) as customer_ids
      FROM siae_customers 
      WHERE identity_id IS NOT NULL
      GROUP BY identity_id 
      HAVING COUNT(*) > 1
    `);
    
    let customersMerged = 0;
    for (const row of duplicateCustomers.rows) {
      const customerIds = row.customer_ids as string[];
      const primaryId = customerIds[0]; // Keep the oldest
      const duplicateIds = customerIds.slice(1);
      
      console.log(`[IDENTITY-MIGRATION] Merging customers: keeping ${primaryId}, removing ${duplicateIds.join(', ')}`);
      
      // Wrap entire merge in transaction for safety
      await db.transaction(async (tx) => {
        for (const dupId of duplicateIds) {
          // Transfer tickets
          await tx.execute(sql`UPDATE siae_tickets SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer subscriptions
          await tx.execute(sql`UPDATE siae_subscriptions SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer name changes
          await tx.execute(sql`UPDATE siae_name_changes SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer resales (seller)
          await tx.execute(sql`UPDATE siae_resales SET seller_id = ${primaryId} WHERE seller_id = ${dupId}`);
          // Transfer resales (buyer)
          await tx.execute(sql`UPDATE siae_resales SET buyer_id = ${primaryId} WHERE buyer_id = ${dupId}`);
          // Transfer checkout sessions
          await tx.execute(sql`UPDATE checkout_sessions SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer list entries
          await tx.execute(sql`UPDATE list_entries SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer guest_list_entries
          await tx.execute(sql`UPDATE guest_list_entries SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer event_reservations
          await tx.execute(sql`UPDATE event_reservations SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer wallet
          await tx.execute(sql`UPDATE customer_wallets SET customer_id = ${primaryId} WHERE customer_id = ${dupId} ON CONFLICT DO NOTHING`);
          // Transfer loyalty points
          await tx.execute(sql`UPDATE loyalty_points SET customer_id = ${primaryId} WHERE customer_id = ${dupId} ON CONFLICT DO NOTHING`);
          // Transfer referrals
          await tx.execute(sql`UPDATE referrals SET referrer_id = ${primaryId} WHERE referrer_id = ${dupId}`);
          await tx.execute(sql`UPDATE referrals SET referred_customer_id = ${primaryId} WHERE referred_customer_id = ${dupId}`);
          // Transfer activation cards
          await tx.execute(sql`UPDATE siae_activation_cards SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer seat_holds
          await tx.execute(sql`UPDATE seat_holds SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Transfer table_bookings
          await tx.execute(sql`UPDATE table_bookings SET customer_id = ${primaryId} WHERE customer_id = ${dupId}`);
          // Update users reference
          await tx.execute(sql`UPDATE users SET siae_customer_id = ${primaryId} WHERE siae_customer_id = ${dupId}`);
          
          // Delete the duplicate
          await tx.execute(sql`DELETE FROM siae_customers WHERE id = ${dupId}`);
          customersMerged++;
        }
      });
    }
    console.log(`[IDENTITY-MIGRATION] Merged ${customersMerged} duplicate customer records`);
    
    // Merge duplicate pr_profiles (same identity AND same company)
    const duplicatePRs = await db.execute(sql`
      SELECT identity_id, company_id, array_agg(id ORDER BY created_at ASC) as pr_ids
      FROM pr_profiles 
      WHERE identity_id IS NOT NULL
      GROUP BY identity_id, company_id
      HAVING COUNT(*) > 1
    `);
    
    let prsMerged = 0;
    for (const row of duplicatePRs.rows) {
      const prIds = row.pr_ids as string[];
      const primaryId = prIds[0]; // Keep the oldest
      const duplicateIds = prIds.slice(1);
      
      console.log(`[IDENTITY-MIGRATION] Merging PR profiles: keeping ${primaryId}, removing ${duplicateIds.join(', ')}`);
      
      // Wrap entire merge in transaction for safety
      await db.transaction(async (tx) => {
        for (const dupId of duplicateIds) {
          // Transfer list entries (addedByPrProfileId)
          await tx.execute(sql`UPDATE list_entries SET added_by_pr_profile_id = ${primaryId} WHERE added_by_pr_profile_id = ${dupId}`);
          await tx.execute(sql`UPDATE guest_list_entries SET added_by_pr_profile_id = ${primaryId} WHERE added_by_pr_profile_id = ${dupId}`);
          // Transfer payout requests
          await tx.execute(sql`UPDATE payout_requests SET requested_by_pr_profile_id = ${primaryId} WHERE requested_by_pr_profile_id = ${dupId}`);
          // Transfer commissions
          await tx.execute(sql`UPDATE pr_commissions SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId}`);
          await tx.execute(sql`UPDATE pr_event_commissions SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId}`);
          // Transfer event reservations
          await tx.execute(sql`UPDATE event_reservations SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId}`);
          // Transfer name changes
          await tx.execute(sql`UPDATE siae_name_changes SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId}`);
          // Transfer scanner event assignments
          await tx.execute(sql`UPDATE scanner_event_assignments SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId} ON CONFLICT DO NOTHING`);
          // Transfer event PR assignments
          await tx.execute(sql`UPDATE event_pr_assignments SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId}`);
          // Transfer reservation payments
          await tx.execute(sql`UPDATE reservation_payments SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId}`);
          // Update users.pr_profile_id if exists  
          await tx.execute(sql`UPDATE users SET pr_profile_id = ${primaryId} WHERE pr_profile_id = ${dupId}`);
          
          // Delete the duplicate
          await tx.execute(sql`DELETE FROM pr_profiles WHERE id = ${dupId}`);
          prsMerged++;
        }
      });
    }
    console.log(`[IDENTITY-MIGRATION] Merged ${prsMerged} duplicate PR profile records`);
    
    // Merge duplicate users (same identity AND same company)
    const duplicateUsers = await db.execute(sql`
      SELECT identity_id, company_id, array_agg(id ORDER BY created_at ASC) as user_ids
      FROM users 
      WHERE identity_id IS NOT NULL
      GROUP BY identity_id, company_id
      HAVING COUNT(*) > 1
    `);
    
    let usersMerged = 0;
    for (const row of duplicateUsers.rows) {
      const userIds = row.user_ids as string[];
      const primaryId = userIds[0]; // Keep the oldest
      const duplicateIds = userIds.slice(1);
      
      console.log(`[IDENTITY-MIGRATION] Merging users: keeping ${primaryId}, removing ${duplicateIds.join(', ')}`);
      
      // Wrap entire merge in transaction for safety
      await db.transaction(async (tx) => {
        for (const dupId of duplicateIds) {
          // Transfer user_companies
          await tx.execute(sql`UPDATE user_companies SET user_id = ${primaryId} WHERE user_id = ${dupId} ON CONFLICT DO NOTHING`);
          await tx.execute(sql`DELETE FROM user_companies WHERE user_id = ${dupId}`);
          // Transfer user_company_roles
          await tx.execute(sql`UPDATE user_company_roles SET user_id = ${primaryId} WHERE user_id = ${dupId} ON CONFLICT DO NOTHING`);
          await tx.execute(sql`DELETE FROM user_company_roles WHERE user_id = ${dupId}`);
          // Transfer events created/updated
          await tx.execute(sql`UPDATE events SET created_by = ${primaryId} WHERE created_by = ${dupId}`);
          await tx.execute(sql`UPDATE events SET updated_by = ${primaryId} WHERE updated_by = ${dupId}`);
          // Transfer siae_customers.user_id
          await tx.execute(sql`UPDATE siae_customers SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer pr_profiles.user_id
          await tx.execute(sql`UPDATE pr_profiles SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer cashier_sessions
          await tx.execute(sql`UPDATE cashier_sessions SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer list_entries (multiple FK columns)
          await tx.execute(sql`UPDATE list_entries SET added_by_user_id = ${primaryId} WHERE added_by_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE list_entries SET client_user_id = ${primaryId} WHERE client_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE list_entries SET qr_scanned_by_user_id = ${primaryId} WHERE qr_scanned_by_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE list_entries SET checked_in_by = ${primaryId} WHERE checked_in_by = ${dupId}`);
          await tx.execute(sql`UPDATE list_entries SET created_by = ${primaryId} WHERE created_by = ${dupId}`);
          await tx.execute(sql`UPDATE list_entries SET created_by_user_id = ${primaryId} WHERE created_by_user_id = ${dupId}`);
          // Transfer guest_list_entries (multiple FK columns)
          await tx.execute(sql`UPDATE guest_list_entries SET added_by_user_id = ${primaryId} WHERE added_by_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE guest_list_entries SET created_by_user_id = ${primaryId} WHERE created_by_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE guest_list_entries SET qr_scanned_by_user_id = ${primaryId} WHERE qr_scanned_by_user_id = ${dupId}`);
          // Transfer scanner assignments
          await tx.execute(sql`UPDATE scanner_event_assignments SET user_id = ${primaryId} WHERE user_id = ${dupId} ON CONFLICT DO NOTHING`);
          await tx.execute(sql`DELETE FROM scanner_event_assignments WHERE user_id = ${dupId}`);
          // Transfer parent_user_id references
          await tx.execute(sql`UPDATE users SET parent_user_id = ${primaryId} WHERE parent_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE user_company_roles SET parent_user_id = ${primaryId} WHERE parent_user_id = ${dupId}`);
          // Transfer siae_audit_logs.user_id (not a FK constraint, but tracks user reference)
          await tx.execute(sql`UPDATE siae_audit_logs SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer stock_movements.performed_by
          await tx.execute(sql`UPDATE stock_movements SET performed_by = ${primaryId} WHERE performed_by = ${dupId}`);
          // Transfer purchase_orders.created_by
          await tx.execute(sql`UPDATE purchase_orders SET created_by = ${primaryId} WHERE created_by = ${dupId}`);
          // Transfer siae_access_requests.approved_by
          await tx.execute(sql`UPDATE siae_access_requests SET approved_by = ${primaryId} WHERE approved_by = ${dupId}`);
          // Transfer siae_transmissions.approved_by
          await tx.execute(sql`UPDATE siae_transmissions SET approved_by = ${primaryId} WHERE approved_by = ${dupId}`);
          // Transfer siae_name_changes.approved_by
          await tx.execute(sql`UPDATE siae_name_changes SET approved_by = ${primaryId} WHERE approved_by = ${dupId}`);
          // Transfer siae_tickets.processed_by_user_id
          await tx.execute(sql`UPDATE siae_tickets SET processed_by_user_id = ${primaryId} WHERE processed_by_user_id = ${dupId}`);
          // Transfer table_bookings (multiple FK columns)
          await tx.execute(sql`UPDATE table_bookings SET booked_by_user_id = ${primaryId} WHERE booked_by_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE table_bookings SET qr_scanned_by_user_id = ${primaryId} WHERE qr_scanned_by_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE table_bookings SET approved_by_user_id = ${primaryId} WHERE approved_by_user_id = ${dupId}`);
          // Transfer table_booking_participants.qr_scanned_by_user_id
          await tx.execute(sql`UPDATE table_booking_participants SET qr_scanned_by_user_id = ${primaryId} WHERE qr_scanned_by_user_id = ${dupId}`);
          // Transfer event_lists.created_by_user_id
          await tx.execute(sql`UPDATE event_lists SET created_by_user_id = ${primaryId} WHERE created_by_user_id = ${dupId}`);
          // Transfer table_reservations (multiple FK columns)
          await tx.execute(sql`UPDATE table_reservations SET approved_by = ${primaryId} WHERE approved_by = ${dupId}`);
          await tx.execute(sql`UPDATE table_reservations SET created_by = ${primaryId} WHERE created_by = ${dupId}`);
          // Transfer table_guests (multiple FK columns)
          await tx.execute(sql`UPDATE table_guests SET client_user_id = ${primaryId} WHERE client_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE table_guests SET checked_in_by = ${primaryId} WHERE checked_in_by = ${dupId}`);
          // Transfer event_reservations (multiple FK columns)
          await tx.execute(sql`UPDATE event_reservations SET client_user_id = ${primaryId} WHERE client_user_id = ${dupId}`);
          await tx.execute(sql`UPDATE event_reservations SET checked_in_by = ${primaryId} WHERE checked_in_by = ${dupId}`);
          // Transfer payout_requests.processed_by_user_id
          await tx.execute(sql`UPDATE payout_requests SET processed_by_user_id = ${primaryId} WHERE processed_by_user_id = ${dupId}`);
          // Transfer event_ticket_pages (floor_plans equivalent - created_by, published_by)
          await tx.execute(sql`UPDATE event_ticket_pages SET created_by = ${primaryId} WHERE created_by = ${dupId}`);
          await tx.execute(sql`UPDATE event_ticket_pages SET published_by = ${primaryId} WHERE published_by = ${dupId}`);
          // Transfer event_ticket_page_media.uploaded_by (floor_plan_media equivalent)
          await tx.execute(sql`UPDATE event_ticket_page_media SET uploaded_by = ${primaryId} WHERE uploaded_by = ${dupId}`);
          // Transfer event_page_configs.created_by
          await tx.execute(sql`UPDATE event_page_configs SET created_by = ${primaryId} WHERE created_by = ${dupId}`);
          // Transfer reservation_payments.paid_by
          await tx.execute(sql`UPDATE reservation_payments SET paid_by = ${primaryId} WHERE paid_by = ${dupId}`);
          // Transfer print_jobs.created_by
          await tx.execute(sql`UPDATE print_jobs SET created_by = ${primaryId} WHERE created_by = ${dupId}`);
          // Transfer printer_agents.user_id
          await tx.execute(sql`UPDATE printer_agents SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer siae_smart_card_sessions.user_id
          await tx.execute(sql`UPDATE siae_smart_card_sessions SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer seat_holds.user_id
          await tx.execute(sql`UPDATE seat_holds SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer e4u_staff_assignments.user_id
          await tx.execute(sql`UPDATE e4u_staff_assignments SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer event_pr_assignments.user_id and staff_user_id
          await tx.execute(sql`UPDATE event_pr_assignments SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          await tx.execute(sql`UPDATE event_pr_assignments SET staff_user_id = ${primaryId} WHERE staff_user_id = ${dupId}`);
          // Transfer event_scanners.user_id
          await tx.execute(sql`UPDATE event_scanners SET user_id = ${primaryId} WHERE user_id = ${dupId}`);
          // Transfer system_settings.updated_by
          await tx.execute(sql`UPDATE system_settings SET updated_by = ${primaryId} WHERE updated_by = ${dupId}`);
          
          // Delete the duplicate user
          await tx.execute(sql`DELETE FROM users WHERE id = ${dupId}`);
          usersMerged++;
        }
      });
    }
    console.log(`[IDENTITY-MIGRATION] Merged ${usersMerged} duplicate user records`);
    
    // ============================================
    // Final statistics
    // ============================================
    const finalStats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM identities) as total_identities,
        (SELECT COUNT(*) FROM users WHERE identity_id IS NOT NULL) as users_linked,
        (SELECT COUNT(*) FROM siae_customers WHERE identity_id IS NOT NULL) as customers_linked,
        (SELECT COUNT(*) FROM pr_profiles WHERE identity_id IS NOT NULL) as pr_linked,
        (SELECT COUNT(*) FROM users WHERE siae_customer_id IS NOT NULL) as users_with_customer
    `);
    
    const stats = finalStats.rows[0];
    console.log('[IDENTITY-MIGRATION] Migration completed successfully!');
    console.log(`[IDENTITY-MIGRATION] Final stats:`);
    console.log(`  - Total identities: ${stats.total_identities}`);
    console.log(`  - Users linked: ${stats.users_linked}`);
    console.log(`  - SIAE Customers linked: ${stats.customers_linked}`);
    console.log(`  - PR Profiles linked: ${stats.pr_linked}`);
    console.log(`  - Users with customer account: ${stats.users_with_customer}`);
    console.log(`  - Customers merged: ${customersMerged}`);
    console.log(`  - PR profiles merged: ${prsMerged}`);
    console.log(`  - Users merged: ${usersMerged}`);
    
  } catch (error) {
    console.error('[IDENTITY-MIGRATION] Error during migration:', error);
    throw error;
  }
}
