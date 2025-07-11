import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, fullName, phone, address, quantity = 1, userId, orderType = "immediate" } = body

    if (!productId || !fullName || !phone || !address) {
      return NextResponse.json({ error: "Barcha maydonlar talab qilinadi" }, { status: 400 })
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*, users!products_seller_id_fkey(full_name, phone)")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 })
    }

    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Yetarli miqdorda mahsulot yo'q" }, { status: 400 })
    }

    // Calculate total amount
    const totalAmount = product.price * quantity

    // Create order
    const orderData = {
      user_id: userId,
      product_id: productId,
      full_name: fullName,
      phone: phone,
      address: address,
      delivery_address: address,
      delivery_phone: phone,
      quantity: quantity,
      total_amount: totalAmount,
      status: "pending",
      is_agree: null,
      is_client_went: null,
      is_client_claimed: null,
      pickup_address: null,
      seller_notes: null,
      client_notes: null,
      created_at: new Date().toISOString(),
    }

    const { data: order, error: orderError } = await supabase.from("orders").insert(orderData).select().single()

    if (orderError) {
      console.error("Order creation error:", orderError)
      return NextResponse.json({ error: "Buyurtma yaratishda xatolik" }, { status: 500 })
    }

    // Update product stock and order count
    await supabase
      .from("products")
      .update({
        stock_quantity: product.stock_quantity - quantity,
        order_count: (product.order_count || 0) + 1,
      })
      .eq("id", productId)

    return NextResponse.json({
      success: true,
      order: order,
      message: "Buyurtma muvaffaqiyatli yaratildi",
    })
  } catch (error) {
    console.error("Order API error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get("sellerId")
    const userId = searchParams.get("userId")

    if (sellerId) {
      // Get orders for seller using product relationship
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          *,
          products!orders_product_id_fkey (
            id,
            name,
            image_url,
            price,
            product_type,
            brand,
            author,
            seller_id
          ),
          users!orders_user_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq("products.seller_id", sellerId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching seller orders:", error)
        return NextResponse.json({ error: "Buyurtmalarni olishda xatolik" }, { status: 500 })
      }

      return NextResponse.json({ success: true, orders: orders || [] })
    }

    if (userId) {
      // Get orders for user
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          *,
          products!orders_product_id_fkey (
            id,
            name,
            image_url,
            price,
            product_type,
            brand,
            author,
            has_delivery,
            delivery_price,
            seller_id,
            users:seller_id (
              full_name,
              company_name,
              phone
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching user orders:", error)
        return NextResponse.json({ error: "Buyurtmalarni olishda xatolik" }, { status: 500 })
      }

      return NextResponse.json({ success: true, orders: orders || [] })
    }

    // Get all orders (admin)
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        products!orders_product_id_fkey (name, price),
        users!orders_user_id_fkey (full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error fetching all orders:", error)
      return NextResponse.json({ error: "Buyurtmalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true, orders: orders || [] })
  } catch (error) {
    console.error("Orders GET error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, action, notes, pickupAddress, userId } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: "Order ID va action talab qilinadi" }, { status: 400 })
    }

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Handle different actions
    switch (action) {
      case "agree":
        updateData.is_agree = true
        updateData.status = "pending"
        updateData.pickup_address = pickupAddress || currentOrder.address
        if (notes) updateData.seller_notes = notes
        break

      case "reject":
        updateData.is_agree = false
        updateData.status = "cancelled"
        if (notes) updateData.seller_notes = notes
        break

      case "client_went":
        updateData.is_client_went = true
        if (notes) updateData.client_notes = notes
        break

      case "client_not_went":
        updateData.is_client_went = false
        if (notes) updateData.client_notes = notes
        break

      case "product_given":
        updateData.is_client_claimed = true
        updateData.status = "completed"
        if (notes) updateData.seller_notes = notes
        break

      case "product_not_given":
        updateData.is_client_claimed = false
        if (notes) updateData.seller_notes = notes
        break

      default:
        return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 })
    }

    // Update order
    const { error: updateError } = await supabase.from("orders").update(updateData).eq("id", orderId)

    if (updateError) {
      console.error("Order update error:", updateError)
      return NextResponse.json({ error: "Buyurtmani yangilashda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Buyurtma muvaffaqiyatli yangilandi" })
  } catch (error) {
    console.error("Order PUT error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}
