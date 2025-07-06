const TelegramBot = require("node-telegram-bot-api")
const { createClient } = require("@supabase/supabase-js")

// Environment variables
const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const SUPABASE_URL = "https://tdfphvmmwfqhnzfggpln.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZnBodm1td2ZxaG56ZmdncGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzcwNjYsImV4cCI6MjA2NzMxMzA2Nn0.0H8_6f07k0vmjOVnqqXgqBYwIEu50Qqs_tExPv1k7DQ"

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Bot yaratish (polling mode)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

console.log("🚀 GlobalMarket Telegram Bot ishga tushdi!")
console.log("🔗 Bot username: @globalmarketshopbot")

// Admin ID
const SPECIFIC_ADMIN_TELEGRAM_ID = 6295092422

// User sessions for tracking state
const userSessions = new Map()

// /start buyrug'i
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const startParam = match[1].trim()

  console.log(`📝 /start buyrug'i: ${userId} - ${startParam}`)

  // Foydalanuvchi ma'lumotlarini yangilash
  await updateUserTelegramId(userId, msg.from)

  if (startParam.startsWith(" order_")) {
    // Buyurtma kuzatish
    const parts = startParam.replace(" order_", "").split("_")
    if (parts.length >= 2) {
      const anonId = parts[0]
      const orderId = parts[1]
      await handleOrderTracking(chatId, anonId, orderId)
    }
  } else {
    // Admin tekshirish
    const isAdmin = await checkAdminStatus(userId)
    await sendMainMenu(chatId, isAdmin, msg.from.first_name)
  }
})

// /orders buyrug'i (adminlar uchun)
bot.onText(/\/orders/, async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id

  const isAdmin = await checkAdminStatus(userId)

  if (isAdmin) {
    console.log(`📋 Admin ${userId} buyurtmalarni so'radi`)
    await showPendingOrders(chatId)
  } else {
    await bot.sendMessage(chatId, "❌ Sizda admin huquqlari yo'q.")
  }
})

// /myorders buyrug'i
bot.onText(/\/myorders/, async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id

  console.log(`📋 Foydalanuvchi ${userId} o'z buyurtmalarini so'radi`)
  await showUserOrders(chatId, userId)
})

// /help buyrug'i
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id
  await sendHelpMessage(chatId)
})

// Callback query handler
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from.id
  const data = callbackQuery.data

  console.log(`🔘 Callback query: ${userId} - ${data}`)

  await bot.answerCallbackQuery(callbackQuery.id)

  if (data === "buy_products") {
    await showCategories(chatId)
  } else if (data === "search_products") {
    await bot.sendMessage(chatId, "🔍 Mahsulot nomini lotincha harflarda yozing:")
    userSessions.set(userId, { state: "searching" })
  } else if (data === "about_market") {
    await showAboutMarket(chatId)
  } else if (data === "contact_us") {
    await showContactInfo(chatId)
  } else if (data === "my_orders") {
    await showUserOrders(chatId, userId)
  } else if (data === "back_to_main") {
    await sendMainMenu(chatId, false, callbackQuery.from.first_name)
  } else if (data === "back_to_categories") {
    await showCategories(chatId)
  } else if (data.startsWith("category_")) {
    const categorySlug = data.replace("category_", "")
    await showCategoryProducts(chatId, categorySlug, 1)
  } else if (data.startsWith("product_")) {
    const productId = data.replace("product_", "")
    await showProductDetails(chatId, productId)
  } else if (data.startsWith("buy_")) {
    const productId = data.replace("buy_", "")
    await startOrderProcess(chatId, userId, productId)
  } else if (data.startsWith("page_")) {
    const [, categorySlug, page] = data.split("_")
    await showCategoryProducts(chatId, categorySlug, Number.parseInt(page))
  } else if (data.startsWith("search_page_")) {
    const [, , page, query] = data.split("_")
    await showSearchResults(chatId, decodeURIComponent(query), Number.parseInt(page))
  } else if (data.startsWith("search_product_")) {
    const productId = data.replace("search_product_", "")
    await showProductDetails(chatId, productId)
  } else if (data.startsWith("refresh_")) {
    const orderId = data.replace("refresh_", "")
    await handleOrderRefresh(chatId, orderId)
  }

  // Admin commands
  const isAdmin = await checkAdminStatus(userId)
  if (isAdmin) {
    if (data === "show_orders") {
      await showPendingOrders(chatId)
    } else if (data.startsWith("complete_")) {
      const orderId = data.replace("complete_", "")
      await updateOrderStatus(orderId, "completed")
      await bot.editMessageText(`✅ Buyurtma #${orderId.slice(-8)} bajarildi`, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      })
    } else if (data.startsWith("processing_")) {
      const orderId = data.replace("processing_", "")
      await updateOrderStatus(orderId, "processing")
      await bot.editMessageText(`🔄 Buyurtma #${orderId.slice(-8)} jarayonda`, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      })
    } else if (data.startsWith("cancel_")) {
      const orderId = data.replace("cancel_", "")
      await updateOrderStatus(orderId, "cancelled")
      await bot.editMessageText(`❌ Buyurtma #${orderId.slice(-8)} bekor qilindi`, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      })
    }
  }
})

