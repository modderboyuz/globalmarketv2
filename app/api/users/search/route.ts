import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 })
    }

    // Search users by username and full name
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, full_name, profile_image, is_verified_seller, company_name")
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,company_name.ilike.%${query}%`)
      .limit(limit)
      .order("username")

    if (error) {
      console.error("Search users error:", error)
      return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      users: users || [],
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
