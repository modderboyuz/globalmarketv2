import { createSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // 'customer' or 'seller'

    let query = supabase.from("orders").select(`
        *,
        products (
          id,
          title,
          price,
          image_url,
          users (
            id,
            full_name,
            company_name
          )
        ),
        users (
          id,
          full_name,
          phone,
          email
        )
      `)

    if (type === "seller") {
      // Get orders for seller's products
      query = query.eq("products.user_id", user.id)
    } else {
      // Get orders for customer
      query = query.eq("user_id", user.id)
    }

    const { data: orders, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Orders fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Orders API error:", error)
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

    const { product_id, quantity, address } = await request.json()

    if (!product_id || !quantity || !address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("price, stock_quantity, user_id")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
    }

    const total_price = product.price * quantity

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id,
        quantity,
        total_price,
        address,
        status: "pending",
        stage: 1,
      })
      .select()
      .single()

    if (orderError) {
      console.error("Order creation error:", orderError)
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
    }

    // Create notification for seller
    await supabase.from("notifications").insert({
      user_id: product.user_id,
      title: "Yangi buyurtma",
      message: `Sizning mahsulotingizga yangi buyurtma keldi`,
      type: "order",
      order_id: order.id,
    })

    // Remove from cart if exists
    await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", product_id)

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { order_id, action, address } = await request.json()

    if (!order_id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        products (
          user_id,
          title
        )
      `)
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    let updateData: any = {}
    let notificationData: any = null

    switch (action) {
      case "accept":
        // Seller accepts order
        if (order.products.user_id !== user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
        updateData = {
          is_agree: true,
          status: "confirmed",
          stage: 2,
          address: address || order.address,
        }
        notificationData = {
          user_id: order.user_id,
          title: "Buyurtma tasdiqlandi",
          message: `Sizning buyurtmangiz tasdiqlandi. Manzil: ${address || order.address}`,
          type: "order_confirmed",
          order_id: order_id,
        }
        break

      case "client_went":
        // Customer confirms they went to pick up
        if (order.user_id !== user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
        updateData = {
          is_client_went: true,
          status: "ready",
          stage: 3,
        }
        notificationData = {
          user_id: order.products.user_id,
          title: "Mijoz keldi",
          message: `Mijoz mahsulotni olish uchun keldi`,
          type: "client_arrived",
          order_id: order_id,
        }
        break

      case "client_not_went":
        // Customer confirms they didn't go
        if (order.user_id !== user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
        updateData = {
          is_client_went: false,
          stage: 2,
        }
        break

      case "product_given":
        // Seller confirms product was given
        if (order.products.user_id !== user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
        updateData = {
          is_client_claimed: true,
          status: "completed",
          stage: 4,
        }
        notificationData = {
          user_id: order.user_id,
          title: "Buyurtma yakunlandi",
          message: `Buyurtmangiz muvaffaqiyatli yakunlandi. Iltimos, baho bering!`,
          type: "order_completed",
          order_id: order_id,
        }
        break

      case "product_not_given":
        // Seller confirms product was not given
        if (order.products.user_id !== user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
        updateData = {
          is_client_claimed: false,
          status: "cancelled",
          stage: 4,
        }
        notificationData = {
          user_id: order.user_id,
          title: "Buyurtma bekor qilindi",
          message: `Buyurtmangiz bekor qilindi. Qayta buyurtma qilishingiz mumkin.`,
          type: "order_cancelled",
          order_id: order_id,
        }
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Update order
    const { error: updateError } = await supabase.from("orders").update(updateData).eq("id", order_id)

    if (updateError) {
      console.error("Order update error:", updateError)
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    }

    // Send notification
    if (notificationData) {
      await supabase.from("notifications").insert(notificationData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Order update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
