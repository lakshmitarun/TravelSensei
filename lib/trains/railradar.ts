import {
  TrainStation,
  TrainSearchParams,
  TrainSearchData,
  TrainResult,
  TrainStationStop,
} from "./types";

// Internal error class for RailRadar API issues
export class RailRadarApiError extends Error {
  public status: number;
  public code: string;

  constructor(status: number, message: string, code: string = "RAILRADAR_ERROR") {
    super(message);
    this.name = "RailRadarApiError";
    this.status = status;
    this.code = code;
  }
}

function getRailRadarConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.RAILRADAR_API_KEY;
  const baseUrl = (process.env.RAILRADAR_API_BASE_URL || "https://api.railradar.in/v1").replace(/\/+$/, "");

  if (!apiKey || !apiKey.trim()) {
    throw new RailRadarApiError(
      503,
      "Train search service is not configured. Missing API key.",
      "MISSING_API_KEY"
    );
  }

  return { apiKey: apiKey.trim(), baseUrl };
}

function mapRailRadarError(status: number, rawData?: Record<string, unknown>): RailRadarApiError {
  const providerError =
    typeof rawData?.error === "object" && rawData?.error !== null
      ? (rawData.error as Record<string, unknown>)
      : undefined;
  const providerMessage = typeof providerError?.message === "string" ? providerError.message : undefined;
  const providerCode = typeof providerError?.code === "string" ? providerError.code : "PROVIDER_ERROR";

  switch (status) {
    case 400:
      return new RailRadarApiError(
        400,
        providerMessage || "Invalid train search request.",
        "BAD_REQUEST"
      );
    case 401:
      return new RailRadarApiError(
        401,
        "Train search authentication failed.",
        "UNAUTHORIZED"
      );
    case 404:
      return new RailRadarApiError(
        404,
        providerMessage || "Station or train information was not found.",
        "NOT_FOUND"
      );
    case 429:
      return new RailRadarApiError(
        429,
        "Too many train searches. Please try again shortly.",
        "RATE_LIMITED"
      );
    case 500:
      return new RailRadarApiError(
        500,
        "Train service data is temporarily unavailable.",
        "SERVICE_ERROR"
      );
    case 503:
      return new RailRadarApiError(
        503,
        "Train service is temporarily unavailable.",
        "SERVICE_UNAVAILABLE"
      );
    default:
      return new RailRadarApiError(
        status >= 500 ? 502 : status,
        "Unable to search trains right now.",
        providerCode
      );
  }
}

function normalizeRunDays(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((d) => String(d).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    if (raw.includes(",")) {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [raw.trim()];
  }
  if (typeof raw === "object" && raw !== null) {
    return Object.entries(raw)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.toUpperCase());
  }
  return [];
}

interface RawRailRadarStation {
  code?: string;
  name?: string;
  city?: string;
  state?: string;
  stationCode?: string;
  stationName?: string;
  popularity?: number;
  isActive?: boolean;
}

function normalizeStation(raw: RawRailRadarStation): TrainStation {
  return {
    code: (raw.code || raw.stationCode || "").toUpperCase().trim(),
    name: (raw.name || raw.stationName || "").trim(),
    city: raw.city ? raw.city.trim() : undefined,
    state: raw.state ? raw.state.trim() : undefined,
    popularity: typeof raw.popularity === "number" ? raw.popularity : undefined,
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
  };
}

interface RawTrainStop {
  code?: string;
  name?: string;
  stationCode?: string;
  stationName?: string;
  departure?: string;
  arrival?: string;
  time?: string;
  day?: number;
  sequence?: number;
}

interface RawTrainProfile {
  number?: string | number;
  name?: string;
  type?: string;
  runDays?: unknown;
}

interface RawTrainEntry {
  train?: RawTrainProfile;
  trainNumber?: string | number;
  train_number?: string | number;
  number?: string | number;
  trainName?: string;
  train_name?: string;
  name?: string;
  trainType?: string;
  type?: string;
  runDays?: unknown;
  runsOn?: unknown;
  from?: RawTrainStop;
  to?: RawTrainStop;
  departure?: RawTrainStop;
  arrival?: RawTrainStop;
  departureTime?: string;
  arrivalTime?: string;
  distance?: number;
  distanceKm?: number;
  distance_km?: number;
  duration?: string | number;
  totalHaltsBetween?: number;
  total_halts?: number;
  halts?: number;
  live?: Record<string, unknown> | null;
}

