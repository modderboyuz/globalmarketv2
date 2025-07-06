import { NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function GET() {
  try {
    // Get bot info
    const botResponse = await fetch(`${BOT_API_URL}/getMe`)
    const botData = await botResponse.json()

    // Get webhook info
    const webhookResponse = await fetch(`${BOT_API_URL}/getWebhookInfo`)
    const webhookData = await webhookResponse.json()

    if (botData.ok && webhookData.ok) {
      return NextResponse.json({
        success: true,
        bot: botData.result,
        webhook: webhookData.result,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Bot ma'lumotlarini olishda xatolik",
      })
    }
  } catch (error) {
    console.error("Bot info error:", error)
    return NextResponse.json({
      success: false,
      error: "Server xatoligi",
    })
  }
}
