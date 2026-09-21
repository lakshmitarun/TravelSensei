import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    // Perform a safe read-only query on the existing `users` table
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      // Safe error message without exposing credentials
      console.error("Database query error:", error.message);
      return NextResponse.json(
        {
          status: "error",
          database: "disconnected",
          message: "Failed to query database table. Please check Supabase policy and configuration."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        database: "connected"
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Supabase connection exception:", errorMessage);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: "Unable to establish database connection."
      },
      { status: 500 }
    );
  }
}
