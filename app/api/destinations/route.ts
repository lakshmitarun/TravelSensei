import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_BUDGET_LEVELS = new Set(["budget", "moderate", "premium"]);

function validateStructuredFields(body: Record<string, unknown>): {
  isValid: boolean;
  error?: string;
  data: Record<string, unknown>;
} {
  const result: Record<string, unknown> = {};

  if (body.travel_styles !== undefined) {
    if (
      !Array.isArray(body.travel_styles) ||
      body.travel_styles.some((s) => typeof s !== "string" || !s.trim())
    ) {
      return {
        isValid: false,
        error: "travel_styles must be an array of non-empty strings.",
        data: {},
      };
    }
    result.travel_styles = (body.travel_styles as string[]).map((s) => s.trim().toLowerCase());
  }

  if (body.budget_level !== undefined) {
    if (typeof body.budget_level !== "string" || !ALLOWED_BUDGET_LEVELS.has(body.budget_level.trim().toLowerCase())) {
      return {
        isValid: false,
        error: "budget_level must be one of: 'budget', 'moderate', 'premium'.",
        data: {},
      };
    }
    result.budget_level = body.budget_level.trim().toLowerCase();
  }

  if (body.destination_type !== undefined) {
    if (typeof body.destination_type !== "string" || !body.destination_type.trim()) {
      return {
        isValid: false,
        error: "destination_type must be a non-empty string.",
        data: {},
      };
    }
    result.destination_type = body.destination_type.trim().toLowerCase();
  }

  if (body.ideal_duration !== undefined) {
    if (
      typeof body.ideal_duration !== "number" ||
      !Number.isInteger(body.ideal_duration) ||
      body.ideal_duration < 1 ||
      body.ideal_duration > 30
    ) {
      return {
        isValid: false,
        error: "ideal_duration must be an integer between 1 and 30.",
        data: {},
      };
    }
    result.ideal_duration = body.ideal_duration;
  }

  if (body.activities !== undefined) {
    if (
      !Array.isArray(body.activities) ||
      body.activities.some((a) => typeof a !== "string" || !a.trim())
    ) {
      return {
        isValid: false,
        error: "activities must be an array of non-empty strings.",
        data: {},
      };
    }
    result.activities = (body.activities as string[]).map((a) => a.trim());
  }

  if (body.best_season !== undefined) {
    if (
      !Array.isArray(body.best_season) ||
      body.best_season.some((s) => typeof s !== "string" || !s.trim())
    ) {
      return {
        isValid: false,
        error: "best_season must be an array of non-empty strings.",
        data: {},
      };
    }
    result.best_season = (body.best_season as string[]).map((s) => s.trim().toLowerCase());
  }

  return { isValid: true, data: result };
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Query all destination fields
    const { data, error } = await supabase
      .from("destinations")
      .select("id, name, state_country, description, latitude, longitude, travel_styles, budget_level, destination_type, ideal_duration, activities, best_season, created_at");

    if (error) {
      // Graceful fallback if new columns are not yet present in schema
      if (error.message.includes("does not exist") || error.code === "42703") {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("destinations")
          .select("id, name, state_country, description, latitude, longitude, created_at");

        if (fallbackError) {
          console.error("Supabase fallback query error:", fallbackError.message);
          return NextResponse.json(
            { success: false, message: "Failed to fetch destinations from database." },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { success: true, destinations: fallbackData },
          { status: 200 }
        );
      }

      console.error("Supabase query error:", error.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch destinations from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        destinations: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching destinations:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user strictly from Supabase SSR session
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

    // 2. Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const { name, state_country, description, latitude, longitude } = body;

    if (!name || typeof name !== "string" || !name.trim() || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, latitude, and longitude are required fields.",
        },
        { status: 400 }
      );
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        {
          success: false,
          message: "Latitude and longitude must be numeric values.",
        },
        { status: 400 }
      );
    }

    // 3. Validate structured destination attributes
    const structuredValidation = validateStructuredFields(body);
    if (!structuredValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: structuredValidation.error,
        },
        { status: 400 }
      );
    }

    const insertPayload: Record<string, unknown> = {
      name: name.trim(),
      state_country: state_country ? String(state_country).trim() : null,
      description: description ? String(description).trim() : null,
      latitude,
      longitude,
      ...structuredValidation.data,
    };

    // 4. Insert destination record
    const { data, error } = await supabase
      .from("destinations")
      .insert(insertPayload)
      .select("id, name, state_country, description, latitude, longitude, travel_styles, budget_level, destination_type, ideal_duration, activities, best_season, created_at")
      .single();

    if (error) {
      // Fallback without new columns if schema migration pending
      if (error.message.includes("does not exist") || error.code === "42703") {
        const { data: fbData, error: fbErr } = await supabase
          .from("destinations")
          .insert({
            name: name.trim(),
            state_country: state_country ? String(state_country).trim() : null,
            description: description ? String(description).trim() : null,
            latitude,
            longitude,
          })
          .select("id, name, state_country, description, latitude, longitude, created_at")
          .single();

        if (fbErr) {
          console.error("Supabase fallback insert error:", fbErr.message);
          return NextResponse.json(
            { success: false, message: "Failed to create destination." },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { success: true, destination: fbData },
          { status: 201 }
        );
      }

      console.error("Supabase insert error:", error.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create destination.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        destination: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating destination:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user strictly from Supabase SSR session
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

    // 2. Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const { id, name, state_country, description, latitude, longitude } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Destination ID is required.",
        },
        { status: 400 }
      );
    }

    const structuredValidation = validateStructuredFields(body);
    if (!structuredValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: structuredValidation.error,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      ...structuredValidation.data,
    };
    if (name !== undefined) updateData.name = String(name).trim();
    if (state_country !== undefined) updateData.state_country = String(state_country).trim();
    if (description !== undefined) updateData.description = String(description).trim();
    if (latitude !== undefined) {
      if (typeof latitude !== "number") {
        return NextResponse.json(
          { success: false, message: "Latitude must be a numeric value." },
          { status: 400 }
        );
      }
      updateData.latitude = latitude;
    }
    if (longitude !== undefined) {
      if (typeof longitude !== "number") {
        return NextResponse.json(
          { success: false, message: "Longitude must be a numeric value." },
          { status: 400 }
        );
      }
      updateData.longitude = longitude;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    // 3. Update destination record
    const { data, error } = await supabase
      .from("destinations")
      .update(updateData)
      .eq("id", id)
      .select("id, name, state_country, description, latitude, longitude, travel_styles, budget_level, destination_type, ideal_duration, activities, best_season, created_at")
      .single();

    if (error) {
      if (error.message.includes("does not exist") || error.code === "42703") {
        const { data: fbData, error: fbErr } = await supabase
          .from("destinations")
          .update(updateData)
          .eq("id", id)
          .select("id, name, state_country, description, latitude, longitude, created_at")
          .single();

        if (fbErr) {
          if (fbErr.code === "PGRST116") {
            return NextResponse.json(
              { success: false, message: "Destination not found." },
              { status: 404 }
            );
          }
          console.error("Supabase fallback update error:", fbErr.message);
          return NextResponse.json(
            { success: false, message: "Failed to update destination." },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { success: true, destination: fbData },
          { status: 200 }
        );
      }

      console.error("Supabase update error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            message: "Destination not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update destination.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        destination: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating destination:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user strictly from Supabase SSR session
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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Destination ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Delete destination record
    const { data, error } = await supabase
      .from("destinations")
      .delete()
      .eq("id", id)
      .select("id, name, state_country, description, latitude, longitude, created_at")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            message: "Destination not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete destination.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Destination deleted successfully.",
        destination: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting destination:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
