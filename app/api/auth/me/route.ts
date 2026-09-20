import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Retrieve the authenticated user strictly from Supabase Auth session cookies
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // 2. Query public.users using only the authenticated user's ID (user.id)
    const { data: publicUser, error: dbError } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      console.error("Error fetching user profile from public.users:", dbError.message);
    }

    if (!publicUser) {
      try {
        await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || null,
          },
          { onConflict: "id" }
        );
      } catch (upsertErr) {
        console.warn("Could not sync public.users on me route:", upsertErr);
      }
    }

    const safeProfile = {
      id: user.id,
      email: publicUser?.email || user.email || "",
      full_name: publicUser?.full_name || user.user_metadata?.full_name || null,
      avatar_url: publicUser?.avatar_url || null,
      created_at: publicUser?.created_at || user.created_at,
    };

    return NextResponse.json(
      {
        success: true,
        user: safeProfile,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error retrieving current user:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred",
      },
      { status: 500 }
    );
  }
}
