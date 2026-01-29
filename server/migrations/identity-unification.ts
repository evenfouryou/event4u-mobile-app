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
    
  } catch (error) {
    console.error('[IDENTITY-MIGRATION] Error during migration:', error);
    throw error;
  }
}
