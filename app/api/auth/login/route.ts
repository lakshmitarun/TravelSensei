import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. Validation
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email format",
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 2. Perform Supabase Auth Sign In
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes("email not confirmed")) {
        return NextResponse.json(
          {
            success: false,
            message: "Email not confirmed. Please check your email to confirm your account.",
            emailNotConfirmed: true,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    const authUserId = authData.user.id;
    const userEmail = authData.user.email || email.trim();

    // 3. Fetch full_name from public.users using matching authUserId
    const { data: publicUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", authUserId)
      .maybeSingle();

    let resolvedName = publicUser?.full_name || null;
    if (!publicUser) {
      const metadataName = authData.user.user_metadata?.full_name || null;
      resolvedName = metadataName;
      try {
        const dbClient = createDirectClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        );
        const { data: upData, error: upErr } = await dbClient.from("users").upsert(
          {
            id: authUserId,
            email: userEmail,
            full_name: metadataName,
          },
          { onConflict: "id" }
        ).select();
        console.log("Login auto-sync upsert result:", { upData, upErr });
      } catch (upsertErr) {
        console.error("Could not sync public.users on login:", upsertErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: authUserId,
          email: userEmail,
          full_name: resolvedName,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error during login:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred",
      },
      { status: 500 }
    );
  }
}
