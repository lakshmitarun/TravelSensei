"use client";

import React, { useState } from "react";
import { AttractionItem } from "@/lib/attractions/types";
import AttractionPhoto from "./AttractionPhoto";

export interface AttractionCardProps {
  attraction: AttractionItem;
  onSelect?: (attraction: AttractionItem, photoUrl?: string | null) => void;
  className?: string;
}

/**
 * Formats distance in meters into human-friendly string
 */
export function formatAttractionDistance(meters: number | null | undefined): string | null {
  if (typeof meters !== "number" || isNaN(meters)) return null;
  if (meters < 1000) {
    return `${meters} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

/**
 * Formats raw category identifiers like 'tourism.attraction' or 'tourism.sights' into readable labels
 */
export function formatCategoryBadge(category: string): string {
  const parts = category.split(".");
  const lastPart = parts[parts.length - 1] || category;
  return lastPart
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Picks an appropriate Material Symbols icon based on attraction categories
 */
function getCategoryIcon(categories: string[] = []): string {
  const catString = categories.join(" ").toLowerCase();
  if (catString.includes("museum")) return "museum";
  if (catString.includes("castle")) return "fort";
  if (catString.includes("ruin")) return "history_edu";
  if (catString.includes("memorial") || catString.includes("monument")) return "account_balance";
  if (catString.includes("viewpoint")) return "visibility";
  if (catString.includes("park") || catString.includes("garden")) return "park";
  if (catString.includes("artwork")) return "palette";
  if (catString.includes("sights")) return "tour";
  return "attractions";
}

export default function AttractionCard({
  attraction,
  onSelect,
  className = "",
}: AttractionCardProps) {
  const [loadedPhotoUrl, setLoadedPhotoUrl] = useState<string | null>(null);
  const cardElementId = `attraction-card-${attraction.id.replace(/[/:]/g, "-")}`;
  const formattedDistance = formatAttractionDistance(attraction.distance);
  const iconName = getCategoryIcon(attraction.categories);

  // Address and location formatting
  const displayAddress = attraction.formattedAddress || attraction.formatted || null;
  const locationParts = [attraction.city, attraction.state, attraction.country]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const locationSummary = locationParts.join(", ");

  // Deduplicate and filter categories for badges
  const displayCategories = (attraction.categories || [])
    .filter((c) => c !== "tourism") // Skip generic parent
    .slice(0, 3); // Show top 3 badges

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(attraction, loadedPhotoUrl);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onSelect) {
      e.preventDefault();
      onSelect(attraction, loadedPhotoUrl);
    }
  };

  return (
    <article
      id={cardElementId}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? "button" : undefined}
      aria-label={`Attraction: ${attraction.name}. Click to view details.`}
      className={`group relative flex flex-col justify-between rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden focus-visible:outline-2 focus-visible:outline-primary ${
        onSelect ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex flex-col">
        {/* Photo Area at the TOP of the card */}
        <div className="relative w-full h-36 sm:h-40 bg-surface-container-high/30 overflow-hidden shrink-0">
          <AttractionPhoto
            attraction={attraction}
            onPhotoLoaded={setLoadedPhotoUrl}
          />

          {/* Quick Distance badge overlaid on top right */}
          {formattedDistance && (
            <span
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold tracking-tight shadow-xs"
              title={`Distance: ${formattedDistance}`}
            >
              <span className="material-symbols-outlined text-[13px] text-primary-fixed-dim">near_me</span>
              <span>{formattedDistance}</span>
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {/* Header icon row & View Details */}
          <div className="flex items-center justify-between gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
              <span className="material-symbols-outlined text-[18px]">{iconName}</span>
            </div>

            {onSelect && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span>View Details</span>
                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </span>
            )}
          </div>

          {/* Attraction Name */}
          <div>
            <h4
              className="font-headline-sm text-base font-bold text-on-surface tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors"
              title={attraction.name}
            >
              {attraction.name}
            </h4>

            {/* Location / Administrative Info */}
            {locationSummary && (
              <p className="text-xs text-on-surface-variant font-medium mt-1 flex items-center gap-1 truncate">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant/70 shrink-0">
                  location_city
                </span>
                <span className="truncate">{locationSummary}</span>
              </p>
            )}
          </div>

          {/* Formatted Address */}
          {displayAddress && (
            <p
              className="text-xs text-on-surface-variant/85 line-clamp-2 leading-relaxed flex items-start gap-1 pt-0.5"
              title={displayAddress}
            >
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60 shrink-0 mt-0.5">
                place
              </span>
              <span className="line-clamp-2">{displayAddress}</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer: Category Badges & Mobile View Details */}
      <div className="p-4 sm:p-5 pt-0 flex items-center justify-between gap-1.5 border-t border-surface-container-high/40 mt-1">
        {displayCategories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayCategories.map((cat, idx) => (
              <span
                key={`${cat}-${idx}`}
                className="px-2 py-0.5 rounded-md bg-surface-container-high/60 text-on-surface-variant text-[10px] font-semibold tracking-wide capitalize"
              >
                {formatCategoryBadge(cat)}
              </span>
            ))}
          </div>
        ) : (
          <span />
        )}

        {onSelect && (
          <span className="sm:hidden text-primary text-[11px] font-bold flex items-center gap-0.5 shrink-0">
            <span>View Details</span>
            <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          </span>
        )}
      </div>
    </article>
  );
}

