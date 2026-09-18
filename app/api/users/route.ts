import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, created_at");

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch users from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        users: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching users:", errorMessage);

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

    const { email, full_name, avatar_url } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .insert({
        email,
        full_name,
        avatar_url,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create user.",
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

    console.error("Unexpected error creating user:", errorMessage);

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
    const { id, full_name, avatar_url } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required.",
        },
        { status: 400 }
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
          error: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
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
            error: "User not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update user.",
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
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
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
            error: "User not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete user.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}