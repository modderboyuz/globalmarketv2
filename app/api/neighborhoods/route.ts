import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data: neighborhoods, error } = await supabase
      .from("neighborhoods")
      .select("id, name")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("Error fetching neighborhoods:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Mahallalarni olishda xatolik",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      neighborhoods: neighborhoods || [],
    })
  } catch (error) {
    console.error("Neighborhoods API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}
