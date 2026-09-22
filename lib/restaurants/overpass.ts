/**
 * OpenStreetMap Overpass Client for Nearby Restaurants
 * Queries OSM data using Overpass QL and normalizes restaurant POIs.
 * Features sequential fallback across public Overpass mirrors with caching and sanitized errors.
 * Reference: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import {
  RestaurantItem,
  RestaurantPhoto,
  RestaurantsQueryParams,
  RestaurantsResponseData,
  OverpassRestaurantError,
} from "./types";

export const PRIMARY_OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const OVERPASS_ENDPOINTS: string[] = [
  process.env.OVERPASS_API_BASE_URL || PRIMARY_OVERPASS_URL,
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export function getOverpassEndpoints(): string[] {
  const primary = process.env.OVERPASS_API_BASE_URL || PRIMARY_OVERPASS_URL;
  const fallbacks = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  return Array.from(new Set([primary, ...fallbacks]));
}

const DEFAULT_TIMEOUT_MS = 10000;
const USER_AGENT = "TravelSensei/1.0 (https://travelsensei.local; travel-planner)";

// Raw Overpass Response Types
interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version?: number;
  generator?: string;
  elements?: OverpassElement[];
  remark?: string;
}

// In-Memory Cache
interface CacheEntry {
  data: RestaurantsResponseData;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 300;

export function buildRestaurantsCacheKey(
  lat: number,
  lng: number,
  radius: number,
  limit: number
): string {
  const roundLat = Number(lat.toFixed(3));
  const roundLng = Number(lng.toFixed(3));
  return `${roundLat}:${roundLng}:${radius}:${limit}`;
}

export function getFromCache(key: string): RestaurantsResponseData | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

export function saveToCache(key: string, data: RestaurantsResponseData): void {
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = CACHE.keys().next().value;
    if (oldestKey) CACHE.delete(oldestKey);
  }
  CACHE.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearRestaurantsCache(): void {
  CACHE.clear();
}

/**
 * Standard Haversine formula to compute great-circle distance between two points in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats a clean street address from OSM tags without inventing data.
 */
export function formatOsmAddress(tags: Record<string, string>): string | null {
  if (tags["addr:full"]) {
    return tags["addr:full"].trim();
  }

  const parts: string[] = [];
  const house = tags["addr:housenumber"]?.trim();
  const street = tags["addr:street"]?.trim();
  const suburb = tags["addr:suburb"]?.trim() || tags["addr:district"]?.trim();
  const city = tags["addr:city"]?.trim();
  const postcode = tags["addr:postcode"]?.trim();

  if (house && street) {
    parts.push(`${house} ${street}`);
  } else if (street) {
    parts.push(street);
  } else if (house) {
    parts.push(house);
  }

  if (suburb && !parts.includes(suburb)) parts.push(suburb);
  if (city && !parts.includes(city)) parts.push(city);
  if (postcode && !parts.includes(postcode)) parts.push(postcode);

  return parts.length > 0 ? parts.join(", ") : null;
}

export function resolveRestaurantPhoto(tags: Record<string, string>): RestaurantPhoto | null {
  // 1. Check for verified image from OSM tags
  const rawImage = tags.image || tags["image:url"] || tags["contact:image"];
  if (rawImage && (rawImage.startsWith("http://") || rawImage.startsWith("https://"))) {
    return {
      url: rawImage.trim(),
      source: "openstreetmap",
      isExactPlacePhoto: true,
    };
  }

  // Strictly no generic or stock photography.
  // When a verified place image is not available from OSM, return null
  // so the client renders a clean neutral placeholder.
  return null;
}

/**
 * Extracts and validates representative coordinates from an Overpass element.
 */
