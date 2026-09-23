/**
 * Geoapify Place Details Client for Attraction Details
 * Fetches enriched details for a specific place_id using the Geoapify Place Details API v2.
 * Includes server-side credential isolation, 30-minute in-memory caching, request timeouts, and error sanitization.
 * Reference: https://apidocs.geoapify.com/docs/places/place-details/
 */

import {
  AttractionDetailsData,
  AttractionHistoricDetails,
  AttractionHeritageDetails,
  GeoapifyAttractionError,
} from "./types";
import { getGeoapifyConfig, DEFAULT_TIMEOUT_MS } from "./geoapify";

export const DETAILS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const DETAILS_MAX_CACHE_ENTRIES = 500;

interface DetailsCacheEntry {
  data: AttractionDetailsData;
  expiresAt: number;
}

const DETAILS_CACHE = new Map<string, DetailsCacheEntry>();

export function buildDetailsCacheKey(placeId: string): string {
  return placeId.trim();
}

export function getDetailsFromCache(key: string): AttractionDetailsData | null {
  const entry = DETAILS_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    DETAILS_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

export function saveDetailsToCache(key: string, data: AttractionDetailsData): void {
  if (DETAILS_CACHE.size >= DETAILS_MAX_CACHE_ENTRIES) {
    const oldestKey = DETAILS_CACHE.keys().next().value;
    if (oldestKey) DETAILS_CACHE.delete(oldestKey);
  }
  DETAILS_CACHE.set(key, {
    data,
    expiresAt: Date.now() + DETAILS_CACHE_TTL_MS,
  });
}

export function clearDetailsCache(): void {
  DETAILS_CACHE.clear();
}

/**
 * Constructs the Geoapify Place Details request URL.
 */
export function buildGeoapifyDetailsUrl(
  baseUrl: string,
  placeId: string,
  apiKey: string
): string {
  const searchParams = new URLSearchParams({
    id: placeId.trim(),
    features: "details",
    lang: "en",
    apiKey: apiKey.trim(),
  });
  return `${baseUrl}/v2/place-details?${searchParams.toString()}`;
}

/**
 * Normalizes raw Geoapify Place Details API response into an AttractionDetailsData contract.
 * Strictly avoids fabricating reviews, stars, costs, or hours.
 */
export function normalizeGeoapifyDetails(
  raw: unknown,
  fallbackPlaceId: string
): AttractionDetailsData {
  if (!raw || typeof raw !== "object") {
    throw new GeoapifyAttractionError(
      502,
      "Nearby attraction service returned an invalid details response format.",
      "INVALID_PROVIDER_RESPONSE"
    );
  }

  const rawObj = raw as Record<string, unknown>;

  // Geoapify place-details returns GeoJSON FeatureCollection or Feature
  let properties: Record<string, unknown> = {};
  let geometry: { coordinates?: [number, number] } | undefined;

  if (Array.isArray(rawObj.features) && rawObj.features.length > 0) {
    const feature = rawObj.features[0] as Record<string, unknown>;
    properties = (feature.properties as Record<string, unknown>) || {};
    geometry = feature.geometry as { coordinates?: [number, number] } | undefined;
  } else if (rawObj.properties && typeof rawObj.properties === "object") {
    properties = rawObj.properties as Record<string, unknown>;
    geometry = rawObj.geometry as { coordinates?: [number, number] } | undefined;
  } else {
    properties = rawObj;
  }

  const datasourceRaw =
    typeof properties.datasource === "object" && properties.datasource !== null
      ? ((properties.datasource as Record<string, unknown>).raw as Record<string, unknown>) || {}
      : {};

  const wikiAndMedia =
    typeof properties.wiki_and_media === "object" && properties.wiki_and_media !== null
      ? (properties.wiki_and_media as Record<string, unknown>)
      : {};

  const contact =
    typeof properties.contact === "object" && properties.contact !== null
      ? (properties.contact as Record<string, unknown>)
      : {};

  // Extract placeId
  const placeId =
    typeof properties.place_id === "string" && properties.place_id.trim()
      ? properties.place_id.trim()
      : fallbackPlaceId;

  // Extract name
  const name =
    typeof properties.name === "string" && properties.name.trim()
      ? properties.name.trim()
      : typeof properties.formatted === "string" && properties.formatted.trim()
      ? properties.formatted.trim().split(",")[0]
      : "Unnamed Attraction";

  // Coordinates
  const latitude =
    typeof properties.lat === "number" && isFinite(properties.lat)
      ? properties.lat
      : geometry && Array.isArray(geometry.coordinates) && typeof geometry.coordinates[1] === "number"
      ? geometry.coordinates[1]
      : 0;

  const longitude =
    typeof properties.lon === "number" && isFinite(properties.lon)
      ? properties.lon
      : geometry && Array.isArray(geometry.coordinates) && typeof geometry.coordinates[0] === "number"
      ? geometry.coordinates[0]
      : 0;

  // Description: only from factual provider sources
  const rawDescription =
    typeof properties.description === "string" && properties.description.trim()
      ? properties.description.trim()
      : typeof datasourceRaw.description === "string" && datasourceRaw.description.trim()
      ? datasourceRaw.description.trim()
      : typeof wikiAndMedia.description === "string" && wikiAndMedia.description.trim()
      ? wikiAndMedia.description.trim()
      : null;

  // Formatted address
  const formattedAddress =
    typeof properties.formatted === "string" && properties.formatted.trim()
      ? properties.formatted.trim()
      : typeof properties.address_line1 === "string" && properties.address_line1.trim()
      ? [properties.address_line1, properties.address_line2]
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .join(", ")
      : null;

  const city =
    typeof properties.city === "string" && properties.city.trim() ? properties.city.trim() : null;
  const state =
    typeof properties.state === "string" && properties.state.trim() ? properties.state.trim() : null;
  const country =
    typeof properties.country === "string" && properties.country.trim() ? properties.country.trim() : null;

  // Categories
  const categories = Array.isArray(properties.categories)
    ? properties.categories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];

  // Opening hours
  const openingHours =
    typeof properties.opening_hours === "string" && properties.opening_hours.trim()
      ? properties.opening_hours.trim()
      : typeof datasourceRaw.opening_hours === "string" && datasourceRaw.opening_hours.trim()
      ? datasourceRaw.opening_hours.trim()
      : null;

  // Website
  const website =
    typeof properties.website === "string" && properties.website.trim()
      ? properties.website.trim()
      : typeof contact.website === "string" && contact.website.trim()
      ? contact.website.trim()
      : typeof datasourceRaw.website === "string" && datasourceRaw.website.trim()
      ? datasourceRaw.website.trim()
      : null;

  // Historical Information
  let historic: AttractionHistoricDetails | null = null;
  const rawHistoric = properties.historic || datasourceRaw.historic;
  if (typeof rawHistoric === "object" && rawHistoric !== null) {
    const hObj = rawHistoric as Record<string, unknown>;
    historic = {
      type: typeof hObj.type === "string" ? hObj.type : typeof hObj.historic === "string" ? hObj.historic : null,
      period: typeof hObj.period === "string" ? hObj.period : null,
      importance: typeof hObj.importance === "string" ? hObj.importance : null,
      startDate: typeof hObj.start_date === "string" ? hObj.start_date : null,
      endDate: typeof hObj.end_date === "string" ? hObj.end_date : null,
    };
  } else if (typeof rawHistoric === "string" && rawHistoric.trim()) {
    historic = {
      type: rawHistoric.trim(),
      period: typeof datasourceRaw.period === "string" ? datasourceRaw.period : null,
      importance: typeof datasourceRaw.importance === "string" ? datasourceRaw.importance : null,
      startDate: typeof datasourceRaw.start_date === "string" ? datasourceRaw.start_date : null,
      endDate: typeof datasourceRaw.end_date === "string" ? datasourceRaw.end_date : null,
    };
  }

  // Heritage Information
  let heritage: AttractionHeritageDetails | null = null;
  const rawHeritage = properties.heritage || datasourceRaw.heritage;
  if (typeof rawHeritage === "object" && rawHeritage !== null) {
    const herObj = rawHeritage as Record<string, unknown>;
    heritage = {
      description: typeof herObj.description === "string" ? herObj.description : typeof herObj.name === "string" ? herObj.name : null,
      operator: typeof herObj.operator === "string" ? herObj.operator : typeof herObj.heritage_operator === "string" ? herObj.heritage_operator : null,
      website: typeof herObj.website === "string" ? herObj.website : null,
    };
  } else if (typeof rawHeritage === "string" && rawHeritage.trim()) {
    heritage = {
      description: rawHeritage.trim(),
      operator: typeof datasourceRaw.heritage_operator === "string" ? datasourceRaw.heritage_operator : null,
      website: typeof datasourceRaw["heritage:website"] === "string" ? datasourceRaw["heritage:website"] : null,
    };
  }

  // Image: only verified provider image URL
  const rawImage =
    typeof wikiAndMedia.image === "string" && wikiAndMedia.image.trim()
      ? wikiAndMedia.image.trim()
      : typeof datasourceRaw.image === "string" && datasourceRaw.image.trim()
      ? datasourceRaw.image.trim()
      : typeof properties.image === "string" && properties.image.trim()
      ? properties.image.trim()
      : null;

  const image =
    rawImage && (rawImage.startsWith("http://") || rawImage.startsWith("https://"))
      ? rawImage
      : null;

  // Wikipedia
  let wikipedia: string | null = null;
  const rawWiki =
    typeof wikiAndMedia.wikipedia === "string" && wikiAndMedia.wikipedia.trim()
      ? wikiAndMedia.wikipedia.trim()
      : typeof datasourceRaw.wikipedia === "string" && datasourceRaw.wikipedia.trim()
      ? datasourceRaw.wikipedia.trim()
      : typeof properties.wikipedia === "string" && properties.wikipedia.trim()
      ? properties.wikipedia.trim()
      : null;

  if (rawWiki) {
    if (rawWiki.startsWith("http://") || rawWiki.startsWith("https://")) {
      wikipedia = rawWiki;
    } else if (rawWiki.includes(":")) {
      const [lang, ...titleParts] = rawWiki.split(":");
      wikipedia = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(titleParts.join(":"))}`;
    } else {
      wikipedia = `https://en.wikipedia.org/wiki/${encodeURIComponent(rawWiki)}`;
    }
  }

  // Wikimedia Commons
  let wikimediaCommons: string | null = null;
  const rawCommons =
    typeof wikiAndMedia.wikimedia_commons === "string" && wikiAndMedia.wikimedia_commons.trim()
      ? wikiAndMedia.wikimedia_commons.trim()
      : typeof datasourceRaw.wikimedia_commons === "string" && datasourceRaw.wikimedia_commons.trim()
      ? datasourceRaw.wikimedia_commons.trim()
      : typeof properties.wikimedia_commons === "string" && properties.wikimedia_commons.trim()
      ? properties.wikimedia_commons.trim()
      : null;

  if (rawCommons) {
    if (rawCommons.startsWith("http://") || rawCommons.startsWith("https://")) {
      wikimediaCommons = rawCommons;
    } else {
      wikimediaCommons = `https://commons.wikimedia.org/wiki/${encodeURIComponent(rawCommons)}`;
    }
  }

  return {
    placeId,
    name,
    description: rawDescription,
    latitude,
    longitude,
    formattedAddress,
    city,
    state,
    country,
    categories,
    openingHours,
    website,
    historic,
    heritage,
    image,
    wikipedia,
    wikimediaCommons,
  };
}

