import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchTrains, RailRadarApiError } from "@/lib/trains/railradar";

const STATION_CODE_REGEX = /^[A-Z]{2,6}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_PARAM_REGEX = /^[a-zA-Z0-9_\-\s]{1,50}$/;

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

export async function GET(request: Request) {
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

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);

    // Validate from station
    const fromParam = searchParams.get("from");
    if (!fromParam || !fromParam.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required query parameter: from",
        },
        { status: 400 }
      );
    }
    const cleanFrom = fromParam.trim().toUpperCase();
    if (!STATION_CODE_REGEX.test(cleanFrom)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid from station code. Must be a valid 2 to 6 letter station code.",
        },
        { status: 400 }
      );
    }

    // Validate to station
    const toParam = searchParams.get("to");
    if (!toParam || !toParam.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required query parameter: to",
        },
        { status: 400 }
      );
    }
    const cleanTo = toParam.trim().toUpperCase();
    if (!STATION_CODE_REGEX.test(cleanTo)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid to station code. Must be a valid 2 to 6 letter station code.",
        },
        { status: 400 }
      );
    }

    // from !== to
    if (cleanFrom === cleanTo) {
      return NextResponse.json(
        {
          success: false,
          message: "Origin and destination stations must be different.",
        },
        { status: 400 }
      );
    }

    // Validate date (optional)
    const dateParam = searchParams.get("date");
    let cleanDate: string | null = null;
    if (dateParam !== null && dateParam.trim().length > 0) {
      const trimmedDate = dateParam.trim();
      if (!isValidCalendarDate(trimmedDate)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid date format. Must be a valid date in YYYY-MM-DD format.",
          },
          { status: 400 }
        );
      }
      if (isDateInPast(trimmedDate)) {
        return NextResponse.json(
          {
            success: false,
            message: "Journey date cannot be in the past.",
          },
          { status: 400 }
        );
      }
      cleanDate = trimmedDate;
    }

    // Validate byCity (optional boolean)
    const byCityParam = searchParams.get("byCity");
    let byCity: boolean | undefined = undefined;
    if (byCityParam !== null && byCityParam.trim().length > 0) {
      const lower = byCityParam.trim().toLowerCase();
      if (lower !== "true" && lower !== "false") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid byCity parameter. Must be true or false.",
          },
          { status: 400 }
        );
      }
      byCity = lower === "true";
    }

    // Validate live (optional boolean)
    const liveParam = searchParams.get("live");
    let live: boolean | undefined = undefined;
    if (liveParam !== null && liveParam.trim().length > 0) {
      const lower = liveParam.trim().toLowerCase();
      if (lower !== "true" && lower !== "false") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid live parameter. Must be true or false.",
          },
          { status: 400 }
        );
      }
      live = lower === "true";
    }

    // Validate type (optional string)
    const typeParam = searchParams.get("type");
    let cleanType: string | null = null;
    if (typeParam !== null && typeParam.trim().length > 0) {
      const trimmed = typeParam.trim();
      if (!SAFE_PARAM_REGEX.test(trimmed)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid type parameter. Contains unsupported characters or exceeds max length.",
          },
          { status: 400 }
        );
      }
      cleanType = trimmed;
    }

    // Validate category (optional string)
    const categoryParam = searchParams.get("category");
    let cleanCategory: string | null = null;
    if (categoryParam !== null && categoryParam.trim().length > 0) {
      const trimmed = categoryParam.trim();
      if (!SAFE_PARAM_REGEX.test(trimmed)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid category parameter. Contains unsupported characters or exceeds max length.",
          },
          { status: 400 }
        );
      }
      cleanCategory = trimmed;
    }

    // 3. Search trains via RailRadar client
    const searchResult = await searchTrains({
      from: cleanFrom,
      to: cleanTo,
      date: cleanDate,
      type: cleanType,
      category: cleanCategory,
      byCity,
      live,
    });

    return NextResponse.json(
      {
        success: true,
        data: searchResult,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof RailRadarApiError) {
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

    console.error("Train search internal error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        success: false,
        message: "Unable to search trains right now.",
      },
      { status: 500 }
    );
  }
}
