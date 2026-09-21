"use client";

import React from "react";
import Link from "next/link";
import { Destination } from "@/lib/recommendations/types";
import { format, parseISO } from "date-fns";

export interface TripItem {
  id: string;
  user_id: string;
  destination_id: string;
  travel_date: string;
  budget: number;
  travel_style: string;
  status: string;
  created_at: string;
}

interface TripCardProps {
  trip: TripItem;
  destination?: Destination;
  onDeleteClick?: (trip: TripItem) => void;
  isDeleting?: boolean;
}

export default function TripCard({ trip, destination, onDeleteClick, isDeleting }: TripCardProps) {
  const destName = destination?.name || "Travel Destination";
  const destLocation = destination?.state_country || "Confirmed Location";

  // Safe date formatting
  let formattedTravelDate = trip.travel_date;
  try {
    if (trip.travel_date) {
      formattedTravelDate = format(parseISO(trip.travel_date), "dd MMM yyyy");
    }
  } catch {
    formattedTravelDate = trip.travel_date;
  }

  const isPlanned = trip.status?.toLowerCase() === "planned";

  return (
    <div className="group bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-md hover:shadow-2xl transition-all duration-300 border border-surface-container-high/50 flex flex-col justify-between gap-6 relative overflow-hidden">
      {/* Background Accent Highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>

      <div className="flex flex-col gap-4 relative z-10">
        {/* Top Status & Style Badge Row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
              isPlanned
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPlanned ? "bg-emerald-500 animate-pulse" : "bg-on-surface-variant"}`}></span>
            {trip.status || "Planned"}
          </span>

          <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold capitalize border border-surface-container-high/60">
            {trip.travel_style || "Personalized"}
          </span>
        </div>

        {/* Destination Information */}
        <div className="flex flex-col gap-1">
          <h3 className="font-headline-md text-xl sm:text-2xl font-extrabold text-on-surface group-hover:text-primary transition-colors">
            {destName}
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
            {destLocation}
          </p>
        </div>

        {/* Quick Details Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-container-high/40 text-xs">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant/80 font-bold">
              Travel Date
            </span>
            <span className="font-bold text-on-surface text-sm pt-0.5">
              {formattedTravelDate}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant/80 font-bold">
              Budget
            </span>
            <span className="font-bold text-primary text-sm pt-0.5">
              ₹{trip.budget ? trip.budget.toLocaleString("en-IN") : "0"}
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-3 border-t border-surface-container-high/40 flex items-center justify-between gap-3 relative z-10">
        {onDeleteClick ? (
          <button
            type="button"
            onClick={() => onDeleteClick(trip)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 dark:border-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
            title="Delete Trip"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>Delete</span>
          </button>
        ) : (
          <span className="text-[11px] text-on-surface-variant/70 font-medium">
            Saved Itinerary
          </span>
        )}

        <Link
          href={`/my-trips/${trip.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm hover:shadow-md transition-all group-hover:translate-x-0.5 cursor-pointer ml-auto"
        >
          <span>View Trip</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
