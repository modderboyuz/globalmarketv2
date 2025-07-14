import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { data: neighborhoods, error } = await supabase.from("neighborhoods").select("*").order("name")

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      neighborhoods: neighborhoods || [],
    })
  } catch (error) {
    console.error("Neighborhoods API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: "Mahalla nomi majburiy" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin huquqi talab qilinadi" }, { status: 403 })
    }

    // Insert neighborhood
    const { data, error } = await supabase.from("neighborhoods").insert({ name }).select().single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Bu mahalla allaqachon mavjud" }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      neighborhood: data,
      message: "Mahalla qo'shildi",
    })
  } catch (error) {
    console.error("Neighborhoods POST API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
