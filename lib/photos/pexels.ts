/**
 * Pexels Photo Search Client for TravelSensei
 * Queries official Pexels API v1 (/v1/search) and normalizes photo results.
 * Features:
 * - Server-only credential isolation (PEXELS_API_KEY)
 * - 30-minute in-memory LRU-like cache (capacity 500)
 * - 8-second request timeout using AbortController
 * - Comprehensive error mapping (400, 401, 429, 502, 504)
 * - Strict non-fabrication of place identities (Pexels is used strictly as a representative photo source)
 */

import {
  NormalizedPhoto,
  PhotoSearchParams,
  PhotoSearchResponseData,
  PexelsPhotoError,
  RawPexelsSearchResponse,
  RawPexelsPhoto,
} from "./types";

export const PEXELS_BASE_URL = "https://api.pexels.com/v1";
export const DEFAULT_TIMEOUT_MS = 8000;

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

export const MIN_PER_PAGE = 1;
export const DEFAULT_PER_PAGE = 10;
export const MAX_PER_PAGE = 20;

export const MIN_PAGE = 1;
export const DEFAULT_PAGE = 1;

// 30-minute in-memory server-side cache (capacity 500)
export const CACHE_TTL_MS = 30 * 60 * 1000;
export const MAX_CACHE_ENTRIES = 500;

interface CacheEntry {
  data: PhotoSearchResponseData;
  expiresAt: number;
}

const PHOTO_CACHE = new Map<string, CacheEntry>();

export function buildPhotoCacheKey(query: string, page: number, perPage: number): string {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  return `${normalizedQuery}:${page}:${perPage}`;
}

export function getFromPhotoCache(key: string): PhotoSearchResponseData | null {
  const entry = PHOTO_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    PHOTO_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

export function saveToPhotoCache(key: string, data: PhotoSearchResponseData): void {
  if (PHOTO_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = PHOTO_CACHE.keys().next().value;
    if (oldestKey) PHOTO_CACHE.delete(oldestKey);
  }
  PHOTO_CACHE.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearPhotoCache(): void {
  PHOTO_CACHE.clear();
}

/**
 * Validates and retrieves server-only Pexels API credentials.
 * Ensures the API key is never exposed or logged.
 */
export function getPexelsConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    throw new PexelsPhotoError(
      502,
      "Photo service credentials are not configured.",
      "PHOTO_CONFIG_ERROR"
    );
  }

  return {
    apiKey: apiKey.trim(),
    baseUrl: PEXELS_BASE_URL,
  };
}

/**
 * Normalizes raw Pexels photo object into a clean NormalizedPhoto contract.
 * Does NOT invent missing values or make fake place associations.
 */
export function normalizePexelsPhoto(raw: RawPexelsPhoto): NormalizedPhoto | null {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "number") {
    return null;
  }

  const src = (raw.src && typeof raw.src === "object" ? raw.src : {}) as Record<string, unknown>;
  const imageUrl =
    typeof src.large === "string" && src.large.trim()
      ? src.large.trim()
      : typeof src.medium === "string" && src.medium.trim()
      ? src.medium.trim()
      : typeof src.original === "string" && src.original.trim()
      ? src.original.trim()
      : "";

  if (!imageUrl) {
    return null;
  }

  const photographer =
    typeof raw.photographer === "string" && raw.photographer.trim()
      ? raw.photographer.trim()
      : "Unknown Photographer";

  const photographerUrl =
    typeof raw.photographer_url === "string" && raw.photographer_url.trim()
      ? raw.photographer_url.trim()
      : "";

  const sourceUrl =
    typeof raw.url === "string" && raw.url.trim() ? raw.url.trim() : "";

  const alt =
    typeof raw.alt === "string" && raw.alt.trim()
      ? raw.alt.trim()
      : "Representative Photo";

  return {
    id: raw.id,
    width: typeof raw.width === "number" && isFinite(raw.width) ? raw.width : 0,
    height: typeof raw.height === "number" && isFinite(raw.height) ? raw.height : 0,
    photographer,
    photographerUrl,
    sourceUrl,
    imageUrl,
    alt,
    avgColor:
      typeof raw.avg_color === "string" && raw.avg_color.trim()
        ? raw.avg_color.trim()
        : undefined,
  };
}

/**
 * Constructs the Pexels Search request URL.
 */
export function buildPexelsSearchUrl(
  baseUrl: string,
  query: string,
  perPage: number,
  page: number
): string {
  const searchParams = new URLSearchParams({
    query: query.trim(),
    per_page: String(perPage),
    page: String(page),
  });
  return `${baseUrl}/search?${searchParams.toString()}`;
}

/**
 * Validates search query parameters.
 */
