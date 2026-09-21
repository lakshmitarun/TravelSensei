"use client";

import React from "react";
import HotelSearchForm from "./HotelSearchForm";
import { HotelSearchParams } from "@/lib/hotels/types";

export interface HotelSearchWidgetProps {
  initialDestination?: string;
  initialCountryCode?: string;
  initialCheckinDate?: string;
  initialCheckoutDate?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialRooms?: number;
  initialCurrency?: string;
  onSearch: (params: HotelSearchParams) => void;
  isLoading?: boolean;
  className?: string;
}

export default function HotelSearchWidget({
  initialDestination,
  initialCountryCode,
  initialCheckinDate,
  initialCheckoutDate,
  initialAdults,
  initialChildren,
  initialRooms,
  initialCurrency,
  onSearch,
  isLoading = false,
  className = "",
}: HotelSearchWidgetProps) {
  return (
    <div
      id="hotel-search-widget"
      className={`bg-surface-container-low rounded-3xl p-6 sm:p-8 border border-surface-container-high/60 shadow-sm flex flex-col gap-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">hotel</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
              Hotel & Accommodation Search
            </h3>
            <p className="text-xs text-on-surface-variant">
              Compare real-time rates, room types, and refundable booking options.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest/60 text-on-surface-variant text-[11px] font-semibold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Nuitee Connect Sandbox</span>
        </div>
      </div>

      <HotelSearchForm
        initialDestination={initialDestination}
        initialCountryCode={initialCountryCode}
        initialCheckinDate={initialCheckinDate}
        initialCheckoutDate={initialCheckoutDate}
        initialAdults={initialAdults}
        initialChildren={initialChildren}
        initialRooms={initialRooms}
        initialCurrency={initialCurrency}
        onSearch={onSearch}
        isLoading={isLoading}
      />
    </div>
  );
}
