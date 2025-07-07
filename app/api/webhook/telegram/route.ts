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

  // Handle commands
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
      } else if (session.state === "searching") {
        await handleProductSearch(chatId, text)
        userSessions.delete(userId)
      } else if (session.state === "broadcast_message" && isAdmin) {
        await handleBroadcastMessage(chatId, userId, text)
        userSessions.delete(userId)
      }
    } else {
      // Check if it's a contact message (not a command)
      if (!text.startsWith("/")) {
        // This is a regular message, treat as contact
        await handleContactMessage(chatId, userId, text)
      } else {
        // Unknown command
        await sendTelegramMessage(
          chatId,
          "❓ Noma'lum buyruq. Yordam uchun /help yuboring.\n\n📋 Mavjud buyruqlar:\n/start - Bosh menyu\n/categories - Kategoriyalar\n/myorders - Buyurtmalarim\n/help - Yordam",
        )
      }
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
    await sendTelegramMessage(chatId, "🔍 Mahsulot nomini yozing:")
    userSessions.set(userId, { state: "searching" })
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
    } else if (data === "admin_users") {
      await showUsers(chatId)
    } else if (data === "admin_broadcast") {
      await startBroadcastMessage(chatId, userId)
    } else if (data === "admin_panel_web") {
      await sendWebAdminPanel(chatId)
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

  await sendTelegramMessage(chatId, message, { reply_markup: { inline_keyboard: keyboard.inline_keyboard } })
}

