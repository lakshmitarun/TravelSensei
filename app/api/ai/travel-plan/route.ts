import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendations, Destination } from "@/lib/recommendations";
import { generateAITravelPlan } from "@/lib/ai";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user strictly from Supabase session
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

    // 2. Parse request body JSON
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
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Missing request body.",
        },
        { status: 400 }
      );
    }

    // 3. Validate destination_id or destination
    let destinationName = "";
    let destinationStateCountry = "";
    let destinationLat: number | undefined;
    let destinationLng: number | undefined;

    if (typeof body.destination === "string" && body.destination.trim()) {
      destinationName = body.destination.trim();
    } else if (body.destination && typeof body.destination === "object") {
      const dObj = body.destination as Record<string, unknown>;
      if (typeof dObj.name === "string") destinationName = dObj.name.trim();
      if (typeof dObj.state_country === "string") destinationStateCountry = dObj.state_country.trim();
      if (typeof dObj.latitude === "number") destinationLat = dObj.latitude;
      if (typeof dObj.longitude === "number") destinationLng = dObj.longitude;
    } else if (typeof body.destination_name === "string" && body.destination_name.trim()) {
      destinationName = body.destination_name.trim();
    }

    if (typeof body.destination_state_country === "string" && body.destination_state_country.trim()) {
      destinationStateCountry = body.destination_state_country.trim();
    }
    if (typeof body.latitude === "number" && isFinite(body.latitude)) {
      destinationLat = body.latitude;
    }
    if (typeof body.longitude === "number" && isFinite(body.longitude)) {
      destinationLng = body.longitude;
    }

    const rawDestinationId = body.destination_id;
    let cleanDestinationId: string | null = null;

    if (typeof rawDestinationId === "string" && rawDestinationId.trim()) {
      if (UUID_REGEX.test(rawDestinationId.trim())) {
        cleanDestinationId = rawDestinationId.trim();
      } else if (!destinationName) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid destination_id format. Must be a valid UUID.",
          },
          { status: 400 }
        );
      }
    }

    if (!cleanDestinationId && !destinationName) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: destination_id",
        },
        { status: 400 }
      );
    }

    // 4. Validate travel_date
    const travelDate = body.travel_date;
    if (!travelDate || typeof travelDate !== "string" || !travelDate.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: travel_date. Format must be YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    const cleanTravelDate = travelDate.trim();
    if (!isValidCalendarDate(cleanTravelDate)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid travel_date: must be a valid calendar date in YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    // Optional duration validation
    let reqDuration: number | undefined;
    if (body.duration !== undefined && body.duration !== null) {
      if (typeof body.duration !== "number" || !Number.isInteger(body.duration) || body.duration <= 0 || body.duration > 30) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid duration: must be a positive integer between 1 and 30 days.",
          },
          { status: 400 }
        );
      }
      reqDuration = body.duration;
    }

    // Optional budget validation
    let reqBudget: number | undefined;
    if (body.budget !== undefined && body.budget !== null) {
      if (typeof body.budget !== "number" || isNaN(body.budget) || body.budget <= 0 || body.budget > 10000000) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid budget: must be a positive number.",
          },
          { status: 400 }
        );
      }
      reqBudget = body.budget;
    }

    // Optional travel_style validation
    let reqTravelStyle: string | undefined;
    if (body.travel_style !== undefined && body.travel_style !== null) {
      if (typeof body.travel_style !== "string" || !body.travel_style.trim() || body.travel_style.trim().length > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid travel_style: must be a non-empty string up to 50 characters.",
          },
          { status: 400 }
        );
      }
      reqTravelStyle = body.travel_style.trim();
    }

    // Optional season validation
    let reqSeason: string | undefined;
    if (body.season !== undefined && body.season !== null) {
      if (typeof body.season !== "string" || !body.season.trim() || body.season.trim().length > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid season: must be a non-empty string up to 50 characters.",
          },
          { status: 400 }
        );
      }
      reqSeason = body.season.trim();
    }

    // 5. Retrieve destination from database (by ID or name)
    let destination: Destination | null = null;

    if (cleanDestinationId) {
      const { data: destinationData, error: destError } = await supabase
        .from("destinations")
        .select("id, name, state_country, description, latitude, longitude, created_at")
        .eq("id", cleanDestinationId)
        .maybeSingle();

      if (!destError && destinationData) {
        destination = destinationData as Destination;
      }
    }

    if (!destination && destinationName) {
      // Look up destination in database by name
      const { data: matchedByName } = await supabase
        .from("destinations")
        .select("id, name, state_country, description, latitude, longitude, created_at")
        .ilike("name", destinationName)
        .maybeSingle();

      if (matchedByName) {
        destination = matchedByName as Destination;
      } else {
        // Create new destination entry in database so it can be saved and linked to user trips
        const { data: createdDest, error: insertError } = await supabase
          .from("destinations")
          .insert({
            name: destinationName,
            state_country: destinationStateCountry || null,
            description: `Curated destination for ${destinationName}`,
            latitude: typeof destinationLat === "number" && isFinite(destinationLat) ? destinationLat : 0,
            longitude: typeof destinationLng === "number" && isFinite(destinationLng) ? destinationLng : 0,
          })
          .select("id, name, state_country, description, latitude, longitude, created_at")
          .single();

        if (!insertError && createdDest) {
          destination = createdDest as Destination;
        } else if (insertError) {
          console.error("Failed to insert new destination:", insertError.message);
        }
      }
    }

    if (!destination) {
      return NextResponse.json(
        {
          success: false,
          message: "Destination not found.",
        },
        { status: 404 }
      );
    }

    // 6. Retrieve user's saved preferences for fallback criteria
    const { data: userPref } = await supabase
      .from("user_preferences")
      .select("travel_style, budget")
      .eq("user_id", user.id)
      .maybeSingle();

    const effectiveTravelStyle = reqTravelStyle ?? userPref?.travel_style ?? undefined;
    const effectiveBudget = reqBudget ?? userPref?.budget ?? undefined;
    const effectiveDuration = reqDuration ?? undefined;
    const effectiveSeason = reqSeason ?? undefined;

    // 7. Compute deterministic recommendation score and explainability reasons
    const recommendations = generateRecommendations([destination], {
      travel_style: effectiveTravelStyle,
      budget: effectiveBudget,
      duration: effectiveDuration,
      season: effectiveSeason,
    });

    const recommendation = recommendations[0] || {
      destination,
      score: 50,
      reasons: ["Selected destination"],
    };

    // 8. Generate personalized AI travel plan using Groq
    let travelPlan;
    try {
      travelPlan = await generateAITravelPlan({
        destination,
        preferences: {
          travel_style: effectiveTravelStyle,
          budget: effectiveBudget,
          duration: effectiveDuration,
          season: effectiveSeason,
        },
        recommendation,
      });
    } catch (aiErr: unknown) {
      const err = aiErr as { code?: string; message?: string };
      console.error("Groq AI plan generation error:", err.code || "UNKNOWN");

      if (err.code === "GROQ_NOT_CONFIGURED") {
        return NextResponse.json(
          {
            success: false,
            message: "AI travel planning service is temporarily unavailable. Please try again.",
          },
          { status: 503 }
        );
      }

      if (err.code === "GROQ_EMPTY_RESPONSE" || err.code === "GROQ_INVALID_JSON" || err.code === "GROQ_INVALID_SCHEMA") {
        return NextResponse.json(
          {
            success: false,
            message: "AI travel planning service generated an invalid response. Please try again.",
          },
          { status: 502 }
        );
      }

      if (err.code === "GROQ_PROVIDER_ERROR") {
        return NextResponse.json(
          {
            success: false,
            message: "AI travel planning service is temporarily unavailable. Please try again.",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "An unexpected error occurred during AI plan generation.",
        },
        { status: 500 }
      );
    }

    // 9. Validate AI plan days before database persistence
    if (!travelPlan || !Array.isArray(travelPlan.days) || travelPlan.days.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "AI travel plan did not contain valid itinerary days.",
        },
        { status: 502 }
      );
    }

    const dayNumbers = new Set<number>();
    for (const d of travelPlan.days) {
      if (typeof d.day !== "number" || d.day <= 0 || dayNumbers.has(d.day)) {
        return NextResponse.json(
          {
            success: false,
            message: "AI travel plan contains invalid or duplicate day numbers.",
          },
          { status: 502 }
        );
      }
      dayNumbers.add(d.day);
    }

    // 10. Persist Trip row to public.trips using authenticated session user.id
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        destination_id: destination.id,
        travel_date: cleanTravelDate,
        budget: effectiveBudget !== undefined ? Math.round(effectiveBudget) : 0,
        travel_style: effectiveTravelStyle || "general",
        status: "planned",
      })
      .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
      .single();

    if (tripError || !tripData) {
      console.error("Failed to insert trip row:", tripError?.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to persist trip to database.",
        },
        { status: 500 }
      );
    }

    // 11. Persist Itinerary rows to public.itineraries
    const itineraryRows = travelPlan.days.map((day) => ({
      trip_id: tripData.id,
      day_number: day.day,
      schedule_data: {
        title: day.title,
        activities: day.activities,
      },
    }));

    const { data: insertedItineraries, error: itinError } = await supabase
      .from("itineraries")
      .insert(itineraryRows)
      .select("id, trip_id, day_number, schedule_data, created_at");

    if (itinError || !insertedItineraries || insertedItineraries.length !== itineraryRows.length) {
      console.error("Failed to insert itinerary rows. Rolling back trip:", itinError?.message);
      // Rollback / Compensate: Delete the newly created trip (which cascades to any inserted itineraries)
      await supabase.from("trips").delete().eq("id", tripData.id);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to persist travel plan itineraries. Trip creation rolled back.",
        },
        { status: 500 }
      );
    }

    // 12. Return comprehensive saved trip, recommendation, and travel plan payload
    return NextResponse.json(
      {
        success: true,
        trip: {
          id: tripData.id,
          destination_id: tripData.destination_id,
          travel_date: tripData.travel_date,
          budget: tripData.budget,
          travel_style: tripData.travel_style,
          status: tripData.status,
          created_at: tripData.created_at,
        },
        recommendation: {
          score: recommendation.score,
          reasons: recommendation.reasons,
        },
        travel_plan: travelPlan,
        itinerary_ids: insertedItineraries.map((it) => it.id),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Unexpected error in /api/ai/travel-plan:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}
