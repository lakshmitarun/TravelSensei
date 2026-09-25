import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getEvents,
  StungEventsApiError,
  MIN_LIMIT,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "@/lib/events";

function parseStringParam(
  value: string | null,
  name: string,
  maxLength: number
): { val?: string; error?: string } {
  if (value === null || value.trim() === "") {
    return { val: undefined };
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { error: `Invalid ${name}: must be at most ${maxLength} characters` };
  }

  return { val: trimmed };
}

function parseIntegerParam(
  value: string | null,
  name: string,
  defaultValue: number,
  min: number,
  max: number
): { val?: number; error?: string } {
  if (value === null || value.trim() === "") {
    return { val: defaultValue };
  }

  const num = Number(value.trim());

  if (isNaN(num) || !isFinite(num) || !Number.isInteger(num)) {
    return { error: `Invalid ${name}: must be an integer` };
  }

  if (num < min || num > max) {
    return { error: `Invalid ${name}: must be between ${min} and ${max}` };
  }

  return { val: num };
}

function parseDateParam(
  value: string | null,
  name: string
): { val?: string; error?: string } {
  if (value === null || value.trim() === "") {
    return { val: undefined };
  }

  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (isNaN(parsed.getTime())) {
    return { error: `Invalid ${name}: must be a valid date format (e.g. YYYY-MM-DD or ISO 8601)` };
  }

  return { val: trimmed };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required to access events data.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 2. Validate optional string parameters
    const cityRes = parseStringParam(searchParams.get("city"), "city", 100);
    if (cityRes.error) {
      return NextResponse.json({ success: false, message: cityRes.error }, { status: 400 });
    }

    const countryRes = parseStringParam(searchParams.get("country"), "country", 100);
    if (countryRes.error) {
      return NextResponse.json({ success: false, message: countryRes.error }, { status: 400 });
    }

    const categoryRes = parseStringParam(searchParams.get("category"), "category", 50);
    if (categoryRes.error) {
      return NextResponse.json({ success: false, message: categoryRes.error }, { status: 400 });
    }

    const queryRes = parseStringParam(searchParams.get("q") || searchParams.get("query"), "query", 100);
    if (queryRes.error) {
      return NextResponse.json({ success: false, message: queryRes.error }, { status: 400 });
    }

    // 3. Validate optional date parameters
    const startDateRes = parseDateParam(searchParams.get("startDate") || searchParams.get("from"), "startDate");
    if (startDateRes.error) {
      return NextResponse.json({ success: false, message: startDateRes.error }, { status: 400 });
    }

    const endDateRes = parseDateParam(searchParams.get("endDate") || searchParams.get("to"), "endDate");
    if (endDateRes.error) {
      return NextResponse.json({ success: false, message: endDateRes.error }, { status: 400 });
    }

    if (startDateRes.val && endDateRes.val) {
      const startMs = new Date(startDateRes.val).getTime();
      const endMs = new Date(endDateRes.val).getTime();
      if (startMs > endMs) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid date range: startDate must be before or equal to endDate.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Validate pagination parameters
    const limitRes = parseIntegerParam(searchParams.get("limit"), "limit", DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);
    if (limitRes.error) {
      return NextResponse.json({ success: false, message: limitRes.error }, { status: 400 });
    }

    const pageRes = parseIntegerParam(searchParams.get("page"), "page", 1, 1, 1000);
    if (pageRes.error) {
      return NextResponse.json({ success: false, message: pageRes.error }, { status: 400 });
    }

    // 5. Query StungEvents server provider
    const eventsData = await getEvents({
      city: cityRes.val,
      country: countryRes.val,
      category: categoryRes.val,
      startDate: startDateRes.val,
      endDate: endDateRes.val,
      query: queryRes.val,
      limit: limitRes.val,
      page: pageRes.val,
    });

    return NextResponse.json({
      success: true,
      data: eventsData,
    });
  } catch (error: unknown) {
    if (error instanceof StungEventsApiError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          message: error.message,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error while fetching events.",
        },
        message: "Internal server error while fetching events.",
      },
      { status: 500 }
    );
  }
}
