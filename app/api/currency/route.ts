import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convertCurrency, FrankfurterCurrencyError } from "@/lib/currency";

export async function GET(request: Request) {
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
          message: "Authentication required to convert currencies.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // 1. Validate 'amount'
    const rawAmount = searchParams.get("amount");
    if (rawAmount === null || rawAmount.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameter: amount",
        },
        { status: 400 }
      );
    }

    const amount = Number(rawAmount.trim());
    if (isNaN(amount) || !isFinite(amount)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid parameter 'amount': must be a finite number",
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid parameter 'amount': must be greater than 0",
        },
        { status: 400 }
      );
    }

    if (amount > 100_000_000) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount exceeds maximum allowed limit of 100,000,000",
        },
        { status: 400 }
      );
    }

    // 2. Validate 'from' currency code
    const rawFrom = searchParams.get("from");
    if (rawFrom === null || rawFrom.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameter: from",
        },
        { status: 400 }
      );
    }

    const from = rawFrom.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(from)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid 'from' currency code: must be a 3-letter ISO currency code",
        },
        { status: 400 }
      );
    }

    // 3. Validate 'to' currency code
    const rawTo = searchParams.get("to");
    if (rawTo === null || rawTo.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameter: to",
        },
        { status: 400 }
      );
    }

    const to = rawTo.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(to)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid 'to' currency code: must be a 3-letter ISO currency code",
        },
        { status: 400 }
      );
    }

    // Execute currency conversion
    const data = await convertCurrency({
      amount,
      from,
      to,
    });

    return NextResponse.json(
      {
        success: true,
        data,
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
        message: "An unexpected error occurred while converting currency.",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
