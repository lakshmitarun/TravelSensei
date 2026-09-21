import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchHotels, NuiteeApiError } from "@/lib/hotels";
import { HotelSearchParams } from "@/lib/hotels/types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/i;
const COUNTRY_REGEX = /^[A-Z]{2}$/i;

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

function isDateInPast(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map((s) => parseInt(s, 10));
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return targetDate < today;
}

interface ParsedHotelQueryParams {
  destination?: string;
  city?: string;
  countryCode?: string;
  hotelIds?: string[];
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  childrenAges?: number[];
  rooms: number;
  currency: string;
  guestNationality: string;
  limit: number;
}

function validateAndParseParams(params: Record<string, unknown>): {
  validParams?: ParsedHotelQueryParams;
  errorResponse?: NextResponse;
} {
  // 1. Validate destination / city / hotelIds
  const destination = typeof params.destination === "string" ? params.destination.trim() : undefined;
  const city = typeof params.city === "string" ? params.city.trim() : undefined;
  const hotelIdParam = typeof params.hotelId === "string" ? params.hotelId.trim() : undefined;

  let hotelIds: string[] | undefined;
  if (Array.isArray(params.hotelIds)) {
    hotelIds = params.hotelIds.map(String).filter(Boolean);
  } else if (hotelIdParam) {
    hotelIds = [hotelIdParam];
  }

  const targetLocation = destination || city;
  if (!targetLocation && (!hotelIds || hotelIds.length === 0)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Missing required search target: provide destination, city, or hotelId.",
        },
        { status: 400 }
      ),
    };
  }

  // 2. Validate checkin date
  const checkin = typeof params.checkin === "string" ? params.checkin.trim() : undefined;
  if (!checkin) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Missing required field: checkin (YYYY-MM-DD)",
        },
        { status: 400 }
      ),
    };
  }

  if (!isValidCalendarDate(checkin)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Invalid checkin date format. Must be a valid date in YYYY-MM-DD format.",
        },
        { status: 400 }
      ),
    };
  }

  if (isDateInPast(checkin)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Checkin date cannot be in the past.",
        },
        { status: 400 }
      ),
    };
  }

  // 3. Validate checkout date
  const checkout = typeof params.checkout === "string" ? params.checkout.trim() : undefined;
  if (!checkout) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Missing required field: checkout (YYYY-MM-DD)",
        },
        { status: 400 }
      ),
    };
  }

  if (!isValidCalendarDate(checkout)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Invalid checkout date format. Must be a valid date in YYYY-MM-DD format.",
        },
        { status: 400 }
      ),
    };
  }

  if (checkout <= checkin) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Checkout date must be after checkin date.",
        },
        { status: 400 }
      ),
    };
  }

  // 4. Validate adults
  let adults = 1;
  if (params.adults !== undefined && params.adults !== null) {
    const parsedAdults = parseInt(String(params.adults), 10);
    if (isNaN(parsedAdults) || parsedAdults < 1 || parsedAdults > 20) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            message: "Invalid adults count. Must be an integer between 1 and 20.",
          },
          { status: 400 }
        ),
      };
    }
    adults = parsedAdults;
  }

  // 5. Validate children
  let children = 0;
  let childrenAges: number[] | undefined;
  if (params.children !== undefined && params.children !== null) {
    const parsedChildren = parseInt(String(params.children), 10);
    if (isNaN(parsedChildren) || parsedChildren < 0 || parsedChildren > 10) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            message: "Invalid children count. Must be an integer between 0 and 10.",
          },
          { status: 400 }
        ),
      };
    }
    children = parsedChildren;
  }

  if (Array.isArray(params.childrenAges)) {
    childrenAges = params.childrenAges.map((a) => parseInt(String(a), 10)).filter((a) => !isNaN(a));
    children = Math.max(children, childrenAges.length);
  }

  // 6. Validate rooms
  let rooms = 1;
  if (params.rooms !== undefined && params.rooms !== null) {
    const parsedRooms = parseInt(String(params.rooms), 10);
    if (isNaN(parsedRooms) || parsedRooms < 1 || parsedRooms > 10) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            message: "Invalid rooms count. Must be an integer between 1 and 10.",
          },
          { status: 400 }
        ),
      };
    }
    rooms = parsedRooms;
  }

  // 7. Validate currency
  let currency = "USD";
  if (typeof params.currency === "string" && params.currency.trim()) {
    const cleanCur = params.currency.trim().toUpperCase();
    if (!CURRENCY_REGEX.test(cleanCur)) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            message: "Invalid currency code. Must be a 3-letter ISO currency code (e.g. USD, EUR, INR).",
          },
          { status: 400 }
        ),
      };
    }
    currency = cleanCur;
  }

  // 8. Validate countryCode
  let countryCode: string | undefined;
  if (typeof params.countryCode === "string" && params.countryCode.trim()) {
    const cleanCountry = params.countryCode.trim().toUpperCase();
    if (!COUNTRY_REGEX.test(cleanCountry)) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            message: "Invalid countryCode. Must be a 2-letter ISO country code.",
          },
          { status: 400 }
        ),
      };
    }
    countryCode = cleanCountry;
  }

  // 9. Validate guestNationality
  let guestNationality = "US";
  if (typeof params.guestNationality === "string" && params.guestNationality.trim()) {
    const cleanNat = params.guestNationality.trim().toUpperCase();
    if (COUNTRY_REGEX.test(cleanNat)) {
      guestNationality = cleanNat;
    }
  }

  // 10. Limit
  let limit = 20;
  if (params.limit !== undefined && params.limit !== null) {
    const parsedLimit = parseInt(String(params.limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100) {
      limit = parsedLimit;
    }
  }

  return {
    validParams: {
      destination: targetLocation,
      city: city || targetLocation,
      countryCode,
      hotelIds,
      checkin,
      checkout,
      adults,
      children,
      childrenAges,
      rooms,
      currency,
      guestNationality,
      limit,
    },
  };
}

