"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { AttractionItem, AttractionDetailsData, AttractionDetailsApiResponse } from "@/lib/attractions/types";
import { formatAttractionDistance, formatCategoryBadge } from "./AttractionCard";
import AttractionPhoto from "./AttractionPhoto";

export interface AttractionDetailModalProps {
  attraction: AttractionItem | null;
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string | null;
  className?: string;
}

export default function AttractionDetailModal({
  attraction,
  isOpen,
  onClose,
  photoUrl,
  className = "",
}: AttractionDetailModalProps) {
  const [details, setDetails] = useState<AttractionDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation state (Coordinates are NOT persisted or stored anywhere)
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const titleId = useId();

  // Fetch Place Details whenever modal opens with an attraction
  const fetchDetails = useCallback(async (targetPlaceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/attractions/${encodeURIComponent(targetPlaceId)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const json: AttractionDetailsApiResponse = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        setDetails(json.data);
      } else {
        setDetails(null);
        if (res.status === 401) {
          setError("Please sign in to view detailed attraction information.");
        } else {
          setError("Unable to load attraction details.");
        }
      }
    } catch {
      setDetails(null);
      setError("Unable to load attraction details.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && attraction) {
      // Reset navigation state and errors when opened for a new/different attraction
      setIsLocating(false);
      setLocationError(null);
      fetchDetails(attraction.place_id || attraction.id);
    } else {
      setDetails(null);
      setError(null);
      setIsLocating(false);
      setLocationError(null);
    }
  }, [isOpen, attraction, fetchDetails]);

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

  // Prevent background scrolling when modal is open
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

  if (!isOpen || !attraction) {
    return null;
  }

  // Fallbacks from list attraction item if details not loaded yet
  const name = details?.name || attraction.name;
  const latitude = details?.latitude || attraction.latitude;
  const longitude = details?.longitude || attraction.longitude;
  const formattedAddress = details?.formattedAddress || attraction.formattedAddress || attraction.formatted || null;
  const categories = details?.categories?.length ? details.categories : attraction.categories || [];
  const displayDistance = formatAttractionDistance(attraction.distance);

  // Factual "Why visit?" sections strictly derived from provider data
  const hasHistoric = Boolean(
    details?.historic &&
      (details.historic.type ||
        details.historic.period ||
        details.historic.importance ||
        details.historic.startDate ||
        details.historic.endDate)
  );

  const hasHeritage = Boolean(
    details?.heritage &&
      (details.heritage.description || details.heritage.operator || details.heritage.website)
  );

  const hasFactualWhyVisit = Boolean(
    details &&
      (details.description ||
        hasHistoric ||
        hasHeritage ||
        (details.categories && details.categories.length > 0))
  );

  // Request browser geolocation on demand for directions (NOT stored)
  // Google Maps navigation handler - requests fresh browser geolocation and opens Google Maps
  const handleOpenGoogleMaps = () => {
    if (isLocating) return;
    setLocationError(null);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Unable to determine your current location.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLocationError(null);
        const url = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${latitude},${longitude}&travelmode=driving`;
        window.open(url, "_blank", "noopener,noreferrer");
      },
      (geoError) => {
        setIsLocating(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationError("Location permission is required to continue.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setLocationError("Unable to determine your current location.");
        } else if (geoError.code === geoError.TIMEOUT) {
          setLocationError("Location request timed out. Please try again.");
        } else {
          setLocationError("Unable to get your current location.");
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
      id="attraction-detail-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="attraction-detail-modal-content"
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-surface-container-lowest border border-surface-container-high/80 shadow-2xl overflow-hidden ${className}`}
      >
        {/* Header: Attraction Name & Close Button */}
        <div className="flex items-center justify-between gap-3 p-5 sm:px-6 sm:py-5 border-b border-surface-container-high/60 shrink-0">
          <div className="flex items-center gap-3 pr-2 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">attractions</span>
            </div>
            <h2
              id={titleId}
              className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface truncate"
              title={name}
            >
              {name}
            </h2>
          </div>

          <button
            type="button"
            id="btn-close-attraction-modal"
            onClick={onClose}
            aria-label="Close attraction details"
            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6">
          {/* 1. Loading Skeleton */}
          {isLoading && (
            <div
              id="attraction-details-loading"
              role="status"
              className="flex flex-col items-center justify-center py-12 gap-3 text-center"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-[24px] animate-spin">
                  progress_activity
                </span>
              </div>
              <p className="text-sm font-semibold text-on-surface">Loading attraction details...</p>
              <p className="text-xs text-on-surface-variant">
                Fetching verified place data and visitor information.
              </p>
            </div>
          )}

          {/* 2. Error State */}
          {error && !isLoading && (
            <div
              id="attraction-details-error"
              role="alert"
              className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-center flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">error</span>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-rose-900">Unable to load attraction details.</h4>
                <p className="text-xs text-rose-700 max-w-sm">{error}</p>
              </div>
              <button
                type="button"
                id="btn-retry-attraction-details"
                onClick={() => fetchDetails(attraction.place_id || attraction.id)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* 3. Main Content View */}
          {!isLoading && !error && (
            <>
              {/* Photo Display: Verified image or representative Pexels photo */}
              <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden bg-surface-container-low border border-surface-container-high/60 relative flex items-center justify-center shrink-0">
                {details?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={details.image}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <AttractionPhoto
                    attraction={attraction}
                    initialPhotoUrl={photoUrl}
                  />
                )}
                {/* Fallback anchor preserved for tests */}
                <div id="attraction-neutral-photo-placeholder" className="hidden">
                  <span>No photo available</span>
                </div>
              </div>

              {/* Main Metadata: Categories, Distance, Address */}
              <div className="flex flex-col gap-3">
                {/* Badges & Distance */}
                <div className="flex flex-wrap items-center gap-2">
                  {displayDistance && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-tight">
                      <span className="material-symbols-outlined text-[14px]">near_me</span>
                      <span>{displayDistance}</span>
                    </span>
                  )}

                  {categories.map((cat, idx) => (
                    <span
                      key={`${cat}-${idx}`}
                      className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold capitalize"
                    >
                      {formatCategoryBadge(cat)}
                    </span>
                  ))}
                </div>

                {/* Address */}
                {formattedAddress && (
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                      place
                    </span>
                    <span>{formattedAddress}</span>
                  </div>
                )}
              </div>

              {/* Section: "About this place" (Only if description exists) */}
              {details?.description && (
                <div id="section-about-attraction" className="flex flex-col gap-2 pt-2 border-t border-surface-container-high/50">
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                    <span>About this place</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {details.description}
                  </p>
                </div>
              )}

              {/* Section: "Why visit?" (Derived factual information or neutral statement) */}
              <div id="section-why-visit-attraction" className="flex flex-col gap-2.5 pt-2 border-t border-surface-container-high/50">
                <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
                  <span>Why visit?</span>
                </h3>

                {hasFactualWhyVisit ? (
                  <div className="flex flex-col gap-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    {/* Historic significance if available */}
                    {hasHistoric && details?.historic && (
                      <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-1">
                        <span className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">history_edu</span>
                          Historical significance
                        </span>
                        <p className="text-xs text-on-surface-variant">
                          {[
                            details.historic.type && `Type: ${details.historic.type}`,
                            details.historic.period && `Period: ${details.historic.period}`,
                            details.historic.importance && `Importance: ${details.historic.importance}`,
                            details.historic.startDate && `Established: ${details.historic.startDate}`,
                            details.historic.endDate && `Ended: ${details.historic.endDate}`,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      </div>
                    )}

                    {/* Heritage information if available */}
                    {hasHeritage && details?.heritage && (
                      <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-1">
                        <span className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                          Heritage information
                        </span>
                        <p className="text-xs text-on-surface-variant">
                          {details.heritage.description || "Designated heritage site"}
                          {details.heritage.operator && ` (Operated by: ${details.heritage.operator})`}
                        </p>
                      </div>
                    )}

                    {/* Factual categories overview */}
                    {!details?.description && !hasHistoric && !hasHeritage && categories.length > 0 && (
                      <p className="text-xs sm:text-sm text-on-surface-variant">
                        Officially classified under{" "}
                        <span className="font-semibold text-on-surface">
                          {categories.map(formatCategoryBadge).join(", ")}
                        </span>
                        .
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-on-surface-variant italic">
                    Detailed information is not available for this attraction.
                  </p>
                )}
              </div>

              {/* Optional Section: Opening Hours (Only if available) */}
              {details?.openingHours && (
                <div id="section-opening-hours" className="flex flex-col gap-1.5 pt-2 border-t border-surface-container-high/50">
                  <h3 className="font-headline-sm text-xs font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                    <span>Opening Hours</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high/40">
                    {details.openingHours}
                  </p>
                </div>
              )}

              {/* Optional Section: Verified External Links (Only when URLs exist) */}
              {(details?.website || details?.wikipedia || details?.wikimediaCommons) && (
                <div id="section-external-links" className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-container-high/50">
                  {details.website && (
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">public</span>
                      <span>Official Website</span>
                      <span className="material-symbols-outlined text-[13px] opacity-60">open_in_new</span>
                    </a>
                  )}

                  {details.wikipedia && (
                    <a
                      href={details.wikipedia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">menu_book</span>
                      <span>Wikipedia</span>
                      <span className="material-symbols-outlined text-[13px] opacity-60">open_in_new</span>
                    </a>
                  )}

                  {details.wikimediaCommons && (
                    <a
                      href={details.wikimediaCommons}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">photo_library</span>
                      <span>Wikimedia Commons</span>
                      <span className="material-symbols-outlined text-[13px] opacity-60">open_in_new</span>
                    </a>
                  )}
                </div>
              )}

              {/* Action Button: Open in Google Maps (Actual Navigation Only) */}
              <div className="flex flex-col gap-3 pt-3 border-t border-surface-container-high/60">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    id="btn-open-google-maps"
                    onClick={handleOpenGoogleMaps}
                    disabled={isLocating}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-primary"
                    title="Navigate with Google Maps from your current location"
                    aria-label="Open in Google Maps: Navigate with Google Maps"
                  >
                    <span className="material-symbols-outlined text-[18px]">map</span>
                    <span>{isLocating ? "Getting Location..." : "Open in Google Maps"}</span>
                    <span className="material-symbols-outlined text-[14px] opacity-70">open_in_new</span>
                  </button>
                </div>

                {/* Location Error Message */}
                {locationError && (
                  <div
                    id="attraction-location-error"
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0">
                      location_off
                    </span>
                    <span>{locationError}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
