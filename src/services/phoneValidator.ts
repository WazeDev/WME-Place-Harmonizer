/**
 * Invalid area codes (not used or reserved in US).
 */
const INVALID_AREA_CODES = new Set([
  '000', '111', '211', '311', '411', '511', '611', '711', '811', '911',
  '200', '300', '400', '500', '600', '700', '800', '900'
]);

/**
 * Validate and format a US phone number to (XXX) XXX-XXXX.
 */
export function validateAndFormatPhone(phone: string): {
  isValid: boolean;
  formatted: string | null;
  error?: string;
} {
  if (!phone) {
    return { isValid: false, formatted: null, error: 'Phone number is empty' };
  }

  // Strip all non-numeric characters (except leading +)
  let cleaned = phone.replace(/[^0-9+]/g, '');

  // Remove leading +1 (US country code) or leading 1 for 11-digit numbers
  if (cleaned.startsWith('+1')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Strip extension (common patterns: "x123", "ext 456", "extension 789")
  const extensionMatch = phone.match(/\s+(x|ext|extension)\.?\s*\d+/i);
  if (extensionMatch) {
    const withoutExt = phone.split(extensionMatch[0])[0];
    cleaned = withoutExt.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+1')) cleaned = cleaned.slice(2);
    else if (cleaned.startsWith('1') && cleaned.length === 11) cleaned = cleaned.slice(1);
  }

  // Must be exactly 10 digits
  if (cleaned.length !== 10) {
    return {
      isValid: false,
      formatted: null,
      error: `Invalid length: ${cleaned.length} digits (expected 10)`
    };
  }

  const areaCode = cleaned.slice(0, 3);

  // Check invalid area codes
  if (INVALID_AREA_CODES.has(areaCode)) {
    return {
      isValid: false,
      formatted: null,
      error: `Invalid area code: ${areaCode}`
    };
  }

  // Check for repeated digits (e.g., 1111111111)
  if (/^(\d)\1{9}$/.test(cleaned)) {
    return {
      isValid: false,
      formatted: null,
      error: 'All digits are the same'
    };
  }

  // Format as (XXX) XXX-XXXX
  const formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  return { isValid: true, formatted };
}

/**
 * Check if a phone number needs formatting.
 */
export function needsPhoneFormatting(phone: string): boolean {
  if (!phone) return false;
  const result = validateAndFormatPhone(phone);
  return result.isValid && result.formatted !== phone;
}

/**
 * Check if a phone number is invalid.
 */
export function isPhoneInvalid(phone: string): { isInvalid: boolean; error?: string } {
  if (!phone) return { isInvalid: false };
  const result = validateAndFormatPhone(phone);
  return { isInvalid: !result.isValid, error: result.error };
}

/**
 * Validate international phone numbers (basic E.164 check).
 */
export function validateInternationalPhone(phone: string): {
  isValid: boolean;
  formatted: string | null;
  error?: string;
} {
  if (!phone) {
    return { isValid: false, formatted: null, error: 'Phone number is empty' };
  }

  if (!phone.startsWith('+')) {
    return { isValid: false, formatted: null, error: 'International phone must start with +' };
  }

  const cleaned = phone.replace(/[^0-9+]/g, '');

  // E.164 min length is country code + local number; enforce 7..15 chars including '+'
  if (cleaned.length < 7) {
    return { isValid: false, formatted: null, error: 'Too short for international number' };
  }
  if (cleaned.length > 15) {
    return { isValid: false, formatted: null, error: 'Too long for international number' };
  }
  return { isValid: true, formatted: cleaned };
}
