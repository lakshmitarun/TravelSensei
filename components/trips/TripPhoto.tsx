"use client";

import React, { useState, useEffect, useRef } from "react";

export interface TripPhotoProps {
  type: "destination" | "activity";
  destination: string;
  country?: string;
  activityTitle?: string;
  className?: string;
  onPhotoLoaded?: (photoUrl: string | null) => void;
}

// In-memory client session cache to prevent duplicate requests across renders
const tripPhotoCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Extracts a clean country string from state_country or location string.
 * Example: "Telangana, India" -> "India"
 * Example: "Île-de-France, France" -> "France"
 * Example: "Tokyo, Japan" -> "Japan"
 */
function extractCountry(locationStr?: string): string {
  if (!locationStr) return "";
  const parts = locationStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  const lastPart = parts[parts.length - 1];
  // Remove postal codes or digits if any
  return lastPart.replace(/\d+/g, "").trim();
}

/**
 * Builds search query candidates for destination hero photos.
 * Uses destination travel identity and prioritized queries:
 * 1. "{destination} {country} cinematic travel scenery"
 * 2. "{destination} {country} beautiful scenic destination"
 * 3. "{destination} {country} iconic travel landscape"
 * 4. "{destination} {country} tourism scenery"
 * 5. "{destination} {country} famous destination"
 * 6. "{destination} {country} beautiful landscape"
 * 7. "{destination} {country} beautiful travel scenery"
 * 8. Fallbacks: "{destination} {country} travel", "{destination} {country}", "{destination} travel"
 *
 * Completely dynamic: never hardcodes any destination name or landmark mapping.
 */
export function buildDestinationCandidateQueries(destination: string, countryOrLocation?: string): string[] {
  const dest = (destination || "").trim();
  if (!dest) return [];

  const country = extractCountry(countryOrLocation);
  const suffix = country && !dest.toLowerCase().includes(country.toLowerCase()) ? ` ${country}` : "";

  const candidates: string[] = [
    // 1. Cinematic travel scenery
    `${dest}${suffix} cinematic travel scenery`.trim(),
    // 2. Beautiful scenic destination
    `${dest}${suffix} beautiful scenic destination`.trim(),
    // 3. Iconic travel landscape
    `${dest}${suffix} iconic travel landscape`.trim(),
    // 4. Tourism scenery
    `${dest}${suffix} tourism scenery`.trim(),
    // 5. Famous destination
    `${dest}${suffix} famous destination`.trim(),
    // 6. Beautiful landscape
    `${dest}${suffix} beautiful landscape`.trim(),
    // 7. Beautiful travel scenery
    `${dest}${suffix} beautiful travel scenery`.trim(),
    // 8. General fallbacks
    `${dest}${suffix} travel`.trim(),
    `${dest}${suffix}`.trim(),
    `${dest} travel`.trim(),
  ];

  return Array.from(new Set(candidates)).filter(Boolean);
}

/**
 * Primary destination query builder (for backward compatibility and primary search intent).
 */
export function buildDestinationPhotoQuery(destination: string, countryOrLocation?: string): string {
  const candidates = buildDestinationCandidateQueries(destination, countryOrLocation);
  return candidates[0] || destination.trim();
}

/**
 * Builds a search query for Pexels based on activity title and trip destination.
 * Dynamic format: "{activity title} {destination}"
 * If activity title is generic: "{activity title} {destination} travel"
 */
export function buildActivityPhotoQuery(activityTitle: string, destination: string): string {
  const title = (activityTitle || "").trim();
  const dest = (destination || "").trim();

  const isShort = title.length <= 4;
  const isGeneric = /^(visit|shopping|explore|tour|trip|sightseeing|walk|breakfast|lunch|dinner|food|stay|hotel|temple visit|market visit)$/i.test(
    title
  );

  if (isShort || isGeneric) {
    return [title, dest, "travel"].filter(Boolean).join(" ");
  }

  return [title, dest].filter(Boolean).join(" ");
}

export interface PhotoScoreCandidate {
  width: number;
  height: number;
  alt?: string;
  sourceUrl?: string;
  /** Pexels average color hex (e.g. "#6E633A"). Available when passed through from backend. */
  avgColor?: string;
}