async function sendAdminPanel(chatId: number) {
  const message = `👑 *Admin Panel*\n\nTizimni boshqarish va nazorat qilish\n\n📊 Statistika va hisobotlar\n📋 Buyurtmalarni boshqarish\n💬 Xabarlarni ko'rish\n👥 Foydalanuvchilar\n📢 Xabar tarqatish`

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📋 Buyurtmalar", callback_data: "admin_orders" },
        { text: "💬 Xabarlar", callback_data: "admin_messages" },
      ],
      [
        { text: "👥 Foydalanuvchilar", callback_data: "admin_users" },
        { text: "📊 Statistika", callback_data: "admin_stats" },
      ],
      [
        { text: "📢 Xabar tarqatish", callback_data: "admin_broadcast" },
        { text: "🌐 Web Admin", callback_data: "admin_panel_web" },
      ],
      [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
    ],
  }

  await sendTelegramMessage(
    chatId,
    message,
    { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
    "Markdown",
  )
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

    await sendTelegramMessage(
      chatId,
      message,
      { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
      "Markdown",
    )
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

    // Get products in this category with proper joins
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        stock_quantity,
        average_rating,
        view_count,
        order_count,
        like_count,
        image_url,
        categories:category_id (name_uz, icon),
        sellers:seller_id (username)
      `)
      .eq("category_id", category.id)
      .eq("is_active", true)
      .eq("is_approved", true)
      .gt("stock_quantity", 0)
      .order("popularity_score", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    if (!products || products.length === 0) {
      await sendTelegramMessage(chatId, `❌ "${category.name_uz}" kategoriyasida mahsulotlar topilmadi.`, {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Kategoriyalarga qaytish", callback_data: "categories" }]],
        },
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

    await sendTelegramMessage(
      chatId,
      message,
      { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
      "Markdown",
    )
  } catch (error) {
    console.error("Error showing category products:", error)
    await sendTelegramMessage(chatId, "❌ Mahsulotlarni olishda xatolik.")
  }
}

async function handleProductSearch(chatId: number, query: string) {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        stock_quantity,
        average_rating,
        view_count,
        order_count,
        like_count,
        image_url,
        categories:category_id (name_uz, icon),
        sellers:seller_id (username)
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,author.ilike.%${query}%,brand.ilike.%${query}%`)
      .eq("is_active", true)
      .eq("is_approved", true)
      .gt("stock_quantity", 0)
      .order("popularity_score", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!products || products.length === 0) {
      await sendTelegramMessage(
        chatId,
        `❌ "${query}" bo'yicha mahsulotlar topilmadi.\n\nBoshqa nom bilan qidirib ko'ring.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Qayta qidirish", callback_data: "search" }],
              [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
            ],
          },
        },
      )
      return
    }

    const message = `🔍 *"${query}" bo'yicha natijalar*\n\n${products.length} ta mahsulot topildi:\n\nMahsulotni tanlang:`

    const keyboard = {
      inline_keyboard: [
        ...products.map((product) => [
          {
            text: `${product.name} - ${formatPrice(product.price)}`,
            callback_data: `product_${product.id}`,
          },
        ]),
        [
          { text: "🔍 Qayta qidirish", callback_data: "search" },
          { text: "🔙 Bosh menyu", callback_data: "back_to_main" },
        ],
      ],
    }

    await sendTelegramMessage(
      chatId,
      message,
      { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
      "Markdown",
    )
  } catch (error) {
    console.error("Error handling product search:", error)
    await sendTelegramMessage(chatId, "❌ Qidirishda xatolik yuz berdi.")
  }
}

async function showProductDetails(chatId: number, productId: string) {
  try {
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        stock_quantity,
        average_rating,
        view_count,
        like_count,
        image_url,
        has_delivery,
        delivery_price,
        categories:category_id (name_uz, icon),
        sellers:seller_id (username, company_name)
      `)
      .eq("id", productId)
      .single()

    if (error || !product) {
      await sendTelegramMessage(chatId, "❌ Mahsulot topilmadi.")
      return
    }

    // Update view count
    await supabase
      .from("products")
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq("id", productId)

    let message = `📦 *${product.name}*\n\n`
    message += `💰 *Narx:* ${formatPrice(product.price)}\n`
    message += `📊 *Mavjud:* ${product.stock_quantity} dona\n`
    message += `⭐ *Reyting:* ${product.average_rating}/5\n`
    message += `👀 *Ko'rishlar:* ${(product.view_count || 0) + 1}\n`
    message += `❤️ *Yoqtirishlar:* ${product.like_count || 0}\n`
    message += `🏷️ *Kategoriya:* ${product.categories.icon} ${product.categories.name_uz}\n`
    if (product.sellers) {
      message += `🏪 *Sotuvchi:* ${product.sellers.company_name ? `${product.sellers.company_name} (@${product.sellers.username})` : `@${product.sellers.username}`}\n`
    }
    message += `\n`

    if (product.description) {
      message += `📝 *Tavsif:*\n${product.description}\n\n`
    }

    if (product.brand) {
      message += `🏷️ *Brend:* ${product.brand}\n`
    }
    if (product.author) {
      message += `✍️ *Muallif:* ${product.author}\n`
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
        await sendTelegramMessage(
          chatId,
          message,
          { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
          "Markdown",
        )
      }
    } else {
      await sendTelegramMessage(
        chatId,
        message,
        { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
        "Markdown",
      )
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
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "back_to_main" }]],
        },
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

    // Update product stock and order count
    const { data: currentProduct } = await supabase
      .from("products")
      .select("order_count, stock_quantity")
      .eq("id", session.productId)
      .single()

    if (currentProduct) {
      await supabase
        .from("products")
        .update({
          order_count: (currentProduct.order_count || 0) + session.quantity,
          stock_quantity: Math.max(0, (currentProduct.stock_quantity || 0) - session.quantity),
        })
        .eq("id", session.productId)
    }

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

    await sendTelegramMessage(
      chatId,
      message,
      { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
      "Markdown",
    )

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

async function startContactMessage(chatId: number, userId: number) {
  userSessions.set(userId, { state: "contact_message" })

  await sendTelegramMessage(
    chatId,
    "💬 *Murojaat yuborish*\n\nXabaringizni yozing. Biz sizga tez orada javob beramiz:",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "back_to_main" }]],
      },
    },
    "Markdown",
  )
}

async function handleContactMessage(chatId: number, userId: number, message: string) {
  try {
    // Get user info
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, phone, username")
      .eq("telegram_id", userId)
      .single()

    // Create admin message
    const { error } = await supabase.from("admin_messages").insert({
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

    if (error) throw error

    await sendTelegramMessage(
      chatId,
      "✅ Murojaatingiz muvaffaqiyatli yuborildi!\n\nBiz sizga tez orada javob beramiz.",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
        },
      },
    )

    // Notify admins
    await notifyAdminsNewMessage("contact", "Yangi murojaat", message, user)

    userSessions.delete(userId)
  } catch (error) {
    console.error("Error handling contact message:", error)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
  }
}

async function startBroadcastMessage(chatId: number, userId: number) {
  userSessions.set(userId, { state: "broadcast_message" })

  await sendTelegramMessage(
    chatId,
    "📢 *Xabar tarqatish*\n\nBarcha foydalanuvchilarga yubormoqchi bo'lgan xabaringizni yozing:",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "back_to_admin" }]],
      },
    },
    "Markdown",
  )
}

