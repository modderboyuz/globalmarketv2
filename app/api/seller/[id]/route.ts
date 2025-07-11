import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sellerId = params.id

    if (!sellerId) {
      return NextResponse.json({ error: "Seller ID talab qilinadi" }, { status: 400 })
    }

    // Get public seller info using the function
    const { data: sellerInfo, error: sellerError } = await supabase.rpc("get_public_seller_info", {
      seller_id: sellerId,
    })

    if (sellerError) {
      console.error("Seller info error:", sellerError)
      return NextResponse.json({ error: "Sotuvchi ma'lumotlarini olishda xatolik" }, { status: 500 })
    }

    if (!sellerInfo || sellerInfo.length === 0) {
      return NextResponse.json({ error: "Sotuvchi topilmadi" }, { status: 404 })
    }

    // Get seller's products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        image_url,
        order_count,
        view_count,
        like_count,
        average_rating,
        categories (name_uz)
      `)
      .eq("seller_id", sellerId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20)

    if (productsError) {
      console.error("Products error:", productsError)
      return NextResponse.json({ error: "Mahsulotlarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({
      seller: sellerInfo[0],
      products: products || [],
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 })
  }
}
