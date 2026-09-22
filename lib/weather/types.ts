/**
 * TravelSensei Weather Types
 * Normalized provider-agnostic representations for weather forecasts and conditions.
 */

export interface WeatherLocation {
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  precipitation: number;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface WeatherUnits {
  temperature: string;
  windSpeed: string;
  precipitation: string;
}

export interface WeatherData {
  location: WeatherLocation;
  timezone: string;
  current: CurrentWeather;
  daily: DailyForecast[];
  units?: WeatherUnits;
  provider: "open-meteo";
}

export interface WeatherQueryParams {
  latitude: number;
  longitude: number;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export interface WeatherApiResponse {
  success: boolean;
  data?: WeatherData;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
