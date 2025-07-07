import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase" // Sizning Supabase client'ingiz

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// User sessions for tracking state
const userSessions = new Map<number, any>() // Foydalanuvchi ID -> Session ma'lumotlari

// --- Telegram API Funksiyalari ---

async function sendTelegramMessage(chatId: number, text: string, keyboard?: any, parseMode?: string): Promise<void> {
  try {
    const payload: { chat_id: number; text: string; parse_mode?: string; reply_markup?: string } = {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`🔴 Telegram API error (sendMessage): ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
      // Xabar yuborishda xatolik bo'lsa ham, keyingi jarayonni davom ettirish
    } else {
      console.log(`📤 Message sent to ${chatId}`)
    }
  } catch (error: any) {
    console.error("🔴 Error sending Telegram message:", error.message)
  }
}

async function sendTelegramPhoto(chatId: number, photoUrl: string, caption: string, keyboard?: any, parseMode?: string): Promise<void> {
  try {
    const payload: { chat_id: number; photo: string; caption?: string; parse_mode?: string; reply_markup?: string } = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
    }

    if (parseMode) {
      payload.parse_mode = parseMode
    }

    if (keyboard) {
      payload.reply_markup = JSON.stringify(keyboard)
    }

    const response = await fetch(`${BOT_API_URL}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`🔴 Telegram API error (sendPhoto): ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
    } else {
      console.log(`📤 Photo sent to ${chatId}`)
    }
  } catch (error: any) {
    console.error("🔴 Error sending Telegram photo:", error.message)
    // Agar rasm yuborishda xatolik bo'lsa, matnli xabar yuborishga harakat qilish
    await sendTelegramMessage(chatId, `${caption}\n\n(Rasm yuklanishida xatolik yuz berdi)`, keyboard, parseMode)
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await fetch(`${BOT_API_URL}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    })
  } catch (error: any) {
    console.error("🔴 Error answering callback query:", error.message)
  }
}

async function editMessageText(chatId: number, messageId: number, text: string, keyboard?: any, parseMode?: string): Promise<void> {
  try {
    const payload: { chat_id: number; message_id: number; text: string; parse_mode?: string; reply_markup?: string } = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
    }

    if (parseMode) {
      payload.parse_mode = parseMode
    }

    if (keyboard) {
      payload.reply_markup = JSON.stringify(keyboard)
    }

    const response = await fetch(`${BOT_API_URL}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`🔴 Telegram API error (editMessageText): ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
    } else {
      console.log(`✏️ Message edited in ${chatId} (Message ID: ${messageId})`)
    }
  } catch (error: any) {
    console.error("🔴 Error editing message:", error.message)
  }
}

// --- Boshqaruv Funksiyalari ---

async function handleMessage(message: any): Promise<void> {
  const chatId = message.chat.id
  const text = message.text
  const userId = message.from.id
  const fromUser = message.from

  console.log(`📝 Processing message from ${fromUser.first_name} (@${fromUser.username || 'N/A'}): ${text || '[Non-text message]'}`)

  // Handle contact sharing
  if (message.contact) {
    await handleContactShare(chatId, userId, message.contact, fromUser)
    return
  }

  const isRegistered = await checkUserRegistration(userId)
  const isAdmin = await checkAdminStatus(userId)

  if (!isRegistered && !text?.startsWith("/start")) {
    await requestPhoneNumber(chatId, fromUser.first_name)
    return
  }

  if (text?.startsWith("/start")) {
    const startParam = text.replace("/start", "").trim()
    if (startParam.includes("product_id")) {
      await handleProductStart(chatId, userId, startParam)
    } else if (startParam.startsWith("website")) {
      await handleWebsiteConnection(chatId, userId, startParam)
    } else {
      if (!isRegistered) {
        await requestPhoneNumber(chatId, fromUser.first_name)
      } else {
        await sendWelcomeMessage(chatId, fromUser.first_name, isAdmin)
      }
    }
  } else if (text === "/admin" && isAdmin) {
    await sendAdminPanel(chatId)
  } else if (text === "/orders" && isAdmin) {
    await showPendingOrders(chatId)
  } else if (text === "/myorders") {
    await showUserOrders(chatId, userId)
  } else if (text === "/help") {
    await sendHelpMessage(chatId)
  } else if (text === "/categories") {
    await showCategories(chatId)
  } else {
    const session = userSessions.get(userId)
    if (session) {
      if (session.state === "ordering") {
        await handleOrderInput(chatId, userId, text, session)
      } else if (session.state === "contact_message") {
        await handleContactMessage(chatId, userId, text)
      } else {
        // Agar session bo'lsa-yu, lekin kutilgan holatda bo'lmasa
        await sendTelegramMessage(chatId, "❓ Noma'lum buyruq yoki davom etayotgan jarayon tugallanmagan. Yordam uchun /help yuboring.")
      }
    } else {
      await sendTelegramMessage(chatId, "❓ Noma'lum buyruq. Yordam uchun /help yuboring.\n\n📋 Mavjud buyruqlar:\n/start - Bosh menyu\n/categories - Kategoriyalar\n/myorders - Buyurtmalarim\n/help - Yordam")
    }
  }
}

