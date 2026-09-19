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

    // 2. Fetch the authenticated user's own profile
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get("id");

    if (queryId && queryId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch user profile from database.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching user profile:", errorMessage);

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

    // 2. Prevent duplicate profile creation
    const { data: existingUser, error: checkErr } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (checkErr) {
      console.error("Supabase check error:", checkErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to check existing user profile.",
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User profile already exists.",
        },
        { status: 409 }
      );
    }

    // 3. Parse request body - client cannot spoof user ID or email
    const body = await request.json().catch(() => ({}));
    const { full_name, avatar_url } = body;

    const { data, error } = await supabase
      .from("users")
      .insert({
        id: user.id,
        email: user.email || "",
        full_name: full_name || null,
        avatar_url: avatar_url || null,
      })
      .select("id, email, full_name, avatar_url, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create user profile.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating user profile:", errorMessage);

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
    const { id, full_name, avatar_url } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Prevent cross-user profile modifications
    if (id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (full_name !== undefined) {
      updateData.full_name = full_name;
    }
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    // 4. Verify that the user profile exists
    const { data: existingProfile, error: fetchErr } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase fetch error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify user profile.",
        },
        { status: 500 }
      );
    }

    if (!existingProfile) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    // 5. Update user profile
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id)
      .select("id, email, full_name, avatar_url, created_at")
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update user.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating user:", errorMessage);

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
          message: "User ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Prevent deleting another user's profile
    if (id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Verify profile exists
    const { data: existingProfile, error: fetchErr } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase fetch error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify user profile.",
        },
        { status: 500 }
      );
    }

    if (!existingProfile) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    // 5. Delete public.users record
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id)
      .select("id, email, full_name, avatar_url, created_at")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete user.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User deleted successfully.",
        user: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting user:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}