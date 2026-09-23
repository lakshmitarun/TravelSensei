"use client";

import React from "react";
import { AttractionItem } from "@/lib/attractions/types";
import AttractionCard from "./AttractionCard";

export interface AttractionResultsProps {
  attractions: AttractionItem[] | null;
  radiusMeters: number;
  isLoading?: boolean;
  error?: string | null;
  hasSearched?: boolean;
  onExpandRadius?: () => void;
  onSelectAttraction?: (attraction: AttractionItem, photoUrl?: string | null) => void;
  className?: string;
}

export default function AttractionResults({
  attractions,
  radiusMeters,
  isLoading = false,
  error = null,
  hasSearched = false,
  onExpandRadius,
  onSelectAttraction,
  className = "",
}: AttractionResultsProps) {
  const radiusKm = radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(0)} km` : `${radiusMeters} m`;

  // 1. Loading State
  if (isLoading) {
    return (
      <div
        id="attractions-loading-state"
        role="status"
        aria-live="polite"
        className={`p-8 sm:p-12 rounded-3xl bg-surface-container-low border border-surface-container-high/60 flex flex-col items-center justify-center gap-4 text-center animate-in fade-in duration-200 ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-[28px] animate-spin">progress_activity</span>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-bold text-on-surface">Searching nearby attractions...</h4>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Scanning for tourist sights, landmarks, and points of interest within {radiusKm}.
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        id="attractions-error-state"
        role="alert"
        className={`p-6 sm:p-8 rounded-3xl bg-rose-50/70 border border-rose-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left ${className}`}
      >
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[24px]">error</span>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-rose-900">Unable to load attractions</h4>
          <p className="text-xs text-rose-700 max-w-md leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // If user has not clicked search yet, return null (waiting for explicit user search)
  if (!hasSearched || attractions === null) {
    return null;
  }

  // 3. Empty State
  if (attractions.length === 0) {
    return (
      <div
        id="attractions-empty-state"
        className={`p-8 sm:p-10 rounded-3xl bg-surface-container-low border border-surface-container-high/60 text-center flex flex-col items-center gap-4 animate-in fade-in duration-200 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant/70 flex items-center justify-center shadow-xs">
          <span className="material-symbols-outlined text-[32px]">tour_off</span>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-bold text-on-surface">
            No attractions found in this area.
          </h4>
          <p className="text-xs text-on-surface-variant max-w-sm">
            We couldn&apos;t find registered tourist attractions within {radiusKm}. Try expanding your search radius.
          </p>
        </div>

        {onExpandRadius && radiusMeters < 25000 && (
          <button
            type="button"
            id="btn-expand-attractions-radius"
            onClick={onExpandRadius}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span>Expand Search Radius</span>
          </button>
        )}
      </div>
    );
  }

  // 4. Successful Result Grid
  return (
    <div
      id="attractions-results-container"
      className={`flex flex-col gap-4 ${className}`}
    >
      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            attractions
          </span>
          <h4 className="font-headline-sm text-sm font-bold text-on-surface tracking-tight">
            Found {attractions.length} {attractions.length === 1 ? "attraction" : "attractions"} within {radiusKm}
          </h4>
        </div>

        <span className="text-[11px] font-medium text-on-surface-variant">
          Verified places from Geoapify
        </span>
      </div>

      {/* Responsive Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
      <div
        id="attractions-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {attractions.map((attraction) => (
          <AttractionCard
            key={attraction.id}
            attraction={attraction}
            onSelect={onSelectAttraction}
          />
        ))}
      </div>
    </div>
  );
}
