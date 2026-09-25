/**
 * Types for StungEvents Events Provider & TravelSensei Events Feature
 * Reference: https://api.stungevents.com/events
 */

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  timezone: string | null;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  subcategory: string | null;
  imageUrl: string | null;
  eventUrl: string | null;
  ticketUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  status: string | null;
  source: string | null;
  provider: "stungevents";
}

export interface EventsQueryParams {
  city?: string;
  country?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
  limit?: number; // min 1, max 100, default 20
  page?: number; // min 1, default 1
  offset?: number; // direct offset override
}

export interface EventsResponseData {
  events: EventItem[];
  total: number;
  page: number;
  limit: number;
  provider: "stungevents";
}

export interface EventApiError {
  code: string;
  message: string;
}

export interface EventsApiResponse {
  success: boolean;
  data?: EventsResponseData;
  error?: EventApiError;
  message?: string;
}

export class StungEventsApiError extends Error {
  public status: number;
  public code: string;

  constructor(
    status: number = 502,
    message: string = "Events discovery service is temporarily unavailable.",
    code: string = "EVENTS_PROVIDER_ERROR"
  ) {
    super(message);
    this.name = "StungEventsApiError";
    this.status = status;
    this.code = code;
  }
}

// Raw StungEvents API payload types
export interface RawStungEvent {
  id?: string;
  title?: string;
  slug?: string;
  description?: string | null;
  start_utc?: string | null;
  end_utc?: string | null;
  timezone?: string | null;
  status?: string | null;
  attendance_mode?: string | null;
  category?: string | null;
  subcategory?: string | null;
  image_url?: string | null;
  ticket_url?: string | null;
  ticket_price_min?: number | null;
  ticket_price_max?: number | null;
  ticket_currency?: string | null;
  affiliate_source?: string | null;
  source_id?: string | null;
  venue_name?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  venue_timezone?: string | null;
  [key: string]: unknown;
}

export interface RawStungEventsResponse {
  ok?: boolean;
  count?: number;
  offset?: number;
  limit?: number;
  events?: RawStungEvent[];
  error?: string;
  message?: string;
}
