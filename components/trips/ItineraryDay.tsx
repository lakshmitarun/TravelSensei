"use client";

import React from "react";
import TripPhoto from "./TripPhoto";

export interface ActivityItem {
  time?: string;
  activity?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  schedule_data?: {
    title?: string;
    activities?: ActivityItem[];
    [key: string]: unknown;
  } | null;
  created_at?: string;
}

interface ItineraryDayProps {
  itinerary: ItineraryItem;
  destinationName?: string;
}

export default function ItineraryDay({ itinerary, destinationName = "" }: ItineraryDayProps) {
  const schedule = itinerary.schedule_data || {};
  const title = schedule.title || `Day ${itinerary.day_number} Itinerary`;
  const activities: ActivityItem[] = Array.isArray(schedule.activities) ? schedule.activities : [];

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-surface-container-high/50 flex flex-col gap-5">
      {/* Day Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container-high/40">
        <div className="flex items-center gap-3.5">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white font-extrabold text-sm flex items-center justify-center shadow-md">
            D{itinerary.day_number}
          </span>
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
              Day {itinerary.day_number}
            </span>
            <h4 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
              {title}
            </h4>
          </div>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-medium border border-surface-container-high/40 w-fit">
          {activities.length} {activities.length === 1 ? "Activity" : "Activities"}
        </span>
      </div>

      {/* Activity Cards Grid */}
      {activities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {activities.map((act, idx) => {
            const timeSlot = act.time || "Scheduled";
            const actTitle = act.activity || "Explore";
            const actDesc = act.description || "";

            return (
              <div
                key={idx}
                className="bg-surface-container-low/70 rounded-2xl overflow-hidden flex flex-col border border-surface-container-high/40 hover:bg-surface-container-low transition-colors"
              >
                {/* Activity Top Photo */}
                <div className="h-32 sm:h-36 w-full relative">
                  <TripPhoto
                    type="activity"
                    activityTitle={actTitle}
                    destination={destinationName}
                  />
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold uppercase tracking-wide">
                      {timeSlot}
                    </span>
                  </div>
                  <h5 className="font-bold text-sm sm:text-base text-on-surface">
                    {actTitle}
                  </h5>
                  {actDesc && (
                    <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                      {actDesc}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-surface-container-low text-xs text-on-surface-variant italic">
          Flexible exploration time scheduled for this day.
        </div>
      )}
    </div>
  );
}
