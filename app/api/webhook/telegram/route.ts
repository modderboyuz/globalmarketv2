import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // Bu import joyi sizning loyiha tuzilishingizga bog'liq

// Agar sizning supabase import yo'lingiz boshqa bo'lsa, shu qismni o'zgartiring
// Misol: import { createClient } from '@supabase/supabase-js'; const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA";
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Agar siz faqat bitta admin bo'lsa, uning Telegram ID sini shu yerga yozing.
// Baza orqali tekshirish o'rniga to'g'ridan-to'g'ri shu ID ga ruxsat beriladi.
const SPECIFIC_ADMIN_TELEGRAM_ID = 6295092422;

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    console.log("📨 Telegram webhook received:", JSON.stringify(update, null, 2));

    // Handle different types of updates
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.type) {
      // Handle internal notifications
      await handleInternalNotification(update);
    }

    return NextResponse.json({ ok: true, processed: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    // Xatolik holatida ham success javob qaytarish, agar bot faoliyatiga ta'sir qilmasa
    // Agar xatolikni aniqlash muhim bo'lsa, 500 status kodini qaytaring
    return NextResponse.json({ error: "Webhook error", details: error }, { status: 500 });
  }
}

export async function GET() {
  // Agar NEXT_PUBLIC_SITE_URL muhit o'zgaruvchisi bo'lmasa, default URL ni ishlatadi.
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com"}/api/webhook/telegram`;

  return NextResponse.json({
    message: "Telegram webhook endpoint",
    bot_token: TELEGRAM_BOT_TOKEN.slice(0, 10) + "...", // Tokenning faqat boshini ko'rsatadi
    status: "active",
    webhook_url: webhookUrl,
    timestamp: new Date().toISOString(),
  });
}

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from.id;

  console.log(`📝 Processing message from ${userId}: ${text}`);

  // Endi adminlikni tekshirish faqat SPECIFIC_ADMIN_TELEGRAM_ID ga bog'liq.
  const isAdmin = await checkAdminStatus(userId);

  if (!isAdmin) {
    await sendTelegramMessage(
      chatId,
      "❌ Bu bot faqat adminlar uchun mo'ljallangan.\n\n📱 Buyurtma berish uchun: https://globalmarketshop.uz",
    );
    return;
  }

  if (text?.startsWith("/start")) {
    await sendWelcomeMessage(chatId, message.from.first_name);
  } else if (text === "/orders") {
    await showPendingOrders(chatId);
  } else if (text === "/messages") {
    await showContactMessages(chatId);
  } else if (text === "/sellers") {
    await showSellerApplications(chatId);
  } else if (text === "/stats") {
    await showStats(chatId);
  } else if (text === "/help") {
    await sendHelpMessage(chatId);
  } else {
    // Noma'lum buyruq uchun javob
    await sendTelegramMessage(
      chatId,
      "❓ Noma'lum buyruq. Yordam uchun /help yuboring.\n\n📋 Mavjud buyruqlar:\n/orders - Buyurtmalar\n/messages - Xabarlar\n/sellers - Sotuvchi arizalari\n/stats - Statistika",
    );
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  console.log(`🔘 Callback query from ${userId}: ${data}`);

  // Adminlikni faqat SPECIFIC_ADMIN_TELEGRAM_ID ga tekshiramiz.
  const isAdmin = await checkAdminStatus(userId);

  if (!isAdmin) {
    await answerCallbackQuery(callbackQuery.id, "Sizda admin huquqlari yo'q!");
    return;
  }

  if (data.startsWith("order_")) {
    const [action, orderId] = data.split("_").slice(1); // Masalan: "order_accept_123" -> ["accept", "123"]
    await handleOrderAction(chatId, callbackQuery.id, orderId, action, callbackQuery.message.message_id);
  } else if (data.startsWith("message_")) {
    const [action, messageId] = data.split("_").slice(1);
    await handleMessageAction(chatId, callbackQuery.id, messageId, action);
  } else if (data.startsWith("seller_")) {
    const [action, applicationId] = data.split("_").slice(1);
    await handleSellerAction(chatId, callbackQuery.id, applicationId, action);
  } else if (data === "show_orders") {
    await answerCallbackQuery(callbackQuery.id, "Buyurtmalar yuklanmoqda...");
    await showPendingOrders(chatId);
  } else if (data === "show_messages") {
    await answerCallbackQuery(callbackQuery.id, "Xabarlar yuklanmoqda...");
    await showContactMessages(chatId);
  } else if (data === "show_sellers") {
    await answerCallbackQuery(callbackQuery.id, "Sotuvchi arizalari yuklanmoqda...");
    await showSellerApplications(chatId);
  }
  // Agar "show_stats" kabi boshqa tugmalar bo'lsa, ularni ham shu yerga qo'shing.
  // else if (data === "show_stats") {
  //   await answerCallbackQuery(callbackQuery.id, "Statistika yuklanmoqda...");
  //   await showStats(chatId);
  // }
}

