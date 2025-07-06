import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    console.log("📨 Telegram webhook received:", JSON.stringify(update, null, 2))

    // Handle different types of updates
    if (update.message) {
      await handleMessage(update.message)
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
    }

    return NextResponse.json({ ok: true, processed: true })
  } catch (error) {
    console.error("❌ Webhook error:", error)
    return NextResponse.json({ error: "Webhook error", details: error }, { status: 500 })
  }
}

export async function GET() {
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com"}/api/webhook/telegram`

  return NextResponse.json({
    message: "Telegram webhook endpoint",
    bot_token: TELEGRAM_BOT_TOKEN.slice(0, 10) + "...",
    status: "active",
    webhook_url: webhookUrl,
    timestamp: new Date().toISOString(),
  })
}

async function handleMessage(message: any) {
  const chatId = message.chat.id
  const text = message.text
  const userId = message.from.id

  console.log(`📝 Processing message from ${userId}: ${text}`)

  // Update or create user
  await updateUserTelegramId(userId, message.from)

  // Check if user is admin
  const isAdmin = await checkAdminStatus(userId)

  if (text?.startsWith("/start")) {
    await sendWelcomeMessage(chatId, message.from.first_name, isAdmin)
  } else if (text === "/admin" && isAdmin) {
    await sendAdminPanel(chatId)
  } else if (text === "/orders" && isAdmin) {
    await showPendingOrders(chatId)
  } else if (text === "/myorders") {
    await showUserOrders(chatId, userId)
  } else if (text === "/help") {
    await sendHelpMessage(chatId)
  } else {
    // Handle regular messages or unknown commands
    await sendTelegramMessage(
      chatId,
      "❓ Noma'lum buyruq. Yordam uchun /help yuboring.\n\n📋 Mavjud buyruqlar:\n/start - Botni boshlash\n/myorders - Buyurtmalarim\n/help - Yordam",
    )
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from.id
  const data = callbackQuery.data

  console.log(`🔘 Callback query from ${userId}: ${data}`)

  await answerCallbackQuery(callbackQuery.id, "✅")

  const isAdmin = await checkAdminStatus(userId)

  // Handle admin callbacks
  if (isAdmin && data.startsWith("admin_")) {
    if (data === "admin_orders") {
      await showPendingOrders(chatId)
    } else if (data === "admin_messages") {
      await showAdminMessages(chatId)
    } else if (data === "admin_stats") {
      await showStats(chatId)
    }
  }

  // Handle order status updates (admin only)
  if (isAdmin && data.includes("_order_")) {
    const [action, orderId] = data.split("_order_")
    await handleOrderAction(chatId, callbackQuery.id, orderId, action, callbackQuery.message.message_id)
  }

  // Handle general navigation
  if (data === "back_to_main") {
    await sendWelcomeMessage(chatId, callbackQuery.from.first_name, isAdmin)
  } else if (data === "back_to_admin" && isAdmin) {
    await sendAdminPanel(chatId)
  }
}

async function updateUserTelegramId(telegramId: number, userInfo: any) {
  try {
    const { data: existingUser } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single()

    if (!existingUser) {
      const { error } = await supabase.from("users").insert({
        telegram_id: telegramId,
        full_name: `${userInfo.first_name} ${userInfo.last_name || ""}`.trim(),
        email: `telegram_${telegramId}@temp.com`,
      })

      if (error) {
        console.error("Foydalanuvchi yaratishda xatolik:", error)
      } else {
        console.log(`✅ Yangi foydalanuvchi yaratildi: ${telegramId}`)
      }
    }
  } catch (error) {
    console.error("Telegram ID yangilashda xatolik:", error)
  }
}

async function checkAdminStatus(telegramId: number): Promise<boolean> {
  try {
    const { data: user } = await supabase.from("users").select("is_admin").eq("telegram_id", telegramId).single()

    return user?.is_admin || false
  } catch (error) {
    console.error("Admin status tekshirishda xatolik:", error)
    return false
  }
}

async function sendWelcomeMessage(chatId: number, firstName: string, isAdmin: boolean) {
  const name = firstName || "Foydalanuvchi"

  const message = `👋 Salom ${name}! GlobalMarket botiga xush kelibsiz!\n\n🛒 Mahsulot sotib olish\n🔍 Mahsulot qidirish\n🏪 Market haqida\n📞 Murojaat qilish\n\n📋 Buyurtmalaringizni kuzatish uchun "Buyurtmalarim" tugmasini bosing.`

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🛒 Mahsulot sotib olish", callback_data: "buy_products" },
        { text: "🔍 Mahsulot qidirish", callback_data: "search_products" },
      ],
      [
        { text: "🏪 Market haqida", callback_data: "about_market" },
        { text: "📞 Murojaat qilish", callback_data: "contact_us" },
      ],
      [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }],
      ...(isAdmin ? [[{ text: "👑 Admin Panel", callback_data: "admin_panel" }]] : []),
    ],
  }

  await sendTelegramMessage(chatId, message, keyboard)
}

