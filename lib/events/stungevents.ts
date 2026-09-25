/**
 * StungEvents Server Provider Client
 * Public read integration for global events discovery without API keys.
 * Reference: https://api.stungevents.com/events
 */

import type {
  EventItem,
  EventsQueryParams,
  EventsResponseData,
  RawStungEvent,
  RawStungEventsResponse,
} from "./types";
import { StungEventsApiError } from "./types";

export const PRIMARY_STUNGEVENTS_URL = "https://api.stungevents.com";
export const DEFAULT_TIMEOUT_MS = 8000;

export const MIN_LIMIT = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// In-Memory Cache
interface CacheEntry {
  data: EventsResponseData;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 300;

// Common Country Name to ISO Alpha-2 Map
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  india: "IN",
  "united states": "US",
  usa: "US",
  "united states of america": "US",
  france: "FR",
  japan: "JP",
  "united kingdom": "GB",
  uk: "GB",
  britain: "GB",
  germany: "DE",
  deutschland: "DE",
  spain: "ES",
  italy: "IT",
  australia: "AU",
  canada: "CA",
  singapore: "SG",
  thailand: "TH",
  indonesia: "ID",
  brazil: "BR",
  mexico: "MX",
  uae: "AE",
  "united arab emirates": "AE",
  switzerland: "CH",
  netherlands: "NL",
};

/**
 * Normalizes country strings into 2-letter ISO codes when recognized.
 */
export function resolveCountryCode(countryStr?: string | null): string | undefined {
  if (!countryStr || !countryStr.trim()) return undefined;
  const clean = countryStr.trim();
  if (clean.length === 2) {
    return clean.toUpperCase();
  }
  const lower = clean.toLowerCase();
  return COUNTRY_NAME_TO_ISO[lower] || clean;
}

/**
 * Builds a deterministic cache key from event query parameters.
 */
export function buildEventsCacheKey(params: EventsQueryParams): string {
  const city = (params.city || "").trim().toLowerCase();
  const country = (params.country || "").trim().toLowerCase();
  const category = (params.category || "").trim().toLowerCase();
  const startDate = (params.startDate || "").trim();
  const endDate = (params.endDate || "").trim();
  const query = (params.query || "").trim().toLowerCase();
  const limit = params.limit ?? DEFAULT_LIMIT;
  const page = params.page ?? 1;
  const offset = params.offset ?? (page - 1) * limit;

  return `${city}|${country}|${category}|${startDate}|${endDate}|${query}|${limit}|${offset}`;
}

export function getFromCache(key: string): EventsResponseData | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

export function saveToCache(key: string, data: EventsResponseData): void {
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = CACHE.keys().next().value;
    if (oldestKey) CACHE.delete(oldestKey);
  }
  CACHE.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearEventsCache(): void {
  CACHE.clear();
}

/**
 * Constructs the StungEvents public API request URL.
 */