// Text message handler
bot.on("message", async (msg) => {
  if (msg.text && !msg.text.startsWith("/")) {
    const chatId = msg.chat.id
    const userId = msg.from.id
    const session = userSessions.get(userId)

    if (session) {
      if (session.state === "searching") {
        await handleProductSearch(chatId, msg.text)
        userSessions.delete(userId)
      } else if (session.state === "ordering") {
        await handleOrderInput(chatId, userId, msg.text, session)
      }
    }
  }
})

// FUNCTIONS

async function updateUserTelegramId(telegramId, userInfo) {
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

async function checkAdminStatus(telegramId) {
  return telegramId === SPECIFIC_ADMIN_TELEGRAM_ID
}

async function sendMainMenu(chatId, isAdmin, firstName) {
  const name = firstName || "Foydalanuvchi"

  if (isAdmin) {
    const message = `👋 Salom ${name}! Admin paneliga xush kelibsiz!\n\n📋 Buyurtmalar: /orders\n❓ Yordam: /help`

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Yangi buyurtmalar", callback_data: "show_orders" }],
          [
            { text: "🛒 Mahsulot sotib olish", callback_data: "buy_products" },
            { text: "🔍 Mahsulot qidirish", callback_data: "search_products" },
          ],
          [
            { text: "🏪 Market haqida", callback_data: "about_market" },
            { text: "📞 Murojaat qilish", callback_data: "contact_us" },
          ],
          [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }],
        ],
      },
    }

    await bot.sendMessage(chatId, message, keyboard)
  } else {
    const message = `👋 Salom ${name}! GlobalMarket botiga xush kelibsiz!\n\n🛒 Mahsulot sotib olish\n🔍 Mahsulot qidirish\n🏪 Market haqida\n📞 Murojaat qilish\n\n📋 Buyurtmalaringizni kuzatish uchun "Buyurtmalarim" tugmasini bosing.`

    const keyboard = {
      reply_markup: {
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
        ],
      },
    }

    await bot.sendMessage(chatId, message, keyboard)
  }
}

async function sendHelpMessage(chatId) {
  const message = `❓ *Yordam*

*Mavjud buyruqlar:*
/start - Botni boshlash
/myorders - Buyurtmalarim
/help - Yordam

*Admin buyruqlari:*
/orders - Barcha buyurtmalar

*Buyurtma kuzatish:*
Websaytdan buyurtma bergandan so'ng sizga maxsus havola yuboriladi.

*Bot imkoniyatlari:*
🛒 Mahsulot sotib olish
🔍 Mahsulot qidirish
📋 Buyurtmalarni kuzatish
🏪 Market haqida ma'lumot
📞 Aloqa ma'lumotlari`

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
}

async function showCategories(chatId) {
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("name_uz")

    if (error) throw error

    if (!categories || categories.length === 0) {
      await bot.sendMessage(chatId, "❌ Kategoriyalar topilmadi.")
      return
    }

    const message = "📂 *Kategoriyalarni tanlang:*\n\nQaysi kategoriyadan mahsulot sotib olmoqchisiz?"

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          ...categories.map((category) => [
            { text: `${category.icon} ${category.name_uz}`, callback_data: `category_${category.name_en}` },
          ]),
          [{ text: "🔙 Orqaga", callback_data: "back_to_main" }],
        ],
      },
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
  } catch (error) {
    console.error("Error showing categories:", error)
    await bot.sendMessage(chatId, "❌ Kategoriyalarni olishda xatolik.")
  }
}

