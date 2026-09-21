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
 * Searches for geographic locations matching the query using Open-Meteo Geocoding API.
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

  // Check cache
  const cacheKey = buildCacheKey(trimmedQuery, count, language, countryCode);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const baseUrl = process.env.OPENMETEO_GEOCODING_BASE_URL || DEFAULT_BASE_URL;
  const url = new URL("/v1/search", baseUrl);
  url.searchParams.set("name", trimmedQuery);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  if (countryCode) {
    url.searchParams.set("country_code", countryCode);
  }

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
      throw new OpenMeteoGeocodingError(
        "Open-Meteo geocoding request timed out.",
        504,
        "GEOCODING_TIMEOUT"
      );
    }
    throw new OpenMeteoGeocodingError(
      "Unable to connect to Open-Meteo geocoding service.",
      503,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new OpenMeteoGeocodingError(
        "Rate limit reached for geocoding service. Please wait and try again.",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }
    if (response.status === 400) {
      throw new OpenMeteoGeocodingError(
        "Invalid geocoding request to Open-Meteo.",
        400,
        "BAD_REQUEST"
      );
    }
    throw new OpenMeteoGeocodingError(
      `Open-Meteo service returned an error (${response.status}).`,
      502,
      "PROVIDER_ERROR"
    );
  }

  let rawData: RawOpenMeteoResponse;
  try {
    rawData = (await response.json()) as RawOpenMeteoResponse;
  } catch {
    throw new OpenMeteoGeocodingError(
      "Failed to parse geocoding response.",
      502,
      "INVALID_RESPONSE"
    );
  }

  const rawResults = Array.isArray(rawData.results) ? rawData.results : [];

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

  const searchResult: GeocodingSearchResult = {
    query: trimmedQuery,
    results: normalizedResults,
    provider: "open-meteo",
  };

  // Cache response
  saveToCache(cacheKey, searchResult);

  return searchResult;
}
