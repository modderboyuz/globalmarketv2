import { createClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get("user_id")
    const seller_id = searchParams.get("seller_id")
    const status = searchParams.get("status")

    let query = supabase
      .from("orders")
      .select(`
        *,
        product:products(
          id,
          name,
          title,
          price,
          images,
          seller:users(full_name, phone)
        ),
        user:users(full_name, phone, email)
      `)
      .order("created_at", { ascending: false })

    if (user_id) {
      query = query.eq("user_id", user_id)
    }

    if (seller_id) {
      query = query.eq("products.seller_id", seller_id)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching orders:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data })
  } catch (error) {
    console.error("Error in orders API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { product_id, full_name, phone, address, quantity = 1 } = body

    // Get current user (optional for anonymous orders)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Call the database function to create order
    const { data, error } = await supabase.rpc("create_order", {
      product_id_param: product_id,
      full_name_param: full_name,
      phone_param: phone,
      address_param: address,
      quantity_param: quantity,
      user_id_param: user?.id || null,
    })

    if (error) {
      console.error("Error creating order:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({
      message: "Buyurtma muvaffaqiyatli yaratildi",
      order_id: data.order_id,
      total_amount: data.total_amount,
    })
  } catch (error) {
    console.error("Error in orders POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { id, status, seller_notes, client_notes } = body

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update order
    const { data, error } = await supabase
      .from("orders")
      .update({
        status,
        seller_notes,
        client_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        product:products(
          id,
          name,
          title,
          price,
          images,
          seller:users(full_name, phone)
        ),
        user:users(full_name, phone, email)
      `)
      .single()

    if (error) {
      console.error("Error updating order:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Buyurtma holati yangilandi",
      order: data,
    })
  } catch (error) {
    console.error("Error in orders PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
