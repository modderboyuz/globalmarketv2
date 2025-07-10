import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, userId } = body

    if (!productId || !userId) {
      return NextResponse.json({ error: "Product ID va User ID talab qilinadi" }, { status: 400 })
    }

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", userId)
      .single()

    if (existingLike) {
      // Remove like
      const { error } = await supabase.from("likes").delete().eq("product_id", productId).eq("user_id", userId)

      if (error) throw error

      return NextResponse.json({ success: true, liked: false })
    } else {
      // Add like
      const { error } = await supabase.from("likes").insert({
        product_id: productId,
        user_id: userId,
      })

      if (error) throw error

      return NextResponse.json({ success: true, liked: true })
    }
  } catch (error) {
    console.error("Like API Error:", error)
    return NextResponse.json({ error: "Like qilishda xatolik" }, { status: 500 })
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
