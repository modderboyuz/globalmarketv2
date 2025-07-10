import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, complaintText, userId } = body

    if (!orderId || !complaintText || !userId) {
      return NextResponse.json({ error: "Barcha maydonlar to'ldirilishi kerak" }, { status: 400 })
    }

    // Check if the order exists and belongs to the user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Buyurtma topilmadi yoki sizga tegishli emas" }, { status: 404 })
    }

    // Insert the complaint
    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .insert({
        order_id: orderId,
        user_id: userId,
        complaint_text: complaintText,
        status: "pending",
      })
      .select()
      .single()

    if (complaintError) {
      console.error("Complaint creation error:", complaintError)
      return NextResponse.json({ error: "Shikoyat yaratishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true, complaint })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: complaints, error } = await supabase
      .from("complaints")
      .select(`
        *,
        orders (
          id,
          products (
            name
          )
        ),
        users (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Complaints fetch error:", error)
      return NextResponse.json({ error: "Shikoyatlarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ complaints: complaints || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { complaintId, adminResponse } = body

    if (!complaintId || !adminResponse) {
      return NextResponse.json({ error: "Complaint ID va javob matni talab qilinadi" }, { status: 400 })
    }

    // Update the complaint
    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .update({
        admin_response: adminResponse,
        status: "resolved",
      })
      .eq("id", complaintId)
      .select()
      .single()

    if (complaintError) {
      console.error("Complaint update error:", complaintError)
      return NextResponse.json({ error: "Shikoyatni yangilashda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true, complaint })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
