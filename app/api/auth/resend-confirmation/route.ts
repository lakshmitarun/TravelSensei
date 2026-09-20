import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

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

    const origin =
      request.headers.get("origin") ||
      request.headers.get("referer") ||
      "http://localhost:3000";
    const redirectUrl = `${new URL(origin).origin}/auth/confirm`;

    const supabase = await createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("Supabase resend confirmation error:", error.message, error.status);

      if (error.message.includes("rate limit") || error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many requests. Please wait a moment before requesting another email.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to resend confirmation email.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Confirmation email sent! Please check your inbox and spam folder.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error resending confirmation email:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
