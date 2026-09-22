"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "CG", name: "Congo-Brazzaville", dial: "242", flag: "🇨🇬" },
  { code: "CD", name: "Congo-Kinshasa", dial: "243", flag: "🇨🇩" },
  { code: "CM", name: "Cameroon", dial: "237", flag: "🇨🇲" },
  { code: "GA", name: "Gabon", dial: "241", flag: "🇬🇦" },
  { code: "CF", name: "Central African Republic", dial: "236", flag: "🇨🇫" },
  { code: "TD", name: "Chad", dial: "235", flag: "🇹🇩" },
  { code: "GQ", name: "Equatorial Guinea", dial: "240", flag: "🇬🇶" },
  { code: "ST", name: "São Tomé & Príncipe", dial: "239", flag: "🇸🇹" },
  { code: "AO", name: "Angola", dial: "244", flag: "🇦🇴" },
  { code: "RW", name: "Rwanda", dial: "250", flag: "🇷🇼" },
  { code: "BI", name: "Burundi", dial: "257", flag: "🇧🇮" },
  { code: "NG", name: "Nigeria", dial: "234", flag: "🇳🇬" },
  { code: "FR", name: "France", dial: "33", flag: "🇫🇷" },
  { code: "BE", name: "Belgium", dial: "32", flag: "🇧🇪" },
  { code: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧" },
  { code: "US", name: "United States", dial: "1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "1", flag: "🇨🇦" },
];

export function toE164(country: Country, national: string) {
  return `+${country.dial}${national.replace(/\D/g, "")}`;
}

export function isValidNational(national: string) {
  return /^\d{6,14}$/.test(national.replace(/\D/g, ""));
}

interface PhoneFieldProps {
  id: string;
  country: Country;
  onCountryChange: (country: Country) => void;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  { id, country, onCountryChange, value, onChange, disabled, invalid, describedBy },
  ref
) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
        Phone number
      </label>

      <div
        className={`flex rounded-xl border bg-bg transition-all focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(255,102,0,0.15)] ${
          invalid ? "border-red-500" : "border-border"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div className="relative flex items-center border-r border-border">
          <select
            aria-label="Country code"
            value={country.code}
            disabled={disabled}
            onChange={(e) => {
              const next = COUNTRIES.find((c) => c.code === e.target.value);
              if (next) onCountryChange(next);
            }}
            className="h-full cursor-pointer appearance-none rounded-l-xl bg-transparent py-3 pl-3 pr-8 text-sm text-text focus:outline-none focus-visible:bg-bg-secondary disabled:cursor-not-allowed"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} +{c.dial}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 text-text-secondary"
            aria-hidden="true"
          />
        </div>

        <input
          ref={ref}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder="06 123 4567"
          className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-3.5 py-3 text-[15px] text-text placeholder:text-text-secondary/60 focus:!border-transparent focus:!shadow-none focus:outline-none"
        />
      </div>

      <p id={`${id}-hint`} className="mt-1.5 text-xs text-text-secondary">
        We&apos;ll text you a one-time code. Standard SMS rates may apply.
      </p>
    </div>
  );
});
