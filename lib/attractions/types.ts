/**
 * Types for Geoapify Attractions Backend Feature
 */

export interface AttractionItem {
  id: string;
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number | null;
  formattedAddress: string | null;
  formatted?: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  categories: string[];
}

export type AttractionDestinationCategory =
  | "nature"
  | "beach"
  | "mountain"
  | "city"
  | "historical"
  | "religious"
  | "cultural"
  | "adventure"
  | "mixed";

export interface AttractionsQueryParams {
  latitude: number;
  longitude: number;
  radius?: number; // meters (min 100, max 25000, default 5000)
  limit?: number; // min 1, max 20, default 20
  categories?: string[]; // optional explicit category override
  destinationType?: string;
  destinationName?: string;
  stateCountry?: string;
  travelStyles?: string[] | string;
  activities?: string[] | string;
  description?: string;
}

export interface AttractionsResponseData {
  attractions: AttractionItem[];
  count: number;
  radiusMeters: number;
  provider: "geoapify";
}

export interface AttractionApiError {
  code: string;
  message: string;
}

export interface AttractionsApiResponse {
  success: boolean;
  data?: AttractionsResponseData;
  error?: AttractionApiError;
  message?: string;
}

export class GeoapifyAttractionError extends Error {
  public status: number;
  public code: string;

  constructor(
    status: number = 502,
    message: string = "Nearby attraction service is temporarily unavailable.",
    code: string = "ATTRACTION_PROVIDER_ERROR"
  ) {
    super(message);
    this.name = "GeoapifyAttractionError";
    this.status = status;
    this.code = code;
  }
}

// Raw Geoapify Response Types
export interface GeoapifyFeatureProperties {
  place_id?: string;
  name?: string;
  lat?: number;
  lon?: number;
  distance?: number;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  categories?: string[];
  [key: string]: unknown;
}

export interface GeoapifyFeatureGeometry {
  type: string;
  coordinates: [number, number]; // [lon, lat]
}

export interface GeoapifyFeature {
  type: string;
  geometry?: GeoapifyFeatureGeometry;
  properties?: GeoapifyFeatureProperties;
}

export interface GeoapifyPlacesResponse {
  type?: "FeatureCollection";
  features?: GeoapifyFeature[];
  statusCode?: number;
  error?: string;
  message?: string;
}

// Attraction Details Types
export interface AttractionHistoricDetails {
  type?: string | null;
  period?: string | null;
  importance?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface AttractionHeritageDetails {
  description?: string | null;
  operator?: string | null;
  website?: string | null;
}

export interface AttractionDetailsData {
  placeId: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  categories: string[];
  openingHours: string | null;
  website: string | null;
  historic: AttractionHistoricDetails | null;
  heritage: AttractionHeritageDetails | null;
  image: string | null;
  wikipedia: string | null;
  wikimediaCommons: string | null;
}

export interface AttractionDetailsApiResponse {
  success: boolean;
  data?: AttractionDetailsData;
  error?: AttractionApiError;
  message?: string;
}

