import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      user_id,
      product_name,
      author,
      brand,
      description,
      price,
      category_id,
      stock_quantity,
      condition,
      contact_phone,
      contact_email,
      location,
      images,
      product_type,
      isbn,
      language,
      tags,
    } = body

    // Validate required fields
    if (!user_id || !product_name || !price || !contact_phone || !location || !category_id) {
      return NextResponse.json({ error: "Majburiy maydonlar to'ldirilmagan" }, { status: 400 })
    }

    // Validate price
    const numericPrice = Number.parseFloat(price)
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json({ error: "Narx noto'g'ri formatda" }, { status: 400 })
    }

    // Validate stock quantity
    const numericStock = Number.parseInt(stock_quantity) || 1
    if (numericStock < 1) {
      return NextResponse.json({ error: "Mahsulot miqdori kamida 1 bo'lishi kerak" }, { status: 400 })
    }

    // Create sell request
    const { data: sellRequest, error } = await supabase
      .from("sell_requests")
      .insert({
        user_id,
        product_name,
        author,
        brand,
        description,
        price: numericPrice,
        category_id,
        stock_quantity: numericStock,
        condition: condition || "new",
        contact_phone,
        contact_email,
        location,
        images: images || [],
        product_type: product_type || "physical",
        isbn,
        language: language || "uz",
        tags: tags || [],
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Sell request creation error:", error)
      return NextResponse.json({ error: "So'rov yaratishda xatolik yuz berdi" }, { status: 500 })
    }

    // Get user info for notification
    const { data: userData } = await supabase
      .from("users")
      .select("full_name, phone, username")
      .eq("id", user_id)
      .single()

    // Create admin message for notification
    await supabase.from("admin_messages").insert({
      type: "sell_request",
      title: `Yangi mahsulot sotish so'rovi: ${product_name}`,
      content: `${userData?.username || "Foydalanuvchi"} tomonidan "${product_name}" mahsulotini sotish uchun so'rov yuborildi. Narx: ${numericPrice.toLocaleString()} so'm`,
      data: {
        sell_request_id: sellRequest.id,
        user_id,
        product_name,
        price: numericPrice,
        username: userData?.username,
      },
      status: "pending",
      created_by: user_id,
    })

    // Notify admins via Telegram
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram-bot/notify-admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sell_request",
          title: `Yangi mahsulot sotish so'rovi`,
          message: `📦 Mahsulot: ${product_name}\n💰 Narx: ${numericPrice.toLocaleString()} so'm\n👤 Sotuvchi: @${userData?.username || "noma'lum"}\n📞 Telefon: ${contact_phone}`,
          data: sellRequest,
        }),
      })
    } catch (notificationError) {
      console.error("Telegram notification error:", notificationError)
      // Don't fail the main request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Mahsulot sotish so'rovi muvaffaqiyatli yuborildi! Admin ko'rib chiqishdan so'ng sizga xabar beriladi.",
      data: sellRequest,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const status = searchParams.get("status")

    let query = supabase
      .from("sell_requests")
      .select(`
        *,
        categories (name_uz, icon),
        users (full_name, email, username)
      `)
      .order("created_at", { ascending: false })

    if (userId) {
      query = query.eq("user_id", userId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Fetch sell requests error:", error)
      return NextResponse.json({ error: "So'rovlarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, admin_notes, user_id } = body

    if (!id || !status) {
      return NextResponse.json({ error: "ID va status majburiy" }, { status: 400 })
    }

    // Update sell request
    const { data: updatedRequest, error } = await supabase
      .from("sell_requests")
      .update({
        status,
        admin_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update sell request error:", error)
      return NextResponse.json({ error: "So'rovni yangilashda xatolik" }, { status: 500 })
    }

    // If approved, create the actual product
    if (status === "approved") {
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: updatedRequest.product_name,
          description: updatedRequest.description,
          price: updatedRequest.price,
          category_id: updatedRequest.category_id,
          seller_id: updatedRequest.user_id,
          stock_quantity: updatedRequest.stock_quantity,
          condition: updatedRequest.condition,
          author: updatedRequest.author,
          brand: updatedRequest.brand,
          isbn: updatedRequest.isbn,
          language: updatedRequest.language,
          tags: updatedRequest.tags,
          product_type: updatedRequest.product_type,
          images: updatedRequest.images,
          is_active: true,
          is_approved: true,
        })
        .select()
        .single()

      if (productError) {
        console.error("Product creation error:", productError)
        return NextResponse.json({ error: "Mahsulot yaratishda xatolik" }, { status: 500 })
      }

      // Notify user about approval
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("telegram_id, username")
          .eq("id", updatedRequest.user_id)
          .single()

        if (userData?.telegram_id) {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram-bot/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: userData.telegram_id,
              text: `✅ Sizning "${updatedRequest.product_name}" mahsulotingiz tasdiqlandi va bozorga qo'shildi!\n\n🔗 Ko'rish: https://globalmarketshop.netlify.app/product/${product.id}`,
            }),
          })
        }
      } catch (notificationError) {
        console.error("User notification error:", notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `So'rov ${status === "approved" ? "tasdiqlandi" : "rad etildi"}`,
      data: updatedRequest,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
