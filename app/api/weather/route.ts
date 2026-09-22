import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWeather, OpenMeteoWeatherError } from "@/lib/weather";

function parseCoordinate(
  value: string | null,
  name: string,
  min: number,
  max: number
): { val?: number; error?: string } {
  if (value === null || value.trim() === "") {
    return { error: `Missing required parameter: ${name}` };
  }

  const num = Number(value.trim());

  if (isNaN(num) || !isFinite(num)) {
    return { error: `Invalid coordinate for ${name}: must be a finite number` };
  }

  if (num < min || num > max) {
    return { error: `Invalid coordinate for ${name}: must be between ${min} and ${max}` };
  }

  return { val: num };
}

function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

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
          message: "Authentication required to access weather data.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 1. Validate latitude
    const latRes = parseCoordinate(searchParams.get("latitude"), "latitude", -90, 90);
    if (latRes.error) {
      return NextResponse.json(
        {
          success: false,
          message: latRes.error,
        },
        { status: 400 }
      );
    }

    // 2. Validate longitude
    const lngRes = parseCoordinate(searchParams.get("longitude"), "longitude", -180, 180);
    if (lngRes.error) {
      return NextResponse.json(
        {
          success: false,
          message: lngRes.error,
        },
        { status: 400 }
      );
    }

    // 3. Validate optional dates (startDate, endDate)
    const rawStartDate = searchParams.get("startDate");
    const rawEndDate = searchParams.get("endDate");

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (rawStartDate !== null && rawStartDate.trim() !== "") {
      startDate = rawStartDate.trim();
      if (!isValidDateString(startDate)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid date format for startDate: must be YYYY-MM-DD",
          },
          { status: 400 }
        );
      }
    }

    if (rawEndDate !== null && rawEndDate.trim() !== "") {
      endDate = rawEndDate.trim();
      if (!isValidDateString(endDate)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid date format for endDate: must be YYYY-MM-DD",
          },
          { status: 400 }
        );
      }
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      return NextResponse.json(
        {
          success: false,
          message: "Both startDate and endDate must be provided together when specifying a date range.",
        },
        { status: 400 }
      );
    }

    if (startDate && endDate) {
      if (startDate > endDate) {
        return NextResponse.json(
          {
            success: false,
            message: "startDate cannot be after endDate.",
          },
          { status: 400 }
        );
      }

      // Enforce reasonable forecast span (up to 16 days)
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      const diffDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 16) {
        return NextResponse.json(
          {
            success: false,
            message: "Date range cannot exceed 16 days for weather forecast.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Optional timezone parameter
    const rawTimezone = searchParams.get("timezone");
    const timezone = rawTimezone && rawTimezone.trim() !== "" ? rawTimezone.trim() : undefined;

    // Fetch normalized weather data from Open-Meteo
    const weatherData = await getWeather({
      latitude: latRes.val!,
      longitude: lngRes.val!,
      startDate,
      endDate,
      timezone,
    });

    return NextResponse.json(
      {
        success: true,
        data: weatherData,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof OpenMeteoWeatherError) {
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
        message: "An unexpected error occurred while fetching weather data.",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
