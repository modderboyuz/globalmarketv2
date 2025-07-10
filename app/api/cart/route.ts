import { createSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

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

    const { product_id, quantity = 1 } = await request.json()

    if (!product_id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Check if product exists and has stock
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
    }

    // Add to cart or update quantity
    const { data, error } = await supabase
      .from("cart_items")
      .upsert(
        {
          user_id: user.id,
          product_id,
          quantity,
        },
        {
          onConflict: "user_id,product_id",
        },
      )
      .select()

    if (error) {
      console.error("Cart add error:", error)
      return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Cart POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: cartItems, error } = await supabase
      .from("cart_items")
      .select(`
        *,
        products (
          id,
          title,
          price,
          image_url,
          stock_quantity,
          users (
            id,
            full_name,
            company_name
          )
        )
      `)
      .eq("user_id", user.id)

    if (error) {
      console.error("Cart fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
    }

    return NextResponse.json({ cartItems })
  } catch (error) {
    console.error("Cart API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id")

    if (!product_id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", product_id)

    if (error) {
      console.error("Cart delete error:", error)
      return NextResponse.json({ error: "Failed to remove from cart" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cart DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
