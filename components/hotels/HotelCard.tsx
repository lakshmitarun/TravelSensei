"use client";

import React, { useState } from "react";
import { Hotel, HotelRate } from "@/lib/hotels/types";
import { format, parseISO } from "date-fns";

interface HotelCardProps {
  hotel: Hotel;
  className?: string;
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatCancellationDeadline(deadlineStr?: string): string | null {
  if (!deadlineStr) return null;
  try {
    const parsed = parseISO(deadlineStr);
    if (isNaN(parsed.getTime())) return null;
    return format(parsed, "MMM dd, yyyy HH:mm");
  } catch {
    return null;
  }
}

function StarRatingDisplay({ stars }: { stars: number }) {
  const rounded = Math.min(5, Math.max(1, Math.round(stars)));
  return (
    <div className="flex items-center gap-0.5 text-amber-400" title={`${stars} Star Hotel`}>
      {Array.from({ length: rounded }).map((_, i) => (
        <span key={i} className="material-symbols-outlined text-[16px] fill-current">
          star
        </span>
      ))}
    </div>
  );
}

function RoomRateRow({ rate }: { rate: HotelRate }) {
  const isRefundable = rate.refundableStatus === "refundable";
  const deadline = formatCancellationDeadline(rate.cancellationPolicy?.deadline);

  return (
    <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-primary/40">
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-headline-sm text-sm font-bold text-on-surface">
            {rate.roomName}
          </span>
          {isRefundable ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              <span>Free Cancellation</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[11px] font-semibold">
              Non-Refundable
            </span>
          )}
        </div>

        {/* Board / Meal plan */}
        {rate.boardName && (
          <span className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">restaurant</span>
            <span>{rate.boardName}</span>
          </span>
        )}

        {/* Cancellation Deadline & Details */}
        {deadline && (
          <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">event_available</span>
            <span>Cancel before {deadline}</span>
          </span>
        )}

        {/* Cancellation Remarks if available */}
        {rate.cancellationPolicy?.remarks && rate.cancellationPolicy.remarks.length > 0 && (
          <p className="text-[11px] text-on-surface-variant/75 line-clamp-2">
            {rate.cancellationPolicy.remarks[0]}
          </p>
        )}
      </div>

      <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-surface-container-high/40">
        <span className="text-xs text-on-surface-variant/70 block sm:hidden">Total Rate</span>
        <span className="text-lg font-black text-primary">
          {formatCurrency(rate.price, rate.currency)}
        </span>
        <span className="text-[10px] text-on-surface-variant hidden sm:block">
          Taxes & fees included
        </span>
      </div>
    </div>
  );
}

export default function HotelCard({ hotel, className = "" }: HotelCardProps) {
  const [showAllRates, setShowAllRates] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  const imageUrl = hotel.image || hotel.thumbnail;
  const rates = hotel.rates || [];
  const rateCount = rates.length;
  const minPrice = hotel.minRate?.price ?? (rates.length > 0 ? rates[0].price : null);
  const currency = hotel.minRate?.currency ?? (rates.length > 0 ? rates[0].currency : "USD");

  const locationStr = [hotel.address, hotel.city, hotel.country].filter(Boolean).join(", ");

  return (
    <div
      id={`hotel-card-${hotel.id}`}
      className={`bg-surface-container-low rounded-3xl border border-surface-container-high/60 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${className}`}
    >
      {/* Top Main Section */}
      <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-5">
        {/* Hotel Image / Thumbnail */}
        <div className="w-full md:w-56 h-48 sm:h-52 rounded-2xl bg-surface-container-high overflow-hidden shrink-0 relative">
          {imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={hotel.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-teal-800/10 text-primary p-4 text-center">
              <span className="material-symbols-outlined text-[44px]">apartment</span>
              <span className="text-[11px] font-semibold text-on-surface-variant mt-1">
                {hotel.name}
              </span>
            </div>
          )}

          {/* Star Rating Badge overlay on image */}
          {hotel.starRating !== undefined && hotel.starRating > 0 && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md">
              <StarRatingDisplay stars={hotel.starRating} />
            </div>
          )}
        </div>

        {/* Hotel Information */}
        <div className="flex-1 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            {/* Header: Hotel Name & Guest Rating */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface leading-snug">
                  {hotel.name}
                </h3>
                {locationStr && (
                  <p className="text-xs text-on-surface-variant flex items-center gap-1 pt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
                      location_on
                    </span>
                    <span>{locationStr}</span>
                  </p>
                )}
              </div>

              {/* Guest Rating Score */}
              {hotel.rating !== undefined && hotel.rating > 0 && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-xl shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-primary">Guest Score</span>
                    {hotel.reviewCount !== undefined && (
                      <span className="text-[10px] text-on-surface-variant">
                        {hotel.reviewCount} reviews
                      </span>
                    )}
                  </div>
                  <span className="text-base font-black text-primary px-1.5 py-0.5 bg-primary text-white rounded-lg">
                    {hotel.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Description when available */}
            {hotel.description && (
              <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                {hotel.description}
              </p>
            )}

            {/* Amenities Chips when available */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {hotel.amenities.slice(0, 5).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest/70 text-on-surface text-[11px] font-medium"
                  >
                    <span className="material-symbols-outlined text-[13px] text-primary">check</span>
                    <span>{amenity}</span>
                  </span>
                ))}
                {hotel.amenities.length > 5 && (
                  <span className="px-2 py-1 rounded-full bg-surface-container-highest/40 text-on-surface-variant text-[10px] font-semibold">
                    +{hotel.amenities.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Rate Action Bar */}
          <div className="pt-3 border-t border-surface-container-high/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Lowest Available Rate
              </span>
              {minPrice !== null ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-primary">
                    {formatCurrency(minPrice, currency)}
                  </span>
                  <span className="text-xs text-on-surface-variant">total</span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-on-surface-variant">
                  Rates on request
                </span>
              )}
              {rateCount > 0 && (
                <span className="text-[11px] text-on-surface-variant/80">
                  {rateCount} {rateCount === 1 ? "room rate available" : "room rates available"}
                </span>
              )}
            </div>

            {rateCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllRates((prev) => !prev)}
                className="px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showAllRates ? "Hide Room Rates" : `View ${rateCount} Room Rates`}</span>
                <span className="material-symbols-outlined text-[16px]">
                  {showAllRates ? "expand_less" : "expand_more"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Room Rates Drawer */}
      {showAllRates && rateCount > 0 && (
        <div className="border-t border-surface-container-high/70 bg-surface-container-lowest/50 p-5 sm:p-6 flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-headline-sm text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">bedroom_parent</span>
              <span>Available Room Options & Cancellation Policies</span>
            </h4>
            <span className="text-[11px] text-on-surface-variant">{rateCount} options</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {rates.map((rate, index) => (
              <RoomRateRow key={rate.rateId || rate.roomId || index} rate={rate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
