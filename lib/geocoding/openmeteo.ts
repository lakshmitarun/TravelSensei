/**
 * Open-Meteo Geocoding Client
 * Free and keyless geocoding service: city/name -> coordinates.
 * Docs: https://geocoding-api.open-meteo.com
 */

import {
  GeocodingLocation,
  GeocodingSearchResult,
  GeocodingSearchParams,
} from "./types";
import { findRegionalDestinations } from "./regions";

export class OpenMeteoGeocodingError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 500, code: string = "GEOCODING_ERROR") {
    super(message);
    this.name = "OpenMeteoGeocodingError";
    this.status = status;
    this.code = code;
  }
}

// Raw Open-Meteo Geocoding Response Item
interface RawOpenMeteoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
  population?: number;
  country_id?: number;
  admin1_id?: number;
  admin2_id?: number;
}

interface RawOpenMeteoResponse {
  results?: RawOpenMeteoLocation[];
  generationtime_ms?: number;
}

const DEFAULT_BASE_URL = "https://geocoding-api.open-meteo.com";
const DEFAULT_TIMEOUT_MS = 8000;

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  india: "IN",
  finland: "FI",
  france: "FR",
  japan: "JP",
  usa: "US",
  "united states": "US",
  uk: "GB",
  "united kingdom": "GB",
  germany: "DE",
  italy: "IT",
  spain: "ES",
  canada: "CA",
  australia: "AU",
  indonesia: "ID",
  thailand: "TH",
  greece: "GR",
  afghanistan: "AF",
  kazakhstan: "KZ",
  china: "CN",
  russia: "RU",
  brazil: "BR",
  mexico: "MX",
  singapore: "SG",
  malaysia: "MY",
  vietnam: "VN",
  egypt: "EG",
  turkey: "TR",
  switzerland: "CH",
};

/**
 * Parses user input into base location query and optional country filter hint.
 * Example: "Kerala India" -> { baseQuery: "Kerala", countryHint: "india", countryCodeHint: "IN" }
 * Example: "Kerala Finland" -> { baseQuery: "Kerala", countryHint: "finland", countryCodeHint: "FI" }
 * Example: "Paris France" -> { baseQuery: "Paris", countryHint: "france", countryCodeHint: "FR" }
 */
export function parseCountryFromQuery(query: string): {
  baseQuery: string;
  countryHint?: string;
  countryCodeHint?: string;
} {
  const trimmed = query.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return { baseQuery: trimmed };
  }

  // Check if last two words match a country (e.g. "United States", "United Kingdom")
  if (parts.length >= 3) {
    const twoWords = parts.slice(-2).join(" ").toLowerCase();
    if (COUNTRY_NAME_TO_CODE[twoWords]) {
      return {
        baseQuery: parts.slice(0, -2).join(" "),
        countryHint: twoWords,
        countryCodeHint: COUNTRY_NAME_TO_CODE[twoWords],
      };
    }
  }

  // Check if last word matches a country (e.g. "India", "Finland", "France", "Japan")
  const lastWord = parts[parts.length - 1].toLowerCase();
  if (COUNTRY_NAME_TO_CODE[lastWord]) {
    return {
      baseQuery: parts.slice(0, -1).join(" "),
      countryHint: lastWord,
      countryCodeHint: COUNTRY_NAME_TO_CODE[lastWord],
    };
  }

  // Check if last word is a 2-letter uppercase ISO code
  if (parts[parts.length - 1].length === 2 && /^[A-Z]{2}$/i.test(parts[parts.length - 1])) {
    const code = parts[parts.length - 1].toUpperCase();
    return {
      baseQuery: parts.slice(0, -1).join(" "),
      countryCodeHint: code,
    };
  }

  return { baseQuery: trimmed };
}

// Lightweight in-memory cache
interface CacheEntry {
  data: GeocodingSearchResult;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 500;

function buildCacheKey(query: string, count: number, language: string, countryCode?: string): string {
  return `${query.toLowerCase().trim()}:${count}:${language.toLowerCase()}:${countryCode ? countryCode.toUpperCase() : ""}`;
}

function getFromCache(key: string): GeocodingSearchResult | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function saveToCache(key: string, data: GeocodingSearchResult): void {
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = CACHE.keys().next().value;
    if (oldestKey) CACHE.delete(oldestKey);
  }
  CACHE.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Searches for geographic locations matching the query using Open-Meteo Geocoding API,
 * enhanced with country-awareness and a curated regional destinations fallback for major travel regions.
 */
export async function searchLocations(
  params: GeocodingSearchParams
): Promise<GeocodingSearchResult> {
  const trimmedQuery = (params.query || "").trim();

  if (trimmedQuery.length < 2) {
    throw new OpenMeteoGeocodingError(
      "Search query must be at least 2 characters.",
      400,
      "INVALID_QUERY"
    );
  }

  if (trimmedQuery.length > 100) {
    throw new OpenMeteoGeocodingError(
      "Search query exceeds maximum length of 100 characters.",
      400,
      "QUERY_TOO_LONG"
    );
  }

  const count = params.count !== undefined ? Number(params.count) : 5;
  if (isNaN(count) || !Number.isInteger(count) || count < 1 || count > 10) {
    throw new OpenMeteoGeocodingError(
      "Count must be an integer between 1 and 10.",
      400,
      "INVALID_COUNT"
    );
  }

  const language = (params.language || "en").trim().toLowerCase();
  const countryCode = params.countryCode ? params.countryCode.trim().toUpperCase() : undefined;

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new OpenMeteoGeocodingError(
      "Country code must be a 2-letter ISO 3166-1 alpha-2 code.",
      400,
      "INVALID_COUNTRY_CODE"
    );
  }

