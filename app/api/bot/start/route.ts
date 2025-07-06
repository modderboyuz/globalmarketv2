import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const TELEGRAM_BOT_TOKEN = "8057847116:AAGD-kfGrw8R2ZjTOZqFkpMvNJ6pdHIDfIk"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function GET() {
  try {
    // Bot ma'lumotlarini olish
    const botInfoResponse = await fetch(`${BOT_API_URL}/getMe`)
    const botInfo = await botInfoResponse.json()

    // Webhook ma'lumotlarini olish
    const webhookInfoResponse = await fetch(`${BOT_API_URL}/getWebhookInfo`)
    const webhookInfo = await webhookInfoResponse.json()

    return NextResponse.json({
      success: true,
      message: "GlobalMarket Telegram Bot API",
      bot: botInfo.result,
      webhook: webhookInfo.result,
      endpoints: {
        start_bot: "/api/bot/start",
        webhook: "/api/webhook/telegram",
        admin_panel: "/admin",
        webhook_setup: "/webhook-setup",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Bot ma'lumotlarini olishda xatolik",
        details: error,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case "send_message":
        return await sendMessage(data.chatId, data.message)

      case "get_orders":
        return await getPendingOrders()

      case "update_order":
        return await updateOrderStatus(data.orderId, data.status)

      case "notify_admins":
        return await notifyAdmins(data.orderId)

      default:
        return NextResponse.json({ error: "Noma'lum action" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Bot API xatoligi",
        details: error,
      },
      { status: 500 },
    )
  }
}

async function sendMessage(chatId: number, message: string) {
  try {
    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    const result = await response.json()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}

async function getPendingOrders() {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        books (title, author)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}

async function updateOrderStatus(orderId: string, status: string) {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) throw error

    return NextResponse.json({ success: true, message: "Holat yangilandi" })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}

async function notifyAdmins(orderId: string) {
  try {
    // Admin telegram ID larini olish
    const { data: admins } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("is_admin", true)
      .not("telegram_id", "is", null)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ success: false, error: "Adminlar topilmadi" })
    }

    // Buyurtma ma'lumotlarini olish
    const { data: order } = await supabase.from("orders").select(`*, books (title, author)`).eq("id", orderId).single()

    if (!order) {
      return NextResponse.json({ success: false, error: "Buyurtma topilmadi" })
    }

    const message = `🔔 *Yangi buyurtma!*\n\n🆔 #${order.id.slice(-8)}\n📚 ${order.books.title}\n👤 ${order.full_name}\n📞 ${order.phone}\n💰 ${formatPrice(order.total_amount)}`

    // Barcha adminlarga yuborish
    const results = []
    for (const admin of admins) {
      try {
        const response = await fetch(`${BOT_API_URL}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: admin.telegram_id,
            text: message,
            parse_mode: "Markdown",
          }),
        })
        results.push({ admin: admin.telegram_id, success: response.ok })
      } catch (error) {
        results.push({ admin: admin.telegram_id, success: false, error })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
}