async function handleInternalNotification(notification: any) {
  // Bu qism sizning ichki tizimdan kelayotgan bildirishnomalarni qayta ishlash uchun.
  // Agar bular hammasi bo'lsa, ularni ham o'zingizning `notifyAdmins...` funksiyalaringiz bilan bog'lab qo'ying.
  if (notification.type === "new_order") {
    // Agar sizning "new_order" turi uchun Adminlarga xabar yuboruvchi funksiyangiz bo'lsa, uni chaqiring.
    // Misol: await notifyAdminsNewOrder(notification.order_id);
  } else if (notification.type === "contact_message") {
    // await notifyAdminsContactMessage(notification.message_id);
  } else if (notification.type === "seller_application") {
    // await notifyAdminsSellerApplication(notification.application_id);
  }
}

async function checkAdminStatus(telegramId: number): Promise<boolean> {
  try {
    // Endi adminlikni tekshirish faqat SPECIFIC_ADMIN_TELEGRAM_ID ga bog'liq.
    // Baza tekshiruvi o'chirildi.
    return telegramId === SPECIFIC_ADMIN_TELEGRAM_ID;

    // Agar bazadan tekshirishni saqlab qolmoqchi bo'lsangiz, quyidagi qismni ishlatishingiz mumkin:
    /*
    const { data, error } = await supabase
      .from("users")
      .select("is_admin, is_admin_full") // Agar is_admin_full bo'lsa ham admin deb hisoblasin
      .eq("telegram_id", telegramId)
      .single();

    if (error || !data) {
      return false; // Foydalanuvchi topilmadi yoki xatolik
    }
    return data.is_admin || data.is_admin_full || false; // is_admin yoki is_admin_full true bo'lsa, admin hisoblanadi
    */
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false; // Xatolik yuz berganda admin emas deb hisoblaymiz
  }
}

async function sendWelcomeMessage(chatId: number, firstName: string) {
  const name = firstName || "Admin"; // Agar ism bo'lmasa, "Admin" deb yozadi

  const message = `👋 Salom ${name}! GlobalMarket Admin paneliga xush kelibsiz!\n\n📊 *Mavjud buyruqlar:*\n\n📋 /orders - Yangi buyurtmalar\n💬 /messages - Mijoz xabarlari\n👥 /sellers - Sotuvchi arizalari\n📈 /stats - Statistika\n❓ /help - Yordam\n\n🌍 *Xizmat hududi:* G'uzor tumani, Qashqadaryo viloyati`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📋 Buyurtmalar", callback_data: "show_orders" },
        { text: "💬 Xabarlar", callback_data: "show_messages" },
      ],
      [
        { text: "👥 Sotuvchilar", callback_data: "show_sellers" },
        { text: "📈 Statistika", callback_data: "show_stats" }, // Agar show_stats uchun handler bo'lsa
      ],
    ],
  };

  await sendTelegramMessage(chatId, message, keyboard, "Markdown");
}

