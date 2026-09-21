import {
  MapCoordinate,
  RouteProfile,
  DirectionsRequest,
  DirectionsStep,
  DirectionsRoute,
  DirectionsResult,
} from "./types";

// Human-readable mapping for OpenRouteService step maneuver types
const STEP_ACTION_MAP: Record<number, string> = {
  0: "Turn left",
  1: "Turn right",
  2: "Turn sharp left",
  3: "Turn sharp right",
  4: "Turn slight left",
  5: "Turn slight right",
  6: "Continue straight",
  7: "Enter roundabout",
  8: "Exit roundabout",
  9: "Make U-turn",
  10: "Arrive at destination",
  11: "Depart",
  12: "Keep left",
  13: "Keep right",
};

// Raw OpenRouteService Response Types (internal to adapter)
interface RawOrsStep {
  distance?: number;
  duration?: number;
  type?: number;
  instruction?: string;
  name?: string;
  way_points?: [number, number];
}

interface RawOrsSegment {
  distance?: number;
  duration?: number;
  steps?: RawOrsStep[];
}

interface RawOrsRoute {
  summary?: {
    distance?: number;
    duration?: number;
  };
  segments?: RawOrsSegment[];
  bbox?: [number, number, number, number];
  geometry?: string;
  warnings?: Array<{ code?: number; message?: string }>;
}

interface RawOrsDirectionsResponse {
  routes?: RawOrsRoute[];
  bbox?: [number, number, number, number];
  metadata?: {
    attribution?: string;
    service?: string;
    timestamp?: number;
    engine?: {
      version?: string;
      build_date?: string;
    };
  };
  error?: {
    code?: number | string;
    message?: string;
  };
  message?: string;
}

// Custom error class for OpenRouteService failures
export class OpenRouteServiceApiError extends Error {
  public status: number;
  public code: string;

  constructor(status: number, message: string, code: string = "ORS_ERROR") {
    super(message);
    this.name = "OpenRouteServiceApiError";
    this.status = status;
    this.code = code;
  }
}

function getOrsConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  const baseUrl = (
    process.env.OPENROUTESERVICE_API_BASE_URL || "https://api.heigit.org"
  ).replace(/\/+$/, "");

  if (!apiKey || !apiKey.trim()) {
    throw new OpenRouteServiceApiError(
      503,
      "Directions service is not configured. Missing API key.",
      "MISSING_API_KEY"
    );
  }

  return { apiKey: apiKey.trim(), baseUrl };
}

function mapOrsError(status: number, rawData?: Record<string, unknown>): OpenRouteServiceApiError {
  const providerError =
    typeof rawData?.error === "object" && rawData?.error !== null
      ? (rawData.error as Record<string, unknown>)
      : undefined;

  const providerMessage =
    typeof providerError?.message === "string"
      ? providerError.message
      : typeof rawData?.message === "string"
      ? rawData.message
      : undefined;

  const providerCode =
    typeof providerError?.code === "string"
      ? providerError.code
      : typeof providerError?.code === "number"
      ? String(providerError.code)
      : "PROVIDER_ERROR";

  switch (status) {
    case 400:
      return new OpenRouteServiceApiError(
        400,
        providerMessage || "Invalid directions request parameters.",
        "BAD_REQUEST"
      );
    case 401:
      return new OpenRouteServiceApiError(
        401,
        "Directions service authentication failed. Invalid API key.",
        "UNAUTHORIZED"
      );
    case 403:
      return new OpenRouteServiceApiError(
        403,
        providerMessage || "Directions service access forbidden.",
        "FORBIDDEN"
      );
    case 404:
      return new OpenRouteServiceApiError(
        404,
        providerMessage || "No route could be found between the specified coordinates.",
        "NOT_FOUND"
      );
    case 429:
      return new OpenRouteServiceApiError(
        429,
        "Too many directions requests. Please try again shortly.",
        "RATE_LIMITED"
      );
    case 500:
      return new OpenRouteServiceApiError(
        500,
        "Directions service encountered an internal error.",
        "SERVICE_ERROR"
      );
    case 502:
    case 503:
      return new OpenRouteServiceApiError(
        503,
        "Directions service is temporarily unavailable.",
        "SERVICE_UNAVAILABLE"
      );
    default:
      return new OpenRouteServiceApiError(
        status >= 500 ? 502 : status,
        providerMessage || "Unable to retrieve directions.",
        providerCode
      );
  }
}

