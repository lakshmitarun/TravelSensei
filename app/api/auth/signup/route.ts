import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name } = body;

    // 1. Input validations
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format.",
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Password is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Full name is required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 2. Register user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: full_name.trim(),
        },
      },
    });

    if (authError) {
      console.error("Supabase auth signUp error:", authError.message, "status:", authError.status, "code:", authError.code);

      if (
        authError.message.includes("already registered") ||
        authError.message.includes("already exists") ||
        authError.status === 422
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email already exists.",
          },
          { status: 409 }
        );
      }

      if (authError.message.includes("rate limit") || authError.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "Signup rate limit exceeded. Please wait a moment and try again.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: authError.message || "Failed to sign up user.",
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration failed. No user returned.",
        },
        { status: 500 }
      );
    }

    const authUserId = authData.user.id;
    const userEmail = authData.user.email || email.trim();

    // 3. Synchronize user profile into public.users using authUserId
    const { error: dbError } = await supabase
      .from("users")
      .upsert(
        {
          id: authUserId,
          email: userEmail,
          full_name: full_name.trim(),
        },
        { onConflict: "id" }
      );

    if (dbError) {
      console.error("Failed to sync user with public.users:", dbError.message);
      return NextResponse.json(
        {
          success: false,
          error: "User registered but failed to sync user profile.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully.",
        user: {
          id: authUserId,
          email: userEmail,
          full_name: full_name.trim(),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error during signup:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