function normalizeTrain(
  raw: RawTrainEntry,
  fallbackFromCode: string,
  fallbackToCode: string
): TrainResult {
  const trainObj = raw.train && typeof raw.train === "object" ? raw.train : {};
  const fromObj =
    raw.from && typeof raw.from === "object"
      ? raw.from
      : raw.departure && typeof raw.departure === "object"
      ? raw.departure
      : {};
  const toObj =
    raw.to && typeof raw.to === "object"
      ? raw.to
      : raw.arrival && typeof raw.arrival === "object"
      ? raw.arrival
      : {};

  const trainNumber = String(
    trainObj.number || raw.trainNumber || raw.train_number || raw.number || ""
  ).trim();
  const trainName = String(
    trainObj.name || raw.trainName || raw.train_name || raw.name || ""
  ).trim();
  const trainType = trainObj.type || raw.trainType || raw.type || null;

  let durationStr = "";
  if (typeof raw.duration === "number") {
    const hours = Math.floor(raw.duration / 60);
    const mins = raw.duration % 60;
    durationStr = `${hours}h ${mins}m`;
  } else if (typeof raw.duration === "string") {
    durationStr = raw.duration.trim();
  }

  const departure: TrainStationStop = {
    stationCode: (fromObj.code || fromObj.stationCode || fallbackFromCode).toUpperCase().trim(),
    stationName: (fromObj.name || fromObj.stationName || "").trim(),
    time: (fromObj.departure || fromObj.time || raw.departureTime || "").trim(),
    day: typeof fromObj.day === "number" ? fromObj.day : 1,
    sequence: typeof fromObj.sequence === "number" ? fromObj.sequence : 1,
  };

  const arrival: TrainStationStop = {
    stationCode: (toObj.code || toObj.stationCode || fallbackToCode).toUpperCase().trim(),
    stationName: (toObj.name || toObj.stationName || "").trim(),
    time: (toObj.arrival || toObj.time || raw.arrivalTime || "").trim(),
    day: typeof toObj.day === "number" ? toObj.day : 1,
    sequence: typeof toObj.sequence === "number" ? toObj.sequence : 2,
  };

  return {
    trainNumber,
    trainName,
    trainType: trainType ? String(trainType).trim() : null,
    runDays: normalizeRunDays(trainObj.runDays ?? raw.runDays ?? raw.runsOn),
    departure,
    arrival,
    distanceKm: Number(raw.distance ?? raw.distanceKm ?? raw.distance_km ?? 0),
    duration: durationStr,
    totalHaltsBetween: Number(raw.totalHaltsBetween ?? raw.total_halts ?? raw.halts ?? 0),
    live: raw.live && typeof raw.live === "object" ? (raw.live as Record<string, unknown>) : null,
  };
}

// In-memory query cache for station searches to respect RailRadar rate limits
const stationSearchCache = new Map<string, { data: RawRailRadarStation[]; timestamp: number }>();
const STATION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Non-passenger infrastructure patterns: freight sidings, panel cabins, goods yards, industrial sidings
const NON_PASSENGER_PATTERNS = [
  /\bsiding\b/i,
  /\bsdg\b/i,
  /\/sdg\b/i,
  /\bcabin\b/i,
  /\bpanel\b/i,
  /\bgoods\b/i,
  /\byard\b/i,
  /\bmarshalling\b/i,
  /\bloco shed\b/i,
  /\bdepot\b/i,
  /\basbestos\b/i,
  /\bindustries\b/i,
  /\bprivate limited\b/i,
  /\bpvt ltd\b/i,
  /\bfci\b/i,
  /\bworkshop\b/i,
];

export function isPassengerStation(station: RawRailRadarStation): boolean {
  // 1. Inactive stations marked by RailRadar metadata
  if (station.isActive === false) {
    return false;
  }

  const code = (station.code || station.stationCode || "").toUpperCase().trim();
  // 2. Railway internal cabin codes usually prefixed with XX-
  if (code.startsWith("XX-")) {
    return false;
  }

  // 3. Obvious industrial / non-passenger station names
  const name = (station.name || station.stationName || "").trim();
  if (NON_PASSENGER_PATTERNS.some((pattern) => pattern.test(name))) {
    return false;
  }

  return true;
}

