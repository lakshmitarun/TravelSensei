"use client";

import React, { useState } from "react";
import { RestaurantItem } from "@/lib/restaurants/types";

export interface RestaurantCardProps {
  restaurant: RestaurantItem;
  onViewDetails?: (restaurant: RestaurantItem) => void;
  onGetDirections?: (restaurant: RestaurantItem) => void;
  className?: string;
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

export function getGoogleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
  originLat?: number,
  originLng?: number
): string {
  if (typeof originLat === "number" && typeof originLng === "number") {
    return (
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}` +
      `&travelmode=driving`
    );
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
}

export default function RestaurantCard({
  restaurant,
  onViewDetails,
  onGetDirections,
  className = "",
}: RestaurantCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const cardElementId = `restaurant-card-${restaurant.id.replace(/[/:]/g, "-")}`;

  const hasPhoto = Boolean(
    restaurant.photo?.url &&
    restaurant.photo?.isExactPlacePhoto &&
    !imageError
  );

  const handleOpenGoogleMaps = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isLocating) return;

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setLocationError(null);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const url =
          `https://www.google.com/maps/dir/?api=1` +
          `&origin=${userLat},${userLng}` +
          `&destination=${restaurant.latitude},${restaurant.longitude}` +
          `&travelmode=driving`;
        window.open(url, "_blank", "noopener,noreferrer");
      },
      (geoError) => {
        setIsLocating(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationError(
            "Location permission is required to get directions from your current location."
          );
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setLocationError("Unable to get your current location. Please try again.");
        } else if (geoError.code === geoError.TIMEOUT) {
          setLocationError("Could not determine your current location. Please try again.");
        } else {
          setLocationError("Unable to get your current location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div
      id={cardElementId}
      className={`bg-surface-container-low rounded-2xl border border-surface-container-high/60 hover:border-primary/40 transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden group ${className}`}
    >
      <div className="flex flex-col">
        {/* Restaurant Photo Header or Clean Fallback Illustration */}
        <div className="relative w-full h-36 sm:h-40 bg-surface-container-high/30 overflow-hidden shrink-0">
          {hasPhoto ? (
            <img
              src={restaurant.photo!.url}
              alt={restaurant.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high/20 text-primary">
              <span className="material-symbols-outlined text-[36px] text-primary/70">restaurant</span>
              <span className="text-[11px] font-semibold text-on-surface-variant/80 mt-1">
                {restaurant.cuisine ? formatCuisine(restaurant.cuisine).split("·")[0] : "Local Dining"}
              </span>
              <span className="text-[10px] text-on-surface-variant/60 font-medium">No photo available</span>
            </div>
          )}

          {/* Photo source / attribution pill - only shown for verified OSM photos */}
          {hasPhoto && restaurant.photo?.isExactPlacePhoto && (
            <span
              className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/90 px-2 py-0.5 rounded"
              title="Verified place photo from OpenStreetMap"
            >
              Verified OSM
            </span>
          )}

          {/* Proximity badge / Google Maps directions quick-action button top-right */}
          <button
            type="button"
            id={`btn-distance-${restaurant.id.replace(/[/:]/g, "-")}`}
            onClick={handleOpenGoogleMaps}
            disabled={isLocating}
            aria-busy={isLocating}
            className={`absolute top-2.5 right-2.5 text-xs font-bold text-white bg-black/65 hover:bg-black/85 backdrop-blur-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs transition-all hover:scale-[1.02] active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
              isLocating ? "cursor-wait opacity-85" : "cursor-pointer"
            }`}
            title={
              isLocating
                ? "Getting your current location..."
                : `Get directions from your current location to ${restaurant.name} in Google Maps (${restaurant.distanceMeters}m away)`
            }
            aria-label={`Get directions to ${restaurant.name}`}
          >
            {isLocating ? (
              <div className="w-3 h-3 rounded-full border-2 border-primary-fixed-dim border-t-transparent animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[13px] text-primary-fixed-dim">near_me</span>
            )}
            <span>{isLocating ? "Locating..." : formatDistance(restaurant.distanceMeters)}</span>
          </button>

          {/* Location Error notification banner */}
          {locationError && (
            <div
              id={`location-error-${restaurant.id.replace(/[/:]/g, "-")}`}
              role="alert"
              className="absolute top-11 right-2.5 z-10 max-w-[240px] bg-rose-950/90 backdrop-blur-xs text-white text-[11px] p-2 rounded-xl shadow-lg border border-rose-600/70 flex items-start gap-1.5 animate-in fade-in duration-200"
            >
              <span className="material-symbols-outlined text-[14px] text-rose-300 shrink-0 mt-0.5">error</span>
              <span className="flex-1 leading-tight">{locationError}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocationError(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer ml-1"
                aria-label="Dismiss location error"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 flex flex-col gap-2.5">
          {/* Restaurant Name */}
          <h4
            className="font-headline-sm text-base font-bold text-on-surface truncate"
            title={restaurant.name}
          >
            {restaurant.name}
          </h4>

          {/* Cuisine • Distance Subtitle */}
          <div className="text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
            {restaurant.cuisine ? (
              <>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate max-w-[150px]">
                  {formatCuisine(restaurant.cuisine)}
                </span>
                <span>•</span>
              </>
            ) : null}
            <span>{formatDistance(restaurant.distanceMeters)}</span>
            {restaurant.wheelchair === "yes" && (
              <>
                <span>•</span>
                <span className="text-sky-700 dark:text-sky-400 flex items-center" title="Wheelchair accessible">
                  <span className="material-symbols-outlined text-[14px]">accessible</span>
                </span>
              </>
            )}
          </div>

          {/* Address */}
          {restaurant.address && (
            <p
              className="text-xs text-on-surface-variant/90 flex items-start gap-1.5 line-clamp-2"
              title={restaurant.address}
            >
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant/70 shrink-0 mt-0.5">
                location_on
              </span>
              <span>{restaurant.address}</span>
            </p>
          )}

          {/* Opening Hours if available */}
          {restaurant.openingHours && (
            <p
              className="text-[11px] text-on-surface-variant/80 flex items-center gap-1 truncate"
              title={`Hours: ${restaurant.openingHours}`}
            >
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60 shrink-0">
                schedule
              </span>
              <span className="truncate">{restaurant.openingHours}</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer Action Buttons: [ View Details ] [ Directions ] */}
      <div className="p-4 pt-0 flex items-center gap-2 border-t border-surface-container-high/30 mt-1">
        <button
          type="button"
          id={`btn-details-${restaurant.id.replace(/[/:]/g, "-")}`}
          onClick={() => onViewDetails?.(restaurant)}
          className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-high/70 hover:bg-surface-container text-on-surface text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          aria-label={`View details for ${restaurant.name}`}
        >
          <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
          <span>View Details</span>
        </button>

        <button
          type="button"
          id={`btn-directions-${restaurant.id.replace(/[/:]/g, "-")}`}
          onClick={() => onGetDirections?.(restaurant)}
          className="flex-1 px-3 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          aria-label={`Get directions to ${restaurant.name}`}
        >
          <span className="material-symbols-outlined text-[16px]">directions</span>
          <span>Directions</span>
        </button>
      </div>
    </div>
  );
}
