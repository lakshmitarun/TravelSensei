/**
 * TravelSensei Geocoding Types
 * Normalized provider-agnostic representations for location geocoding and search.
 */

export interface GeocodingLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
  population?: number;
  featureCode?: string;
}

export interface GeocodingSearchResult {
  query: string;
  results: GeocodingLocation[];
  provider: "open-meteo";
}

export interface GeocodingSearchParams {
  query: string;
  count?: number;
  language?: string;
  countryCode?: string;
}

export interface GeocodingApiResponse {
  success: boolean;
  data?: GeocodingSearchResult;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
