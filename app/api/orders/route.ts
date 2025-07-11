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
      stage: 1,
      is_agree: false,
      is_client_went: null,
      is_client_claimed: null,
    }

    const { data: order, error: orderError } = await supabase.from("orders").insert(orderData).select().single()

    if (orderError) {
      console.error("Order creation error:", orderError)
      return NextResponse.json({ error: "Buyurtma yaratishda xatolik" }, { status: 500 })
    }

    // Update product order count and decrease stock
    await supabase
      .from("products")
      .update({
        order_count: product.order_count + quantity,
        stock_quantity: product.stock_quantity - quantity,
      })
      .eq("id", productId)

    // Create notification for seller
    if (product.seller_id && userId) {
      await supabase.rpc("create_notification", {
        p_user_id: product.seller_id,
        p_title: "Yangi buyurtma",
        p_message: `${fullName} tomonidan ${product.name} mahsulotiga buyurtma berildi`,
        p_type: "new_order",
        p_data: { order_id: order.id, product_id: productId },
      })
    }

    return NextResponse.json({
      success: true,
      order: order,
      message: "Buyurtma muvaffaqiyatli yaratildi",
      tracking_url: anonTempId
        ? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || "globalmarketshopbot"}?start=order_${anonTempId}_${order.id}`
        : null,
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
    const sellerId = searchParams.get("sellerId")

    if (sellerId) {
      // Get orders for seller
      const { data: products } = await supabase.from("products").select("id").eq("seller_id", sellerId)

      const productIds = products?.map((p) => p.id) || []

      if (productIds.length === 0) {
        return NextResponse.json({ orders: [] })
      }

      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (
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
          users (
            full_name,
            email,
            phone
          )
        `)
        .in("product_id", productIds)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Orders fetch error:", error)
        return NextResponse.json({ error: "Buyurtmalarni olishda xatolik" }, { status: 500 })
      }

      return NextResponse.json({ orders: orders || [] })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID talab qilinadi" }, { status: 400 })
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (
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
      console.error("Orders fetch error:", error)
      return NextResponse.json({ error: "Buyurtmalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, action, userId, notes, pickupAddress } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: "Order ID va action talab qilinadi" }, { status: 400 })
    }

    // Get current order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, products(seller_id, name)")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 })
    }

    let updateData: any = {}
    let notificationTitle = ""
    let notificationMessage = ""
    let notificationType = ""
    let notificationUserId = null

    switch (action) {
      case "agree":
        // Seller/admin agrees to the order
        updateData = {
          is_agree: true,
          status: "processing",
          pickup_address: pickupAddress || order.address,
          seller_notes: notes,
          stage: 2,
        }
        notificationTitle = "Buyurtma qabul qilindi"
        notificationMessage = `${order.products.name} buyurtmangiz qabul qilindi. Mahsulotni olish manzili: ${pickupAddress || order.address}`
        notificationType = "order_agreed"
        notificationUserId = order.user_id
        break

      case "reject":
        // Seller/admin rejects the order
        updateData = {
          is_agree: false,
          status: "cancelled",
          seller_notes: notes,
          stage: 1,
        }
        notificationTitle = "Buyurtma rad etildi"
        notificationMessage = `${order.products.name} buyurtmangiz rad etildi. Sabab: ${notes || "Belgilanmagan"}`
        notificationType = "order_rejected"
        notificationUserId = order.user_id
        break

      case "client_went":
        // Client confirms they went to pick up
        updateData = {
          is_client_went: true,
          client_notes: notes,
          stage: 3,
        }
        notificationTitle = "Mijoz mahsulot olishga keldi"
        notificationMessage = `${order.full_name} mahsulot olishga kelganini tasdiqladi`
        notificationType = "client_arrived"
        notificationUserId = order.products.seller_id
        break

      case "client_not_went":
        // Client confirms they didn't go
        updateData = {
          is_client_went: false,
          client_notes: notes,
          status: "cancelled",
          stage: 2,
        }
        notificationTitle = "Mijoz mahsulot olishga kelmadi"
        notificationMessage = `${order.full_name} mahsulot olishga kelmaganini bildirdi`
        notificationType = "client_not_arrived"
        notificationUserId = order.products.seller_id
        break

      case "product_given":
        // Seller confirms product was given
        updateData = {
          is_client_claimed: true,
          status: "completed",
          seller_notes: notes,
          stage: 4,
        }
        notificationTitle = "Mahsulot berildi"
        notificationMessage = `${order.products.name} mahsuloti muvaffaqiyatli berildi. Fikr qoldiring!`
        notificationType = "product_delivered"
        notificationUserId = order.user_id
        break

      case "product_not_given":
        // Seller confirms product was not given
        updateData = {
          is_client_claimed: false,
          status: "cancelled",
          seller_notes: notes,
          stage: 4,
        }
        notificationTitle = "Mahsulot berilmadi"
        notificationMessage = `${order.products.name} mahsuloti berilmadi. Qayta buyurtma qilishingiz mumkin.`
        notificationType = "product_not_delivered"
        notificationUserId = order.user_id

        // Return stock to product
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", order.product_id)
          .single()

        if (product) {
          await supabase
            .from("products")
            .update({
              stock_quantity: product.stock_quantity + order.quantity,
            })
            .eq("id", order.product_id)
        }
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

    // Create notification
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
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
