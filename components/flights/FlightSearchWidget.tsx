"use client";

import React, { useState, useEffect } from "react";
import { Airport, CabinClass, FlightSearchRequest } from "@/lib/flights/types";
import AirportSelector from "./AirportSelector";
import { Button } from "@/components/ui/button";

interface FlightSearchWidgetProps {
  initialOrigin?: Airport | null;
  initialDestination?: Airport | null;
  initialDepartureDate?: string;
  initialReturnDate?: string;
  onSearch: (params: FlightSearchRequest) => void;
  isLoading?: boolean;
  className?: string;
}

const CABIN_OPTIONS: { label: string; value: CabinClass }[] = [
  { label: "Economy", value: "economy" },
  { label: "Prem. Economy", value: "premium_economy" },
  { label: "Business", value: "business" },
  { label: "First Class", value: "first" },
];

const STOPS_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Any Stops", value: null },
  { label: "Direct Only (0 stops)", value: 0 },
  { label: "Max 1 Stop", value: 1 },
  { label: "Max 2 Stops", value: 2 },
];

export default function FlightSearchWidget({
  initialOrigin = null,
  initialDestination = null,
  initialDepartureDate,
  initialReturnDate,
  onSearch,
  isLoading = false,
  className = "",
}: FlightSearchWidgetProps) {
  // Form State
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const [origin, setOrigin] = useState<Airport | null>(initialOrigin);
  const [destination, setDestination] = useState<Airport | null>(initialDestination);

  // Compute default departure date (tomorrow or initial)
  const [departureDate, setDepartureDate] = useState<string>(() => {
    if (initialDepartureDate) return initialDepartureDate;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    return tomorrow.toISOString().split("T")[0];
  });

  const [returnDate, setReturnDate] = useState<string>(() => {
    if (initialReturnDate) return initialReturnDate;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 14);
    return nextWeek.toISOString().split("T")[0];
  });

  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [maxStops, setMaxStops] = useState<number | null>(null);
  const [allowSelfTransfer, setAllowSelfTransfer] = useState<boolean>(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync initial props
  useEffect(() => {
    if (initialOrigin) setOrigin(initialOrigin);
  }, [initialOrigin]);

  useEffect(() => {
    if (initialDestination) setDestination(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    if (initialDepartureDate) setDepartureDate(initialDepartureDate);
  }, [initialDepartureDate]);

  useEffect(() => {
    if (initialReturnDate) {
      setReturnDate(initialReturnDate);
      setTripType("round-trip");
    }
  }, [initialReturnDate]);

  // Today's date string for min date constraints
  const todayStr = new Date().toISOString().split("T")[0];

  const handleSwapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!origin) {
      newErrors.origin = "Please select a departure airport.";
    }

    if (!destination) {
      newErrors.destination = "Please select an arrival airport.";
    }

    if (origin && destination && origin.code === destination.code) {
      newErrors.destination = "Departure and arrival airports must be different.";
    }

    if (!departureDate) {
      newErrors.departureDate = "Please select a departure date.";
    } else if (departureDate < todayStr) {
      newErrors.departureDate = "Departure date cannot be in the past.";
    }

    if (tripType === "round-trip") {
      if (!returnDate) {
        newErrors.returnDate = "Please select a return date.";
      } else if (returnDate < departureDate) {
        newErrors.returnDate = "Return date must be on or after departure date.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    onSearch({
      origin: origin!.code,
      destination: destination!.code,
      departure_date: departureDate,
      return_date: tripType === "round-trip" ? returnDate : null,
      adults,
      children,
      cabin_class: cabinClass,
      max_stops: maxStops,
      market: "IN",
      allow_self_transfer: allowSelfTransfer,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-xl border border-surface-container-high/60 flex flex-col gap-6 ${className}`}
    >
      {/* 1. TOP CONTROLS: TRIP TYPE & CABIN */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-container-high">
        {/* Trip Type Tabs */}
        <div className="inline-flex rounded-xl bg-surface-container-low p-1 border border-surface-container-high/60">
          <button
            type="button"
            onClick={() => setTripType("one-way")}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tripType === "one-way"
                ? "bg-primary text-white shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            One-Way
          </button>
          <button
            type="button"
            onClick={() => setTripType("round-trip")}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tripType === "round-trip"
                ? "bg-primary text-white shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Round-Trip
          </button>
        </div>

        {/* Cabin & Passenger Quick Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={cabinClass}
            onChange={(e) => setCabinClass(e.target.value as CabinClass)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface text-xs font-semibold outline-none cursor-pointer hover:border-primary transition-colors"
          >
            {CABIN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={maxStops ?? "any"}
            onChange={(e) => setMaxStops(e.target.value === "any" ? null : parseInt(e.target.value, 10))}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface text-xs font-semibold outline-none cursor-pointer hover:border-primary transition-colors"
          >
            {STOPS_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? "any"}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. AIRPORT SELECTION ROW (ORIGIN & DESTINATION) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5">
          <AirportSelector
            id="flight-origin"
            label="From"
            placeholder="Origin Airport / City..."
            value={origin}
            onChange={(val) => {
              setOrigin(val);
              if (errors.origin) {
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.origin;
                  return copy;
                });
              }
            }}
            error={errors.origin}
            disabled={isLoading}
            required
          />
        </div>

        {/* Swap Button */}
        <div className="md:col-span-2 flex justify-center pt-2 md:pt-4">
          <button
            type="button"
            onClick={handleSwapAirports}
            disabled={isLoading || (!origin && !destination)}
            className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container border border-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            title="Swap Origin and Destination"
          >
            <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
          </button>
        </div>

        <div className="md:col-span-5">
          <AirportSelector
            id="flight-destination"
            label="To"
            placeholder="Destination Airport / City..."
            value={destination}
            onChange={(val) => {
              setDestination(val);
              if (errors.destination) {
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.destination;
                  return copy;
                });
              }
            }}
            error={errors.destination}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* 3. DATES & PASSENGERS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Departure Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="flight-departure-date" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Departure Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              id="flight-departure-date"
              type="date"
              value={departureDate}
              min={todayStr}
              onChange={(e) => {
                setDepartureDate(e.target.value);
                if (errors.departureDate) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.departureDate;
                    return copy;
                  });
                }
              }}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs sm:text-sm font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            />
          </div>
          {errors.departureDate && (
            <p className="text-[11px] text-rose-600 font-medium">{errors.departureDate}</p>
          )}
        </div>

        {/* Return Date (if Round-trip) */}
        {tripType === "round-trip" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="flight-return-date" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Return Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="flight-return-date"
                type="date"
                value={returnDate}
                min={departureDate || todayStr}
                onChange={(e) => {
                  setReturnDate(e.target.value);
                  if (errors.returnDate) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.returnDate;
                      return copy;
                    });
                  }
                }}
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs sm:text-sm font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              />
            </div>
            {errors.returnDate && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.returnDate}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 opacity-50 pointer-events-none">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Return Date
            </label>
            <div className="px-3.5 py-2.5 rounded-xl border border-dashed border-surface-container-high bg-surface-container-low text-xs sm:text-sm text-on-surface-variant">
              One-way flight selected
            </div>
          </div>
        )}

        {/* Passengers */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Travelers
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="flight-adults" className="text-[10px] text-on-surface-variant block font-medium">
                Adults (12+)
              </label>
              <select
                id="flight-adults"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value, 10))}
                disabled={isLoading}
                className="w-full px-2 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="flight-children" className="text-[10px] text-on-surface-variant block font-medium">
                Children (2-11)
              </label>
              <select
                id="flight-children"
                value={children}
                onChange={(e) => setChildren(parseInt(e.target.value, 10))}
                disabled={isLoading}
                className="w-full px-2 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Search Button */}
        <div className="flex flex-col justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 h-auto rounded-xl bg-primary hover:bg-primary-container text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Searching Flights...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Search Live Flights</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 4. EXTRA OPTIONS / TOGGLE */}
      <div className="flex items-center gap-2 pt-1 text-xs text-on-surface-variant">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allowSelfTransfer}
            onChange={(e) => setAllowSelfTransfer(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-surface-container-high text-primary focus:ring-primary cursor-pointer"
          />
          <span>Include flights requiring self-transfer between airlines</span>
        </label>
      </div>
    </form>
  );
}