export function extractElementCoordinates(
  el: OverpassElement
): { lat: number; lon: number } | null {
  let lat: number | undefined;
  let lon: number | undefined;

  if (typeof el.lat === "number" && typeof el.lon === "number") {
    lat = el.lat;
    lon = el.lon;
  } else if (el.center && typeof el.center.lat === "number" && typeof el.center.lon === "number") {
    lat = el.center.lat;
    lon = el.center.lon;
  }

  if (lat === undefined || lon === undefined) return null;
  if (!isFinite(lat) || !isFinite(lon) || isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return { lat, lon };
}

/**
 * Normalizes raw Overpass response elements into clean TravelSensei RestaurantItem objects.
 */
export function normalizeOverpassResponse(
  elements: OverpassElement[] | undefined,
  userLat: number,
  userLng: number,
  limit: number
): RestaurantItem[] {
  if (!Array.isArray(elements) || elements.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalized: RestaurantItem[] = [];

  for (const el of elements) {
    if (!el || !el.type || !el.id) continue;

    const compositeId = `${el.type}/${el.id}`;
    if (seenIds.has(compositeId)) continue;

    const coords = extractElementCoordinates(el);
    if (!coords) continue;

    const tags = el.tags || {};
    const rawName = tags.name || tags["name:en"] || tags["name:local"];
    if (!rawName || typeof rawName !== "string" || rawName.trim().length === 0) {
      // Ignore unnamed POIs
      continue;
    }

    seenIds.add(compositeId);

    const distance = calculateDistanceMeters(userLat, userLng, coords.lat, coords.lon);

    // Optional tags strictly preserved from OSM without fabrication
    const cuisine = tags.cuisine?.trim() || null;
    const address = formatOsmAddress(tags);
    const phone = tags.phone?.trim() || tags["contact:phone"]?.trim() || null;
    const website = tags.website?.trim() || tags["contact:website"]?.trim() || null;
    const openingHours = tags.opening_hours?.trim() || null;
    const wheelchair = tags.wheelchair?.trim() || null;
    const photo = resolveRestaurantPhoto(tags);

    normalized.push({
      id: compositeId,
      name: rawName.trim(),
      latitude: coords.lat,
      longitude: coords.lon,
      cuisine,
      address,
      phone,
      website,
      openingHours,
      wheelchair,
      distanceMeters: distance,
      photo,
    });
  }

  // Sort strictly by proximity (distance ascending)
  normalized.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Apply requested limit
  return normalized.slice(0, limit);
}

/**
 * Builds the Overpass QL query string with around proximity filter.
 */
export function buildOverpassQuery(
  latitude: number,
  longitude: number,
  radius: number,
  limit?: number
): string {
  const maxElements = typeof limit === "number" && limit > 0 ? Math.min(limit * 3, 100) : 60;
  return `[out:json][timeout:10];
(
  node["amenity"="restaurant"](around:${radius},${latitude},${longitude});
  way["amenity"="restaurant"](around:${radius},${latitude},${longitude});
  relation["amenity"="restaurant"](around:${radius},${latitude},${longitude});
);
out center tags qt ${maxElements};`;
}

/**
 * Fetches nearby restaurants using OpenStreetMap Overpass API with sequential fallback.
 */
export async function getNearbyRestaurants(
  params: RestaurantsQueryParams,
  options?: { signal?: AbortSignal; bypassCache?: boolean }
): Promise<RestaurantsResponseData> {
  const { latitude, longitude } = params;
  const radius =
    typeof params.radius === "number" && params.radius >= 500 && params.radius <= 10000
      ? params.radius
      : 3000;
  const limit =
    typeof params.limit === "number" && params.limit >= 1 && params.limit <= 50
      ? params.limit
      : 20;

  // 1. Check in-memory cache
  const cacheKey = buildRestaurantsCacheKey(latitude, longitude, radius, limit);
  if (!options?.bypassCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 2. Prepare query
  const endpoints = getOverpassEndpoints();
  const query = buildOverpassQuery(latitude, longitude, radius, limit);
  const formBody = new URLSearchParams({ data: query });

  let lastError: Error | null = null;
  let allTimedOut = true;

  // 3. Sequential fallback: Primary -> Fallback 1 -> Fallback 2
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    // Combine parent signal if provided
    const onParentAbort = () => controller.abort();
    if (options?.signal) {
      options.signal.addEventListener("abort", onParentAbort, { once: true });
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: formBody.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (options?.signal) {
        options.signal.removeEventListener("abort", onParentAbort);
      }

      if (response.status === 429) {
        allTimedOut = false;
        throw new Error("HTTP 429 Rate Limit");
      }

      if (!response.ok) {
        allTimedOut = response.status === 504 ? allTimedOut : false;
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType && !contentType.includes("json")) {
        allTimedOut = false;
        throw new Error(`Non-JSON response received: ${contentType}`);
      }

      const payload: OverpassResponse = await response.json();
      if (!payload || !Array.isArray(payload.elements)) {
        allTimedOut = false;
        throw new Error("Invalid payload: missing elements array");
      }

      const normalizedRestaurants = normalizeOverpassResponse(
        payload.elements,
        latitude,
        longitude,
        limit
      );

      const result: RestaurantsResponseData = {
        restaurants: normalizedRestaurants,
        count: normalizedRestaurants.length,
        radiusMeters: radius,
        provider: "openstreetmap-overpass",
      };

      saveToCache(cacheKey, result);
      return result;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (options?.signal) {
        options.signal.removeEventListener("abort", onParentAbort);
      }

      const isTimeout =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("timeout"));
      if (!isTimeout) {
        allTimedOut = false;
      }

      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[Overpass] Provider "${endpoint}" failed (${lastError.message}). ${
          i < endpoints.length - 1 ? `Trying fallback ${i + 1}...` : "All endpoints exhausted."
        }`
      );
    }
  }

  // If all sequential providers failed, return clean, sanitized error
  const finalStatus = allTimedOut ? 504 : 502;
  const finalCode = allTimedOut ? "RESTAURANT_PROVIDER_TIMEOUT" : "RESTAURANT_PROVIDER_UNAVAILABLE";

  throw new OverpassRestaurantError(
    "Nearby restaurant service is temporarily unavailable.",
    finalStatus,
    finalCode
  );
}
