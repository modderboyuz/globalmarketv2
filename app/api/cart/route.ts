import { createClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { product_id, quantity = 1 } = body

    if (!product_id) {
      return NextResponse.json({ error: "Product ID majburiy" }, { status: 400 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if product exists and is active
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, stock_quantity, is_active")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 })
    }

    if (!product.is_active) {
      return NextResponse.json({ error: "Mahsulot nofaol" }, { status: 400 })
    }

    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Yetarli mahsulot yo'q" }, { status: 400 })
    }

    // Add to cart or update quantity
    const { data, error } = await supabase
      .from("cart")
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
      .select(`
        *,
        product:products(
          id,
          name,
          title,
          price,
          images,
          stock_quantity,
          seller:users(full_name)
        )
      `)
      .single()

    if (error) {
      console.error("Error adding to cart:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Mahsulot savatga qo'shildi",
      cart_item: data,
    })
  } catch (error) {
    console.error("Error in cart POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get cart items
    const { data, error } = await supabase
      .from("cart")
      .select(`
        *,
        product:products(
          id,
          name,
          title,
          price,
          images,
          stock_quantity,
          seller:users(full_name)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching cart:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate total
    const total = data.reduce((sum, item) => {
      return sum + item.product.price * item.quantity
    }, 0)

    return NextResponse.json({
      cart_items: data,
      total,
      count: data.length,
    })
  } catch (error) {
    console.error("Error in cart GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { id, quantity } = body

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update cart item quantity
    const { data, error } = await supabase
      .from("cart")
      .update({ quantity })
      .eq("id", id)
      .eq("user_id", user.id)
      .select(`
        *,
        product:products(
          id,
          name,
          title,
          price,
          images,
          seller:users(full_name)
        )
      `)
      .single()

    if (error) {
      console.error("Error updating cart item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Savat yangilandi",
      cart_item: data,
    })
  } catch (error) {
    console.error("Error in cart PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete cart item
    const { error } = await supabase.from("cart").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting cart item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Mahsulot savatdan o'chirildi" })
  } catch (error) {
    console.error("Error in cart DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
