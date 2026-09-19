import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendations, Destination } from "@/lib/recommendations";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user strictly from Supabase SSR session
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

    // 2. Parse and validate optional request body parameters
    let body: Record<string, unknown> = {};
    const text = await request.text();
    if (text && text.trim().length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid JSON format in request body.",
          },
          { status: 400 }
        );
      }
    }

    const { budget, travel_style, duration, season } = body;

    if (budget !== undefined) {
      if (typeof budget !== "number" || isNaN(budget) || budget <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid budget value. Budget must be a positive number.",
          },
          { status: 400 }
        );
      }
    }

    if (travel_style !== undefined) {
      if (typeof travel_style !== "string" || !travel_style.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid travel_style. Must be a non-empty string.",
          },
          { status: 400 }
        );
      }
    }

    if (duration !== undefined) {
      if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 1 || duration > 30) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid duration. Must be an integer between 1 and 30 days.",
          },
          { status: 400 }
        );
      }
    }

    if (season !== undefined) {
      if (typeof season !== "string" || !season.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid season. Must be a non-empty string.",
          },
          { status: 400 }
        );
      }
    }

    // 3. Fetch authenticated user's saved preferences
    const { data: savedPrefs, error: prefError } = await supabase
      .from("user_preferences")
      .select("travel_style, budget")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefError) {
      console.error("Supabase user_preferences query error:", prefError.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch user preferences from database.",
        },
        { status: 500 }
      );
    }

    // 4. Resolve effective preferences (Request payload takes precedence over saved preferences)
    const effectiveBudget =
      budget !== undefined ? (budget as number) : savedPrefs?.budget ?? null;

    const effectiveTravelStyle =
      travel_style !== undefined
        ? (travel_style as string).trim()
        : savedPrefs?.travel_style ?? null;

    const effectiveDuration =
      duration !== undefined ? (duration as number) : null;

    const effectiveSeason =
      season !== undefined ? (season as string).trim() : null;

    // Determine source
    let source: "saved_preferences" | "request_input" | "hybrid" = "saved_preferences";
    if (budget !== undefined && travel_style !== undefined) {
      source = "request_input";
    } else if (budget !== undefined || travel_style !== undefined || duration !== undefined || season !== undefined) {
      source = "hybrid";
    }

    // Require at least one preference dimension
    if (effectiveBudget === null && effectiveTravelStyle === null && effectiveDuration === null && effectiveSeason === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Travel preferences are required to generate recommendations. Please provide budget, travel_style, duration, or season in the request body, or save your user preferences.",
        },
        { status: 400 }
      );
    }

    // 5. Retrieve available destinations catalog
    const { data: destinations, error: destError } = await supabase
      .from("destinations")
      .select("id, name, state_country, description, latitude, longitude, travel_styles, budget_level, destination_type, ideal_duration, activities, best_season, created_at");

    let finalDestinations: Destination[] = (destinations as Destination[]) || [];

    if (destError) {
      if (destError.message.includes("does not exist") || destError.code === "42703") {
        const { data: fbData, error: fbErr } = await supabase
          .from("destinations")
          .select("id, name, state_country, description, latitude, longitude, created_at");

        if (fbErr) {
          console.error("Supabase destinations fallback query error:", fbErr.message);
          return NextResponse.json(
            { success: false, message: "Failed to fetch destinations from database." },
            { status: 500 }
          );
        }
        finalDestinations = (fbData as Destination[]) || [];
      } else {
        console.error("Supabase destinations query error:", destError.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to fetch destinations from database.",
          },
          { status: 500 }
        );
      }
    }

    // 6. Generate and rank recommendations deterministically
    const recommendations = generateRecommendations(finalDestinations, {
      travel_style: effectiveTravelStyle,
      budget: effectiveBudget,
      duration: effectiveDuration,
      season: effectiveSeason,
    });

    return NextResponse.json(
      {
        success: true,
        recommendations,
        meta: {
          total: recommendations.length,
          applied_preferences: {
            travel_style: effectiveTravelStyle,
            budget: effectiveBudget,
            duration: effectiveDuration,
            season: effectiveSeason,
          },
          source,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error in recommendations engine:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
