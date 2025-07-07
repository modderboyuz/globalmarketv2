import { type NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhook_url, action } = body

    if (!webhook_url && action !== "delete") {
      return NextResponse.json({ error: "webhook_url is required" }, { status: 400 })
    }

    let response
    if (action === "delete") {
      response = await fetch(`${BOT_API_URL}/deleteWebhook`, {
        method: "POST",
      })
    } else {
      response = await fetch(`${BOT_API_URL}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhook_url,
          allowed_updates: ["message", "callback_query", "inline_query"],
          drop_pending_updates: true,
        }),
      })
    }

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: "Failed to set webhook", details: errorData }, { status: 500 })
    }

    const result = await response.json()

    return NextResponse.json({
      success: result.ok,
      message: result.description,
      webhook_url: action === "delete" ? null : webhook_url,
    })
  } catch (error) {
    console.error("Webhook setup error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const response = await fetch(`${BOT_API_URL}/getWebhookInfo`)
    const result = await response.json()

    return NextResponse.json({
      success: true,
      webhook_info: result.result,
    })
  } catch (error) {
    console.error("Get webhook info error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