async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from.id
  const data = callbackQuery.data
  const messageId = callbackQuery.message.message_id
  const fromUser = callbackQuery.from

  console.log(`🔘 Callback query from ${fromUser.first_name} (@${fromUser.username || 'N/A'}): ${data}`)

  await answerCallbackQuery(callbackQuery.id, "✅") // Callback query ni qabul qildik deb javob berish

  const isAdmin = await checkAdminStatus(userId)

  // Navigation and general callbacks
  if (data === "back_to_main") {
    await sendWelcomeMessage(chatId, fromUser.first_name, isAdmin)
  } else if (data === "back_to_admin" && isAdmin) {
    await sendAdminPanel(chatId)
  } else if (data === "categories") {
    await showCategories(chatId)
  } else if (data === "search") {
    await openWebApp(chatId, "search")
  } else if (data === "about") {
    await showAboutMarket(chatId)
  } else if (data === "contact") {
    await startContactMessage(chatId, userId)
  } else if (data === "my_orders") {
    await showUserOrders(chatId, userId)
  } else if (data === "connect_website") {
    await handleWebsiteConnectionRequest(chatId, userId)
  }

  // Admin specific callbacks
  if (isAdmin) {
    if (data === "admin_panel") { // Added to handle direct admin panel callback
      await sendAdminPanel(chatId);
    } else if (data === "admin_orders") {
      await showPendingOrders(chatId);
    } else if (data === "admin_messages") {
      await showAdminMessages(chatId);
    } else if (data === "admin_stats") {
      await showStats(chatId);
    } else if (data === "admin_sell_requests") {
      await showSellRequests(chatId);
    } else if (data === "admin_users") {
      await showUsers(chatId);
    }
  }

  // Category callbacks
  if (data.startsWith("category_")) {
    const categorySlug = data.replace("category_", "")
    await showCategoryProducts(chatId, categorySlug, 1) // Start with page 1
  }

  // Product callbacks
  if (data.startsWith("product_")) {
    const productId = data.replace("product_", "")
    await showProductDetails(chatId, productId)
  }

  // Buy callbacks
  if (data.startsWith("buy_")) {
    const productId = data.replace("buy_", "")
    await startOrderProcess(chatId, userId, productId)
  }

  // Pagination callbacks
  if (data.startsWith("page_")) {
    const parts = data.split("_")
    if (parts.length === 3) {
      const [, categorySlug, pageStr] = parts
      const page = parseInt(pageStr, 10)
      if (!isNaN(page)) {
        await showCategoryProducts(chatId, categorySlug, page)
      }
    }
  }

  // Order status update callbacks (admin only)
  if (isAdmin && data.includes("_order_")) {
    const parts = data.split("_order_")
    if (parts.length === 2) {
      const [action, orderId] = parts
      await handleOrderAction(chatId, callbackQuery.id, orderId, action, messageId)
    }
  }

  // Sell request action callbacks (admin only)
  if (isAdmin && data.includes("_sell_")) {
    const parts = data.split("_sell_")
    if (parts.length === 2) {
      const [action, requestId] = parts
      await handleSellRequestAction(chatId, callbackQuery.id, requestId, action)
    }
  }

  // Message action callbacks (admin only)
  if (isAdmin && data.includes("_msg_")) {
    const parts = data.split("_msg_")
    if (parts.length === 2) {
      const [action, messageIdToAction] = parts
      await handleMessageAction(chatId, callbackQuery.id, messageIdToAction, action)
    }
  }
}

// --- Ma'lumotlar Bazasi (Supabase) Funksiyalari ---

async function checkUserRegistration(telegramId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("phone")
      .eq("telegram_id", telegramId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 - Not found
      console.error("🔴 Error checking user registration:", error)
      return false
    }
    return !!data && !!data.phone && !data.phone.includes("temp")
  } catch (error: any) {
    console.error("🔴 Exception checking user registration:", error.message)
    return false
  }
}

async function requestPhoneNumber(chatId: number, firstName: string): Promise<void> {
  const message = `👋 Salom ${firstName}!\n\nGlobalMarket botiga xush kelibsiz! 🛒\n\nDavom etish uchun telefon raqamingizni ulashing:`
  const keyboard = {
    keyboard: [[{ text: "📞 Telefon raqamni ulashish", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  }
  await sendTelegramMessage(chatId, message, keyboard)
}

async function handleContactShare(chatId: number, userId: number, contact: any, userInfo: any): Promise<void> {
  try {
    const phoneNumber = contact.phone_number
    const fullName = `${userInfo.first_name} ${userInfo.last_name || ""}`.trim()

    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", userId)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error("🔴 Error checking existing user:", userError)
      throw userError
    }

    let result: any;
    if (existingUser) {
      result = await supabase
        .from("users")
        .update({ phone: phoneNumber, full_name: fullName, updated_at: new Date().toISOString() })
        .eq("telegram_id", userId)
    } else {
      const baseUsername = userInfo.first_name?.toLowerCase().replace(/[^a-z0-9]/g, "") || "user"
      result = await supabase.from("users").insert({
        telegram_id: userId,
        full_name: fullName,
        phone: phoneNumber,
        email: `telegram_${userId}@temp.com`,
        username: `${baseUsername}_${userId.toString().slice(-4)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    if (result.error) throw result.error

    await sendTelegramMessage(chatId, "✅ Telefon raqamingiz muvaffaqiyatli saqlandi!\n\nEndi botning barcha imkoniyatlaridan foydalanishingiz mumkin.", { remove_keyboard: true })
    const isAdmin = await checkAdminStatus(userId)
    await sendWelcomeMessage(chatId, userInfo.first_name, isAdmin)
  } catch (error: any) {
    console.error("🔴 Error handling contact share:", error.message)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
  }
}

async function handleProductStart(chatId: number, userId: number, startParam: string): Promise<void> {
  try {
    const params = new URLSearchParams(startParam.startsWith("product_id=") ? startParam : startParam.replace(/&/g, "&"))
    const productId = params.get("product_id")

    if (!productId) {
      await sendWelcomeMessage(chatId, "Foydalanuvchi", false) // Generic welcome if no product ID
      return
    }

    await showProductDetails(chatId, productId)
  } catch (error: any) {
    console.error("🔴 Error handling product start:", error.message)
    await sendWelcomeMessage(chatId, "Foydalanuvchi", false)
  }
}

async function openWebApp(chatId: number, type: string): Promise<void> {
  const webAppUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://globalmarketshop.netlify.app"}/telegram-webapp?type=${type}`
  const keyboard = {
    inline_keyboard: [
      [{ text: "🔍 Qidirish oynasini ochish", web_app: { url: webAppUrl } }],
      [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
    ],
  }
  await sendTelegramMessage(chatId, "🔍 *Mahsulot qidirish*\n\nQuyidagi tugma orqali qidirish oynasini oching:", keyboard, "Markdown")
}

async function startContactMessage(chatId: number, userId: number): Promise<void> {
  userSessions.set(userId, { state: "contact_message" })
  const keyboard = { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "back_to_main" }]] }
  await sendTelegramMessage(chatId, "💬 *Murojaat yuborish*\n\nXabaringizni yozing. Biz sizga tez orada javob beramiz:", keyboard, "Markdown")
}

async function handleContactMessage(chatId: number, userId: number, message: string): Promise<void> {
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("full_name, phone, username")
      .eq("telegram_id", userId)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error("🔴 Error fetching user data for contact message:", userError)
      throw userError
    }

    const { error: contactError } = await supabase.from("contact_messages").insert({
      full_name: user?.full_name || `Telegram user (${userId})`,
      phone: user?.phone || "Noma'lum",
      email: `telegram_${userId}@temp.com`,
      message_type: "general",
      subject: "Telegram bot orqali murojaat",
      message: message,
      status: "new",
      created_at: new Date().toISOString(),
    })

    if (contactError) throw contactError

    const { error: adminMsgError } = await supabase.from("admin_messages").insert({
      type: "contact",
      title: "Telegram bot orqali murojaat",
      content: message,
      data: { telegram_id: userId, username: user?.username, phone: user?.phone, full_name: user?.full_name },
      status: "pending",
      created_at: new Date().toISOString(),
    })

    if (adminMsgError) throw adminMsgError

    await notifyAdminsNewMessage("contact", "Yangi murojaat", message, user)

    const keyboard = { inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]] }
    await sendTelegramMessage(chatId, "✅ Murojaatingiz muvaffaqiyatli yuborildi!\n\nBiz sizga tez orada javob beramiz.", keyboard)

    userSessions.delete(userId)
  } catch (error: any) {
    console.error("🔴 Error handling contact message:", error.message)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
  }
}