// Metropolitan station cluster aliases to expand single-name city searches
// to sister terminals (e.g. Hyderabad -> Secunderabad, Delhi -> Hazrat Nizamuddin)
const METROPOLITAN_CLUSTER_ALIASES: Record<string, string[]> = {
  hyderabad: ["Secunderabad", "Kacheguda"],
  secunderabad: ["Hyderabad", "Kacheguda"],
  delhi: ["Nizamuddin", "New Delhi"],
  "new delhi": ["Nizamuddin", "Delhi"],
  kolkata: ["Howrah", "Sealdah"],
  howrah: ["Kolkata", "Sealdah"],
  mumbai: ["Bandra", "Kurla"],
  chennai: ["Tambaram"],
  bangalore: ["Yesvantpur"],
  bengaluru: ["Yesvantpur"],
};

const MAJOR_NATIONAL_HUBS = new Set([
  "NDLS", "NZM", "DLI", "ANVT",
  "SC", "HYB", "KCG",
  "CSMT", "MMCT", "BDTS", "LTT",
  "HWH", "SDAH",
  "MAS", "MS",
  "SBC", "YPR",
  "NGP", "BPL", "ET", "CNB", "PRYJ", "DDU", "BZA", "BRC", "RTM", "PUNE", "GTL",
]);

export function scoreStation(station: TrainStation, query: string): number {
  let score = 0;
  const q = query.toLowerCase().trim();
  const code = station.code.toUpperCase();
  const name = station.name.toLowerCase();
  const city = (station.city || "").toLowerCase();

  // 1. Active status bonus
  if (station.isActive === true) {
    score += 30;
  }

  // 2. RailRadar popularity metric
  if (typeof station.popularity === "number" && station.popularity > 0) {
    score += Math.min(50, station.popularity * 5);
  }

  // 3. National Major Hub registry
  if (MAJOR_NATIONAL_HUBS.has(code)) {
    score += 50;
  }

  // 4. Query Matching
  if (code === q.toUpperCase()) {
    score += 150;
  } else if (code.startsWith(q.toUpperCase())) {
    score += 40;
  }

  if (name === q) {
    score += 80;
  } else if (name.startsWith(q)) {
    score += 45;
  } else if (name.includes(q)) {
    score += 25;
  }

  if (city === q) {
    score += 35;
  } else if (city.includes(q)) {
    score += 15;
  }

  // 5. Terminal & Express Hierarchy
  if (/\b(central|terminus|termini)\b/i.test(name)) {
    score += 40;
  } else if (/\b(jn|junction)\b/i.test(name)) {
    score += 30;
  }

  // New Delhi / Delhi specific balance
  if (name.includes("new delhi") || code === "NDLS") {
    score += 45;
  } else if (name === "delhi jn" || code === "DLI") {
    score += 35;
  } else if (name.includes("nizamuddin") || code === "NZM") {
    score += 35;
  }

  // Cantt stations are secondary to central/junction terminals
  if (name.includes("cantt") || name.includes("cantonment") || code === "DEC") {
    score += 5;
  }

  // Halts are local passenger stops
  if (name.includes("halt")) {
    score -= 40;
  }

  return score;
}

async function fetchRawStationsFromProvider(
  trimmedQuery: string,
  apiKey: string,
  baseUrl: string
): Promise<RawRailRadarStation[]> {
  const cacheKey = trimmedQuery.toLowerCase();
  const cached = stationSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < STATION_CACHE_TTL_MS) {
    return cached.data;
  }

  // Fetch with limit 40 so major terminals aren't truncated by prefix sorting
  const url = `${baseUrl}/lookup/search/stations?q=${encodeURIComponent(trimmedQuery)}&limit=40`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new RailRadarApiError(503, "Failed to connect to train provider.", "NETWORK_ERROR");
  }

  if (!res.ok) {
    let errorData: Record<string, unknown> | undefined;
    try {
      errorData = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore json parse error
    }
    throw mapRailRadarError(res.status, errorData);
  }

  const rawJson = (await res.json()) as Record<string, unknown> | RawRailRadarStation[];
  const rawList: RawRailRadarStation[] = Array.isArray(rawJson)
    ? rawJson
    : Array.isArray(rawJson?.data)
    ? (rawJson.data as RawRailRadarStation[])
    : [];

  stationSearchCache.set(cacheKey, { data: rawList, timestamp: Date.now() });
  return rawList;
}

