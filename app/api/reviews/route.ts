import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, orderId, rating, comment, userId } = body

    if (!productId || !orderId || !rating || !userId) {
      return NextResponse.json({ error: "Barcha maydonlar to'ldirilishi kerak" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Reyting 1 dan 5 gacha bo'lishi kerak" }, { status: 400 })
    }

    // Check if the order exists and belongs to the user and is completed
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Buyurtma topilmadi yoki yakunlanmagan" }, { status: 404 })
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("order_id", orderId)
      .eq("user_id", userId)
      .single()

    if (existingReview) {
      return NextResponse.json({ error: "Bu buyurtma uchun allaqachon sharh qoldirilgan" }, { status: 400 })
    }

    // Insert the review
    const { data: review, error: reviewError } = await supabase
      .from("product_reviews")
      .insert({
        product_id: productId,
        order_id: orderId,
        user_id: userId,
        rating: rating,
        comment: comment || null,
      })
      .select()
      .single()

    if (reviewError) {
      console.error("Review creation error:", reviewError)
      return NextResponse.json({ error: "Sharh yaratishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json({ error: "Product ID talab qilinadi" }, { status: 400 })
    }

    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select(`
        *,
        users (
          full_name
        )
      `)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Reviews fetch error:", error)
      return NextResponse.json({ error: "Sharhlarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ reviews: reviews || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
