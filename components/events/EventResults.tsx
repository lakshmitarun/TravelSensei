"use client";

import React from "react";
import { EventItem } from "@/lib/events/types";
import EventCard from "./EventCard";

export interface EventResultsProps {
  events: EventItem[] | null;
  destinationName?: string;
  isLoading?: boolean;
  error?: string | null;
  hasSearched?: boolean;
  onRetry?: () => void;
  onSelectEvent?: (event: EventItem) => void;
  className?: string;
}

export default function EventResults({
  events,
  destinationName,
  isLoading = false,
  error = null,
  hasSearched = false,
  onRetry,
  onSelectEvent,
  className = "",
}: EventResultsProps) {
  // 1. Loading State with Skeletons
  if (isLoading) {
    return (
      <div
        id="events-loading-state"
        role="status"
        aria-live="polite"
        className={`flex flex-col gap-6 ${className}`}
      >
        <div className="flex items-center gap-2 px-1">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
          <p className="text-xs font-bold text-on-surface-variant animate-pulse">
            Discovering upcoming events{destinationName ? ` for ${destinationName}` : ""}...
          </p>
        </div>

        {/* Skeleton Grid */}
        <div
          id="events-skeleton-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`event-skeleton-${idx}`}
              className="rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 overflow-hidden shadow-xs flex flex-col justify-between animate-pulse"
            >
              <div className="w-full h-40 sm:h-44 bg-surface-container-high/50" />
              <div className="p-4 sm:p-5 flex flex-col gap-3">
                <div className="h-5 w-3/4 rounded-md bg-surface-container-high" />
                <div className="h-3.5 w-1/2 rounded-md bg-surface-container-high/70" />
                <div className="h-3.5 w-2/3 rounded-md bg-surface-container-high/60" />
              </div>
              <div className="p-4 sm:p-5 pt-0 border-t border-surface-container-high/40 flex justify-between items-center">
                <div className="h-4 w-20 rounded bg-surface-container-high/60" />
                <div className="h-4 w-14 rounded bg-surface-container-high/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        id="events-error-state"
        role="alert"
        className={`p-6 sm:p-8 rounded-3xl bg-rose-50/70 border border-rose-200/80 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">error</span>
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-rose-900">Unable to load events</h4>
            <p className="text-xs text-rose-700 max-w-md leading-relaxed">{error}</p>
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            id="btn-retry-events"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  // If not searched yet or null, don't render empty results
  if (!hasSearched || events === null) {
    return null;
  }

  // 3. Provider Empty State (Provider Coverage Empty State)
  if (events.length === 0) {
    return (
      <div
        id="events-empty-state"
        className={`p-8 sm:p-12 rounded-3xl bg-surface-container-low border border-surface-container-high/60 text-center flex flex-col items-center gap-4 animate-in fade-in duration-200 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant/70 flex items-center justify-center shadow-xs">
          <span className="material-symbols-outlined text-[32px]">event_busy</span>
        </div>
        <div className="flex flex-col gap-1 max-w-md">
          <h4 className="text-base font-bold text-on-surface">
            No events currently available from our event provider for this destination.
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Event coverage varies by location. Try another category or check back later.
          </p>
        </div>

        {onRetry && (
          <button
            type="button"
            id="btn-refresh-events-empty"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl border border-surface-container-high hover:bg-surface-container text-on-surface text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh Events</span>
          </button>
        )}
      </div>
    );
  }

  // 4. Successful Event Grid
  return (
    <div
      id="events-results-container"
      className={`flex flex-col gap-5 ${className}`}
    >
      {/* Header bar with count and provider tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            confirmation_number
          </span>
          <h4 className="font-headline-sm text-sm font-bold text-on-surface tracking-tight">
            Found {events.length} {events.length === 1 ? "upcoming event" : "upcoming events"}
            {destinationName ? ` in ${destinationName}` : ""}
          </h4>
        </div>

        <span className="text-[11px] font-medium text-on-surface-variant">
          Live events from StungEvents
        </span>
      </div>

      {/* Responsive Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
      <div
        id="events-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onSelect={onSelectEvent}
          />
        ))}
      </div>
    </div>
  );
}
