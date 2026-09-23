"use client";

import React, { useState, useEffect, useRef } from "react";
import { RestaurantItem } from "@/lib/restaurants/types";

export interface RestaurantPhotoProps {
  restaurant: RestaurantItem;
  initialPhotoUrl?: string | null;
  onPhotoLoaded?: (photoUrl: string | null) => void;
  className?: string;
}

// In-memory client session cache to prevent repeated requests on re-renders
const photoCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();

function formatCuisine(cuisine: string): string {
  return cuisine
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
    .join(" · ");
}

/**
 * Builds a search query for Pexels based on restaurant metadata.
 * Prefers: restaurant name + cuisine
 * If cuisine unavailable: restaurant name + restaurant
 * If restaurant name is generic or very short: cuisine + restaurant + city
 * Never uses personal user location coordinates.
 */
export function buildRestaurantPhotoQuery(restaurant: RestaurantItem): string {
  const rawName = (restaurant.name || "").trim();
  const primaryCuisine = restaurant.cuisine
    ? restaurant.cuisine.split(";")[0].trim()
    : null;

  // Extract locality/city from address if available (e.g. last comma-separated part)
  let city: string | null = null;
  if (restaurant.address) {
    const addressParts = restaurant.address
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^\d+$/.test(p));
    if (addressParts.length > 0) {
      city = addressParts[addressParts.length - 1];
    }
  }

  const isVeryShort = rawName.length <= 3;
  const isGeneric = /^(restaurant|cafe|café|food|bar|dining|canteen|bistro|kitchen)$/i.test(rawName);

  if ((isVeryShort || isGeneric) && primaryCuisine) {
    return [primaryCuisine, "restaurant", city].filter(Boolean).join(" ");
  }

  if (primaryCuisine) {
    if (rawName.toLowerCase().includes(primaryCuisine.toLowerCase())) {
      return city ? `${rawName} ${city}` : rawName;
    }
    return `${rawName} ${primaryCuisine}`;
  }

  // Cuisine is unavailable
  if (rawName.toLowerCase().includes("restaurant") || rawName.toLowerCase().includes("cafe")) {
    return city ? `${rawName} ${city}` : rawName;
  }
  return `${rawName} restaurant`;
}

/**
 * Fetches a representative photo from the server-side Pexels proxy endpoint.
 * Requests per_page=3 and selects the best landscape-oriented photo.
 */
async function fetchRepresentativePhoto(query: string): Promise<string | null> {
  const cacheKey = query.toLowerCase().trim();

  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) ?? null;
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
        photoCache.set(cacheKey, null);
        return null;
      }

      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json?.data?.photos) && json.data.photos.length > 0) {
        const photos = json.data.photos as Array<{
          width: number;
          height: number;
          imageUrl: string;
        }>;

        // Prefer normal landscape orientation suitable for cards
        const suitable = photos.find((p) => p.width >= p.height) || photos[0];
        const selectedUrl = suitable?.imageUrl || null;
        photoCache.set(cacheKey, selectedUrl);
        return selectedUrl;
      }

      photoCache.set(cacheKey, null);
      return null;
    } catch {
      photoCache.set(cacheKey, null);
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export default function RestaurantPhoto({
  restaurant,
  initialPhotoUrl,
  onPhotoLoaded,
  className = "",
}: RestaurantPhotoProps) {
  const query = buildRestaurantPhotoQuery(restaurant);
  const cacheKey = query.toLowerCase().trim();

  // Check cache synchronously on initial render
  const cachedUrl = initialPhotoUrl !== undefined ? initialPhotoUrl : (photoCache.get(cacheKey) ?? null);
  const isAlreadyCached = photoCache.has(cacheKey) || Boolean(initialPhotoUrl);

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

    if (photoCache.has(cacheKey)) {
      const cached = photoCache.get(cacheKey) ?? null;
      setPhotoUrl(cached);
      setIsLoading(false);
      onPhotoLoaded?.(cached);
      return;
    }

    setIsLoading(true);
    setImageError(false);

    fetchRepresentativePhoto(query).then((url) => {
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
          alt={`Representative photo for ${restaurant.name}`}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Subtle representative photo badge */}
        <span
          className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/90 px-2 py-0.5 rounded pointer-events-none select-none"
          title={`Representative photo for ${restaurant.name}`}
        >
          Representative photo
        </span>
      </div>
    );
  }

  // Error or No photo available neutral placeholder
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high/20 text-primary ${className}`}
    >
      <span className="material-symbols-outlined text-[36px] text-primary/70">restaurant</span>
      <span className="text-[11px] font-semibold text-on-surface-variant/80 mt-1">
        {restaurant.cuisine ? formatCuisine(restaurant.cuisine).split("·")[0] : "Local Dining"}
      </span>
      <span className="text-[10px] text-on-surface-variant/60 font-medium">No photo available</span>
    </div>
  );
}