async function handleSearch(params: Record<string, unknown>) {
  const { validParams, errorResponse } = validateAndParseParams(params);
  if (errorResponse) return errorResponse;
  if (!validParams) {
    return NextResponse.json({ success: false, message: "Invalid parameters" }, { status: 400 });
  }

  const searchParams: HotelSearchParams = {
    destination: validParams.destination,
    city: validParams.city,
    countryCode: validParams.countryCode,
    hotelIds: validParams.hotelIds,
    checkin: validParams.checkin,
    checkout: validParams.checkout,
    adults: validParams.adults,
    children: validParams.children,
    childrenAges: validParams.childrenAges,
    rooms: validParams.rooms,
    currency: validParams.currency,
    guestNationality: validParams.guestNationality,
    limit: validParams.limit,
  };

  const result = await searchHotels(searchParams);

  return NextResponse.json(
    {
      success: true,
      data: result,
    },
    { status: 200 }
  );
}

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
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params: Record<string, unknown> = {};

    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }

    // Support comma-separated hotelIds in query parameter
    const rawHotelIds = searchParams.get("hotelIds");
    if (rawHotelIds) {
      params.hotelIds = rawHotelIds.split(",").map((s) => s.trim()).filter(Boolean);
    }

    return await handleSearch(params);
  } catch (err: unknown) {
    if (err instanceof NuiteeApiError) {
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

    console.error("Hotel search internal error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        success: false,
        message: "Unable to search hotels right now.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    let body: Record<string, unknown> = {};
    const text = await request.text();
    if (text && text.trim().length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid JSON format in request body.",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Missing request body.",
        },
        { status: 400 }
      );
    }

    return await handleSearch(body);
  } catch (err: unknown) {
    if (err instanceof NuiteeApiError) {
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

    console.error("Hotel search internal error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        success: false,
        message: "Unable to search hotels right now.",
      },
      { status: 500 }
    );
  }
}
