export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export type RouteProfile = "driving-car" | "cycling-regular" | "foot-walking";

export interface DirectionsRequest {
  origin: MapCoordinate;
  destination: MapCoordinate;
  profile: RouteProfile;
  preference?: "fastest" | "shortest" | "recommended";
  instructions?: boolean;
  geometry?: boolean;
  units?: "m" | "km" | "mi";
}

export interface DirectionsStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name?: string;
  type?: number;
  action?: string;
  wayPoints?: [number, number];
}

export interface DirectionsSummary {
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
}

export interface DirectionsRoute {
  summary: DirectionsSummary;
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  geometry?: string; // Encoded polyline geometry
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  steps?: DirectionsStep[];
  warnings?: string[];
}

export interface DirectionsResult {
  routes: DirectionsRoute[];
  origin: MapCoordinate;
  destination: MapCoordinate;
  profile: RouteProfile;
  provider: "openrouteservice";
  metadata?: {
    attribution?: string;
    engine?: string;
    timestamp?: number;
  };
}

export interface DirectionsResponse {
  success: boolean;
  data?: DirectionsResult;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
