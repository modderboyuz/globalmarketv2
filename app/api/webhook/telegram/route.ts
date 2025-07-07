import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// User sessions for tracking state
const userSessions = new Map()

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
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://globalmarketshop.netlify.app"}/api/webhook/telegram`

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

  // Handle contact sharing
  if (message.contact) {
    await handleContactShare(chatId, userId, message.contact, message.from)
    return
  }

  // Check if user is registered
  const isRegistered = await checkUserRegistration(userId)

  if (!isRegistered && !text?.startsWith("/start")) {
    await requestPhoneNumber(chatId, message.from.first_name)
    return
  }

  // Check if user is admin
  const isAdmin = await checkAdminStatus(userId)

  // Handle text messages
  if (text?.startsWith("/start")) {
    const startParam = text.replace("/start", "").trim()

    if (startParam.includes("product_id")) {
      await handleProductStart(chatId, userId, startParam)
    } else if (startParam.startsWith("website")) {
      await handleWebsiteConnection(chatId, userId, startParam)
    } else {
      if (!isRegistered) {
        await requestPhoneNumber(chatId, message.from.first_name)
      } else {
        await sendWelcomeMessage(chatId, message.from.first_name, isAdmin)
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
    // Handle user sessions
    const session = userSessions.get(userId)
    if (session) {
      if (session.state === "ordering") {
        await handleOrderInput(chatId, userId, text, session)
      } else if (session.state === "contact_message") {
        await handleContactMessage(chatId, userId, text)
      }
    } else {
      // Unknown command
      await sendTelegramMessage(
        chatId,
        "❓ Noma'lum buyruq. Yordam uchun /help yuboring.\n\n📋 Mavjud buyruqlar:\n/start - Bosh menyu\n/categories - Kategoriyalar\n/myorders - Buyurtmalarim\n/help - Yordam",
      )
    }
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from.id
  const data = callbackQuery.data

  console.log(`🔘 Callback query from ${userId}: ${data}`)

  await answerCallbackQuery(callbackQuery.id, "✅")

  const isAdmin = await checkAdminStatus(userId)

  // Handle navigation callbacks
  if (data === "back_to_main") {
    await sendWelcomeMessage(chatId, callbackQuery.from.first_name, isAdmin)
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

  // Handle admin callbacks
  if (isAdmin) {
    if (data === "admin_orders") {
      await showPendingOrders(chatId)
    } else if (data === "admin_messages") {
      await showAdminMessages(chatId)
    } else if (data === "admin_stats") {
      await showStats(chatId)
    } else if (data === "admin_sell_requests") {
      await showSellRequests(chatId)
    } else if (data === "admin_users") {
      await showUsers(chatId)
    }
  }

  // Handle category callbacks
  if (data.startsWith("category_")) {
    const categorySlug = data.replace("category_", "")
    await showCategoryProducts(chatId, categorySlug, 1)
  }

  // Handle product callbacks
  if (data.startsWith("product_")) {
    const productId = data.replace("product_", "")
    await showProductDetails(chatId, productId)
  }

  // Handle buy callbacks
  if (data.startsWith("buy_")) {
    const productId = data.replace("buy_", "")
    await startOrderProcess(chatId, userId, productId)
  }

  // Handle pagination
  if (data.startsWith("page_")) {
    const [, categorySlug, page] = data.split("_")
    await showCategoryProducts(chatId, categorySlug, Number.parseInt(page))
  }

  // Handle order status updates (admin only)
  if (isAdmin && data.includes("_order_")) {
    const [action, orderId] = data.split("_order_")
    await handleOrderAction(chatId, callbackQuery.id, orderId, action, callbackQuery.message.message_id)
  }

  // Handle sell request actions (admin only)
  if (isAdmin && data.includes("_sell_")) {
    const [action, requestId] = data.split("_sell_")
    await handleSellRequestAction(chatId, callbackQuery.id, requestId, action)
  }

  // Handle message actions (admin only)
  if (isAdmin && data.includes("_msg_")) {
    const [action, messageId] = data.split("_msg_")
    await handleMessageAction(chatId, callbackQuery.id, messageId, action)
  }
}

async function checkUserRegistration(telegramId: number): Promise<boolean> {
  try {
    const { data: user } = await supabase.from("users").select("id, phone").eq("telegram_id", telegramId).single()

    return !!(user && user.phone && !user.phone.includes("temp"))
  } catch (error) {
    return false
  }
}

async function requestPhoneNumber(chatId: number, firstName: string) {
  const message = `👋 Salom ${firstName}!\n\nGlobalMarket botiga xush kelibsiz! 🛒\n\nDavom etish uchun telefon raqamingizni ulashing:`

  const keyboard = {
    keyboard: [
      [
        {
          text: "📞 Telefon raqamni ulashish",
          request_contact: true,
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  }

  await sendTelegramMessage(chatId, message, keyboard)
}

async function handleContactShare(chatId: number, userId: number, contact: any, userInfo: any) {
  try {
    const phoneNumber = contact.phone_number
    const fullName = `${userInfo.first_name} ${userInfo.last_name || ""}`.trim()

    // Check if user exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("telegram_id", userId).single()

    if (existingUser) {
      // Update existing user
      await supabase
        .from("users")
        .update({
          phone: phoneNumber,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", userId)
    } else {
      // Create new user
      const baseUsername = userInfo.first_name?.toLowerCase().replace(/[^a-z0-9]/g, "") || "user"

      await supabase.from("users").insert({
        telegram_id: userId,
        full_name: fullName,
        phone: phoneNumber,
        email: `telegram_${userId}@temp.com`,
        username: baseUsername + "_" + userId.toString().slice(-4),
      })
    }

    await sendTelegramMessage(
      chatId,
      "✅ Telefon raqamingiz muvaffaqiyatli saqlandi!\n\nEndi botning barcha imkoniyatlaridan foydalanishingiz mumkin.",
      { remove_keyboard: true },
    )

    // Send welcome message
    const isAdmin = await checkAdminStatus(userId)
    await sendWelcomeMessage(chatId, userInfo.first_name, isAdmin)
  } catch (error) {
    console.error("Error handling contact share:", error)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
  }
}

async function handleProductStart(chatId: number, userId: number, startParam: string) {
  try {
    // Parse parameters: category_name&product_id=xxx
    const params = startParam.split("&")
    let productId = ""

    for (const param of params) {
      if (param.startsWith("product_id=")) {
        productId = param.replace("product_id=", "")
        break
      }
    }

    if (!productId) {
      await sendWelcomeMessage(chatId, "Foydalanuvchi", false)
      return
    }

    await showProductDetails(chatId, productId)
  } catch (error) {
    console.error("Error handling product start:", error)
    await sendWelcomeMessage(chatId, "Foydalanuvchi", false)
  }
}

async function openWebApp(chatId: number, type: string) {
  const webAppUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://globalmarketshop.netlify.app"}/telegram-webapp?type=${type}`

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🔍 Qidirish oynasini ochish",
          web_app: {
            url: webAppUrl,
          },
        },
      ],
      [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
    ],
  }

  await sendTelegramMessage(
    chatId,
    "🔍 *Mahsulot qidirish*\n\nQuyidagi tugma orqali qidirish oynasini oching:",
    keyboard,
    "Markdown",
  )
}

async function startContactMessage(chatId: number, userId: number) {
  userSessions.set(userId, { state: "contact_message" })

  await sendTelegramMessage(
    chatId,
    "💬 *Murojaat yuborish*\n\nXabaringizni yozing. Biz sizga tez orada javob beramiz:",
    {
      inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "back_to_main" }]],
    },
    "Markdown",
  )
}

async function handleContactMessage(chatId: number, userId: number, message: string) {
  try {
    // Get user info
    const { data: user } = await supabase
      .from("users")
      .select("full_name, phone, username")
      .eq("telegram_id", userId)
      .single()

    // Create contact message
    const { error } = await supabase.from("contact_messages").insert({
      user_id: null,
      full_name: user?.full_name || "Telegram foydalanuvchi",
      phone: user?.phone || "Noma'lum",
      email: `telegram_${userId}@temp.com`,
      message_type: "general",
      subject: "Telegram bot orqali murojaat",
      message: message,
      status: "new",
    })

    if (error) throw error

    // Create admin message
    await supabase.from("admin_messages").insert({
      type: "contact",
      title: "Telegram bot orqali murojaat",
      content: message,
      data: {
        telegram_id: userId,
        username: user?.username,
        phone: user?.phone,
        full_name: user?.full_name,
      },
      status: "pending",
      created_by: user?.id || null,
    })

    // Notify admins
    await notifyAdminsNewMessage("contact", "Yangi murojaat", message, user)

    await sendTelegramMessage(
      chatId,
      "✅ Murojaatingiz muvaffaqiyatli yuborildi!\n\nBiz sizga tez orada javob beramiz.",
      {
        inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
      },
    )

    userSessions.delete(userId)
  } catch (error) {
    console.error("Error handling contact message:", error)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
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

async function handleWebsiteConnection(chatId: number, userId: number, startParam: string) {
  try {
    const params = new URLSearchParams(startParam.replace("website&", ""))
    const email = params.get("email")

    if (!email) {
      await sendTelegramMessage(chatId, "❌ Email manzil topilmadi. Iltimos, websaytdan qayta urinib ko'ring.")
      return
    }

    const { data, error } = await supabase.rpc("connect_telegram_to_user", {
      p_email: email,
      p_telegram_id: userId,
    })

    if (error || !data.success) {
      await sendTelegramMessage(
        chatId,
        "❌ Hisobni ulashda xatolik yuz berdi. Email manzil to'g'ri ekanligini tekshiring.",
      )
      return
    }

    await sendTelegramMessage(
      chatId,
      `✅ *Muvaffaqiyat!*\n\nTelegram hisobingiz websaytga ulandi!\n\n👤 Username: @${data.username}\n📧 Email: ${email}\n\n🌐 Endi websaytdagi barcha yangilanishlarni Telegram orqali olasiz!`,
      {
        inline_keyboard: [
          [
            { text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" },
            { text: "📋 Buyurtmalarim", callback_data: "my_orders" },
          ],
          [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
        ],
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Website connection error:", error)
    await sendTelegramMessage(chatId, "❌ Texnik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.")
  }
}

async function handleWebsiteConnectionRequest(chatId: number, userId: number) {
  const { data: user } = await supabase.from("users").select("email, username").eq("telegram_id", userId).single()

  if (!user?.email || user.email.includes("@temp.com")) {
    await sendTelegramMessage(
      chatId,
      "🌐 *Websaytga ulash*\n\nWebsaytga ulanish uchun avval ro'yxatdan o'ting:\n\n1. Quyidagi havolaga o'ting\n2. Ro'yxatdan o'ting yoki kiring\n3. Profilingizda 'Telegram botga ulash' tugmasini bosing",
      {
        inline_keyboard: [
          [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app/register" }],
          [{ text: "🔙 Orqaga", callback_data: "back_to_main" }],
        ],
      },
      "Markdown",
    )
  } else {
    await sendTelegramMessage(
      chatId,
      `✅ Sizning hisobingiz allaqachon ulangan!\n\n👤 Username: @${user.username}\n📧 Email: ${user.email}`,
      {
        inline_keyboard: [
          [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" }],
          [{ text: "🔙 Orqaga", callback_data: "back_to_main" }],
        ],
      },
    )
  }
}

async function sendWelcomeMessage(chatId: number, firstName: string, isAdmin: boolean) {
  const name = firstName || "Foydalanuvchi"

  const message = `👋 Salom ${name}! GlobalMarket botiga xush kelibsiz!\n\n🛒 Mahsulotlarni ko'rish va sotib olish\n🔍 Mahsulot qidirish\n🏪 Market haqida ma'lumot\n📞 Murojaat yuborish\n\n📋 Buyurtmalaringizni kuzatish va boshqa imkoniyatlar uchun tugmalardan foydalaning.`

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📂 Kategoriyalar", callback_data: "categories" },
        { text: "🔍 Qidirish", callback_data: "search" },
      ],
      [
        { text: "🏪 Market haqida", callback_data: "about" },
        { text: "💬 Murojaat", callback_data: "contact" },
      ],
      [
        { text: "📋 Buyurtmalarim", callback_data: "my_orders" },
        { text: "🌐 Websaytga ulash", callback_data: "connect_website" },
      ],
      ...(isAdmin ? [[{ text: "👑 Admin Panel", callback_data: "admin_panel" }]] : []),
    ],
  }

  await sendTelegramMessage(chatId, message, keyboard)
}

async function sendAdminPanel(chatId: number) {
  const message = `👑 *Admin Panel*\n\nTizimni boshqarish va nazorat qilish\n\n📊 Statistika va hisobotlar\n📋 Buyurtmalarni boshqarish\n💬 Xabarlarni ko'rish\n📦 Mahsulot so'rovlari\n👥 Foydalanuvchilar`

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📋 Buyurtmalar", callback_data: "admin_orders" },
        { text: "💬 Xabarlar", callback_data: "admin_messages" },
      ],
      [
        { text: "📦 Sotish so'rovlari", callback_data: "admin_sell_requests" },
        { text: "👥 Foydalanuvchilar", callback_data: "admin_users" },
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
  const message = `❓ *Yordam*\n\n*Mavjud buyruqlar:*\n/start - Bosh menyu\n/categories - Kategoriyalar\n/myorders - Buyurtmalarim\n/help - Yordam\n\n*Admin buyruqlari:*\n/admin - Admin panel\n/orders - Barcha buyurtmalar\n\n*Bot imkoniyatlari:*\n🛒 Mahsulot sotib olish\n🔍 Mahsulot qidirish (Web App)\n📋 Buyurtmalarni kuzatish\n🏪 Market haqida ma'lumot\n💬 Murojaat yuborish\n🌐 Websaytga ulanish`

  await sendTelegramMessage(chatId, message, null, "Markdown")
}

async function showCategories(chatId: number) {
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")

    if (error) throw error

    if (!categories || categories.length === 0) {
      await sendTelegramMessage(chatId, "❌ Kategoriyalar topilmadi.")
      return
    }

    const message = "📂 *Kategoriyalarni tanlang:*\n\nQaysi kategoriyadan mahsulot ko'rmoqchisiz?"

    const keyboard = {
      inline_keyboard: [
        ...categories.map((category) => [
          { text: `${category.icon} ${category.name_uz}`, callback_data: `category_${category.slug}` },
        ]),
        [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
      ],
    }

    await sendTelegramMessage(chatId, message, keyboard, "Markdown")
  } catch (error) {
    console.error("Error showing categories:", error)
    await sendTelegramMessage(chatId, "❌ Kategoriyalarni olishda xatolik.")
  }
}

async function showCategoryProducts(chatId: number, categorySlug: string, page = 1) {
  try {
    const limit = 10
    const offset = (page - 1) * limit

    // Get category first
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", categorySlug)
      .single()

    if (categoryError || !category) {
      await sendTelegramMessage(chatId, "❌ Kategoriya topilmadi.")
      return
    }

    // Get products in this category
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        *,
        categories!inner (name_uz, icon),
        users (full_name, company_name, username)
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

    const message = `📦 *${category.icon} ${category.name_uz}*\n\nSahifa ${page} (${products.length} ta mahsulot):\n\nMahsulotni tanlang:`

    const keyboard = {
      inline_keyboard: [
        ...products.map((product) => [
          {
            text: `${product.name} - ${formatPrice(product.price)}`,
            callback_data: `product_${product.id}`,
          },
        ]),
        // Pagination
        ...(products.length === limit
          ? [
              [
                { text: "⬅️ Oldingi", callback_data: `page_${categorySlug}_${Math.max(1, page - 1)}` },
                { text: "➡️ Keyingi", callback_data: `page_${categorySlug}_${page + 1}` },
              ],
            ]
          : page > 1
            ? [[{ text: "⬅️ Oldingi", callback_data: `page_${categorySlug}_${page - 1}` }]]
            : []),
        [{ text: "🔙 Kategoriyalarga qaytish", callback_data: "categories" }],
      ],
    }

    await sendTelegramMessage(chatId, message, keyboard, "Markdown")
  } catch (error) {
    console.error("Error showing category products:", error)
    await sendTelegramMessage(chatId, "❌ Mahsulotlarni olishda xatolik.")
  }
}

async function showProductDetails(chatId: number, productId: string) {
  try {
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (name_uz, icon),
        users (full_name, company_name, username)
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
    message += `🏷️ *Kategoriya:* ${product.categories.icon} ${product.categories.name_uz}\n`
    message += `🏪 *Sotuvchi:* @${product.users.username}\n\n`

    if (product.description) {
      message += `📝 *Tavsif:*\n${product.description}\n\n`
    }

    if (product.author) {
      message += `✍️ *Muallif:* ${product.author}\n`
    }

    if (product.brand) {
      message += `🏷️ *Brend:* ${product.brand}\n`
    }

    if (product.has_delivery) {
      message += `🚚 *Yetkazib berish:* ${formatPrice(product.delivery_price || 0)}\n`
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: "🛒 Sotib olish", callback_data: `buy_${product.id}` }],
        [{ text: "🔙 Orqaga", callback_data: "categories" }],
      ],
    }

    // Send photo if available
    if (product.image_url && product.image_url !== "/placeholder.svg" && !product.image_url.includes("placeholder")) {
      try {
        await sendTelegramPhoto(chatId, product.image_url, message, keyboard, "Markdown")
      } catch (photoError) {
        // If photo fails, send text message
        await sendTelegramMessage(chatId, message, keyboard, "Markdown")
      }
    } else {
      await sendTelegramMessage(chatId, message, keyboard, "Markdown")
    }
  } catch (error) {
    console.error("Error showing product details:", error)
    await sendTelegramMessage(chatId, "❌ Mahsulot ma'lumotlarini olishda xatolik.")
  }
}

async function startOrderProcess(chatId: number, userId: number, productId: string) {
  try {
    const { data: product, error } = await supabase.from("products").select("*").eq("id", productId).single()

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

    await sendTelegramMessage(
      chatId,
      `🛒 *Buyurtma berish*\n\n📦 Mahsulot: ${product.name}\n💰 Narx: ${formatPrice(product.price)}\n\n❓ Nechta dona kerak? (1-${product.stock_quantity})`,
      {
        inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "back_to_main" }]],
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Error starting order process:", error)
    await sendTelegramMessage(chatId, "❌ Buyurtma jarayonini boshlashda xatolik.")
  }
}

async function handleOrderInput(chatId: number, userId: number, text: string, session: any) {
  try {
    if (session.step === "quantity") {
      const quantity = Number.parseInt(text)
      if (isNaN(quantity) || quantity < 1 || quantity > session.maxQuantity) {
        await sendTelegramMessage(chatId, `❌ Noto'g'ri miqdor. 1 dan ${session.maxQuantity} gacha son kiriting.`)
        return
      }

      session.quantity = quantity
      session.step = "name"
      userSessions.set(userId, session)

      await sendTelegramMessage(chatId, "👤 To'liq ism-familiyangizni kiriting:")
    } else if (session.step === "name") {
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
      const phoneRegex = /^(\+998|998|8)?[0-9]{9}$/
      if (!phoneRegex.test(text.replace(/[\s\-()]/g, ""))) {
        await sendTelegramMessage(chatId, "❌ Noto'g'ri telefon raqam. Qaytadan kiriting:\n(Masalan: +998901234567)")
        return
      }

      session.phone = text
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
  } catch (error) {
    console.error("Error handling order input:", error)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
    userSessions.delete(userId)
  }
}

async function completeOrder(chatId: number, userId: number, session: any) {
  try {
    const productTotal = session.productPrice * session.quantity
    const deliveryTotal = session.hasDelivery ? session.deliveryPrice : 0
    const totalAmount = productTotal + deliveryTotal

    // Generate anonymous temp ID
    const anonTempId = `tg_${userId}_${Date.now()}`

    // Create order
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
      })
      .select()
      .single()

    if (error) throw error

    // Update product stock
    await supabase
      .from("products")
      .update({
        order_count: supabase.sql`order_count + ${session.quantity}`,
        stock_quantity: supabase.sql`stock_quantity - ${session.quantity}`,
      })
      .eq("id", session.productId)

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

    const keyboard = {
      inline_keyboard: [
        [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }],
        [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
      ],
    }

    await sendTelegramMessage(chatId, message, keyboard, "Markdown")

    // Notify admins
    await notifyAdminsNewOrder(order.id)

    // Clear session
    userSessions.delete(userId)
  } catch (error) {
    console.error("Error completing order:", error)
    await sendTelegramMessage(chatId, "❌ Buyurtmani yaratishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
    userSessions.delete(userId)
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

    const keyboard = {
      inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
    }

    await sendTelegramMessage(chatId, message, keyboard, "Markdown")
  } catch (error) {
    console.error("Error showing user orders:", error)
    await sendTelegramMessage(chatId, "❌ Buyurtmalarni olishda xatolik.")
  }
}

async function showAboutMarket(chatId: number) {
  const message = `🏪 *GlobalMarket haqida*\n\nGlobalMarket - G'uzor tumanidagi eng katta onlayn bozor!\n\n📚 *Bizda mavjud:*\n• Kitoblar va darsliklar\n• Maktab buyumlari\n• Ofis jihozlari\n• Va boshqa ko'plab mahsulotlar\n\n🌍 *Xizmat hududi:*\nG'uzor tumani, Qashqadaryo viloyati\n\n📱 *Websayt:* https://globalmarketshop.netlify.app\n\n✅ *Bizning afzalliklarimiz:*\n• Tez yetkazib berish\n• Sifatli mahsulotlar\n• Qulay narxlar\n• Ishonchli sotuvchilar`

  const keyboard = {
    inline_keyboard: [
      [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" }],
      [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
    ],
  }

  await sendTelegramMessage(chatId, message, keyboard, "Markdown")
}

// Admin functions
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
        users (full_name, phone, username)
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
      message += `👤 @${msg.users?.username || msg.data?.username || "noma'lum"}\n`
      message += `📞 ${msg.users?.phone || msg.data?.phone || "Noma'lum"}\n`
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

    // Send action buttons for each message
    for (const msg of messages) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Javob berildi", callback_data: `respond_msg_${msg.id}` },
            { text: "❌ Yopish", callback_data: `close_msg_${msg.id}` },
          ],
        ],
      }

      await sendTelegramMessage(chatId, `Xabar #${msg.id.slice(-8)} uchun amal tanlang:`, keyboard)
    }
  } catch (error) {
    console.error("Error showing admin messages:", error)
    await sendTelegramMessage(chatId, "❌ Xabarlarni olishda xatolik.")
  }
}

