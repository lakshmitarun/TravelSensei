export type TransportMode = "train" | "flight" | "bus";

export interface JourneyStationOrPort {
  code: string;
  name: string;
  city?: string;
  state?: string;
}

export interface JourneySegment {
  id: string;
  mode: TransportMode;
  operator: string;
  identifier: string; // e.g. "12952" (train) or "6E-204" (flight)
  title: string;      // e.g. "MUMBAI RAJDHANI" or "IndiGo"
  type?: string | null;
  origin: JourneyStationOrPort;
  destination: JourneyStationOrPort;
  departureTime: string;
  arrivalTime: string;
  departureDay: number;
  arrivalDay: number;
  durationMinutes: number;
  distanceKm?: number;
  haltsCount?: number;
  runDays?: string[];
  live?: Record<string, unknown> | null;
}

export interface JourneyTransfer {
  location: JourneyStationOrPort;
  waitingMinutes: number;
  arrivingSegmentId: string;
  departingSegmentId: string;
  isSameStation: boolean;
  notes?: string;
}

export interface JourneyRoute {
  id: string;
  isDirect: boolean;
  numberOfTransfers: number;
  transportModes: TransportMode[];
  origin: JourneyStationOrPort;
  destination: JourneyStationOrPort;
  departureTime: string;
  arrivalTime: string;
  departureDay: number;
  arrivalDay: number;
  totalDurationMinutes: number;
  totalWaitingMinutes: number;
  segments: JourneySegment[];
  transfers: JourneyTransfer[];
}

export interface RoutingSearchParams {
  origin: string;
  destination: string;
  date: string;
  mode?: "all" | "trains" | "flights";
  maxTransfers?: number;
  byCity?: boolean;
}

export interface RoutingSearchData {
  origin: JourneyStationOrPort;
  destination: JourneyStationOrPort;
  date: string;
  directRoutes: JourneyRoute[];
  connectingRoutes: JourneyRoute[];
}

export interface RoutingSearchResponse {
  success: boolean;
  data?: RoutingSearchData;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
