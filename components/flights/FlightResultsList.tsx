"use client";

import React, { useState, useMemo } from "react";
import { FlightSearchResponseData, FlightItinerary } from "@/lib/flights/types";
import FlightCard from "./FlightCard";

interface FlightResultsListProps {
  data: FlightSearchResponseData | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

type SortOption = "price_asc" | "duration_asc" | "stops_asc";

export default function FlightResultsList({
  data,
  isLoading,
  error,
  onRetry,
  className = "",
}: FlightResultsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("price_asc");

  // Sort itineraries based on selected sort option
  const sortedItineraries = useMemo(() => {
    if (!data || !Array.isArray(data.itineraries)) return [];
    const list = [...data.itineraries];

    return list.sort((a: FlightItinerary, b: FlightItinerary) => {
      if (sortBy === "price_asc") {
        return (a.price?.amount ?? 0) - (b.price?.amount ?? 0);
      }
      if (sortBy === "duration_asc") {
        const durA = (a.outbound?.durationMinutes ?? 0) + (a.inbound?.durationMinutes ?? 0);
        const durB = (b.outbound?.durationMinutes ?? 0) + (b.inbound?.durationMinutes ?? 0);
        return durA - durB;
      }
      if (sortBy === "stops_asc") {
        const stopsA = (a.outbound?.stops ?? 0) + (a.inbound?.stops ?? 0);
        const stopsB = (b.outbound?.stops ?? 0) + (b.inbound?.stops ?? 0);
        return stopsA - stopsB;
      }
      return 0;
    });
  }, [data, sortBy]);

  // Loading State Skeletons
  if (isLoading) {
    return (
      <div className={`flex flex-col gap-6 animate-pulse ${className}`}>
        <div className="h-12 bg-surface-container-low rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 bg-surface-container-low rounded-3xl border border-surface-container-high/40 p-6 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="h-6 bg-surface-container w-32 rounded-lg"></div>
                <div className="h-8 bg-surface-container w-28 rounded-lg"></div>
              </div>
              <div className="h-16 bg-surface-container w-full rounded-xl my-4"></div>
              <div className="h-4 bg-surface-container w-48 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State Banner
  if (error) {
    return (
      <div className={`bg-surface-container-lowest rounded-3xl p-8 text-center shadow-md border border-rose-200 flex flex-col items-center gap-4 ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">
            Flight Search Unavailable
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
            {error}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm transition-all cursor-pointer mt-2"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // No active search yet
  if (!data) {
    return null;
  }

  // Empty Results State
  if (sortedItineraries.length === 0) {
    return (
      <div className={`bg-surface-container-lowest rounded-3xl p-10 text-center shadow-md border border-surface-container-high/60 flex flex-col items-center gap-4 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-surface-container-low text-on-surface-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px]">flight_takeoff</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">
            No Flights Found
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
            No available flights were returned for {data.origin} → {data.destination} on {data.departureDate}.
            Try changing the dates, choosing alternative nearby airports, or adjusting filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* 1. RESULTS HEADER & SORTING BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 bg-surface-container-low rounded-2xl border border-surface-container-high/60">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-base sm:text-lg font-extrabold text-on-surface">
              {sortedItineraries.length} Flight{sortedItineraries.length === 1 ? "" : "s"} Available
            </span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase">
              {data.type}
            </span>
          </div>
          <span className="text-xs text-on-surface-variant">
            {data.origin} → {data.destination} • {data.departureDate}
            {data.returnDate ? ` to ${data.returnDate}` : ""}
          </span>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="flight-sort" className="text-xs font-bold text-on-surface-variant shrink-0">
            Sort by:
          </label>
          <select
            id="flight-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface text-xs font-semibold outline-none cursor-pointer hover:border-primary transition-colors"
          >
            <option value="price_asc">Lowest Price</option>
            <option value="duration_asc">Shortest Duration</option>
            <option value="stops_asc">Fewest Stops</option>
          </select>
        </div>
      </div>

      {/* 2. FLIGHT CARDS LIST */}
      <div className="flex flex-col gap-4">
        {sortedItineraries.map((itinerary) => (
          <FlightCard key={itinerary.id} itinerary={itinerary} />
        ))}
      </div>
    </div>
  );
}
