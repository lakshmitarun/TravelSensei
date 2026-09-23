import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getNearbyAttractions,
  GeoapifyAttractionError,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
  DEFAULT_RADIUS_METERS,
  MIN_LIMIT,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "@/lib/attractions";

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

function parseInteger(
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
          message: "Authentication required to access attraction data.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 1. Validate latitude (-90 to 90)
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

    // 2. Validate longitude (-180 to 180)
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

    // 3. Validate radius (100m to 25000m / max 25km, default: 5000m)
    const radiusRes = parseInteger(
      searchParams.get("radius"),
      "radius",
      DEFAULT_RADIUS_METERS,
      MIN_RADIUS_METERS,
      MAX_RADIUS_METERS
    );
    if (radiusRes.error) {
      return NextResponse.json(
        {
          success: false,
          message: radiusRes.error,
        },
        { status: 400 }
      );
    }

    // 4. Validate limit (1 to 20, default: 20)
    const limitRes = parseInteger(
      searchParams.get("limit"),
      "limit",
      DEFAULT_LIMIT,
      MIN_LIMIT,
      MAX_LIMIT
    );
    if (limitRes.error) {
      return NextResponse.json(
        {
          success: false,
          message: limitRes.error,
        },
        { status: 400 }
      );
    }

    const attractionsData = await getNearbyAttractions({
      latitude: latRes.val!,
      longitude: lngRes.val!,
      radius: radiusRes.val,
      limit: limitRes.val,
    });

    return NextResponse.json({
      success: true,
      data: attractionsData,
    });
  } catch (error: unknown) {
    if (error instanceof GeoapifyAttractionError) {
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
          message: "Internal server error while fetching nearby attractions.",
        },
        message: "Internal server error while fetching nearby attractions.",
      },
      { status: 500 }
    );
  }
}
