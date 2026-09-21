"use client";

import React from "react";
import { DirectionsSummary, RouteProfile } from "@/lib/maps/types";

interface RouteSummaryProps {
  summary: DirectionsSummary;
  profile: RouteProfile;
  className?: string;
}

const PROFILE_CONFIG: Record<
  RouteProfile,
  { label: string; icon: string; badgeClass: string }
> = {
  "driving-car": {
    label: "Driving",
    icon: "directions_car",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  "cycling-regular": {
    label: "Cycling",
    icon: "directions_bike",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "foot-walking": {
    label: "Walking",
    icon: "directions_walk",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
};

export function formatDistance(meters: number, km?: number): string {
  const calculatedKm = km !== undefined ? km : meters / 1000;
  if (calculatedKm < 1) {
    return `${Math.round(meters)} m`;
  }
  return `${calculatedKm.toFixed(2)} km`;
}

export function formatDuration(seconds: number, minutes?: number): string {
  const calculatedMins = minutes !== undefined ? minutes : seconds / 60;
  if (calculatedMins < 60) {
    return `${Math.round(calculatedMins)} min`;
  }
  const hours = Math.floor(calculatedMins / 60);
  const remainingMins = Math.round(calculatedMins % 60);
  if (remainingMins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMins} min`;
}

export default function RouteSummary({ summary, profile, className = "" }: RouteSummaryProps) {
  const config = PROFILE_CONFIG[profile] || PROFILE_CONFIG["driving-car"];

  const distanceText = formatDistance(summary.distanceMeters, summary.distanceKm);
  const durationText = formatDuration(summary.durationSeconds, summary.durationMinutes);

  return (
    <div
      id="route-summary-card"
      className={`p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs flex flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px]">{config.icon}</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Travel Mode
            </span>
            <span
              className={`px-2 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${config.badgeClass}`}
            >
              <span>{config.label}</span>
            </span>
          </div>
          <span className="text-xs text-on-surface-variant/80">
            Real-time OpenRouteService path calculation
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-surface-container-high/40 w-full sm:w-auto justify-between sm:justify-end">
        {/* Distance Metric */}
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            Distance
          </span>
          <span
            id="route-summary-distance"
            className="text-lg sm:text-xl font-extrabold text-on-surface tracking-tight"
          >
            {distanceText}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-surface-container-high hidden sm:block"></div>

        {/* Duration Metric */}
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            Est. Time
          </span>
          <span
            id="route-summary-duration"
            className="text-lg sm:text-xl font-extrabold text-primary tracking-tight"
          >
            {durationText}
          </span>
        </div>
      </div>
    </div>
  );
}
