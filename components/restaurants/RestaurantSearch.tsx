"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { RestaurantItem, RestaurantsResponseData } from "@/lib/restaurants/types";
import RestaurantResults from "./RestaurantResults";
import RestaurantDetailModal from "./RestaurantDetailModal";
import RouteMapContainer from "@/components/maps/RouteMapContainer";
import { MapCoordinate } from "@/lib/maps/types";

export interface RestaurantSearchProps {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
  className?: string;
}

type LocationSource = "destination" | "near_me";

const RADIUS_OPTIONS = [
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 3000, label: "3 km (Default)" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
];

function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export default function RestaurantSearch({
  latitude,
  longitude,
  locationName,
  className = "",
}: RestaurantSearchProps) {
  // Location source: "destination" (default) or "near_me" (explicit user click)
  const [locationSource, setLocationSource] = useState<LocationSource>("destination");

  // User live coordinates: kept in-memory ONLY. Never stored in DB or localStorage.
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isAcquiringLocation, setIsAcquiringLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Restaurant search state
  const [restaurants, setRestaurants] = useState<RestaurantItem[] | null>(null);
  const [radius, setRadius] = useState<number>(3000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal & Directions state
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItem | null>(null);
  const [directionsRestaurant, setDirectionsRestaurant] = useState<RestaurantItem | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const hasDestinationCoords = isValidCoordinate(latitude, longitude);
  const hasUserCoords = userLocation !== null && isValidCoordinate(userLocation.latitude, userLocation.longitude);

  /**
   * Fetch restaurants from server API using explicit coordinates.
   * Directly uses the supplied lat/lng to prevent state closure race conditions.
   */
  const fetchRestaurantsForCoords = useCallback(
    async (lat: number, lng: number, targetRadius: number, signal?: AbortSignal) => {
      if (!isValidCoordinate(lat, lng)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set("latitude", String(lat));
        queryParams.set("longitude", String(lng));
        queryParams.set("radius", String(targetRadius));
        queryParams.set("limit", "24");

        const res = await fetch(`/api/restaurants?${queryParams.toString()}`, { signal });
        const json = await res.json().catch(() => ({}));

        if (res.ok && json.success && json.data) {
          const data = json.data as RestaurantsResponseData;
          setRestaurants(data.restaurants || []);
        } else {
          setRestaurants([]);
          if (res.status === 401) {
            setError("Please sign in to view nearby restaurants.");
          } else {
            setError(
              json.error?.message ||
              json.message ||
              "Nearby restaurant service is temporarily unavailable."
            );
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setRestaurants([]);
        setError("Nearby restaurant service is temporarily unavailable.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Request live browser location via Geolocation API only on explicit user gesture.
   * Immediately clears stale results and upon receiving coordinates, directly fetches restaurants.
   */
  const requestUserLocationAndFetch = useCallback(
    (targetRadius: number) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setLocationError("Geolocation is not supported by your browser.");
        setRestaurants(null);
        setIsLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsAcquiringLocation(true);
      setLocationError(null);
      setRestaurants(null);
      setError(null);
      setDirectionsRestaurant(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsAcquiringLocation(false);
          setLocationError(null);
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);

          // Immediately fetch using the real browser GPS coordinates
          const controller = new AbortController();
          abortControllerRef.current = controller;
          fetchRestaurantsForCoords(coords.latitude, coords.longitude, targetRadius, controller.signal);
        },
        (geoError) => {
          setIsAcquiringLocation(false);
          // CRITICAL: NEVER display old results as if they were Near Me results
          setRestaurants(null);
          if (geoError.code === geoError.PERMISSION_DENIED) {
            setLocationError(
              "Location permission is required to find restaurants near you."
            );
          } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
            setLocationError("Location information is currently unavailable. Please try again.");
          } else if (geoError.code === geoError.TIMEOUT) {
            setLocationError("Location request timed out. Please try again.");
          } else {
            setLocationError("Location permission is required to find restaurants near you.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // CRITICAL: Never use stale cached coordinates
        }
      );
    },
    [fetchRestaurantsForCoords]
  );

  /**
   * Switch to Near Me: explicitly trigger geolocation prompt and clear stale results
   */
  const handleSelectNearMe = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Stale-data prevention: immediately clear previous results and errors
    setLocationSource("near_me");
    setRestaurants(null);
    setError(null);
    setDirectionsRestaurant(null);

    if (userLocation && isValidCoordinate(userLocation.latitude, userLocation.longitude)) {
      setLocationError(null);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      fetchRestaurantsForCoords(userLocation.latitude, userLocation.longitude, radius, controller.signal);
    } else {
      requestUserLocationAndFetch(radius);
    }
  };

  /**
   * Switch to Destination: clear stale results and load destination restaurants
   */
  const handleSelectDestination = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Stale-data prevention: immediately clear previous results and errors
    setLocationSource("destination");
    setLocationError(null);
    setRestaurants(null);
    setError(null);
    setDirectionsRestaurant(null);

    if (isValidCoordinate(latitude, longitude)) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      fetchRestaurantsForCoords(latitude!, longitude!, radius, controller.signal);
    }
  };

  // Initial load for Destination (runs on mount or when destination coords change)
  useEffect(() => {
    if (locationSource === "destination" && isValidCoordinate(latitude, longitude)) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      fetchRestaurantsForCoords(latitude!, longitude!, radius, controller.signal);

      return () => {
        controller.abort();
      };
    }
  }, [locationSource, latitude, longitude, radius, fetchRestaurantsForCoords]);

  /**
   * Expand / change search radius
   */
  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (locationSource === "near_me") {
      if (userLocation && isValidCoordinate(userLocation.latitude, userLocation.longitude)) {
        fetchRestaurantsForCoords(userLocation.latitude, userLocation.longitude, newRadius, controller.signal);
      }
    } else {
      if (isValidCoordinate(latitude, longitude)) {
        fetchRestaurantsForCoords(latitude!, longitude!, newRadius, controller.signal);
      }
    }
  };

  const handleExpandRadius = () => {
    const currentIndex = RADIUS_OPTIONS.findIndex((opt) => opt.value === radius);
    const nextRadius =
      currentIndex !== -1 && currentIndex < RADIUS_OPTIONS.length - 1
        ? RADIUS_OPTIONS[currentIndex + 1].value
        : 10000;
    handleRadiusChange(nextRadius);
  };

  /**
   * Refresh restaurants for current mode
   */
  const handleRefresh = () => {
    if (locationSource === "near_me") {
      if (userLocation && isValidCoordinate(userLocation.latitude, userLocation.longitude)) {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        fetchRestaurantsForCoords(userLocation.latitude, userLocation.longitude, radius, controller.signal);
      } else {
        requestUserLocationAndFetch(radius);
      }
    } else {
      if (isValidCoordinate(latitude, longitude)) {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        fetchRestaurantsForCoords(latitude!, longitude!, radius, controller.signal);
      }
    }
  };

  /**
   * Handle directions calculation
   */
  const handleOpenDirections = (restaurant: RestaurantItem) => {
    setDirectionsRestaurant(restaurant);
  };

  // Compute Origin coordinate for directions - strictly isolated per mode
  const directionsOrigin: MapCoordinate | null =
    locationSource === "near_me"
      ? userLocation && isValidCoordinate(userLocation.latitude, userLocation.longitude)
        ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
        : null
      : hasDestinationCoords && latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined
      ? { latitude, longitude }
      : null;

  const directionsOriginLabel =
    locationSource === "near_me"
      ? "Your Location"
      : locationName || "Destination Center";

  // Label heading according to source
  const headingTitle =
    locationSource === "near_me"
      ? "Restaurants Near You"
      : locationName
      ? `Restaurants Near ${locationName}`
      : "Nearby Restaurants";

  const headingSubtitle =
    locationSource === "near_me"
      ? "Restaurants near your current location"
      : locationName
      ? `Restaurants near ${locationName}`
      : "Discover local dining places";

  return (
    <div
      id="restaurant-search-panel"
      className={`bg-surface-container-low rounded-3xl p-5 sm:p-7 border border-surface-container-high/60 shadow-xs flex flex-col gap-6 ${className}`}
      role="region"
      aria-label={headingTitle}
    >
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-container-high/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">lunch_dining</span>
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
              {headingTitle}
            </h3>
            <p className="text-xs text-on-surface-variant">{headingSubtitle}</p>
          </div>
        </div>

        {/* Controls: Source Selector (Near Me / Destination) + Radius + Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Location Source Selector: [ 📍 Near Me ] [ 🧳 Near Destination ] */}
          <div
            id="restaurant-source-selector"
            className="inline-flex p-1 rounded-2xl bg-surface-container-lowest border border-surface-container-high/70 gap-1 shadow-xs"
          >
            <button
              type="button"
              id="btn-source-destination"
              onClick={handleSelectDestination}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                locationSource === "destination"
                  ? "bg-primary text-white shadow-xs"
                  : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">location_city</span>
              <span>Near Destination</span>
            </button>

            <button
              type="button"
              id="btn-source-near-me"
              onClick={handleSelectNearMe}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                locationSource === "near_me"
                  ? "bg-primary text-white shadow-xs"
                  : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">my_location</span>
              <span>Near Me</span>
            </button>
          </div>

          {/* Radius Selector */}
          <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-surface-container-high/70 rounded-xl px-2.5 py-1.5 shadow-xs">
            <span className="material-symbols-outlined text-primary text-[16px]">radar</span>
            <label htmlFor="select-restaurant-radius" className="text-xs font-bold text-on-surface-variant pr-1">
              Radius:
            </label>
            <select
              id="select-restaurant-radius"
              value={radius}
              disabled={isLoading || isAcquiringLocation}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
              aria-label="Filter radius for restaurants"
            >
              {RADIUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            id="btn-refresh-restaurants"
            onClick={handleRefresh}
            disabled={isLoading || isAcquiringLocation}
            className="p-2 rounded-xl bg-surface-container-lowest border border-surface-container-high/70 hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh restaurants"
            aria-label="Refresh restaurant results"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isLoading || isAcquiringLocation ? "animate-spin text-primary" : ""
              }`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Location Acquisition Spinner for "Near Me" */}
      {isAcquiringLocation && (
        <div
          id="location-acquiring-state"
          className="p-8 rounded-2xl bg-surface-container-lowest/80 border border-primary/20 flex flex-col items-center justify-center gap-3 text-xs font-semibold text-primary animate-pulse"
        >
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Accessing your location via browser...</span>
        </div>
      )}

      {/* Location Permission / Availability Error Banner for "Near Me" */}
      {locationSource === "near_me" && locationError && !isAcquiringLocation && (
        <div
          id="location-permission-error"
          className="p-6 rounded-2xl bg-surface-container-lowest border border-amber-300 dark:border-amber-800 text-center flex flex-col items-center gap-3 animate-in fade-in duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">location_disabled</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-bold text-on-surface">Location Access Required</h4>
            <p className="text-xs text-on-surface-variant max-w-md">{locationError}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-retry-location"
              onClick={() => requestUserLocationAndFetch(radius)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              <span>Try Again</span>
            </button>
            <button
              type="button"
              id="btn-switch-to-destination"
              onClick={handleSelectDestination}
              className="px-4 py-2 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              View Destination Restaurants
            </button>
          </div>
        </div>
      )}

      {/* Missing Destination Coordinates Banner */}
      {locationSource === "destination" && !hasDestinationCoords && (
        <div
          id="restaurant-search-empty"
          className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high/60 flex items-center gap-3.5 text-on-surface-variant"
        >
          <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-on-surface-variant/70">
            <span className="material-symbols-outlined text-[22px]">location_off</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Destination Coordinates Unavailable
            </h4>
            <p className="text-xs text-on-surface-variant">
              Coordinates for this trip destination are unavailable. Try using &quot;Near Me&quot; to find restaurants near your current location.
            </p>
          </div>
        </div>
      )}

      {/* Directions View (Integrated RouteMapContainer) */}
      {directionsRestaurant && directionsOrigin && (
        <div id="restaurant-directions-view" className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-2xl border border-surface-container-high/70 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
              <span className="text-primary font-bold">{directionsOriginLabel}</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{directionsRestaurant.name}</span>
            </div>
            <button
              type="button"
              id="btn-close-restaurant-directions"
              onClick={() => setDirectionsRestaurant(null)}
              className="px-3 py-1.5 rounded-xl bg-surface-container border border-surface-container-high/60 hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Restaurants</span>
            </button>
          </div>

          <RouteMapContainer
            origin={directionsOrigin}
            destination={{
              latitude: directionsRestaurant.latitude,
              longitude: directionsRestaurant.longitude,
            }}
            originLabel={directionsOriginLabel}
            destinationLabel={directionsRestaurant.name}
            initialProfile="driving-car"
          />
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {isLoading && !directionsRestaurant && (
        <div
          id="restaurants-loading-indicator"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          aria-busy="true"
          aria-label="Loading restaurant listings"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-low rounded-2xl border border-surface-container-high/50 p-0 overflow-hidden animate-pulse flex flex-col gap-3"
            >
              <div className="w-full h-36 bg-surface-container-high/60" />
              <div className="p-4 flex flex-col gap-2.5">
                <div className="h-5 bg-surface-container-high/70 rounded-md w-3/4" />
                <div className="h-3.5 bg-surface-container-high/50 rounded-md w-1/2" />
                <div className="h-3 bg-surface-container-high/40 rounded-md w-full" />
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-8 bg-surface-container-high/50 rounded-xl flex-1" />
                  <div className="h-8 bg-surface-container-high/50 rounded-xl flex-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clean Error State with Retry */}
      {error && !isLoading && !directionsRestaurant && (
        <div
          id="restaurants-error-state"
          className="p-6 rounded-2xl bg-surface-container-lowest border border-rose-200/80 text-center flex flex-col items-center gap-3 animate-in fade-in duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">restaurant</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-bold text-on-surface">Nearby restaurant service is temporarily unavailable.</h4>
            <p className="text-xs text-on-surface-variant max-w-md">{error}</p>
          </div>
          <button
            type="button"
            id="btn-retry-restaurants"
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            aria-label="Retry loading nearby restaurants"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loaded Results (hidden when in directions view, loading, or location error) */}
      {!isLoading && !isAcquiringLocation && !error && !(locationSource === "near_me" && locationError) && !directionsRestaurant && restaurants !== null && (
        <RestaurantResults
          restaurants={restaurants}
          radiusMeters={radius}
          onExpandRadius={handleExpandRadius}
          onViewDetails={(restaurant) => setSelectedRestaurant(restaurant)}
          onGetDirections={handleOpenDirections}
        />
      )}

      {/* Restaurant Detail Modal */}
      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
        onGetDirections={handleOpenDirections}
      />

      {/* Footer Attribution & Privacy Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant/80 pt-2 border-t border-surface-container-high/30">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">info</span>
          <span>Restaurant data © OpenStreetMap contributors via Overpass API</span>
        </span>
        <span className="text-[10px] font-mono text-on-surface-variant/60">
          {locationSource === "near_me"
            ? hasUserCoords
              ? "Live browser location (Private & unpersisted)"
              : "Location not shared"
            : hasDestinationCoords
            ? `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`
            : "No coordinates"}
        </span>
      </div>
    </div>
  );
}
