import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, user_id } = body

    if (!product_id || !user_id) {
      return NextResponse.json({ error: "Product ID va User ID kerak" }, { status: 400 })
    }

    // Call the like toggle function
    const { data, error } = await supabase.rpc("handle_like_toggle", {
      product_id_param: product_id,
      user_id_param: user_id,
    })

    if (error) {
      console.error("Like toggle error:", error)
      return NextResponse.json({ error: "Like toggle xatosi" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id")
    const user_id = searchParams.get("user_id")

    if (!product_id) {
      return NextResponse.json({ error: "Product ID kerak" }, { status: 400 })
    }

    // Get likes count
    const { data: likesData, error: likesError } = await supabase
      .from("likes")
      .select("id")
      .eq("product_id", product_id)

    if (likesError) {
      console.error("Likes count error:", likesError)
      return NextResponse.json({ error: "Likes sonini olishda xatolik" }, { status: 500 })
    }

    const like_count = likesData?.length || 0
    let is_liked = false

    // Check if user liked this product
    if (user_id) {
      const { data: userLike, error: userLikeError } = await supabase
        .from("likes")
        .select("id")
        .eq("product_id", product_id)
        .eq("user_id", user_id)
        .maybeSingle()

      if (userLikeError) {
        console.error("User like check error:", userLikeError)
      } else {
        is_liked = !!userLike
      }
    }

    return NextResponse.json({
      like_count,
      is_liked,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
