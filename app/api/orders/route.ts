import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, fullName, phone, address, quantity = 1, userId, orderType = "immediate" } = body

    // Validate required fields
    if (!productId || !fullName || !phone || !address) {
      return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring" }, { status: 400 })
    }

    // Ensure user exists in users table if userId is provided
    if (userId) {
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single()

      if (userCheckError || !existingUser) {
        // Create user record if it doesn't exist
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user && authUser.user.id === userId) {
          const { error: createUserError } = await supabase.from("users").insert({
            id: userId,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name || fullName,
            phone: phone,
            address: address,
          })

          if (createUserError) {
            console.error("Error creating user:", createUserError)
            return NextResponse.json({ error: "Foydalanuvchi yaratishda xatolik" }, { status: 500 })
          }
        }
      }
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 })
    }

    // Check stock
    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Yetarli miqdorda mahsulot yo'q" }, { status: 400 })
    }

    // Calculate total amount
    const productTotal = product.price * quantity
    const deliveryTotal = product.has_delivery ? product.delivery_price : 0
    const totalAmount = productTotal + deliveryTotal

    // Generate anonymous temp ID for non-logged in users
    const anonTempId = !userId ? `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null

    // Create order
    const orderData = {
      product_id: productId,
      user_id: userId || null,
      full_name: fullName,
      phone: phone,
      address: address,
      quantity: quantity,
      total_amount: totalAmount,
      status: "pending",
      order_type: orderType,
      anon_temp_id: anonTempId,
    }

    const { data: order, error: orderError } = await supabase.from("orders").insert(orderData).select().single()

    if (orderError) {
      console.error("Order creation error:", orderError)
      return NextResponse.json({ error: "Buyurtma yaratishda xatolik" }, { status: 500 })
    }

    // Update product order count and stock
    await supabase
      .from("products")
      .update({
        order_count: product.order_count + quantity,
        stock_quantity: product.stock_quantity - quantity,
      })
      .eq("id", productId)

    // Notify admins via Telegram
    try {
      const notifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "new_order",
          order_id: order.id,
        }),
      })
    } catch (notifyError) {
      console.error("Error notifying admins:", notifyError)
      // Don't fail the order creation if notification fails
    }

    return NextResponse.json({
      success: true,
      order: order,
      message: "Buyurtma muvaffaqiyatli yaratildi",
      tracking_url: anonTempId ? `https://t.me/globalmarketshopbot?start=order_${anonTempId}_${order.id}` : null,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID talab qilinadi" }, { status: 400 })
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (
          name,
          image_url,
          price,
          product_type,
          brand,
          author,
          has_delivery,
          delivery_price
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Orders fetch error:", error)
      return NextResponse.json({ error: "Buyurtmalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