async function sendHelpMessage(chatId: number) {
  const message = `❓ *GlobalMarket Admin Bot Yordam*\n\n*Asosiy buyruqlar:*\n/orders - Yangi buyurtmalarni ko'rish\n/messages - Mijoz xabarlarini ko'rish\n/sellers - Sotuvchi arizalarini ko'rish\n/stats - Statistikani ko'rish\n/help - Bu yordam xabarini ko'rsatish\n\n*Buyurtma boshqaruvi:*\n• ✅ Qabul qilish - Buyurtmani tasdiqlash\n• 🔄 Jarayonda - Buyurtma tayyorlanmoqda\n• ✅ Bajarildi - Buyurtma yetkazildi\n• ❌ Bekor qilish - Buyurtmani bekor qilish\n\n*Xizmat hududi:*\nG'uzor tumani, Qashqadaryo viloyati\n\n📱 *Websayt:* https://globalmarketshop.uz`;

  await sendTelegramMessage(chatId, message, null, "Markdown");
}

async function showPendingOrders(chatId: number) {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        products (
          name,
          author,
          brand,
          product_type
        )
      `
      )
      .eq("status", "pending") // Faqat "pending" holatdagi buyurtmalarni oladi
      .order("created_at", { ascending: false }) // Eng yangilaridan boshlab saralaydi
      .limit(10); // Maksimal 10 ta buyurtmani oladi

    if (error) throw error;

    if (!orders || orders.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi buyurtmalar yo'q.");
      return;
    }

    let message = "📋 *Yangi buyurtmalar:*\n\n";

    for (const order of orders) {
      message += `🆔 *#${order.id.slice(-8)}*\n`; // ID ning oxirgi 8 tasini ko'rsatadi
      message += `📦 ${order.products.name}\n`; // Mahsulot nomi
      if (order.products.author) message += `✍️ ${order.products.author}\n`; // Muallif (agar bo'lsa)
      if (order.products.brand) message += `🏷️ ${order.products.brand}\n`; // Brend (agar bo'lsa)
      message += `👤 ${order.full_name}\n`; // Xaridor ismi
      message += `📞 ${order.phone}\n`; // Xaridor telefoni
      message += `📍 ${order.address}\n`; // Yetkazib berish manzili
      message += `💰 ${formatPrice(order.total_amount)}\n`; // Summa
      message += `📅 ${formatDate(order.created_at)}\n`; // Yaratilgan vaqt
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    await sendTelegramMessage(chatId, message, null, "Markdown");

    // Buyurtmalar uchun amal tugmalarini yuborish
    for (const order of orders) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Qabul qilish", callback_data: `order_accept_${order.id}` }, // "accept" - jarayon boshlandi
            { text: "🔄 Jarayonda", callback_data: `order_processing_${order.id}` }, // "processing" - tayyorlanmoqda
          ],
          [
            { text: "✅ Bajarildi", callback_data: `order_complete_${order.id}` }, // "complete" - yakunlandi
            { text: "❌ Bekor qilish", callback_data: `order_cancel_${order.id}` }, // "cancel" - bekor qilindi
          ],
        ],
      };

      await sendTelegramMessage(chatId, `Buyurtma #${order.id.slice(-8)} uchun amal tanlang:`, keyboard);
    }
  } catch (error) {
    console.error("Error showing pending orders:", error);
    await sendTelegramMessage(chatId, "❌ Buyurtmalarni olishda xatolik yuz berdi.");
  }
}

async function showContactMessages(chatId: number) {
  try {
    const { data: messages, error } = await supabase
      .from("contact_messages")
      .select("*")
      .eq("status", "new") // Faqat yangi xabarlarni ko'rsatadi
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!messages || messages.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi xabarlar yo'q.");
      return;
    }

    let message = "💬 *Yangi xabarlar:*\n\n";

    for (const msg of messages) {
      message += `🆔 *#${msg.id.slice(-8)}*\n`;
      message += `👤 ${msg.full_name}\n`;
      message += `📞 ${msg.phone}\n`;
      message += `📧 ${msg.email || "Ko'rsatilmagan"}\n`; // Agar email bo'lmasa
      message += `🏷️ ${getMessageTypeText(msg.message_type)}\n`; // Xabar turini ko'rsatadi
      if (msg.subject) message += `📝 ${msg.subject}\n`; // Mavzu
      if (msg.book_request_title) message += `📚 "${msg.book_request_title}" - ${msg.book_request_author}\n`; // Kitob so'rash bo'yicha ma'lumot
      message += `💬 ${msg.message.substring(0, 100)}${msg.message.length > 100 ? "..." : ""}\n`; // Xabarning qisqartirilgan ko'rinishi
      message += `📅 ${formatDate(msg.created_at)}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    await sendTelegramMessage(chatId, message, null, "Markdown");

    // Xabarlar uchun amal tugmalarini yuborish
    for (const msg of messages) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Ko'rib chiqildi", callback_data: `message_reviewed_${msg.id}` }, // "reviewed" - ko'rib chiqildi
            { text: "📞 Qo'ng'iroq qilindi", callback_data: `message_called_${msg.id}` }, // "called" - qo'ng'iroq qilindi
          ],
          [{ text: "❌ Yopish", callback_data: `message_close_${msg.id}` }], // "close" - yopildi
        ],
      };

      await sendTelegramMessage(chatId, `Xabar #${msg.id.slice(-8)} uchun amal tanlang:`, keyboard);
    }
  } catch (error) {
    console.error("Error showing contact messages:", error);
    await sendTelegramMessage(chatId, "❌ Xabarlarni olishda xatolik yuz berdi.");
  }
}