async function showCategoryProducts(chatId, categorySlug, page = 1) {
  try {
    const limit = 10
    const offset = (page - 1) * limit

    const { data: products, error } = await supabase
      .from("products")
      .select(`
        *,
        categories!inner (name_uz, name_en, icon)
      `)
      .eq("categories.name_en", categorySlug)
      .eq("is_active", true)
      .eq("is_approved", true)
      .order("order_count", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    if (!products || products.length === 0) {
      await bot.sendMessage(chatId, "❌ Bu kategoriyada mahsulotlar topilmadi.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Kategoriyalarga qaytish", callback_data: "back_to_categories" }]],
        },
      })
      return
    }

    const category = products[0].categories
    const message = `📦 *${category.icon} ${category.name_uz}*\n\nSahifa ${page}:\n\nMahsulotni tanlang:`

    const keyboard = {
      reply_markup: {
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
          [{ text: "🔙 Kategoriyalarga qaytish", callback_data: "back_to_categories" }],
        ],
      },
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
  } catch (error) {
    console.error("Error showing category products:", error)
    await bot.sendMessage(chatId, "❌ Mahsulotlarni olishda xatolik.")
  }
}

async function handleProductSearch(chatId, query) {
  try {
    await showSearchResults(chatId, query, 1)
  } catch (error) {
    console.error("Error handling product search:", error)
    await bot.sendMessage(chatId, "❌ Qidirishda xatolik yuz berdi.")
  }
}

async function showSearchResults(chatId, query, page = 1) {
  try {
    const limit = 10
    const offset = (page - 1) * limit

    const { data: products, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (name_uz, icon)
      `)
      .ilike("name", `%${query}%`)
      .eq("is_active", true)
      .eq("is_approved", true)
      .order("order_count", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    if (!products || products.length === 0) {
      await bot.sendMessage(
        chatId,
        `❌ "${query}" bo'yicha mahsulotlar topilmadi.\n\nBoshqa nom bilan qidirib ko'ring.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Qayta qidirish", callback_data: "search_products" }],
              [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
            ],
          },
        },
      )
      return
    }

    const message = `🔍 *"${query}" bo'yicha natijalar*\n\nSahifa ${page}:\n\nMahsulotni tanlang:`

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          ...products.map((product) => [
            {
              text: `${product.name} - ${formatPrice(product.price)}`,
              callback_data: `search_product_${product.id}`,
            },
          ]),
          // Pagination
          ...(products.length === limit
            ? [
                [
                  { text: "⬅️ Oldingi", callback_data: `search_page_${page - 1}_${encodeURIComponent(query)}` },
                  { text: "➡️ Keyingi", callback_data: `search_page_${page + 1}_${encodeURIComponent(query)}` },
                ],
              ]
            : page > 1
              ? [[{ text: "⬅️ Oldingi", callback_data: `search_page_${page - 1}_${encodeURIComponent(query)}` }]]
              : []),
          [
            { text: "🔍 Qayta qidirish", callback_data: "search_products" },
            { text: "🔙 Bosh menyu", callback_data: "back_to_main" },
          ],
        ],
      },
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
  } catch (error) {
    console.error("Error showing search results:", error)
    await bot.sendMessage(chatId, "❌ Qidiruv natijalarini ko'rsatishda xatolik.")
  }
}

