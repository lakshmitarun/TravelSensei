import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFlights, IgnavApiError } from "@/lib/flights/ignav";
import { CabinClass, FlightSearchRequest } from "@/lib/flights/types";

const IATA_REGEX = /^[A-Z]{3}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MARKET_REGEX = /^[A-Z]{2}$/i;
const VALID_CABIN_CLASSES: CabinClass[] = ["economy", "premium_economy", "business", "first"];

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

function isDateInPast(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map((s) => parseInt(s, 10));
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return targetDate < today;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user from Supabase SSR session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body: Record<string, unknown> = {};
    const text = await request.text();
    if (text && text.trim().length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid JSON format in request body.",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Missing request body.",
        },
        { status: 400 }
      );
    }

    // 3. Validate origin airport (3-letter IATA)
    const origin = body.origin;
    if (!origin || typeof origin !== "string" || !origin.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: origin",
        },
        { status: 400 }
      );
    }
    const cleanOrigin = origin.trim().toUpperCase();
    if (!IATA_REGEX.test(cleanOrigin)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid origin airport code. Must be a 3-letter IATA code.",
        },
        { status: 400 }
      );
    }

    // 4. Validate destination airport (3-letter IATA)
    const destination = body.destination;
    if (!destination || typeof destination !== "string" || !destination.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: destination",
        },
        { status: 400 }
      );
    }
    const cleanDestination = destination.trim().toUpperCase();
    if (!IATA_REGEX.test(cleanDestination)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid destination airport code. Must be a 3-letter IATA code.",
        },
        { status: 400 }
      );
    }

    // 5. Origin and Destination must not be identical
    if (cleanOrigin === cleanDestination) {
      return NextResponse.json(
        {
          success: false,
          message: "Origin and destination airports must be different.",
        },
        { status: 400 }
      );
    }

    // 6. Validate departure_date
    const departureDate = body.departure_date;
    if (!departureDate || typeof departureDate !== "string" || !departureDate.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: departure_date",
        },
        { status: 400 }
      );
    }
    const cleanDepartureDate = departureDate.trim();
    if (!isValidCalendarDate(cleanDepartureDate)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid departure_date format. Must be a valid date in YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }
    if (isDateInPast(cleanDepartureDate)) {
      return NextResponse.json(
        {
          success: false,
          message: "Departure date cannot be in the past.",
        },
        { status: 400 }
      );
    }

    // 7. Validate return_date (if provided)
    let cleanReturnDate: string | null = null;
    if (body.return_date && typeof body.return_date === "string" && body.return_date.trim()) {
      cleanReturnDate = body.return_date.trim();
      if (!isValidCalendarDate(cleanReturnDate)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid return_date format. Must be a valid date in YYYY-MM-DD format.",
          },
          { status: 400 }
        );
      }
      if (cleanReturnDate < cleanDepartureDate) {
        return NextResponse.json(
          {
            success: false,
            message: "Return date must be on or after the departure date.",
          },
          { status: 400 }
        );
      }
    }

    // 8. Validate adults
    let adults = 1;
    if (body.adults !== undefined && body.adults !== null) {
      if (typeof body.adults !== "number" || !Number.isInteger(body.adults) || body.adults < 1 || body.adults > 9) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid adults count. Must be an integer between 1 and 9.",
          },
          { status: 400 }
        );
      }
      adults = body.adults;
    }

    // 9. Validate children
    let children = 0;
    if (body.children !== undefined && body.children !== null) {
      if (typeof body.children !== "number" || !Number.isInteger(body.children) || body.children < 0 || body.children > 8) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid children count. Must be an integer between 0 and 8.",
          },
          { status: 400 }
        );
      }
      children = body.children;
    }

    // 10. Validate cabin_class
    let cabinClass: CabinClass = "economy";
    if (body.cabin_class !== undefined && body.cabin_class !== null) {
      if (typeof body.cabin_class !== "string" || !VALID_CABIN_CLASSES.includes(body.cabin_class as CabinClass)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid cabin_class. Must be one of: economy, premium_economy, business, first.",
          },
          { status: 400 }
        );
      }
      cabinClass = body.cabin_class as CabinClass;
    }

    // 11. Validate max_stops
    let maxStops: number | null = null;
    if (body.max_stops !== undefined && body.max_stops !== null) {
      if (typeof body.max_stops !== "number" || ![0, 1, 2].includes(body.max_stops)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid max_stops. Must be 0, 1, 2, or null.",
          },
          { status: 400 }
        );
      }
      maxStops = body.max_stops;
    }

    // 12. Validate market
    let market = "IN";
    if (body.market !== undefined && body.market !== null) {
      if (typeof body.market !== "string" || !MARKET_REGEX.test(body.market.trim())) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid market code. Must be a 2-letter country code.",
          },
          { status: 400 }
        );
      }
      market = body.market.trim().toUpperCase();
    }

    // 13. Validate allow_self_transfer
    let allowSelfTransfer = false;
    if (body.allow_self_transfer !== undefined && body.allow_self_transfer !== null) {
      if (typeof body.allow_self_transfer !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid allow_self_transfer. Must be a boolean value.",
          },
          { status: 400 }
        );
      }
      allowSelfTransfer = body.allow_self_transfer;
    }

    // 14. Execute Flight Search via Ignav Client
    const searchParams: FlightSearchRequest = {
      origin: cleanOrigin,
      destination: cleanDestination,
      departure_date: cleanDepartureDate,
      return_date: cleanReturnDate,
      adults,
      children,
      cabin_class: cabinClass,
      max_stops: maxStops,
      market,
      allow_self_transfer: allowSelfTransfer,
    };

    const searchResult = await searchFlights(searchParams);

    return NextResponse.json(
      {
        success: true,
        data: searchResult,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof IgnavApiError) {
      return NextResponse.json(
        {
          success: false,
          message: err.message,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.status }
      );
    }

    console.error("Flight search internal error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        success: false,
        message: "Unable to search flights right now.",
      },
      { status: 500 }
    );
  }
}