  // Parse country hint from query text (e.g. "Kerala India" -> base "Kerala", countryHint "india")
  const { baseQuery, countryHint, countryCodeHint } = parseCountryFromQuery(trimmedQuery);
  const effectiveCountryCode = countryCode || countryCodeHint;

  // Check cache
  const cacheKey = buildCacheKey(trimmedQuery, count, language, countryCode);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Search Open-Meteo with base query (e.g. "Kerala") or trimmed query
  const baseUrl = process.env.OPENMETEO_GEOCODING_BASE_URL || DEFAULT_BASE_URL;
  const url = new URL("/v1/search", baseUrl);
  url.searchParams.set("name", baseQuery || trimmedQuery);
  url.searchParams.set("count", String(Math.max(count, 10)));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  if (effectiveCountryCode) {
    url.searchParams.set("country_code", effectiveCountryCode);
  }

  let rawResults: RawOpenMeteoLocation[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const rawData = (await response.json()) as RawOpenMeteoResponse;
      if (Array.isArray(rawData.results)) {
        rawResults = rawData.results;
      }
    }
  } catch {
    // If network fails, regional destination fallback below will still provide results if available
  }

  // If baseQuery didn't return results and differed from trimmedQuery, try trimmedQuery as fallback
  if (rawResults.length === 0 && baseQuery !== trimmedQuery) {
    try {
      const fallbackUrl = new URL("/v1/search", baseUrl);
      fallbackUrl.searchParams.set("name", trimmedQuery);
      fallbackUrl.searchParams.set("count", String(count));
      fallbackUrl.searchParams.set("language", language);
      fallbackUrl.searchParams.set("format", "json");

      const res = await fetch(fallbackUrl.toString());
      if (res.ok) {
        const rawData = (await res.json()) as RawOpenMeteoResponse;
        if (Array.isArray(rawData.results)) {
          rawResults = rawData.results;
        }
      }
    } catch {
      // Ignore
    }
  }

  // Normalize Open-Meteo results
  const normalizedResults: GeocodingLocation[] = rawResults
    .filter(
      (item) =>
        item &&
        typeof item.id === "number" &&
        typeof item.name === "string" &&
        typeof item.latitude === "number" &&
        !isNaN(item.latitude) &&
        isFinite(item.latitude) &&
        typeof item.longitude === "number" &&
        !isNaN(item.longitude) &&
        isFinite(item.longitude)
    )
    .map((item) => {
      const loc: GeocodingLocation = {
        id: item.id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
      };

      if (item.country) loc.country = item.country;
      if (item.country_code) loc.countryCode = item.country_code.toUpperCase();
      if (item.admin1) loc.admin1 = item.admin1;
      if (item.admin2) loc.admin2 = item.admin2;
      if (item.timezone) loc.timezone = item.timezone;
      if (typeof item.population === "number") loc.population = item.population;
      if (item.feature_code) loc.featureCode = item.feature_code;

      return loc;
    });

  // Query regional travel destinations registry (for major regions/states like Kerala, Goa, Bali, Hawaii)
  const regionalMatches = findRegionalDestinations(baseQuery || trimmedQuery, countryHint || effectiveCountryCode);

  // Combine results: include both regional destinations and provider results
  const allLocations: GeocodingLocation[] = [...regionalMatches, ...normalizedResults];

  // Disambiguation and Country-aware ranking:
  // If the user specified a country hint (e.g. "India" or "Finland"), prioritize matching results at the top
  if (countryHint || effectiveCountryCode) {
    const hint = (countryHint || "").toLowerCase();
    const code = (effectiveCountryCode || "").toUpperCase();

    allLocations.sort((a, b) => {
      const aMatches =
        (a.countryCode && a.countryCode === code) ||
        (a.country && a.country.toLowerCase().includes(hint)) ||
        (a.admin1 && a.admin1.toLowerCase().includes(hint));

      const bMatches =
        (b.countryCode && b.countryCode === code) ||
        (b.country && b.country.toLowerCase().includes(hint)) ||
        (b.admin1 && b.admin1.toLowerCase().includes(hint));

      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }

  // Deduplicate entries while preserving distinct geographic locations
  const seenKeys = new Set<string>();
  const deduplicated: GeocodingLocation[] = [];

  for (const loc of allLocations) {
    // Unique key combines name, country, and admin division
    const key = `${loc.name.toLowerCase()}:${(loc.country || "").toLowerCase()}:${(loc.admin1 || "").toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(loc);
    }
  }

  const finalResults = deduplicated.slice(0, count);

  const searchResult: GeocodingSearchResult = {
    query: trimmedQuery,
    results: finalResults,
    provider: "open-meteo",
  };

  // Cache response
  saveToCache(cacheKey, searchResult);

  return searchResult;
}

