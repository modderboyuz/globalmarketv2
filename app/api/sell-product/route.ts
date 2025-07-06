import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      user_id,
      product_name,
      author,
      description,
      price,
      category_id,
      stock_quantity,
      condition,
      contact_phone,
      contact_email,
      location,
      images,
    } = body

    // Validate required fields
    if (!user_id || !product_name || !price || !contact_phone || !location) {
      return NextResponse.json({ error: "Majburiy maydonlar to'ldirilmagan" }, { status: 400 })
    }

    // Create sell request
    const { data: sellRequest, error } = await supabase
      .from("sell_requests")
      .insert({
        user_id,
        product_name,
        author,
        description,
        price: Number.parseFloat(price),
        category_id,
        stock_quantity: Number.parseInt(stock_quantity) || 1,
        condition,
        contact_phone,
        contact_email,
        location,
        images: images || [],
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Sell request creation error:", error)
      return NextResponse.json({ error: "So'rov yaratishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Mahsulot sotish so'rovi muvaffaqiyatli yuborildi!",
      data: sellRequest,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const status = searchParams.get("status")

    let query = supabase
      .from("sell_requests")
      .select(`
        *,
        categories (name_uz, icon),
        users (full_name, email)
      `)
      .order("created_at", { ascending: false })

    if (userId) {
      query = query.eq("user_id", userId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Fetch sell requests error:", error)
      return NextResponse.json({ error: "So'rovlarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
