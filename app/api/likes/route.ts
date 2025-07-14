import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, userId } = body

    if (!productId || !userId) {
      return NextResponse.json({ error: "Product ID va User ID talab qilinadi" }, { status: 400 })
    }

    // Use the handle_like_toggle function
    const { data, error } = await supabase.rpc("handle_like_toggle", {
      product_id_param: productId,
      user_id_param: userId,
    })

    if (error) {
      console.error("Like toggle error:", error)
      return NextResponse.json({ error: "Like qilishda xatolik yuz berdi" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Like API Error:", error)
    return NextResponse.json({ error: "Like qilishda xatolik yuz berdi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const userId = searchParams.get("userId")

    if (!productId) {
      return NextResponse.json({ error: "Product ID talab qilinadi" }, { status: 400 })
    }

    // Get like count
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId)

    let isLiked = false
    if (userId) {
      const { data: userLike } = await supabase
        .from("likes")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", userId)
        .single()

      isLiked = !!userLike
    }

    return NextResponse.json({
      success: true,
      likeCount: count || 0,
      isLiked,
    })
  } catch (error) {
    console.error("Like GET Error:", error)
    return NextResponse.json({ error: "Like ma'lumotlarini olishda xatolik" }, { status: 500 })
  }
}
