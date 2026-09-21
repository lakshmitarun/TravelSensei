"use client";

import React from "react";
import { TrainResult } from "@/lib/trains/types";

interface TrainCardProps {
  train: TrainResult;
  className?: string;
}

const ALL_WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isRunningOnDay(runDays: string[], day: string): boolean {
  if (!runDays || runDays.length === 0) return true;
  const dayPrefix = day.slice(0, 1).toUpperCase();
  const dayShort = day.slice(0, 3).toUpperCase();

  return runDays.some((rd) => {
    const upper = rd.toUpperCase();
    return upper === dayShort || upper === dayPrefix || upper === day.toUpperCase() || upper === "DAILY";
  });
}

export default function TrainCard({ train, className = "" }: TrainCardProps) {
  const {
    trainNumber,
    trainName,
    trainType,
    runDays,
    departure,
    arrival,
    distanceKm,
    duration,
    totalHaltsBetween,
    live,
  } = train;

  const isMultiDay = arrival.day > departure.day;
  const dayDiff = Math.max(0, arrival.day - departure.day);

  return (
    <div
      className={`bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl border border-surface-container-high/60 transition-all flex flex-col gap-5 ${className}`}
    >
      {/* 1. Header: Train Number, Name, Type & Live Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-high/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">train</span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs sm:text-sm font-extrabold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                #{trainNumber || "IR"}
              </span>
              <h3 className="font-headline-sm text-sm sm:text-base font-extrabold text-on-surface truncate">
                {trainName || "Indian Railways Train"}
              </h3>
            </div>
            {trainType && (
              <span className="text-[11px] text-on-surface-variant font-medium">
                {trainType}
              </span>
            )}
          </div>
        </div>

        {/* Live Status or Type Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {live && typeof live === "object" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Updates Active</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant border border-surface-container-high">
              Timetable Schedule
            </span>
          )}
        </div>
      </div>

      {/* 2. Main Schedule Grid */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* Departure Station */}
        <div className="col-span-4 sm:col-span-3 flex flex-col">
          <span className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
            {departure.time || "--:--"}
          </span>
          <span className="font-mono text-xs sm:text-sm font-bold text-primary">
            {departure.stationCode}
          </span>
          <span className="text-[11px] sm:text-xs text-on-surface-variant truncate" title={departure.stationName}>
            {departure.stationName || "Origin Station"}
          </span>
        </div>

        {/* Center Journey Track */}
        <div className="col-span-4 sm:col-span-6 flex flex-col items-center gap-1">
          <span className="text-[11px] sm:text-xs text-on-surface-variant font-semibold">
            {duration || "Direct"}
          </span>

          <div className="w-full flex items-center gap-1.5 my-0.5">
            <span className="w-2 h-2 rounded-full border-2 border-primary bg-surface-container-lowest shrink-0"></span>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/30 via-primary to-primary/30 relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 material-symbols-outlined text-primary text-[14px]">
                train
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
          </div>

          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-on-surface-variant">
            {distanceKm > 0 && <span>{distanceKm.toLocaleString()} km</span>}
            {distanceKm > 0 && <span>•</span>}
            <span>{totalHaltsBetween} {totalHaltsBetween === 1 ? "halt" : "halts"}</span>
          </div>
        </div>

        {/* Arrival Station */}
        <div className="col-span-4 sm:col-span-3 flex flex-col items-end text-right">
          <div className="flex items-center gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
              {arrival.time || "--:--"}
            </span>
            {isMultiDay && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded" title={`Arrives ${dayDiff} day later`}>
                +{dayDiff}d
              </span>
            )}
          </div>
          <span className="font-mono text-xs sm:text-sm font-bold text-primary">
            {arrival.stationCode}
          </span>
          <span className="text-[11px] sm:text-xs text-on-surface-variant truncate max-w-full" title={arrival.stationName}>
            {arrival.stationName || "Destination Station"}
          </span>
        </div>
      </div>

      {/* 3. Footer: Running Days & Halts Information */}
      <div className="pt-3 border-t border-surface-container-high/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Runs:
          </span>
          <div className="flex items-center gap-1">
            {ALL_WEEK_DAYS.map((day) => {
              const active = isRunningOnDay(runDays, day);
              return (
                <span
                  key={day}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-container-low text-on-surface-variant/40"
                  }`}
                  title={`${day}: ${active ? "Runs" : "Does not run"}`}
                >
                  {day.slice(0, 1)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
          <span>Halt seq: #{departure.sequence} → #{arrival.sequence}</span>
        </div>
      </div>
    </div>
  );
}