async function checkAdminStatus(telegramId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("is_admin")
      .eq("telegram_id", telegramId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error("🔴 Error checking admin status:", error)
      return false
    }
    return !!data?.is_admin
  } catch (error: any) {
    console.error("🔴 Exception checking admin status:", error.message)
    return false
  }
}

async function handleWebsiteConnection(chatId: number, userId: number, startParam: string): Promise<void> {
  try {
    const urlParams = new URLSearchParams(startParam.startsWith("website&") ? startParam.replace("website&", "") : startParam)
    const email = urlParams.get("email")

    if (!email) {
      await sendTelegramMessage(chatId, "❌ Email manzil topilmadi. Iltimos, websaytdan qayta urinib ko'ring.")
      return
    }

    // Supabase funksiyasini chaqirish
    const { data, error } = await supabase.rpc("connect_telegram_to_user", {
      p_email: email,
      p_telegram_id: userId,
    })

    if (error || !data?.success) {
      await sendTelegramMessage(chatId, "❌ Hisobni ulashda xatolik yuz berdi. Email manzil to'g'ri ekanligini tekshiring.")
      return
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" }],
        [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }],
        [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
      ],
    }
    await sendTelegramMessage(
      chatId,
      `✅ *Muvaffaqiyat!*\n\nTelegram hisobingiz websaytga ulandi!\n\n👤 Username: @${data.username}\n📧 Email: ${email}\n\n🌐 Endi websaytdagi barcha yangilanishlarni Telegram orqali olasiz!`,
      keyboard,
      "Markdown",
    )
  } catch (error: any) {
    console.error("🔴 Website connection error:", error.message)
    await sendTelegramMessage(chatId, "❌ Texnik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.")
  }
}

async function handleWebsiteConnectionRequest(chatId: number, userId: number): Promise<void> {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("email, username")
      .eq("telegram_id", userId)
      .single()

    if (!user?.email || user.email.includes("@temp.com")) {
      const keyboard = {
        inline_keyboard: [
          [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app/register" }],
          [{ text: "🔙 Orqaga", callback_data: "back_to_main" }],
        ],
      }
      await sendTelegramMessage(chatId, "🌐 *Websaytga ulash*\n\nWebsaytga ulanish uchun avval ro'yxatdan o'ting:\n\n1. Quyidagi havolaga o'ting\n2. Ro'yxatdan o'ting yoki kiring\n3. Profilingizda 'Telegram botga ulash' tugmasini bosing", keyboard, "Markdown")
    } else {
      const keyboard = {
        inline_keyboard: [
          [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" }],
          [{ text: "🔙 Orqaga", callback_data: "back_to_main" }],
        ],
      }
      await sendTelegramMessage(chatId, `✅ Sizning hisobingiz allaqachon ulangan!\n\n👤 Username: @${user.username}\n📧 Email: ${user.email}`, keyboard)
    }
  } catch (error: any) {
    console.error("🔴 Error handling website connection request:", error.message)
    await sendTelegramMessage(chatId, "❌ Ma'lumotlarni olishda xatolik.")
  }
}

async function sendWelcomeMessage(chatId: number, firstName: string, isAdmin: boolean): Promise<void> {
  const name = firstName || "Foydalanuvchi"
  const message = `👋 Salom ${name}! GlobalMarket botiga xush kelibsiz!\n\n🛒 Mahsulotlarni ko'rish va sotib olish\n🔍 Mahsulot qidirish\n🏪 Market haqida ma'lumot\n📞 Murojaat yuborish\n\n📋 Buyurtmalaringizni kuzatish va boshqa imkoniyatlar uchun tugmalardan foydalaning.`

  const keyboard = {
    inline_keyboard: [
      [{ text: "📂 Kategoriyalar", callback_data: "categories" }, { text: "🔍 Qidirish", callback_data: "search" }],
      [{ text: "🏪 Market haqida", callback_data: "about" }, { text: "💬 Murojaat", callback_data: "contact" }],
      [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }, { text: "🌐 Websaytga ulash", callback_data: "connect_website" }],
      ...(isAdmin ? [[{ text: "👑 Admin Panel", callback_data: "admin_panel" }]] : []),
    ],
  }
  await sendTelegramMessage(chatId, message, keyboard)
}

