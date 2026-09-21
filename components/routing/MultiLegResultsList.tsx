"use client";

import React, { useState, useMemo } from "react";
import { RoutingSearchData, JourneyRoute } from "@/lib/routing/types";
import JourneyRouteCard from "./JourneyRouteCard";

interface MultiLegResultsListProps {
  data: RoutingSearchData | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

type SortBy = "duration" | "transfers" | "departure";

export default function MultiLegResultsList({
  data,
  isLoading,
  error,
  onRetry,
  className = "",
}: MultiLegResultsListProps) {
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "connecting">("all");
  const [sortBy, setSortBy] = useState<SortBy>("duration");

  const directCount = data?.directRoutes.length || 0;
  const connectingCount = data?.connectingRoutes.length || 0;

  const routesToDisplay = useMemo(() => {
    if (!data) return [];
    let list: JourneyRoute[] = [];

    if (activeTab === "all") {
      list = [...data.directRoutes, ...data.connectingRoutes];
    } else if (activeTab === "direct") {
      list = [...data.directRoutes];
    } else {
      list = [...data.connectingRoutes];
    }

    switch (sortBy) {
      case "duration":
        return list.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
      case "transfers":
        return list.sort((a, b) => a.numberOfTransfers - b.numberOfTransfers);
      case "departure":
        return list.sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));
      default:
        return list;
    }
  }, [data, activeTab, sortBy]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col gap-4 animate-in fade-in duration-300 ${className}`}>
        <div className="h-6 w-60 bg-surface-container-high/60 rounded-md animate-pulse"></div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container-high/50 flex flex-col gap-4 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="h-6 w-48 bg-surface-container-high rounded-md"></div>
              <div className="h-6 w-20 bg-surface-container-high rounded-md"></div>
            </div>
            <div className="h-20 w-full bg-surface-container-high/40 rounded-2xl"></div>
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
          Unable to find routes
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

  if (!data) return null;

  if (routesToDisplay.length === 0) {
    return (
      <div
        className={`bg-surface-container-lowest rounded-3xl p-8 sm:p-12 text-center shadow-md border border-surface-container-high/60 flex flex-col items-center gap-4 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">route</span>
        </div>
        <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
          No suitable routes found
        </h3>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
          No direct options or connecting journeys within acceptable transfer windows were found between{" "}
          <span className="font-bold text-on-surface">{data.origin.name}</span> and{" "}
          <span className="font-bold text-on-surface">{data.destination.name}</span> on this date.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Filters and Sorting Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* View Tabs */}
        <div className="inline-flex p-1 rounded-2xl bg-surface-container-low border border-surface-container-high/60 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            All Routes ({directCount + connectingCount})
          </button>
          {directCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("direct")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "direct"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Direct ({directCount})
            </button>
          )}
          {connectingCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("connecting")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "connecting"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Connecting ({connectingCount})
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          <span className="hidden sm:inline">Sort:</span>
          <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-surface-container-high">
            <button
              type="button"
              onClick={() => setSortBy("duration")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === "duration" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant"
              }`}
            >
              Fastest
            </button>
            <button
              type="button"
              onClick={() => setSortBy("transfers")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === "transfers" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant"
              }`}
            >
              Fewest Stops
            </button>
          </div>
        </div>
      </div>

      {/* Routes List */}
      <div className="flex flex-col gap-4">
        {routesToDisplay.map((route) => (
          <JourneyRouteCard key={route.id} route={route} />
        ))}
      </div>
    </div>
  );
}