async function showProductDetails(chatId, productId) {
  try {
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (name_uz, icon),
        users (full_name, company_name)
      `)
      .eq("id", productId)
      .single()

    if (error || !product) {
      await bot.sendMessage(chatId, "❌ Mahsulot topilmadi.")
      return
    }

    let message = `📦 *${product.name}*\n\n`
    message += `💰 *Narx:* ${formatPrice(product.price)}\n`
    message += `📊 *Mavjud:* ${product.stock_quantity} dona\n`
    message += `⭐ *Reyting:* ${product.average_rating}/5\n`
    message += `🛒 *Buyurtmalar:* ${product.order_count} marta\n`
    message += `🏷️ *Kategoriya:* ${product.categories.icon} ${product.categories.name_uz}\n`
    message += `🏪 *Sotuvchi:* ${product.users.company_name || product.users.full_name}\n\n`

    if (product.description) {
      message += `📝 *Tavsif:*\n${product.description}\n\n`
    }

    if (product.has_delivery) {
      message += `🚚 *Yetkazib berish:* ${formatPrice(product.delivery_price)}\n`
    }

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Sotib olish", callback_data: `buy_${product.id}` }],
          [{ text: "🔙 Orqaga", callback_data: "back_to_categories" }],
        ],
      },
    }

    // Send photo if available
    if (product.image_url && product.image_url !== "/placeholder.svg") {
      try {
        await bot.sendPhoto(chatId, product.image_url, {
          caption: message,
          parse_mode: "Markdown",
          ...keyboard,
        })
      } catch (photoError) {
        // If photo fails, send text message
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
      }
    } else {
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
    }
  } catch (error) {
    console.error("Error showing product details:", error)
    await bot.sendMessage(chatId, "❌ Mahsulot ma'lumotlarini olishda xatolik.")
  }
}

async function startOrderProcess(chatId, userId, productId) {
  try {
    const { data: product, error } = await supabase.from("products").select("*").eq("id", productId).single()

    if (error || !product) {
      await bot.sendMessage(chatId, "❌ Mahsulot topilmadi.")
      return
    }

    if (product.stock_quantity <= 0) {
      await bot.sendMessage(chatId, "❌ Bu mahsulot hozirda mavjud emas.")
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

    await bot.sendMessage(
      chatId,
      `🛒 *Buyurtma berish*\n\n📦 Mahsulot: ${product.name}\n💰 Narx: ${formatPrice(product.price)}\n\n❓ Nechta dona kerak? (1-${product.stock_quantity})`,
      { parse_mode: "Markdown" },
    )
  } catch (error) {
    console.error("Error starting order process:", error)
    await bot.sendMessage(chatId, "❌ Buyurtma jarayonini boshlashda xatolik.")
  }
}

async function handleOrderInput(chatId, userId, text, session) {
  try {
    if (session.step === "quantity") {
      const quantity = Number.parseInt(text)
      if (isNaN(quantity) || quantity < 1 || quantity > session.maxQuantity) {
        await bot.sendMessage(chatId, `❌ Noto'g'ri miqdor. 1 dan ${session.maxQuantity} gacha son kiriting.`)
        return
      }

      session.quantity = quantity
      session.step = "name"
      userSessions.set(userId, session)

      await bot.sendMessage(chatId, "👤 Ism-familiyangizni kiriting:")
    } else if (session.step === "name") {
      if (text.length < 2) {
        await bot.sendMessage(chatId, "❌ Ism-familiya juda qisqa. Qaytadan kiriting:")
        return
      }

      session.fullName = text
      session.step = "phone"
      userSessions.set(userId, session)

      await bot.sendMessage(chatId, "📞 Telefon raqamingizni kiriting:\n(Masalan: +998901234567)")
    } else if (session.step === "phone") {
      const phoneRegex = /^(\+998|998|8)?[0-9]{9}$/
      if (!phoneRegex.test(text.replace(/[\s\-()]/g, ""))) {
        await bot.sendMessage(chatId, "❌ Noto'g'ri telefon raqam. Qaytadan kiriting:\n(Masalan: +998901234567)")
        return
      }

      session.phone = text
      session.step = "address"
      userSessions.set(userId, session)

      await bot.sendMessage(chatId, "📍 Yetkazib berish manzilini kiriting:")
    } else if (session.step === "address") {
      if (text.length < 5) {
        await bot.sendMessage(chatId, "❌ Manzil juda qisqa. Qaytadan kiriting:")
        return
      }

      session.address = text
      await completeOrder(chatId, userId, session)
    }
  } catch (error) {
    console.error("Error handling order input:", error)
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
    userSessions.delete(userId)
  }
}

async function completeOrder(chatId, userId, session) {
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
    message += `📞 Telefon: ${session.phone}\n`
    message += `📍 Manzil: ${session.address}\n\n`
    message += `⏰ Sizga tez orada aloqaga chiqamiz!\n\n`
    message += `📋 Buyurtmangizni kuzatish uchun "Buyurtmalarim" tugmasini bosing.`

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }],
          [{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }],
        ],
      },
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })

    // Notify admins
    await notifyAdminsNewOrder(order.id)

    // Clear session
    userSessions.delete(userId)
  } catch (error) {
    console.error("Error completing order:", error)
    await bot.sendMessage(chatId, "❌ Buyurtmani yaratishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
    userSessions.delete(userId)
  }
}

async function showUserOrders(chatId, telegramId) {
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
      await bot.sendMessage(chatId, "📭 Sizda buyurtmalar yo'q.", {
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
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
      },
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
  } catch (error) {
    console.error("Error showing user orders:", error)
    await bot.sendMessage(chatId, "❌ Buyurtmalarni olishda xatolik.")
  }
}

async function showAboutMarket(chatId) {
  const message = `🏪 *GlobalMarket haqida*\n\nGlobalMarket - G'uzor tumanidagi eng katta onlayn bozor!\n\n📚 *Bizda mavjud:*\n• Kitoblar va darsliklar\n• Maktab buyumlari\n• Ofis jihozlari\n• Va boshqa ko'plab mahsulotlar\n\n🌍 *Xizmat hududi:*\nG'uzor tumani, Qashqadaryo viloyati\n\n📱 *Websayt:* https://globalmarketshop.uz\n\n✅ *Bizning afzalliklarimiz:*\n• Tez yetkazib berish\n• Sifatli mahsulotlar\n• Qulay narxlar\n• Ishonchli sotuvchilar`

  const keyboard = {
    reply_markup: {
      inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
    },
  }

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
}

async function showContactInfo(chatId) {
  const message = `📞 *Aloqa ma'lumotlari*\n\n🏢 GlobalMarket\n📍 G'uzor tumani, Qashqadaryo viloyati\n\n📱 *Telefon:*\n+998 95 865 75 00\n\n🌐 *Websayt:*\nhttps://globalmarketshop.uz\n\n📧 *Email:*\ninfo@globalmarketshop.uz\n\n⏰ *Ish vaqti:*\nDushanba - Shanba: 9:00 - 18:00\nYakshanba: Dam olish kuni\n\n💬 Savollaringiz bo'lsa, bemalol murojaat qiling!`

  const keyboard = {
    reply_markup: {
      inline_keyboard: [[{ text: "🔙 Bosh menyu", callback_data: "back_to_main" }]],
    },
  }

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
}

// Admin functions
async function showPendingOrders(chatId) {
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
      await bot.sendMessage(chatId, "📭 Yangi buyurtmalar yo'q.")
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

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })

    // Har bir buyurtma uchun tugmalar
    for (const order of orders) {
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔄 Jarayonda", callback_data: `processing_${order.id}` },
              { text: "✅ Bajarildi", callback_data: `complete_${order.id}` },
            ],
            [{ text: "❌ Bekor qilish", callback_data: `cancel_${order.id}` }],
          ],
        },
      }

      await bot.sendMessage(chatId, `Buyurtma #${order.id.slice(-8)} uchun amal tanlang:`, keyboard)
    }
  } catch (error) {
    console.error("Buyurtmalarni ko'rsatishda xatolik:", error)
    await bot.sendMessage(chatId, "❌ Buyurtmalarni olishda xatolik.")
  }
}

