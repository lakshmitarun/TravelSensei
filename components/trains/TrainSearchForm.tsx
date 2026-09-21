"use client";

import React, { useState, useEffect } from "react";
import StationAutocomplete from "./StationAutocomplete";
import { TrainStation } from "@/lib/trains/types";
import { format, addDays } from "date-fns";

export interface TrainSearchFormValues {
  fromStation: TrainStation;
  toStation: TrainStation;
  journeyDate: string;
  type?: string;
  category?: string;
  byCity?: boolean;
  live?: boolean;
}

interface TrainSearchFormProps {
  initialDepartureDate?: string;
  initialFromStation?: TrainStation | null;
  initialToStation?: TrainStation | null;
  onSearch: (values: TrainSearchFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

const TRAIN_TYPES = [
  { label: "All Train Types", value: "" },
  { label: "Vande Bharat Express", value: "vande-bharat" },
  { label: "Rajdhani Express", value: "rajdhani" },
  { label: "Shatabdi Express", value: "shatabdi" },
  { label: "Superfast Express", value: "superfast" },
  { label: "Express / Mail", value: "express" },
];

const TRAIN_CATEGORIES = [
  { label: "All Categories", value: "" },
  { label: "Premium", value: "Premium" },
  { label: "Superfast", value: "Superfast" },
  { label: "Express", value: "Express" },
];

export default function TrainSearchForm({
  initialDepartureDate,
  initialFromStation = null,
  initialToStation = null,
  onSearch,
  isLoading = false,
  className = "",
}: TrainSearchFormProps) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [fromStation, setFromStation] = useState<TrainStation | null>(initialFromStation);
  const [toStation, setToStation] = useState<TrainStation | null>(initialToStation);
  const [journeyDate, setJourneyDate] = useState<string>(
    initialDepartureDate && initialDepartureDate >= todayStr ? initialDepartureDate : tomorrowStr
  );
  const [trainType, setTrainType] = useState<string>("");
  const [trainCategory, setTrainCategory] = useState<string>("");
  const [byCity, setByCity] = useState<boolean>(false);
  const [live, setLive] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [formErrors, setFormErrors] = useState<{
    from?: string;
    to?: string;
    date?: string;
    general?: string;
  }>({});

  useEffect(() => {
    if (initialFromStation) setFromStation(initialFromStation);
    if (initialToStation) setToStation(initialToStation);
    if (initialDepartureDate && initialDepartureDate >= todayStr) {
      setJourneyDate(initialDepartureDate);
    }
  }, [initialFromStation, initialToStation, initialDepartureDate, todayStr]);

  const handleSwapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
    setFormErrors((prev) => ({ ...prev, from: undefined, to: undefined }));
  };

