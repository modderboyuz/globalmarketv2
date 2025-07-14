import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id } = body

    if (!product_id) {
      return NextResponse.json({ error: "Product ID majburiy" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .maybeSingle()

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product_id)

      if (deleteError) {
        throw deleteError
      }

      // Update product like count
      await supabase.rpc("decrement_like_count", { product_id })

      return NextResponse.json({
        success: true,
        liked: false,
        message: "Yoqtirish bekor qilindi",
      })
    } else {
      // Like
      const { error: insertError } = await supabase.from("likes").insert({
        user_id: user.id,
        product_id: product_id,
      })

      if (insertError) {
        throw insertError
      }

      // Update product like count
      await supabase.rpc("increment_like_count", { product_id })

      return NextResponse.json({
        success: true,
        liked: true,
        message: "Mahsulot yoqtirildi",
      })
    }
  } catch (error) {
    console.error("Likes API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id")
    const user_id = searchParams.get("user_id")

    if (product_id) {
      // Get like status for specific product
      const authHeader = request.headers.get("authorization")
      let isLiked = false
      let likesCount = 0

      // Get total likes count
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product_id)

      likesCount = count || 0

      // Check if current user liked this product
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "")
        const {
          data: { user },
        } = await supabase.auth.getUser(token)

        if (user) {
          const { data: userLike } = await supabase
            .from("likes")
            .select("id")
            .eq("user_id", user.id)
            .eq("product_id", product_id)
            .maybeSingle()

          isLiked = !!userLike
        }
      }

      return NextResponse.json({
        success: true,
        liked: isLiked,
        likes_count: likesCount,
      })
    }

    if (user_id) {
      // Get user's liked products
      const { data: likes, error } = await supabase
        .from("likes")
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            description,
            seller_id,
            has_delivery,
            delivery_price
          )
        `)
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        likes: likes || [],
      })
    }

    return NextResponse.json({ error: "Product ID yoki User ID majburiy" }, { status: 400 })
  } catch (error) {
    console.error("Likes GET API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
