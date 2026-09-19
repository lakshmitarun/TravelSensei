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

    // 2. Query travel history belonging strictly to the authenticated user
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("trip_id");

    let query = supabase
      .from("travel_history")
      .select("id, user_id, trip_id, completed_date")
      .eq("user_id", user.id);

    if (tripId) {
      query = query.eq("trip_id", tripId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch travel history from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        travel_history: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching travel history:", errorMessage);

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

    // 2. Parse request body - ignore any client-supplied user_id
    const body = await request.json().catch(() => ({}));
    const { trip_id, completed_date } = body;

    if (!trip_id || !completed_date) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip ID and completed date are required fields.",
        },
        { status: 400 }
      );
    }

    // 3. Verify that the referenced trip exists and belongs to the authenticated user
    const { data: referencedTrip, error: tripFetchErr } = await supabase
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

    if (!referencedTrip) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip not found.",
        },
        { status: 404 }
      );
    }

    if (referencedTrip.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Insert record using authenticated user.id as source of truth
    const { data, error } = await supabase
      .from("travel_history")
      .insert({
        user_id: user.id,
        trip_id,
        completed_date,
      })
      .select("id, user_id, trip_id, completed_date")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create travel history record.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        travel_history: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating travel history:", errorMessage);

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
    const { id, completed_date, trip_id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Travel history ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (completed_date !== undefined) updateData.completed_date = completed_date;
    if (trip_id !== undefined) updateData.trip_id = trip_id;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the travel-history record
    const { data: existingHistory, error: fetchErr } = await supabase
      .from("travel_history")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase query error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify travel history ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingHistory) {
      return NextResponse.json(
        {
          success: false,
          message: "Travel history record not found.",
        },
        { status: 404 }
      );
    }

    if (existingHistory.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. If changing trip_id, verify that the new trip belongs to the authenticated user
    if (trip_id !== undefined) {
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

    // 5. Update the travel history record enforcing user_id match
    const { data, error } = await supabase
      .from("travel_history")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, user_id, trip_id, completed_date")
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update travel history record.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        travel_history: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating travel history:", errorMessage);

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
          message: "Travel history ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the travel history record
    const { data: existingHistory, error: fetchErr } = await supabase
      .from("travel_history")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase query error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify travel history ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingHistory) {
      return NextResponse.json(
        {
          success: false,
          message: "Travel history record not found.",
        },
        { status: 404 }
      );
    }

    if (existingHistory.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Delete the travel history record enforcing user_id match
    const { data, error } = await supabase
      .from("travel_history")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, user_id, trip_id, completed_date")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete travel history record.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Travel history record deleted successfully.",
        travel_history: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting travel history:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}


