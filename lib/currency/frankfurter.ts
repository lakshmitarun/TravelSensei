/**
 * Frankfurter Currency Client
 * Free and keyless central bank currency exchange service.
 * Docs: https://api.frankfurter.dev/v1
 */

import {
  CurrencyConversionParams,
  CurrencyConversionResult,
  CurrencyInfo,
} from "./types";

export class FrankfurterCurrencyError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 500, code: string = "CURRENCY_ERROR") {
    super(message);
    this.name = "FrankfurterCurrencyError";
    this.status = status;
    this.code = code;
  }
}

interface RawFrankfurterLatestResponse {
  amount?: number;
  base?: string;
  date?: string;
  rates?: Record<string, number>;
  message?: string;
}

const DEFAULT_BASE_URL = "https://api.frankfurter.dev/v1";
const DEFAULT_TIMEOUT_MS = 8000;

// Rate Cache: FROM:TO -> { rate, date, expiresAt }
interface RateCacheEntry {
  rate: number;
  date: string;
  expiresAt: number;
}

const RATE_CACHE = new Map<string, RateCacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const MAX_CACHE_ENTRIES = 500;

function buildRateCacheKey(from: string, to: string): string {
  return `${from.toUpperCase()}:${to.toUpperCase()}`;
}

function getRateFromCache(from: string, to: string): { rate: number; date: string } | null {
  const key = buildRateCacheKey(from, to);
  const entry = RATE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    RATE_CACHE.delete(key);
    return null;
  }
  return { rate: entry.rate, date: entry.date };
}

