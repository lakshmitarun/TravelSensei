import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planJourneyRoutes } from "@/lib/routing/planner";

const CODE_REGEX = /^[A-Z0-9]{2,6}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

    // 1. Authenticate user
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

    const originParam = searchParams.get("origin") || searchParams.get("from");
    if (!originParam || !originParam.trim()) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter: origin" },
        { status: 400 }
      );
    }
    const cleanOrigin = originParam.trim().toUpperCase();
    if (!CODE_REGEX.test(cleanOrigin)) {
      return NextResponse.json(
        { success: false, message: "Invalid origin code." },
        { status: 400 }
      );
    }

    const destParam = searchParams.get("destination") || searchParams.get("to");
    if (!destParam || !destParam.trim()) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter: destination" },
        { status: 400 }
      );
    }
    const cleanDest = destParam.trim().toUpperCase();
    if (!CODE_REGEX.test(cleanDest)) {
      return NextResponse.json(
        { success: false, message: "Invalid destination code." },
        { status: 400 }
      );
    }

    if (cleanOrigin === cleanDest) {
      return NextResponse.json(
        { success: false, message: "Origin and destination cannot be identical." },
        { status: 400 }
      );
    }

    const dateParam = searchParams.get("date");
    if (!dateParam || !dateParam.trim()) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter: date" },
        { status: 400 }
      );
    }
    const cleanDate = dateParam.trim();
    if (!isValidCalendarDate(cleanDate)) {
      return NextResponse.json(
        { success: false, message: "Invalid date format. Must be YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if (isDateInPast(cleanDate)) {
      return NextResponse.json(
        { success: false, message: "Journey date cannot be in the past." },
        { status: 400 }
      );
    }

    const modeParam = searchParams.get("mode");
    let mode: "all" | "trains" | "flights" = "trains";
    if (modeParam === "all" || modeParam === "trains" || modeParam === "flights") {
      mode = modeParam;
    }

    const byCityParam = searchParams.get("byCity");
    const byCity = byCityParam === "true";

    // 3. Plan smart multi-leg routes
    const result = await planJourneyRoutes({
      origin: cleanOrigin,
      destination: cleanDest,
      date: cleanDate,
      mode,
      byCity,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Multi-leg routing internal error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        success: false,
        message: "Unable to find routes right now. Please try again later.",
      },
      { status: 500 }
    );
  }
}
