import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Order request body:", body)

    const {
      product_id,
      full_name,
      phone,
      address,
      quantity,
      with_delivery = false,
      neighborhood = null,
      street = null,
      house_number = null,
      selected_group_product_id = null,
    } = body

    // Validate required fields
    if (!product_id || !full_name || !phone || !quantity) {
      console.log("Missing required fields:", { product_id, full_name, phone, quantity })
      return NextResponse.json(
        {
          success: false,
          error: "Majburiy maydonlar to'ldirilmagan",
        },
        { status: 400 },
      )
    }

    // Get user ID from auth header if available
    let user_id = null
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token)
        if (!authError && user) {
          user_id = user.id
          console.log("Authenticated user:", user_id)
        }
      } catch (authError) {
        console.log("Auth error (non-critical):", authError)
      }
    }

    console.log("Creating order with data:", {
      product_id,
      user_id,
      full_name,
      phone,
      address,
      quantity,
      with_delivery,
      selected_group_product_id,
    })

    // Use the create_simple_order function
    const { data: result, error: functionError } = await supabase.rpc("create_simple_order", {
      product_id_param: product_id,
      full_name_param: full_name,
      phone_param: phone,
      address_param: address || "Do'kondan olib ketish",
      quantity_param: Number.parseInt(quantity),
      user_id_param: user_id,
      selected_group_product_id: selected_group_product_id,
    })

    console.log("Function result:", result)
    console.log("Function error:", functionError)

    if (functionError) {
      console.error("Function error:", functionError)
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtma yaratishda xatolik: " + functionError.message,
        },
        { status: 500 },
      )
    }

    if (!result || !result.success) {
      console.error("Function returned error:", result)
      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Buyurtma yaratishda xatolik",
        },
        { status: 400 },
      )
    }

    console.log("Order created successfully:", result)

    // Send notification to admin via Telegram if it's an admin product
    try {
      const { data: product } = await supabase
        .from("products")
        .select(`
          name, 
          price,
          users!inner(username, full_name)
        `)
        .eq("id", product_id)
        .single()

      if (product?.users?.username === "admin") {
        console.log("Sending admin notification for product:", product.name)

        // Get selected product name for group products
        let selectedProductName = ""
        if (selected_group_product_id) {
          const { data: groupProduct } = await supabase
            .from("group_products")
            .select("product_name")
            .eq("id", selected_group_product_id)
            .single()

          if (groupProduct) {
            selectedProductName = ` (${groupProduct.product_name})`
          }
        }

        const message = `🛒 Yangi buyurtma!

📦 Mahsulot: ${product.name}${selectedProductName}
👤 Mijoz: ${full_name}
📞 Telefon: ${phone}
📍 Manzil: ${address}
📊 Miqdor: ${quantity}
💰 Jami: ${result.total_amount?.toLocaleString()} so'm
🚚 Yetkazib berish: ${with_delivery ? "Ha" : "Yo'q"}

Buyurtma ID: ${result.order_id}`

        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/telegram-bot/notify-admins`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        })
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError)
      // Don't fail the order creation if notification fails
    }

    return NextResponse.json({
      success: true,
      order_id: result.order_id,
      total_amount: result.total_amount,
      message: "Buyurtma muvaffaqiyatli yaratildi!",
    })
  } catch (error) {
    console.error("Unexpected error in order creation:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Buyurtma yaratishda kutilmagan xatolik yuz berdi",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Avtorizatsiya kerak",
        },
        { status: 401 },
      )
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Yaroqsiz token",
        },
        { status: 401 },
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin, username")
      .eq("id", user.id)
      .single()

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          error: "Foydalanuvchi ma'lumotlarini olishda xatolik",
        },
        { status: 500 },
      )
    }

    const isAdmin = userData?.is_admin || userData?.username === "admin"

    let query = supabase
      .from("orders")
      .select(`
        *,
        products (
          id,
          name,
          price,
          image_url,
          product_type,
          users (
            id,
            full_name,
            company_name,
            phone,
            username
          )
        ),
        group_products (
          id,
          product_name,
          product_description
        )
      `)
      .order("created_at", { ascending: false })

    // If not admin, only show user's orders
    if (!isAdmin) {
      query = query.eq("user_id", user.id)
    }

    const { data: orders, error: ordersError } = await query

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtmalarni olishda xatolik",
        },
        { status: 500 },
      )
    }

    // Process orders to include selected product info for group products
    const processedOrders = orders?.map((order) => {
      let selectedProductInfo = null

      if (order.selected_group_product_id && order.group_products) {
        const groupProduct = Array.isArray(order.group_products)
          ? order.group_products.find((gp) => gp.id === order.selected_group_product_id)
          : order.group_products

        if (groupProduct) {
          selectedProductInfo = {
            id: groupProduct.id,
            name: groupProduct.product_name,
            description: groupProduct.product_description,
          }
        }
      }

      return {
        ...order,
        selected_product_info: selectedProductInfo,
      }
    })

    return NextResponse.json({
      success: true,
      orders: processedOrders || [],
      is_admin: isAdmin,
    })
  } catch (error) {
    console.error("Error in GET /api/orders:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Buyurtmalarni olishda xatolik",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Avtorizatsiya kerak",
        },
        { status: 401 },
      )
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Yaroqsiz token",
        },
        { status: 401 },
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin, username")
      .eq("id", user.id)
      .single()

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          error: "Foydalanuvchi ma'lumotlarini olishda xatolik",
        },
        { status: 500 },
      )
    }

    const isAdmin = userData?.is_admin || userData?.username === "admin"

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Sizda bu amalni bajarish huquqi yo'q",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { order_id, status, admin_notes } = body

    if (!order_id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtma ID va status majburiy",
        },
        { status: 400 },
      )
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status,
        admin_notes: admin_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating order:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtmani yangilashda xatolik",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Buyurtma muvaffaqiyatli yangilandi",
    })
  } catch (error) {
    console.error("Error in PATCH /api/orders:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Buyurtmani yangilashda xatolik",
      },
      { status: 500 },
    )
  }
}
