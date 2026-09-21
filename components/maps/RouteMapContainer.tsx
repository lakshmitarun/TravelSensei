"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapCoordinate, RouteProfile, DirectionsResult } from "@/lib/maps/types";
import RouteSummary from "./RouteSummary";
import RouteSteps from "./RouteSteps";

// Dynamically import RouteMap with SSR disabled to strictly prevent "window is not defined"
const DynamicRouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 sm:h-96 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center gap-3 animate-pulse border border-surface-container-high/50">
      <div className="w-9 h-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-on-surface-variant">Loading Route Map...</span>
    </div>
  ),
});

export interface RouteMapContainerProps {
  origin: MapCoordinate;
  destination: MapCoordinate;
  originLabel?: string;
  destinationLabel?: string;
  initialProfile?: RouteProfile;
  className?: string;
}

const PROFILES: Array<{ id: RouteProfile; label: string; icon: string }> = [
  { id: "driving-car", label: "Driving", icon: "directions_car" },
  { id: "cycling-regular", label: "Cycling", icon: "directions_bike" },
  { id: "foot-walking", label: "Walking", icon: "directions_walk" },
];

export default function RouteMapContainer({
  origin,
  destination,
  originLabel = "Origin",
  destinationLabel = "Destination",
  initialProfile = "driving-car",
  className = "",
}: RouteMapContainerProps) {
  const [profile, setProfile] = useState<RouteProfile>(initialProfile);
  const [routeData, setRouteData] = useState<DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDirections = useCallback(
    async (selectedProfile: RouteProfile) => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set("originLat", String(origin.latitude));
        queryParams.set("originLng", String(origin.longitude));
        queryParams.set("destinationLat", String(destination.latitude));
        queryParams.set("destinationLng", String(destination.longitude));
        queryParams.set("profile", selectedProfile);

        const res = await fetch(`/api/maps/directions?${queryParams.toString()}`);
        const json = await res.json().catch(() => ({}));

        if (res.ok && json.success && json.data) {
          setRouteData(json.data);
        } else {
          setRouteData(null);
          if (res.status === 401) {
            setError("Please sign in to view route directions.");
          } else {
            setError(json.message || "Route could not be calculated. Please try again.");
          }
        }
      } catch {
        setRouteData(null);
        setError("Network error communicating with directions service. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [origin.latitude, origin.longitude, destination.latitude, destination.longitude]
  );

  useEffect(() => {
    fetchDirections(profile);
  }, [profile, fetchDirections]);

  const primaryRoute = routeData?.routes?.[0];

  return (
    <div
      id="route-planner-container"
      className={`bg-surface-container-low rounded-3xl p-5 sm:p-7 border border-surface-container-high/60 shadow-sm flex flex-col gap-5 ${className}`}
    >
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">map</span>
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
              Route Planner & Directions
            </h3>
            <p className="text-xs text-on-surface-variant">
              Live OpenRouteService road routing between trip waypoints.
            </p>
          </div>
        </div>

        {/* Profile Selector Buttons (Driving, Cycling, Walking) */}
        <div
          id="route-profile-selector"
          className="inline-flex p-1 rounded-2xl bg-surface-container-lowest border border-surface-container-high/70 gap-1.5 self-start sm:self-auto shadow-xs"
        >
          {PROFILES.map((p) => {
            const isActive = profile === p.id;
            return (
              <button
                key={p.id}
                type="button"
                id={`btn-profile-${p.id}`}
                onClick={() => setProfile(p.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Overlay / Placeholder */}
      {isLoading && (
        <div
          id="route-loading-indicator"
          className="p-4 rounded-2xl bg-surface-container-lowest/80 border border-primary/20 flex items-center justify-center gap-3 text-xs font-semibold text-primary animate-pulse"
        >
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Calculating optimal {profile.replace("-", " ")} route...</span>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && !isLoading && (
        <div
          id="route-error-state"
          className="p-5 rounded-2xl bg-surface-container-lowest border border-rose-200 text-center flex flex-col items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">error</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-bold text-on-surface">Route Calculation Unavailable</h4>
            <p className="text-xs text-on-surface-variant max-w-md">{error}</p>
          </div>
          <button
            type="button"
            id="btn-retry-route"
            onClick={() => fetchDirections(profile)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Directions</span>
          </button>
        </div>
      )}

      {/* Active Route Content */}
      {primaryRoute && !error && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          {/* Summary Metric Card */}
          <RouteSummary summary={primaryRoute.summary} profile={profile} />

          {/* Leaflet Interactive Route Map */}
          <DynamicRouteMap
            origin={origin}
            destination={destination}
            geometry={primaryRoute.geometry}
            originLabel={originLabel}
            destinationLabel={destinationLabel}
          />

          {/* Turn-by-Turn Navigation Steps */}
          <RouteSteps steps={primaryRoute.steps} />
        </div>
      )}
    </div>
  );
}
