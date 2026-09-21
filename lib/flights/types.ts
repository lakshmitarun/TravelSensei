export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface FlightPrice {
  amount: number;
  currency: string;
  status: "verified" | "unverified";
}

export interface FlightBags {
  carryOn: number | null;
  checked: number | null;
}

export interface FlightSegment {
  marketingCarrierCode: string | null;
  flightNumber: string | null;
  operatingCarrierName: string | null;
  departureAirport: string;
  departureTimeLocal: string;
  departureTimezone: string | null;
  arrivalAirport: string;
  arrivalTimeLocal: string;
  arrivalTimezone: string | null;
  durationMinutes: number;
  aircraft: string | null;
}

export interface FlightLeg {
  carrier: string | null;
  durationMinutes: number | null;
  stops: number;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  segments: FlightSegment[];
}

export interface FlightItinerary {
  id: string;
  price: FlightPrice;
  cabinClass: string | null;
  requiresSelfTransfer: boolean;
  bags?: FlightBags | null;
  outbound: FlightLeg;
  inbound?: FlightLeg | null;
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string | null;
  adults?: number;
  children?: number;
  cabin_class?: CabinClass;
  max_stops?: number | null;
  market?: string;
  allow_self_transfer?: boolean;
}

export interface FlightSearchResponseData {
  type: "one-way" | "round-trip";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  itineraries: FlightItinerary[];
}

export interface FlightSearchResponse {
  success: boolean;
  data?: FlightSearchResponseData;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface AirportSearchResponse {
  success: boolean;
  airports?: Airport[];
  message?: string;
}
