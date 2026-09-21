"use client";

import React, { useState, useMemo } from "react";
import TrainCard from "./TrainCard";
import { TrainSearchData, TrainResult } from "@/lib/trains/types";

interface TrainResultsListProps {
  data: TrainSearchData | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onFindConnectingRoutes?: () => void;
  isSearchingConnecting?: boolean;
  className?: string;
}

type SortOption = "departure" | "duration" | "halts";

function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 999999;
  let total = 0;
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  const minsMatch = durationStr.match(/(\d+)\s*m/i);

  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) total += parseInt(minsMatch[1], 10);

  if (!hoursMatch && !minsMatch && durationStr.includes(":")) {
    const [h, m] = durationStr.split(":");
    total = parseInt(h, 10) * 60 + parseInt(m, 10);
  }

  return total > 0 ? total : 999999;
}

export default function TrainResultsList({
  data,
  isLoading,
  error,
  onRetry,
  onFindConnectingRoutes,
  isSearchingConnecting = false,
  className = "",
}: TrainResultsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("departure");

  // Sorted trains
  const sortedTrains = useMemo(() => {
    if (!data?.trains) return [];
    const list = [...data.trains];

    switch (sortBy) {
      case "departure":
        return list.sort((a, b) => (a.departure.time || "").localeCompare(b.departure.time || ""));
      case "duration":
        return list.sort((a, b) => parseDurationToMinutes(a.duration) - parseDurationToMinutes(b.duration));
      case "halts":
        return list.sort((a, b) => a.totalHaltsBetween - b.totalHaltsBetween);
      default:
        return list;
    }
  }, [data?.trains, sortBy]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className={`flex flex-col gap-4 animate-in fade-in duration-300 ${className}`}>
        <div className="flex items-center justify-between py-2">
          <div className="h-5 w-48 bg-surface-container-high/60 rounded-md animate-pulse"></div>
          <div className="h-8 w-36 bg-surface-container-high/60 rounded-xl animate-pulse"></div>
        </div>

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container-high/50 flex flex-col gap-4 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="h-6 w-52 bg-surface-container-high rounded-md"></div>
              <div className="h-5 w-24 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-center py-4">
              <div className="h-10 w-24 bg-surface-container-high rounded-md"></div>
              <div className="h-4 w-full bg-surface-container-high/60 rounded"></div>
              <div className="h-10 w-24 bg-surface-container-high rounded-md ml-auto"></div>
            </div>
            <div className="h-4 w-40 bg-surface-container-high/50 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`bg-surface-container-lowest rounded-3xl p-8 sm:p-10 text-center shadow-md border border-rose-200/80 flex flex-col items-center gap-4 ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px]">error</span>
        </div>
        <h3 className="font-headline-sm text-lg font-bold text-on-surface">
          Unable to find trains
        </h3>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer mt-2"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  // No data or search not initiated
  if (!data) {
    return null;
  }

  // Empty trains list
  if (!sortedTrains || sortedTrains.length === 0) {
    return (
      <div
        className={`bg-surface-container-lowest rounded-3xl p-8 sm:p-12 text-center shadow-md border border-surface-container-high/60 flex flex-col items-center gap-4 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">train</span>
        </div>
        <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
          No trains found between these stations
        </h3>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
          We could not find direct trains between{" "}
          <span className="font-bold text-on-surface">
            {data.from.name} ({data.from.code})
          </span>{" "}
          and{" "}
          <span className="font-bold text-on-surface">
            {data.to.name} ({data.to.code})
          </span>
          . Try enabling &ldquo;Include all metro city stations&rdquo; or searching for a nearby junction.
        </p>

        {onFindConnectingRoutes && (
          <button
            type="button"
            onClick={onFindConnectingRoutes}
            disabled={isSearchingConnecting}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSearchingConnecting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Searching Connecting Hubs...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">alt_route</span>
                <span>Find Connecting Routes (Via Hubs)</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Success list state
  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Summary Header and Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">train</span>
          <span className="text-sm sm:text-base font-extrabold text-on-surface">
            {sortedTrains.length} {sortedTrains.length === 1 ? "Train Available" : "Trains Available"}
          </span>
          <span className="text-xs text-on-surface-variant hidden sm:inline">
            between {data.from.code} and {data.to.code}
          </span>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          <span className="hidden sm:inline">Sort by:</span>
          <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-surface-container-high">
            <button
              type="button"
              onClick={() => setSortBy("departure")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === "departure"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Departure
            </button>
            <button
              type="button"
              onClick={() => setSortBy("duration")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === "duration"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Duration
            </button>
            <button
              type="button"
              onClick={() => setSortBy("halts")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === "halts"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Halts
            </button>
          </div>
        </div>
      </div>

      {/* Train Cards List */}
      <div className="flex flex-col gap-4">
        {sortedTrains.map((train: TrainResult, idx: number) => (
          <TrainCard key={`${train.trainNumber}-${idx}`} train={train} />
        ))}
      </div>
    </div>
  );
}
