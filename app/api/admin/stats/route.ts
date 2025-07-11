import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
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

    // Get all stats in parallel
    const [
      usersResult,
      sellersResult,
      productsResult,
      ordersResult,
      pendingApplicationsResult,
      recentUsersResult,
      recentOrdersResult,
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      Promise.all([
        supabase.from("seller_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("product_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]),
      supabase
        .from("users")
        .select("*")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select(`*, products(name), users(full_name)`)
        .in("status", ["completed", "cancelled"])
        .gte("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("updated_at", { ascending: false })
        .limit(10),
    ])

    const stats = {
      totalUsers: usersResult.count || 0,
      totalSellers: sellersResult.count || 0,
      totalProducts: productsResult.count || 0,
      totalOrders: ordersResult.count || 0,
      pendingApplications:
        (pendingApplicationsResult[0].count || 0) +
        (pendingApplicationsResult[1].count || 0) +
        (pendingApplicationsResult[2].count || 0),
      recentUsers: recentUsersResult.data || [],
      recentOrders: recentOrdersResult.data || [],
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
