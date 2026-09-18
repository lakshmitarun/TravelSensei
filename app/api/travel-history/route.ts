import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (userId) {
      const { data, error } = await supabase
        .from("travel_history")
        .select("id, user_id, trip_id, completed_date")
        .eq("user_id", userId);

      if (error) {
        console.error("Supabase query error:", error.message);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch travel history for user from database.",
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
    }

    const { data, error } = await supabase
      .from("travel_history")
      .select("id, user_id, trip_id, completed_date");

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch travel history from database.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, trip_id, completed_date } = body;

    if (!user_id || !trip_id || !completed_date) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID, trip ID, and completed date are required fields.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("travel_history")
      .insert({
        user_id,
        trip_id,
        completed_date,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid user_id or trip_id. User or trip does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create travel history record.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, completed_date } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Travel history ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (completed_date !== undefined) updateData.completed_date = completed_date;

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
      .from("travel_history")
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
            error: "Travel history record not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update travel history record.",
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
          error: "Travel history ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("travel_history")
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
            error: "Travel history record not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete travel history record.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
