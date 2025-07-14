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

    // Call the database function
    const { data, error } = await supabase.rpc("create_order", {
      product_id_param: product_id,
      full_name_param: full_name,
      phone_param: phone,
      address_param: address,
      quantity_param: quantity,
      user_id_param: user_id,
      with_delivery_param: with_delivery,
      neighborhood_param: neighborhood,
      street_param: street,
      house_number_param: house_number,
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
      order_id: data.order_id,
      total_price: data.total_price,
      delivery_price: data.delivery_price,
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
          title,
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
    const { order_id, status } = body

    if (!order_id || !status) {
      return NextResponse.json({ error: "Order ID va status majburiy" }, { status: 400 })
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

    // Update order status
    const { data, error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .select()
      .single()

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
