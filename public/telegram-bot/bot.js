const TelegramBot = require("node-telegram-bot-api")
const { createClient } = require("@supabase/supabase-js")

// Environment variables (o'zingizning ma'lumotlaringizni kiriting)
const TELEGRAM_BOT_TOKEN = "8057847116:AAGD-kfGrw8R2ZjTOZqFkpMvNJ6pdHIDfIk"
const SUPABASE_URL = "https://tdfphvmmwfqhnzfggpln.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZnBodm1td2ZxaG56ZmdncGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzcwNjYsImV4cCI6MjA2NzMxMzA2Nn0.0H8_6f07k0vmjOVnqqXgqBYwIEu50Qqs_tExPv1k7DQ"

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Bot yaratish (polling mode)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

console.log("🚀 GlobalMarket Telegram Bot ishga tushdi!")
console.log("🔗 Bot username: @globalmarketshopbot")

// /start buyrug'i
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const startParam = match[1].trim()

  console.log(`📝 /start buyrug'i: ${userId} - ${startParam}`)

  // Foydalanuvchi ma'lumotlarini yangilash
  await updateUserTelegramId(userId, msg.from)

  if (startParam.startsWith(" order_")) {
    // Buyurtma kuzatish: /start order_anonId_orderId
    const parts = startParam.replace(" order_", "").split("_")
    if (parts.length >= 2) {
      const anonId = parts[0]
      const orderId = parts[1]
      console.log(`🔍 Buyurtma kuzatish: ${anonId} - ${orderId}`)
      await handleOrderTracking(chatId, anonId, orderId)
    }
  } else {
    // Admin tekshirish
    const isAdmin = await checkAdminStatus(userId)
    console.log(`👤 Foydalanuvchi ${userId} admin: ${isAdmin}`)
    await sendWelcomeMessage(chatId, isAdmin, msg.from.first_name)
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

// Inline keyboard tugmalari
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from.id
  const data = callbackQuery.data

  console.log(`🔘 Callback query: ${userId} - ${data}`)

  const isAdmin = await checkAdminStatus(userId)

  if (!isAdmin && !data.startsWith("refresh_") && !data.startsWith("my_orders")) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Sizda admin huquqlari yo'q!" })
    return
  }

  if (data.startsWith("complete_")) {
    const orderId = data.replace("complete_", "")
    await updateOrderStatus(orderId, "completed")
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtma bajarilgan!" })
    await bot.editMessageText(`✅ Buyurtma #${orderId.slice(-8)} bajarildi`, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
    })
  } else if (data.startsWith("processing_")) {
    const orderId = data.replace("processing_", "")
    await updateOrderStatus(orderId, "processing")
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtma jarayonda!" })
    await bot.editMessageText(`🔄 Buyurtma #${orderId.slice(-8)} jarayonda`, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
    })
  } else if (data.startsWith("cancel_")) {
    const orderId = data.replace("cancel_", "")
    await updateOrderStatus(orderId, "cancelled")
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtma bekor qilindi!" })
    await bot.editMessageText(`❌ Buyurtma #${orderId.slice(-8)} bekor qilindi`, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
    })
  } else if (data === "show_orders") {
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtmalar yuklanmoqda..." })
    await showPendingOrders(chatId)
  } else if (data === "my_orders") {
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtmalaringiz yuklanmoqda..." })
    await showUserOrders(chatId, userId)
  } else if (data.startsWith("refresh_")) {
    const orderId = data.replace("refresh_", "")
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Holat yangilanmoqda..." })
    await handleOrderRefresh(chatId, orderId)
  }
})

// FUNCTIONS

// Foydalanuvchi Telegram ID sini yangilash
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

// Admin holatini tekshirish
async function checkAdminStatus(telegramId) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("is_admin")
      .eq("telegram_id", telegramId)
      .eq("is_admin", true)
      .single()

    return !error && data
  } catch (error) {
    return false
  }
}

