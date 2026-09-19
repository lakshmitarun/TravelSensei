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

    // 2. Fetch preferences for the authenticated user only
    // Ignore any client-supplied user_id search parameter to prevent IDOR / unauthorized access
    const { data, error } = await supabase
      .from("user_preferences")
      .select("id, user_id, travel_style, budget, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch user preferences from database.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "User preferences not found.",
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
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching user preferences:", errorMessage);

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
    const { travel_style, budget } = body;

    // 3. Insert record using authenticated user.id as source of truth
    const { data, error } = await supabase
      .from("user_preferences")
      .insert({
        user_id: user.id,
        travel_style,
        budget,
      })
      .select("id, user_id, travel_style, budget, created_at, updated_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            message: "Preferences already exist for this user.",
          },
          { status: 409 }
        );
      }

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid user. User does not exist in database.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create user preferences.",
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
    const { id, travel_style, budget } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (travel_style !== undefined) updateData.travel_style = travel_style;
    if (budget !== undefined) updateData.budget = budget;

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    let targetId: string;

    if (id) {
      // 3a. If ID provided, verify ownership of that record
      const { data: existingPref, error: fetchErr } = await supabase
        .from("user_preferences")
        .select("id, user_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) {
        console.error("Supabase query error:", fetchErr.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to verify user preferences.",
          },
          { status: 500 }
        );
      }

      if (!existingPref) {
        return NextResponse.json(
          {
            success: false,
            message: "User preference record not found.",
          },
          { status: 404 }
        );
      }

      if (existingPref.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden",
          },
          { status: 403 }
        );
      }

      targetId = existingPref.id;
    } else {
      // 3b. If ID not provided, target authenticated user's preferences record
      const { data: userPref, error: fetchErr } = await supabase
        .from("user_preferences")
        .select("id, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr) {
        console.error("Supabase query error:", fetchErr.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to verify user preferences.",
          },
          { status: 500 }
        );
      }

      if (!userPref) {
        return NextResponse.json(
          {
            success: false,
            message: "User preferences not found.",
          },
          { status: 404 }
        );
      }

      targetId = userPref.id;
    }

    // 4. Update the preference record enforcing user_id match
    const { data, error } = await supabase
      .from("user_preferences")
      .update(updateData)
      .eq("id", targetId)
      .eq("user_id", user.id)
      .select("id, user_id, travel_style, budget, created_at, updated_at")
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update user preferences.",
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

    let targetId: string;

    if (id) {
      // 3a. If ID provided, verify ownership of that record
      const { data: existingPref, error: fetchErr } = await supabase
        .from("user_preferences")
        .select("id, user_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) {
        console.error("Supabase query error:", fetchErr.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to verify user preferences.",
          },
          { status: 500 }
        );
      }

      if (!existingPref) {
        return NextResponse.json(
          {
            success: false,
            message: "User preference record not found.",
          },
          { status: 404 }
        );
      }

      if (existingPref.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden",
          },
          { status: 403 }
        );
      }

      targetId = existingPref.id;
    } else {
      // 3b. If ID not provided, target authenticated user's preferences record
      const { data: userPref, error: fetchErr } = await supabase
        .from("user_preferences")
        .select("id, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr) {
        console.error("Supabase query error:", fetchErr.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to verify user preferences.",
          },
          { status: 500 }
        );
      }

      if (!userPref) {
        return NextResponse.json(
          {
            success: false,
            message: "User preferences not found.",
          },
          { status: 404 }
        );
      }

      targetId = userPref.id;
    }

    // 4. Delete the preference record enforcing user_id match
    const { data, error } = await supabase
      .from("user_preferences")
      .delete()
      .eq("id", targetId)
      .eq("user_id", user.id)
      .select("id, user_id, travel_style, budget, created_at, updated_at")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete user preferences.",
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
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

