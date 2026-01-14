/**
 * List of words that should always be lowercase (unless first word).
 */
const LOWERCASE_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'near', 'nor',
  'of', 'on', 'or', 'per', 'the', 'to', 'with', 'via',
]);

/**
 * List of words that should always be uppercase.
 */
const UPPERCASE_WORDS = new Set([
  'atm', 'usa', 'uk', 'llc', 'inc', 'co', 'corp', 'ltd', 'pc', 'pa', 'lp', 'ac', 'dc',
  'rv', 'ev', 'suv', 'dvd', 'cd', 'tv', 'fm', 'am', 'pm', 'ymca', 'ywca', 'ymha',
]);

/**
 * Map of brand-specific exceptions.
 */
const BRAND_EXCEPTIONS: Record<string, string> = {
  "mcdonald's": "McDonald's",
  'mcdonalds': "McDonald's",
  '7-eleven': '7-Eleven',
  '7 eleven': '7-Eleven',
  'cvs': 'CVS',
  'cvs pharmacy': 'CVS Pharmacy',
  'quiktrip': 'QuikTrip',
  'qt': 'QuikTrip',
  'speedway': 'Speedway',
  'circle k': 'Circle K',
  'kwik trip': 'Kwik Trip',
  'kwiktrip': 'Kwik Trip',
  'sheetz': 'Sheetz',
  'wawa': 'Wawa',
  "arby's": "Arby's",
  "wendy's": "Wendy's",
  "hardee's": "Hardee's",
  "denny's": "Denny's",
  "chick-fil-a": 'Chick-fil-A',
  "o'reilly": "O'Reilly",
  "o'reilly auto parts": "O'Reilly Auto Parts",
  'autozone': 'AutoZone',
  'petsmart': 'PetSmart',
  'petco': 'Petco',
  'best buy': 'Best Buy',
  'target': 'Target',
  'walmart': 'Walmart',
  'costco': 'Costco',
  "sam's club": "Sam's Club",
  'home depot': 'Home Depot',
  "lowe's": "Lowe's",
  'ups': 'UPS',
  'fedex': 'FedEx',
  'usps': 'USPS',
};

/** Roman numeral detection (I, II, III, IV, V, VI, VII, VIII, IX, X, ... up to MMMCMXCIX) */
const ROMAN_NUMERAL_REGEX = /^(M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3}))$/i;

/**
 * Apply title case with exceptions.
 */
export function applyTitleCase(input: string): string {
  if (!input) return input;

  const trimmed = input.trim();
  if (!trimmed) return input;

  // Check if exact match in brand exceptions (case-insensitive)
  const lowerInput = trimmed.toLowerCase();
  if (BRAND_EXCEPTIONS[lowerInput]) {
    return BRAND_EXCEPTIONS[lowerInput];
  }

  // Split into words (preserve multiple spaces by collapsing later)
  const words = trimmed.split(/\s+/);

  const titleCased = words.map((word, index) => {
    const lowerWord = word.toLowerCase();

    // Keep roman numerals uppercase
    if (ROMAN_NUMERAL_REGEX.test(word)) {
      return word.toUpperCase();
    }

    // Check if word should be uppercase
    if (UPPERCASE_WORDS.has(lowerWord)) {
      return word.toUpperCase();
    }

    // Check if word should be lowercase (but not if first word)
    if (index > 0 && LOWERCASE_WORDS.has(lowerWord)) {
      return lowerWord;
    }

    // Default title case: capitalize first letter with special handling
    return capitalizeFirst(word);
  });

  return titleCased.join(' ');
}

/**
 * Capitalize first letter of a word, preserving rest of the case.
 */
function capitalizeFirst(word: string): string {
  if (!word) return word;

  // Handle apostrophes: O'Reilly -> O'Reilly (not O'reilly)
  if (word.includes("'")) {
    const parts = word.split("'");
    return parts
      .map((part, idx) => {
        if (part.length === 0) return part;
        if (idx === 0) return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        // After apostrophe, capitalize if it's a name (e.g., O'Brien)
        if (part.length > 1) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }
        return part.toLowerCase();
      })
      .join("'");
  }

  // Handle hyphens: Chick-fil-A -> Chick-Fil-A (except brand exceptions already handled)
  if (word.includes('-')) {
    const parts = word.split('-');
    return parts.map((part) => capitalizeFirst(part)).join('-');
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Check if a string needs title case correction.
 */
export function needsTitleCase(input: string): boolean {
  if (!input) return false;

  const titleCased = applyTitleCase(input);
  return input !== titleCased;
}

// --- PNH brand exceptions integration ---
import { getStoredChains } from './pnhFetcher';

/**
 * Build brand exceptions map from cached PNH data.
 */
export function loadBrandExceptionsFromPnh(): void {
  const chains = getStoredChains();
  if (!chains || chains.length === 0) return;

  chains.forEach((entry) => {
    const brand: string | null | undefined = (entry as any)?.brand;
    const name: string | undefined = (entry as any)?.name;
    if (brand && typeof brand === 'string') {
      const lowerBrand = brand.toLowerCase();
      BRAND_EXCEPTIONS[lowerBrand] = brand;
    }
    if (name && typeof name === 'string') {
      const lowerName = name.toLowerCase();
      BRAND_EXCEPTIONS[lowerName] = name;
    }
    const aliases: string[] | undefined = (entry as any)?.aliases;
    if (Array.isArray(aliases)) {
      aliases.forEach(alias => {
        if (alias && typeof alias === 'string') {
          BRAND_EXCEPTIONS[alias.toLowerCase()] = alias;
        }
      });
    }
  });
}
