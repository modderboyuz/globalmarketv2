import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, orderId, rating, comment, userId } = body

    if (!productId || !orderId || !rating || !userId) {
      return NextResponse.json({ error: "Barcha maydonlar to'ldirilishi kerak" }, { status: 400 })
    }

    // Check if the order exists and belongs to the user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Buyurtma topilmadi yoki sizga tegishli emas" }, { status: 404 })
    }

    // Check if the product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 })
    }

    // Insert the review
    const { data: review, error: reviewError } = await supabase
      .from("product_reviews")
      .insert({
        product_id: productId,
        order_id: orderId,
        user_id: userId,
        rating: rating,
        comment: comment,
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
