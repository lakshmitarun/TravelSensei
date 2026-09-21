"use client";

import React, { useState, useEffect } from "react";
import { format, parseISO, addDays, isBefore, startOfDay } from "date-fns";
import { HotelSearchParams } from "@/lib/hotels/types";

export interface HotelSearchFormValues {
  destination: string;
  countryCode?: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  rooms: number;
  currency: string;
}

interface HotelSearchFormProps {
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

const CURRENCIES = [
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" },
  { label: "INR (₹)", value: "INR" },
];

export default function HotelSearchForm({
  initialDestination = "",
  initialCountryCode = "",
  initialCheckinDate,
  initialCheckoutDate,
  initialAdults = 2,
  initialChildren = 0,
  initialRooms = 1,
  initialCurrency = "USD",
  onSearch,
  isLoading = false,
  className = "",
}: HotelSearchFormProps) {
  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");
  const defaultCheckin = initialCheckinDate && initialCheckinDate >= todayStr
    ? initialCheckinDate
    : format(addDays(today, 7), "yyyy-MM-dd");

  const defaultCheckout = initialCheckoutDate && initialCheckoutDate > defaultCheckin
    ? initialCheckoutDate
    : format(addDays(parseISO(defaultCheckin), 2), "yyyy-MM-dd");

  const [destination, setDestination] = useState<string>(initialDestination);
  const [countryCode, setCountryCode] = useState<string>(initialCountryCode);
  const [checkin, setCheckin] = useState<string>(defaultCheckin);
  const [checkout, setCheckout] = useState<string>(defaultCheckout);
  const [adults, setAdults] = useState<number>(initialAdults);
  const [children, setChildren] = useState<number>(initialChildren);
  const [rooms, setRooms] = useState<number>(initialRooms);
  const [currency, setCurrency] = useState<string>(initialCurrency);

  const [errors, setErrors] = useState<{
    destination?: string;
    checkin?: string;
    checkout?: string;
    adults?: string;
    children?: string;
    rooms?: string;
    general?: string;
  }>({});

  // Sync props if they change
  useEffect(() => {
    if (initialDestination) setDestination(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    if (initialCountryCode) setCountryCode(initialCountryCode);
  }, [initialCountryCode]);

  useEffect(() => {
    if (initialCheckinDate && initialCheckinDate >= todayStr) {
      setCheckin(initialCheckinDate);
    }
  }, [initialCheckinDate, todayStr]);

  useEffect(() => {
    if (initialCheckoutDate) {
      setCheckout(initialCheckoutDate);
    }
  }, [initialCheckoutDate]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // 1. Destination
    if (!destination.trim()) {
      newErrors.destination = "Please enter a destination city.";
    }

    // 2. Checkin
    if (!checkin) {
      newErrors.checkin = "Check-in date is required.";
    } else {
      try {
        const checkinDate = parseISO(checkin);
        if (isNaN(checkinDate.getTime())) {
          newErrors.checkin = "Invalid check-in date format.";
        } else if (isBefore(startOfDay(checkinDate), today)) {
          newErrors.checkin = "Check-in date cannot be in the past.";
        }
      } catch {
        newErrors.checkin = "Invalid check-in date.";
      }
    }

    // 3. Checkout
    if (!checkout) {
      newErrors.checkout = "Check-out date is required.";
    } else {
      try {
        const checkoutDate = parseISO(checkout);
        const checkinDate = parseISO(checkin);
        if (isNaN(checkoutDate.getTime())) {
          newErrors.checkout = "Invalid check-out date format.";
        } else if (checkout <= checkin) {
          newErrors.checkout = "Check-out must be after check-in date.";
        } else if (isBefore(startOfDay(checkoutDate), today)) {
          newErrors.checkout = "Check-out date cannot be in the past.";
        }
      } catch {
        newErrors.checkout = "Invalid check-out date.";
      }
    }

    // 4. Adults
    if (isNaN(adults) || adults < 1) {
      newErrors.adults = "At least 1 adult is required.";
    } else if (adults > 20) {
      newErrors.adults = "Maximum 20 adults allowed.";
    }

    // 5. Children
    if (isNaN(children) || children < 0) {
      newErrors.children = "Children count cannot be negative.";
    } else if (children > 10) {
      newErrors.children = "Maximum 10 children allowed.";
    }

    // 6. Rooms
    if (isNaN(rooms) || rooms < 1) {
      newErrors.rooms = "At least 1 room is required.";
    } else if (rooms > 10) {
      newErrors.rooms = "Maximum 10 rooms allowed.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Parse country code if user typed "Rome, IT" or entered country code
    let cleanDest = destination.trim();
    let cleanCountry = countryCode.trim().toUpperCase();

    if (!cleanCountry && cleanDest.includes(",")) {
      const parts = cleanDest.split(",").map((s) => s.trim());
      cleanDest = parts[0];
      if (parts[1] && parts[1].length === 2) {
        cleanCountry = parts[1].toUpperCase();
      }
    }

    // If destination is Rome and no countryCode provided, default to IT for Nuitee sandbox
    if (cleanDest.toLowerCase() === "rome" && !cleanCountry) {
      cleanCountry = "IT";
    }

    const params: HotelSearchParams = {
      destination: cleanDest,
      city: cleanDest,
      countryCode: cleanCountry || undefined,
      checkin,
      checkout,
      adults: Number(adults),
      children: Number(children),
      rooms: Number(rooms),
      currency: currency || "USD",
    };

    onSearch(params);
  };

  return (
    <form
      id="hotel-search-form"
      onSubmit={handleSubmit}
      className={`flex flex-col gap-6 ${className}`}
      noValidate
    >
      {/* Primary Row: Destination & Country */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Destination City */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label
            htmlFor="hotel-destination-input"
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">location_city</span>
            <span>Destination City</span>
            <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="hotel-destination-input"
              type="text"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                if (errors.destination) {
                  setErrors((prev) => ({ ...prev, destination: undefined }));
                }
              }}
              placeholder="e.g. Rome, Paris, Tokyo"
              className={`w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border text-sm font-medium text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.destination
                  ? "border-rose-400 bg-rose-50/20"
                  : "border-surface-container-high/70 hover:border-primary/50"
              }`}
            />
          </div>
          {errors.destination && (
            <span id="hotel-destination-error" role="alert" className="text-xs font-semibold text-rose-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {errors.destination}
            </span>
          )}
        </div>

        {/* Country Code */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="hotel-country-input"
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">flag</span>
            <span>Country Code</span>
            <span className="text-on-surface-variant/60 text-[10px] font-normal">(e.g. IT)</span>
          </label>
          <input
            id="hotel-country-input"
            type="text"
            maxLength={2}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="IT"
            className="w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border border-surface-container-high/70 text-sm font-semibold uppercase text-on-surface transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Secondary Row: Check-in, Check-out, Guests, Rooms, Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Check-in Date */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="hotel-checkin-input"
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
            <span>Check-in</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            id="hotel-checkin-input"
            type="date"
            min={todayStr}
            value={checkin}
            onChange={(e) => {
              const newCheckin = e.target.value;
              setCheckin(newCheckin);
              if (errors.checkin) {
                setErrors((prev) => ({ ...prev, checkin: undefined }));
              }
              // If checkout is before or equal to new checkin, auto-bump checkout by 2 days
              if (checkout && newCheckin && checkout <= newCheckin) {
                try {
                  const bumped = format(addDays(parseISO(newCheckin), 2), "yyyy-MM-dd");
                  setCheckout(bumped);
                  setErrors((prev) => ({ ...prev, checkout: undefined }));
                } catch {
                  // ignore
                }
              }
            }}
            className={`w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border text-sm font-medium text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.checkin
                ? "border-rose-400 bg-rose-50/20"
                : "border-surface-container-high/70 hover:border-primary/50"
            }`}
          />
          {errors.checkin && (
            <span id="hotel-checkin-error" role="alert" className="text-xs font-semibold text-rose-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {errors.checkin}
            </span>
          )}
        </div>

        {/* Check-out Date */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="hotel-checkout-input"
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">event</span>
            <span>Check-out</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            id="hotel-checkout-input"
            type="date"
            min={checkin || todayStr}
            value={checkout}
            onChange={(e) => {
              setCheckout(e.target.value);
              if (errors.checkout) {
                setErrors((prev) => ({ ...prev, checkout: undefined }));
              }
            }}
            className={`w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border text-sm font-medium text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.checkout
                ? "border-rose-400 bg-rose-50/20"
                : "border-surface-container-high/70 hover:border-primary/50"
            }`}
          />
          {errors.checkout && (
            <span id="hotel-checkout-error" role="alert" className="text-xs font-semibold text-rose-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {errors.checkout}
            </span>
          )}
        </div>

        {/* Adults & Children */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hotel-adults-input"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">person</span>
              <span>Adults</span>
            </label>
            <input
              id="hotel-adults-input"
              type="number"
              min={1}
              max={20}
              value={adults}
              onChange={(e) => {
                setAdults(parseInt(e.target.value, 10) || 1);
                if (errors.adults) {
                  setErrors((prev) => ({ ...prev, adults: undefined }));
                }
              }}
              className={`w-full px-3 py-3 rounded-2xl bg-surface-container-lowest border text-sm font-semibold text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.adults ? "border-rose-400" : "border-surface-container-high/70"
              }`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hotel-children-input"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">child_care</span>
              <span>Kids</span>
            </label>
            <input
              id="hotel-children-input"
              type="number"
              min={0}
              max={10}
              value={children}
              onChange={(e) => {
                setChildren(parseInt(e.target.value, 10) || 0);
                if (errors.children) {
                  setErrors((prev) => ({ ...prev, children: undefined }));
                }
              }}
              className={`w-full px-3 py-3 rounded-2xl bg-surface-container-lowest border text-sm font-semibold text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.children ? "border-rose-400" : "border-surface-container-high/70"
              }`}
            />
          </div>
        </div>

        {/* Rooms & Currency */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hotel-rooms-input"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">hotel</span>
              <span>Rooms</span>
            </label>
            <input
              id="hotel-rooms-input"
              type="number"
              min={1}
              max={10}
              value={rooms}
              onChange={(e) => {
                setRooms(parseInt(e.target.value, 10) || 1);
                if (errors.rooms) {
                  setErrors((prev) => ({ ...prev, rooms: undefined }));
                }
              }}
              className={`w-full px-3 py-3 rounded-2xl bg-surface-container-lowest border text-sm font-semibold text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.rooms ? "border-rose-400" : "border-surface-container-high/70"
              }`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hotel-currency-select"
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
              <span>Currency</span>
            </label>
            <select
              id="hotel-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-3 rounded-2xl bg-surface-container-lowest border border-surface-container-high/70 text-sm font-semibold text-on-surface transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inline errors for guests/rooms if any */}
      {(errors.adults || errors.children || errors.rooms) && (
        <div className="text-xs font-semibold text-rose-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          <span>{errors.adults || errors.children || errors.rooms}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-surface-container-high/50">
        <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          <span>Powered by Nuitee / LiteAPI Real-Time Hotel Inventory</span>
        </div>

        <button
          type="submit"
          id="btn-search-hotels"
          disabled={isLoading}
          className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-primary hover:bg-primary-container text-white text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Searching Hotels...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">search</span>
              <span>Search Hotels</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
