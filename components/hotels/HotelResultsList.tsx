"use client";

import React, { useState, useMemo } from "react";
import { HotelSearchResult, Hotel } from "@/lib/hotels/types";
import HotelCard from "./HotelCard";

export interface HotelResultsListProps {
  data: HotelSearchResult | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

type SortOption = "price_asc" | "rating_desc" | "stars_desc";

export default function HotelResultsList({
  data,
  isLoading,
  error,
  onRetry,
  className = "",
}: HotelResultsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("price_asc");

  // Client-side deterministic sorting
  const sortedHotels = useMemo(() => {
    if (!data || !Array.isArray(data.hotels)) return [];
    const list = [...data.hotels];

    return list.sort((a: Hotel, b: Hotel) => {
      if (sortBy === "price_asc") {
        const priceA = a.minRate?.price ?? Infinity;
        const priceB = b.minRate?.price ?? Infinity;
        return priceA - priceB;
      }
      if (sortBy === "rating_desc") {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        return ratingB - ratingA;
      }
      if (sortBy === "stars_desc") {
        const starsA = a.starRating ?? 0;
        const starsB = b.starRating ?? 0;
        return starsB - starsA;
      }
      return 0;
    });
  }, [data, sortBy]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div id="hotel-results-loading" className={`flex flex-col gap-6 animate-pulse ${className}`}>
        <div className="flex justify-between items-center h-12 bg-surface-container-low rounded-2xl p-4">
          <div className="h-5 bg-surface-container w-40 rounded-lg"></div>
          <div className="h-8 bg-surface-container w-32 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-surface-container-low rounded-3xl border border-surface-container-high/40 p-6 flex flex-col md:flex-row gap-5"
            >
              <div className="w-full md:w-56 h-48 bg-surface-container rounded-2xl shrink-0"></div>
              <div className="flex-1 flex flex-col justify-between py-2">
                <div className="flex flex-col gap-2">
                  <div className="h-6 bg-surface-container w-3/4 rounded-lg"></div>
                  <div className="h-4 bg-surface-container w-1/2 rounded"></div>
                  <div className="h-4 bg-surface-container w-full rounded mt-2"></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-surface-container">
                  <div className="h-8 bg-surface-container w-28 rounded-lg"></div>
                  <div className="h-9 bg-surface-container w-32 rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div
        id="hotel-results-error"
        className={`bg-surface-container-lowest rounded-3xl p-8 text-center shadow-md border border-rose-200 flex flex-col items-center gap-4 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">
            Hotel Search Unavailable
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
            {error}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            id="btn-retry-hotel-search"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm transition-all cursor-pointer mt-2 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  // If no data has been queried yet, render nothing
  if (!data) {
    return null;
  }

  const hotelCount = sortedHotels.length;

  // Empty Results State
  if (hotelCount === 0) {
    return (
      <div
        id="hotel-results-empty"
        className={`bg-surface-container-lowest rounded-3xl p-10 text-center shadow-md border border-surface-container-high/50 flex flex-col items-center gap-4 ${className}`}
      >
        <div className="w-16 h-16 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px]">hotel_class</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">
            No hotels found
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
            We couldn&apos;t find available hotels matching your search criteria. Try modifying your dates or exploring nearby locations.
          </p>
        </div>
        {data.metadata?.destination && (
          <span className="text-xs px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant">
            Searched: {data.metadata.destination}
          </span>
        )}
      </div>
    );
  }

  return (
    <div id="hotel-results-list" className={`flex flex-col gap-6 ${className}`}>
      {/* Results Header Bar: Count & Client-Side Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-surface-container-low rounded-2xl border border-surface-container-high/60">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-headline-sm text-base sm:text-lg font-extrabold text-on-surface">
            {hotelCount} {hotelCount === 1 ? "hotel found" : "hotels found"}
          </span>

          {data.metadata?.destination && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              in {data.metadata.destination}
            </span>
          )}

          {data.metadata?.checkin && data.metadata?.checkout && (
            <span className="text-xs text-on-surface-variant hidden md:inline">
              • {data.metadata.checkin} to {data.metadata.checkout}
            </span>
          )}
        </div>

        {/* Client-Side Sort Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label
            htmlFor="hotel-sort-select"
            className="text-xs font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">sort</span>
            <span>Sort by:</span>
          </label>
          <select
            id="hotel-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-bold text-on-surface transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="price_asc">Lowest Price</option>
            <option value="rating_desc">Highest Guest Rating</option>
            <option value="stars_desc">Star Rating (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Hotel Cards List */}
      <div className="grid grid-cols-1 gap-5">
        {sortedHotels.map((hotel) => (
          <HotelCard key={hotel.id} hotel={hotel} />
        ))}
      </div>
    </div>
  );
}