async function handleBroadcastMessage(chatId: number, userId: number, message: string) {
  try {
    // Get all users with telegram_id
    const { data: users, error } = await supabase
      .from("users")
      .select("telegram_id, full_name")
      .not("telegram_id", "is", null)

    if (error) throw error

    if (!users || users.length === 0) {
      await sendTelegramMessage(chatId, "❌ Xabar yuborish uchun foydalanuvchilar topilmadi.")
      return
    }

    let sentCount = 0
    let failedCount = 0

    const broadcastMessage = `📢 *GlobalMarket xabari*\n\n${message}\n\n---\n_Bu xabar barcha foydalanuvchilarga yuborildi_`

    // Send to all users
    for (const user of users) {
      try {
        await sendTelegramMessage(user.telegram_id, broadcastMessage, null, "Markdown")
        sentCount++
        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to send to ${user.telegram_id}:`, error)
        failedCount++
      }
    }

    // Save broadcast record
    await supabase.from("broadcast_messages").insert({
      title: "Telegram broadcast",
      content: message,
      sender_id: userId,
      target_audience: "all",
      sent_count: sentCount,
    })

    await sendTelegramMessage(
      chatId,
      `✅ Xabar tarqatildi!\n\n📊 Statistika:\n• Yuborildi: ${sentCount}\n• Xatolik: ${failedCount}\n• Jami: ${users.length}`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
        },
      },
    )
  } catch (error) {
    console.error("Error handling broadcast message:", error)
    await sendTelegramMessage(chatId, "❌ Xabar tarqatishda xatolik yuz berdi.")
  }
}

async function showUserOrders(chatId: number, telegramId: number) {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        full_name,
        phone,
        address,
        quantity,
        total_amount,
        status,
        created_at,
        products:product_id (name, price)
      `)
      .like("anon_temp_id", `tg_${telegramId}_%`)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!orders || orders.length === 0) {
      await sendTelegramMessage(chatId, "📭 Sizda buyurtmalar yo'q.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
        },
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

    await sendTelegramMessage(
      chatId,
      message,
      { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
      "Markdown",
    )
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

  await sendTelegramMessage(
    chatId,
    message,
    { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
    "Markdown",
  )
}

async function sendWebAdminPanel(chatId: number) {
  const message = `🌐 *Web Admin Panel*\n\nTo'liq admin paneliga o'tish uchun quyidagi havolani bosing:\n\nU yerda siz barcha imkoniyatlardan foydalanishingiz mumkin:\n• Mahsulotlarni boshqarish\n• Foydalanuvchilarni ko'rish\n• Buyurtmalarni nazorat qilish\n• Statistikalarni ko'rish\n• Va boshqa ko'plab imkoniyatlar`

  const keyboard = {
    inline_keyboard: [
      [{ text: "🌐 Admin Panelga o'tish", url: "https://globalmarketshop.netlify.app/admin-panel" }],
      [{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }],
    ],
  }

  await sendTelegramMessage(
    chatId,
    message,
    { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
    "Markdown",
  )
}

async function handleWebsiteConnectionRequest(chatId: number, userId: number) {
  const { data: user } = await supabase.from("users").select("email, username").eq("telegram_id", userId).single()

  if (!user?.email || user.email.includes("@temp.com")) {
    await sendTelegramMessage(
      chatId,
      "🌐 *Websaytga ulash*\n\nWebsaytga ulanish uchun avval ro'yxatdan o'ting:\n\n1. Quyidagi havolaga o'ting\n2. Ro'yxatdan o'ting yoki kiring\n3. Profilingizda 'Telegram botga ulash' tugmasini bosing",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app/register" }],
            [{ text: "🔙 Orqaga", callback_data: "back_to_main" }],
          ],
        },
      },
      "Markdown",
    )
  } else {
    await sendTelegramMessage(
      chatId,
      `✅ Sizning hisobingiz allaqachon ulangan!\n\n👤 Username: @${user.username}\n📧 Email: ${user.email}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" }],
            [{ text: "🔙 Orqaga", callback_data: "back_to_main" }],
          ],
        },
      },
    )
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
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.netlify.app" },
              { text: "📋 Buyurtmalarim", callback_data: "my_orders" },
            ],
            [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
          ],
        },
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Website connection error:", error)
    await sendTelegramMessage(chatId, "❌ Texnik xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.")
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

// Admin functions
async function showPendingOrders(chatId: number) {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        full_name,
        phone,
        address,
        quantity,
        total_amount,
        status,
        created_at,
        products:product_id (name, price)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!orders || orders.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi buyurtmalar yo'q.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
        },
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
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
        },
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

      await sendTelegramMessage(chatId, `Buyurtma #${order.id.slice(-8)} uchun amal tanlang:`, {
        reply_markup: { inline_keyboard: keyboard.inline_keyboard },
      })
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
        id,
        type,
        title,
        content,
        data,
        status,
        created_at,
        users:created_by (full_name, phone, username)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!messages || messages.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi xabarlar yo'q.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
        },
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
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
        },
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Error showing admin messages:", error)
    await sendTelegramMessage(chatId, "❌ Xabarlarni olishda xatolik.")
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
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
        },
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
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Admin Panel", callback_data: "back_to_admin" }]],
        },
      },
      "Markdown",
    )
  } catch (error) {
    console.error("Error showing stats:", error)
    await sendTelegramMessage(chatId, "❌ Statistikani olishda xatolik.")
  }
}

