import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchLocations, OpenMeteoGeocodingError } from "@/lib/geocoding";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required to search locations.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 1. Validate 'q' parameter
    const rawQuery = searchParams.get("q");
    if (rawQuery === null || rawQuery.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required query parameter: q",
        },
        { status: 400 }
      );
    }

    const q = rawQuery.trim();
    if (q.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Query parameter 'q' must be at least 2 characters.",
        },
        { status: 400 }
      );
    }

    if (q.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Query parameter 'q' must not exceed 100 characters.",
        },
        { status: 400 }
      );
    }

    // 2. Validate 'count' parameter
    let count = 5;
    const rawCount = searchParams.get("count");
    if (rawCount !== null && rawCount.trim() !== "") {
      const parsedCount = Number(rawCount.trim());
      if (isNaN(parsedCount) || !Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 10) {
        return NextResponse.json(
          {
            success: false,
            message: "Query parameter 'count' must be an integer between 1 and 10.",
          },
          { status: 400 }
        );
      }
      count = parsedCount;
    }

    // 3. Validate 'language' parameter
    const language = (searchParams.get("language") || "en").trim().toLowerCase();

    // 4. Validate 'countryCode' parameter
    const rawCountryCode = searchParams.get("countryCode");
    let countryCode: string | undefined;
    if (rawCountryCode !== null && rawCountryCode.trim() !== "") {
      countryCode = rawCountryCode.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(countryCode)) {
        return NextResponse.json(
          {
            success: false,
            message: "Query parameter 'countryCode' must be a valid 2-letter ISO country code.",
          },
          { status: 400 }
        );
      }
    }

    // Execute geocoding search
    const data = await searchLocations({
      query: q,
      count,
      language,
      countryCode,
    });

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof OpenMeteoGeocodingError) {
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

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while searching locations.",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
