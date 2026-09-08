'use client';

import * as React from 'react';
import { getCountryCodeOptions, type CountryOption } from '@/lib/phone';

/**
 * The value PhoneInput hands back on every change. `countryCode` is the ISO
 * code (e.g. "IN") for a curated selection, or the literal string "CUSTOM"
 * when the guest picked the manual "Custom" entry. `dialCode` is always the
 * actual authoritative dial code to use (e.g. "+91", or whatever the guest
 * typed into the custom field) — callers should combine it with
 * `nationalNumber` via lib/phone.ts's combineDialCode(), not re-derive it by
 * looking `countryCode` up in COUNTRY_OPTIONS (that lookup doesn't work for
 * "CUSTOM").
 */
export interface PhoneInputValue {
  countryCode: string;
  dialCode: string;
  nationalNumber: string;
}

interface PhoneInputProps {
  value?: PhoneInputValue;
  onChange: (value: PhoneInputValue) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const CUSTOM_CODE = 'CUSTOM';

export function PhoneInput(props: PhoneInputProps) {
  const { value, onChange, placeholder = 'Phone number', disabled = false, error, className = '' } = props;

  const countryCode = value?.countryCode ?? 'IN';
  const dialCode = value?.dialCode ?? '+91';
  const nationalNumber = value?.nationalNumber ?? '';

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [customDialCode, setCustomDialCode] = React.useState(countryCode === CUSTOM_CODE ? dialCode : '');
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  React.useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const query = search.trim().toLowerCase();
  const options = getCountryCodeOptions();
  const filteredOptions = query
    ? options
        .filter((c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().startsWith(query))
        .sort((a, b) => {
          const aPrefix = a.code.toLowerCase().startsWith(query);
          const bPrefix = b.code.toLowerCase().startsWith(query);
          if (aPrefix && !bPrefix) return -1;
          if (!aPrefix && bPrefix) return 1;
          return 0;
        })
    : options;

  function selectCountry(option: CountryOption) {
    onChange({ countryCode: option.code, dialCode: option.dialCode, nationalNumber });
    setOpen(false);
    setSearch('');
  }

  function selectCustom() {
    onChange({ countryCode: CUSTOM_CODE, dialCode: customDialCode, nationalNumber });
    setOpen(false);
    setSearch('');
  }

  function handleCustomDialCodeChange(v: string) {
    setCustomDialCode(v);
    onChange({ countryCode: CUSTOM_CODE, dialCode: v, nationalNumber });
  }

  function handleNationalChange(v: string) {
    onChange({ countryCode, dialCode, nationalNumber: v.replace(/[^\d\s-]/g, '') });
  }

  const isCustom = countryCode === CUSTOM_CODE;

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="flex items-stretch gap-0">
        {/* Collapsed trigger — dial code only, no flag/name, so it doesn't crowd the number field */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-label="Select country code"
          aria-expanded={open}
          className={`shrink-0 border border-r-0 rounded-l-lg bg-gray-50 px-3 py-2 text-sm font-medium text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-100'
          }`}
          style={{ minWidth: 72 }}
        >
          {isCustom ? (customDialCode || 'Custom') : dialCode}
        </button>

        <input
          type="tel"
          inputMode="tel"
          value={nationalNumber}
          onChange={(e) => handleNationalChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Phone number"
          className={`flex-1 min-w-0 border rounded-r-lg bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            disabled ? 'cursor-not-allowed opacity-60' : ''
          }`}
        />
      </div>

      {isCustom && (
        <input
          type="text"
          value={customDialCode}
          onChange={(e) => handleCustomDialCodeChange(e.target.value)}
          placeholder="Your country's dial code, e.g. +998"
          disabled={disabled}
          aria-label="Custom dial code"
          className="mt-1.5 w-full border rounded-lg bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 max-w-[90vw] bg-white border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  onMouseDown={() => selectCountry(option)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 ${
                    option.code === countryCode ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  <span>{option.flag}</span>
                  <span className="flex-1 truncate">{option.name}</span>
                  <span className="text-gray-500">{option.dialCode}</span>
                </button>
              </li>
            ))}
            {/* "Custom" is deliberately outside the search filter — it never
                matches a query, only manual scrolling reaches it. */}
            <li className="border-t">
              <button
                type="button"
                onMouseDown={selectCustom}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 ${
                  isCustom ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <span>🌐</span>
                <span className="flex-1">Custom</span>
              </button>
            </li>
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
