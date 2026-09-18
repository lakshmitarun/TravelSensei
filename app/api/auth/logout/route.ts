import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Sign out current authenticated session using Supabase SSR server client
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase auth signOut error:", error.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Logout successful",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error during logout:", errorMessage);

    return NextResponse.json(
      {
        success: true,
        message: "Logout successful",
      },
      { status: 200 }
    );
  }
}