// Buyurtma kuzatish
async function handleOrderTracking(chatId, anonId, orderId) {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (name, price)
      `)
      .eq("id", orderId)
      .eq("anon_temp_id", anonId)
      .single()

    if (error || !order) {
      await bot.sendMessage(chatId, "❌ Buyurtma topilmadi yoki noto'g'ri havola.")
      return
    }

    const statusEmoji = getStatusEmoji(order.status)
    const statusText = getStatusText(order.status)

    let message = `📋 *Buyurtma ma'lumotlari:*\n\n`
    message += `🆔 #${order.id.slice(-8)}\n`
    message += `📦 ${order.products.name}\n`
    message += `📊 Holat: ${statusEmoji} *${statusText}*\n`
    message += `💰 Summa: ${formatPrice(order.total_amount)}\n`
    message += `📅 Buyurtma sanasi: ${formatDate(order.created_at)}`

    if (order.delivery_date) {
      message += `\n🚚 Yetkazib berish: ${formatDate(order.delivery_date)}`
    }

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Holatni yangilash", callback_data: `refresh_${orderId}` }],
          [{ text: "📞 Qo'ng'iroq qilish", url: "tel:+998958657500" }],
        ],
      },
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard })
  } catch (error) {
    console.error("Buyurtma kuzatishda xatolik:", error)
    await bot.sendMessage(chatId, "❌ Buyurtma ma'lumotlarini olishda xatolik.")
  }
}