export function buildStungEventsUrl(
  baseUrl: string,
  params: EventsQueryParams
): string {
  const searchParams = new URLSearchParams();

  if (params.city && params.city.trim()) {
    searchParams.set("city", params.city.trim());
  }

  const countryCode = resolveCountryCode(params.country);
  if (countryCode) {
    searchParams.set("country", countryCode);
  }

  if (params.category && params.category.trim()) {
    searchParams.set("category", params.category.trim());
  }

  if (params.startDate && params.startDate.trim()) {
    searchParams.set("from", params.startDate.trim());
  }

  if (params.endDate && params.endDate.trim()) {
    searchParams.set("to", params.endDate.trim());
  }

  const limit = params.limit ?? DEFAULT_LIMIT;
  searchParams.set("limit", String(limit));

  const offset =
    typeof params.offset === "number" && isFinite(params.offset)
      ? params.offset
      : ((params.page ?? 1) - 1) * limit;

  if (offset > 0) {
    searchParams.set("offset", String(offset));
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/events?${searchParams.toString()}`;
}

/**
 * Maps HTTP and provider error responses into sanitized TravelSensei error objects.
 * Never exposes raw provider HTML pages or internal stack traces.
 */
export function mapStungEventsError(
  status: number,
  rawData?: unknown
): StungEventsApiError {
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
      return new StungEventsApiError(
        400,
        providerMessage || "Invalid events query parameters.",
        "BAD_REQUEST"
      );
    case 429:
      return new StungEventsApiError(
        429,
        "Events service is currently rate limited. Please try again shortly.",
        "RATE_LIMITED"
      );
    case 504:
      return new StungEventsApiError(
        504,
        "Events discovery service request timed out.",
        "GATEWAY_TIMEOUT"
      );
    default:
      return new StungEventsApiError(
        502,
        "Events discovery service is temporarily unavailable.",
        "PROVIDER_UNAVAILABLE"
      );
  }
}

/**
 * Normalizes raw StungEvent item into a clean TravelSensei EventItem model.
 * Strictly preserves factuality and avoids fabricating missing fields.
 */
export function normalizeStungEvent(raw: RawStungEvent): EventItem {
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : typeof raw.slug === "string" && raw.slug.trim()
      ? raw.slug.trim()
      : `stungevent_${Math.random().toString(36).slice(2, 10)}`;

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : "Untitled Event";

  const description =
    typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim()
      : null;

  const startDate =
    typeof raw.start_utc === "string" && raw.start_utc.trim()
      ? raw.start_utc.trim()
      : null;

  const endDate =
    typeof raw.end_utc === "string" && raw.end_utc.trim()
      ? raw.end_utc.trim()
      : null;

  const timezone =
    typeof raw.venue_timezone === "string" && raw.venue_timezone.trim()
      ? raw.venue_timezone.trim()
      : typeof raw.timezone === "string" && raw.timezone.trim()
      ? raw.timezone.trim()
      : null;

  const venueName =
    typeof raw.venue_name === "string" && raw.venue_name.trim()
      ? raw.venue_name.trim()
      : null;

  // Extract address from description if formatted like "Address: <addr>"
  let venueAddress: string | null = null;
  if (description) {
    const addrMatch = description.match(/Address:\s*([^🏠🌆📍✨🏛️\n]+)/i);
    if (addrMatch && addrMatch[1]?.trim()) {
      venueAddress = addrMatch[1].trim();
    }
  }

  const city =
    typeof raw.city === "string" && raw.city.trim()
      ? raw.city.trim()
      : null;

  const country =
    typeof raw.country === "string" && raw.country.trim()
      ? raw.country.trim()
      : null;

  const latitude =
    typeof raw.latitude === "number" && isFinite(raw.latitude)
      ? raw.latitude
      : null;

  const longitude =
    typeof raw.longitude === "number" && isFinite(raw.longitude)
      ? raw.longitude
      : null;

  const category =
    typeof raw.category === "string" && raw.category.trim()
      ? raw.category.trim()
      : null;

  const subcategory =
    typeof raw.subcategory === "string" && raw.subcategory.trim()
      ? raw.subcategory.trim()
      : null;

  const imageUrl =
    typeof raw.image_url === "string" && raw.image_url.trim() && raw.image_url.startsWith("http")
      ? raw.image_url.trim()
      : null;

  const eventUrl =
    typeof raw.ticket_url === "string" && raw.ticket_url.trim() && raw.ticket_url.startsWith("http")
      ? raw.ticket_url.trim()
      : typeof raw.slug === "string" && raw.slug.trim()
      ? `https://stungevents.com/events/${raw.slug.trim()}`
      : null;

  const ticketUrl =
    typeof raw.ticket_url === "string" && raw.ticket_url.trim() && raw.ticket_url.startsWith("http")
      ? raw.ticket_url.trim()
      : null;

  const priceMin =
    typeof raw.ticket_price_min === "number" && isFinite(raw.ticket_price_min)
      ? raw.ticket_price_min
      : null;

  const priceMax =
    typeof raw.ticket_price_max === "number" && isFinite(raw.ticket_price_max)
      ? raw.ticket_price_max
      : null;

  const currency =
    typeof raw.ticket_currency === "string" && raw.ticket_currency.trim()
      ? raw.ticket_currency.trim()
      : null;

  const status =
    typeof raw.status === "string" && raw.status.trim()
      ? raw.status.trim()
      : null;

  const source =
    typeof raw.affiliate_source === "string" && raw.affiliate_source.trim()
      ? raw.affiliate_source.trim()
      : typeof raw.source_id === "string" && raw.source_id.trim()
      ? raw.source_id.trim()
      : "stungevents";

  return {
    id,
    title,
    description,
    startDate,
    endDate,
    timezone,
    venueName,
    venueAddress,
    city,
    country,
    latitude,
    longitude,
    category,
    subcategory,
    imageUrl,
    eventUrl,
    ticketUrl,
    priceMin,
    priceMax,
    currency,
    status,
    source,
    provider: "stungevents",
  };
}

/**
 * Normalizes raw StungEvents response Feature Collection into EventsResponseData.
 */
export function normalizeStungEventsResponse(
  raw: RawStungEventsResponse,
  page: number = 1,
  limit: number = DEFAULT_LIMIT
): EventsResponseData {
  const rawEvents = Array.isArray(raw?.events) ? raw.events : [];
  const events = rawEvents.map(normalizeStungEvent);

  const total =
    typeof raw?.count === "number" && isFinite(raw.count)
      ? raw.count
      : events.length;

  return {
    events,
    total,
    page,
    limit,
    provider: "stungevents",
  };
}

/**
 * Fetches events from StungEvents public REST API.
 * Features in-memory caching, AbortController timeouts, safe error mapping, and normalized output.
 */
export async function getEvents(
  params: EventsQueryParams = {}
): Promise<EventsResponseData> {
  const limit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, params.limit ?? DEFAULT_LIMIT));
  const page = Math.max(1, params.page ?? 1);
  const normalizedParams: EventsQueryParams = { ...params, limit, page };

  // 1. Check in-memory cache
  const cacheKey = buildEventsCacheKey(normalizedParams);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Build request URL (No API key needed)
  const baseUrl = process.env.STUNGEVENTS_API_BASE_URL || PRIMARY_STUNGEVENTS_URL;
  const requestUrl = buildStungEventsUrl(baseUrl, normalizedParams);

  // 3. Execute fetch with AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "TravelSensei/1.0",
      },
      signal: controller.signal,
    });
  } catch (fetchError: unknown) {
    clearTimeout(timeoutId);
    if (
      fetchError instanceof Error &&
      (fetchError.name === "AbortError" || fetchError.message.includes("aborted"))
    ) {
      throw mapStungEventsError(504);
    }
    throw mapStungEventsError(502);
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Handle provider error status codes
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

    throw mapStungEventsError(response.status, rawErrorData);
  }

  // 5. Parse response body safely
  let rawData: RawStungEventsResponse;
  try {
    rawData = (await response.json()) as RawStungEventsResponse;
  } catch {
    throw new StungEventsApiError(
      502,
      "Events service returned an invalid response format.",
      "INVALID_PROVIDER_RESPONSE"
    );
  }

  // 6. Normalize and cache response
  const normalizedData = normalizeStungEventsResponse(rawData, page, limit);
  saveToCache(cacheKey, normalizedData);

  return normalizedData;
}
