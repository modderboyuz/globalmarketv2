import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const filter = searchParams.get("filter")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const userId = searchParams.get("userId")

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    if (userId) {
      // Get specific user with stats
      const { data: userDetails, error: userError } = await supabase.from("users").select("*").eq("id", userId).single()

      if (userError || !userDetails) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Get user stats
      const [ordersResult, productsResult] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase
          .from("products")
          .select("*")
          .eq("seller_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ])

      return NextResponse.json({
        success: true,
        user: userDetails,
        orders: ordersResult.data || [],
        products: productsResult.data || [],
      })
    }

    // Build query
    let query = supabase.from("users").select("*", { count: "exact" })

    // Apply filters
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,username.ilike.%${search}%`,
      )
    }

    if (filter) {
      switch (filter) {
        case "sellers":
          query = query.eq("is_verified_seller", true)
          break
        case "admins":
          query = query.eq("is_admin", true)
          break
        case "customers":
          query = query.eq("is_verified_seller", false).eq("is_admin", false)
          break
      }
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false })

    const { data: users, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
