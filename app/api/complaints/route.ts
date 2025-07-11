import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, complaintText, userId } = body

    if (!orderId || !complaintText || !userId) {
      return NextResponse.json({ error: "Barcha maydonlar talab qilinadi" }, { status: 400 })
    }

    // Insert complaint
    const { data, error } = await supabase
      .from("complaints")
      .insert({
        user_id: userId,
        order_id: orderId,
        complaint_text: complaintText,
        status: "pending",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, complaint: data })
  } catch (error) {
    console.error("Complaint API Error:", error)
    return NextResponse.json({ error: "Shikoyat yuborishda xatolik" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID talab qilinadi" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("complaints")
      .select(`
        *,
        orders (
          id,
          total_amount,
          products (name, image_url)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, complaints: data || [] })
  } catch (error) {
    console.error("Complaints GET Error:", error)
    return NextResponse.json({ error: "Shikoyatlarni olishda xatolik" }, { status: 500 })
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
