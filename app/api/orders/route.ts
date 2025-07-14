import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      fullName,
      phone,
      address,
      quantity = 1,
      userId,
      orderType = "immediate",
      withDelivery = false,
      neighborhood,
      street,
      houseNumber,
    } = body

    if (!productId || !fullName || !phone || !address) {
      return NextResponse.json({ error: "Barcha majburiy maydonlar talab qilinadi" }, { status: 400 })
    }

    // Use the create_order function
    const { data, error } = await supabase.rpc("create_order", {
      product_id_param: productId,
      full_name_param: fullName,
      phone_param: phone,
      address_param: address,
      quantity_param: quantity,
      user_id_param: userId,
      with_delivery_param: withDelivery,
      neighborhood_param: neighborhood,
      street_param: street,
      house_number_param: houseNumber,
    })

    if (error) {
      console.error("Order creation error:", error)
      return NextResponse.json({ error: "Buyurtma yaratishda xatolik" }, { status: 500 })
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      order: data,
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
            seller_id,
            has_delivery,
            delivery_price
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
        products!orders_product_id_fkey (name, price, has_delivery, delivery_price),
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
        updateData.stage = 2
        updateData.pickup_address = pickupAddress || currentOrder.address
        if (notes) updateData.seller_notes = notes
        break

      case "reject":
        updateData.is_agree = false
        updateData.status = "cancelled"
        updateData.stage = 0
        if (notes) updateData.seller_notes = notes
        break

      case "client_went":
        updateData.is_client_went = true
        updateData.stage = 3
        if (notes) updateData.client_notes = notes
        break

      case "client_not_went":
        updateData.is_client_went = false
        updateData.stage = 2
        if (notes) updateData.client_notes = notes
        break

      case "product_given":
        updateData.is_client_claimed = true
        updateData.status = "completed"
        updateData.stage = 4
        if (notes) updateData.seller_notes = notes
        break

      case "product_not_given":
        updateData.is_client_claimed = false
        updateData.stage = 3
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
