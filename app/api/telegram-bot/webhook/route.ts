import { type NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({
        success: false,
        error: "URL majburiy",
      })
    }

    const response = await fetch(`${BOT_API_URL}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        allowed_updates: ["message", "callback_query"],
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: "Webhook o'rnatildi",
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.description || "Webhook o'rnatishda xatolik",
      })
    }
  } catch (error) {
    console.error("Webhook setup error:", error)
    return NextResponse.json({
      success: false,
      error: "Server xatoligi",
    })
  }
}
