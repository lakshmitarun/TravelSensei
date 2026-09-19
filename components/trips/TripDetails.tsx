"use client";

import React from "react";
import Link from "next/link";
import { Destination } from "@/lib/recommendations/types";
import { TripItem } from "./TripCard";
import ItineraryDay, { ItineraryItem } from "./ItineraryDay";
import { format, parseISO } from "date-fns";

interface TripDetailsProps {
  trip: TripItem;
  itineraries: ItineraryItem[];
  destination?: Destination;
}

export default function TripDetails({ trip, itineraries, destination }: TripDetailsProps) {
  const destName = destination?.name || "Destination";
  const destLocation = destination?.state_country || "Verified Location";

  let formattedDate = trip.travel_date;
  try {
    if (trip.travel_date) {
      formattedDate = format(parseISO(trip.travel_date), "dd MMMM yyyy");
    }
  } catch {
    formattedDate = trip.travel_date;
  }

  // Ensure itineraries are sorted by day_number ascending
  const sortedItineraries = [...itineraries].sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/my-trips"
          className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to My Trips</span>
        </Link>

        <Link
          href="/#planner"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <span>Plan Another Trip</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      {/* 1. HERO TRIP HEADER CARD */}
      <div className="bg-gradient-to-br from-primary via-primary-container to-teal-800 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {trip.status || "Planned Trip"}
            </span>

            <span className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-semibold capitalize">
              {trip.travel_style || "Personalized Style"}
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {destName}
            </h1>
            <p className="text-white/85 text-sm sm:text-base flex items-center gap-1.5 pt-1.5">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              {destLocation}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Travel Date
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block">
                {formattedDate}
              </span>
            </div>

            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Planned Duration
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block">
                {sortedItineraries.length} {sortedItineraries.length === 1 ? "Day" : "Days"}
              </span>
            </div>

            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Target Budget
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block">
                ₹{trip.budget ? trip.budget.toLocaleString("en-IN") : "0"}
              </span>
            </div>

            <div>
              <span className="text-white/65 block text-[11px] uppercase tracking-wider font-bold">
                Itinerary Status
              </span>
              <span className="font-bold text-white text-sm sm:text-base pt-0.5 block capitalize">
                {trip.status || "Ready"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ITINERARY DAYS TIMELINE */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[26px]">calendar_today</span>
            <h2 className="font-headline-md text-2xl sm:text-3xl font-extrabold text-on-surface">
              Your Itinerary
            </h2>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            Sequential day timeline
          </span>
        </div>

        {sortedItineraries.length > 0 ? (
          <div className="flex flex-col gap-6">
            {sortedItineraries.map((itinerary) => (
              <ItineraryDay key={itinerary.id || itinerary.day_number} itinerary={itinerary} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-3xl p-10 text-center shadow-md border border-surface-container-high/50 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]">event_busy</span>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">
              No itinerary days recorded yet
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
              This trip was created without daily itinerary details. You can generate a full AI itinerary using the planner.
            </p>
            <Link
              href="/#planner"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md transition-all mt-2"
            >
              Generate Itinerary
            </Link>
          </div>
        )}
      </div>

      {/* 3. FOOTER NAVIGATION */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-surface-container-low rounded-2xl border border-surface-container-high/50">
        <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
          <span>Verified saved trip from your TravelSensei account.</span>
        </span>

        <div className="flex items-center gap-3">
          <Link
            href="/my-trips"
            className="px-4 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest hover:bg-surface-container text-xs font-bold text-on-surface transition-colors"
          >
            All Trips
          </Link>
          <Link
            href="/#planner"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm transition-all"
          >
            Plan Another Trip
          </Link>
        </div>
      </div>
    </div>
  );
}
