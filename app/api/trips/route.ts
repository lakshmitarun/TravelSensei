import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const destinationId = searchParams.get("destination_id");

    let query = supabase
      .from("trips")
      .select("id, user_id, destination_id, travel_date, budget, travel_style, status, created_at");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (destinationId) {
      query = query.eq("destination_id", destinationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch trips from database.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, destination_id, travel_date, budget, travel_style, status } = body;

    if (!user_id || !destination_id || !travel_date || budget === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID, destination ID, travel date, and budget are required fields.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id,
        destination_id,
        travel_date,
        budget,
        travel_style,
        status: status || "planned",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid user_id or destination_id. User or destination does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create trip.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, travel_date, budget, travel_style, status } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Trip ID is required.",
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
          error: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("trips")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Trip not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update trip.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Trip ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("trips")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Trip not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete trip.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
