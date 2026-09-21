import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchAirports, IgnavApiError } from "@/lib/flights/ignav";

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
    const query = searchParams.get("q");
    const limitParam = searchParams.get("limit");

    if (!query || !query.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required query parameter: q",
        },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Search query must be at least 1 character.",
        },
        { status: 400 }
      );
    }

    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid limit. Must be an integer between 1 and 20.",
          },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    // 3. Search airports via Ignav client
    const airports = await searchAirports(trimmedQuery, limit);

    return NextResponse.json(
      {
        success: true,
        airports,
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

    console.error("Airport search internal error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        success: false,
        message: "Unable to search airports right now.",
      },
      { status: 500 }
    );
  }
}