async function showSellerApplications(chatId: number) {
  try {
    const { data: applications, error } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("status", "pending") // Faqat "pending" holatdagi arizalarni oladi
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!applications || applications.length === 0) {
      await sendTelegramMessage(chatId, "📭 Yangi sotuvchi arizalari yo'q.");
      return;
    }

    let message = "👥 *Yangi sotuvchi arizalari:*\n\n";

    for (const app of applications) {
      message += `🆔 *#${app.id.slice(-8)}*\n`;
      message += `👤 ${app.full_name}\n`;
      message += `🏢 ${app.company_name}\n`;
      message += `📞 ${app.phone}\n`;
      message += `📧 ${app.email}\n`;
      message += `🏷️ ${app.business_type || "Ko'rsatilmagan"}\n`;
      message += `📈 Tajriba: ${app.experience_years || 0} yil\n`;
      message += `📝 ${app.description?.substring(0, 100)}${app.description && app.description.length > 100 ? "..." : ""}\n`;
      message += `📅 ${formatDate(app.created_at)}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    await sendTelegramMessage(chatId, message, null, "Markdown");

    // Arizalar uchun amal tugmalarini yuborish
    for (const app of applications) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: `seller_approve_${app.id}` }, // "approve" - tasdiqlash
            { text: "❌ Rad etish", callback_data: `seller_reject_${app.id}` }, // "reject" - rad etish
          ],
          [{ text: "📞 Qo'ng'iroq qilish", url: `tel:${app.phone}` }], // Telefon raqamiga havola
        ],
      };

      await sendTelegramMessage(chatId, `Sotuvchi arizasi #${app.id.slice(-8)} uchun amal tanlang:`, keyboard);
    }
  } catch (error) {
    console.error("Error showing seller applications:", error);
    await sendTelegramMessage(chatId, "❌ Sotuvchi arizalarini olishda xatolik yuz berdi.");
  }
}

async function showStats(chatId: number) {
  try {
    // Turli statistik ma'lumotlarni olish
    // count: "exact" va head: true tezroq ma'lumot olishga yordam beradi
    const [ordersResult, productsResult, usersResult, messagesResult] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("contact_messages").select("*", { count: "exact", head: true }),
    ]);

    // Bugungi buyurtmalarni olish
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      // Bugun yaratilgan buyurtmalarni filtrlaydi (soat va minutlarni hisobga olmasdan)
      .gte("created_at", new Date().toISOString().split("T")[0]); // Bugungi kunning boshlanish vaqti

    // Kutilayotgan buyurtmalarni olish
    const { data: pendingOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const message = `📈 *GlobalMarket Statistika*\n\n` +
                    `📋 *Buyurtmalar:*\n` +
                    `• Jami: ${ordersResult.count || 0}\n` +
                    `• Bugun: ${todayOrders?.length || 0}\n` +
                    `• Kutilmoqda: ${pendingOrders?.length || 0}\n\n` +
                    `📦 *Mahsulotlar:*\n` +
                    `• Jami: ${productsResult.count || 0}\n\n` +
                    `👥 *Foydalanuvchilar:*\n` +
                    `• Jami: ${usersResult.count || 0}\n\n` +
                    `💬 *Xabarlar:*\n` +
                    `• Jami: ${messagesResult.count || 0}\n\n` +
                    `📅 *Oxirgi yangilanish:* ${formatDate(new Date().toISOString())}`; // Statistika so'nggi yangilangan vaqtni ko'rsatadi

    await sendTelegramMessage(chatId, message, null, "Markdown");
  } catch (error) {
    console.error("Error showing stats:", error);
    await sendTelegramMessage(chatId, "❌ Statistikani olishda xatolik yuz berdi.");
  }
}

