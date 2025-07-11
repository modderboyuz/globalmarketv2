import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const searchQuery = searchParams.get("search") || ""
    const filter = searchParams.get("filter") || "all"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit
    const exportData = searchParams.get("export") === "true"

    if (userId) {
      const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", userId).single()

      if (userError || !user) {
        console.error("User fetch error:", userError)
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 })
      }

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          products!orders_product_id_fkey (name, image_url)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("Orders fetch error for user:", ordersError)
      }

      let products: any[] = []
      if (user.is_verified_seller) {
        const { data: sellerProducts, error: productsError } = await supabase
          .from("products")
          .select(`
            id,
            name,
            price,
            image_url,
            is_active,
            order_count,
            created_at
          `)
          .eq("seller_id", userId)
          .order("created_at", { ascending: false })

        if (productsError) {
          console.error("Products fetch error for seller:", productsError)
        }
        products = sellerProducts || []
      }

      return NextResponse.json({ success: true, user, orders: orders || [], products })
    }

    let query = supabase.from("users").select("*", { count: "exact" }).order("created_at", { ascending: false })

    if (searchQuery) {
      query = query.or(`
        full_name.ilike.%${searchQuery}%,
        email.ilike.%${searchQuery}%,
        phone.ilike.%${searchQuery}%,
        username.ilike.%${searchQuery}%
      `)
    }

    if (filter === "customers") {
      query = query.eq("is_admin", false).eq("is_verified_seller", false)
    } else if (filter === "sellers") {
      query = query.eq("is_verified_seller", true)
    } else if (filter === "admins") {
      query = query.eq("is_admin", true)
    }

    if (!exportData) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: users, error, count } = await query

    if (error) {
      console.error("Users list fetch error:", error)
      return NextResponse.json({ error: "Foydalanuvchilarni olishda xatolik" }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      success: true,
      users: users || [],
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Admin Users API Error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}
