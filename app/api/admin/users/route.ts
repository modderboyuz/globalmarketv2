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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, is_verified_seller, is_active } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID talab qilinadi" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user with token
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { data: adminData } = await supabase.from("users").select("is_admin").eq("id", currentUser.id).single()

    if (!adminData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }

    if (typeof is_verified_seller === "boolean") {
      updateData.is_verified_seller = is_verified_seller
      // If a user is verified, they must also be a seller
      if (is_verified_seller) {
        updateData.is_seller = true
      }
    }
    if (typeof is_active === "boolean") {
      updateData.is_active = is_active
    }

    const { data, error } = await supabase.from("users").update(updateData).eq("id", userId).select().single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, user: data, message: "Foydalanuvchi yangilandi" })
  } catch (error) {
    console.error("Admin user update API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
