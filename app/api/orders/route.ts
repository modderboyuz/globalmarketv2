import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Order creation request:", body)

    const {
      product_id,
      full_name,
      phone,
      address,
      quantity,
      with_delivery = false,
      neighborhood,
      street,
      house_number,
      selected_group_product_id = null,
    } = body

    // Validate required fields
    if (!product_id || !full_name || !phone || !address || !quantity || quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Barcha majburiy maydonlar to'ldirilishi kerak",
        },
        { status: 400 },
      )
    }

    // Get current user if logged in
    const authHeader = request.headers.get("authorization")
    let user_id = null

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token)

        if (!authError && user) {
          user_id = user.id
        }
      } catch (authError) {
        console.error("Auth error:", authError)
        // Continue as anonymous user
      }
    }

    console.log("Creating order with user_id:", user_id)

    // Use the database function to create order
    const { data, error } = await supabase.rpc("create_simple_order", {
      product_id_param: product_id,
      full_name_param: full_name,
      phone_param: phone,
      address_param: address,
      quantity_param: quantity,
      user_id_param: user_id,
      selected_group_product_id: selected_group_product_id,
    })

    console.log("Database response:", { data, error })

    if (error) {
      console.error("Order creation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtma yaratishda xatolik: " + error.message,
        },
        { status: 500 },
      )
    }

    if (!data || !data.success) {
      console.error("Order creation failed:", data)
      return NextResponse.json(
        {
          success: false,
          error: data?.error || "Buyurtma yaratishda xatolik",
        },
        { status: 400 },
      )
    }

    // Send notification to admin for GlobalMarket products
    try {
      const { data: product } = await supabase
        .from("products")
        .select(`
          name, 
          price,
          product_type,
          users!inner(username, full_name)
        `)
        .eq("id", product_id)
        .single()

      if (product?.users?.username === "admin") {
        console.log("Sending admin notification for GlobalMarket product:", product.name)

        // Get selected product name for group products
        let selectedProductName = ""
        if (product.product_type === "group" && selected_group_product_id) {
          const { data: groupProduct } = await supabase
            .from("group_products")
            .select("product_name")
            .eq("id", selected_group_product_id)
            .single()

          if (groupProduct) {
            selectedProductName = ` (${groupProduct.product_name})`
          }
        }

        const message = `🔔 *Yangi buyurtma!*

🆔 #${data.order_id.toString().slice(-8)}
📦 ${product.name}${selectedProductName}
👤 ${full_name}
📞 ${phone}
📍 ${address}
💰 ${data.total_amount?.toLocaleString()} so'm

Buyurtmani tasdiqlaysizmi?`

        // Send to telegram bot
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/telegram-bot/notify-admins`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            order_id: data.order_id,
            action_type: "order_approval",
          }),
        })
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError)
      // Don't fail the order creation if notification fails
    }

    return NextResponse.json({
      success: true,
      order_id: data.order_id,
      total_amount: data.total_amount,
      message: "Buyurtma muvaffaqiyatli yaratildi",
    })
  } catch (error) {
    console.error("Orders POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi: " + (error instanceof Error ? error.message : "Noma'lum xatolik"),
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get("user_id")
    const status = searchParams.get("status")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // For admin panel, we need to handle requests without user filtering
    const isAdminRequest = searchParams.get("admin") === "true"

    // Build query
    let query = supabase.from("orders").select(
      `
        *,
        products (
          id,
          name,
          price,
          image_url,
          product_type,
          seller_id,
          has_delivery,
          delivery_price,
          users (
            id,
            full_name,
            company_name,
            phone,
            username
          )
        ),
        group_products!selected_group_product_id (
          id,
          product_name,
          product_description
        )
      `,
      { count: "exact" },
    )

    // Apply filters only if not admin request
    if (!isAdminRequest) {
      // Get authorization header for user requests
      const authHeader = request.headers.get("authorization")
      if (!authHeader) {
        return NextResponse.json(
          {
            success: false,
            error: "Authorization required",
          },
          { status: 401 },
        )
      }

      const token = authHeader.replace("Bearer ", "")
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token)

      if (authError || !user) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid token",
          },
          { status: 401 },
        )
      }

      if (user_id) {
        query = query.eq("user_id", user_id)
      } else {
        query = query.eq("user_id", user.id)
      }
    }

    if (status) {
      query = query.eq("status", status)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    query = query.order("created_at", { ascending: false })

    const { data: orders, error, count } = await query

    if (error) {
      console.error("Orders GET error:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Orders GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi: " + (error instanceof Error ? error.message : "Noma'lum xatolik"),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, action, notes } = body

    console.log("Order update request:", { orderId, action, notes })

    if (!orderId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID va action majburiy",
        },
        { status: 400 },
      )
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization required",
        },
        { status: 401 },
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
        },
        { status: 401 },
      )
    }

    // Check if user is admin or has permission
    const { data: userData } = await supabase.from("users").select("is_admin, username").eq("id", user.id).single()

    const isAdmin = userData?.is_admin || userData?.username === "admin"

    if (!isAdmin) {
      // For non-admin users, only allow certain actions on their own orders
      const { data: order } = await supabase.from("orders").select("user_id").eq("id", orderId).single()

      if (!order || order.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Sizda bu buyurtmani o'zgartirish huquqi yo'q",
          },
          { status: 403 },
        )
      }

      // Non-admin users can only perform client actions
      if (!["client_went", "client_not_went"].includes(action)) {
        return NextResponse.json(
          {
            success: false,
            error: "Sizda bu amalni bajarish huquqi yo'q",
          },
          { status: 403 },
        )
      }
    }

    // Use the database function to update order status
    const { data, error } = await supabase.rpc("update_order_status", {
      order_id_param: orderId,
      action_param: action,
      notes_param: notes,
    })

    if (error) {
      console.error("Order update error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtma holatini yangilashda xatolik: " + error.message,
        },
        { status: 500 },
      )
    }

    if (!data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Buyurtma holatini yangilashda xatolik",
        },
        { status: 400 },
      )
    }

    // Send notifications based on action
    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            name,
            product_type,
            users (username, full_name)
          ),
          group_products!selected_group_product_id (
            product_name
          )
        `)
        .eq("id", orderId)
        .single()

      if (orderData?.products?.users?.username === "admin") {
        let message = ""
        let actionType = ""

        // Get selected product name for group products
        let selectedProductName = ""
        if (orderData.products.product_type === "group" && orderData.group_products) {
          selectedProductName = ` (${orderData.group_products.product_name})`
        }

        switch (action) {
          case "agree":
            message = `✅ *Buyurtma tasdiqlandi!*

🆔 #${orderId.slice(-8)}
📦 ${orderData.products.name}${selectedProductName}
👤 ${orderData.full_name}
📞 ${orderData.phone}
📍 Manzil: ${orderData.pickup_address || orderData.address}

Mijoz mahsulotni olish uchun kelishini kutamiz.`
            actionType = "order_confirmed"
            break

          case "client_went":
            message = `🚶‍♂️ *Mijoz keldi!*

🆔 #${orderId.slice(-8)}
📦 ${orderData.products.name}${selectedProductName}
👤 ${orderData.full_name}

Mahsulotni berdingizmi?`
            actionType = "client_arrived"
            break

          case "client_not_went":
            message = `❌ *Mijoz kelmadi*

🆔 #${orderId.slice(-8)}
📦 ${orderData.products.name}${selectedProductName}
👤 ${orderData.full_name}

Mijoz mahsulotni olishga kelmagan.`
            actionType = "client_no_show"
            break
        }

        if (message) {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/telegram-bot/notify-admins`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message,
              order_id: orderId,
              action_type: actionType,
            }),
          })
        }
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError)
    }

    return NextResponse.json({
      success: true,
      message: data.message,
    })
  } catch (error) {
    console.error("Orders PUT error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi: " + (error instanceof Error ? error.message : "Noma'lum xatolik"),
      },
      { status: 500 },
    )
  }
}
