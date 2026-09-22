/**
 * Open-Meteo Weather Client
 * Free and keyless weather forecast service for trip planning.
 * Docs: https://open-meteo.com/en/docs
 */

import {
  WeatherData,
  WeatherQueryParams,
  DailyForecast,
} from "./types";

export class OpenMeteoWeatherError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 500, code: string = "WEATHER_ERROR") {
    super(message);
    this.name = "OpenMeteoWeatherError";
    this.status = status;
    this.code = code;
  }
}

// Raw Open-Meteo Forecast Response Interfaces
interface RawOpenMeteoCurrent {
  time?: string;
  interval?: number;
  temperature_2m?: number;
  apparent_temperature?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  precipitation?: number;
}

interface RawOpenMeteoDaily {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: (number | null)[];
  weather_code?: number[];
}

interface RawOpenMeteoUnits {
  temperature_2m?: string;
  wind_speed_10m?: string;
  precipitation?: string;
}

interface RawOpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  elevation?: number;
  current_units?: RawOpenMeteoUnits;
  current?: RawOpenMeteoCurrent;
  daily?: RawOpenMeteoDaily;
  error?: boolean;
  reason?: string;
}

const DEFAULT_BASE_URL = "https://api.open-meteo.com";
const DEFAULT_TIMEOUT_MS = 8000;

// Lightweight in-memory cache
interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 500;

function buildCacheKey(
  lat: number,
  lng: number,
  startDate?: string,
  endDate?: string,
  timezone?: string
): string {
  const roundLat = Number(lat.toFixed(3));
  const roundLng = Number(lng.toFixed(3));
  return `${roundLat}:${roundLng}:${startDate || ""}:${endDate || ""}:${timezone || "auto"}`;
}

function getFromCache(key: string): WeatherData | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function saveToCache(key: string, data: WeatherData): void {
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = CACHE.keys().next().value;
    if (oldestKey) CACHE.delete(oldestKey);
  }
  CACHE.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Clear the internal weather cache (useful for testing).
 */
export function clearWeatherCache(): void {
  CACHE.clear();
}

/**
 * Fetches normalized weather data for the specified coordinates from Open-Meteo.
 */
export async function getWeather(params: WeatherQueryParams): Promise<WeatherData> {
  const { latitude, longitude, startDate, endDate, timezone } = params;

  if (typeof latitude !== "number" || isNaN(latitude) || !isFinite(latitude)) {
    throw new OpenMeteoWeatherError(
      "Latitude must be a valid finite number.",
      400,
      "INVALID_LATITUDE"
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new OpenMeteoWeatherError(
      "Latitude must be between -90 and 90.",
      400,
      "INVALID_LATITUDE"
    );
  }

  if (typeof longitude !== "number" || isNaN(longitude) || !isFinite(longitude)) {
    throw new OpenMeteoWeatherError(
      "Longitude must be a valid finite number.",
      400,
      "INVALID_LONGITUDE"
    );
  }

  if (longitude < -180 || longitude > 180) {
    throw new OpenMeteoWeatherError(
      "Longitude must be between -180 and 180.",
      400,
      "INVALID_LONGITUDE"
    );
  }

  if (startDate && endDate && startDate > endDate) {
    throw new OpenMeteoWeatherError(
      "startDate cannot be after endDate.",
      400,
      "INVALID_DATE_RANGE"
    );
  }

  // Check in-memory cache
  const cacheKey = buildCacheKey(latitude, longitude, startDate, endDate, timezone);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const baseUrl = process.env.OPENMETEO_WEATHER_BASE_URL || DEFAULT_BASE_URL;
  const url = new URL("/v1/forecast", baseUrl);

  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation"
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"
  );
  url.searchParams.set("timezone", timezone || "auto");

  if (startDate) {
    url.searchParams.set("start_date", startDate);
  }
  if (endDate) {
    url.searchParams.set("end_date", endDate);
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new OpenMeteoWeatherError(
        "Open-Meteo weather request timed out.",
        504,
        "WEATHER_TIMEOUT"
      );
    }
    throw new OpenMeteoWeatherError(
      "Unable to connect to Open-Meteo weather service.",
      502,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new OpenMeteoWeatherError(
        "Rate limit reached for weather service. Please wait and try again.",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }
    if (response.status === 400) {
      let reasonMessage = "Invalid weather request to Open-Meteo.";
      try {
        const errorJson = (await response.json()) as { reason?: string };
        if (errorJson.reason) {
          reasonMessage = errorJson.reason;
        }
      } catch {
        // Use fallback reason message
      }
      throw new OpenMeteoWeatherError(reasonMessage, 400, "BAD_REQUEST");
    }
    throw new OpenMeteoWeatherError(
      `Open-Meteo weather service returned an error (${response.status}).`,
      502,
      "PROVIDER_ERROR"
    );
  }

  let rawData: RawOpenMeteoResponse;
  try {
    rawData = (await response.json()) as RawOpenMeteoResponse;
  } catch {
    throw new OpenMeteoWeatherError(
      "Failed to parse weather response from Open-Meteo.",
      502,
      "INVALID_RESPONSE"
    );
  }

  // Parse daily forecast items
  const dailyTimes = Array.isArray(rawData.daily?.time) ? rawData.daily.time : [];
  const maxTemps = Array.isArray(rawData.daily?.temperature_2m_max)
    ? rawData.daily.temperature_2m_max
    : [];
  const minTemps = Array.isArray(rawData.daily?.temperature_2m_min)
    ? rawData.daily.temperature_2m_min
    : [];
  const precipProbs = Array.isArray(rawData.daily?.precipitation_probability_max)
    ? rawData.daily.precipitation_probability_max
    : [];
  const weatherCodes = Array.isArray(rawData.daily?.weather_code)
    ? rawData.daily.weather_code
    : [];

  const daily: DailyForecast[] = dailyTimes.map((dateStr, i) => ({
    date: dateStr,
    temperatureMax: typeof maxTemps[i] === "number" ? maxTemps[i] : 0,
    temperatureMin: typeof minTemps[i] === "number" ? minTemps[i] : 0,
    precipitationProbability:
      typeof precipProbs[i] === "number" && precipProbs[i] !== null ? precipProbs[i]! : 0,
    weatherCode: typeof weatherCodes[i] === "number" ? weatherCodes[i] : 0,
  }));

  const normalizedResult: WeatherData = {
    location: {
      latitude: typeof rawData.latitude === "number" ? rawData.latitude : latitude,
      longitude: typeof rawData.longitude === "number" ? rawData.longitude : longitude,
    },
    timezone: rawData.timezone || timezone || "UTC",
    current: {
      temperature:
        typeof rawData.current?.temperature_2m === "number"
          ? rawData.current.temperature_2m
          : 0,
      apparentTemperature:
        typeof rawData.current?.apparent_temperature === "number"
          ? rawData.current.apparent_temperature
          : 0,
      weatherCode:
        typeof rawData.current?.weather_code === "number"
          ? rawData.current.weather_code
          : 0,
      windSpeed:
        typeof rawData.current?.wind_speed_10m === "number"
          ? rawData.current.wind_speed_10m
          : 0,
      precipitation:
        typeof rawData.current?.precipitation === "number"
          ? rawData.current.precipitation
          : 0,
    },
    daily,
    units: {
      temperature: rawData.current_units?.temperature_2m || "°C",
      windSpeed: rawData.current_units?.wind_speed_10m || "km/h",
      precipitation: rawData.current_units?.precipitation || "mm",
    },
    provider: "open-meteo",
  };

  saveToCache(cacheKey, normalizedResult);

  return normalizedResult;
}
