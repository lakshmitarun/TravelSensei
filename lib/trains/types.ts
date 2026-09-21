export interface TrainStation {
  code: string;
  name: string;
  city?: string;
  state?: string;
  popularity?: number;
  isActive?: boolean;
}

export interface StationSearchResponse {
  success: boolean;
  data?: TrainStation[];
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface TrainStationStop {
  stationCode: string;
  stationName: string;
  time: string;
  day: number;
  sequence: number;
}

export interface TrainResult {
  trainNumber: string;
  trainName: string;
  trainType: string | null;
  runDays: string[];
  departure: TrainStationStop;
  arrival: TrainStationStop;
  distanceKm: number;
  duration: string;
  totalHaltsBetween: number;
  live?: Record<string, unknown> | null;
}

export interface TrainSearchParams {
  from: string;
  to: string;
  date?: string | null;
  type?: string | null;
  category?: string | null;
  byCity?: boolean;
  live?: boolean;
}

export interface TrainSearchData {
  from: {
    code: string;
    name: string;
  };
  to: {
    code: string;
    name: string;
  };
  count: number;
  trains: TrainResult[];
}

export interface TrainSearchResponse {
  success: boolean;
  data?: TrainSearchData;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
