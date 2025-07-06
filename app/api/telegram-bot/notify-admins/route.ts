import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const TELEGRAM_BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, message, data } = body

    // Get all admin users with telegram_id
    const { data: admins, error } = await supabase
      .from("users")
      .select("telegram_id, username, full_name")
      .eq("is_admin", true)
      .not("telegram_id", "is", null)

    if (error) {
      console.error("Error fetching admins:", error)
      return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 })
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({ message: "No admins with Telegram found" })
    }

    const results = []

    // Send message to each admin
    for (const admin of admins) {
      try {
        const telegramMessage = `🔔 *${title}*\n\n${message}\n\n📅 ${new Date().toLocaleString("uz-UZ")}`

        const response = await fetch(`${BOT_API_URL}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: admin.telegram_id,
            text: telegramMessage,
            parse_mode: "Markdown",
          }),
        })

        if (response.ok) {
          results.push({
            admin_id: admin.telegram_id,
            username: admin.username,
            status: "sent",
          })
          console.log(`✅ Notification sent to admin @${admin.username}`)
        } else {
          const errorData = await response.json()
          results.push({
            admin_id: admin.telegram_id,
            username: admin.username,
            status: "failed",
            error: errorData,
          })
          console.error(`❌ Failed to send to admin @${admin.username}:`, errorData)
        }
      } catch (error) {
        results.push({
          admin_id: admin.telegram_id,
          username: admin.username,
          status: "error",
          error: error.message,
        })
        console.error(`❌ Error sending to admin @${admin.username}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notifications processed",
      results,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
