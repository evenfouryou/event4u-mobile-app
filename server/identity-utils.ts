import { db } from "./db";
import { identities, prProfiles, siaeCustomers } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Normalize phone to E.164 format (+39XXXXXXXXXX)
export function normalizePhone(phone: string, prefix?: string): string {
  let normalized = phone.replace(/\D/g, ''); // Remove non-digits
  if (!normalized.startsWith('39') && prefix?.includes('39')) {
    normalized = '39' + normalized;
  } else if (!normalized.startsWith('39') && normalized.length === 10) {
    normalized = '39' + normalized; // Assume Italian
  }
  return '+' + normalized;
}

// Find or create an identity by phone number
export async function findOrCreateIdentity(data: {
  phone: string;
  phonePrefix?: string;
  firstName: string;
  lastName: string;
  email?: string;
  gender?: string;
  birthDate?: Date;
  birthPlace?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  fiscalCode?: string;
}): Promise<{ identity: typeof identities.$inferSelect; created: boolean }> {
  const normalizedPhone = normalizePhone(data.phone, data.phonePrefix);
  
  // Search for existing identity by normalized phone
  const [existingIdentity] = await db.select()
    .from(identities)
    .where(eq(identities.phoneNormalized, normalizedPhone))
    .limit(1);
  
  if (existingIdentity) {
    // Update identity with any new data that wasn't set before
    // Only update fields that are currently null/empty
    const updates: Record<string, any> = {};
    if (!existingIdentity.email && data.email) updates.email = data.email;
    if (!existingIdentity.gender && data.gender) updates.gender = data.gender;
    if (!existingIdentity.birthDate && data.birthDate) updates.birthDate = data.birthDate;
    if (!existingIdentity.birthPlace && data.birthPlace) updates.birthPlace = data.birthPlace;
    if (!existingIdentity.street && data.street) updates.street = data.street;
    if (!existingIdentity.city && data.city) updates.city = data.city;
    if (!existingIdentity.province && data.province) updates.province = data.province;
    if (!existingIdentity.postalCode && data.postalCode) updates.postalCode = data.postalCode;
    if (!existingIdentity.fiscalCode && data.fiscalCode) updates.fiscalCode = data.fiscalCode;
    
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(identities)
        .set(updates)
        .where(eq(identities.id, existingIdentity.id));
    }
    
    return { identity: existingIdentity, created: false };
  }
  
  // Create new identity
  const [newIdentity] = await db.insert(identities).values({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    phoneNormalized: normalizedPhone,
    gender: data.gender,
    birthDate: data.birthDate,
    birthPlace: data.birthPlace,
    street: data.street,
    city: data.city,
    province: data.province,
    postalCode: data.postalCode,
    country: data.country || 'IT',
    fiscalCode: data.fiscalCode,
  }).returning();
  
  return { identity: newIdentity, created: true };
}

// Find existing PR profile for an identity in a specific company
export async function findPrProfileByIdentity(identityId: string, companyId: string): Promise<typeof prProfiles.$inferSelect | null> {
  const [profile] = await db.select()
    .from(prProfiles)
    .where(
      and(
        eq(prProfiles.identityId, identityId),
        eq(prProfiles.companyId, companyId)
      )
    )
    .limit(1);
  return profile || null;
}

// Find existing customer for an identity
export async function findCustomerByIdentity(identityId: string): Promise<typeof siaeCustomers.$inferSelect | null> {
  const [customer] = await db.select()
    .from(siaeCustomers)
    .where(eq(siaeCustomers.identityId, identityId))
    .limit(1);
  return customer || null;
}

// Get all roles for an identity (PR profiles and customer accounts)
export async function getIdentityRoles(identityId: string): Promise<{
  prProfiles: Array<typeof prProfiles.$inferSelect>;
  customer: typeof siaeCustomers.$inferSelect | null;
}> {
  const [prList, customers] = await Promise.all([
    db.select().from(prProfiles).where(eq(prProfiles.identityId, identityId)),
    db.select().from(siaeCustomers).where(eq(siaeCustomers.identityId, identityId)).limit(1),
  ]);
  
  return {
    prProfiles: prList,
    customer: customers[0] || null,
  };
}
