import { type NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function GET() {
  try {
    // Get bot info
    const botInfoResponse = await fetch(`${BOT_API_URL}/getMe`)
    const botInfo = await botInfoResponse.json()

    // Get webhook info
    const webhookInfoResponse = await fetch(`${BOT_API_URL}/getWebhookInfo`)
    const webhookInfo = await webhookInfoResponse.json()

    return NextResponse.json({
      success: true,
      bot: botInfo.result,
      webhook: webhookInfo.result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting bot info:", error)
    return NextResponse.json({ error: "Failed to get bot info" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, webhook_url } = body

    if (action === "set_webhook" && webhook_url) {
      const response = await fetch(`${BOT_API_URL}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhook_url,
          allowed_updates: ["message", "callback_query"],
        }),
      })

      const result = await response.json()

      return NextResponse.json({
        success: result.ok,
        message: result.description,
        result: result.result,
      })
    } else if (action === "delete_webhook") {
      const response = await fetch(`${BOT_API_URL}/deleteWebhook`, {
        method: "POST",
      })

      const result = await response.json()

      return NextResponse.json({
        success: result.ok,
        message: result.description,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error managing webhook:", error)
    return NextResponse.json({ error: "Failed to manage webhook" }, { status: 500 })
  }
}