function saveRateToCache(from: string, to: string, rate: number, date: string): void {
  const key = buildRateCacheKey(from, to);
  if (RATE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = RATE_CACHE.keys().next().value;
    if (oldestKey) RATE_CACHE.delete(oldestKey);
  }
  RATE_CACHE.set(key, {
    rate,
    date,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// Currencies Cache
interface CurrenciesCacheEntry {
  currencies: CurrencyInfo[];
  expiresAt: number;
}

let currenciesCache: CurrenciesCacheEntry | null = null;
const CURRENCIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clears in-memory currency caches (useful for testing).
 */
export function clearCurrencyCache(): void {
  RATE_CACHE.clear();
  currenciesCache = null;
}

/**
 * Converts an amount from one currency to another using Frankfurter.
 */
export async function convertCurrency(
  params: CurrencyConversionParams
): Promise<CurrencyConversionResult> {
  const { amount } = params;
  const from = (params.from || "").trim().toUpperCase();
  const to = (params.to || "").trim().toUpperCase();

  // Validate amount
  if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
    throw new FrankfurterCurrencyError(
      "Amount must be a valid finite number.",
      400,
      "INVALID_AMOUNT"
    );
  }

  if (amount <= 0) {
    throw new FrankfurterCurrencyError(
      "Amount must be greater than 0.",
      400,
      "INVALID_AMOUNT"
    );
  }

  if (amount > 100_000_000) {
    throw new FrankfurterCurrencyError(
      "Amount exceeds maximum allowed limit of 100,000,000.",
      400,
      "AMOUNT_TOO_LARGE"
    );
  }

  // Validate currency codes
  if (!/^[A-Z]{3}$/.test(from)) {
    throw new FrankfurterCurrencyError(
      "Invalid 'from' currency code: must be a 3-letter ISO currency code.",
      400,
      "INVALID_FROM_CURRENCY"
    );
  }

  if (!/^[A-Z]{3}$/.test(to)) {
    throw new FrankfurterCurrencyError(
      "Invalid 'to' currency code: must be a 3-letter ISO currency code.",
      400,
      "INVALID_TO_CURRENCY"
    );
  }

  // Same currency fast-path: rate is 1, no external call needed
  if (from === to) {
    return {
      amount,
      from,
      to,
      rate: 1,
      convertedAmount: amount,
      date: new Date().toISOString().slice(0, 10),
      provider: "frankfurter",
    };
  }

  // Check rate cache
  const cached = getRateFromCache(from, to);
  if (cached) {
    return {
      amount,
      from,
      to,
      rate: cached.rate,
      convertedAmount: Number((amount * cached.rate).toFixed(4)),
      date: cached.date,
      provider: "frankfurter",
    };
  }

  // Call Frankfurter API
  const baseUrl = process.env.FRANKFURTER_API_BASE_URL || DEFAULT_BASE_URL;
  const url = new URL(`${baseUrl}/latest`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FrankfurterCurrencyError(
        "Frankfurter currency service timed out.",
        504,
        "CURRENCY_TIMEOUT"
      );
    }
    throw new FrankfurterCurrencyError(
      "Unable to connect to currency conversion service.",
      502,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new FrankfurterCurrencyError(
        "Rate limit reached for currency conversion service. Please try again later.",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }
    if (response.status === 404 || response.status === 422) {
      throw new FrankfurterCurrencyError(
        `Currency conversion not available between '${from}' and '${to}'.`,
        400,
        "INVALID_CURRENCY_PAIR"
      );
    }
    if (response.status === 400) {
      throw new FrankfurterCurrencyError(
        "Invalid currency conversion request to Frankfurter.",
        400,
        "BAD_REQUEST"
      );
    }
    throw new FrankfurterCurrencyError(
      `Currency service returned an error (${response.status}).`,
      502,
      "PROVIDER_ERROR"
    );
  }

  let rawData: RawFrankfurterLatestResponse;
  try {
    rawData = (await response.json()) as RawFrankfurterLatestResponse;
  } catch {
    throw new FrankfurterCurrencyError(
      "Failed to parse currency conversion response.",
      502,
      "INVALID_RESPONSE"
    );
  }

  const rate = rawData.rates?.[to];
  if (typeof rate !== "number" || isNaN(rate) || !isFinite(rate)) {
    throw new FrankfurterCurrencyError(
      `Exchange rate not found for '${from}' to '${to}'.`,
      400,
      "RATE_NOT_FOUND"
    );
  }

  const date = rawData.date || new Date().toISOString().slice(0, 10);

  // Cache rate
  saveRateToCache(from, to, rate, date);

  return {
    amount,
    from,
    to,
    rate,
    convertedAmount: Number((amount * rate).toFixed(4)),
    date,
    provider: "frankfurter",
  };
}

/**
 * Retrieves the list of supported currencies from Frankfurter.
 */
export async function getSupportedCurrencies(): Promise<CurrencyInfo[]> {
  if (currenciesCache && Date.now() < currenciesCache.expiresAt) {
    return currenciesCache.currencies;
  }

  const baseUrl = process.env.FRANKFURTER_API_BASE_URL || DEFAULT_BASE_URL;
  const url = `${baseUrl}/currencies`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FrankfurterCurrencyError(
        "Currencies lookup timed out.",
        504,
        "CURRENCY_TIMEOUT"
      );
    }
    throw new FrankfurterCurrencyError(
      "Unable to connect to currency list service.",
      502,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    throw new FrankfurterCurrencyError(
      `Failed to retrieve currencies list (${response.status}).`,
      502,
      "PROVIDER_ERROR"
    );
  }

  let rawMap: Record<string, string>;
  try {
    rawMap = (await response.json()) as Record<string, string>;
  } catch {
    throw new FrankfurterCurrencyError(
      "Failed to parse currencies response.",
      502,
      "INVALID_RESPONSE"
    );
  }

  const currencies: CurrencyInfo[] = Object.entries(rawMap)
    .map(([code, name]) => ({
      code: code.toUpperCase(),
      name,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  currenciesCache = {
    currencies,
    expiresAt: Date.now() + CURRENCIES_CACHE_TTL_MS,
  };

  return currencies;
}
