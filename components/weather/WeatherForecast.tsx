"use client";

import React from "react";
import { DailyForecast, WeatherUnits } from "@/lib/weather/types";
import { getWeatherCondition } from "./WeatherCard";

export interface WeatherForecastProps {
  daily: DailyForecast[];
  units?: WeatherUnits;
  className?: string;
}

function formatForecastDate(dateStr: string, index: number): { dayLabel: string; formattedDate: string } {
  if (index === 0) {
    return { dayLabel: "Today", formattedDate: dateStr };
  }
  if (index === 1) {
    return { dayLabel: "Tomorrow", formattedDate: dateStr };
  }

  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return { dayLabel: dayName, formattedDate: formatted };
  } catch {
    return { dayLabel: `Day ${index + 1}`, formattedDate: dateStr };
  }
}

export default function WeatherForecast({
  daily,
  units,
  className = "",
}: WeatherForecastProps) {
  if (!daily || daily.length === 0) {
    return null;
  }

  const tempUnit = units?.temperature || "°C";

  return (
    <div
      id="weather-forecast-container"
      className={`flex flex-col gap-3.5 ${className}`}
      aria-label="Multi-day weather forecast"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            date_range
          </span>
          <h4 className="font-headline-sm text-sm font-bold text-on-surface tracking-tight">
            7-Day Forecast
          </h4>
        </div>
        <span className="text-[11px] font-medium text-on-surface-variant">
          Expected conditions
        </span>
      </div>

      {/* Responsive Horizontal Scroll / Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {daily.map((item, index) => {
          const { dayLabel, formattedDate } = formatForecastDate(item.date, index);
          const condition = getWeatherCondition(item.weatherCode);
          const isToday = index === 0;

          return (
            <div
              key={item.date || index}
              id={`forecast-day-${index}`}
              className={`flex flex-col items-center justify-between p-3 rounded-2xl border transition-all duration-200 text-center gap-2 ${
                isToday
                  ? "bg-primary/5 border-primary/30 shadow-xs ring-1 ring-primary/20"
                  : "bg-surface-container-lowest border-surface-container-high/60 hover:border-surface-container-highest hover:shadow-xs"
              }`}
            >
              {/* Day Label & Date */}
              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-bold leading-tight ${
                    isToday ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {dayLabel}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  {formattedDate}
                </span>
              </div>

              {/* Weather Condition Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container text-primary shrink-0"
                title={condition.label}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {condition.icon}
                </span>
              </div>

              {/* Condition Label */}
              <span
                className="text-[11px] font-semibold text-on-surface-variant line-clamp-1 max-w-full"
                title={condition.label}
              >
                {condition.label}
              </span>

              {/* Min / Max Temperatures */}
              <div
                className="flex items-baseline justify-center gap-1.5 pt-1 border-t border-surface-container-high/40 w-full"
                aria-label={`High ${Math.round(item.temperatureMax)}${tempUnit}, Low ${Math.round(item.temperatureMin)}${tempUnit}`}
              >
                <span className="text-xs font-extrabold text-on-surface">
                  {Math.round(item.temperatureMax)}{tempUnit}
                </span>
                <span className="text-[10px] font-medium text-on-surface-variant">
                  {Math.round(item.temperatureMin)}{tempUnit}
                </span>
              </div>

              {/* Precipitation Probability */}
              <div
                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary"
                title={`Precipitation probability: ${item.precipitationProbability}%`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  water_drop
                </span>
                <span>{item.precipitationProbability}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