function normalizeStep(rawStep: RawOrsStep): DirectionsStep {
  const stepType = typeof rawStep.type === "number" ? rawStep.type : undefined;
  const action = stepType !== undefined ? STEP_ACTION_MAP[stepType] || "Continue" : undefined;

  return {
    instruction: rawStep.instruction || action || "Proceed",
    distanceMeters: typeof rawStep.distance === "number" ? rawStep.distance : 0,
    durationSeconds: typeof rawStep.duration === "number" ? rawStep.duration : 0,
    name: rawStep.name || undefined,
    type: stepType,
    action,
    wayPoints: rawStep.way_points,
  };
}

function normalizeRoute(rawRoute: RawOrsRoute): DirectionsRoute {
  const distanceMeters = rawRoute.summary?.distance ?? 0;
  const durationSeconds = rawRoute.summary?.duration ?? 0;
  const distanceKm = Number((distanceMeters / 1000).toFixed(2));
  const durationMinutes = Number((durationSeconds / 60).toFixed(1));

  const steps: DirectionsStep[] = [];
  if (Array.isArray(rawRoute.segments)) {
    for (const segment of rawRoute.segments) {
      if (Array.isArray(segment.steps)) {
        for (const step of segment.steps) {
          steps.push(normalizeStep(step));
        }
      }
    }
  }

  const warnings = Array.isArray(rawRoute.warnings)
    ? rawRoute.warnings.map((w) => w.message || String(w)).filter(Boolean)
    : undefined;

  return {
    summary: {
      distanceMeters,
      durationSeconds,
      distanceKm,
      durationMinutes,
    },
    distanceMeters,
    durationSeconds,
    distanceKm,
    durationMinutes,
    geometry: typeof rawRoute.geometry === "string" ? rawRoute.geometry : undefined,
    bbox: rawRoute.bbox,
    steps: steps.length > 0 ? steps : undefined,
    warnings: warnings && warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Request driving, cycling, or walking directions between two coordinates via OpenRouteService.
 */
export async function getDirections(request: DirectionsRequest): Promise<DirectionsResult> {
  const { apiKey, baseUrl } = getOrsConfig();

  // Validate profile
  const validProfiles: RouteProfile[] = ["driving-car", "cycling-regular", "foot-walking"];
  if (!validProfiles.includes(request.profile)) {
    throw new OpenRouteServiceApiError(
      400,
      `Unsupported route profile: ${request.profile}. Must be driving-car, cycling-regular, or foot-walking.`,
      "INVALID_PROFILE"
    );
  }

  // OpenRouteService coordinates format: [ [longitude, latitude], [longitude, latitude] ]
  const coordinates = [
    [request.origin.longitude, request.origin.latitude],
    [request.destination.longitude, request.destination.latitude],
  ];

  const requestBody: Record<string, unknown> = {
    coordinates,
    instructions: request.instructions ?? true,
    geometry: request.geometry ?? true,
  };

  if (request.preference && request.profile === "driving-car") {
    requestBody.preference = request.preference;
  }

  if (request.units) {
    requestBody.units = request.units;
  }

  const basePath = baseUrl.endsWith("/openrouteservice")
    ? baseUrl
    : baseUrl.includes("heigit.org")
    ? `${baseUrl}/openrouteservice`
    : baseUrl;
  const url = `${basePath}/v2/directions/${request.profile}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
  } catch {
    throw new OpenRouteServiceApiError(
      503,
      "Failed to connect to directions service. Please check network connectivity.",
      "NETWORK_ERROR"
    );
  }

  if (!res.ok) {
    let errorData: Record<string, unknown> | undefined;
    try {
      errorData = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore json parse failure
    }
    throw mapOrsError(res.status, errorData);
  }

  const rawJson = (await res.json()) as RawOrsDirectionsResponse;

  if (!Array.isArray(rawJson.routes) || rawJson.routes.length === 0) {
    throw new OpenRouteServiceApiError(
      404,
      "No route could be found for the given coordinates.",
      "NOT_FOUND"
    );
  }

  const routes: DirectionsRoute[] = rawJson.routes.map(normalizeRoute);

  return {
    routes,
    origin: request.origin,
    destination: request.destination,
    profile: request.profile,
    provider: "openrouteservice",
    metadata: {
      attribution: rawJson.metadata?.attribution || "openrouteservice.org | OpenStreetMap contributors",
      engine: rawJson.metadata?.service || "routing",
      timestamp: rawJson.metadata?.timestamp,
    },
  };
}