export async function searchStations(query: string, limit: number = 10): Promise<TrainStation[]> {
  const { apiKey, baseUrl } = getRailRadarConfig();
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const clampedLimit = Math.min(50, Math.max(1, limit));

  // 1. Primary provider query
  const primaryRaw = await fetchRawStationsFromProvider(trimmed, apiKey, baseUrl);
  const combinedRaw: RawRailRadarStation[] = [...primaryRaw];

  // 2. Metropolitan cluster expansion (e.g. Hyderabad -> Secunderabad, Delhi -> Hazrat Nizamuddin)
  const clusterAliases = METROPOLITAN_CLUSTER_ALIASES[trimmed.toLowerCase()];
  if (clusterAliases && clusterAliases.length > 0) {
    for (const alias of clusterAliases) {
      try {
        const aliasRaw = await fetchRawStationsFromProvider(alias, apiKey, baseUrl);
        combinedRaw.push(...aliasRaw);
      } catch {
        // Continue gracefully if an alias lookup fails
      }
    }
  }

  // 3. Deduplicate by station code
  const seenCodes = new Set<string>();
  const deduped: RawRailRadarStation[] = [];
  for (const s of combinedRaw) {
    const code = (s.code || s.stationCode || "").toUpperCase().trim();
    if (code && !seenCodes.has(code)) {
      seenCodes.add(code);
      deduped.push(s);
    }
  }

  // 4. Filter out inactive stations and non-passenger freight sidings
  const passengerStations = deduped.filter(isPassengerStation);

  // 5. Normalize stations
  const normalized = passengerStations
    .map(normalizeStation)
    .filter((s) => s.code.length > 0);

  // 6. Score and prioritize long-distance passenger terminals
  normalized.sort((a, b) => scoreStation(b, trimmed) - scoreStation(a, trimmed));

  return normalized.slice(0, clampedLimit);
}

export async function searchTrains(params: TrainSearchParams): Promise<TrainSearchData> {
  const { apiKey, baseUrl } = getRailRadarConfig();
  const cleanFrom = params.from.toUpperCase().trim();
  const cleanTo = params.to.toUpperCase().trim();

  const queryParams = new URLSearchParams();
  if (params.date && params.date.trim()) {
    queryParams.set("date", params.date.trim());
  }
  if (params.type && params.type.trim()) {
    queryParams.set("type", params.type.trim());
  }
  if (params.category && params.category.trim()) {
    queryParams.set("category", params.category.trim());
  }
  if (typeof params.byCity === "boolean") {
    queryParams.set("byCity", params.byCity ? "true" : "false");
  }
  if (typeof params.live === "boolean") {
    queryParams.set("live", params.live ? "true" : "false");
  }

  const queryString = queryParams.toString();
  const url = `${baseUrl}/trains/between/${encodeURIComponent(cleanFrom)}/${encodeURIComponent(cleanTo)}${
    queryString ? `?${queryString}` : ""
  }`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new RailRadarApiError(503, "Failed to connect to train provider.", "NETWORK_ERROR");
  }

  if (!res.ok) {
    let errorData: Record<string, unknown> | undefined;
    try {
      errorData = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore json parse error
    }
    throw mapRailRadarError(res.status, errorData);
  }

  const rawJson = (await res.json()) as Record<string, unknown>;
  const container =
    rawJson && typeof rawJson === "object" && "data" in rawJson
      ? (rawJson.data as Record<string, unknown>)
      : rawJson;

  const rawTrainsList: RawTrainEntry[] = Array.isArray(container?.trains)
    ? (container.trains as RawTrainEntry[])
    : Array.isArray(container)
    ? (container as RawTrainEntry[])
    : [];

  const fromContainer = container?.from as { code?: string; name?: string } | undefined;
  const toContainer = container?.to as { code?: string; name?: string } | undefined;

  const fromCode = (fromContainer?.code || cleanFrom).toUpperCase().trim();
  const fromName = (fromContainer?.name || "").trim();
  const toCode = (toContainer?.code || cleanTo).toUpperCase().trim();
  const toName = (toContainer?.name || "").trim();

  const trains = rawTrainsList.map((item) => normalizeTrain(item, fromCode, toCode));

  return {
    from: {
      code: fromCode,
      name: fromName,
    },
    to: {
      code: toCode,
      name: toName,
    },
    count: typeof container?.count === "number" ? container.count : trains.length,
    trains,
  };
}