async function sendAdminPanel(chatId: number): Promise<void> {
  const message = `👑 *Admin Panel*\n\nTizimni boshqarish va nazorat qilish\n\n📊 Statistika va hisobotlar\n📋 Buyurtmalarni boshqarish\n💬 Xabarlarni ko'rish\n📦 Mahsulot so'rovlari\n👥 Foydalanuvchilar`
  const keyboard = {
    inline_keyboard: [
      [{ text: "📋 Buyurtmalar", callback_data: "admin_orders" }, { text: "💬 Xabarlar", callback_data: "admin_messages" }],
      [{ text: "📦 Sotish so'rovlari", callback_data: "admin_sell_requests" }, { text: "👥 Foydalanuvchilar", callback_data: "admin_users" }],
      [{ text: "📊 Statistika", callback_data: "admin_stats" }, { text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
    ],
  }
  await sendTelegramMessage(chatId, message, keyboard, "Markdown")
}

async function sendHelpMessage(chatId: number): Promise<void> {
  const message = `❓ *Yordam*\n\n*Mavjud buyruqlar:*\n/start - Bosh menyu\n/categories - Kategoriyalar\n/myorders - Buyurtmalarim\n/help - Yordam\n\n*Admin buyruqlari:*\n/admin - Admin panel\n/orders - Barcha buyurtmalar\n\n*Bot imkoniyatlari:*\n🛒 Mahsulot sotib olish\n🔍 Mahsulot qidirish (Web App)\n📋 Buyurtmalarni kuzatish\n🏪 Market haqida ma'lumot\n💬 Murojaat yuborish\n🌐 Websaytga ulanish`
  await sendTelegramMessage(chatId, message, null, "Markdown")
}

async function showCategories(chatId: number): Promise<void> {
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name_uz, slug, icon")
      .eq("is_active", true)
      .order("sort_order")

    if (error) throw error
    if (!categories || categories.length === 0) {
      await sendTelegramMessage(chatId, "❌ Kategoriyalar topilmadi.")
      return
    }

    const keyboard = {
      inline_keyboard: [
        ...categories.map((category) => [{ text: `${category.icon || ''} ${category.name_uz}`, callback_data: `category_${category.slug}` }]),
        [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
      ],
    }
    await sendTelegramMessage(chatId, "📂 *Kategoriyalarni tanlang:*\n\nQaysi kategoriyadan mahsulot ko'rmoqchisiz?", keyboard, "Markdown")
  } catch (error: any) {
    console.error("🔴 Error showing categories:", error.message)
    await sendTelegramMessage(chatId, "❌ Kategoriyalarni olishda xatolik.")
  }
}

async function showCategoryProducts(chatId: number, categorySlug: string, page = 1): Promise<void> {
  try {
    const limit = 10
    const offset = (page - 1) * limit

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, name_uz, icon")
      .eq("slug", categorySlug)
      .single()

    if (categoryError || !category) {
      await sendTelegramMessage(chatId, "❌ Kategoriya topilmadi.")
      return
    }

    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id, name, price, stock_quantity, average_rating, order_count,
        categories (name_uz, icon)
      `)
      .eq("category_id", category.id)
      .eq("is_active", true)
      .eq("is_approved", true)
      .gt("stock_quantity", 0)
      .order("order_count", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    if (!products || products.length === 0) {
      await sendTelegramMessage(chatId, `❌ "${category.name_uz}" kategoriyasida mahsulotlar topilmadi.`, {
        inline_keyboard: [[{ text: "🔙 Kategoriyalarga qaytish", callback_data: "categories" }]],
      })
      return
    }

    const message = `📦 *${category.icon || ''} ${category.name_uz}*\n\nSahifa ${page} (${products.length} ta mahsulot):\n\nMahsulotni tanlang:`

    const paginationKeyboard = [
      ...(products.length === limit ? [[
        { text: "⬅️ Oldingi", callback_data: `page_${categorySlug}_${Math.max(1, page - 1)}` },
        { text: "➡️ Keyingi", callback_data: `page_${categorySlug}_${page + 1}` },
      ]] : page > 1 ? [[{ text: "⬅️ Oldingi", callback_data: `page_${categorySlug}_${page - 1}` }]] : []),
      [{ text: "🔙 Kategoriyalarga qaytish", callback_data: "categories" }],
    ]

    const productKeyboard = products.map(product =>
      [{ text: `${product.name} - ${formatPrice(product.price)}`, callback_data: `product_${product.id}` }]
    )

    const keyboard = { inline_keyboard: [...productKeyboard, ...paginationKeyboard] }
    await sendTelegramMessage(chatId, message, keyboard, "Markdown")

  } catch (error: any) {
    console.error("🔴 Error showing category products:", error.message)
    await sendTelegramMessage(chatId, "❌ Mahsulotlarni olishda xatolik.")
  }
}

async function showProductDetails(chatId: number, productId: string): Promise<void> {
  try {
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        id, name, description, price, stock_quantity, average_rating, order_count,
        image_url, author, brand, has_delivery, delivery_price,
        categories (name_uz, icon),
        users (username)
      `)
      .eq("id", productId)
      .single()

    if (error || !product) {
      await sendTelegramMessage(chatId, "❌ Mahsulot topilmadi.")
      return
    }

    let message = `📦 *${product.name}*\n\n`
    message += `💰 *Narx:* ${formatPrice(product.price)}\n`
    message += `📊 *Mavjud:* ${product.stock_quantity} dona\n`
    message += `⭐ *Reyting:* ${product.average_rating}/5\n`
    message += `🛒 *Buyurtmalar:* ${product.order_count} marta\n`
    message += `🏷️ *Kategoriya:* ${product.categories?.icon || ''} ${product.categories?.name_uz}\n`
    message += `🏪 *Sotuvchi:* @${product.users?.username}\n\n`
    if (product.description) message += `📝 *Tavsif:*\n${product.description}\n\n`
    if (product.author) message += `✍️ *Muallif:* ${product.author}\n`
    if (product.brand) message += `🏷️ *Brend:* ${product.brand}\n`
    if (product.has_delivery) message += `🚚 *Yetkazib berish:* ${formatPrice(product.delivery_price || 0)}\n`

    const keyboard = {
      inline_keyboard: [
        [{ text: "🛒 Sotib olish", callback_data: `buy_${product.id}` }],
        [{ text: "🔙 Orqaga", callback_data: "categories" }], // Link back to categories
      ],
    }

    if (product.image_url && product.image_url !== "/placeholder.svg" && !product.image_url.includes("placeholder")) {
      await sendTelegramPhoto(chatId, product.image_url, message, keyboard, "Markdown")
    } else {
      await sendTelegramMessage(chatId, message, keyboard, "Markdown")
    }
  } catch (error: any) {
    console.error("🔴 Error showing product details:", error.message)
    await sendTelegramMessage(chatId, "❌ Mahsulot ma'lumotlarini olishda xatolik.")
  }
}

async function startOrderProcess(chatId: number, userId: number, productId: string): Promise<void> {
  try {
    const { data: product, error } = await supabase.from("products").select("id, name, price, stock_quantity, has_delivery, delivery_price").eq("id", productId).single()

    if (error || !product) {
      await sendTelegramMessage(chatId, "❌ Mahsulot topilmadi.")
      return
    }
    if (product.stock_quantity <= 0) {
      await sendTelegramMessage(chatId, "❌ Bu mahsulot hozirda mavjud emas.")
      return
    }

    userSessions.set(userId, {
      state: "ordering",
      step: "quantity",
      productId: productId,
      productName: product.name,
      productPrice: product.price,
      hasDelivery: product.has_delivery,
      deliveryPrice: product.delivery_price || 0,
      maxQuantity: product.stock_quantity,
    })

    const keyboard = { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "back_to_main" }]] }
    await sendTelegramMessage(chatId, `🛒 *Buyurtma berish*\n\n📦 Mahsulot: ${product.name}\n💰 Narx: ${formatPrice(product.price)}\n\n❓ Nechta dona kerak? (1-${product.stock_quantity})`, keyboard, "Markdown")
  } catch (error: any) {
    console.error("🔴 Error starting order process:", error.message)
    await sendTelegramMessage(chatId, "❌ Buyurtma jarayonini boshlashda xatolik.")
  }
}

