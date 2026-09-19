import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

    // 2. Query reviews belonging strictly to the authenticated user
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("place_id");

    let query = supabase
      .from("reviews")
      .select("id, user_id, place_id, rating, comment, created_at")
      .eq("user_id", user.id);

    if (placeId) {
      query = query.eq("place_id", placeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch reviews from database.",
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

    // 2. Parse request body - ignore any client-supplied user_id
    const body = await request.json().catch(() => ({}));
    const { place_id, rating, comment } = body;

    if (!place_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Place ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Insert record using authenticated user.id as source of truth
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        place_id,
        rating,
        comment,
      })
      .select("id, user_id, place_id, rating, comment, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      if (error.code === "23503") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid place_id. Place does not exist.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create review.",
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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { id, rating, comment } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Review ID is required.",
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
          message: "No fields provided to update.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the review record
    const { data: existingReview, error: fetchErr } = await supabase
      .from("reviews")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase query error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify review ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "Review not found.",
        },
        { status: 404 }
      );
    }

    if (existingReview.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Update the review record enforcing user_id match
    const { data, error } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, user_id, place_id, rating, comment, created_at")
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update review.",
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
          message: "Review ID is required.",
        },
        { status: 400 }
      );
    }

    // 3. Verify ownership of the review record
    const { data: existingReview, error: fetchErr } = await supabase
      .from("reviews")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("Supabase query error:", fetchErr.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify review ownership.",
        },
        { status: 500 }
      );
    }

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "Review not found.",
        },
        { status: 404 }
      );
    }

    if (existingReview.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }

    // 4. Delete the review record enforcing user_id match
    const { data, error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, user_id, place_id, rating, comment, created_at")
      .single();

    if (error) {
      console.error("Supabase delete error:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete review.",
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
        message: "An internal server error occurred.",
      },
      { status: 500 }
    );
  }
}