export interface ColorStats {
  r: number;
  g: number;
  b: number;
  luma: number;
  spread: number;
  isWarm: boolean;
  isLush: boolean;
}

/**
 * Computes perceived brightness (0–255) from a hex color string.
 * Uses the standard ITU-R BT.601 luma formula: (R*299 + G*587 + B*114) / 1000.
 * Returns -1 if the color string is missing or invalid.
 */
export function hexBrightness(hex?: string): number {
  if (!hex || hex.length < 7 || hex[0] !== "#") return -1;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return -1;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Computes detailed color metrics (luma, saturation spread, warmth, lushness) from a hex string.
 */
export function hexColorStats(hex?: string): ColorStats | null {
  if (!hex || hex.length < 7 || hex[0] !== "#") return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const isWarm = r > b + 15 && g > b - 10;
  const isLush = g > r + 10 || (g > 110 && b > 100);
  return { r, g, b, luma, spread, isWarm, isLush };
}

/**
 * Scores a photo candidate to determine how well it represents the destination as a cinematic travel hero banner.
 *
 * Factors evaluated:
 * - ASPECT RATIO & CROP SAFETY: Wide landscape (1.50–2.20) strongly preferred; portrait rejected.
 * - DESTINATION RELEVANCE: Destination name match in alt text / source URL.
 * - TRAVEL IDENTITY & FOCAL SUBJECTS: Iconic landmarks, backwaters, houseboats, temples, palaces, etc.
 * - VISUAL DEPTH & MULTI-ELEMENT COMPOSITION: Foreground + middleground + background, reflections, aerial views.
 * - SCENIC QUALITY: Natural greenery, water, mountains, palm trees, architecture.
 * - LIGHTING QUALITY: Golden hour, sunrise, sunset, warm daylight, clear daylight.
 * - COLOR RICHNESS & BALANCE: Rich saturated tones, warm highlights, lush greens, avoiding muddy/washed out.
 * - DEMOTIONS: Indoor/bedroom/office, generic residential/streets, empty sky/road, night, B&W, blurry.
 * - RESOLUTION: High resolution clarity bonus.
 */
export function scoreDestinationPhoto(photo: PhotoScoreCandidate, destination: string): number {
  if (photo.width < photo.height) {
    return -100; // Completely unsuitable for wide horizontal hero banner
  }

  let score = 0;
  const ratio = photo.width / photo.height;

  // Aspect ratio suitability & crop safety: wide horizontal container (1.50 - 2.20 is ideal)
  if (ratio >= 1.5 && ratio <= 2.2) {
    score += 45; // Prime wide hero aspect ratio
  } else if (ratio >= 1.35 && ratio < 1.5) {
    score += 25; // Acceptable landscape
  } else if (ratio > 2.2 && ratio <= 2.6) {
    score += 30; // Ultrawide / panoramic
  } else {
    score += 5; // Near square
  }

  const text = `${photo.alt || ""} ${photo.sourceUrl || ""}`.toLowerCase();
  const destLower = destination.toLowerCase().trim();

  // Exact or word-level destination match in photo metadata
  if (destLower && text.includes(destLower)) {
    score += 35;
  } else {
    const words = destLower.split(/[\s,]+/).filter((w) => w.length > 2);
    if (words.some((w) => text.includes(w))) {
      score += 20;
    }
  }

  // Strong travel identity & recognizable focal subjects
  const primeIdentityKeywords = [
    "backwaters", "houseboat", "waterway", "canal", "lagoon", "tropical",
    "charminar", "eiffel", "hawa mahal", "jal mahal", "palace", "fort", "castle",
    "monument", "heritage", "temple", "pagoda", "shrine", "tower", "skyline",
    "cityscape", "panoramic", "coastline", "beach", "seashore", "bay", "harbor"
  ];
  let idMatches = 0;
  for (const kw of primeIdentityKeywords) {
    if (text.includes(kw)) {
      score += 15;
      idMatches++;
      if (idMatches >= 3) break;
    }
  }

  // Visual depth & multi-element composition cues (foreground/middleground/reflections)
  const depthKeywords = [
    "reflecting", "reflection", "reflect", "surrounded by", "overlooking",
    "aerial view", "panoramic view", "wide view", "along the", "framed",
    "cruising", "sailing", "navigating", "nestled", "winding"
  ];
  for (const kw of depthKeywords) {
    if (text.includes(kw)) {
      score += 10;
      break;
    }
  }

  // General travel scenery, natural beauty, and landmark keywords
  const scenicKeywords = [
    "scenery", "landscape", "scenic", "nature", "mountain", "lake", "river",
    "sea", "ocean", "palm trees", "coconut trees", "greenery", "lush",
    "tea plantation", "hills", "valley", "breathtaking", "stunning", "majestic",
    "architecture", "landmark", "view", "travel", "tourism", "tourist"
  ];
  for (const kw of scenicKeywords) {
    if (text.includes(kw)) {
      score += 5;
    }
  }

  // Attractive lighting / visual vibrancy cues
  const lightingVibrant = [
    "golden hour", "sunset", "sunrise", "sunlight", "sunny", "clear sky",
    "blue sky", "daytime", "vivid", "vibrant", "colorful", "tranquil",
    "peaceful", "serene", "crystal clear", "bright", "blooming"
  ];
  for (const kw of lightingVibrant) {
    if (text.includes(kw)) {
      score += 8;
    }
  }

  // ── avg_color brightness, saturation, and warmth scoring ──
  const cStats = hexColorStats(photo.avgColor);
  if (cStats) {
    // 1. Perceived brightness (BT.601 luma)
    if (cStats.luma >= 100 && cStats.luma <= 190) {
      score += 20; // Rich balanced daylight or warm golden hour
    } else if (cStats.luma > 190 && cStats.luma <= 225) {
      score += 15; // Bright daylight
    } else if (cStats.luma >= 70 && cStats.luma < 100) {
      score -= 10; // Dim / dull
    } else if (cStats.luma < 70) {
      score -= 30; // Very dark image penalty
    } else if (cStats.luma > 225) {
      score -= 15; // Overexposed / washed out penalty
    }

    // 2. Saturation & color richness spread
    if (cStats.spread >= 40) {
      score += 20; // Highly rich vibrant colors
    } else if (cStats.spread >= 20) {
      score += 10; // Balanced colors
    } else if (cStats.spread < 10 && cStats.luma < 180) {
      score -= 20; // Gray/dull/muddy image penalty
    }

    // 3. Warm golden or rich tropical tones
    if (cStats.isWarm || cStats.isLush) {
      score += 10;
    }
  }

  // Heavily penalize generic indoor, bedroom, office, close-up
  const demoteIndoor = [
    "bedroom", "office", "laptop", "meeting", "desk", "indoor", "interior",
    "close up", "selfie", "kitchen", "bathroom", "apartment", "furniture"
  ];
  for (const kw of demoteIndoor) {
    if (text.includes(kw)) {
      score -= 40;
    }
  }

  // Penalize empty sky, empty road, gloomy, or generic residential
  const demoteBoring = [
    "empty sky", "dark sky", "cloudy sky", "gloomy", "overcast", "dull",
    "empty road", "asphalt", "highway", "traffic", "parking", "sidewalk",
    "residential", "apartment building", "distant view", "extreme edge"
  ];
  for (const kw of demoteBoring) {
    if (text.includes(kw)) {
      score -= 25;
    }
  }

  // Penalize night / nighttime photos
  if (text.includes("at night") || text.includes("nighttime") || text.includes("night view") || text.includes("night sky")) {
    score -= 20;
  }

  // Penalize black and white
  if (text.includes("black and white") || text.includes("monochrome") || text.includes("grayscale")) {
    score -= 35;
  }

  // High resolution clarity bonus
  if (photo.width >= 1920 && photo.height >= 1080) {
    score += 15;
  } else if (photo.width >= 1200) {
    score += 5;
  }

  return score;
}

interface FetchedPhotoItem {
  id: number;
  width: number;
  height: number;
  imageUrl: string;
  alt: string;
  sourceUrl?: string;
  avgColor?: string;
}

/**
 * Searches photos via the secure server proxy endpoint /api/photos/search.
 */
async function queryPhotoProxy(query: string, perPage: number = 10): Promise<FetchedPhotoItem[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      per_page: String(perPage),
      page: "1",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`/api/photos/search?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const json = await res.json().catch(() => null);
    if (json?.success && Array.isArray(json?.data?.photos)) {
      return json.data.photos as FetchedPhotoItem[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Intelligently searches and selects the best representative hero photo for a destination.
 * Evaluates multiple prioritized candidate queries (cinematic travel scenery -> beautiful scenic destination -> iconic travel landscape -> tourism scenery -> famous destination).
 * Selects wide landscape photos featuring iconic landmarks or scenic travel imagery.
 */
async function fetchDestinationHeroPhoto(destination: string, countryOrLocation?: string): Promise<string | null> {
  const dest = (destination || "").trim();
  if (!dest) return null;

  const cacheKey = `dest:${dest.toLowerCase()}:${(countryOrLocation || "").toLowerCase().trim()}`;

  if (tripPhotoCache.has(cacheKey)) {
    return tripPhotoCache.get(cacheKey) ?? null;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const candidates = buildDestinationCandidateQueries(dest, countryOrLocation);
      let fallbackPhotoUrl: string | null = null;
      let highestScore = -1;

      // Evaluate top candidate queries to find the most attractive travel identity photo
      const maxAttempts = Math.min(candidates.length, 5);
      const allScoredPhotos: { photo: FetchedPhotoItem; score: number }[] = [];

      for (let i = 0; i < maxAttempts; i++) {
        const candidateQuery = candidates[i];
        const photos = await queryPhotoProxy(candidateQuery, 10);

        if (photos.length > 0) {
          // Strictly evaluate landscape candidates
          const landscapePhotos = photos.filter((p) => p.width >= p.height);

          if (landscapePhotos.length > 0) {
            for (const p of landscapePhotos) {
              const sc = scoreDestinationPhoto(p, dest);
              allScoredPhotos.push({ photo: p, score: sc });
            }

            // If an outstanding cinematic travel photo (score >= 170) is found early, select it
            const currentBest = [...allScoredPhotos].sort((a, b) => b.score - a.score)[0];
            if (currentBest && currentBest.score >= 170) {
              tripPhotoCache.set(cacheKey, currentBest.photo.imageUrl);
              return currentBest.photo.imageUrl;
            }
          }
        }
      }

      // If we collected scored landscape photos across candidates, pick the highest scoring one
      if (allScoredPhotos.length > 0) {
        allScoredPhotos.sort((a, b) => b.score - a.score);
        const best = allScoredPhotos[0];

        if (best && best.score >= 25 && best.photo.imageUrl) {
          tripPhotoCache.set(cacheKey, best.photo.imageUrl);
          return best.photo.imageUrl;
        }

        if (best && best.score > highestScore && best.photo.imageUrl) {
          highestScore = best.score;
          fallbackPhotoUrl = best.photo.imageUrl;
        }
      }

      // If we have a suitable fallback photo with positive score, use it
      if (fallbackPhotoUrl && highestScore >= 0) {
        tripPhotoCache.set(cacheKey, fallbackPhotoUrl);
        return fallbackPhotoUrl;
      }

      // Final fallback: standard destination travel query
      const fallbackQuery = `${dest} travel`;
      const fallbackPhotos = await queryPhotoProxy(fallbackQuery, 3);
      const landscapeFallback = fallbackPhotos.find((p) => p.width >= p.height) || fallbackPhotos[0];

      if (landscapeFallback?.imageUrl) {
        tripPhotoCache.set(cacheKey, landscapeFallback.imageUrl);
        return landscapeFallback.imageUrl;
      }

      // No suitable photo found; cache null so hero shows default neutral gradient
      tripPhotoCache.set(cacheKey, null);
      return null;
    } catch {
      tripPhotoCache.set(cacheKey, null);
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches a representative photo for an itinerary activity card.
 */
async function fetchRepresentativeActivityPhoto(query: string): Promise<string | null> {
  const cacheKey = `act:${query.toLowerCase().trim()}`;

  if (tripPhotoCache.has(cacheKey)) {
    return tripPhotoCache.get(cacheKey) ?? null;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const photos = await queryPhotoProxy(query, 3);
      if (photos.length > 0) {
        const suitable = photos.find((p) => p.width >= p.height) || photos[0];
        const selectedUrl = suitable?.imageUrl || null;
        tripPhotoCache.set(cacheKey, selectedUrl);
        return selectedUrl;
      }

      tripPhotoCache.set(cacheKey, null);
      return null;
    } catch {
      tripPhotoCache.set(cacheKey, null);
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export default function TripPhoto({
  type,
  destination,
  country,
  activityTitle,
  className = "",
  onPhotoLoaded,
}: TripPhotoProps) {
  const destQuery = destination.trim();
  const actQuery = buildActivityPhotoQuery(activityTitle || "Explore", destination);
  const cacheKey =
    type === "destination"
      ? `dest:${destQuery.toLowerCase()}:${(country || "").toLowerCase().trim()}`
      : `act:${actQuery.toLowerCase().trim()}`;

  const cachedUrl = tripPhotoCache.get(cacheKey) ?? null;
  const isAlreadyCached = tripPhotoCache.has(cacheKey);

  const [photoUrl, setPhotoUrl] = useState<string | null>(cachedUrl);
  const [isLoading, setIsLoading] = useState<boolean>(!isAlreadyCached && Boolean(destination));
  const [imageError, setImageError] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!destination) {
      setIsLoading(false);
      return;
    }

    if (tripPhotoCache.has(cacheKey)) {
      const cached = tripPhotoCache.get(cacheKey) ?? null;
      setPhotoUrl(cached);
      setIsLoading(false);
      onPhotoLoaded?.(cached);
      return;
    }

    setIsLoading(true);
    setImageError(false);

    const promise =
      type === "destination"
        ? fetchDestinationHeroPhoto(destination, country)
        : fetchRepresentativeActivityPhoto(actQuery);

    promise.then((url) => {
      if (!isMountedRef.current) return;
      setPhotoUrl(url);
      setIsLoading(false);
      onPhotoLoaded?.(url);
    });
  }, [type, destination, country, actQuery, cacheKey, onPhotoLoaded]);

  const altTitle = type === "destination" ? destination : (activityTitle || "Activity");

  // Destination hero background mode
  if (type === "destination") {
    if (isLoading) {
      return (
        <div
          className={`absolute inset-0 bg-white/5 animate-pulse pointer-events-none ${className}`}
          aria-label="Loading destination photo..."
        />
      );
    }

    if (photoUrl && !imageError) {
      return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
          <img
            src={photoUrl}
            alt={`Representative photo for ${altTitle}`}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
          {/* Light balanced overlay: photo colors remain vivid and bright, white text stays crisp */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />

          {/* Representative photo badge */}
          <span
            className="absolute bottom-3 right-4 text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/80 px-2 py-0.5 rounded select-none pointer-events-auto"
            title={`Representative photo for ${altTitle}`}
          >
            Representative photo
          </span>
        </div>
      );
    }

    // Fallback: Return null so the hero card shows its default gradient background
    return null;
  }

  // Activity card top photo mode
  if (isLoading) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-surface-container-high/30 animate-pulse text-on-surface-variant/60 ${className}`}
        aria-label="Loading photo..."
      >
        <span className="material-symbols-outlined text-2xl text-on-surface-variant/40 animate-spin">
          progress_activity
        </span>
        <span className="text-[11px] font-medium mt-1">Loading photo...</span>
      </div>
    );
  }

  if (photoUrl && !imageError) {
    return (
      <div className={`relative w-full h-full overflow-hidden group ${className}`}>
        <img
          src={photoUrl}
          alt={`Representative photo for ${altTitle}`}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Subtle representative photo badge */}
        <span
          className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/90 px-2 py-0.5 rounded pointer-events-none select-none"
          title={`Representative photo for ${altTitle}`}
        >
          Representative photo
        </span>
      </div>
    );
  }

  // Neutral "No photo available" placeholder for activity cards
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high/20 text-primary ${className}`}
    >
      <span className="material-symbols-outlined text-[28px] text-primary/70">photo_camera</span>
      <span className="text-[10px] text-on-surface-variant/60 font-medium mt-1">No photo available</span>
    </div>
  );
}
