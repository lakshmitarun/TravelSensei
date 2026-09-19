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

    // 2. Query trips belonging strictly to the authenticated user
    const { searchParams } = new URL(request.url);
    const destinationId = searchParams.get("destination_id");
    const tripId = searchParams.get("id") || searchParams.get("trip_id");

    let query = supabase
      .from("trips")
      .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
      .eq("user_id", user.id);

    if (tripId) {
      query = query.eq("id", tripId);
    } else if (destinationId) {
      query = query.eq("destination_id", destinationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch trips from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        trips: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching trips:", errorMessage);

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
    const { destination_id, travel_date, budget, travel_style, status } = body;

    if (!destination_id || !travel_date || budget === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Destination ID, travel date, and budget are required fields.",
        },
        { status: 400 }
      );
    }

    // 3. Insert record using authenticated user.id as source of truth
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        destination_id,
        travel_date,
        budget,
        travel_style,
        status: status || "planned",
      })
      .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid destination_id. Destination does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create trip.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        trip: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating trip:", errorMessage);

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
    const { id, travel_date, budget, travel_style, status } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (travel_date !== undefined) updateData.travel_date = travel_date;
    if (budget !== undefined) updateData.budget = budget;
    if (travel_style !== undefined) updateData.travel_style = travel_style;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the trip record
    const { data: existingTrip, error: fetchErr } = await supabase
      .from("trips")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase query error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify trip ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingTrip) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip not found.",
        },
        { status: 404 }
      );
    }

    if (existingTrip.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Update the trip record enforcing user_id match
    const { data, error } = await supabase
      .from("trips")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update trip.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        trip: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating trip:", errorMessage);

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
          message: "Trip ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the trip record
    const { data: existingTrip, error: fetchErr } = await supabase
      .from("trips")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase query error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify trip ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingTrip) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip not found.",
        },
        { status: 404 }
      );
    }

    if (existingTrip.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Delete the trip record enforcing user_id match
    const { data, error } = await supabase
      .from("trips")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete trip.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Trip deleted successfully.",
        trip: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting trip:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

