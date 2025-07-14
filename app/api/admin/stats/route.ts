import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
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

    // Get all stats in parallel
    const [usersResult, customersResult, sellersResult, productsResult, ordersResult, pendingApplicationsResult] =
      await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_seller", false).eq("is_admin", false),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_seller", true),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        Promise.all([
          supabase.from("seller_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("product_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]),
      ])

    const stats = {
      totalUsers: usersResult.count || 0,
      totalCustomers: customersResult.count || 0,
      totalSellers: sellersResult.count || 0,
      totalProducts: productsResult.count || 0,
      totalOrders: ordersResult.count || 0,
      pendingApplications:
        (pendingApplicationsResult[0].count || 0) +
        (pendingApplicationsResult[1].count || 0) +
        (pendingApplicationsResult[2].count || 0),
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Admin stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