async function showSellRequests(chatId: number) {
  try {
    const { data: requests, error } = await supabase
      .from("sell_requests")
      .select(`
        *,
        users (full_name, username, phone),
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

    await sendTelegramMessage(
      chatId,
      message,
      {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      },
      "Markdown",
    )

    // Send action buttons for each request
    for (const request of requests) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: `approve_sell_${request.id}` },
            { text: "❌ Rad etish", callback_data: `reject_sell_${request.id}` },
          ],
        ],
      }

      await sendTelegramMessage(chatId, `So'rov #${request.id.slice(-8)} uchun amal tanlang:`, keyboard)
    }
  } catch (error) {
    console.error("Error showing sell requests:", error)
    await sendTelegramMessage(chatId, "❌ Sotish so'rovlarini olishda xatolik.")
  }
}

async function showUsers(chatId: number) {
  try {
    const [usersResult, sellersResult, todayUsersResult] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().split("T")[0]),
    ])

    const message = `👥 *Foydalanuvchilar statistikasi:*\n\n📊 Jami foydalanuvchilar: ${usersResult.count || 0}\n🏪 Sotuvchilar: ${sellersResult.count || 0}\n📅 Bugun ro'yxatdan o'tganlar: ${todayUsersResult.count || 0}`

    await sendTelegramMessage(
      chatId,
      message,
      {
        inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Error showing users:", error)
    await sendTelegramMessage(chatId, "❌ Foydalanuvchilar ma'lumotlarini olishda xatolik.")
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

    // Notify customer about status change
    await notifyCustomerStatusChange(orderId, status)

    console.log(`✅ Order ${orderId} status updated to ${status}`)
  } catch (error) {
    console.error("Error handling order action:", error)
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!")
  }
}

