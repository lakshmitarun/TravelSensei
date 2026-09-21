"use client";

import React, { useState } from "react";
import { FlightItinerary, FlightLeg } from "@/lib/flights/types";

interface FlightCardProps {
  itinerary: FlightItinerary;
  className?: string;
}

function formatMinutesToHours(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "--";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatTimeString(isoString: string): string {
  if (!isoString) return "--:--";
  try {
    // If it contains "T", extract time and optional date
    if (isoString.includes("T")) {
      const parts = isoString.split("T");
      const timePart = parts[1].slice(0, 5); // HH:MM
      return timePart;
    }
    return isoString.slice(0, 5);
  } catch {
    return isoString;
  }
}

function formatDateString(isoString: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString.includes("T") ? isoString : `${isoString}T00:00:00`);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatCurrency(amount: number, currency: string = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function LegView({ leg, label }: { leg: FlightLeg; label: string }) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const hasMultipleSegments = leg.segments.length > 1;

  return (
    <div className="flex flex-col gap-3 py-3 border-t border-surface-container-high/60 first:border-t-0 first:pt-0">
      {/* Leg Direction Indicator */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">
            {label === "Outbound" ? "flight_takeoff" : "flight_land"}
          </span>
          <span>{label}</span>
          <span className="text-on-surface-variant/60 font-normal">
            • {formatDateString(leg.departureTime)}
          </span>
        </span>

        {leg.carrier && (
          <span className="text-xs font-semibold text-on-surface">
            {leg.carrier}
          </span>
        )}
      </div>

      {/* Main Schedule Row */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* Departure */}
        <div className="col-span-3 sm:col-span-3 flex flex-col">
          <span className="text-lg sm:text-2xl font-extrabold text-on-surface tracking-tight">
            {formatTimeString(leg.departureTime)}
          </span>
          <span className="font-mono text-xs sm:text-sm font-bold text-primary">
            {leg.origin}
          </span>
        </div>

        {/* Flight Line / Stops / Duration */}
        <div className="col-span-6 sm:col-span-6 flex flex-col items-center gap-1">
          <span className="text-[11px] text-on-surface-variant font-medium">
            {formatMinutesToHours(leg.durationMinutes)}
          </span>

          <div className="w-full flex items-center gap-1">
            <div className="h-0.5 w-full bg-surface-container-high rounded-full relative flex items-center justify-center">
              {leg.stops === 0 ? (
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              ) : (
                <div className="flex items-center gap-1">
                  {Array.from({ length: leg.stops }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-surface-container-lowest"
                      title={`${leg.stops} stop(s)`}
                    ></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <span
            className={`text-[11px] font-bold ${
              leg.stops === 0 ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {leg.stops === 0 ? "Non-stop" : `${leg.stops} stop${leg.stops > 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Arrival */}
        <div className="col-span-3 sm:col-span-3 flex flex-col items-end text-right">
          <span className="text-lg sm:text-2xl font-extrabold text-on-surface tracking-tight">
            {formatTimeString(leg.arrivalTime)}
          </span>
          <span className="font-mono text-xs sm:text-sm font-bold text-primary">
            {leg.destination}
          </span>
        </div>
      </div>

      {/* Segment Breakdown toggle if multiple segments */}
      {hasMultipleSegments && (
        <div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isExpanded ? "Hide layover details" : "View layover details"}</span>
            <span className="material-symbols-outlined text-[14px]">
              {isExpanded ? "expand_less" : "expand_more"}
            </span>
          </button>

          {isExpanded && (
            <div className="mt-3 p-3.5 rounded-2xl bg-surface-container-low/70 border border-surface-container-high/60 flex flex-col gap-3 animate-in fade-in duration-200">
              {leg.segments.map((seg, idx) => (
                <div key={idx} className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between font-semibold text-on-surface">
                    <span>
                      {seg.operatingCarrierName || seg.marketingCarrierCode || "Flight"}{" "}
                      {seg.flightNumber && <span className="text-on-surface-variant font-mono">({seg.flightNumber})</span>}
                    </span>
                    <span className="text-on-surface-variant">{formatMinutesToHours(seg.durationMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span>
                      {seg.departureAirport} ({formatTimeString(seg.departureTimeLocal)}) → {seg.arrivalAirport} (
                      {formatTimeString(seg.arrivalTimeLocal)})
                    </span>
                    {seg.aircraft && <span className="italic">{seg.aircraft}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FlightCard({ itinerary, className = "" }: FlightCardProps) {
  const { price, outbound, inbound, cabinClass, requiresSelfTransfer, bags } = itinerary;

  return (
    <div
      className={`bg-surface-container-lowest rounded-3xl p-5 sm:p-7 shadow-md hover:shadow-xl border border-surface-container-high/70 transition-all flex flex-col justify-between gap-5 ${className}`}
    >
      {/* 1. TOP BADGES & PRICE */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-surface-container-high">
        {/* Left Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {cabinClass && (
            <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface text-xs font-semibold capitalize">
              {cabinClass.replace("_", " ")}
            </span>
          )}

          {requiresSelfTransfer && (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Self-Transfer
            </span>
          )}

          {bags && (bags.carryOn !== null || bags.checked !== null) && (
            <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-[11px] font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">luggage</span>
              {bags.carryOn ? `${bags.carryOn} carry-on` : ""}
              {bags.carryOn && bags.checked ? " • " : ""}
              {bags.checked ? `${bags.checked} checked` : ""}
            </span>
          )}
        </div>

        {/* Right Price Display */}
        <div className="flex flex-col items-end text-right">
          <span className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            {formatCurrency(price.amount, price.currency)}
          </span>
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                price.status === "verified" ? "bg-emerald-500" : "bg-amber-400"
              }`}
            ></span>
            <span>{price.status === "verified" ? "Live Verified Fare" : "Estimated Fare"}</span>
          </span>
        </div>
      </div>

      {/* 2. LEGS SECTION */}
      <div className="flex flex-col gap-4">
        <LegView leg={outbound} label="Outbound" />
        {inbound && <LegView leg={inbound} label="Inbound" />}
      </div>

      {/* 3. FOOTER INFO */}
      <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-between text-xs text-on-surface-variant">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
          <span>Live search result via Ignav Flight Engine</span>
        </span>
        <span className="text-[11px] font-mono text-on-surface-variant/70">
          ID: {itinerary.id.slice(0, 10)}
        </span>
      </div>
    </div>
  );
}
