"use client";

import React from "react";
import { JourneySegment } from "@/lib/routing/types";
import { formatMinutesToDuration } from "@/lib/routing/validator";

interface RouteSegmentCardProps {
  segment: JourneySegment;
  legNumber: number;
  totalLegs: number;
  className?: string;
}

export default function RouteSegmentCard({
  segment,
  legNumber,
  totalLegs,
  className = "",
}: RouteSegmentCardProps) {
  const isTrain = segment.mode === "train";
  const isMultiDay = segment.arrivalDay > segment.departureDay;
  const dayDiff = segment.arrivalDay - segment.departureDay;

  return (
    <div
      className={`p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-3 ${className}`}
    >
      {/* Top Header: Leg Tag & Vehicle/Train Info */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-surface-container-high/40">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-md bg-primary/10 text-[11px]">
            Leg {legNumber} of {totalLegs}
          </span>
          <span className="font-extrabold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">
              {isTrain ? "train" : "flight"}
            </span>
            <span>{segment.title || segment.identifier}</span>
          </span>
        </div>

        {segment.type && (
          <span className="text-[11px] text-on-surface-variant font-medium">
            {segment.type}
          </span>
        )}
      </div>

      {/* Main Schedule Row */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* Departure */}
        <div className="col-span-4 flex flex-col">
          <span className="text-lg sm:text-xl font-extrabold text-on-surface tracking-tight">
            {segment.departureTime || "--:--"}
          </span>
          <span className="font-mono text-xs sm:text-sm font-bold text-primary">
            {segment.origin.code}
          </span>
          <span className="text-[11px] text-on-surface-variant truncate" title={segment.origin.name}>
            {segment.origin.name}
          </span>
        </div>

        {/* Travel Line */}
        <div className="col-span-4 flex flex-col items-center gap-1">
          <span className="text-[11px] text-on-surface-variant font-medium">
            {formatMinutesToDuration(segment.durationMinutes)}
          </span>
          <div className="w-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
            <div className="flex-1 h-[1.5px] bg-primary/40 relative">
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 material-symbols-outlined text-primary text-[12px]">
                {isTrain ? "train" : "flight"}
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
            {segment.distanceKm ? <span>{segment.distanceKm} km</span> : null}
            {segment.haltsCount !== undefined ? <span>• {segment.haltsCount} halts</span> : null}
          </div>
        </div>

        {/* Arrival */}
        <div className="col-span-4 flex flex-col items-end text-right">
          <div className="flex items-center gap-1">
            <span className="text-lg sm:text-xl font-extrabold text-on-surface tracking-tight">
              {segment.arrivalTime || "--:--"}
            </span>
            {isMultiDay && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded">
                +{dayDiff}d
              </span>
            )}
          </div>
          <span className="font-mono text-xs sm:text-sm font-bold text-primary">
            {segment.destination.code}
          </span>
          <span className="text-[11px] text-on-surface-variant truncate max-w-full" title={segment.destination.name}>
            {segment.destination.name}
          </span>
        </div>
      </div>
    </div>
  );
}
