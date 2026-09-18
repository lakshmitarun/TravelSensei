import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("destinations")
      .select("id, name, state_country, description, latitude, longitude, created_at");

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch destinations from database.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, state_country, description, latitude, longitude } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, latitude, and longitude are required fields.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("destinations")
      .insert({
        name,
        state_country,
        description,
        latitude,
        longitude,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create destination.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, state_country, description, latitude, longitude } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Destination ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (state_country !== undefined) updateData.state_country = state_country;
    if (description !== undefined) updateData.description = description;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

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
      .from("destinations")
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
            error: "Destination not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update destination.",
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
          error: "Destination ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("destinations")
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
            error: "Destination not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete destination.",
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
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
