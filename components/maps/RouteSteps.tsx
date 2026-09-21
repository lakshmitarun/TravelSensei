"use client";

import React, { useState } from "react";
import { DirectionsStep } from "@/lib/maps/types";
import { formatDistance, formatDuration } from "./RouteSummary";

interface RouteStepsProps {
  steps?: DirectionsStep[];
  className?: string;
}

function getManeuverIcon(type?: number, instruction?: string): string {
  const text = (instruction || "").toLowerCase();
  if (text.includes("roundabout")) return "roundabout_right";
  if (text.includes("u-turn")) return "u_turn_left";
  if (text.includes("destination") || text.includes("arrive")) return "flag";
  if (text.includes("depart") || text.includes("head")) return "north";

  switch (type) {
    case 0:
      return "turn_left";
    case 1:
      return "turn_right";
    case 2:
      return "turn_sharp_left";
    case 3:
      return "turn_sharp_right";
    case 4:
      return "turn_slight_left";
    case 5:
      return "turn_slight_right";
    case 6:
      return "straight";
    case 7:
    case 8:
      return "roundabout_right";
    case 9:
      return "u_turn_left";
    case 10:
      return "flag";
    case 11:
      return "north";
    case 12:
      return "fork_left";
    case 13:
      return "fork_right";
    default:
      return "navigation";
  }
}

export default function RouteSteps({ steps, className = "" }: RouteStepsProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  return (
    <div
      id="route-steps-container"
      className={`rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 overflow-hidden shadow-xs ${className}`}
    >
      {/* Header with Collapsible Toggle */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[20px] text-primary">alt_route</span>
          <h4 className="font-headline-sm text-sm sm:text-base font-extrabold text-on-surface">
            Turn-by-Turn Navigation Steps
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {steps.length}
          </span>
        </div>

        <button
          type="button"
          aria-expanded={isExpanded}
          className="text-xs font-bold text-on-surface-variant flex items-center gap-1 hover:text-primary transition-colors"
        >
          <span>{isExpanded ? "Hide Steps" : "Show Steps"}</span>
          <span className="material-symbols-outlined text-[18px]">
            {isExpanded ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {/* Steps List */}
      {isExpanded && (
        <div className="border-t border-surface-container-high/50 divide-y divide-surface-container-high/40 max-h-96 overflow-y-auto">
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const distanceStr = formatDistance(step.distanceMeters);
            const durationStr = formatDuration(step.durationSeconds);
            const iconName = getManeuverIcon(step.type, step.instruction);

            return (
              <div
                key={idx}
                className="p-3.5 sm:p-4 flex items-start gap-3 hover:bg-surface-container-low/30 transition-colors"
              >
                {/* Step Number Badge with Maneuver Icon */}
                <div className="w-8 h-8 rounded-xl bg-surface-container-high/70 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                </div>

                {/* Instruction and Details */}
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-on-surface-variant/70">
                      {stepNum}.
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-on-surface leading-snug">
                      {step.instruction}
                    </p>
                  </div>

                  {step.name && (
                    <span className="text-[11px] text-on-surface-variant/80 pl-5 font-medium">
                      onto <span className="font-semibold text-on-surface">{step.name}</span>
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 pl-5 text-[11px] text-on-surface-variant">
                    <span>{distanceStr}</span>
                    <span>•</span>
                    <span>{durationStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
