import { type NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function POST(request: NextRequest) {
  try {
    const { chat_id, text, parse_mode = "HTML", reply_markup } = await request.json()

    if (!chat_id || !text) {
      return NextResponse.json({
        success: false,
        error: "Chat ID va text majburiy",
      })
    }

    const payload: any = {
      chat_id,
      text,
      parse_mode,
    }

    if (reply_markup) {
      payload.reply_markup = JSON.stringify(reply_markup)
    }

    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: "Xabar yuborildi",
        data: data.result,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.description || "Xabar yuborishda xatolik",
      })
    }
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({
      success: false,
      error: "Server xatoligi",
    })
  }
}
