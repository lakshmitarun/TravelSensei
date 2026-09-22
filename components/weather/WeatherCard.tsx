"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WeatherData } from "@/lib/weather/types";
import WeatherForecast from "./WeatherForecast";

export interface WeatherCardProps {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
  className?: string;
}

/**
 * Maps standard Open-Meteo WMO weather codes to human-readable labels and Material Symbols icons.
 */
export function getWeatherCondition(code: number): { label: string; icon: string } {
  switch (code) {
    case 0:
      return { label: "Clear sky", icon: "sunny" };
    case 1:
      return { label: "Mainly clear", icon: "wb_sunny" };
    case 2:
      return { label: "Partly cloudy", icon: "partly_cloudy_day" };
    case 3:
      return { label: "Overcast", icon: "cloud" };
    case 45:
    case 48:
      return { label: "Fog", icon: "foggy" };
    case 51:
    case 53:
    case 55:
      return { label: "Drizzle", icon: "grain" };
    case 56:
    case 57:
      return { label: "Freezing drizzle", icon: "weather_snowy" };
    case 61:
    case 63:
    case 65:
      return { label: "Rain", icon: "rainy" };
    case 66:
    case 67:
      return { label: "Freezing rain", icon: "weather_snowy" };
    case 71:
    case 73:
    case 75:
      return { label: "Snow", icon: "ac_unit" };
    case 77:
      return { label: "Snow grains", icon: "ac_unit" };
    case 80:
    case 81:
    case 82:
      return { label: "Rain showers", icon: "shower" };
    case 85:
    case 86:
      return { label: "Snow showers", icon: "weather_snowy" };
    case 95:
      return { label: "Thunderstorm", icon: "thunderstorm" };
    case 96:
    case 99:
      return { label: "Thunderstorm with hail", icon: "thunderstorm" };
    default:
      return { label: "Partly cloudy", icon: "partly_cloudy_day" };
  }
}

function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export default function WeatherCard({
  latitude,
  longitude,
  locationName,
  className = "",
}: WeatherCardProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidCoordinates = isValidCoordinate(latitude, longitude);

  const fetchWeather = useCallback(async (signal?: AbortSignal) => {
    if (!isValidCoordinate(latitude, longitude)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("latitude", String(latitude));
      queryParams.set("longitude", String(longitude));

      const res = await fetch(`/api/weather?${queryParams.toString()}`, { signal });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        setWeatherData(json.data);
      } else {
        setWeatherData(null);
        if (res.status === 401) {
          setError("Please sign in to view weather information.");
        } else {
          setError(json.message || "Weather information is currently unavailable.");
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setWeatherData(null);
      setError("Weather information is currently unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!hasValidCoordinates) {
      setWeatherData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    fetchWeather(controller.signal);

    return () => {
      controller.abort();
    };
  }, [hasValidCoordinates, fetchWeather]);

  // Case 1: Missing or invalid coordinates
  if (!hasValidCoordinates) {
    return (
      <div
        id="weather-card-empty"
        className={`bg-surface-container-low rounded-3xl p-5 sm:p-6 border border-surface-container-high/60 flex items-center gap-3.5 text-on-surface-variant ${className}`}
      >
        <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-on-surface-variant/70">
          <span className="material-symbols-outlined text-[22px]">cloud_off</span>
        </div>
        <div className="flex flex-col">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Destination Weather
          </h4>
          <p className="text-xs text-on-surface-variant">
            Weather coordinates are unavailable for this destination.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="weather-card-container"
      className={`bg-surface-container-low rounded-3xl p-5 sm:p-7 border border-surface-container-high/60 shadow-xs flex flex-col gap-6 ${className}`}
      role="region"
      aria-label={`Weather forecast for ${locationName || "destination"}`}
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container-high/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">partly_cloudy_day</span>
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline-sm text-lg sm:text-xl font-extrabold text-on-surface">
              {locationName ? `Weather in ${locationName}` : "Destination Weather"}
            </h3>
            <p className="text-xs text-on-surface-variant">
              Live conditions & forecast for your travel destination.
            </p>
          </div>
        </div>

        {weatherData?.timezone && (
          <span className="self-start sm:self-auto text-[11px] font-medium px-3 py-1 rounded-full bg-surface-container-lowest border border-surface-container-high/60 text-on-surface-variant">
            {weatherData.timezone}
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && !weatherData && (
        <div
          id="weather-loading-indicator"
          className="p-8 rounded-2xl bg-surface-container-lowest/70 border border-primary/20 flex flex-col items-center justify-center gap-3 text-xs font-semibold text-primary animate-pulse"
        >
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Fetching destination weather forecast...</span>
        </div>
      )}

      {/* Error State with Retry Button */}
      {error && !isLoading && (
        <div
          id="weather-error-state"
          className="p-6 rounded-2xl bg-surface-container-lowest border border-rose-200/80 text-center flex flex-col items-center gap-3 animate-in fade-in duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">cloud_off</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-sm font-bold text-on-surface">Weather Data Unavailable</h4>
            <p className="text-xs text-on-surface-variant max-w-md">{error}</p>
          </div>
          <button
            type="button"
            id="btn-retry-weather"
            onClick={() => fetchWeather()}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            aria-label="Retry loading weather information"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Weather</span>
          </button>
        </div>
      )}

      {/* Loaded Weather Content */}
      {weatherData && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Current Weather Overview Card */}
          <div
            id="weather-current-conditions"
            className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/5 border border-surface-container-high/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs"
          >
            {/* Left: Big Temp & Condition */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[36px] sm:text-[44px]">
                  {getWeatherCondition(weatherData.current.weatherCode).icon}
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span
                    id="current-weather-temp"
                    className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight"
                  >
                    {Math.round(weatherData.current.temperature)}
                    {weatherData.units?.temperature || "°C"}
                  </span>
                  <span
                    id="current-weather-condition"
                    className="text-sm sm:text-base font-bold text-primary"
                  >
                    {getWeatherCondition(weatherData.current.weatherCode).label}
                  </span>
                </div>

                <span
                  id="current-weather-feels-like"
                  className="text-xs sm:text-sm text-on-surface-variant font-medium pt-0.5"
                >
                  Feels like {Math.round(weatherData.current.apparentTemperature)}
                  {weatherData.units?.temperature || "°C"}
                </span>
              </div>
            </div>

            {/* Right: Key Atmosphere Metrics */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              {/* Wind Speed */}
              <div
                id="current-weather-wind"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 min-w-[130px]"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[18px]">air</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Wind
                  </span>
                  <span className="text-xs font-extrabold text-on-surface">
                    {weatherData.current.windSpeed} {weatherData.units?.windSpeed || "km/h"}
                  </span>
                </div>
              </div>

              {/* Precipitation */}
              <div
                id="current-weather-precip"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 min-w-[130px]"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[18px]">water_drop</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Precipitation
                  </span>
                  <span className="text-xs font-extrabold text-on-surface">
                    {weatherData.current.precipitation} {weatherData.units?.precipitation || "mm"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Day Forecast */}
          <WeatherForecast
            daily={weatherData.daily}
            units={weatherData.units}
          />

          {/* Attribution Footer */}
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant/80 pt-2 border-t border-surface-container-high/30">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>Weather data provided by Open-Meteo</span>
            </span>
            <button
              type="button"
              onClick={() => fetchWeather()}
              disabled={isLoading}
              className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1 font-semibold"
              title="Refresh weather data"
            >
              <span className={`material-symbols-outlined text-[13px] ${isLoading ? "animate-spin" : ""}`}>
                refresh
              </span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
