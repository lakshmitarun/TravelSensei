import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
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
            error: "Failed to fetch places for destination from database.",
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
          error: "Failed to fetch places from database.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destination_id, name, category, latitude, longitude, description } = body;

    if (!destination_id || !name || !category || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Destination ID, name, category, latitude, and longitude are required fields.",
        },
        { status: 400 }
      );
    }

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
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid destination_id. Destination does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create place.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, latitude, longitude, description } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Place ID is required.",
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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("places")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Place not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update place.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Place ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("places")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Place not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete place.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
