/**
 * Phone number normalization utilities for consistent matching across the system.
 * 
 * This module handles Italian phone number variations:
 * - +39 prefix (international format)
 * - 39 prefix (without +)
 * - 0039 prefix (alternative international)
 * - No prefix (local format)
 */

/**
 * Remove all non-digit characters from phone number
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Get base phone number by stripping country codes
 */
export function getBasePhone(phone: string): string {
  const digits = normalizePhone(phone);
  let basePhone = digits;
  
  if (basePhone.startsWith('0039')) {
    basePhone = basePhone.slice(4);
  } else if (basePhone.startsWith('39') && basePhone.length > 10) {
    basePhone = basePhone.slice(2);
  }
  
  return basePhone;
}

/**
 * Generate all possible format variations of a phone number for matching
 * @param phone - The phone number to generate variants for
 * @returns Array of possible phone formats to match against
 */
export function getPhoneVariants(phone: string): string[] {
  const digits = normalizePhone(phone);
  const basePhone = getBasePhone(phone);
  
  return [
    phone,                    // Original format
    digits,                   // Just digits
    basePhone,                // Without country code
    '+39' + basePhone,        // Italian international format
    '39' + basePhone,         // Without plus
    '0039' + basePhone,       // Alternative international
  ];
}

/**
 * Check if two phone numbers match (with normalization)
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if phones match after normalization
 */
export function phonesMatch(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  if (!phone1 || !phone2) return false;
  
  const variants1 = getPhoneVariants(phone1);
  const normalized2 = normalizePhone(phone2);
  
  return variants1.some(v => v === phone2 || normalizePhone(v) === normalized2);
}

/**
 * Find matching record by phone from a list
 * @param records - Array of records with phone field
 * @param phone - Phone number to search for
 * @param phoneField - Name of the phone field in records (default: 'phone')
 * @returns Matching record or undefined
 */
export function findByPhone<T extends Record<string, any>>(
  records: T[],
  phone: string,
  phoneField: string = 'phone'
): T | undefined {
  const variants = getPhoneVariants(phone);
  
  return records.find(record => {
    const recordPhone = record[phoneField];
    if (!recordPhone) return false;
    
    return variants.some(v => v === recordPhone || normalizePhone(v) === normalizePhone(recordPhone));
  });
}

/**
 * Filter records that match phone number
 * @param records - Array of records with phone field
 * @param phone - Phone number to search for
 * @param phoneField - Name of the phone field in records (default: 'phone')
 * @returns Filtered array of matching records
 */
export function filterByPhone<T extends Record<string, any>>(
  records: T[],
  phone: string,
  phoneField: string = 'phone'
): T[] {
  const variants = getPhoneVariants(phone);
  
  return records.filter(record => {
    const recordPhone = record[phoneField];
    if (!recordPhone) return false;
    
    return variants.some(v => v === recordPhone || normalizePhone(v) === normalizePhone(recordPhone));
  });
}
