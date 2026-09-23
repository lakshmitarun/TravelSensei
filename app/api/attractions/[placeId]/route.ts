import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAttractionDetails,
  GeoapifyAttractionError,
} from "@/lib/attractions";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeId: string }> | { placeId: string } }
) {
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
          message: "Authentication required to access attraction details.",
        },
        { status: 401 }
      );
    }

    // 2. Resolve placeId safely (Next.js 15+ may pass params as a Promise)
    const resolvedParams = await Promise.resolve(context.params);
    const placeId = resolvedParams?.placeId ? decodeURIComponent(resolvedParams.placeId).trim() : "";

    if (!placeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing or invalid attraction placeId.",
        },
        { status: 400 }
      );
    }

    // 3. Fetch details via server-side provider
    const details = await getAttractionDetails(placeId);

    return NextResponse.json({
      success: true,
      data: details,
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
          message: "Internal server error while fetching attraction details.",
        },
        message: "Internal server error while fetching attraction details.",
      },
      { status: 500 }
    );
  }
}
