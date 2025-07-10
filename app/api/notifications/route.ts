import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID talab qilinadi" }, { status: 400 })
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Notifications fetch error:", error)
      return NextResponse.json({ error: "Bildirishnomalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ notifications: notifications || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, userId, isRead } = body

    if (!notificationId || !userId) {
      return NextResponse.json({ error: "Notification ID va User ID talab qilinadi" }, { status: 400 })
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: isRead })
      .eq("id", notificationId)
      .eq("user_id", userId)

    if (error) {
      console.error("Notification update error:", error)
      return NextResponse.json({ error: "Bildirishnomani yangilashda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
