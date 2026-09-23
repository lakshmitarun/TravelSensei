/**
 * Geoapify Places Client for Nearby Attractions
 * Queries Geoapify Places API v2 and normalizes tourist attractions.
 * Features server-only credential security, in-memory caching, AbortController timeouts, and sanitized errors.
 * Reference: https://apidocs.geoapify.com/docs/places/
 */

import {
  AttractionItem,
  AttractionsQueryParams,
  AttractionsResponseData,
  GeoapifyAttractionError,
  GeoapifyPlacesResponse,
} from "./types";

export const PRIMARY_GEOAPIFY_URL = "https://api.geoapify.com";
export const DEFAULT_TIMEOUT_MS = 8000;

// Verified supported Geoapify categories for tourist attractions and sights
export const DEFAULT_ATTRACTION_CATEGORIES = [
  "tourism.attraction",
  "tourism.sights",
];

export const MIN_RADIUS_METERS = 100;
export const DEFAULT_RADIUS_METERS = 5000;
export const MAX_RADIUS_METERS = 25000; // 25 km

export const MIN_LIMIT = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 20;

// In-Memory Cache
interface CacheEntry {
  data: AttractionsResponseData;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 300;

/**
 * Builds a deterministic cache key from coordinate, radius, and limit parameters.
 * Coordinates are rounded to 3 decimal places (~110m precision) to optimize cache hits.
 */
export function buildAttractionsCacheKey(
  lat: number,
  lng: number,
  radius: number,
  limit: number
): string {
  const roundLat = Number(lat.toFixed(3));
  const roundLng = Number(lng.toFixed(3));
  return `${roundLat}:${roundLng}:${radius}:${limit}`;
}

export function getFromCache(key: string): AttractionsResponseData | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

export function saveToCache(key: string, data: AttractionsResponseData): void {
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = CACHE.keys().next().value;
    if (oldestKey) CACHE.delete(oldestKey);
  }
  CACHE.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearAttractionsCache(): void {
  CACHE.clear();
}

/**
 * Validates and retrieves server-side Geoapify configuration.
 * Throws a clean 500 configuration error if GEOAPIFY_API_KEY is missing.
 */
export function getGeoapifyConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  const baseUrl = (
    process.env.GEOAPIFY_API_BASE_URL || PRIMARY_GEOAPIFY_URL
  ).replace(/\/+$/, "");

  if (!apiKey || !apiKey.trim()) {
    throw new GeoapifyAttractionError(
      500,
      "Attraction service is not configured. Missing API key.",
      "CONFIG_ERROR"
    );
  }

  return { apiKey: apiKey.trim(), baseUrl };
}

/**
 * Constructs the Geoapify Places API v2 request URL with required query parameters.
 */
export function buildGeoapifyPlacesUrl(
  baseUrl: string,
  params: {
    latitude: number;
    longitude: number;
    radius: number;
    limit: number;
    categories?: string[];
    apiKey: string;
  }
): string {
  const categoriesList =
    params.categories && params.categories.length > 0
      ? params.categories
      : DEFAULT_ATTRACTION_CATEGORIES;

  const searchParams = new URLSearchParams({
    categories: categoriesList.join(","),
    filter: `circle:${params.longitude},${params.latitude},${params.radius}`,
    bias: `proximity:${params.longitude},${params.latitude}`,
    limit: String(params.limit),
    lang: "en",
    apiKey: params.apiKey,
  });

  return `${baseUrl}/v2/places?${searchParams.toString()}`;
}

/**
 * Maps HTTP and provider error responses into safe, sanitized TravelSensei errors.
 * Never exposes the raw API key or raw provider HTML pages.
 */
export function mapGeoapifyError(
  status: number,
  rawData?: unknown
): GeoapifyAttractionError {
  let providerMessage: string | undefined;

  if (typeof rawData === "object" && rawData !== null) {
    const obj = rawData as Record<string, unknown>;
    if (typeof obj.message === "string") {
      providerMessage = obj.message;
    } else if (typeof obj.error === "string") {
      providerMessage = obj.error;
    }
  }

  switch (status) {
    case 400:
      return new GeoapifyAttractionError(
        400,
        providerMessage || "Invalid attractions request parameters.",
        "BAD_REQUEST"
      );
    case 401:
    case 403:
      // Map to 502 with safe message so client does not mistake provider failure for client session failure
      return new GeoapifyAttractionError(
        502,
        "Attraction provider authentication failed. Please verify provider credentials.",
        "PROVIDER_AUTH_ERROR"
      );
    case 429:
      return new GeoapifyAttractionError(
        429,
        "Attraction service is currently rate limited. Please try again shortly.",
        "RATE_LIMITED"
      );
    case 504:
      return new GeoapifyAttractionError(
        504,
        "Attraction service request timed out.",
        "GATEWAY_TIMEOUT"
      );
    default:
      return new GeoapifyAttractionError(
        502,
        "Nearby attraction service is temporarily unavailable.",
        "PROVIDER_UNAVAILABLE"
      );
  }
}

