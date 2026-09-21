"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { Destination } from "@/lib/recommendations/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export interface SelectedDestinationData {
  id?: string;
  name: string;
  state_country?: string | null;
  latitude?: number;
  longitude?: number;
  description?: string | null;
}

export interface PlannerFormData {
  destination_id?: string;
  destination: string | SelectedDestinationData;
  destination_name: string;
  destination_state_country?: string;
  latitude?: number;
  longitude?: number;
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
  // Destination Search & Selection State: Explicit separation
  // 1. destinationSearchQuery: What user types (search query ONLY, not selected destination)
  const [destinationSearchQuery, setDestinationSearchQuery] = useState<string>("");
  const searchQuery = destinationSearchQuery; // Backwards-compatible alias for existing tests

  // 2. selectedDestination: Complete chosen destination object (starts strictly null)
  const [selectedDestination, setSelectedDestination] = useState<SelectedDestinationData | null>(null);
  const selectedDestId = selectedDestination?.id || ""; // Backwards-compatible alias

  // Dropdown & suggestion states
  const [suggestions, setSuggestions] = useState<SelectedDestinationData[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const destContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form States
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

  // Close suggestions dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (destContainerRef.current && !destContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Open-Meteo Geocoding Autocomplete for Destinations
  useEffect(() => {
    if (selectedDestination && destinationSearchQuery.trim() === selectedDestination.name) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    const trimmed = destinationSearchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setIsDropdownOpen(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocoding/search?q=${encodeURIComponent(trimmed)}&count=5&language=en`,
          { signal: controller.signal }
        );
        const json = await res.json().catch(() => ({}));

        if (res.ok && json.success && Array.isArray(json.data?.results)) {
          const geocoded: SelectedDestinationData[] = json.data.results.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            state_country: [r.admin1, r.country].filter(Boolean).join(", "),
            latitude: r.latitude,
            longitude: r.longitude,
            description: `Location in ${[r.admin1, r.country].filter(Boolean).join(", ") || r.name}`,
          }));

          // Also match database catalog destinations from props if any match the search query
          const catalogMatches: SelectedDestinationData[] = (destinations || [])
            .filter((d) => d.name.toLowerCase().includes(trimmed.toLowerCase()))
            .map((d) => ({
              id: d.id,
              name: d.name,
              state_country: d.state_country,
              latitude: d.latitude,
              longitude: d.longitude,
              description: d.description,
            }));

          // Deduplicate by lowercase name
          const seen = new Set<string>();
          const combined: SelectedDestinationData[] = [];
          for (const item of [...geocoded, ...catalogMatches]) {
            const key = item.name.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              combined.push(item);
            }
          }

          setSuggestions(combined);
          setIsDropdownOpen(true);
        } else {
          setSuggestions([]);
          setIsDropdownOpen(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSearchError("Unable to search destinations.");
        setIsDropdownOpen(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [destinationSearchQuery, selectedDestination, destinations]);

  const filteredDestinations = suggestions; // Backwards-compatible alias for test scripts

  const handleSelectDestination = (dest: SelectedDestinationData) => {
    setSelectedDestination(dest);
    setDestinationSearchQuery(dest.name);
    setIsDropdownOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    if (errors.destination) {
      setErrors((prev) => ({ ...prev, destination: "" }));
    }
  };

  const handleClearDestination = () => {
    setSelectedDestination(null);
    setDestinationSearchQuery("");
    setSuggestions([]);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setSearchError(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestinationSearchQuery(val);
    // User typing is strictly a search query and must NOT automatically become the selected destination!
    if (selectedDestination && val.trim() !== selectedDestination.name) {
      setSelectedDestination(null);
    }
    if (val.trim().length >= 2) {
      setIsDropdownOpen(true);
      setHighlightedIndex(0);
    } else {
      setIsDropdownOpen(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
    }

    if (errors.destination) {
      setErrors((prev) => ({ ...prev, destination: "" }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectDestination(suggestions[highlightedIndex]);
      } else if (suggestions.length === 1) {
        handleSelectDestination(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedDestination || !selectedDestination.name.trim()) {
      newErrors.destination = "Please select a destination from the suggestions.";
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
    if (!validate() || !selectedDestination) return;

    const formattedDate = travelDate ? format(travelDate, "yyyy-MM-dd") : "";

    onSubmit({
      destination_id: selectedDestination.id,
      destination: selectedDestination.name,
      destination_name: selectedDestination.name,
      destination_state_country: selectedDestination.state_country || undefined,
      latitude: selectedDestination.latitude,
      longitude: selectedDestination.longitude,
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

      {/* 1. SINGLE EDITABLE DESTINATION SEARCH INPUT */}
      <div className="flex flex-col gap-2 relative" ref={destContainerRef}>
        <label
          htmlFor="destination-search-input"
          className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1"
        >
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
        ) : (
          <div className="relative w-full">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/70 text-[18px] pointer-events-none">
                search
              </span>
              <input
                ref={inputRef}
                id="destination-search-input"
                type="text"
                autoComplete="off"
                value={destinationSearchQuery}
                onChange={handleInputChange}
                onFocus={() => {
                  if (destinationSearchQuery.trim().length >= 2) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search destination..."
                className={`w-full pl-9 pr-16 py-1.5 h-[40px] bg-surface-container-low border rounded-xl text-on-surface text-xs sm:text-sm font-medium focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-colors ${
                  errors.destination
                    ? "border-red-500 focus:ring-red-500"
                    : "border-surface-container-high/60"
                }`}
                aria-expanded={isDropdownOpen && destinationSearchQuery.trim().length >= 2}
                aria-autocomplete="list"
                aria-controls="destination-suggestions-list"
              />

              <div className="absolute right-2.5 flex items-center gap-1">
                {isSearching && (
                  <div
                    id="destination-loading-spinner"
                    className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"
                    title="Searching destinations..."
                  />
                )}
                {destinationSearchQuery && (
                  <button
                    type="button"
                    onClick={handleClearDestination}
                    className="w-5 h-5 rounded-full bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs transition-colors cursor-pointer"
                    aria-label="Clear destination input"
                    title="Clear destination"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions / Dropdown Menu: only rendered when query >= 2 characters */}
            {isDropdownOpen && destinationSearchQuery.trim().length >= 2 && (
              <div
                id="destination-suggestions-list"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-surface-container-lowest border border-surface-container-high/80 rounded-xl shadow-xl z-50 py-1 divide-y divide-surface-container-high/30"
              >
                {isSearching ? (
                  <div className="px-3 py-2.5 text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    <span>Searching destinations...</span>
                  </div>
                ) : searchError ? (
                  <div className="px-3 py-2.5 text-xs text-rose-600">
                    {searchError}
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((dest, idx) => {
                    const isSelected = selectedDestination?.name === dest.name;
                    const isHighlighted = highlightedIndex === idx;

                    return (
                      <button
                        key={dest.id || `${dest.name}-${idx}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectDestination(dest)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isHighlighted
                            ? "bg-primary/10 text-primary"
                            : isSelected
                            ? "bg-surface-container text-on-surface"
                            : "hover:bg-surface-container-low text-on-surface"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold">
                              {dest.name}
                            </span>
                            {dest.state_country && (
                              <span className="text-[11px] text-on-surface-variant">
                                ({dest.state_country})
                              </span>
                            )}
                          </div>
                          {dest.description && (
                            <span className="text-[10px] text-on-surface-variant/80 line-clamp-1">
                              {dest.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-3 text-center text-xs text-on-surface-variant">
                    No destinations found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirmed Selected Destination State Card */}
        {selectedDestination && (
          <div
            id="confirmed-selected-destination"
            className="p-3 rounded-xl bg-surface-container-low border border-primary/40 flex items-start justify-between gap-3 animate-in fade-in duration-150 mt-1"
          >
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                check_circle
              </span>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                    Selected Destination
                  </span>
                  <span className="text-emerald-600 text-[11px] font-bold">✓ Confirmed</span>
                </div>
                <span className="font-bold text-on-surface block text-sm sm:text-base">
                  {selectedDestination.name}
                </span>
                {selectedDestination.state_country && (
                  <span className="text-xs text-on-surface-variant block font-medium">
                    {selectedDestination.state_country}
                  </span>
                )}
                {typeof selectedDestination.latitude === "number" && typeof selectedDestination.longitude === "number" && (
                  <span className="text-[10px] font-mono text-on-surface-variant/70 block mt-0.5">
                    {selectedDestination.latitude.toFixed(4)}, {selectedDestination.longitude.toFixed(4)}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              id="btn-change-destination"
              onClick={handleClearDestination}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              title="Change destination"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              <span>Change</span>
            </button>
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
        id="btn-generate-travel-plan"
        type="submit"
        disabled={!selectedDestination || isGenerating || isLoadingDestinations}
        title={!selectedDestination ? "Please search and select a destination first" : "Generate Travel Plan"}
        className={`w-full py-2.5 sm:py-2.5 h-[42px] sm:h-[44px] rounded-xl font-headline-sm text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 mt-0.5 ${
          !selectedDestination || isGenerating || isLoadingDestinations
            ? "bg-surface-container-high text-on-surface-variant/60 cursor-not-allowed shadow-none opacity-80"
            : "bg-primary hover:bg-primary-container text-white hover:shadow-xl cursor-pointer"
        }`}
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