async function sendAdminPanel(chatId: number) {
  const message = `👑 *Admin Panel*\n\nTizimni boshqarish va nazorat qilish\n\n📊 Statistika va hisobotlar\n📋 Buyurtmalarni boshqarish\n💬 Xabarlarni ko'rish\n👥 Foydalanuvchilar`

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📋 Buyurtmalar", callback_data: "admin_orders" },
        { text: "💬 Xabarlar", callback_data: "admin_messages" },
      ],
      [
        { text: "📊 Statistika", callback_data: "admin_stats" },
        { text: "🔙 Bosh menyu", callback_data: "back_to_main" },
      ],
    ],
  }

  await sendTelegramMessage(chatId, message, keyboard, "Markdown")
}

async function sendHelpMessage(chatId: number) {
  const message = `❓ *Yordam*\n\n*Mavjud buyruqlar:*\n/start - Botni boshlash\n/myorders - Buyurtmalarim\n/help - Yordam\n\n*Admin buyruqlari:*\n/admin - Admin panel\n/orders - Barcha buyurtmalar\n\n*Bot imkoniyatlari:*\n🛒 Mahsulot sotib olish\n🔍 Mahsulot qidirish\n📋 Buyurtmalarni kuzatish\n🏪 Market haqida ma'lumot\n📞 Aloqa ma'lumotlari`

  await sendTelegramMessage(chatId, message, null, "Markdown")
}

async function showPendingOrders(chatId: number) {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (name, price)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!orders || orders.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi buyurtmalar yo'q.", {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      })
      return
    }

    let message = "📋 *Yangi buyurtmalar:*\n\n"

    for (const order of orders) {
      message += `🆔 *#${order.id.slice(-8)}*\n`
      message += `📦 ${order.products.name}\n`
      message += `👤 ${order.full_name}\n`
      message += `📞 ${order.phone}\n`
      message += `💰 ${formatPrice(order.total_amount)}\n`
      message += `📅 ${formatDate(order.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    await sendTelegramMessage(
      chatId,
      message,
      {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      },
      "Markdown",
    )

    // Send action buttons for each order
    for (const order of orders) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "🔄 Jarayonda", callback_data: `processing_order_${order.id}` },
            { text: "✅ Bajarildi", callback_data: `complete_order_${order.id}` },
          ],
          [{ text: "❌ Bekor qilish", callback_data: `cancel_order_${order.id}` }],
        ],
      }

      await sendTelegramMessage(chatId, `Buyurtma #${order.id.slice(-8)} uchun amal tanlang:`, keyboard)
    }
  } catch (error) {
    console.error("Error showing pending orders:", error)
    await sendTelegramMessage(chatId, "❌ Buyurtmalarni olishda xatolik.")
  }
}

