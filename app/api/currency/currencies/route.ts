import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupportedCurrencies, FrankfurterCurrencyError } from "@/lib/currency";

export async function GET() {
  try {
    const supabase = await createClient();

    // Authenticate user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required to retrieve currencies.",
        },
        { status: 401 }
      );
    }

    const currencies = await getSupportedCurrencies();

    return NextResponse.json(
      {
        success: true,
        data: {
          currencies,
          provider: "frankfurter",
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof FrankfurterCurrencyError) {
      return NextResponse.json(
        {
          success: false,
          message: err.message,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while retrieving supported currencies.",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