/**
 * Normalizes raw Geoapify FeatureCollection response into a TravelSensei-owned structure.
 * Only extracts verified attributes provided by Geoapify without inventing ratings, prices, or hours.
 */
export function normalizeGeoapifyResponse(
  raw: GeoapifyPlacesResponse,
  radiusMeters: number
): AttractionsResponseData {
  const rawFeatures = Array.isArray(raw?.features) ? raw.features : [];
  const attractions: AttractionItem[] = [];

  for (let index = 0; index < rawFeatures.length; index++) {
    const feature = rawFeatures[index];
    if (!feature || typeof feature !== "object") continue;

    const properties = feature.properties || {};
    const geometry = feature.geometry;

    const lat =
      typeof properties.lat === "number" && isFinite(properties.lat)
        ? properties.lat
        : geometry &&
          Array.isArray(geometry.coordinates) &&
          typeof geometry.coordinates[1] === "number" &&
          isFinite(geometry.coordinates[1])
        ? geometry.coordinates[1]
        : null;

    const lon =
      typeof properties.lon === "number" && isFinite(properties.lon)
        ? properties.lon
        : geometry &&
          Array.isArray(geometry.coordinates) &&
          typeof geometry.coordinates[0] === "number" &&
          isFinite(geometry.coordinates[0])
        ? geometry.coordinates[0]
        : null;

    // Must have valid coordinates
    if (lat === null || lon === null) continue;

    const placeId =
      typeof properties.place_id === "string" && properties.place_id.trim()
        ? properties.place_id.trim()
        : `geoapify_attraction_${index}_${lat}_${lon}`;

    const rawName =
      typeof properties.name === "string" && properties.name.trim()
        ? properties.name.trim()
        : typeof properties.formatted === "string" && properties.formatted.trim()
        ? properties.formatted.trim().split(",")[0]
        : "Unnamed Attraction";

    const formatted =
      typeof properties.formatted === "string" && properties.formatted.trim()
        ? properties.formatted.trim()
        : typeof properties.address_line1 === "string" && properties.address_line1.trim()
        ? [properties.address_line1, properties.address_line2]
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .join(", ")
        : null;

    const distance =
      typeof properties.distance === "number" && isFinite(properties.distance)
        ? Math.round(properties.distance)
        : null;

    const city =
      typeof properties.city === "string" && properties.city.trim()
        ? properties.city.trim()
        : null;

    const state =
      typeof properties.state === "string" && properties.state.trim()
        ? properties.state.trim()
        : null;

    const country =
      typeof properties.country === "string" && properties.country.trim()
        ? properties.country.trim()
        : null;

    const categories = Array.isArray(properties.categories)
      ? properties.categories.filter((cat): cat is string => typeof cat === "string" && cat.trim().length > 0)
      : [];

    attractions.push({
      id: placeId,
      place_id: placeId,
      name: rawName,
      latitude: lat,
      longitude: lon,
      distance,
      formattedAddress: formatted,
      formatted,
      city,
      state,
      country,
      categories,
    });
  }

  return {
    attractions,
    count: attractions.length,
    radiusMeters,
    provider: "geoapify",
  };
}

/**
 * Fetches nearby attractions using Geoapify Places API v2.
 * Includes in-memory caching, request timeout, and normalized responses.
 */
export async function getNearbyAttractions(
  params: AttractionsQueryParams
): Promise<AttractionsResponseData> {
  const { latitude, longitude } = params;
  const radius = params.radius ?? DEFAULT_RADIUS_METERS;
  const limit = params.limit ?? DEFAULT_LIMIT;

  const { apiKey, baseUrl } = getGeoapifyConfig();

  // 1. Check in-memory cache
  const cacheKey = buildAttractionsCacheKey(latitude, longitude, radius, limit);
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // 2. Build request URL
  const requestUrl = buildGeoapifyPlacesUrl(baseUrl, {
    latitude,
    longitude,
    radius,
    limit,
    categories: params.categories,
    apiKey,
  });

  // 3. Execute fetch with AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (fetchError: unknown) {
    clearTimeout(timeoutId);
    if (
      fetchError instanceof Error &&
      (fetchError.name === "AbortError" || fetchError.message.includes("aborted"))
    ) {
      throw mapGeoapifyError(504);
    }
    throw mapGeoapifyError(502);
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Handle provider error statuses
  if (!response.ok) {
    let rawErrorData: unknown;
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        rawErrorData = await response.json();
      } else {
        // Read text but discard HTML to prevent leakage
        await response.text();
      }
    } catch {
      // Ignore body read errors
    }

    throw mapGeoapifyError(response.status, rawErrorData);
  }

  // 5. Parse response body safely
  let rawResponse: GeoapifyPlacesResponse;
  try {
    rawResponse = (await response.json()) as GeoapifyPlacesResponse;
  } catch {
    throw new GeoapifyAttractionError(
      502,
      "Nearby attraction service returned an invalid response format.",
      "INVALID_PROVIDER_RESPONSE"
    );
  }

  // 6. Normalize and cache response
  const normalizedData = normalizeGeoapifyResponse(rawResponse, radius);
  saveToCache(cacheKey, normalizedData);

  return normalizedData;
}