async function handleOrderInput(chatId: number, userId: number, text: string, session: any): Promise<void> {
  try {
    if (session.step === "quantity") {
      const quantity = Number.parseInt(text)
      if (isNaN(quantity) || quantity < 1 || quantity > session.maxQuantity) {
        await sendTelegramMessage(chatId, `❌ Noto'g'ri miqdor. 1 dan ${session.maxQuantity} gacha son kiriting.`)
        return
      }
      session.quantity = quantity
      session.step = "fullName" // Changed to fullName for clarity
      userSessions.set(userId, session)
      await sendTelegramMessage(chatId, "👤 To'liq ism-familiyangizni kiriting:")
    } else if (session.step === "fullName") {
      if (text.length < 2) {
        await sendTelegramMessage(chatId, "❌ Ism-familiya juda qisqa. Qaytadan kiriting:")
        return
      }
      session.fullName = text
      session.step = "birthdate"
      userSessions.set(userId, session)
      await sendTelegramMessage(chatId, "📅 Tug'ilgan sanangizni kiriting:\n(Masalan: 01.01.1990)")
    } else if (session.step === "birthdate") {
      const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/
      if (!dateRegex.test(text)) {
        await sendTelegramMessage(chatId, "❌ Noto'g'ri format. Qaytadan kiriting:\n(Masalan: 01.01.1990)")
        return
      }
      session.birthdate = text
      session.step = "phone"
      userSessions.set(userId, session)
      await sendTelegramMessage(chatId, "📞 Telefon raqamingizni kiriting:\n(Masalan: +998901234567)")
    } else if (session.step === "phone") {
      const phoneRegex = /^(\+998|998|8)?[0-9]{9}$/ // More robust regex
      const cleanedPhone = text.replace(/[\s\-()]/g, "")
      if (!phoneRegex.test(cleanedPhone)) {
        await sendTelegramMessage(chatId, "❌ Noto'g'ri telefon raqam. Qaytadan kiriting:\n(Masalan: +998901234567)")
        return
      }
      session.phone = cleanedPhone
      session.step = "address"
      userSessions.set(userId, session)
      await sendTelegramMessage(chatId, "📍 To'liq yetkazib berish manzilini kiriting:")
    } else if (session.step === "address") {
      if (text.length < 5) {
        await sendTelegramMessage(chatId, "❌ Manzil juda qisqa. Qaytadan kiriting:")
        return
      }
      session.address = text
      await completeOrder(chatId, userId, session)
    }
  } catch (error: any) {
    console.error("🔴 Error handling order input:", error.message)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
    userSessions.delete(userId)
  }
}

