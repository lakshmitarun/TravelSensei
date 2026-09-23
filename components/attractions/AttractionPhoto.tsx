"use client";

import React, { useState, useEffect, useRef } from "react";
import { AttractionItem } from "@/lib/attractions/types";

export interface AttractionPhotoProps {
  attraction: AttractionItem;
  initialPhotoUrl?: string | null;
  onPhotoLoaded?: (photoUrl: string | null) => void;
  className?: string;
}

// In-memory client session cache to prevent duplicate requests across renders and modal openings
const attractionPhotoCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Builds a search query for Pexels based on attraction metadata.
 * Preferred priority:
 * 1. attraction name + city + attraction category (e.g. "imran bhai home Hyderabad artwork attraction")
 * 2. If name is generic/short: category + city (e.g. "artwork attractions Hyderabad")
 * 3. If category is unavailable: "tourist attraction Hyderabad"
 * Never uses personal user GPS location.
 */
export function buildAttractionPhotoQuery(attraction: AttractionItem): string {
  const rawName = (attraction.name || "").trim();
  const city = attraction.city?.trim() || attraction.state?.trim() || attraction.country?.trim() || "";

  // Extract primary readable category
  let categoryLabel = "";
  if (Array.isArray(attraction.categories) && attraction.categories.length > 0) {
    const specific = attraction.categories
      .filter((c) => c !== "tourism")
      .map((c) => {
        const parts = c.split(".");
        return parts[parts.length - 1].replace(/_/g, " ");
      })
      .filter((c) => c.length > 0);

    if (specific.length > 0) {
      const cleanParts = Array.from(new Set(specific.slice(0, 2)));
      if (!cleanParts.some((p) => p.includes("attraction") || p.includes("sight"))) {
        cleanParts.push("attraction");
      }
      categoryLabel = cleanParts.join(" ");
    }
  }

  const isVeryShort = rawName.length <= 3;
  const isGeneric = /^(attraction|tourist attraction|sights|monument|landmark|poi|point of interest|place|building)$/i.test(rawName);

  // 2. If name is generic or unlikely to return useful results: category + city
  if (isVeryShort || isGeneric) {
    if (categoryLabel) {
      return [categoryLabel, "attractions", city].filter(Boolean).join(" ");
    }
    return ["tourist attraction", city].filter(Boolean).join(" ");
  }

  // 3. If category is unavailable:
  if (!categoryLabel) {
    return [rawName, city, "tourist attraction"].filter(Boolean).join(" ");
  }

  // 1. Preferred priority: attraction name + city + attraction category
  return [rawName, city, categoryLabel].filter(Boolean).join(" ");
}

/**
 * Fetches a representative photo from the server-side Pexels proxy endpoint.
 * Requests per_page=3 and selects the best landscape-oriented photo.
 */
async function fetchRepresentativeAttractionPhoto(query: string): Promise<string | null> {
  const cacheKey = query.toLowerCase().trim();

  if (attractionPhotoCache.has(cacheKey)) {
    return attractionPhotoCache.get(cacheKey) ?? null;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const params = new URLSearchParams({
        q: query,
        per_page: "3",
        page: "1",
      });

      const res = await fetch(`/api/photos/search?${params.toString()}`);
      if (!res.ok) {
        attractionPhotoCache.set(cacheKey, null);
        return null;
      }

      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json?.data?.photos) && json.data.photos.length > 0) {
        const photos = json.data.photos as Array<{
          width: number;
          height: number;
          imageUrl: string;
        }>;

        // Prefer normal landscape orientation (width >= height) suitable for cards
        const suitable = photos.find((p) => p.width >= p.height) || photos[0];
        const selectedUrl = suitable?.imageUrl || null;
        attractionPhotoCache.set(cacheKey, selectedUrl);
        return selectedUrl;
      }

      attractionPhotoCache.set(cacheKey, null);
      return null;
    } catch {
      attractionPhotoCache.set(cacheKey, null);
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export default function AttractionPhoto({
  attraction,
  initialPhotoUrl,
  onPhotoLoaded,
  className = "",
}: AttractionPhotoProps) {
  const query = buildAttractionPhotoQuery(attraction);
  const cacheKey = query.toLowerCase().trim();

  // Check cache synchronously on initial render
  const cachedUrl = initialPhotoUrl !== undefined ? initialPhotoUrl : (attractionPhotoCache.get(cacheKey) ?? null);
  const isAlreadyCached = attractionPhotoCache.has(cacheKey) || Boolean(initialPhotoUrl);

  const [photoUrl, setPhotoUrl] = useState<string | null>(cachedUrl);
  const [isLoading, setIsLoading] = useState<boolean>(!isAlreadyCached);
  const [imageError, setImageError] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialPhotoUrl !== undefined) {
      setPhotoUrl(initialPhotoUrl);
      setIsLoading(false);
      return;
    }

    if (attractionPhotoCache.has(cacheKey)) {
      const cached = attractionPhotoCache.get(cacheKey) ?? null;
      setPhotoUrl(cached);
      setIsLoading(false);
      onPhotoLoaded?.(cached);
      return;
    }

    setIsLoading(true);
    setImageError(false);

    fetchRepresentativeAttractionPhoto(query).then((url) => {
      if (!isMountedRef.current) return;
      setPhotoUrl(url);
      setIsLoading(false);
      onPhotoLoaded?.(url);
    });
  }, [query, cacheKey, initialPhotoUrl, onPhotoLoaded]);

  // Loading skeleton state
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

  // Representative photo available
  if (photoUrl && !imageError) {
    return (
      <div className={`relative w-full h-full overflow-hidden group ${className}`}>
        <img
          src={photoUrl}
          alt={`Representative photo for ${attraction.name}`}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Subtle representative photo badge */}
        <span
          className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/90 px-2 py-0.5 rounded pointer-events-none select-none"
          title={`Representative photo for ${attraction.name}`}
        >
          Representative photo
        </span>
      </div>
    );
  }

  // Neutral "No photo available" placeholder
  return (
    <div
      id="attraction-neutral-photo-placeholder"
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high/20 text-primary ${className}`}
    >
      <span className="material-symbols-outlined text-[36px] text-primary/70">attractions</span>
      <span className="text-[10px] text-on-surface-variant/60 font-medium mt-1">No photo available</span>
    </div>
  );
}
