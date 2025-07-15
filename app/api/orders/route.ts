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

    // Use the database function to create order
    const { data, error } = await supabase.rpc("create_simple_order", {
      product_id_param: product_id,
      full_name_param: full_name,
      phone_param: phone,
      address_param: address,
      quantity_param: quantity,
      user_id_param: user_id,
    })

    if (error) {
      console.error("Order creation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtma yaratishda xatolik",
        },
        { status: 500 },
      )
    }

    if (!data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.error,
        },
        { status: 400 },
      )
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
        error: "Server xatoligi",
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
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
        },
        { status: 401 },
      )
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
    console.error("Orders GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, action, notes, pickupAddress } = body

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
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
        },
        { status: 401 },
      )
    }

    // Get current order
    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single()

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: "Buyurtma topilmadi",
        },
        { status: 404 },
      )
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
        return NextResponse.json(
          {
            success: false,
            error: "Noto'g'ri action",
          },
          { status: 400 },
        )
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
    console.error("Orders PUT error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}