/**
 * Fetches enriched attraction details for a place_id with server caching and error handling.
 */
export async function getAttractionDetails(
  placeId: string
): Promise<AttractionDetailsData> {
  const trimmedId = placeId.trim();
  if (!trimmedId) {
    throw new GeoapifyAttractionError(400, "Missing required place identifier.", "BAD_REQUEST");
  }

  // 1. Check in-memory cache
  const cacheKey = buildDetailsCacheKey(trimmedId);
  const cached = getDetailsFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Build Geoapify request URL
  const { apiKey, baseUrl } = getGeoapifyConfig();
  const requestUrl = buildGeoapifyDetailsUrl(baseUrl, trimmedId, apiKey);

  // 3. Fetch with AbortController timeout
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
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      throw new GeoapifyAttractionError(504, "Attraction details request timed out.", "GATEWAY_TIMEOUT");
    }
    throw new GeoapifyAttractionError(502, "Nearby attraction service is temporarily unavailable.", "PROVIDER_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Handle HTTP response status
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GeoapifyAttractionError(
        502,
        "Attraction provider authentication failed. Please verify provider credentials.",
        "PROVIDER_AUTH_ERROR"
      );
    }
    if (response.status === 404) {
      throw new GeoapifyAttractionError(404, "Attraction details not found.", "NOT_FOUND");
    }
    if (response.status === 429) {
      throw new GeoapifyAttractionError(
        429,
        "Attraction service is currently rate limited. Please try again shortly.",
        "RATE_LIMITED"
      );
    }
    if (response.status === 504) {
      throw new GeoapifyAttractionError(504, "Attraction details request timed out.", "GATEWAY_TIMEOUT");
    }

    throw new GeoapifyAttractionError(
      502,
      "Nearby attraction service is temporarily unavailable.",
      "PROVIDER_UNAVAILABLE"
    );
  }

  // 5. Parse JSON safely
  let rawJson: unknown;
  try {
    rawJson = await response.json();
  } catch {
    throw new GeoapifyAttractionError(
      502,
      "Nearby attraction service returned an invalid response format.",
      "INVALID_PROVIDER_RESPONSE"
    );
  }

  // 6. Normalize and cache
  const normalizedData = normalizeGeoapifyDetails(rawJson, trimmedId);
  saveDetailsToCache(cacheKey, normalizedData);

  return normalizedData;
}
