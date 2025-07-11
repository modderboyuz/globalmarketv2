import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, orderId, rating, comment, userId } = body

    if (!productId || !orderId || !rating || !userId) {
      return NextResponse.json({ error: "Barcha majburiy maydonlar talab qilinadi" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Reyting 1 dan 5 gacha bo'lishi kerak" }, { status: 400 })
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("order_id", orderId)
      .single()

    if (existingReview) {
      return NextResponse.json({ error: "Siz allaqachon bu mahsulot uchun sharh qoldirgan" }, { status: 400 })
    }

    // Insert review
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        product_id: productId,
        order_id: orderId,
        rating: rating,
        comment: comment || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, review: data })
  } catch (error) {
    console.error("Review API Error:", error)
    return NextResponse.json({ error: "Sharh qoldirishda xatolik" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json({ error: "Product ID talab qilinadi" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        users (full_name, avatar_url)
      `)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, reviews: data || [] })
  } catch (error) {
    console.error("Reviews GET Error:", error)
    return NextResponse.json({ error: "Sharhlarni olishda xatolik" }, { status: 500 })
  }
}
