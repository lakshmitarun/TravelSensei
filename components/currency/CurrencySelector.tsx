"use client";

import React from "react";
import { CurrencyInfo } from "@/lib/currency/types";

export interface CurrencySelectorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  currencies: CurrencyInfo[];
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

// Fallback currency list for offline or loading state
const FALLBACK_CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "United States Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "AED", name: "UAE Dirham" },
  { code: "THB", name: "Thai Baht" },
];

export default function CurrencySelector({
  id,
  label,
  value,
  onChange,
  currencies,
  isLoading = false,
  disabled = false,
  className = "",
}: CurrencySelectorProps) {
  const availableCurrencies =
    currencies && currencies.length > 0 ? currencies : FALLBACK_CURRENCIES;

  // Ensure currently selected value is present in options list
  const hasSelectedCode = availableCurrencies.some((c) => c.code === value);
  const displayCurrencies = hasSelectedCode
    ? availableCurrencies
    : [{ code: value, name: value }, ...availableCurrencies];

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between"
      >
        <span>{label}</span>
        {isLoading && (
          <span className="text-[10px] text-primary font-medium animate-pulse">
            Loading...
          </span>
        )}
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="w-full h-11 px-3.5 pr-9 rounded-xl bg-surface-container-lowest border border-surface-container-high hover:border-surface-container-highest focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-on-surface transition-all appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
          aria-label={label}
        >
          {displayCurrencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>

        {/* Custom dropdown chevron */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">
            expand_more
          </span>
        </div>
      </div>
    </div>
  );
}