// Xush kelibsiz xabari
async function sendWelcomeMessage(chatId, isAdmin, firstName) {
  const name = firstName || "Foydalanuvchi"

  if (isAdmin) {
    const message = `👋 Salom ${name}! Admin paneliga xush kelibsiz!\n\n📋 Buyurtmalar: /orders\n❓ Yordam: /help`

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Yangi buyurtmalar", callback_data: "show_orders" }],
          [{ text: "📊 Statistika", callback_data: "show_stats" }],
        ],
      },
    }

    await bot.sendMessage(chatId, message, keyboard)
  } else {
    const message = `👋 Salom ${name}! GlobalMarket botiga xush kelibsiz!\n\n📚 Buyurtmalaringizni kuzatish uchun maxsus havoladan foydalaning.\n📱 Buyurtma berish: globalmarketshop.uz\n\n📋 Buyurtmalarim: /myorders\n❓ Yordam: /help`

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 Websaytga o'tish", url: "https://globalmarketshop.uz" }],
          [{ text: "📋 Buyurtmalarim", callback_data: "my_orders" }],
        ],
      },
    }

    await bot.sendMessage(chatId, message, keyboard)
  }
}

// Yordam xabari
async function sendHelpMessage(chatId) {
  const message = `❓ *Yordam*

*Mavjud buyruqlar:*
/start - Botni boshlash
/myorders - Buyurtmalarim
/help - Yordam

*Admin buyruqlari:*
/orders - Barcha buyurtmalar

*Buyurtma kuzatish:*
Websaytdan buyurtma bergandan so'ng sizga maxsus havola yuboriladi.`

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
}

// Kutilayotgan buyurtmalarni ko'rsatish
async function showPendingOrders(chatId) {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        books (
          title,
          author
        )
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
      message += `📚 ${order.books.title}\n`
      message += `✍️ ${order.books.author}\n`
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

// Foydalanuvchi buyurtmalarini ko'rsatish
async function showUserOrders(chatId, telegramId) {
  try {
    const { data: user } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single()

    if (!user) {
      await bot.sendMessage(chatId, "❌ Foydalanuvchi topilmadi. Avval websaytdan ro'yxatdan o'ting.")
      return
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        books (
          title,
          author
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!orders || orders.length === 0) {
      await bot.sendMessage(chatId, "📭 Sizda buyurtmalar yo'q.")
      return
    }

    let message = "📋 *Sizning buyurtmalaringiz:*\n\n"

    for (const order of orders) {
      const statusEmoji = getStatusEmoji(order.status)
      message += `${statusEmoji} *#${order.id.slice(-8)}*\n`
      message += `📚 ${order.books.title}\n`
      message += `💰 ${formatPrice(order.total_amount)}\n`
      message += `📊 ${getStatusText(order.status)}\n`
      message += `📅 ${formatDate(order.created_at)}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
  } catch (error) {
    console.error("Foydalanuvchi buyurtmalarini ko'rsatishda xatolik:", error)
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
        books (
          title,
          author
        )
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
    message += `📚 ${order.books.title}\n`
    message += `✍️ ${order.books.author}\n`
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
          [{ text: "📞 Qo'ng'iroq qilish", url: "tel:+998901234567" }],
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
        books (
          title,
          author
        )
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
    message += `📚 ${order.books.title}\n`
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
        books (title),
        users (telegram_id)
      `)
      .eq("id", orderId)
      .single()

    if (error || !order) return

    const statusText = getStatusText(status)
    const statusEmoji = getStatusEmoji(status)

    let message = `${statusEmoji} *Buyurtma holati o'zgardi!*\n\n`
    message += `🆔 #${order.id.slice(-8)}\n`
    message += `📚 ${order.books.title}\n`
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
    }
  } catch (error) {
    console.error("Mijozga xabar berishda xatolik:", error)
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
module.exports = { bot }
