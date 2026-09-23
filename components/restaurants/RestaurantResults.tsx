"use client";

import React from "react";
import { RestaurantItem } from "@/lib/restaurants/types";
import RestaurantCard from "./RestaurantCard";

export interface RestaurantResultsProps {
  restaurants: RestaurantItem[];
  radiusMeters?: number;
  onExpandRadius?: () => void;
  onViewDetails?: (restaurant: RestaurantItem, photoUrl?: string | null) => void;
  onGetDirections?: (restaurant: RestaurantItem) => void;
  className?: string;
}

export default function RestaurantResults({
  restaurants,
  radiusMeters = 3000,
  onExpandRadius,
  onViewDetails,
  onGetDirections,
  className = "",
}: RestaurantResultsProps) {
  const radiusKm = radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(0)} km` : `${radiusMeters} m`;

  if (!restaurants || restaurants.length === 0) {
    return (
      <div
        id="restaurants-empty-state"
        className="p-8 sm:p-10 rounded-2xl bg-surface-container-low border border-surface-container-high/60 text-center flex flex-col items-center gap-4 animate-in fade-in duration-200"
      >
        <div className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant/70 flex items-center justify-center shadow-xs">
          <span className="material-symbols-outlined text-[32px]">no_meals</span>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-bold text-on-surface">
            No restaurants found within {radiusKm}.
          </h4>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Try expanding your search radius to discover places slightly further away.
          </p>
        </div>

        {onExpandRadius && radiusMeters < 10000 && (
          <button
            type="button"
            id="btn-expand-radius"
            onClick={onExpandRadius}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span>Expand Search Radius</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      id="restaurant-results-container"
      className={`flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            restaurant_menu
          </span>
          <h4 className="font-headline-sm text-sm font-bold text-on-surface tracking-tight">
            Found {restaurants.length} {restaurants.length === 1 ? "restaurant" : "restaurants"} within {radiusKm}
          </h4>
        </div>
        <span className="text-[11px] font-medium text-on-surface-variant">
          Sorted by distance
        </span>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onViewDetails={onViewDetails}
            onGetDirections={onGetDirections}
          />
        ))}
      </div>
    </div>
  );
}