async function completeOrder(chatId: number, userId: number, session: any): Promise<void> {
  try {
    const productTotal = session.productPrice * session.quantity
    const deliveryTotal = session.hasDelivery ? session.deliveryPrice : 0
    const totalAmount = productTotal + deliveryTotal
    const anonTempId = `tg_${userId}_${Date.now()}`

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        product_id: session.productId,
        user_id: null, // Anonymous order
        full_name: session.fullName,
        phone: session.phone,
        address: session.address,
        quantity: session.quantity,
        total_amount: totalAmount,
        status: "pending",
        order_type: "telegram",
        anon_temp_id: anonTempId,
        notes: `Tug'ilgan sana: ${session.birthdate}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Update product stock and order count
    const { error: stockError } = await supabase
      .from("products")
      .update({
        order_count: supabase.sql`order_count + ${session.quantity}`,
        stock_quantity: supabase.sql`stock_quantity - ${session.quantity}`,
      })
      .eq("id", session.productId)

    if (stockError) throw stockError

    let message = `✅ *Buyurtma muvaffaqiyatli qabul qilindi!*\n\n`
    message += `🆔 Buyurtma raqami: #${order.id.slice(-8)}\n`
    message += `📦 Mahsulot: ${session.productName}\n`
    message += `📊 Miqdor: ${session.quantity} dona\n`
    message += `💰 Jami summa: ${formatPrice(totalAmount)}\n`
    message += `👤 Mijoz: ${session.fullName}\n`
    message += `📅 Tug'ilgan sana: ${session.birthdate}\n`
    message += `📞 Telefon: ${session.phone}\n`
    message += `📍 Manzil: ${session.address}\n\n`
    message += `⏰ Biz sizga tez orada aloqaga chiqamiz!\n\n`
    message += `📋 Buyurtmangizni kuzatish uchun "Buyurtmalarim" tugmasini bosing.`

    const keyboard = { inline_keyboard: [[{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }], [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]] }
    await sendTelegramMessage(chatId, message, keyboard, "Markdown")

    await notifyAdminsNewOrder(order.id)
    userSessions.delete(userId)
  } catch (error: any) {
    console.error("🔴 Error completing order:", error.message)
    await sendTelegramMessage(chatId, "❌ Buyurtmani yaratishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
    userSessions.delete(userId)
  }
}

async function showUserOrders(chatId: number, telegramId: number): Promise<void> {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, status, total_amount, created_at,
        products (name)
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
      message += `${getStatusEmoji(order.status)} *#${order.id.slice(-8)}*\n`
      message += `📦 ${order.products.name}\n`
      message += `💰 ${formatPrice(order.total_amount)}\n`
      message += `📊 ${getStatusText(order.status)}\n`
      message += `📅 ${formatDate(order.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    const keyboard = { inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]] }
    await sendTelegramMessage(chatId, message, keyboard, "Markdown")
  } catch (error: any) {
    console.error("🔴 Error showing user orders:", error.message)
    await sendTelegramMessage(chatId, "❌ Buyurtmalarni olishda xatolik.")
  }
}

async function showAboutMarket(chatId: number): Promise<void> {
  const message = `🏪 *GlobalMarket haqida*\n\nGlobalMarket - G'uzor tumanidagi eng katta onlayn bozor!\n\n📚 *Bizda mavjud:*\n• Kitoblar va darsliklar\n• Maktab buyumlari\n• Ofis jihozlari\n• Va boshqa ko'plab mahsulotlar\n\n🌍 *Xizmat hududi:*\nG'uzor tumani, Qashqadaryo viloyati\n\n📱 *Websayt:* https://globalmarketshop.netlify.app\n\n✅ *Bizning afzalliklarimiz:*\n• Tez yetkazib berish\n• Sifatli mahsulotlar\n• Qulay narxlar\n• Ishonchli sotuvchilar`
  const keyboard = {
    inline_keyboard: [
      [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" }],
      [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
    ],
  }
  await sendTelegramMessage(chatId, message, keyboard, "Markdown")
}

// --- Admin Funksiyalari ---

async function showPendingOrders(chatId: number): Promise<void> {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, full_name, phone, address, total_amount, created_at,
        products (name)
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
      message += `📍 ${order.address}\n`
      message += `💰 ${formatPrice(order.total_amount)}\n`
      message += `📅 ${formatDate(order.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    await sendTelegramMessage(chatId, message, null, "Markdown") // Send list first

    // Send action buttons for each order separately
    for (const order of orders) {
      const keyboard = {
        inline_keyboard: [
          [{ text: "🔄 Jarayonda", callback_data: `processing_order_${order.id}` }, { text: "✅ Bajarildi", callback_data: `complete_order_${order.id}` }],
          [{ text: "❌ Bekor qilish", callback_data: `cancel_order_${order.id}` }],
        ],
      }
      await sendTelegramMessage(chatId, `Buyurtma #${order.id.slice(-8)} uchun amal tanlang:`, keyboard)
    }
  } catch (error: any) {
    console.error("🔴 Error showing pending orders:", error.message)
    await sendTelegramMessage(chatId, "❌ Buyurtmalarni olishda xatolik.")
  }
}

async function showAdminMessages(chatId: number): Promise<void> {
  try {
    const { data: messages, error } = await supabase
      .from("admin_messages")
      .select(`
        id, type, content, data, status, created_at,
        users (username, phone)
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
      const senderInfo = msg.data?.username
        ? `@${msg.data.username}`
        : msg.users?.username
          ? `@${msg.users.username}`
          : `(${msg.data?.telegram_id || 'Noma\'lum'})`
      const senderPhone = msg.data?.phone || msg.users?.phone || "Noma'lum"

      message += `📝 *${typeText}*\n`
      message += `👤 G'amxor: ${senderInfo}\n`
      message += `📞 Tel: ${senderPhone}\n`
      message += `💬 ${msg.content}\n`
      message += `📅 ${formatDate(msg.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    await sendTelegramMessage(chatId, message, null, "Markdown")

    for (const msg of messages) {
      const keyboard = {
        inline_keyboard: [
          [{ text: "✅ Javob berildi", callback_data: `respond_msg_${msg.id}` }, { text: "❌ Yopish", callback_data: `close_msg_${msg.id}` }],
        ],
      }
      await sendTelegramMessage(chatId, `Xabar #${msg.id.slice(-8)} uchun amal tanlang:`, keyboard)
    }
  } catch (error: any) {
    console.error("🔴 Error showing admin messages:", error.message)
    await sendTelegramMessage(chatId, "❌ Xabarlarni olishda xatolik.")
  }
}

async function showSellRequests(chatId: number): Promise<void> {
  try {
    const { data: requests, error } = await supabase
      .from("sell_requests")
      .select(`
        id, product_name, price, contact_phone, created_at,
        users (username),
        categories (name_uz, icon)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error
    if (!requests || requests.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi sotish so'rovlari yo'q.", {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      })
      return
    }

    let message = "📦 *Yangi sotish so'rovlari:*\n\n"
    for (const request of requests) {
      message += `🆔 *#${request.id.slice(-8)}*\n`
      message += `📦 ${request.product_name}\n`
      message += `💰 ${formatPrice(request.price)}\n`
      message += `👤 @${request.users?.username || "noma'lum"}\n`
      message += `📞 ${request.contact_phone}\n`
      message += `📅 ${formatDate(request.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    await sendTelegramMessage(chatId, message, null, "Markdown")

    for (const request of requests) {
      const keyboard = {
        inline_keyboard: [
          [{ text: "✅ Tasdiqlash", callback_data: `approve_sell_${request.id}` }, { text: "❌ Rad etish", callback_data: `reject_sell_${request.id}` }],
        ],
      }
      await sendTelegramMessage(chatId, `So'rov #${request.id.slice(-8)} uchun amal tanlang:`, keyboard)
    }
  } catch (error: any) {
    console.error("🔴 Error showing sell requests:", error.message)
    await sendTelegramMessage(chatId, "❌ Sotish so'rovlarini olishda xatolik.")
  }
}

async function showUsers(chatId: number): Promise<void> {
  try {
    const { count: totalUsers } = await getTableRowCount("users")
    const { count: verifiedSellers } = await getTableRowCount("users", { eq: ["is_verified_seller", true] })
    const today = new Date().toISOString().split("T")[0]
    const { count: todayNewUsers } = await getTableRowCount("users", { gte: ["created_at", `${today}T00:00:00.000Z`] })

    const message = `👥 *Foydalanuvchilar statistikasi:*\n\n📊 Jami foydalanuvchilar: ${totalUsers || 0}\n🏪 Sotuvchilar: ${verifiedSellers || 0}\n📅 Bugun ro'yxatdan o'tganlar: ${todayNewUsers || 0}`
    const keyboard = { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]] }
    await sendTelegramMessage(chatId, message, keyboard, "Markdown")
  } catch (error: any) {
    console.error("🔴 Error showing users:", error.message)
    await sendTelegramMessage(chatId, "❌ Foydalanuvchilar ma'lumotlarini olishda xatolik.")
  }
}

