import {
  Airport,
  FlightItinerary,
  FlightLeg,
  FlightSegment,
  FlightSearchRequest,
  FlightSearchResponseData,
} from "./types";

// Raw Ignav API interfaces (Internal to this adapter only)
interface RawIgnavAirport {
  code: string;
  name: string;
  city: string;
  country: string;
}

interface RawIgnavSegment {
  marketing_carrier_code: string | null;
  flight_number: string | null;
  operating_carrier_name: string | null;
  departure_airport: string;
  departure_time_local: string;
  departure_timezone: string | null;
  departure_time_utc: string | null;
  arrival_airport: string;
  arrival_time_local: string;
  arrival_timezone: string | null;
  arrival_time_utc: string | null;
  duration_minutes: number;
  aircraft: string | null;
}

interface RawIgnavLeg {
  carrier: string | null;
  duration_minutes: number | null;
  segments: RawIgnavSegment[];
}

interface RawIgnavPrice {
  amount: number;
  currency: string;
  status: "verified" | "unverified";
}

interface RawIgnavBaggage {
  carry_on: number | null;
  checked: number | null;
}

interface RawIgnavItinerary {
  ignav_id: string;
  price: RawIgnavPrice;
  outbound: RawIgnavLeg;
  inbound?: RawIgnavLeg | null;
  cabin_class?: string | null;
  bags?: RawIgnavBaggage | null;
  requires_self_transfer?: boolean | null;
}

interface RawIgnavFareResponse {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string | null;
  itineraries: RawIgnavItinerary[];
}

interface RawIgnavError {
  error?: {
    type?: string;
    code?: string;
    message?: string;
    field?: string | null;
  };
}

export class IgnavApiError extends Error {
  public status: number;
  public code: string;

  constructor(status: number, message: string, code: string = "IGNAV_ERROR") {
    super(message);
    this.name = "IgnavApiError";
    this.status = status;
    this.code = code;
  }
}

function getIgnavConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.IGNAV_API_KEY;
  const baseUrl = (process.env.IGNAV_API_BASE_URL || "https://ignav.com").replace(/\/+$/, "");

  if (!apiKey || !apiKey.trim()) {
    throw new IgnavApiError(
      503,
      "Flight search service is not configured. Missing API key.",
      "MISSING_API_KEY"
    );
  }

  return { apiKey: apiKey.trim(), baseUrl };
}

function mapIgnavError(status: number, rawData?: RawIgnavError): IgnavApiError {
  const providerMessage = rawData?.error?.message;
  const providerCode = rawData?.error?.code || "PROVIDER_ERROR";

  switch (status) {
    case 400:
      return new IgnavApiError(
        400,
        providerMessage || "Invalid flight search request.",
        "BAD_REQUEST"
      );
    case 401:
      return new IgnavApiError(
        401,
        "Flight search authentication failed.",
        "UNAUTHORIZED"
      );
    case 402:
      return new IgnavApiError(
        402,
        "Flight search quota or payment limit reached.",
        "PAYMENT_REQUIRED"
      );
    case 403:
      return new IgnavApiError(
        403,
        "Flight search access is forbidden.",
        "FORBIDDEN"
      );
    case 424:
      return new IgnavApiError(
        424,
        "Flight provider is temporarily unavailable.",
        "FAILED_DEPENDENCY"
      );
    case 429:
      return new IgnavApiError(
        429,
        "Too many flight searches. Please try again shortly.",
        "RATE_LIMITED"
      );
    case 503:
      return new IgnavApiError(
        503,
        "Flight search is temporarily unavailable.",
        "SERVICE_UNAVAILABLE"
      );
    default:
      return new IgnavApiError(
        status >= 500 ? 502 : status,
        "Unable to search flights right now.",
        providerCode
      );
  }
}

function normalizeSegment(raw: RawIgnavSegment): FlightSegment {
  return {
    marketingCarrierCode: raw.marketing_carrier_code || null,
    flightNumber: raw.flight_number || null,
    operatingCarrierName: raw.operating_carrier_name || null,
    departureAirport: raw.departure_airport || "",
    departureTimeLocal: raw.departure_time_local || "",
    departureTimezone: raw.departure_timezone || null,
    arrivalAirport: raw.arrival_airport || "",
    arrivalTimeLocal: raw.arrival_time_local || "",
    arrivalTimezone: raw.arrival_timezone || null,
    durationMinutes: typeof raw.duration_minutes === "number" ? raw.duration_minutes : 0,
    aircraft: raw.aircraft || null,
  };
}

function normalizeLeg(raw: RawIgnavLeg): FlightLeg {
  const segments = Array.isArray(raw.segments) ? raw.segments.map(normalizeSegment) : [];
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  const totalDuration =
    typeof raw.duration_minutes === "number"
      ? raw.duration_minutes
      : segments.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  return {
    carrier: raw.carrier || firstSeg?.operatingCarrierName || firstSeg?.marketingCarrierCode || null,
    durationMinutes: totalDuration,
    stops: Math.max(0, segments.length - 1),
    origin: firstSeg?.departureAirport || "",
    destination: lastSeg?.arrivalAirport || "",
    departureTime: firstSeg?.departureTimeLocal || "",
    arrivalTime: lastSeg?.arrivalTimeLocal || "",
    segments,
  };
}

