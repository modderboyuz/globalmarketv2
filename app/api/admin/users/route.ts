import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const filter = searchParams.get("filter")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const userId = searchParams.get("userId")
    const exportData = searchParams.get("export")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user with token
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
          query = query.eq("is_seller", true)
          break
        case "customers":
          query = query.eq("is_seller", false).eq("is_admin", false)
          break
      }
    }

    // Apply pagination for non-export requests
    if (!exportData) {
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)
    }

    query = query.order("created_at", { ascending: false })

    const { data: users, error, count } = await query

    if (error) {
      throw error
    }

    // For export, return all data
    if (exportData) {
      return NextResponse.json({
        success: true,
        users: users || [],
      })
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
