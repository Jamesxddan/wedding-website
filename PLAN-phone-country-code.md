# Phone Number Country Code Implementation Plan

## Overview
Add a country code selector (dropdown) to all phone number inputs across the website, with +91 (India) as default. Normalize existing phone numbers in the database and use the standardized format for relink verification.

---

## Current State Analysis

### Database Schema (`supabase/schema.sql`)
```sql
mobile text unique  -- currently stores raw user input
```

### Files Using Phone Numbers
| File | Purpose | Current Handling |
|------|---------|------------------|
| `app/api/register/route.ts` | New guest registration | `mobile?.trim()` |
| `app/api/relink/route.ts` | Relink verification | Exact match on `mobile` |
| `app/page.tsx` | UI forms (registration + relink) | Simple text input |

### Existing Data Patterns (to handle)
- `+91 98765 43210` or `+919876543210`
- `91 98765 43210` or `919876543210`
- `98765 43210` (10-digit, assumed India)
- International formats: `+1 555 123 4567`, `+44 20 7946 0958`

---

## Implementation Plan

### Phase 1: Core Library (`lib/phone.ts`)
Create a reusable phone number utility module:

**Exports:**
- `parsePhone(input: string): ParsedPhone | null`
- `formatPhone(parsed: ParsedPhone, format: 'e164' | 'national' | 'display'): string`
- `getCountryCodeOptions(): CountryOption[]`
- `detectCountryCode(input: string): string` — defaults to 'IN' (+91)
- `normalizeForStorage(input: string): string` — stores as E.164 format (+919876543210)

**Types:**
```ts
interface ParsedPhone {
  countryCode: string;  // 'IN', 'US', 'GB', etc.
  nationalNumber: string;  // '9876543210' (no leading zero)
  e164: string;  // '+919876543210'
  isValid: boolean;
}

interface CountryOption {
  code: string;  // 'IN'
  dialCode: string;  // '+91'
  name: string;  // 'India'
  flag: string;  // '🇮🇳'
}
```

**Dependencies:** Use `libphonenumber-js` (lightweight, no metadata bloat) or custom regex for common patterns.

---

### Phase 2: Database Migration
**Migration 1:** Add `mobile_normalized` column (E.164 format)
```sql
alter table guests add column if not exists mobile_normalized text unique;
```

**Migration 2:** Backfill existing numbers
```sql
update guests set mobile_normalized = normalize_phone(mobile) where mobile is not null;
```
Create a SQL function `normalize_phone()` that handles the patterns above.

**Migration 3:** Add index on `mobile_normalized`

---

### Phase 3: API Updates

#### `app/api/register/route.ts`
- Accept `country_code` + `national_number` OR single `mobile` field
- Use `normalizeForStorage()` to store E.164 in `mobile_normalized`
- Keep raw `mobile` for display/reference
- Lookup by `mobile_normalized` for deduplication

#### `app/api/relink/route.ts`
- Update phone verification to use normalized comparison
- Accept `country_code` + `national_number` in verify phase
- Compare against `mobile_normalized` (E.164)

---

### Phase 4: UI Components

#### New Component: `components/ui/PhoneInput.tsx`
```tsx
interface PhoneInputProps {
  value: { countryCode: string; nationalNumber: string };
  onChange: (value: { countryCode: string; nationalNumber: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}
```
**Features:**
- Dropdown with searchable country list (default: India 🇮🇳 +91)
- Flag emoji + dial code display
- National number input with appropriate formatting/masking
- Manual override: user can type full number, auto-detects country
- Validation feedback

#### Update `app/page.tsx`
- Replace phone text inputs in:
  - Registration form (step "register")
  - Relink lookup form (step "lookup")
  - Relink verify form (step "verify")
- Use new `PhoneInput` component

---

### Phase 5: Country Code Data
Use a curated list of ~250 countries with:
- ISO 3166-1 alpha-2 code
- Dial code
- Country name
- Flag emoji (regional indicator symbols)

**Default:** India (IN, +91, 🇮🇳)

---

### Phase 6: Validation Rules
| Country | National Number Length | Example |
|---------|------------------------|---------|
| India (IN) | 10 | 9876543210 |
| US/CA (US) | 10 | 5551234567 |
| UK (GB) | 10-11 | 2079460958 |
| Generic | 6-15 | variable |

---

### Phase 7: Testing
- Unit tests for `lib/phone.ts` (parse, format, detect, normalize)
- Integration tests for register/relink API with various formats
- UI tests for PhoneInput component
- Edge cases: existing data migration, invalid inputs, international numbers

---

## File Changes Summary

| File | Change Type |
|------|-------------|
| `lib/phone.ts` | NEW - core utility |
| `components/ui/PhoneInput.tsx` | NEW - reusable component |
| `app/api/register/route.ts` | MODIFY - accept country_code, store normalized |
| `app/api/relink/route.ts` | MODIFY - verify against normalized |
| `app/page.tsx` | MODIFY - use PhoneInput component |
| `supabase/schema.sql` | MODIFY - add mobile_normalized column |
| `supabase/migrations/*.sql` | NEW - migration scripts |
| `tests/phone.test.ts` | NEW - unit tests |
| `tests/register-phone.test.ts` | NEW - API tests |

---

## Rollout Order
1. Create `lib/phone.ts` with tests
2. Create `PhoneInput` component
3. Update registration API + UI
4. Update relink API + UI
5. Run database migration
6. Test end-to-end

---

## Notes
- **No breaking changes**: Keep `mobile` column for backward compat; new `mobile_normalized` for lookups
- **Default UX**: India (+91) pre-selected; geo-IP detection optional future enhancement
- **Relink security**: Verification compares normalized E.164 values, preventing format mismatch issues