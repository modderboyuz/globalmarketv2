import { createSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id")

    if (!product_id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(`
        *,
        users (
          full_name
        )
      `)
      .eq("product_id", product_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Reviews fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Reviews API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { product_id, order_id, rating, comment } = await request.json()

    if (!product_id || !order_id || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Verify order belongs to user and is completed
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status !== "completed") {
      return NextResponse.json({ error: "Can only review completed orders" }, { status: 400 })
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        product_id,
        user_id: user.id,
        order_id,
        rating,
        comment,
      })
      .select()
      .single()

    if (reviewError) {
      console.error("Review creation error:", reviewError)
      return NextResponse.json({ error: "Failed to create review" }, { status: 500 })
    }

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error("Review creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
