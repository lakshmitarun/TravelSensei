"use client";

import React, { useState } from "react";
import { JourneyRoute } from "@/lib/routing/types";
import { formatMinutesToDuration } from "@/lib/routing/validator";
import RouteSegmentCard from "./RouteSegmentCard";
import TransferBadge from "./TransferBadge";

interface JourneyRouteCardProps {
  route: JourneyRoute;
  className?: string;
}

export default function JourneyRouteCard({ route, className = "" }: JourneyRouteCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(!route.isDirect);

  const totalDurFormatted = formatMinutesToDuration(route.totalDurationMinutes);
  const totalWaitFormatted = formatMinutesToDuration(route.totalWaitingMinutes);

  // Station summary breadcrumb (e.g. HYD -> NGP -> NDLS)
  const stationCodes = [
    route.origin.code,
    ...route.transfers.map((t) => t.location.code),
    route.destination.code,
  ];

  const primaryMode = route.transportModes[0] || "train";

  return (
    <div
      className={`bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl border border-surface-container-high/60 transition-all flex flex-col gap-4 ${className}`}
    >
      {/* 1. Header Overview Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-high/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">
              {primaryMode === "train" ? "train" : "flight"}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-on-surface">
                {stationCodes.join(" → ")}
              </span>
              {route.isDirect ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/20">
                  Direct Route
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-500/15 text-teal-700 border border-teal-500/20">
                  {route.numberOfTransfers} {route.numberOfTransfers === 1 ? "Transfer" : "Transfers"}
                </span>
              )}
            </div>

            <span className="text-[11px] text-on-surface-variant">
              {route.origin.name} to {route.destination.name}
            </span>
          </div>
        </div>

        {/* Duration and Toggle Button */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-right">
            <span className="text-base sm:text-lg font-extrabold text-on-surface">
              {totalDurFormatted}
            </span>
            {!route.isDirect && route.totalWaitingMinutes > 0 && (
              <span className="text-[10px] text-on-surface-variant font-medium">
                includes {totalWaitFormatted} layover
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl border border-surface-container-high hover:bg-surface-container text-on-surface-variant cursor-pointer transition-colors"
            title={isExpanded ? "Collapse route details" : "Expand route details"}
            aria-label="Toggle route legs breakdown"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isExpanded ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Segments & Transfer Timeline (When expanded) */}
      {isExpanded && (
        <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-200">
          {route.segments.map((seg, idx) => {
            const correspondingTransfer = route.transfers[idx];

            return (
              <React.Fragment key={seg.id}>
                <RouteSegmentCard
                  segment={seg}
                  legNumber={idx + 1}
                  totalLegs={route.segments.length}
                />
                {correspondingTransfer && (
                  <TransferBadge transfer={correspondingTransfer} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