  const validate = (): boolean => {
    const errors: typeof formErrors = {};

    if (!fromStation) {
      errors.from = "Please select origin station.";
    }

    if (!toStation) {
      errors.to = "Please select destination station.";
    }

    if (fromStation && toStation && fromStation.code.toUpperCase() === toStation.code.toUpperCase()) {
      errors.to = "Origin and destination stations must be different.";
    }

    if (!journeyDate) {
      errors.date = "Please select journey date.";
    } else if (journeyDate < todayStr) {
      errors.date = "Journey date cannot be in the past.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!fromStation || !toStation) return;

    onSearch({
      fromStation,
      toStation,
      journeyDate,
      type: trainType || undefined,
      category: trainCategory || undefined,
      byCity,
      live,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-surface-container-lowest rounded-3xl p-5 sm:p-7 shadow-lg border border-surface-container-high/60 flex flex-col gap-6 ${className}`}
    >
      {/* Station Row with Swap Button */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-start relative">
        <div className="md:col-span-5">
          <StationAutocomplete
            id="from-station"
            label="From Station"
            placeholder="Search origin station (e.g. NDLS)..."
            value={fromStation}
            onChange={(station) => {
              setFromStation(station);
              if (formErrors.from) {
                setFormErrors((prev) => ({ ...prev, from: undefined }));
              }
            }}
            error={formErrors.from}
            disabled={isLoading}
            required
          />
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex items-center justify-center pt-2 md:pt-6">
          <button
            type="button"
            onClick={handleSwapStations}
            disabled={isLoading}
            className="w-10 h-10 rounded-full border border-surface-container-high bg-surface-container-low hover:bg-surface-container text-on-surface hover:text-primary transition-all flex items-center justify-center shadow-xs cursor-pointer hover:rotate-180 disabled:opacity-50"
            title="Swap Origin and Destination"
            aria-label="Swap Origin and Destination Stations"
          >
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
          </button>
        </div>

        <div className="md:col-span-5">
          <StationAutocomplete
            id="to-station"
            label="To Station"
            placeholder="Search destination station (e.g. MMCT)..."
            value={toStation}
            onChange={(station) => {
              setToStation(station);
              if (formErrors.to) {
                setFormErrors((prev) => ({ ...prev, to: undefined }));
              }
            }}
            error={formErrors.to}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Date and Quick Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end">
        {/* Journey Date */}
        <div className="sm:col-span-1 md:col-span-4 flex flex-col gap-1.5">
          <label
            htmlFor="journey-date"
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between"
          >
            <span>Journey Date <span className="text-rose-500">*</span></span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 material-symbols-outlined text-[18px] text-on-surface-variant pointer-events-none">
              calendar_today
            </span>
            <input
              id="journey-date"
              type="date"
              min={todayStr}
              value={journeyDate}
              onChange={(e) => {
                setJourneyDate(e.target.value);
                if (formErrors.date) {
                  setFormErrors((prev) => ({ ...prev, date: undefined }));
                }
              }}
              disabled={isLoading}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none bg-surface-container-lowest text-on-surface ${
                formErrors.date
                  ? "border-rose-500 ring-1 ring-rose-500"
                  : "border-surface-container-high hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>
          {formErrors.date && (
            <p className="text-[11px] text-rose-600 font-medium">{formErrors.date}</p>
          )}
        </div>

        {/* Train Type Filter */}
        <div className="sm:col-span-1 md:col-span-4 flex flex-col gap-1.5">
          <label
            htmlFor="train-type"
            className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Train Type
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 material-symbols-outlined text-[18px] text-on-surface-variant pointer-events-none">
              tune
            </span>
            <select
              id="train-type"
              value={trainType}
              onChange={(e) => setTrainType(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-surface-container-high hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-medium transition-all outline-none bg-surface-container-lowest text-on-surface cursor-pointer disabled:opacity-50"
            >
              {TRAIN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div className="sm:col-span-2 md:col-span-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[42px] px-6 rounded-xl bg-primary hover:bg-primary-container text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Searching Trains...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">search</span>
                <span>Search Trains</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filter Toggle & Controls */}
      <div className="pt-2 border-t border-surface-container-high/40 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showAdvanced ? "tune" : "expand_more"}
            </span>
            <span>{showAdvanced ? "Hide Advanced Options" : "More Options (City Search, Category, Live Delays)"}</span>
          </button>

          <span className="text-[11px] text-on-surface-variant">
            Powered by RailRadar Indian Railways API
          </span>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 animate-in fade-in duration-200">
            {/* Category Filter */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="train-category"
                className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Category
              </label>
              <select
                id="train-category"
                value={trainCategory}
                onChange={(e) => setTrainCategory(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs sm:text-sm font-medium bg-surface-container-lowest text-on-surface outline-none cursor-pointer"
              >
                {TRAIN_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* By City Toggle */}
            <div className="flex items-center gap-2.5 pt-4 sm:pt-6">
              <input
                id="by-city"
                type="checkbox"
                checked={byCity}
                onChange={(e) => setByCity(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-primary rounded border-surface-container-high focus:ring-primary cursor-pointer"
              />
              <label htmlFor="by-city" className="text-xs font-medium text-on-surface cursor-pointer select-none">
                Include all metro city stations
              </label>
            </div>

            {/* Live Information Toggle */}
            <div className="flex items-center gap-2.5 pt-4 sm:pt-6">
              <input
                id="live-info"
                type="checkbox"
                checked={live}
                onChange={(e) => setLive(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-primary rounded border-surface-container-high focus:ring-primary cursor-pointer"
              />
              <label htmlFor="live-info" className="text-xs font-medium text-on-surface cursor-pointer select-none">
                Include live delay status
              </label>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
