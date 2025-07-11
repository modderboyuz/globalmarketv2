import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("id")
    const searchQuery = searchParams.get("search") || ""
    const selectedCategory = searchParams.get("category") || "all"
    const sortBy = searchParams.get("sortBy") || "popular"
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const sellerId = searchParams.get("sellerId")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let productsQuery = supabase.from("products").select(
      `
        id,
        name,
        description,
        price,
        image_url,
        average_rating,
        like_count,
        order_count,
        stock_quantity,
        product_type,
        brand,
        author,
        has_delivery,
        delivery_price,
        is_active,
        is_approved,
        created_at,
        seller_id,
        seller:users!products_seller_id_fkey(full_name, company_name, is_verified_seller, username),
        category:categories!products_category_id_fkey(name, slug, icon)
      `,
      { count: "exact" },
    )

    if (productId) {
      productsQuery = productsQuery.eq("id", productId).single()
    } else {
      if (sellerId) {
        productsQuery = productsQuery.eq("seller_id", sellerId)
      } else {
        productsQuery = productsQuery.eq("is_active", true).eq("is_approved", true)
      }

      if (searchQuery.trim()) {
        productsQuery = productsQuery.or(`
          name.ilike.%${searchQuery}%,
          description.ilike.%${searchQuery}%,
          author.ilike.%${searchQuery}%,
          brand.ilike.%${searchQuery}%
        `)
      }

      if (selectedCategory !== "all") {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", selectedCategory)
          .single()

        if (categoryData) {
          productsQuery = productsQuery.eq("category_id", categoryData.id)
        }
      }

      if (minPrice) {
        productsQuery = productsQuery.gte("price", Number(minPrice))
      }
      if (maxPrice) {
        productsQuery = productsQuery.lte("price", Number(maxPrice))
      }

      switch (sortBy) {
        case "price_asc":
          productsQuery = productsQuery.order("price", { ascending: true })
          break
        case "price_desc":
          productsQuery = productsQuery.order("price", { ascending: false })
          break
        case "popular":
          productsQuery = productsQuery.order("order_count", { ascending: false })
          break
        case "rating":
          productsQuery = productsQuery.order("average_rating", { ascending: false })
          break
        case "newest":
          productsQuery = productsQuery.order("created_at", { ascending: false })
          break
        default:
          productsQuery = productsQuery.order("order_count", { ascending: false })
      }

      productsQuery = productsQuery.range(offset, offset + limit - 1)
    }

    const { data: productsData, error: productsError, count } = await productsQuery

    if (productsError) {
      console.error("Products fetch error:", productsError)
      return NextResponse.json({ error: "Mahsulotlarni olishda xatolik" }, { status: 500 })
    }

    let finalProducts = Array.isArray(productsData) ? productsData : productsData ? [productsData] : []

    const productIds = finalProducts.map((p) => p.id)
    if (productIds.length > 0) {
      const { data: completedOrders, error: ordersError } = await supabase
        .from("orders")
        .select("product_id, quantity")
        .in("product_id", productIds)
        .eq("status", "completed")

      if (ordersError) {
        console.error("Error fetching completed orders for stock calculation:", ordersError)
      } else {
        const completedQuantities = new Map<string, number>()
        completedOrders?.forEach((order) => {
          completedQuantities.set(order.product_id, (completedQuantities.get(order.product_id) || 0) + order.quantity)
        })

        finalProducts = finalProducts.map((product) => {
          const completed = completedQuantities.get(product.id) || 0
          const remaining_stock = product.stock_quantity - completed
          return { ...product, remaining_stock }
        })
      }
    } else {
      finalProducts = finalProducts.map((product) => ({ ...product, remaining_stock: product.stock_quantity }))
    }

    if (!sellerId && !productId) {
      finalProducts = finalProducts.filter((product) => product.remaining_stock > 0)
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      success: true,
      products: finalProducts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
      },
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}