async function handleSellRequestAction(chatId: number, callbackQueryId: string, requestId: string, action: string) {
  try {
    let status = ""
    let statusText = ""

    switch (action) {
      case "approve":
        status = "approved"
        statusText = "tasdiqlandi"
        break
      case "reject":
        status = "rejected"
        statusText = "rad etildi"
        break
      default:
        await answerCallbackQuery(callbackQueryId, "Noma'lum amal!")
        return
    }

    // Update sell request via API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sell-product`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: requestId,
        status,
        admin_notes: `Telegram bot orqali ${statusText}`,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to update sell request")
    }

    await answerCallbackQuery(callbackQueryId, `So'rov ${statusText}!`)

    console.log(`✅ Sell request ${requestId} ${statusText}`)
  } catch (error) {
    console.error("Error handling sell request action:", error)
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!")
  }
}

async function handleMessageAction(chatId: number, callbackQueryId: string, messageId: string, action: string) {
  try {
    let status = ""
    let statusText = ""

    switch (action) {
      case "respond":
        status = "responded"
        statusText = "javob berildi"
        break
      case "close":
        status = "closed"
        statusText = "yopildi"
        break
      default:
        await answerCallbackQuery(callbackQueryId, "Noma'lum amal!")
        return
    }

    const { error } = await supabase
      .from("admin_messages")
      .update({
        status: status,
        admin_response: `Telegram bot orqali ${statusText}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)

    if (error) throw error

    await answerCallbackQuery(callbackQueryId, `Xabar ${statusText}!`)

    console.log(`✅ Message ${messageId} ${statusText}`)
  } catch (error) {
    console.error("Error handling message action:", error)
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!")
  }
}

async function notifyAdminsNewOrder(orderId: string) {
  try {
    console.log(`📢 Adminlarga yangi buyurtma haqida xabar: ${orderId}`)

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        products (name, price)
      `)
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      console.error("Buyurtma topilmadi:", orderError)
      return
    }

    const message =
      `🔔 *Yangi buyurtma!*\n\n` +
      `🆔 #${order.id.slice(-8)}\n` +
      `📦 ${order.products.name}\n` +
      `👤 ${order.full_name}\n` +
      `📞 ${order.phone}\n` +
      `📍 ${order.address}\n` +
      `💰 ${formatPrice(order.total_amount)}\n` +
      `📅 ${formatDate(order.created_at)}`

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔄 Jarayonda", callback_data: `processing_order_${order.id}` },
          { text: "✅ Bajarildi", callback_data: `complete_order_${order.id}` },
        ],
        [{ text: "❌ Bekor qilish", callback_data: `cancel_order_${order.id}` }],
      ],
    }

    // Send to all admins
    const { data: admins } = await supabase
      .from("users")
      .select("telegram_id, username")
      .eq("is_admin", true)
      .not("telegram_id", "is", null)

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        try {
          await sendTelegramMessage(admin.telegram_id, message, keyboard, "Markdown")
          console.log(`✅ Admin @${admin.username} ga xabar yuborildi`)
        } catch (error) {
          console.error(`❌ Admin ${admin.telegram_id} ga xabar yuborishda xatolik:`, error)
        }
      }
    } else {
      console.log("❌ Adminlar topilmadi")
    }
  } catch (error) {
    console.error("Adminlarga xabar berishda xatolik:", error)
  }
}