function normalizeItinerary(raw: RawIgnavItinerary): FlightItinerary {
  return {
    id: raw.ignav_id || `flt_${Math.random().toString(36).slice(2, 10)}`,
    price: {
      amount: raw.price?.amount ?? 0,
      currency: raw.price?.currency || "INR",
      status: raw.price?.status === "verified" ? "verified" : "unverified",
    },
    cabinClass: raw.cabin_class || null,
    requiresSelfTransfer: Boolean(raw.requires_self_transfer),
    bags: raw.bags
      ? {
          carryOn: raw.bags.carry_on ?? null,
          checked: raw.bags.checked ?? null,
        }
      : null,
    outbound: normalizeLeg(raw.outbound),
    inbound: raw.inbound ? normalizeLeg(raw.inbound) : null,
  };
}

function normalizeFareResponse(
  raw: RawIgnavFareResponse,
  tripType: "one-way" | "round-trip"
): FlightSearchResponseData {
  const rawItineraries = Array.isArray(raw.itineraries) ? raw.itineraries : [];
  return {
    type: tripType,
    origin: raw.origin || "",
    destination: raw.destination || "",
    departureDate: raw.departure_date || "",
    returnDate: raw.return_date || null,
    itineraries: rawItineraries.map(normalizeItinerary),
  };
}

export async function searchAirports(query: string, limit: number = 10): Promise<Airport[]> {
  const { apiKey, baseUrl } = getIgnavConfig();
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const clampedLimit = Math.min(20, Math.max(1, limit));
  const url = `${baseUrl}/api/airports?q=${encodeURIComponent(trimmed)}&limit=${clampedLimit}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (err: unknown) {
    throw new IgnavApiError(503, "Failed to connect to flight provider.", "NETWORK_ERROR");
  }

  if (!res.ok) {
    let errorData: RawIgnavError | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore json parse error
    }
    throw mapIgnavError(res.status, errorData);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item: RawIgnavAirport) => ({
    code: (item.code || "").toUpperCase(),
    name: item.name || "",
    city: item.city || "",
    country: item.country || "",
  }));
}

export async function searchOneWay(params: FlightSearchRequest): Promise<FlightSearchResponseData> {
  const { apiKey, baseUrl } = getIgnavConfig();
  const url = `${baseUrl}/api/fares/one-way`;

  const payload: Record<string, unknown> = {
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    departure_date: params.departure_date,
    adults: typeof params.adults === "number" ? Math.max(1, params.adults) : 1,
    children: typeof params.children === "number" ? Math.max(0, params.children) : 0,
    cabin_class: params.cabin_class || "economy",
    market: (params.market || "IN").toUpperCase(),
    allow_self_transfer: params.allow_self_transfer ?? false,
  };

  if (typeof params.max_stops === "number" && [0, 1, 2].includes(params.max_stops)) {
    payload.max_stops = params.max_stops;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err: unknown) {
    throw new IgnavApiError(503, "Failed to connect to flight provider.", "NETWORK_ERROR");
  }

  if (!res.ok) {
    let errorData: RawIgnavError | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore json parse error
    }
    throw mapIgnavError(res.status, errorData);
  }

  const rawData: RawIgnavFareResponse = await res.json();
  return normalizeFareResponse(rawData, "one-way");
}

export async function searchRoundTrip(params: FlightSearchRequest): Promise<FlightSearchResponseData> {
  const { apiKey, baseUrl } = getIgnavConfig();
  const url = `${baseUrl}/api/fares/round-trip`;

  const payload: Record<string, unknown> = {
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    departure_date: params.departure_date,
    return_date: params.return_date,
    adults: typeof params.adults === "number" ? Math.max(1, params.adults) : 1,
    children: typeof params.children === "number" ? Math.max(0, params.children) : 0,
    cabin_class: params.cabin_class || "economy",
    market: (params.market || "IN").toUpperCase(),
    allow_self_transfer: params.allow_self_transfer ?? false,
  };

  if (typeof params.max_stops === "number" && [0, 1, 2].includes(params.max_stops)) {
    payload.max_stops = params.max_stops;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err: unknown) {
    throw new IgnavApiError(503, "Failed to connect to flight provider.", "NETWORK_ERROR");
  }

  if (!res.ok) {
    let errorData: RawIgnavError | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore json parse error
    }
    throw mapIgnavError(res.status, errorData);
  }

  const rawData: RawIgnavFareResponse = await res.json();
  return normalizeFareResponse(rawData, "round-trip");
}

export async function searchFlights(params: FlightSearchRequest): Promise<FlightSearchResponseData> {
  if (params.return_date && params.return_date.trim().length > 0) {
    return searchRoundTrip(params);
  }
  return searchOneWay(params);
}