// Buyurtma holatini yangilash
async function handleOrderRefresh(chatId, orderId) {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (name, price)
      `)
      .eq("id", orderId)
      .single()

    if (error || !order) {
      await bot.sendMessage(chatId, "❌ Buyurtma topilmadi.")
      return
    }

    const statusEmoji = getStatusEmoji(order.status)
    const statusText = getStatusText(order.status)

    let message = `🔄 *Yangilangan holat:*\n\n`
    message += `🆔 #${order.id.slice(-8)}\n`
    message += `📦 ${order.products.name}\n`
    message += `📊 Holat: ${statusEmoji} *${statusText}*\n`
    message += `💰 Summa: ${formatPrice(order.total_amount)}\n`
    message += `📅 Oxirgi yangilanish: ${formatDate(order.updated_at || order.created_at)}`

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
  } catch (error) {
    console.error("Buyurtma holatini yangilashda xatolik:", error)
    await bot.sendMessage(chatId, "❌ Buyurtma ma'lumotlarini yangilashda xatolik.")
  }
}

// Buyurtma holatini o'zgartirish
async function updateOrderStatus(orderId, status) {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) throw error

    console.log(`✅ Buyurtma ${orderId} holati ${status} ga o'zgartirildi`)

    // Mijozga xabar berish
    await notifyCustomerStatusChange(orderId, status)
  } catch (error) {
    console.error("Buyurtma holatini o'zgartirishda xatolik:", error)
  }
}

// Mijozga holat o'zgarishi haqida xabar berish
async function notifyCustomerStatusChange(orderId, status) {
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

    // Agar mijozning Telegram ID si bo'lsa, xabar yuborish
    if (order.users && order.users.telegram_id) {
      await bot.sendMessage(order.users.telegram_id, message, { parse_mode: "Markdown" })
      console.log(`📤 Mijozga xabar yuborildi: ${order.users.telegram_id}`)
    } else if (order.anon_temp_id && order.anon_temp_id.startsWith("tg_")) {
      // Anonymous Telegram order
      const telegramId = order.anon_temp_id.split("_")[1]
      await bot.sendMessage(telegramId, message, { parse_mode: "Markdown" })
      console.log(`📤 Anonim mijozga xabar yuborildi: ${telegramId}`)
    }
  } catch (error) {
    console.error("Mijozga xabar berishda xatolik:", error)
  }
}

// Adminlarga yangi buyurtma haqida xabar berish
async function notifyAdminsNewOrder(orderId) {
  try {
    console.log(`📢 Adminlarga yangi buyurtma haqida xabar: ${orderId}`)

    // Buyurtma ma'lumotlarini olish
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
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔄 Jarayonda", callback_data: `processing_${order.id}` },
            { text: "✅ Bajarildi", callback_data: `complete_${order.id}` },
          ],
          [{ text: "❌ Bekor qilish", callback_data: `cancel_${order.id}` }],
        ],
      },
    }

    // Yagona admin uchun xabar yuborish
    try {
      await bot.sendMessage(SPECIFIC_ADMIN_TELEGRAM_ID, message, { parse_mode: "Markdown", ...keyboard })
      console.log(`✅ Admin ${SPECIFIC_ADMIN_TELEGRAM_ID} ga xabar yuborildi`)
    } catch (error) {
      console.error(`❌ Admin ${SPECIFIC_ADMIN_TELEGRAM_ID} ga xabar yuborishda xatolik:`, error)
    }
  } catch (error) {
    console.error("Adminlarga xabar berishda xatolik:", error)
  }
}

// UTILITY FUNCTIONS

function formatPrice(price) {
  return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusEmoji(status) {
  const emojis = {
    pending: "⏳",
    processing: "🔄",
    completed: "✅",
    cancelled: "❌",
  }
  return emojis[status] || "❓"
}

function getStatusText(status) {
  const texts = {
    pending: "Kutilmoqda",
    processing: "Tayyorlanmoqda",
    completed: "Bajarilgan",
    cancelled: "Bekor qilingan",
  }
  return texts[status] || "Noma'lum"
}

// ERROR HANDLING
bot.on("error", (error) => {
  console.error("❌ Bot xatoligi:", error)
})

bot.on("polling_error", (error) => {
  console.error("❌ Polling xatoligi:", error)
})

// Export function for webhook usage
module.exports = { notifyAdminsNewOrder }
