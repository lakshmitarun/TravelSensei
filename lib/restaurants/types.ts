/**
 * Types for OpenStreetMap Overpass Restaurants Feature
 */

export interface RestaurantPhoto {
  url: string;
  source: string; // e.g. "openstreetmap" | "unsplash" | "placeholder"
  isExactPlacePhoto: boolean;
}

export interface RestaurantItem {
  id: string; // e.g. "node/123456" or "way/789012"
  name: string;
  latitude: number;
  longitude: number;
  cuisine: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  wheelchair: string | null;
  distanceMeters: number;
  photo?: RestaurantPhoto | null;
}

export interface RestaurantsQueryParams {
  latitude: number;
  longitude: number;
  radius?: number; // meters (min 500, max 10000, default 3000)
  limit?: number; // max results (min 1, max 50, default 20)
}

export interface RestaurantsResponseData {
  restaurants: RestaurantItem[];
  count: number;
  radiusMeters: number;
  provider: "openstreetmap-overpass";
}

export interface RestaurantApiError {
  code: string;
  message: string;
}

export interface RestaurantsApiResponse {
  success: boolean;
  data?: RestaurantsResponseData;
  error?: RestaurantApiError;
  message?: string;
}

export class OverpassRestaurantError extends Error {
  public status: number;
  public code: string;

  constructor(
    message: string = "Nearby restaurant service is temporarily unavailable.",
    status: number = 502,
    code: string = "RESTAURANT_PROVIDER_UNAVAILABLE"
  ) {
    super(message);
    this.name = "OverpassRestaurantError";
    this.status = status;
    this.code = code;
  }
}