async function sendHelpMessage(chatId: number) {
  const message = `❓ *Yordam*\n\n*Mavjud buyruqlar:*\n/start - Bosh menyu\n/categories - Kategoriyalar\n/myorders - Buyurtmalarim\n/help - Yordam\n\n*Admin buyruqlari:*\n/admin - Admin panel\n/orders - Barcha buyurtmalar\n\n*Bot imkoniyatlari:*\n🛒 Mahsulot sotib olish\n🔍 Mahsulot qidirish (Web App)\n📋 Buyurtmalarni kuzatish\n🏪 Market haqida ma'lumot\n💬 Murojaat yuborish\n🌐 Websaytga ulanish`

  await sendTelegramMessage(chatId, message, null, "Markdown")
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

async function notifyAdminsNewOrder(orderId: string) {
  try {
    console.log(`📢 Adminlarga yangi buyurtma haqida xabar: ${orderId}`)

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        full_name,
        phone,
        address,
        quantity,
        total_amount,
        created_at,
        products:product_id (name, price)
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
          await sendTelegramMessage(
            admin.telegram_id,
            message,
            { reply_markup: { inline_keyboard: keyboard.inline_keyboard } },
            "Markdown",
          )
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
        id,
        products:product_id (name),
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

    // Send to customer if they have telegram_id
    if (order.users && order.users.telegram_id) {
      await sendTelegramMessage(order.users.telegram_id, message, null, "Markdown")
      console.log(`📤 Mijozga xabar yuborildi: ${order.users.telegram_id}`)
    } else if (order.anon_temp_id && order.anon_temp_id.startsWith("tg_")) {
      // Anonymous Telegram order
      const telegramId = order.anon_temp_id.split("_")[1]
      await sendTelegramMessage(Number.parseInt(telegramId), message, null, "Markdown")
      console.log(`📤 Anonim mijozga xabar yuborildi: ${telegramId}`)
    }
  } catch (error) {
    console.error("Mijozga xabar berishda xatolik:", error)
  }
}

// Utility functions
async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any, parseMode?: string) {
  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
    }

    if (parseMode) {
      payload.parse_mode = parseMode
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup
    }

    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!result.ok) {
      console.error("Telegram API error:", result)
      throw new Error(result.description || "Telegram API error")
    }

    return result
  } catch (error) {
    console.error("Error sending telegram message:", error)
    throw error
  }
}

async function sendTelegramPhoto(
  chatId: number,
  photoUrl: string,
  caption: string,
  replyMarkup?: any,
  parseMode?: string,
) {
  try {
    const payload: any = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
    }

    if (parseMode) {
      payload.parse_mode = parseMode
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup
    }

    const response = await fetch(`${BOT_API_URL}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!result.ok) {
      console.error("Telegram photo API error:", result)
      throw new Error(result.description || "Telegram photo API error")
    }

    return result
  } catch (error) {
    console.error("Error sending telegram photo:", error)
    throw error
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    const payload: any = {
      callback_query_id: callbackQueryId,
    }

    if (text) {
      payload.text = text
    }

    const response = await fetch(`${BOT_API_URL}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error answering callback query:", error)
  }
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any, parseMode?: string) {
  try {
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
    }

    if (parseMode) {
      payload.parse_mode = parseMode
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup
    }

    const response = await fetch(`${BOT_API_URL}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error editing message:", error)
  }
}

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
  const emojis: Record<string, string> = {
    pending: "⏳",
    processing: "🔄",
    completed: "✅",
    cancelled: "❌",
  }
  return emojis[status] || "❓"
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: "Kutilmoqda",
    processing: "Tayyorlanmoqda",
    completed: "Bajarilgan",
    cancelled: "Bekor qilingan",
  }
  return texts[status] || "Noma'lum"
}

function getMessageTypeText(type: string): string {
  const types: Record<string, string> = {
    seller_application: "Sotuvchi arizasi",
    product_approval: "Mahsulot tasdiqlash",
    contact: "Murojaat",
    book_request: "Kitob so'rovi",
    sell_request: "Mahsulot sotish so'rovi",
  }
  return types[type] || "Xabar"
}

// Export functions for external use
export { notifyAdminsNewOrder, notifyAdminsNewMessage }
