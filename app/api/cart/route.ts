import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, quantity = 1 } = body

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

    // Check if product exists and is available
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, stock_quantity, is_active")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 })
    }

    if (!product.is_active) {
      return NextResponse.json({ error: "Mahsulot faol emas" }, { status: 400 })
    }

    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Yetarli mahsulot yo'q" }, { status: 400 })
    }

    // Add or update cart item
    const { data, error } = await supabase
      .from("cart")
      .upsert(
        {
          user_id: user.id,
          product_id: product_id,
          quantity: quantity,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,product_id",
        },
      )
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Mahsulot savatga qo'shildi",
      cart_item: data,
    })
  } catch (error) {
    console.error("Cart POST API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get("user_id")

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

    // Get cart items with product details
    const { data: cartItems, error } = await supabase
      .from("cart")
      .select(`
        *,
        products (
          id,
          name,
          price,
          image_url,
          stock_quantity,
          has_delivery,
          delivery_price,
          seller_id,
          users (
            full_name,
            company_name,
            phone
          )
        )
      `)
      .eq("user_id", user_id || user.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // Calculate totals
    let totalAmount = 0
    let totalItems = 0
    let totalDelivery = 0

    cartItems?.forEach((item) => {
      if (item.products) {
        totalAmount += item.products.price * item.quantity
        totalItems += item.quantity
        if (item.products.has_delivery) {
          totalDelivery += item.products.delivery_price
        }
      }
    })

    return NextResponse.json({
      success: true,
      cart_items: cartItems || [],
      summary: {
        total_items: totalItems,
        total_amount: totalAmount,
        total_delivery: totalDelivery,
        grand_total: totalAmount + totalDelivery,
      },
    })
  } catch (error) {
    console.error("Cart GET API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { cart_item_id, quantity } = body

    if (!cart_item_id || !quantity) {
      return NextResponse.json({ error: "Cart item ID va quantity majburiy" }, { status: 400 })
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

    // Update cart item quantity
    const { data, error } = await supabase
      .from("cart")
      .update({
        quantity: quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cart_item_id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Savat yangilandi",
      cart_item: data,
    })
  } catch (error) {
    console.error("Cart PUT API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cart_item_id = searchParams.get("cart_item_id")

    if (!cart_item_id) {
      return NextResponse.json({ error: "Cart item ID majburiy" }, { status: 400 })
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

    // Delete cart item
    const { error } = await supabase.from("cart").delete().eq("id", cart_item_id).eq("user_id", user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Mahsulot savatdan o'chirildi",
    })
  } catch (error) {
    console.error("Cart DELETE API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
