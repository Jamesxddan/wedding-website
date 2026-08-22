'use client';

import * as React from 'react';
import {
  parsePhone,
  formatPhone,
  getCountryCodeOptions,
  detectCountryCode,
  type ParsedPhone,
  type CountryOption,
} from '@/lib/phone';

interface PhoneInputProps {
  /** Controlled value: { countryCode: string; nationalNumber: string } */
  value?: { countryCode: string; nationalNumber: string };
  /** Called when the parsed value changes */
  onChange: (value: { countryCode: string; nationalNumber: string }) => void;
  /** Initial uncontrolled value (raw string) */
  defaultValue?: string;
  /** Placeholder for the national number input */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Show country flag in dropdown */
  showFlag?: boolean;
  /** Custom className for the wrapper */
  className?: string;
}

export function PhoneInput(props: PhoneInputProps) {
  const {
    value: propValue,
    onChange,
    defaultValue,
    placeholder = 'Enter phone number',
    disabled = false,
    error,
    showFlag = true,
    className = '',
  } = props;

  // State for uncontrolled component
  const [rawValue, setRawValue] = React.useState<string>(defaultValue ?? '');
  const [countryCode, setCountryCode] = React.useState<string>('IN'); // default India
  const [nationalNumber, setNationalNumber] = React.useState<string>('');
  const [isFocused, setIsFocused] = React.useState(false);

  // Initialize from propValue if provided
  React.useEffect(() => {
    if (propValue) {
      setCountryCode(propValue.countryCode);
      setNationalNumber(propValue.nationalNumber);
      // Also update rawValue for display consistency
      const parsed = {
        countryCode: propValue.countryCode,
        dialCode: `+${propValue.countryCode === 'IN' ? '91' : '1'}`, // TODO: get actual dial code
        nationalNumber: propValue.nationalNumber,
        e164: '',
        isValid: true,
      };
      setRawValue(formatPhone(parsed as ParsedPhone, 'display'));
    }
  }, [propValue]);

  // Initialize from defaultValue (raw string)
  React.useEffect(() => {
    if (defaultValue !== undefined) {
      const parsed = parsePhone(defaultValue);
      if (parsed) {
        setCountryCode(parsed.countryCode);
        setNationalNumber(parsed.nationalNumber);
        setRawValue(formatPhone(parsed, 'display'));
      } else {
        setRawValue(defaultValue);
        // Try to detect country from the raw value
        setCountryCode(detectCountryCode(defaultValue));
      }
    }
  }, [defaultValue]);

  // Whenever countryCode or nationalNumber changes, notify parent
  React.useEffect(() => {
    // Only call onChange if we have a valid national number (at least some digits)
    if (nationalNumber.length > 0) {
      onChange({ countryCode, nationalNumber });
    }
  }, [countryCode, nationalNumber, onChange]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value);
    // Keep the same national number when switching countries
  };

  const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNationalNumber(e.target.value);
    // Update rawValue for display (optional)
    const parsed = {
      countryCode,
      dialCode: getCountryCodeOptions().find(c => c.code === countryCode)?.dialCode ?? '+91',
      nationalNumber: e.target.value,
      e164: '',
      isValid: true,
    };
    setRawValue(formatPhone(parsed as ParsedPhone, 'display'));
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // Get the selected country's dial code and flag
  const selectedCountry = getCountryCodeOptions().find(c => c.code === countryCode);
  const dialCode = selectedCountry?.dialCode ?? '+91';
  const flag = selectedCountry?.flag ?? '🇮🇳';

  // Format the current value for display (in the input)
  const displayValue = nationalNumber
    ? formatPhone(
        {
          countryCode,
          dialCode,
          nationalNumber,
          e164: '', // will be ignored by formatPhone for national/display
          isValid: true,
        },
        'display'
      )
    : '';

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex items-center">
        {/* Country dropdown */}
        <select
          value={countryCode}
          onChange={handleCountryChange}
          disabled={disabled}
          className={`border-r-0 border-b rounded-l-lg bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
          aria-label="Country code"
        >
          {getCountryCodeOptions().map((option) => (
            <option key={option.code} value={option.code}>
              {showFlag && option.flag} {option.dialCode} {option.name}
            </option>
          ))}
        </select>

        {/* National number input */}
        <input
          type="tel"
          value={displayValue}
          onChange={handleNationalChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 border-b rounded-r-lg bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-label="Phone number"
          inputMode="tel"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Hint / example */}
      {!error && nationalNumber && (
        <p className="mt-1 text-xs text-gray-500">
          Format: {formatPhone(
            {
              countryCode,
              dialCode,
              nationalNumber,
              e164: '',
              isValid: true,
            },
            'national'
          )}
        </p>
      )}
    </div>
  );
}