async function handleOrderAction(
  chatId: number,
  callbackQueryId: string,
  orderId: string,
  action: string,
  messageId: number, // Yangilanishi kerak bo'lgan xabarning ID si
) {
  try {
    let status = "";
    let statusText = "";

    switch (action) {
      case "accept":
        status = "processing";
        statusText = "qabul qilindi";
        break;
      case "processing":
        status = "processing";
        statusText = "jarayonda";
        break;
      case "complete":
        status = "completed";
        statusText = "bajarildi";
        break;
      case "cancel":
        status = "cancelled";
        statusText = "bekor qilindi";
        break;
      default:
        await answerCallbackQuery(callbackQueryId, "Noma'lum amal!");
        return; // Agar amal tanilmasa, funksiyadan chiqib ketadi
    }

    // Buyurtma statusini yangilash
    const { error } = await supabase
      .from("orders")
      .update({
        status: status,
        updated_at: new Date().toISOString(), // Yangilangan vaqtni saqlaydi
      })
      .eq("id", orderId); // Qaysi buyurtmani yangilashni aniqlaydi

    if (error) throw error; // Agar Supabase'da xatolik bo'lsa, uni tashlaydi

    await answerCallbackQuery(callbackQueryId, `Buyurtma ${statusText}!`); // Tugmani bosgan foydalanuvchiga xabar beradi
    await editMessage(chatId, messageId, `✅ Buyurtma #${orderId.slice(-8)} ${statusText}`); // Asosiy xabarni yangilaydi

    console.log(`✅ Order ${orderId} status updated to ${status}`);
  } catch (error) {
    console.error("Error handling order action:", error);
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!");
  }
}

async function handleMessageAction(chatId: number, callbackQueryId: string, messageId: string, action: string) {
  try {
    let status = "";
    let statusText = "";

    switch (action) {
      case "reviewed":
        status = "in_progress";
        statusText = "ko'rib chiqildi";
        break;
      case "called":
        status = "resolved";
        statusText = "qo'ng'iroq qilindi";
        break;
      case "close":
        status = "closed";
        statusText = "yopildi";
        break;
      default:
        await answerCallbackQuery(callbackQueryId, "Noma'lum amal!");
        return;
    }

    const { error } = await supabase
      .from("contact_messages")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) throw error;

    await answerCallbackQuery(callbackQueryId, `Xabar ${statusText}!`);

    console.log(`✅ Message ${messageId} status updated to ${status}`);
  } catch (error) {
    console.error("Error handling message action:", error);
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!");
  }
}

async function handleSellerAction(chatId: number, callbackQueryId: string, applicationId: string, action: string) {
  try {
    let status = "";
    let statusText = "";

    switch (action) {
      case "approve":
        status = "approved";
        statusText = "tasdiqlandi";
        break;
      case "reject":
        status = "rejected";
        statusText = "rad etildi";
        break;
      default:
        await answerCallbackQuery(callbackQueryId, "Noma'lum amal!");
        return;
    }

    // Arizaning statusini yangilash
    const { error } = await supabase
      .from("seller_applications")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) throw error;

    // Agar tasdiqlansa, foydalanuvchini ham tasdiqlangan sotuvchi sifatida belgilash
    if (action === "approve") {
      // Arizadan foydalanuvchi ID sini olish
      const { data: application } = await supabase
        .from("seller_applications")
        .select("user_id")
        .eq("id", applicationId)
        .single();

      if (application?.user_id) {
        // users jadvalida is_verified_seller va verification_status ni yangilash
        await supabase
          .from("users")
          .update({
            is_verified_seller: true,
            verification_status: "approved",
          })
          .eq("id", application.user_id);
      }
    }

    await answerCallbackQuery(callbackQueryId, `Ariza ${statusText}!`);

    console.log(`✅ Seller application ${applicationId} status updated to ${status}`);
  } catch (error) {
    console.error("Error handling seller action:", error);
    await answerCallbackQuery(callbackQueryId, "Xatolik yuz berdi!");
  }
}

