"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Destination } from "@/lib/recommendations/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export interface PlannerFormData {
  destination_id: string;
  travel_date: string;
  duration: number;
  budget: number;
  travel_style: string;
  season: string;
}

interface TravelPlannerFormProps {
  destinations: Destination[];
  isLoadingDestinations: boolean;
  destinationsError: string | null;
  isAuthenticated: boolean;
  isGenerating: boolean;
  apiError: string | null;
  onSubmit: (data: PlannerFormData) => void;
}

const TRAVEL_STYLES = [
  "Cultural",
  "Adventure",
  "Relaxation",
  "Nature",
  "Heritage",
  "Luxury",
  "Budget",
];

const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

export default function TravelPlannerForm({
  destinations,
  isLoadingDestinations,
  destinationsError,
  isAuthenticated,
  isGenerating,
  apiError,
  onSubmit,
}: TravelPlannerFormProps) {
  // Form States
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [travelDate, setTravelDate] = useState<Date | undefined>(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  });
  const [duration, setDuration] = useState<number>(5);
  const [budget, setBudget] = useState<number>(30000);
  const [travelStyle, setTravelStyle] = useState<string>("Cultural");
  const [season, setSeason] = useState<string>("Spring");

  // Client validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-select first destination when loaded
  React.useEffect(() => {
    if (destinations.length > 0 && !selectedDestId) {
      setSelectedDestId(destinations[0].id);
    }
  }, [destinations, selectedDestId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedDestId || !selectedDestId.trim()) {
      newErrors.destination = "Please select a destination.";
    }

    const today = new Date(new Date().setHours(0, 0, 0, 0));
    if (!travelDate) {
      newErrors.travelDate = "Please select a travel date.";
    } else if (travelDate < today) {
      newErrors.travelDate = "Travel date cannot be in the past.";
    }

    if (!duration || duration < 1 || duration > 14) {
      newErrors.duration = "Duration must be between 1 and 14 days.";
    }

    if (!budget || budget < 5000 || budget > 1000000) {
      newErrors.budget = "Budget must be at least ₹5,000.";
    }

    if (!travelStyle) {
      newErrors.travelStyle = "Please select a travel style.";
    }

    if (!season) {
      newErrors.season = "Please select a season.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formattedDate = travelDate ? format(travelDate, "yyyy-MM-dd") : "";

    onSubmit({
      destination_id: selectedDestId,
      travel_date: formattedDate,
      duration,
      budget,
      travel_style: travelStyle.toLowerCase(),
      season: season.toLowerCase(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-2.5 sm:gap-3 border border-white/50"
    >
      <div className="flex items-center justify-between border-b border-surface-container-high/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="font-label-md text-xs sm:text-sm text-on-surface font-bold tracking-wider uppercase">
            AI Travel Architect
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold">
          Stage 5 Ready
        </span>
      </div>

      {/* Unauthenticated Alert Banner */}
      {!isAuthenticated && (
        <div className="py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-900 text-[11px] leading-tight">
          <span className="material-symbols-outlined text-amber-600 text-[16px] shrink-0">info</span>
          <span>
            <strong className="font-semibold">Authentication Notice:</strong> Please sign in to generate and save your personalized itinerary.
          </span>
        </div>
      )}

      {/* 1. DESTINATION SELECTOR */}
      <div className="flex flex-col gap-1">
        <label htmlFor="destination-select" className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
          Where do you want to go?
        </label>

        {isLoadingDestinations ? (
          <div className="p-2 bg-surface-container-low rounded-lg text-xs text-on-surface-variant flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            Loading curated destinations catalog...
          </div>
        ) : destinationsError ? (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            {destinationsError}
          </div>
        ) : destinations.length === 0 ? (
          <div className="p-2 bg-surface-container-low rounded-lg text-xs text-on-surface-variant italic">
            No destinations are currently available.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <select
              id="destination-select"
              value={selectedDestId}
              onChange={(e) => {
                setSelectedDestId(e.target.value);
                if (errors.destination) setErrors((prev) => ({ ...prev, destination: "" }));
              }}
              className="w-full px-3 py-1.5 h-[38px] bg-surface-container-low border border-surface-container-high/60 rounded-lg text-on-surface text-xs sm:text-sm font-medium focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
            >
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.state_country ? `(${d.state_country})` : ""}
                </option>
              ))}
            </select>

            {/* Quick Destination Pills */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mr-0.5">
                Quick:
              </span>
              {destinations.slice(0, 5).map((d) => {
                const isSelected = selectedDestId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDestId(d.id);
                      if (errors.destination) setErrors((prev) => ({ ...prev, destination: "" }));
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-all font-medium ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-xs scale-105"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {errors.destination && (
          <p className="text-red-600 text-[11px] font-semibold">{errors.destination}</p>
        )}
      </div>

      {/* 2. DATES & DURATION ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {/* Travel Date */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[16px]">calendar_month</span>
            Travel Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-full text-left px-3 py-1.5 h-[38px] bg-surface-container-low border border-surface-container-high/60 hover:bg-surface-container rounded-lg text-on-surface text-xs sm:text-sm font-medium focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-xs flex items-center justify-between transition-colors ${
                  errors.travelDate ? "border-red-500" : ""
                }`}
              >
                <span>{travelDate ? format(travelDate, "MMM dd, yyyy") : "Select travel date"}</span>
                <span className="material-symbols-outlined text-primary text-[16px]">calendar_today</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-surface-container-high bg-surface-container-lowest shadow-2xl rounded-2xl" align="start">
              <Calendar
                mode="single"
                selected={travelDate}
                onSelect={(d) => {
                  setTravelDate(d);
                  if (errors.travelDate) setErrors((prev) => ({ ...prev, travelDate: "" }));
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
          {errors.travelDate && (
            <p className="text-red-600 text-[11px] font-semibold">{errors.travelDate}</p>
          )}
        </div>

        {/* Duration Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-[16px]">schedule</span>
              Duration
            </label>
            <span className="text-xs sm:text-sm font-extrabold text-primary">
              {duration} {duration === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="bg-surface-container-low/70 px-3 py-1.5 rounded-lg border border-surface-container-high/60 flex flex-col gap-1 justify-center">
            <Slider
              value={[duration]}
              onValueChange={(val) => setDuration(val[0])}
              min={1}
              max={14}
              step={1}
              className="my-0"
            />
            <div className="flex justify-between text-[10px] text-on-surface-variant font-medium leading-none">
              <span>1D</span>
              <span>7D (Week)</span>
              <span>14D</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BUDGET SLIDER */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[16px]">payments</span>
            Estimated Budget
          </label>
          <span className="text-xs sm:text-sm font-extrabold text-primary">
            ₹{budget.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="bg-surface-container-low/70 px-3 py-1.5 rounded-lg border border-surface-container-high/60 flex flex-col gap-1 justify-center">
          <Slider
            value={[budget]}
            onValueChange={(val) => setBudget(val[0])}
            min={5000}
            max={150000}
            step={2500}
            className="my-0"
          />
          <div className="flex justify-between text-[10px] text-on-surface-variant font-medium leading-none">
            <span>₹5k (Backpacker)</span>
            <span>₹50k (Comfort)</span>
            <span>₹1.5L+ (Luxury)</span>
          </div>
        </div>
      </div>

      {/* 4. TRAVEL STYLE & SEASON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {/* Travel Style */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[16px]">travel_explore</span>
            Travel Style
          </label>
          <div className="flex flex-wrap gap-1">
            {TRAVEL_STYLES.map((style) => {
              const isSelected = travelStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => setTravelStyle(style)}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition-all font-medium ${
                    isSelected
                      ? "bg-primary text-white font-bold shadow-xs scale-105"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        {/* Season */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[16px]">wb_sunny</span>
            Target Season
          </label>
          <div className="flex flex-wrap gap-1">
            {SEASONS.map((s) => {
              const isSelected = season === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeason(s)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md transition-all font-medium ${
                    isSelected
                      ? "bg-primary text-white font-bold shadow-xs scale-105"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* API Error Box */}
      {apiError && (
        <div className="py-1.5 px-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-1.5 text-rose-900 text-[11px] font-semibold">
          <span className="material-symbols-outlined text-rose-600 text-[16px] shrink-0">error</span>
          <span>{apiError}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isGenerating || isLoadingDestinations}
        className="w-full py-2.5 sm:py-2.5 h-[42px] sm:h-[44px] rounded-xl bg-primary hover:bg-primary-container text-white font-headline-sm text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-0.5"
      >
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Designing Your Trip...</span>
          </div>
        ) : (
          <>
            <span>Generate Personalized Trip</span>
            <span className="text-base">✨</span>
          </>
        )}
      </Button>
    </form>
  );
}
