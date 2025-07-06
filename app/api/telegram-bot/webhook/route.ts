import { type NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, url } = body

    if (action === "set") {
      if (!url) {
        return NextResponse.json({ error: "URL is required for setting webhook" }, { status: 400 })
      }

      const response = await fetch(`${BOT_API_URL}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          allowed_updates: ["message", "callback_query", "inline_query"],
          drop_pending_updates: true,
        }),
      })

      const result = await response.json()

      if (response.ok && result.ok) {
        return NextResponse.json({
          success: true,
          message: "Webhook set successfully",
          webhook_url: url,
          data: result,
        })
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to set webhook",
            error: result.description || "Unknown error",
            data: result,
          },
          { status: 500 },
        )
      }
    } else if (action === "delete") {
      const response = await fetch(`${BOT_API_URL}/deleteWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          drop_pending_updates: true,
        }),
      })

      const result = await response.json()

      if (response.ok && result.ok) {
        return NextResponse.json({
          success: true,
          message: "Webhook deleted successfully",
          data: result,
        })
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to delete webhook",
            error: result.description || "Unknown error",
            data: result,
          },
          { status: 500 },
        )
      }
    } else if (action === "info") {
      const response = await fetch(`${BOT_API_URL}/getWebhookInfo`)
      const result = await response.json()

      return NextResponse.json({
        success: true,
        data: result.result,
      })
    }

    return NextResponse.json({ error: "Invalid action. Use 'set', 'delete', or 'info'" }, { status: 400 })
  } catch (error) {
    console.error("Webhook management error:", error)
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
      bot_username: "@globalmarketshopbot",
      available_actions: ["set", "delete", "info"],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting webhook info:", error)
    return NextResponse.json({ error: "Failed to get webhook info" }, { status: 500 })
  }
}
