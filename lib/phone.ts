/**
 * Phone number utilities for country code selection, parsing, and normalization.
 * Handles formats: +919876543210, +91 98765 43210, 919876543210, 9876543210
 */

export interface ParsedPhone {
  countryCode: string;  // 'IN', 'US', 'GB', etc.
  dialCode: string;     // '+91', '+1', '+44'
  nationalNumber: string;  // '9876543210' (no leading zero, no spaces)
  e164: string;         // '+919876543210' (canonical storage format)
  isValid: boolean;
}

export interface CountryOption {
  code: string;      // ISO 3166-1 alpha-2: 'IN', 'US', 'GB'
  dialCode: string;  // '+91', '+1', '+44'
  name: string;      // 'India', 'United States', 'United Kingdom'
  flag: string;      // '🇮🇳', '🇺🇸', '🇬🇧'
}

/**
 * Curated list of countries with dial codes, ordered by relevance:
 * India first (default), then popular destinations, then alphabetical.
 */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', dialCode: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', dialCode: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', dialCode: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', dialCode: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', dialCode: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', dialCode: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', dialCode: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: 'CN', dialCode: '+86', name: 'China', flag: '🇨🇳' },
  { code: 'KR', dialCode: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: 'TH', dialCode: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', dialCode: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', dialCode: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: 'BR', dialCode: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', dialCode: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', dialCode: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', dialCode: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: 'PK', dialCode: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'NP', dialCode: '+977', name: 'Nepal', flag: '🇳🇵' },
];

/**
 * Returns the full list of country options.
 */
export function getCountryCodeOptions(): CountryOption[] {
  return COUNTRY_OPTIONS;
}

/**
 * Parse a phone number string into structured components.
 * Handles multiple input formats:
 * - E.164: +919876543210
 * - With spaces: +91 98765 43210
 * - Without plus: 919876543210
 * - National only: 9876543210 (assumes India if 10 digits)
 *
 * Returns null if the input cannot be parsed.
 */
export function parsePhone(input: string): ParsedPhone | null {
  if (!input || typeof input !== 'string') return null;

  // Remove all non-digit and non-plus characters
  const cleaned = input.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  // Case 1: Starts with + (E.164 or formatted)
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1); // remove +

    // Try to match known dial codes
    for (const country of COUNTRY_OPTIONS) {
      const dc = country.dialCode.slice(1); // remove + from dial code
      if (digits.startsWith(dc)) {
        const nationalNumber = digits.slice(dc.length);
        const isValid = validateNationalNumber(country.code, nationalNumber);
        return {
          countryCode: country.code,
          dialCode: country.dialCode,
          nationalNumber,
          e164: `${country.dialCode}${nationalNumber}`,
          isValid,
        };
      }
    }
    return null; // unknown dial code
  }

  // Case 2: No +, but starts with known dial code
  for (const country of COUNTRY_OPTIONS) {
    const dc = country.dialCode.slice(1); // remove + from dial code
    if (cleaned.startsWith(dc)) {
      const nationalNumber = cleaned.slice(dc.length);
      const isValid = validateNationalNumber(country.code, nationalNumber);
      return {
        countryCode: country.code,
        dialCode: country.dialCode,
        nationalNumber,
        e164: `${country.dialCode}${nationalNumber}`,
        isValid,
      };
    }
  }

  // Case 3: Plain 10-digit number → assume India
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return {
      countryCode: 'IN',
      dialCode: '+91',
      nationalNumber: cleaned,
      e164: `+91${cleaned}`,
      isValid: true,
    };
  }

  // Case 4: Generic fallback for 6-15 digit numbers → assume India
  if (cleaned.length >= 6 && cleaned.length <= 15) {
    return {
      countryCode: 'IN',
      dialCode: '+91',
      nationalNumber: cleaned,
      e164: `+91${cleaned}`,
      isValid: false, // mark as potentially invalid
    };
  }

  return null;
}

/**
 * Validate national number length for a given country.
 */
function validateNationalNumber(countryCode: string, nationalNumber: string): boolean {
  const len = nationalNumber.length;

  switch (countryCode) {
    case 'IN':
      return len === 10 && /^[6-9]/.test(nationalNumber);
    case 'US':
    case 'CA':
      return len === 10 && /^[2-9]/.test(nationalNumber);
    case 'GB':
      return len >= 10 && len <= 11;
    case 'AU':
      return len === 9 && /^[2-9]/.test(nationalNumber);
    case 'AE':
      return len === 9 && /^[5]/.test(nationalNumber);
    case 'SG':
      return len === 8;
    default:
      // Generic: 6-15 digits
      return len >= 6 && len <= 15;
  }
}

/**
 * Format a parsed phone for display.
 * - 'e164': +919876543210
 * - 'national': 98765 43210
 * - 'display': +91 98765 43210
 */
export function formatPhone(
  parsed: ParsedPhone,
  format: 'e164' | 'national' | 'display' = 'e164'
): string {
  if (format === 'e164') {
    return parsed.e164;
  }

  if (format === 'national') {
    // Simple grouping for India: XXXXX XXXXX
    if (parsed.countryCode === 'IN' && parsed.nationalNumber.length === 10) {
      return `${parsed.nationalNumber.slice(0, 5)} ${parsed.nationalNumber.slice(5)}`;
    }
    // US/CA: (XXX) XXX-XXXX
    if ((parsed.countryCode === 'US' || parsed.countryCode === 'CA') && parsed.nationalNumber.length === 10) {
      return `(${parsed.nationalNumber.slice(0, 3)}) ${parsed.nationalNumber.slice(3, 6)}-${parsed.nationalNumber.slice(6)}`;
    }
    return parsed.nationalNumber;
  }

  // 'display': dial code + formatted national
  const national = formatPhone(parsed, 'national');
  return `${parsed.dialCode} ${national}`;
}

/**
 * Detect country code from input string.
 * Returns ISO code (e.g., 'IN', 'US') or 'IN' as default.
 */
export function detectCountryCode(input: string): string {
  const parsed = parsePhone(input);
  return parsed?.countryCode ?? 'IN';
}

/**
 * Normalize phone number for storage in the database (E.164 format).
 * Always returns a string in +CCNNNNNNNNN format, or the original input if unparseable.
 */
export function normalizeForStorage(input: string): string {
  const parsed = parsePhone(input);
  return parsed ? parsed.e164 : input.trim();
}