async function notifyAdminsNewMessage(type: string, title: string, content: string, userData: any) {
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

    // Send to all admins
    const { data: admins } = await supabase
      .from("users")
      .select("telegram_id, username")
      .eq("is_admin", true)
      .not("telegram_id", "is", null)

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        try {
          await sendTelegramMessage(admin.telegram_id, message, null, "Markdown")
          console.log(`✅ Admin @${admin.username} ga xabar yuborildi`)
        } catch (error) {
          console.error(`❌ Admin ${admin.telegram_id} ga xabar yuborishda xatolik:`, error)
        }
      }
    }
  } catch (error) {
    console.error("Adminlarga xabar berishda xatolik:", error)
  }
}

async function notifyCustomerStatusChange(orderId: string, status: string) {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (name),
        users (telegram_id)
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

    if (status === "completed") {
      message += `\n🎉 Buyurtmangiz tayyor! Tez orada yetkazib beriladi.`
    } else if (status === "processing") {
      message += `\n⏳ Buyurtmangiz tayyorlanmoqda...`
    } else if (status === "cancelled") {
      message += `\n😔 Buyurtmangiz bekor qilindi. Ma'lumot uchun qo'ng'iroq qiling.`
    }

    // Send to customer
    if (order.users && order.users.telegram_id) {
      await sendTelegramMessage(order.users.telegram_id, message, null, "Markdown")
      console.log(`📤 Mijozga xabar yuborildi: ${order.users.telegram_id}`)
    } else if (order.anon_temp_id && order.anon_temp_id.startsWith("tg_")) {
      // Anonymous Telegram order
      const telegramId = order.anon_temp_id.split("_")[1]
      await sendTelegramMessage(telegramId, message, null, "Markdown")
      console.log(`📤 Anonim mijozga xabar yuborildi: ${telegramId}`)
    }
  } catch (error) {
    console.error("Mijozga xabar berishda xatolik:", error)
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

async function sendTelegramPhoto(chatId: number, photo: string, caption: string, keyboard?: any, parseMode?: string) {
  try {
    const payload: any = {
      chat_id: chatId,
      photo: photo,
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
    console.log(`📤 Photo sent to ${chatId}`)
    return result
  } catch (error) {
    console.error("Error sending Telegram photo:", error)
    throw error
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
