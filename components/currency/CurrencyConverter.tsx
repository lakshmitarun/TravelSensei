"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CurrencyConversionResult, CurrencyInfo } from "@/lib/currency/types";
import CurrencySelector from "./CurrencySelector";

export interface CurrencyConverterProps {
  initialAmount?: number;
  initialFrom?: string;
  initialTo?: string;
  className?: string;
}

export default function CurrencyConverter({
  initialAmount = 100,
  initialFrom = "USD",
  initialTo = "INR",
  className = "",
}: CurrencyConverterProps) {
  const [amountInput, setAmountInput] = useState<string>(String(initialAmount));
  const [fromCurrency, setFromCurrency] = useState<string>(initialFrom.toUpperCase());
  const [toCurrency, setToCurrency] = useState<string>(initialTo.toUpperCase());

  // Currencies catalog state
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState<boolean>(true);

  // Conversion state
  const [conversionResult, setConversionResult] = useState<CurrencyConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load supported currencies catalog from /api/currency/currencies
  useEffect(() => {
    let isMounted = true;

    async function loadCurrencies() {
      setIsLoadingCurrencies(true);
      try {
        const res = await fetch("/api/currency/currencies");
        const json = await res.json().catch(() => ({}));

        if (isMounted && res.ok && json.success && Array.isArray(json.data?.currencies)) {
          setCurrencies(json.data.currencies);
        }
      } catch {
        // Fallback handled in CurrencySelector
      } finally {
        if (isMounted) {
          setIsLoadingCurrencies(false);
        }
      }
    }

    loadCurrencies();

    return () => {
      isMounted = false;
    };
  }, []);

  // Conversion handler
  const handleConvert = useCallback(async () => {
    setValidationError(null);
    setConversionError(null);

    const trimmed = amountInput.trim();
    if (!trimmed) {
      setValidationError("Please enter an amount to convert.");
      return;
    }

    const numAmount = Number(trimmed);
    if (isNaN(numAmount) || !isFinite(numAmount)) {
      setValidationError("Amount must be a valid number.");
      return;
    }

    if (numAmount <= 0) {
      setValidationError("Amount must be greater than 0.");
      return;
    }

    if (numAmount > 100_000_000) {
      setValidationError("Amount exceeds maximum limit of 100,000,000.");
      return;
    }

    // Same-currency fast path: skip API call
    if (fromCurrency === toCurrency) {
      setConversionResult({
        amount: numAmount,
        from: fromCurrency,
        to: toCurrency,
        rate: 1,
        convertedAmount: numAmount,
        date: new Date().toISOString().slice(0, 10),
        provider: "frankfurter",
      });
      return;
    }

    setIsConverting(true);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("amount", String(numAmount));
      queryParams.set("from", fromCurrency);
      queryParams.set("to", toCurrency);

      const res = await fetch(`/api/currency?${queryParams.toString()}`);
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        setConversionResult(json.data);
      } else {
        setConversionResult(null);
        if (res.status === 401) {
          setConversionError("Please sign in to convert currencies.");
        } else {
          setConversionError(json.message || "Unable to convert currencies right now.");
        }
      }
    } catch {
      setConversionResult(null);
      setConversionError("Unable to convert currencies right now. Please check your network connection.");
    } finally {
      setIsConverting(false);
    }
  }, [amountInput, fromCurrency, toCurrency]);

  // Swap currencies handler
  const handleSwap = () => {
    const currentFrom = fromCurrency;
    const currentTo = toCurrency;
    setFromCurrency(currentTo);
    setToCurrency(currentFrom);
    // Clear previous result to prompt user or avoid stale direction
    setConversionResult(null);
    setConversionError(null);
  };

  return (
    <div
      id="currency-converter-widget"
      className={`bg-surface-container-low rounded-3xl p-5 sm:p-7 border border-surface-container-high/60 shadow-xs flex flex-col gap-5 ${className}`}
      role="region"
      aria-label="Travel Currency Converter"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container-high/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">currency_exchange</span>
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
              Travel Currency Converter
            </h3>
            <p className="text-xs text-on-surface-variant">
              Live central bank exchange rates for your journey budget.
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto text-[11px] font-medium px-3 py-1 rounded-full bg-surface-container-lowest border border-surface-container-high/60 text-on-surface-variant">
          Rates by Frankfurter
        </span>
      </div>

      {/* Converter Form Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3.5">
        {/* Amount Input */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label
            htmlFor="currency-amount-input"
            className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Amount
          </label>
          <div className="relative">
            <input
              id="currency-amount-input"
              type="number"
              min="0.01"
              step="any"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="100"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high hover:border-surface-container-highest focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-extrabold text-on-surface transition-all shadow-xs"
              aria-label="Amount to convert"
            />
          </div>
        </div>

        {/* Source Currency */}
        <div className="flex-1">
          <CurrencySelector
            id="currency-from-select"
            label="From Currency"
            value={fromCurrency}
            onChange={setFromCurrency}
            currencies={currencies}
            isLoading={isLoadingCurrencies}
          />
        </div>

        {/* Swap Button */}
        <div className="flex items-center justify-center self-center lg:self-end pb-0.5">
          <button
            type="button"
            id="btn-swap-currencies"
            onClick={handleSwap}
            className="w-11 h-11 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-surface-container-high hover:border-primary/40 text-primary transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
            title="Swap currencies"
            aria-label="Swap source and target currencies"
          >
            <span className="material-symbols-outlined text-[20px]">
              swap_horiz
            </span>
          </button>
        </div>

        {/* Target Currency */}
        <div className="flex-1">
          <CurrencySelector
            id="currency-to-select"
            label="To Currency"
            value={toCurrency}
            onChange={setToCurrency}
            currencies={currencies}
            isLoading={isLoadingCurrencies}
          />
        </div>

        {/* Convert Button */}
        <div className="lg:min-w-[130px] flex flex-col justify-end">
          <button
            type="button"
            id="btn-convert-currency"
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full h-11 px-5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isConverting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Converting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  calculate
                </span>
                <span>Convert</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div
          id="currency-validation-error"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150"
        >
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Conversion Error State with Retry Button */}
      {conversionError && !isConverting && (
        <div
          id="currency-error-state"
          className="p-4 rounded-2xl bg-surface-container-lowest border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5 text-rose-600 text-xs font-semibold">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <span>{conversionError}</span>
          </div>
          <button
            type="button"
            id="btn-retry-conversion"
            onClick={handleConvert}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
            aria-label="Retry conversion"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
            <span>Retry Conversion</span>
          </button>
        </div>
      )}

      {/* Conversion Result Card */}
      {conversionResult && !conversionError && (
        <div
          id="currency-conversion-result"
          className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/5 border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs animate-in fade-in duration-300"
        >
          {/* Main Converted Calculation */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-semibold">
              {conversionResult.amount.toLocaleString()} {conversionResult.from} equals
            </span>
            <div className="flex items-baseline gap-2">
              <span
                id="currency-converted-amount"
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary tracking-tight"
              >
                {conversionResult.convertedAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{" "}
                {conversionResult.to}
              </span>
            </div>
            <span
              id="currency-exchange-rate"
              className="text-xs font-bold text-on-surface pt-0.5"
            >
              Rate: 1 {conversionResult.from} ={" "}
              {conversionResult.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
              {conversionResult.to}
            </span>
          </div>

          {/* Rate Date & Metadata */}
          <div className="flex flex-col items-start md:items-end gap-1 text-[11px] text-on-surface-variant border-t md:border-t-0 pt-3 md:pt-0 border-surface-container-high/40 w-full md:w-auto">
            <span id="currency-rate-date" className="font-medium">
              Exchange rate as of {conversionResult.date}
            </span>
            <span className="text-[10px] text-on-surface-variant/70">
              Provider: {conversionResult.provider}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
