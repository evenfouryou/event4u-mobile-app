import { db } from './db';
import { users, companies } from '../shared/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

/**
 * Script di seed per creare utenti di test
 * 
 * CREDENZIALI DI TEST:
 * ====================
 * 
 * Super Admin:
 *   Email: admin@event4u.com
 *   Password: admin123
 * 
 * Gestore (Company: Event4U Demo):
 *   Email: gestore@demo.com
 *   Password: gestore123
 * 
 * Magazziniere (Company: Event4U Demo):
 *   Email: magazzino@demo.com
 *   Password: magazzino123
 * 
 * Barista (Company: Event4U Demo):
 *   Email: barista@demo.com
 *   Password: barista123
 * 
 * COME USARE:
 * ============
 * npx tsx server/seed.ts
 * 
 * NOTA: Questo script è solo per sviluppo/testing.
 *       NON usare in produzione!
 */

async function seed() {
  console.log('🌱 Avvio seed database...\n');

  try {
    // 1. Crea company di test
    console.log('📦 Creazione company di test...');
    const existingCompany = await db.query.companies.findFirst({
      where: eq(companies.name, 'Event4U Demo'),
    });

    let companyId: string;
    if (existingCompany) {
      console.log('   ✓ Company "Event4U Demo" già esistente');
      companyId = existingCompany.id;
    } else {
      const [company] = await db.insert(companies).values({
        name: 'Event4U Demo',
        taxId: 'IT12345678901',
        address: 'Via Demo 123, Milano',
      }).returning();
      companyId = company.id;
      console.log('   ✓ Company "Event4U Demo" creata');
    }

    // 2. Crea utenti di test
    console.log('\n👥 Creazione utenti di test...');

    const testUsers = [
      {
        email: 'admin@event4u.com',
        password: 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin' as const,
        companyId: null,
      },
      {
        email: 'gestore@demo.com',
        password: 'gestore123',
        firstName: 'Mario',
        lastName: 'Rossi',
        role: 'gestore' as const,
        companyId: companyId,
      },
      {
        email: 'magazzino@demo.com',
        password: 'magazzino123',
        firstName: 'Luigi',
        lastName: 'Verdi',
        role: 'warehouse' as const,
        companyId: companyId,
      },
      {
        email: 'barista@demo.com',
        password: 'barista123',
        firstName: 'Anna',
        lastName: 'Bianchi',
        role: 'bartender' as const,
        companyId: companyId,
      },
    ];

    for (const userData of testUsers) {
      // Verifica se l'utente esiste già
      const existing = await db.query.users.findFirst({
        where: eq(users.email, userData.email),
      });

      if (existing) {
        console.log(`   ⚠ Utente ${userData.email} già esistente - skip`);
        continue;
      }

      // Cripta la password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Crea l'utente
      await db.insert(users).values({
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        companyId: userData.companyId,
        emailVerified: true, // Pre-verificato per testing
        isActive: true,
      });

      console.log(`   ✓ Creato: ${userData.email} (${userData.role})`);
    }

    console.log('\n✅ Seed completato con successo!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('CREDENZIALI DI TEST:');
    console.log('═══════════════════════════════════════════════');
    console.log('\n🔑 Super Admin:');
    console.log('   Email: admin@event4u.com');
    console.log('   Password: admin123');
    console.log('\n🏢 Gestore (Event4U Demo):');
    console.log('   Email: gestore@demo.com');
    console.log('   Password: gestore123');
    console.log('\n📦 Magazziniere (Event4U Demo):');
    console.log('   Email: magazzino@demo.com');
    console.log('   Password: magazzino123');
    console.log('\n🍺 Barista (Event4U Demo):');
    console.log('   Email: barista@demo.com');
    console.log('   Password: barista123');
    console.log('\n═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Errore durante il seed:', error);
    throw error;
  }
}

// Esegui il seed
seed()
  .then(() => {
    console.log('🎉 Processo completato!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Errore fatale:', error);
    process.exit(1);
  });
