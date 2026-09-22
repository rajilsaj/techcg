"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import type { Key } from "@/i18n";
import { useT } from "@/i18n/client";

export interface Country {
  code: string;
  /** Dictionary key for the localised country name. */
  name: Key;
  dial: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "CG", name: "country.CG", dial: "242", flag: "🇨🇬" },
  { code: "CD", name: "country.CD", dial: "243", flag: "🇨🇩" },
  { code: "CM", name: "country.CM", dial: "237", flag: "🇨🇲" },
  { code: "GA", name: "country.GA", dial: "241", flag: "🇬🇦" },
  { code: "CF", name: "country.CF", dial: "236", flag: "🇨🇫" },
  { code: "TD", name: "country.TD", dial: "235", flag: "🇹🇩" },
  { code: "GQ", name: "country.GQ", dial: "240", flag: "🇬🇶" },
  { code: "ST", name: "country.ST", dial: "239", flag: "🇸🇹" },
  { code: "AO", name: "country.AO", dial: "244", flag: "🇦🇴" },
  { code: "RW", name: "country.RW", dial: "250", flag: "🇷🇼" },
  { code: "BI", name: "country.BI", dial: "257", flag: "🇧🇮" },
  { code: "NG", name: "country.NG", dial: "234", flag: "🇳🇬" },
  { code: "FR", name: "country.FR", dial: "33", flag: "🇫🇷" },
  { code: "BE", name: "country.BE", dial: "32", flag: "🇧🇪" },
  { code: "GB", name: "country.GB", dial: "44", flag: "🇬🇧" },
  { code: "US", name: "country.US", dial: "1", flag: "🇺🇸" },
  { code: "CA", name: "country.CA", dial: "1", flag: "🇨🇦" },
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
  const t = useT();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
        {t("auth.phone.label")}
      </label>

      <div
        className={`flex rounded-xl border bg-bg transition-all focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(255,102,0,0.15)] ${
          invalid ? "border-red-500" : "border-border"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div className="relative flex items-center border-r border-border">
          <select
            aria-label={t("auth.phone.countryCode")}
            value={country.code}
            disabled={disabled}
            onChange={(e) => {
              const next = COUNTRIES.find((c) => c.code === e.target.value);
              if (next) onCountryChange(next);
            }}
            className="h-full cursor-pointer appearance-none rounded-l-xl bg-transparent py-3 pl-3 pr-8 text-sm text-text focus:outline-none focus-visible:bg-bg-secondary disabled:cursor-not-allowed"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} title={t(c.name)}>
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
          placeholder={t("auth.phone.placeholder")}
          className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-3.5 py-3 text-[15px] text-text placeholder:text-text-secondary/60 focus:!border-transparent focus:!shadow-none focus:outline-none"
        />
      </div>

      <p id={`${id}-hint`} className="mt-1.5 text-xs text-text-secondary">
        {t("auth.phone.hint")}
      </p>
    </div>
  );
});
