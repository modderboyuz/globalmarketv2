import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, telegram_id, full_name, phone } = body

    if (!email || !telegram_id) {
      return NextResponse.json({ error: "Email and Telegram ID are required" }, { status: 400 })
    }

    // Call the database function to connect telegram
    const { data, error } = await supabase.rpc("connect_telegram_to_user", {
      p_email: email,
      p_telegram_id: telegram_id,
      p_full_name: full_name,
      p_phone: phone,
    })

    if (error) {
      console.error("Telegram connection error:", error)
      return NextResponse.json({ error: "Failed to connect Telegram account" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegram_id = searchParams.get("telegram_id")
    const email = searchParams.get("email")

    if (!telegram_id && !email) {
      return NextResponse.json({ error: "Telegram ID or email is required" }, { status: 400 })
    }

    let query = supabase.from("users").select("id, username, full_name, email, telegram_id, phone")

    if (telegram_id) {
      query = query.eq("telegram_id", telegram_id)
    } else if (email) {
      query = query.eq("email", email)
    }

    const { data: user, error } = await query.single()

    if (error) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
