"use client";

import React, { useState, useCallback } from "react";
import { AttractionItem, AttractionsApiResponse } from "@/lib/attractions/types";
import AttractionResults from "./AttractionResults";
import AttractionDetailModal from "./AttractionDetailModal";

export interface AttractionSearchProps {
  latitude?: number | null;
  longitude?: number | null;
  destinationName?: string;
  stateCountry?: string;
  destinationType?: string;
  travelStyles?: string[] | string;
  activities?: string[] | string;
  description?: string;
  className?: string;
}

interface RadiusOption {
  label: string;
  value: number; // meters
}

const RADIUS_OPTIONS: RadiusOption[] = [
  { label: "1 km", value: 1000 },
  { label: "3 km", value: 3000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "25 km", value: 25000 },
];

const DEFAULT_RADIUS_METERS = 5000;
const DEFAULT_LIMIT = 20;

export default function AttractionSearch({
  latitude,
  longitude,
  destinationName = "this destination",
  stateCountry,
  destinationType,
  travelStyles,
  activities,
  description,
  className = "",
}: AttractionSearchProps) {
  // Local state tracking
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_METERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attractions, setAttractions] = useState<AttractionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionItem | null>(null);
  const [selectedAttractionPhotoUrl, setSelectedAttractionPhotoUrl] = useState<string | null>(null);

  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const handleSearch = useCallback(
    async (targetRadius: number = radius) => {
      if (isLoading) return;

      if (!hasCoordinates) {
        setError("Destination coordinates are required to discover nearby attractions.");
        setHasSearched(true);
        return;
      }

      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const queryParams = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          radius: String(targetRadius),
          limit: String(DEFAULT_LIMIT),
        });

        if (destinationName && destinationName !== "this destination") {
          queryParams.set("destinationName", destinationName);
        }
        if (stateCountry) {
          queryParams.set("stateCountry", stateCountry);
        }
        if (destinationType) {
          queryParams.set("destinationType", destinationType);
        }
        if (travelStyles) {
          queryParams.set(
            "travelStyles",
            Array.isArray(travelStyles) ? travelStyles.join(",") : travelStyles
          );
        }
        if (activities) {
          queryParams.set(
            "activities",
            Array.isArray(activities) ? activities.join(",") : activities
          );
        }
        if (description) {
          queryParams.set("description", description);
        }

        // Call ONLY the TravelSensei internal backend route
        const res = await fetch(`/api/attractions?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        let json: AttractionsApiResponse;
        try {
          json = await res.json();
        } catch {
          throw new Error("Unable to parse server response.");
        }

        if (res.ok && json.success && json.data) {
          setAttractions(json.data.attractions || []);
        } else {
          setAttractions([]);
          if (res.status === 401) {
            setError("Please sign in to view nearby tourist attractions.");
          } else if (res.status === 400) {
            setError(json.message || "Invalid location or radius parameters.");
          } else if (res.status === 429) {
            setError("Attractions service is temporarily rate limited. Please wait a moment and try again.");
          } else if (res.status === 504) {
            setError("Request timed out while finding attractions. Please try again.");
          } else {
            setError(
              json.message ||
                "Nearby attraction service is temporarily unavailable. Please try again shortly."
            );
          }
        }
      } catch (err: unknown) {
        setAttractions([]);
        if (err instanceof Error && err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          setError("Network error while finding attractions. Please check your connection.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      latitude,
      longitude,
      radius,
      hasCoordinates,
      isLoading,
      destinationName,
      stateCountry,
      destinationType,
      travelStyles,
      activities,
      description,
    ]
  );

  const handleExpandRadius = () => {
    // Pick the next higher radius option
    const currentIndex = RADIUS_OPTIONS.findIndex((opt) => opt.value === radius);
    if (currentIndex >= 0 && currentIndex < RADIUS_OPTIONS.length - 1) {
      const nextRadius = RADIUS_OPTIONS[currentIndex + 1].value;
      setRadius(nextRadius);
      handleSearch(nextRadius);
    }
  };

  return (
    <div
      id="attraction-search-component"
      className={`flex flex-col gap-6 p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs ${className}`}
    >
      {/* Component Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">attractions</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface tracking-tight">
              Top Sights & Attractions
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Discover verified landmarks, cultural monuments, and tourist spots near {destinationName}
            </p>
          </div>
        </div>

        {/* Source Badge */}
        <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold tracking-wide uppercase">
          Powered by Geoapify
        </span>
      </div>

      {/* Search Toolbar Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/40">
        {/* Radius Pill Selector */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="radius-selector-group"
            className="text-xs font-bold text-on-surface-variant"
          >
            Search Radius
          </label>
          <div
            id="radius-selector-group"
            role="group"
            aria-label="Attraction search radius options"
            className="flex flex-wrap items-center gap-1.5"
          >
            {RADIUS_OPTIONS.map((opt) => {
              const isSelected = radius === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  id={`btn-radius-${opt.value}`}
                  onClick={() => setRadius(opt.value)}
                  disabled={isLoading}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Trigger Button */}
        <div className="flex items-end">
          <button
            type="button"
            id="btn-search-attractions"
            onClick={() => handleSearch(radius)}
            disabled={isLoading || !hasCoordinates}
            aria-label={isLoading ? "Searching attractions" : "Search attractions near destination"}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Find Attractions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Container */}
      <AttractionResults
        attractions={attractions}
        radiusMeters={radius}
        isLoading={isLoading}
        error={error}
        hasSearched={hasSearched}
        onExpandRadius={handleExpandRadius}
        onSelectAttraction={(attr, photoUrl) => {
          setSelectedAttraction(attr);
          setSelectedAttractionPhotoUrl(photoUrl ?? null);
        }}
      />

      {/* Attraction Detail Modal */}
      <AttractionDetailModal
        attraction={selectedAttraction}
        isOpen={Boolean(selectedAttraction)}
        photoUrl={selectedAttractionPhotoUrl}
        onClose={() => {
          setSelectedAttraction(null);
          setSelectedAttractionPhotoUrl(null);
        }}
      />
    </div>
  );
}