async function showAdminMessages(chatId: number) {
  try {
    const { data: messages, error } = await supabase
      .from("admin_messages")
      .select(`
        *,
        users (full_name, phone)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!messages || messages.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi xabarlar yo'q.", {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      })
      return
    }

    let message = "💬 *Yangi xabarlar:*\n\n"

    for (const msg of messages) {
      const typeText = getMessageTypeText(msg.type)
      message += `📝 *${typeText}*\n`
      message += `👤 ${msg.users?.full_name || "Noma'lum"}\n`
      message += `📞 ${msg.users?.phone || "Noma'lum"}\n`
      message += `💬 ${msg.content}\n`
      message += `📅 ${formatDate(msg.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    await sendTelegramMessage(
      chatId,
      message,
      {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Error showing admin messages:", error)
    await sendTelegramMessage(chatId, "❌ Xabarlarni olishda xatolik.")
  }
}

async function showUserOrders(chatId: number, telegramId: number) {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (name, price)
      `)
      .like("anon_temp_id", `tg_${telegramId}_%`)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!orders || orders.length === 0) {
      await sendTelegramMessage(chatId, "📭 Sizda buyurtmalar yo'q.", {
        inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
      })
      return
    }

    let message = "📋 *Sizning buyurtmalaringiz:*\n\n"

    for (const order of orders) {
      const statusEmoji = getStatusEmoji(order.status)
      message += `${statusEmoji} *#${order.id.slice(-8)}*\n`
      message += `📦 ${order.products.name}\n`
      message += `💰 ${formatPrice(order.total_amount)}\n`
      message += `📊 ${getStatusText(order.status)}\n`
      message += `📅 ${formatDate(order.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    await sendTelegramMessage(
      chatId,
      message,
      {
        inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Error showing user orders:", error)
    await sendTelegramMessage(chatId, "❌ Buyurtmalarni olishda xatolik.")
  }
}

async function showStats(chatId: number) {
  try {
    const [usersResult, ordersResult, productsResult, todayOrdersResult] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().split("T")[0]),
    ])

    const message =
      `📊 *GlobalMarket Statistika*\n\n` +
      `👥 *Foydalanuvchilar:* ${usersResult.count || 0}\n` +
      `📋 *Buyurtmalar:* ${ordersResult.count || 0}\n` +
      `📦 *Mahsulotlar:* ${productsResult.count || 0}\n` +
      `📅 *Bugungi buyurtmalar:* ${todayOrdersResult.count || 0}\n\n` +
      `📅 *Oxirgi yangilanish:* ${formatDate(new Date().toISOString())}`

    await sendTelegramMessage(
      chatId,
      message,
      {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Error showing stats:", error)
    await sendTelegramMessage(chatId, "❌ Statistikani olishda xatolik.")
  }
}

async function handleOrderAction(
  chatId: number,
  callbackQueryId: string,
  orderId: string,
  action: string,
  messageId: number,
) {
  try {
    let status = ""
    let statusText = ""

    switch (action) {
      case "processing":
        status = "processing"
        statusText = "jarayonda"
        break
      case "complete":
        status = "completed"
        statusText = "bajarildi"
        break
      case "cancel":
        status = "cancelled"
        statusText = "bekor qilindi"
        break
      default:
        await answerCallbackQuery(callbackQueryId, "Noma'lum amal!")
        return
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) throw error

    await answerCallbackQuery(callbackQueryId, `Buyurtma ${statusText}!`)
    await editMessage(chatId, messageId, `✅ Buyurtma #${orderId.slice(-8)} ${statusText}`)

    console.log(`✅ Order ${orderId} status updated to ${status}`)
  } catch (error) {
    console.error("Error handling order action:", error)
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!")
  }
}

async function sendTelegramMessage(chatId: number, text: string, keyboard?: any, parseMode?: string) {
  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
    }

    if (parseMode) {
      payload.parse_mode = parseMode
    }

    if (keyboard) {
      payload.reply_markup = JSON.stringify(keyboard)
    }

    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Telegram API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`📤 Message sent to ${chatId}`)
    return result
  } catch (error) {
    console.error("Error sending Telegram message:", error)
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  try {
    await fetch(`${BOT_API_URL}/answerCallbackQuery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    })
  } catch (error) {
    console.error("Error answering callback query:", error)
  }
}

async function editMessage(chatId: number, messageId: number, text: string) {
  try {
    await fetch(`${BOT_API_URL}/editMessageText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
      }),
    })
  } catch (error) {
    console.error("Error editing message:", error)
  }
}

// Utility functions
function formatPrice(price: number): string {
  return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusEmoji(status: string): string {
  const emojis = {
    pending: "⏳",
    processing: "🔄",
    completed: "✅",
    cancelled: "❌",
  }
  return emojis[status as keyof typeof emojis] || "❓"
}

function getStatusText(status: string): string {
  const texts = {
    pending: "Kutilmoqda",
    processing: "Tayyorlanmoqda",
    completed: "Bajarilgan",
    cancelled: "Bekor qilingan",
  }
  return texts[status as keyof typeof texts] || "Noma'lum"
}

function getMessageTypeText(type: string): string {
  const types = {
    seller_application: "Sotuvchi arizasi",
    product_approval: "Mahsulot tasdiqlash",
    contact: "Murojaat",
    book_request: "Kitob so'rovi",
    sell_request: "Mahsulot sotish so'rovi",
  }
  return types[type as keyof typeof types] || "Xabar"
}
