import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
    } = body

    if (!product_id || !full_name || !phone || !address || !quantity) {
      return NextResponse.json({ error: "Barcha maydonlar majburiy" }, { status: 400 })
    }

    // Get current user
    const authHeader = request.headers.get("authorization")
    let user_id = null

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      user_id = user?.id || null
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 })
    }

    // Check stock
    if (product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Yetarli mahsulot yo'q" }, { status: 400 })
    }

    // Calculate total price
    let total_amount = product.price * quantity
    let delivery_price = 0

    if (with_delivery && product.has_delivery) {
      delivery_price = product.delivery_price || 0
      total_amount += delivery_price
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        product_id,
        user_id,
        full_name,
        phone,
        address,
        delivery_address: with_delivery ? `${neighborhood || ""}, ${street || ""}, ${house_number || ""}`.trim() : null,
        delivery_phone: phone,
        quantity,
        total_amount,
        status: "pending",
        order_type: user_id ? "website" : "anonymous",
        anon_temp_id: !user_id ? `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null,
      })
      .select()
      .single()

    if (orderError) {
      console.error("Order creation error:", orderError)
      return NextResponse.json({ error: "Buyurtma yaratishda xatolik" }, { status: 500 })
    }

    // Update product stock
    const { error: stockError } = await supabase
      .from("products")
      .update({
        stock_quantity: Math.max(0, product.stock_quantity - quantity),
        updated_at: new Date().toISOString(),
      })
      .eq("id", product_id)

    if (stockError) {
      console.error("Stock update error:", stockError)
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      total_price: total_amount,
      delivery_price,
      message: "Buyurtma muvaffaqiyatli yaratildi",
    })
  } catch (error) {
    console.error("Order API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get("user_id")
    const status = searchParams.get("status")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

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

    // Build query
    let query = supabase.from("orders").select(
      `
        *,
        products (
          id,
          name,
          price,
          image_url,
          seller_id,
          has_delivery,
          delivery_price
        )
      `,
      { count: "exact" },
    )

    // Apply filters
    if (user_id) {
      query = query.eq("user_id", user_id)
    } else {
      // If no user_id specified, show current user's orders
      query = query.eq("user_id", user.id)
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
    console.error("Orders GET API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, action, notes, pickupAddress, userId } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: "Order ID va action majburiy" }, { status: 400 })
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

    // Get current order
    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    switch (action) {
      case "agree":
        updateData.is_agree = true
        updateData.pickup_address = pickupAddress || order.address
        updateData.seller_notes = notes
        break
      case "reject":
        updateData.is_agree = false
        updateData.status = "cancelled"
        updateData.seller_notes = notes
        break
      case "client_went":
        updateData.is_client_went = true
        updateData.client_notes = notes
        break
      case "client_not_went":
        updateData.is_client_went = false
        updateData.client_notes = notes
        break
      case "product_given":
        updateData.is_client_claimed = true
        updateData.status = "completed"
        updateData.seller_notes = notes
        break
      case "product_not_given":
        updateData.is_client_claimed = false
        updateData.seller_notes = notes
        break
      default:
        return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 })
    }

    const { data, error } = await supabase.from("orders").update(updateData).eq("id", orderId).select().single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      order: data,
      message: "Buyurtma holati yangilandi",
    })
  } catch (error) {
    console.error("Order update API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
