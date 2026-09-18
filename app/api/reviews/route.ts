import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const placeId = searchParams.get("place_id");

    let query = supabase
      .from("reviews")
      .select("id, user_id, place_id, rating, comment, created_at");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (placeId) {
      query = query.eq("place_id", placeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch reviews from database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reviews: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error fetching reviews:", errorMessage);

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
    const { user_id, place_id, rating, comment } = body;

    if (!user_id || !place_id) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID and place ID are required fields.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id,
        place_id,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid user_id or place_id. User or place does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create review.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        review: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error creating review:", errorMessage);

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
    const { id, rating, comment } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Review ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

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
      .from("reviews")
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
            error: "Review not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update review.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        review: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error updating review:", errorMessage);

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
          error: "Review ID is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("reviews")
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
            error: "Review not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete review.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Review deleted successfully.",
        review: data,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Unexpected error deleting review:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}