async function showStats(chatId: number): Promise<void> {
  try {
    const { count: totalUsers } = await getTableRowCount("users")
    const { count: totalOrders } = await getTableRowCount("orders")
    const { count: totalProducts } = await getTableRowCount("products")
    const today = new Date().toISOString().split("T")[0]
    const { count: todayOrders } = await getTableRowCount("orders", { gte: ["created_at", `${today}T00:00:00.000Z`] })

    const message =
      `📊 *GlobalMarket Statistika*\n\n` +
      `👥 *Foydalanuvchilar:* ${totalUsers || 0}\n` +
      `📋 *Buyurtmalar:* ${totalOrders || 0}\n` +
      `📦 *Mahsulotlar:* ${totalProducts || 0}\n` +
      `📅 *Bugungi buyurtmalar:* ${todayOrders || 0}\n\n` +
      `📅 *Oxirgi yangilanish:* ${formatDate(new Date().toISOString())}`

    const keyboard = { inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]] }
    await sendTelegramMessage(chatId, message, keyboard, "Markdown")
  } catch (error: any) {
    console.error("🔴 Error showing stats:", error.message)
    await sendTelegramMessage(chatId, "❌ Statistikani olishda xatolik.")
  }
}

async function handleOrderAction(chatId: number, callbackQueryId: string, orderId: string, action: string, messageId: number): Promise<void> {
  let status = ""
  let statusText = ""

  switch (action) {
    case "processing": status = "processing"; statusText = "jarayonda"; break
    case "complete": status = "completed"; statusText = "bajarildi"; break
    case "cancel": status = "cancelled"; statusText = "bekor qilindi"; break
    default: await answerCallbackQuery(callbackQueryId, "Noma'lum amal!"); return
  }

  try {
    const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId)
    if (error) throw error

    await answerCallbackQuery(callbackQueryId, `Buyurtma ${statusText}!`)
    await editMessageText(chatId, messageId, `✅ Buyurtma #${orderId.slice(-8)} ${statusText}`, undefined, "Markdown")
    await notifyCustomerStatusChange(orderId, status)
    console.log(`✅ Order ${orderId} status updated to ${status}`)
  } catch (error: any) {
    console.error(`🔴 Error handling order action (${action}) for ${orderId}:`, error.message)
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!")
  }
}

async function handleSellRequestAction(chatId: number, callbackQueryId: string, requestId: string, action: string): Promise<void> {
  let status = ""
  let statusText = ""

  switch (action) {
    case "approve": status = "approved"; statusText = "tasdiqlandi"; break
    case "reject": status = "rejected"; statusText = "rad etildi"; break
    default: await answerCallbackQuery(callbackQueryId, "Noma'lum amal!"); return
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sell-product`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId, status, admin_notes: `Telegram bot orqali ${statusText}` }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    await answerCallbackQuery(callbackQueryId, `So'rov ${statusText}!`)
    console.log(`✅ Sell request ${requestId} ${statusText}`)
  } catch (error: any) {
    console.error("🔴 Error handling sell request action:", error.message)
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!")
  }
}

async function handleMessageAction(chatId: number, callbackQueryId: string, messageId: string, action: string): Promise<void> {
  let status = ""
  let statusText = ""

  switch (action) {
    case "respond": status = "responded"; statusText = "javob berildi"; break
    case "close": status = "closed"; statusText = "yopildi"; break
    default: await answerCallbackQuery(callbackQueryId, "Noma'lum amal!"); return
  }

  try {
    const { error } = await supabase.from("admin_messages").update({ status, admin_response: `Telegram bot orqali ${statusText}`, updated_at: new Date().toISOString() }).eq("id", messageId)
    if (error) throw error

    await answerCallbackQuery(callbackQueryId, `Xabar ${statusText}!`)
    console.log(`✅ Message ${messageId} ${statusText}`)
  } catch (error: any) {
    console.error("🔴 Error handling message action:", error.message)
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!")
  }
}

async function notifyAdminsNewOrder(orderId: string): Promise<void> {
  try {
    console.log(`📢 Adminlarga yangi buyurtma haqida xabar: ${orderId}`)
    const { data: order, error } = await supabase
      .from("orders")
      .select(`id, full_name, phone, address, total_amount, created_at, products (name)`)
      .eq("id", orderId)
      .single()

    if (error || !order) {
      console.error("🔴 Buyurtma topilmadi:", error)
      return
    }

    const message =
      `🔔 *Yangi buyurtma!*\n\n` +
      `🆔 #${order.id.slice(-8)}\n` +
      `📦 ${order.products.name}\n` +
      `👤 ${order.full_name}\n` +
      `📞 ${order.phone}\n`
      `📍 ${order.address}\n` +
      `💰 ${formatPrice(order.total_amount)}\n` +
      `📅 ${formatDate(order.created_at)}`

    const keyboard = {
      inline_keyboard: [
        [{ text: "🔄 Jarayonda", callback_data: `processing_order_${order.id}` }, { text: "✅ Bajarildi", callback_data: `complete_order_${order.id}` }],
        [{ text: "❌ Bekor qilish", callback_data: `cancel_order_${order.id}` }],
      ],
    }

    const { data: admins } = await supabase.from("users").select("telegram_id, username").eq("is_admin", true).not("telegram_id", "is", null)

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        try {
          await sendTelegramMessage(admin.telegram_id, message, keyboard, "Markdown")
          console.log(`✅ Admin @${admin.username} ga xabar yuborildi`)
        } catch (e) {
          console.error(`❌ Admin ${admin.telegram_id} ga xabar yuborishda xatolik:`, e)
        }
      }
    } else {
      console.log("⚠️ Adminlar topilmadi")
    }
  } catch (error: any) {
    console.error("🔴 Adminlarga xabar berishda xatolik:", error.message)
  }
}

