import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { data: neighborhoods, error } = await supabase
      .from("neighborhoods")
      .select("*")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("Error fetching neighborhoods:", error)
      return NextResponse.json({ error: "Mahallalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true, neighborhoods: neighborhoods || [] })
  } catch (error) {
    console.error("Neighborhoods API Error:", error)
    return NextResponse.json({ error: "Mahallalarni olishda xatolik" }, { status: 500 })
  }
}
