import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (userId) {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("id, user_id, travel_style, budget, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Supabase query error:", error.message);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch user preferences from database.",
          },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: "User preferences not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          preference: data,
        },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("id, user_id, travel_style, budget, created_at, updated_at");

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch user preferences from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        preferences: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching user preferences:", errorMessage);

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
    const { user_id, travel_style, budget } = body;

    if (!user_id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .insert({
        user_id,
        travel_style,
        budget,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Preferences already exist for this user.",
          },
          { status: 409 }
        );
      }

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid user_id. User does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create user preferences.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        preference: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating user preferences:", errorMessage);

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
    const { id, travel_style, budget } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Preference ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (travel_style !== undefined) updateData.travel_style = travel_style;
    if (budget !== undefined) updateData.budget = budget;

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        {
          success: false,
          error: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_preferences")
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
            error: "User preference record not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update user preferences.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        preference: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating user preferences:", errorMessage);

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
          error: "Preference ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_preferences")
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
            error: "User preference record not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete user preferences.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User preferences deleted successfully.",
        preference: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting user preferences:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
