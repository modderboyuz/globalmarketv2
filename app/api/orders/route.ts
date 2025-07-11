import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, fullName, phone, address, quantity = 1, userId } = body

    if (!productId || !fullName || !phone || !address || !userId) {
      return NextResponse.json({ error: "Barcha maydonlar va foydalanuvchi ID talab qilinadi" }, { status: 400 })
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*, users!products_seller_id_fkey(full_name, phone)")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 })
    }

    // Calculate remaining stock based on completed orders
    const { data: completedOrders, error: ordersError } = await supabase
      .from("orders")
      .select("quantity")
      .eq("product_id", productId)
      .eq("status", "completed")

    if (ordersError) {
      console.error("Error fetching completed orders for stock check:", ordersError)
      return NextResponse.json({ error: "Zaxira miqdorini tekshirishda xatolik" }, { status: 500 })
    }

    const completedQuantity = completedOrders?.reduce((sum, order) => sum + order.quantity, 0) || 0
    const remainingStock = product.stock_quantity - completedQuantity

    if (remainingStock < quantity) {
      return NextResponse.json({ error: "Yetarli miqdorda mahsulot yo'q" }, { status: 400 })
    }

    const totalAmount = product.price * quantity

    const orderData = {
      user_id: userId,
      product_id: productId,
      full_name: fullName,
      phone: phone,
      address: address,
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
      return NextResponse.json({ error: "Buyurtma yaratishda xatolik yuz berdi" }, { status: 500 })
    }

    // Only increment order_count, stock_quantity remains initial
    await supabase
      .from("products")
      .update({
        order_count: (product.order_count || 0) + quantity,
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
    const orderId = searchParams.get("orderId") // Added for single order fetch

    if (orderId) {
      const { data: order, error } = await supabase
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
            seller_id
          ),
          users!orders_user_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq("id", orderId)
        .single()

      if (error || !order) {
        console.error("Error fetching single order:", error)
        return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 })
      }
      return NextResponse.json({ success: true, order })
    }

    if (sellerId) {
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
            author
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
    const { orderId, action, notes, pickupAddress } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: "Order ID va action talab qilinadi" }, { status: 400 })
    }

    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*, products(seller_id, name, stock_quantity)")
      .eq("id", orderId)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    let notificationTitle = ""
    let notificationMessage = ""
    let notificationType = ""
    let notificationUserId = currentOrder.user_id

    switch (action) {
      case "agree":
        updateData.is_agree = true
        updateData.status = "processing"
        updateData.pickup_address = pickupAddress || currentOrder.address
        if (notes) updateData.seller_notes = notes
        notificationTitle = "Buyurtma qabul qilindi"
        notificationMessage = `${currentOrder.products.name} buyurtmangiz qabul qilindi. Mahsulotni olish manzili: ${pickupAddress || currentOrder.address}`
        notificationType = "order_agreed"
        break

      case "reject":
        updateData.is_agree = false
        updateData.status = "cancelled"
        if (notes) updateData.seller_notes = notes
        notificationTitle = "Buyurtma rad etildi"
        notificationMessage = `${currentOrder.products.name} buyurtmangiz rad etildi. Sabab: ${notes || "Belgilanmagan"}`
        notificationType = "order_rejected"
        break

      case "client_went":
        updateData.is_client_went = true
        if (notes) updateData.client_notes = notes
        notificationTitle = "Mijoz mahsulot olishga keldi"
        notificationMessage = `${currentOrder.full_name} mahsulot olishga kelganini tasdiqladi`
        notificationType = "client_arrived"
        notificationUserId = currentOrder.products.seller_id
        break

      case "client_not_went":
        updateData.is_client_went = false
        if (notes) updateData.client_notes = notes
        updateData.status = "cancelled" // If client didn't go, order is cancelled
        notificationTitle = "Mijoz mahsulot olishga kelmadi"
        notificationMessage = `${currentOrder.full_name} mahsulot olishga kelmaganini bildirdi`
        notificationType = "client_not_arrived"
        notificationUserId = currentOrder.products.seller_id
        break

      case "product_given":
        updateData.is_client_claimed = true
        updateData.status = "completed"
        if (notes) updateData.seller_notes = notes
        notificationTitle = "Mahsulot berildi"
        notificationMessage = `${currentOrder.products.name} mahsuloti muvaffaqiyatli berildi. Fikr qoldiring!`
        notificationType = "product_delivered"
        break

      case "product_not_given":
        updateData.is_client_claimed = false
        updateData.status = "cancelled"
        if (notes) updateData.seller_notes = notes
        notificationTitle = "Mahsulot berilmadi"
        notificationMessage = `${currentOrder.products.name} mahsuloti berilmadi. Qayta buyurtma qilishingiz mumkin.`
        notificationType = "product_not_delivered"
        break

      default:
        return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 })
    }

    const { error: updateError } = await supabase.from("orders").update(updateData).eq("id", orderId)

    if (updateError) {
      console.error("Order update error:", updateError)
      return NextResponse.json({ error: "Buyurtmani yangilashda xatolik" }, { status: 500 })
    }

    if (notificationUserId) {
      await supabase.rpc("create_notification", {
        p_user_id: notificationUserId,
        p_title: notificationTitle,
        p_message: notificationMessage,
        p_type: notificationType,
        p_data: { order_id: orderId },
      })
    }

    return NextResponse.json({ success: true, message: "Buyurtma muvaffaqiyatli yangilandi" })
  } catch (error) {
    console.error("Order PUT error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}