// Adminlarga bildirishnoma yuboruvchi funksiyalar
// Bu funksiyalar uchun sizning Supabase'da "users" jadvalida "telegram_id", "is_admin" va "is_admin_full"
// kabi maydonlar mavjud bo'lishi kerak. Agar bunday bo'lmasa,
// "notifyAdminsNewOrder" kabi funksiyalarni ham shaxsiy admin ID ga yo'naltirish kerak bo'ladi.

async function notifyAdminsNewOrder(orderId: string) {
  try {
    console.log(`📢 Notifying admins about new order: ${orderId}`);

    // Admin telegram ID larini Supabase'dan olish
    const { data: admins, error: adminError } = await supabase
      .from("users")
      // is_admin yoki is_admin_full true bo'lgan foydalanuvchilarni oladi
      .select("telegram_id")
      .or("is_admin.eq.true,is_admin_full.eq.true")
      // Telegram ID si null bo'lmagan foydalanuvchilarni oladi
      .not("telegram_id", "is", null);

    if (adminError || !admins || admins.length === 0) {
      console.log("No admins found or error fetching admins:", adminError);
      // Agar adminlar topilmasa, shu yerda to'xtaymiz
      return;
    }

    // Buyurtma tafsilotlarini olish
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        products (
          name,
          author,
          brand,
          product_type
        )
      `
      )
      .eq("id", orderId) // Berilgan orderId ga teng buyurtmani oladi
      .single(); // Faqat bitta natija oladi

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return;
    }

    // Adminlarga yuboriladigan xabar matni
    const message =
      `🔔 *Yangi buyurtma!*\n\n` +
      `🆔 #${order.id.slice(-8)}\n` + // Buyurtma ID si
      `📦 ${order.products.name}\n` + // Mahsulot nomi
      (order.products.author ? `✍️ ${order.products.author}\n` : "") + // Muallif
      (order.products.brand ? `🏷️ ${order.products.brand}\n` : "") + // Brend
      `👤 ${order.full_name}\n` + // Xaridor ismi
      `📞 ${order.phone}\n` + // Xaridor telefoni
      `📍 ${order.address}\n` + // Manzil
      `💰 ${formatPrice(order.total_amount)}\n` + // Summa
      `📅 ${formatDate(order.created_at)}`; // Yaratilgan vaqt

    // Buyurtma uchun tugmalar
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Qabul qilish", callback_data: `order_accept_${order.id}` },
          { text: "🔄 Jarayonda", callback_data: `order_processing_${order.id}` },
        ],
        [
          { text: "✅ Bajarildi", callback_data: `order_complete_${order.id}` },
          { text: "❌ Bekor qilish", callback_data: `order_cancel_${order.id}` },
        ],
      ],
    };

    // Barcha adminlarga xabar yuborish
    for (const admin of admins) {
      try {
        // Agar sizning bitta admin ID qoidangiz bo'lsa, bu for tsiklini o'chirib, faqat bir marta yuborishingiz mumkin
        await sendTelegramMessage(admin.telegram_id, message, keyboard, "Markdown");
        console.log(`✅ Notification sent to admin ${admin.telegram_id}`);
      } catch (error) {
        console.error(`❌ Error sending to admin ${admin.telegram_id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
}

async function notifyAdminsContactMessage(messageId: string) {
  try {
    // Admin telegram ID larini olish
    const { data: admins } = await supabase
      .from("users")
      .select("telegram_id")
      .or("is_admin.eq.true,is_admin_full.eq.true")
      .not("telegram_id", "is", null);

    if (!admins || admins.length === 0) return; // Agar adminlar bo'lmasa, chiqib ketadi

    // Xabar tafsilotlarini olish
    const { data: message } = await supabase.from("contact_messages").select("*").eq("id", messageId).single();

    if (!message) return; // Agar xabar topilmasa, chiqib ketadi

    // Bildirishnoma matni
    const notificationText =
      `💬 *Yangi xabar!*\n\n` +
      `🆔 #${message.id.slice(-8)}\n` +
      `👤 ${message.full_name}\n` +
      `📞 ${message.phone}\n` +
      `🏷️ ${getMessageTypeText(message.message_type)}\n` +
      (message.book_request_title ? `📚 "${message.book_request_title}" - ${message.book_request_author}\n` : "") +
      `💬 ${message.message.substring(0, 200)}${message.message.length > 200 ? "..." : ""}`; // Xabarning qisqartirilgan ko'rinishi

    // Adminlarga xabar yuborish
    for (const admin of admins) {
      try {
        await sendTelegramMessage(admin.telegram_id, notificationText, null, "Markdown");
      } catch (error) {
        console.error(`Error sending message notification to admin ${admin.telegram_id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error notifying admins about contact message:", error);
  }
}

async function notifyAdminsSellerApplication(applicationId: string) {
  try {
    // Admin telegram ID larini olish
    const { data: admins } = await supabase
      .from("users")
      .select("telegram_id")
      .or("is_admin.eq.true,is_admin_full.eq.true")
      .not("telegram_id", "is", null);

    if (!admins || admins.length === 0) return; // Adminlar topilmasa, chiqib ketadi

    // Ariza tafsilotlarini olish
    const { data: application } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (!application) return; // Ariza topilmasa, chiqib ketadi

    // Bildirishnoma matni
    const notificationText =
      `👥 *Yangi sotuvchi arizasi!*\n\n` +
      `🆔 #${application.id.slice(-8)}\n` +
      `👤 ${application.full_name}\n` +
      `🏢 ${application.company_name}\n` +
      `📞 ${application.phone}\n` +
      `📧 ${application.email}\n` +
      `📈 Tajriba: ${application.experience_years || 0} yil`;

    // Adminlarga xabar yuborish
    for (const admin of admins) {
      try {
        await sendTelegramMessage(admin.telegram_id, notificationText, null, "Markdown");
      } catch (error) {
        console.error(`Error sending seller notification to admin ${admin.telegram_id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error notifying admins about seller application:", error);
  }
}

// Telegram API ga bog'liq yordamchi funksiyalar

async function sendTelegramMessage(chatId: number, text: string, keyboard?: any, parseMode?: string) {
  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
    };

    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    if (keyboard) {
      // Inline klaviaturani JSON string formatiga o'tkazish
      payload.reply_markup = JSON.stringify(keyboard);
    }

    // Telegram API ga POST so'rov yuborish
    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Kontent turini ko'rsatish
      },
      body: JSON.stringify(payload), // Payloadni JSON formatida yuborish
    });

    if (!response.ok) {
      // Agar javob muvaffaqiyatli bo'lmasa, xatolikni tashlash
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json(); // Javobni JSON formatida olish
    console.log(`📤 Message sent to ${chatId}`);
    return result;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    // Agar xatolik yuz bersa, uni qayta tashlab yuborish mumkin yoki logga yozish
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
    });
  } catch (error) {
    console.error("Error answering callback query:", error);
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
        // Agar parse_mode kerak bo'lsa, uni ham shu yerga qo'shish mumkin
        // parse_mode: "Markdown"
      }),
    });
  } catch (error) {
    console.error("Error editing message:", error);
  }
}

// Utility functions (foydali funksiyalar)

// Narxni formatlash (masalan: 10 000 so'm)
function formatPrice(price: number): string {
  return new Intl.NumberFormat("uz-UZ").format(price) + " so'm";
}

// Sanani formatlash (masalan: 15-noyabr, 2023-yil 14:30)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Xabar turini matnga aylantirish
function getMessageTypeText(type: string): string {
  const types: { [key: string]: string } = {
    general: "Umumiy savol",
    book_request: "Kitob so'rash",
    complaint: "Shikoyat",
    suggestion: "Taklif",
    technical: "Texnik yordam",
  };
  // Agar berilgan tur ro'yxatda bo'lmasa, o'zini qaytaradi
  return types[type] || type;
}
