import { createSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Notifications fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notification_id } = await request.json()

    if (!notification_id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification_id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Notification update error:", error)
      return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
