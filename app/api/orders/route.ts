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
      user_id,
      with_delivery = false,
      neighborhood,
      street,
      house_number,
    } = body

    // Validate required fields
    if (!product_id || !full_name || !phone || !address || !quantity) {
      return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring" }, { status: 400 })
    }

    // If delivery is requested, validate delivery fields
    if (with_delivery && (!neighborhood || !street || !house_number)) {
      return NextResponse.json({ error: "Yetkazib berish uchun to'liq manzil kerak" }, { status: 400 })
    }

    // Call the create_order function
    const { data, error } = await supabase.rpc("create_order", {
      product_id_param: product_id,
      full_name_param: full_name,
      phone_param: phone,
      address_param: address,
      quantity_param: quantity,
      user_id_param: user_id || null,
      with_delivery_param: with_delivery,
      neighborhood_param: neighborhood || null,
      street_param: street || null,
      house_number_param: house_number || null,
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
      total_amount: data.total_amount,
      delivery_price: data.delivery_price,
      message: data.message,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get("user_id")
    const seller_id = searchParams.get("seller_id")
    const status = searchParams.get("status")
    const stage = searchParams.get("stage")

    let query = supabase
      .from("orders")
      .select(`
        *,
        products (
          id,
          title,
          price,
          image_url,
          seller_id,
          users!products_seller_id_fkey (
            full_name,
            username
          )
        )
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

    if (stage) {
      query = query.eq("stage", Number.parseInt(stage))
    }

    const { data, error } = await query

    if (error) {
      console.error("Orders fetch error:", error)
      return NextResponse.json({ error: "Buyurtmalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ orders: data || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, status, stage, notes } = body

    if (!order_id) {
      return NextResponse.json({ error: "Buyurtma ID kerak" }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }

    if (status) updateData.status = status
    if (stage) updateData.stage = stage
    if (notes) updateData.notes = notes

    const { data, error } = await supabase.from("orders").update(updateData).eq("id", order_id).select().single()

    if (error) {
      console.error("Order update error:", error)
      return NextResponse.json({ error: "Buyurtmani yangilashda xatolik" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      order: data,
      message: "Buyurtma muvaffaqiyatli yangilandi",
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
