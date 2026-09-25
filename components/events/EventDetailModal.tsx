"use client";

import React, { useEffect, useId, useState } from "react";
import { EventItem } from "@/lib/events/types";
import { formatEventDateTime, formatEventPrice, formatCategoryLabel, getCategoryIcon } from "./EventCard";

export interface EventDetailModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function EventDetailModal({
  event,
  isOpen,
  onClose,
  className = "",
}: EventDetailModalProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const titleId = useId();

  // Reset image error state when opened for a different event
  useEffect(() => {
    setImageError(false);
  }, [event?.id]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !event) {
    return null;
  }

  const categoryLabel = formatCategoryLabel(event.category || event.subcategory);
  const categoryIcon = getCategoryIcon(event.category || event.subcategory);
  const formattedDateTime = formatEventDateTime(event.startDate, event.endDate, event.timezone);
  const formattedPrice = formatEventPrice(event.priceMin, event.priceMax, event.currency);

  const fullLocation = [event.venueName, event.venueAddress, event.city, event.country]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");

  const handleOpenExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      id="event-detail-modal-backdrop"
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="event-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl bg-surface-container-lowest border border-surface-container-high rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 ${className}`}
      >
        {/* Modal Header / Banner Area */}
        <div className="relative w-full h-52 sm:h-64 bg-surface-container-high/40 shrink-0 overflow-hidden">
          {event.imageUrl && !imageError ? (
            <img
              src={event.imageUrl}
              alt={`Photo of ${event.title}`}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 via-surface-container to-surface-container-high/40 text-primary">
              <span className="material-symbols-outlined text-[56px] text-primary/70">
                {categoryIcon}
              </span>
              <span className="text-xs text-on-surface-variant font-semibold mt-2">
                {categoryLabel}
              </span>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            id="btn-close-event-modal"
            onClick={onClose}
            aria-label="Close event details"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs shadow-md focus-visible:outline-2 focus-visible:outline-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          {/* Category Pill Overlaid */}
          <span className="absolute top-3 left-3 sm:top-4 sm:left-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-xs font-bold uppercase tracking-wider shadow-md">
            <span className="material-symbols-outlined text-[15px] text-primary-fixed-dim">
              {categoryIcon}
            </span>
            <span>{categoryLabel}</span>
          </span>

          {/* Price Badge Overlaid (when provided) */}
          {formattedPrice && (
            <span
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-extrabold shadow-lg"
              title={`Price: ${formattedPrice}`}
            >
              <span className="material-symbols-outlined text-[14px]">payments</span>
              <span>{formattedPrice}</span>
            </span>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-7 overflow-y-auto flex flex-col gap-5 divide-y divide-surface-container-high/40">
          {/* Main Info Section */}
          <div className="flex flex-col gap-3">
            <h3
              id={titleId}
              className="font-headline-sm text-xl sm:text-2xl font-bold text-on-surface tracking-tight leading-snug"
            >
              {event.title}
            </h3>

            {/* Quick Meta Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {formattedDateTime && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  <span>{formattedDateTime}</span>
                </div>
              )}

              {event.timezone && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-[11px] font-medium">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>{event.timezone}</span>
                </div>
              )}

              {event.status && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{event.status}</span>
                </span>
              )}
            </div>
          </div>

          {/* Venue & Location Section */}
          {fullLocation && (
            <div className="pt-4 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
                <span>Venue & Location</span>
              </h4>
              <div className="pl-6 flex flex-col gap-1 text-sm text-on-surface-variant">
                {event.venueName && (
                  <p className="font-bold text-on-surface">{event.venueName}</p>
                )}
                {event.venueAddress && (
                  <p className="text-xs leading-relaxed">{event.venueAddress}</p>
                )}
                {(event.city || event.country) && (
                  <p className="text-xs text-on-surface-variant/80">
                    {[event.city, event.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description Section */}
          {event.description && (
            <div className="pt-4 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                <span>About This Event</span>
              </h4>
              <div className="pl-6 text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                {event.description}
              </div>
            </div>
          )}

          {/* Price & Ticketing Summary (if provided) */}
          {formattedPrice && (
            <div className="pt-4 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">local_activity</span>
                <span>Admission / Pricing</span>
              </h4>
              <div className="pl-6 text-sm font-semibold text-on-surface flex items-center gap-2">
                <span>{formattedPrice}</span>
                {event.currency && (
                  <span className="text-xs text-on-surface-variant font-normal">
                    ({event.currency})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-surface-container-low border-t border-surface-container-high/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            id="btn-close-modal-footer"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-surface-container-high hover:bg-surface-container text-on-surface text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2.5">
            {event.eventUrl && (
              <button
                type="button"
                id="btn-view-event-external"
                onClick={() => handleOpenExternal(event.eventUrl!)}
                className="px-4 py-2.5 rounded-xl border border-primary/30 hover:bg-primary/10 text-primary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="View event details on provider website"
              >
                <span>View Event</span>
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              </button>
            )}

            {event.ticketUrl && (
              <button
                type="button"
                id="btn-get-tickets-external"
                onClick={() => handleOpenExternal(event.ticketUrl!)}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer"
                title="Get tickets on official ticketing partner"
              >
                <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                <span>Get Tickets</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
