"use client";

import React, { useState } from "react";
import { EventItem } from "@/lib/events/types";

export interface EventCardProps {
  event: EventItem;
  onSelect?: (event: EventItem) => void;
  className?: string;
}

/**
 * Formats event date and time using timezone if available.
 */
export function formatEventDateTime(
  startDateStr?: string | null,
  endDateStr?: string | null,
  timezone?: string | null
): string | null {
  if (!startDateStr) return null;
  try {
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return null;

    const tz = timezone && timezone.trim() ? timezone.trim() : undefined;

    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: tz,
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    };

    const dateFormatted = new Intl.DateTimeFormat("en-US", dateOptions).format(start);
    const timeFormatted = new Intl.DateTimeFormat("en-US", timeOptions).format(start);

    // If start and end are provided and on different dates, show date range
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (!isNaN(end.getTime()) && start.toDateString() !== end.toDateString()) {
        const endDateFormatted = new Intl.DateTimeFormat("en-US", dateOptions).format(end);
        return `${dateFormatted} – ${endDateFormatted}`;
      }
    }

    return `${dateFormatted} · ${timeFormatted}`;
  } catch {
    return startDateStr;
  }
}

/**
 * Formats price and currency factually without fabricating numbers.
 */
export function formatEventPrice(
  priceMin?: number | null,
  priceMax?: number | null,
  currency?: string | null
): string | null {
  if ((priceMin === null || priceMin === undefined) && (priceMax === null || priceMax === undefined)) {
    return null;
  }

  const curr = currency || "USD";
  const currSymbol =
    curr === "INR" ? "₹" : curr === "USD" ? "$" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : `${curr} `;

  if (priceMin !== null && priceMin !== undefined && priceMax !== null && priceMax !== undefined) {
    if (priceMin === 0 && priceMax === 0) return "Free";
    if (priceMin === priceMax) return `${currSymbol}${priceMin.toLocaleString()}`;
    return `${currSymbol}${priceMin.toLocaleString()} – ${currSymbol}${priceMax.toLocaleString()}`;
  }

  if (priceMin !== null && priceMin !== undefined) {
    if (priceMin === 0) return "Free";
    return `From ${currSymbol}${priceMin.toLocaleString()}`;
  }

  if (priceMax !== null && priceMax !== undefined) {
    if (priceMax === 0) return "Free";
    return `Up to ${currSymbol}${priceMax.toLocaleString()}`;
  }

  return null;
}

/**
 * Formats raw category identifiers like 'art_galleries' into readable title.
 */
export function formatCategoryLabel(category?: string | null): string {
  if (!category || !category.trim()) return "Event";
  return category
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Maps event categories to appropriate Material Symbols icon names.
 */
export function getCategoryIcon(category?: string | null): string {
  const cat = (category || "").toLowerCase();
  if (cat.includes("concert") || cat.includes("music") || cat.includes("live")) return "music_note";
  if (cat.includes("festival")) return "festival";
  if (cat.includes("sport")) return "sports_soccer";
  if (cat.includes("art") || cat.includes("gallery") || cat.includes("museum")) return "palette";
  if (cat.includes("theatre") || cat.includes("theater") || cat.includes("comedy")) return "theater_comedy";
  if (cat.includes("nightlife") || cat.includes("party") || cat.includes("club")) return "nightlife";
  if (cat.includes("conference") || cat.includes("business") || cat.includes("tech")) return "business_center";
  if (cat.includes("food") || cat.includes("drink") || cat.includes("dining")) return "restaurant";
  return "event";
}

export default function EventCard({
  event,
  onSelect,
  className = "",
}: EventCardProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const cardElementId = `event-card-${event.id.replace(/[/:\s]/g, "-")}`;

  const categoryLabel = formatCategoryLabel(event.category || event.subcategory);
  const categoryIcon = getCategoryIcon(event.category || event.subcategory);
  const formattedDateTime = formatEventDateTime(event.startDate, event.endDate, event.timezone);
  const formattedPrice = formatEventPrice(event.priceMin, event.priceMax, event.currency);

  const locationSummary = [event.venueName, event.city, event.country]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(event);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onSelect) {
      e.preventDefault();
      onSelect(event);
    }
  };

  return (
    <article
      id={cardElementId}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? "button" : undefined}
      aria-label={`Event: ${event.title}. Click to view details.`}
      className={`group relative flex flex-col justify-between rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden focus-visible:outline-2 focus-visible:outline-primary ${
        onSelect ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex flex-col">
        {/* Top Image / Visual Area */}
        <div className="relative w-full h-40 sm:h-44 bg-surface-container-high/30 overflow-hidden shrink-0">
          {event.imageUrl && !imageError ? (
            <img
              src={event.imageUrl}
              alt={`Banner image for ${event.title}`}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high/30 text-primary">
              <span className="material-symbols-outlined text-[40px] text-primary/70">
                {categoryIcon}
              </span>
              <span className="text-[11px] text-on-surface-variant/70 font-semibold mt-1">
                {categoryLabel}
              </span>
            </div>
          )}

          {/* Category Badge Overlaid on Top Left */}
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
            <span className="material-symbols-outlined text-[13px] text-primary-fixed-dim">
              {categoryIcon}
            </span>
            <span>{categoryLabel}</span>
          </span>

          {/* Price Badge Overlaid on Top Right (when provided) */}
          {formattedPrice && (
            <span
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-xs text-white text-[11px] font-extrabold tracking-tight shadow-xs"
              title={`Price: ${formattedPrice}`}
            >
              <span>{formattedPrice}</span>
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {/* Title */}
          <div>
            <h4
              className="font-headline-sm text-base font-bold text-on-surface tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors"
              title={event.title}
            >
              {event.title}
            </h4>
          </div>

          {/* Date & Time */}
          {formattedDateTime && (
            <p className="text-xs text-primary font-bold flex items-center gap-1.5 truncate">
              <span className="material-symbols-outlined text-[15px] shrink-0 text-primary">
                calendar_month
              </span>
              <span className="truncate">{formattedDateTime}</span>
            </p>
          )}

          {/* Venue & Location */}
          {locationSummary && (
            <p
              className="text-xs text-on-surface-variant font-medium flex items-start gap-1.5 line-clamp-2 leading-relaxed"
              title={locationSummary}
            >
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant/70 shrink-0 mt-0.5">
                location_on
              </span>
              <span className="line-clamp-2">{locationSummary}</span>
            </p>
          )}
        </div>
      </div>

      {/* Footer: View Details and Ticket Links */}
      <div className="p-4 sm:p-5 pt-0 flex items-center justify-between gap-2 border-t border-surface-container-high/40 mt-1">
        <span className="text-primary text-xs font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          <span>View Details</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </span>

        {event.ticketUrl && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              window.open(event.ticketUrl!, "_blank", "noopener,noreferrer");
            }}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                window.open(event.ticketUrl!, "_blank", "noopener,noreferrer");
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Get tickets on external ticketing provider"
          >
            <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
            <span>Tickets</span>
          </span>
        )}
      </div>
    </article>
  );
}
