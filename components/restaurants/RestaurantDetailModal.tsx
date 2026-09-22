"use client";

import React, { useEffect } from "react";
import { RestaurantItem } from "@/lib/restaurants/types";

export interface RestaurantDetailModalProps {
  restaurant: RestaurantItem | null;
  onClose: () => void;
  onGetDirections: (restaurant: RestaurantItem) => void;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatCuisine(cuisine: string): string {
  return cuisine
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
    .join(" · ");
}

export default function RestaurantDetailModal({
  restaurant,
  onClose,
  onGetDirections,
}: RestaurantDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!restaurant) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restaurant, onClose]);

  if (!restaurant) return null;

  return (
    <div
      id="restaurant-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restaurant-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-container-low border border-surface-container-high/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Photo or Placeholder Banner */}
        <div className="relative w-full h-48 sm:h-56 bg-surface-container-high/40 overflow-hidden shrink-0">
          {restaurant.photo?.url && restaurant.photo.isExactPlacePhoto ? (
            <img
              src={restaurant.photo.url}
              alt={restaurant.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image load fails, hide image element
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-container-low to-surface-container text-primary">
              <span className="material-symbols-outlined text-5xl">restaurant</span>
              <span className="text-xs font-semibold text-on-surface-variant mt-2">
                {restaurant.cuisine ? formatCuisine(restaurant.cuisine).split("·")[0] : "Dining Place"}
              </span>
              <span className="text-[11px] text-on-surface-variant/60 mt-0.5 font-medium">No photo available</span>
            </div>
          )}

          {/* Photo attribution badge - only for verified OSM place photos */}
          {restaurant.photo?.isExactPlacePhoto && (
            <div className="absolute bottom-2.5 left-3 bg-black/70 backdrop-blur-xs text-[11px] text-white/90 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>Verified place photo (OSM)</span>
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            id="btn-close-restaurant-modal"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3
                id="restaurant-detail-title"
                className="font-headline-sm text-xl sm:text-2xl font-extrabold text-on-surface"
              >
                {restaurant.name}
              </h3>
              <span className="shrink-0 text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">near_me</span>
                <span>{formatDistance(restaurant.distanceMeters)}</span>
              </span>
            </div>

            {/* Cuisine & Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {restaurant.cuisine && (
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">
                  {formatCuisine(restaurant.cuisine)}
                </span>
              )}
              {restaurant.wheelchair === "yes" && (
                <span className="text-xs font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">accessible</span>
                  <span>Wheelchair Accessible</span>
                </span>
              )}
            </div>
          </div>

          {/* Details List */}
          <div className="flex flex-col gap-2.5 text-xs text-on-surface-variant pt-2 border-t border-surface-container-high/40">
            {/* Address */}
            {restaurant.address && (
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                  location_on
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface">Address</span>
                  <span className="text-on-surface-variant">{restaurant.address}</span>
                </div>
              </div>
            )}

            {/* Opening Hours */}
            {restaurant.openingHours && (
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                  schedule
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface">Opening Hours</span>
                  <span className="text-on-surface-variant">{restaurant.openingHours}</span>
                </div>
              </div>
            )}

            {/* Coordinates */}
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                pin_drop
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-on-surface">Coordinates</span>
                <span className="text-on-surface-variant font-mono text-[11px]">
                  {restaurant.latitude.toFixed(5)}, {restaurant.longitude.toFixed(5)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions: Directions + Call (if phone) + Website (if website) */}
          <div className="pt-4 border-t border-surface-container-high/40 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="btn-modal-get-directions"
              onClick={() => {
                onClose();
                onGetDirections(restaurant);
              }}
              className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">directions</span>
              <span>Get Directions</span>
            </button>

            {restaurant.phone && (
              <a
                id="btn-modal-call-restaurant"
                href={`tel:${restaurant.phone.replace(/[^+\d]/g, "")}`}
                className="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/80 hover:bg-surface-container text-on-surface text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title={`Call ${restaurant.phone}`}
              >
                <span className="material-symbols-outlined text-[17px] text-primary">call</span>
                <span>Call</span>
              </a>
            )}

            {restaurant.website && (
              <a
                id="btn-modal-website-restaurant"
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/80 hover:bg-surface-container text-on-surface text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Visit restaurant website"
              >
                <span className="material-symbols-outlined text-[17px] text-primary">public</span>
                <span>Website</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
