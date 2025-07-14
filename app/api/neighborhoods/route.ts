import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase.from("neighborhoods").select("*").eq("is_active", true).order("name")

    if (error) {
      console.error("Neighborhoods fetch error:", error)
      return NextResponse.json({ error: "Mahallalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ neighborhoods: data || [] })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, district = "G'uzor", region = "Qashqadaryo" } = body

    if (!name) {
      return NextResponse.json({ error: "Mahalla nomi kerak" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("neighborhoods")
      .insert({
        name,
        district,
        region,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Neighborhood creation error:", error)
      return NextResponse.json({ error: "Mahalla yaratishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      neighborhood: data,
      message: "Mahalla muvaffaqiyatli yaratildi",
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
