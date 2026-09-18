import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("trip_id");

    if (tripId) {
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
            error: "Failed to fetch itineraries for trip from database.",
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

    const { data, error } = await supabase
      .from("itineraries")
      .select("id, trip_id, day_number, schedule_data, created_at")
      .order("day_number", { ascending: true });

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch itineraries from database.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trip_id, day_number, schedule_data } = body;

    if (!trip_id || day_number === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Trip ID and day number are required fields.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("itineraries")
      .insert({
        trip_id,
        day_number,
        schedule_data,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid trip_id. Trip does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create itinerary.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, day_number, schedule_data } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Itinerary ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (day_number !== undefined) updateData.day_number = day_number;
    if (schedule_data !== undefined) updateData.schedule_data = schedule_data;

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
      .from("itineraries")
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
            error: "Itinerary not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update itinerary.",
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
          error: "Itinerary ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("itineraries")
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
            error: "Itinerary not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete itinerary.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
