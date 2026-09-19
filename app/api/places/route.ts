import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const destinationId = searchParams.get("destination_id");

    if (destinationId) {
      const { data, error } = await supabase
        .from("places")
        .select("id, destination_id, name, category, latitude, longitude, description, created_at")
        .eq("destination_id", destinationId);

      if (error) {
        console.error("Supabase query error:", error.message);

        return NextResponse.json(
          {
            success: false,
            message: "Failed to fetch places for destination from database.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          places: data,
        },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from("places")
      .select("id, destination_id, name, category, latitude, longitude, description, created_at");

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch places from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        places: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching places:", errorMessage);

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
    const { destination_id, name, category, latitude, longitude, description } = body;

    if (!destination_id || !name || !category || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Destination ID, name, category, latitude, and longitude are required fields.",
        },
        { status: 400 }
      );
    }

    // 3. Validate that destination_id exists in public.destinations
    const { data: destination, error: destErr } = await supabase
      .from("destinations")
      .select("id")
      .eq("id", destination_id)
      .maybeSingle();

    if (destErr) {
      console.error("Supabase destination query error:", destErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify destination.",
        },
        { status: 500 }
      );
    }

    if (!destination) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid destination_id. Destination does not exist.",
        },
        { status: 400 }
      );
    }

    // 4. Insert place record
    const { data, error } = await supabase
      .from("places")
      .insert({
        destination_id,
        name,
        category,
        latitude,
        longitude,
        description,
      })
      .select("id, destination_id, name, category, latitude, longitude, description, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create place.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        place: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating place:", errorMessage);

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
    const { id, destination_id, name, category, latitude, longitude, description } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Place ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (description !== undefined) updateData.description = description;

    // 3. If destination_id is provided, validate that it exists
    if (destination_id !== undefined) {
      const { data: destination, error: destErr } = await supabase
        .from("destinations")
        .select("id")
        .eq("id", destination_id)
        .maybeSingle();

      if (destErr) {
        console.error("Supabase destination query error:", destErr.message);
        return NextResponse.json(
          {
            success: false,
            message: "Failed to verify destination.",
          },
          { status: 500 }
        );
      }

      if (!destination) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid destination_id. Destination does not exist.",
          },
          { status: 400 }
        );
      }

      updateData.destination_id = destination_id;
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

    // 4. Update place record
    const { data, error } = await supabase
      .from("places")
      .update(updateData)
      .eq("id", id)
      .select("id, destination_id, name, category, latitude, longitude, description, created_at")
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            message: "Place not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update place.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        place: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating place:", errorMessage);

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
          message: "Place ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Delete place record
    const { data, error } = await supabase
      .from("places")
      .delete()
      .eq("id", id)
      .select("id, destination_id, name, category, latitude, longitude, description, created_at")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            message: "Place not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete place.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Place deleted successfully.",
        place: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting place:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