export function validatePhotoSearchParams(params: PhotoSearchParams): {
  query: string;
  perPage: number;
  page: number;
} {
  const rawQ = params.q;
  if (typeof rawQ !== "string" || !rawQ.trim()) {
    throw new PexelsPhotoError(400, "Query parameter 'q' is required.", "BAD_REQUEST");
  }

  const query = rawQ.trim();
  if (query.length < MIN_QUERY_LENGTH) {
    throw new PexelsPhotoError(
      400,
      `Query must be at least ${MIN_QUERY_LENGTH} characters.`,
      "BAD_REQUEST"
    );
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw new PexelsPhotoError(
      400,
      `Query must be at most ${MAX_QUERY_LENGTH} characters.`,
      "BAD_REQUEST"
    );
  }

  let perPage = DEFAULT_PER_PAGE;
  if (params.per_page !== undefined && params.per_page !== null) {
    const num = Number(params.per_page);
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num)) {
      throw new PexelsPhotoError(400, "Parameter 'per_page' must be an integer.", "BAD_REQUEST");
    }
    if (num < MIN_PER_PAGE || num > MAX_PER_PAGE) {
      throw new PexelsPhotoError(
        400,
        `Parameter 'per_page' must be between ${MIN_PER_PAGE} and ${MAX_PER_PAGE}.`,
        "BAD_REQUEST"
      );
    }
    perPage = num;
  }

  let page = DEFAULT_PAGE;
  if (params.page !== undefined && params.page !== null) {
    const num = Number(params.page);
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num)) {
      throw new PexelsPhotoError(400, "Parameter 'page' must be an integer.", "BAD_REQUEST");
    }
    if (num < MIN_PAGE) {
      throw new PexelsPhotoError(
        400,
        `Parameter 'page' must be at least ${MIN_PAGE}.`,
        "BAD_REQUEST"
      );
    }
    page = num;
  }

  return { query, perPage, page };
}

/**
 * Searches photos using official Pexels API v1 with caching and error isolation.
 */
export async function searchPexelsPhotos(
  params: PhotoSearchParams
): Promise<PhotoSearchResponseData> {
  const { query, perPage, page } = validatePhotoSearchParams(params);

  // 1. Check in-memory server cache
  const cacheKey = buildPhotoCacheKey(query, page, perPage);
  const cached = getFromPhotoCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Obtain server-side config
  const { apiKey, baseUrl } = getPexelsConfig();
  const requestUrl = buildPexelsSearchUrl(baseUrl, query, perPage, page);

  // 3. Perform fetch with AbortController timeout (8 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
      },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      throw new PexelsPhotoError(504, "Photo service request timed out.", "GATEWAY_TIMEOUT");
    }
    throw new PexelsPhotoError(502, "Photo service is temporarily unavailable.", "PROVIDER_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Handle provider HTTP status
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new PexelsPhotoError(
        502,
        "Photo provider authentication failed. Please verify provider credentials.",
        "PROVIDER_AUTH_ERROR"
      );
    }
    if (response.status === 429) {
      throw new PexelsPhotoError(
        429,
        "Photo service rate limit reached. Please try again later.",
        "RATE_LIMITED"
      );
    }
    if (response.status === 504) {
      throw new PexelsPhotoError(504, "Photo service request timed out.", "GATEWAY_TIMEOUT");
    }
    if (response.status === 400) {
      throw new PexelsPhotoError(400, "Invalid photo request parameters.", "BAD_REQUEST");
    }

    throw new PexelsPhotoError(502, "Photo service is temporarily unavailable.", "PROVIDER_UNAVAILABLE");
  }

  // 5. Parse response safely
  let rawJson: unknown;
  try {
    rawJson = await response.json();
  } catch {
    throw new PexelsPhotoError(
      502,
      "Photo service returned an invalid response format.",
      "INVALID_PROVIDER_RESPONSE"
    );
  }

  // 6. Normalize and assemble result
  const rawData = (rawJson && typeof rawJson === "object" ? rawJson : {}) as RawPexelsSearchResponse;
  const rawPhotos = Array.isArray(rawData.photos) ? rawData.photos : [];

  const photos: NormalizedPhoto[] = [];
  for (const rawPhoto of rawPhotos) {
    const normalized = normalizePexelsPhoto(rawPhoto);
    if (normalized) {
      photos.push(normalized);
    }
  }

  const result: PhotoSearchResponseData = {
    photos,
    page: typeof rawData.page === "number" ? rawData.page : page,
    perPage: typeof rawData.per_page === "number" ? rawData.per_page : perPage,
    totalResults: typeof rawData.total_results === "number" ? rawData.total_results : photos.length,
  };

  // 7. Save to cache
  saveToPhotoCache(cacheKey, result);

  return result;
}
