import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase" // Make sure supabase client is configured

export async function GET() {
  try {
    // Fetch neighborhoods from the Supabase 'neighborhoods' table
    const { data: neighborhoods, error } = await supabase
      .from("neighborhoods")
      .select("id, name") // Select only id and name
      .eq("is_active", true) // Filter for active neighborhoods
      .order("name", { ascending: true }) // Order them alphabetically

    if (error) {
      console.error("Supabase fetch neighborhoods error:", error.message)
      throw error // Throw error to be caught by the catch block
    }

    // If data is fetched successfully, return it
    return NextResponse.json({
      success: true,
      neighborhoods: neighborhoods || [], // Return empty array if no neighborhoods found
    })
  } catch (error: any) {
    console.error("GET /api/neighborhoods Error:", error.message)
    // Return a 500 Internal Server Error for any exceptions
    return NextResponse.json(
      {
        success: false,
        error: "Mahallalarni olishda server xatoligi.", // User-friendly error message
      },
      { status: 500 },
    )
  }
}
