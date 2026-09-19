import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("trip_id");

    // 2. If trip_id is specified, verify that the trip exists and belongs to the authenticated user
    if (tripId) {
      const { data: parentTrip, error: tripErr } = await supabase
        .from("trips")
        .select("id, user_id")
        .eq("id", tripId)
        .maybeSingle();

      if (tripErr) {
        console.error("Supabase trip query error:", tripErr.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to verify trip ownership.",
          },
          { status: 500 }
        );
      }

      if (!parentTrip) {
        return NextResponse.json(
          {
            success: false,
            message: "Trip not found.",
          },
          { status: 404 }
        );
      }

      if (parentTrip.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden",
          },
          { status: 403 }
        );
      }

      const { data, error } = await supabase
        .from("itineraries")
        .select("id, trip_id, day_number, schedule_data, created_at")
        .eq("trip_id", tripId)
        .order("day_number", { ascending: true });

      if (error) {
        console.error("Supabase query error:", error.message);

        return NextResponse.json(
          {
            success: false,
            message: "Failed to fetch itineraries for trip from database.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          itineraries: data,
        },
        { status: 200 }
      );
    }

    // 3. If trip_id is not specified, return only itineraries belonging to the authenticated user's trips
    const { data: userTrips, error: tripsErr } = await supabase
      .from("trips")
      .select("id")
      .eq("user_id", user.id);

    if (tripsErr) {
      console.error("Supabase user trips query error:", tripsErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch user trips.",
        },
        { status: 500 }
      );
    }

    if (!userTrips || userTrips.length === 0) {
      return NextResponse.json(
        {
          success: true,
          itineraries: [],
        },
        { status: 200 }
      );
    }

    const tripIds = userTrips.map((t) => t.id);

    const { data, error } = await supabase
      .from("itineraries")
      .select("id, trip_id, day_number, schedule_data, created_at")
      .in("trip_id", tripIds)
      .order("day_number", { ascending: true });

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch itineraries from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        itineraries: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching itineraries:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { trip_id, day_number, schedule_data } = body;

    if (!trip_id || day_number === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip ID and day number are required fields.",
        },
        { status: 400 }
      );
    }

    // 3. Verify that the parent trip exists and belongs to the authenticated user
    const { data: parentTrip, error: tripFetchErr } = await supabase
      .from("trips")
      .select("id, user_id")
      .eq("id", trip_id)
      .maybeSingle();

    if (tripFetchErr) {
      console.error("Supabase trip query error:", tripFetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify trip ownership.",
        },
        { status: 500 }
      );
    }

    if (!parentTrip) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip not found.",
        },
        { status: 404 }
      );
    }

    if (parentTrip.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Insert itinerary record
    const { data, error } = await supabase
      .from("itineraries")
      .insert({
        trip_id,
        day_number,
        schedule_data,
      })
      .select("id, trip_id, day_number, schedule_data, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create itinerary.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        itinerary: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating itinerary:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { id, trip_id, day_number, schedule_data } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Itinerary ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (trip_id !== undefined) updateData.trip_id = trip_id;
    if (day_number !== undefined) updateData.day_number = day_number;
    if (schedule_data !== undefined) updateData.schedule_data = schedule_data;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the itinerary via its parent trip
    const { data: existingItinerary, error: itinErr } = await supabase
      .from("itineraries")
      .select("id, trip_id")
      .eq("id", id)
      .maybeSingle();

    if (itinErr) {
      console.error("Supabase itinerary query error:", itinErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify itinerary ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingItinerary) {
      return NextResponse.json(
        {
          success: false,
          message: "Itinerary not found.",
        },
        { status: 404 }
      );
    }

    const { data: parentTrip, error: parentTripErr } = await supabase
      .from("trips")
      .select("id, user_id")
      .eq("id", existingItinerary.trip_id)
      .maybeSingle();

    if (parentTripErr) {
      console.error("Supabase parent trip query error:", parentTripErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify parent trip ownership.",
        },
        { status: 500 }
      );
    }

    if (!parentTrip || parentTrip.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. If changing trip_id, verify that the new parent trip exists and belongs to the authenticated user
    if (trip_id !== undefined && trip_id !== existingItinerary.trip_id) {
      const { data: newTrip, error: newTripErr } = await supabase
        .from("trips")
        .select("id, user_id")
        .eq("id", trip_id)
        .maybeSingle();

      if (newTripErr) {
        console.error("Supabase trip query error:", newTripErr.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to verify new trip ownership.",
          },
          { status: 500 }
        );
      }

      if (!newTrip) {
        return NextResponse.json(
          {
            success: false,
            message: "Trip not found.",
          },
          { status: 404 }
        );
      }

      if (newTrip.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden",
          },
          { status: 403 }
        );
      }
    }

    // 5. Update the itinerary record
    const { data, error } = await supabase
      .from("itineraries")
      .update(updateData)
      .eq("id", id)
      .select("id, trip_id, day_number, schedule_data, created_at")
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update itinerary.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        itinerary: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating itinerary:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Itinerary ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the itinerary via its parent trip
    const { data: existingItinerary, error: itinErr } = await supabase
      .from("itineraries")
      .select("id, trip_id")
      .eq("id", id)
      .maybeSingle();

    if (itinErr) {
      console.error("Supabase itinerary query error:", itinErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify itinerary ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingItinerary) {
      return NextResponse.json(
        {
          success: false,
          message: "Itinerary not found.",
        },
        { status: 404 }
      );
    }

    const { data: parentTrip, error: parentTripErr } = await supabase
      .from("trips")
      .select("id, user_id")
      .eq("id", existingItinerary.trip_id)
      .maybeSingle();

    if (parentTripErr) {
      console.error("Supabase parent trip query error:", parentTripErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify parent trip ownership.",
        },
        { status: 500 }
      );
    }

    if (!parentTrip || parentTrip.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Delete the itinerary record
    const { data, error } = await supabase
      .from("itineraries")
      .delete()
      .eq("id", id)
      .select("id, trip_id, day_number, schedule_data, created_at")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete itinerary.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Itinerary deleted successfully.",
        itinerary: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting itinerary:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

