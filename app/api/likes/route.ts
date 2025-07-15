import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id")
    const user_id = searchParams.get("user_id")

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID majburiy",
        },
        { status: 400 },
      )
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    let currentUserId = null

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token)

        if (!authError && user) {
          currentUserId = user.id
        }
      } catch (authError) {
        console.error("Auth error:", authError)
      }
    }

    // Get like status for current user
    let isLiked = false
    if (currentUserId) {
      const { data: like } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("product_id", product_id)
        .single()

      isLiked = !!like
    }

    // Get total like count
    const { count: likeCount } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product_id)

    return NextResponse.json({
      success: true,
      isLiked,
      likeCount: likeCount || 0,
    })
  } catch (error) {
    console.error("Likes GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id } = body

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID majburiy",
        },
        { status: 400 },
      )
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization required",
        },
        { status: 401 },
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
        },
        { status: 401 },
      )
    }

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .single()

    if (existingLike) {
      // Remove like
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product_id)

      if (deleteError) {
        throw deleteError
      }

      // Update product like count
      const { error: updateError } = await supabase.rpc("decrement_like_count", {
        product_id: product_id,
      })

      if (updateError) {
        console.error("Error decrementing like count:", updateError)
      }

      return NextResponse.json({
        success: true,
        liked: false,
        message: "Like olib tashlandi",
      })
    } else {
      // Add like
      const { error: insertError } = await supabase.from("likes").insert({
        user_id: user.id,
        product_id: product_id,
      })

      if (insertError) {
        throw insertError
      }

      // Update product like count
      const { error: updateError } = await supabase.rpc("increment_like_count", {
        product_id: product_id,
      })

      if (updateError) {
        console.error("Error incrementing like count:", updateError)
      }

      return NextResponse.json({
        success: true,
        liked: true,
        message: "Like qo'shildi",
      })
    }
  } catch (error) {
    console.error("Likes POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}
