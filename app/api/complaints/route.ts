import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, complaintType, description, userId } = body

    if (!orderId || !complaintType || !description || !userId) {
      return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring" }, { status: 400 })
    }

    // Check if order exists and belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 })
    }

    // Create complaint
    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .insert({
        order_id: orderId,
        user_id: userId,
        complaint_type: complaintType,
        description: description,
        status: "pending",
      })
      .select()
      .single()

    if (complaintError) {
      console.error("Complaint creation error:", complaintError)
      return NextResponse.json({ error: "Shikoyat yuborishda xatolik" }, { status: 500 })
    }

    // Notify admins
    const { data: admins } = await supabase.from("users").select("id").eq("is_admin", true)

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await supabase.rpc("create_notification", {
          p_user_id: admin.id,
          p_title: "Yangi shikoyat",
          p_message: `Buyurtma #${orderId.slice(-8)} bo'yicha yangi shikoyat keldi`,
          p_type: "new_complaint",
          p_data: { complaint_id: complaint.id, order_id: orderId },
        })
      }
    }

    return NextResponse.json({ success: true, complaint: complaint })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
