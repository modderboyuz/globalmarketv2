// Bot.js faylini web orqali ko'rish uchun
export async function GET() {
  const botCode = `
// GlobalMarket Telegram Bot
// Bu fayl to'g'ridan-to'g'ri ishlamaydi, chunki bu Node.js server fayli

const TelegramBot = require("node-telegram-bot-api")
const { createClient } = require("@supabase/supabase-js")

// Bot Token
const TELEGRAM_BOT_TOKEN = "8057847116:AAGD-kfGrw8R2ZjTOZqFkpMvNJ6pdHIDfIk"

// Supabase ma'lumotlari (o'zingiznikini kiriting)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Bot yaratish
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

console.log("🚀 GlobalMarket Telegram Bot ishga tushdi!")

// Bot buyruqlari va funksiyalar...
// To'liq kod uchun /bot-control sahifasiga o'ting

/*
FOYDALANISH:

1. Bot Control Panel: /bot-control
2. Admin Panel: /admin  
3. Webhook Setup: /webhook-setup
4. API Endpoint: /api/bot/start

Bot to'g'ridan-to'g'ri ishlatish uchun:
- Node.js server kerak
- npm install kerak
- Environment variables sozlash kerak
*/
`

  return new Response(botCode, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="bot.js"',
    },
  })
}