async function notifyAdminsNewMessage(type: string, title: string, content: string, userData: any): Promise<void> {
  try {
    console.log(`📢 Adminlarga yangi xabar: ${type}`)
    const typeText = getMessageTypeText(type)
    let message = `🔔 *${typeText}*\n\n`
    message += `📝 ${title}\n`
    message += `💬 ${content}\n`
    if (userData) {
      message += `👤 @${userData.username || "noma'lum"}\n`
      message += `📞 ${userData.phone || "Noma'lum"}\n`
    }
    message += `📅 ${formatDate(new Date().toISOString())}`

    const { data: admins } = await supabase.from("users").select("telegram_id, username").eq("is_admin", true).not("telegram_id", "is", null)

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        try {
          await sendTelegramMessage(admin.telegram_id, message, null, "Markdown")
          console.log(`✅ Admin @${admin.username} ga xabar yuborildi`)
        } catch (e) {
          console.error(`❌ Admin ${admin.telegram_id} ga xabar yuborishda xatolik:`, e)
        }
      }
    }
  } catch (error: any) {
    console.error("🔴 Adminlarga xabar berishda xatolik:", error.message)
  }
}

async function notifyCustomerStatusChange(orderId: string, status: string): Promise<void> {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`id, status,
        products (name),
        users (telegram_id),
        anon_temp_id
      `)
      .eq("id", orderId)
      .single()

    if (error || !order) return

    const statusText = getStatusText(status)
    const statusEmoji = getStatusEmoji(status)
    let message = `${statusEmoji} *Buyurtma holati o'zgardi!*\n\n`
    message += `🆔 #${order.id.slice(-8)}\n`
    message += `📦 ${order.products.name}\n`
    message += `📊 Yangi holat: *${statusText}*\n`

    if (status === "completed") message += `\n🎉 Buyurtmangiz tayyor! Tez orada yetkazib beriladi.`
    else if (status === "processing") message += `\n⏳ Buyurtmangiz tayyorlanmoqda...`
    else if (status === "cancelled") message += `\n😔 Buyurtmangiz bekor qilindi. Ma'lumot uchun qo'ng'iroq qiling.`

    let customerTelegramId: number | null = null
    if (order.users?.telegram_id) {
      customerTelegramId = order.users.telegram_id
    } else if (order.anon_temp_id && order.anon_temp_id.startsWith("tg_")) {
      const tgId = parseInt(order.anon_temp_id.split("_")[1], 10)
      if (!isNaN(tgId)) customerTelegramId = tgId
    }

    if (customerTelegramId) {
      await sendTelegramMessage(customerTelegramId, message, null, "Markdown")
      console.log(`📤 Mijozga xabar yuborildi: ${customerTelegramId}`)
    }
  } catch (error: any) {
    console.error("🔴 Mijozga xabar berishda xatolik:", error.message)
  }
}

// Utility Helper to get row count
async function getTableRowCount(tableName: string, filters?: { eq?: [string, any][]; gte?: [string, string] }): Promise<{ count: number | null }> {
  let query = supabase.from(tableName).select("*", { count: "exact", head: true })
  if (filters?.eq) {
    for (const [column, value] of filters.eq) {
      query = query.eq(column, value)
    }
  }
  if (filters?.gte) {
    const [column, value] = filters.gte
    query = query.gte(column, value)
  }
  const { count, error } = await query
  if (error) {
    console.error(`🔴 Error getting count for ${tableName}:`, error)
    return { count: null }
  }
  return { count }
}

// Utility functions
function formatPrice(price: number): string {
  return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
}

function formatDate(dateString: string): string {
  if (!dateString) return "Noma'lum sana"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (e) {
    return dateString // Return original if date is invalid
  }
}

function getStatusEmoji(status: string): string {
  const emojis: { [key: string]: string } = {
    pending: "⏳",
    processing: "🔄",
    completed: "✅",
    cancelled: "❌",
    approved: "👍", // For sell requests
    rejected: "👎", // For sell requests
    responded: "💬", // For messages
    closed: "🔒", // For messages
  }
  return emojis[status] || "❓"
}

function getStatusText(status: string): string {
  const texts: { [key: string]: string } = {
    pending: "Kutilmoqda",
    processing: "Tayyorlanmoqda",
    completed: "Bajarilgan",
    cancelled: "Bekor qilingan",
    approved: "Tasdiqlangan",
    rejected: "Rad etilgan",
    responded: "Javob berildi",
    closed: "Yopilgan",
  }
  return texts[status] || "Noma'lum"
}

function getMessageTypeText(type: string): string {
  const types: { [key: string]: string } = {
    seller_application: "Sotuvchi arizasi",
    product_approval: "Mahsulot tasdiqlash",
    contact: "Murojaat",
    book_request: "Kitob so'rovi",
    sell_request: "Mahsulot sotish so'rovi",
  }
  return types[type] || "Xabar"
}


// --- Next.js Route Handlers ---

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    console.log("📨 Telegram webhook received:", JSON.stringify(update, null, 2))

    if (update.message) {
      await handleMessage(update.message)
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
    }
    // Boshqa update turlarini ham shu yerda qo'shish mumkin (masalan, poll, channel_post va hokazo)

    return NextResponse.json({ ok: true, processed: true })
  } catch (error: any) {
    console.error("🔴 Webhook error:", error.message)
    return NextResponse.json({ error: "Webhook error", details: error.message || String(error) }, { status: 500 })
  }
}

export async function GET() {
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://globalmarketshop.netlify.app"}/api/webhook/telegram`
  return NextResponse.json({
    message: "Telegram webhook endpoint is active",
    bot_token: TELEGRAM_BOT_TOKEN.slice(0, 10) + "...",
    status: "active",
    webhook_url: webhookUrl,
    timestamp: new Date().toISOString(),
  })
}
