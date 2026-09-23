import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPexelsPhotos, PexelsPhotoError } from "@/lib/photos";

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
          message: "Authentication required to access photo service.",
        },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const qParam = searchParams.get("q") ?? "";
    const perPageParam = searchParams.get("per_page");
    const pageParam = searchParams.get("page");

    // 3. Call photo search service (validation handled within)
    const result = await searchPexelsPhotos({
      q: qParam,
      per_page: perPageParam !== null ? Number(perPageParam) : undefined,
      page: pageParam !== null ? Number(pageParam) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof PexelsPhotoError) {
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
          message: "Internal server error while searching photos.",
        },
        message: "Internal server error while searching photos.",
      },
      { status: 500 }
    );
  }
}
