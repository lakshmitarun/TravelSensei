import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDirections, OpenRouteServiceApiError } from "@/lib/maps";
import { RouteProfile, DirectionsRequest } from "@/lib/maps/types";

const VALID_PROFILES: RouteProfile[] = ["driving-car", "cycling-regular", "foot-walking"];

function parseCoordinate(
  value: string | null,
  name: string,
  min: number,
  max: number
): { val?: number; error?: string } {
  if (value === null || value.trim() === "") {
    return { error: `Missing required coordinate: ${name}` };
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
          message: "Authentication required to access directions.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 1. Parse origin coordinates
    const originLatRes = parseCoordinate(searchParams.get("originLat"), "originLat", -90, 90);
    if (originLatRes.error) {
      return NextResponse.json({ success: false, message: originLatRes.error }, { status: 400 });
    }

    const originLngRes = parseCoordinate(searchParams.get("originLng"), "originLng", -180, 180);
    if (originLngRes.error) {
      return NextResponse.json({ success: false, message: originLngRes.error }, { status: 400 });
    }

    // 2. Parse destination coordinates
    const destLatRes = parseCoordinate(searchParams.get("destinationLat"), "destinationLat", -90, 90);
    if (destLatRes.error) {
      return NextResponse.json({ success: false, message: destLatRes.error }, { status: 400 });
    }

    const destLngRes = parseCoordinate(searchParams.get("destinationLng"), "destinationLng", -180, 180);
    if (destLngRes.error) {
      return NextResponse.json({ success: false, message: destLngRes.error }, { status: 400 });
    }

    // 3. Parse and validate profile
    const profileParam = (searchParams.get("profile") || "driving-car").trim();
    if (!VALID_PROFILES.includes(profileParam as RouteProfile)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid route profile: '${profileParam}'. Must be one of: ${VALID_PROFILES.join(", ")}.`,
        },
        { status: 400 }
      );
    }
    const profile = profileParam as RouteProfile;

    // Optional preference parameter
    const preferenceParam = searchParams.get("preference");
    let preference: "fastest" | "shortest" | "recommended" | undefined;
    if (preferenceParam) {
      if (["fastest", "shortest", "recommended"].includes(preferenceParam)) {
        preference = preferenceParam as "fastest" | "shortest" | "recommended";
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid preference. Must be one of: fastest, shortest, recommended.",
          },
          { status: 400 }
        );
      }
    }

    const directionsReq: DirectionsRequest = {
      origin: {
        latitude: originLatRes.val!,
        longitude: originLngRes.val!,
      },
      destination: {
        latitude: destLatRes.val!,
        longitude: destLngRes.val!,
      },
      profile,
      preference,
      instructions: true,
      geometry: true,
    };

    const result = await getDirections(directionsReq);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof OpenRouteServiceApiError) {
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
        message: "An unexpected error occurred while calculating directions.",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
