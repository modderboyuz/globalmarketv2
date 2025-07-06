"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bot,
  Send,
  Settings,
  BarChart3,
  Webhook,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface BotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
}

interface WebhookInfo {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  last_error_date?: number
  last_error_message?: string
  max_connections: number
  allowed_updates: string[]
}

export default function BotControlPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null)
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null)
  const [testMessage, setTestMessage] = useState("")
  const [testChatId, setTestChatId] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [showToken, setShowToken] = useState(false)

  const BOT_TOKEN = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
  const BOT_USERNAME = "@globalmarketshopbot"
  const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_SITE_URL || "https://globalmarketshop.netlify.app"}/api/webhook/telegram`

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      // Check if user is admin
      const { data: userData } = await supabase.from("users").select("is_admin").eq("id", currentUser.id).single()

      if (!userData?.is_admin) {
        toast.error("Bu sahifaga kirish uchun admin huquqlari kerak")
        router.push("/")
        return
      }

      setUser(currentUser)
      await fetchBotInfo()
      setWebhookUrl(WEBHOOK_URL)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchBotInfo = async () => {
    try {
      const response = await fetch("/api/telegram-bot/info")
      const result = await response.json()

      if (result.success) {
        setBotInfo(result.bot_info)
        setWebhookInfo(result.webhook_info)
      }
    } catch (error) {
      console.error("Error fetching bot info:", error)
      toast.error("Bot ma'lumotlarini olishda xatolik")
    }
  }

  const setWebhook = async () => {
    try {
      const response = await fetch("/api/telegram-bot/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          url: webhookUrl,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Webhook muvaffaqiyatli o'rnatildi!")
        await fetchBotInfo()
      } else {
        toast.error(result.message || "Webhook o'rnatishda xatolik")
      }
    } catch (error) {
      console.error("Error setting webhook:", error)
      toast.error("Webhook o'rnatishda xatolik")
    }
  }

  const deleteWebhook = async () => {
    try {
      const response = await fetch("/api/telegram-bot/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Webhook o'chirildi!")
        await fetchBotInfo()
      } else {
        toast.error(result.message || "Webhook o'chirishda xatolik")
      }
    } catch (error) {
      console.error("Error deleting webhook:", error)
      toast.error("Webhook o'chirishda xatolik")
    }
  }

  const sendTestMessage = async () => {
    if (!testChatId || !testMessage) {
      toast.error("Chat ID va xabar matnini kiriting")
      return
    }

    try {
      const response = await fetch("/api/telegram-bot/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: testChatId,
          text: testMessage,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Xabar yuborildi!")
        setTestMessage("")
      } else {
        toast.error(result.error || "Xabar yuborishda xatolik")
      }
    } catch (error) {
      console.error("Error sending test message:", error)
      toast.error("Xabar yuborishda xatolik")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Nusxalandi!")
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text">Telegram Bot Boshqaruvi</h1>
                <p className="text-gray-600 text-lg">Bot sozlamalari va monitoring</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 glass-effect border-0">
              <TabsTrigger value="overview">Umumiy</TabsTrigger>
              <TabsTrigger value="webhook">Webhook</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
              <TabsTrigger value="stats">Statistika</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bot Info */}
                <Card className="card-beautiful">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Bot Ma'lumotlari
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {botInfo ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Bot nomi:</span>
                          <span className="font-medium">{botInfo.first_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Username:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">@{botInfo.username}</span>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`@${botInfo.username}`)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Bot ID:</span>
                          <span className="font-medium">{botInfo.id}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Guruh qo'shish:</span>
                          <Badge variant={botInfo.can_join_groups ? "default" : "secondary"}>
                            {botInfo.can_join_groups ? "Mumkin" : "Mumkin emas"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Inline so'rovlar:</span>
                          <Badge variant={botInfo.supports_inline_queries ? "default" : "secondary"}>
                            {botInfo.supports_inline_queries ? "Qo'llab-quvvatlaydi" : "Qo'llab-quvvatlamaydi"}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Bot ma'lumotlari yuklanmadi</p>
                        <Button onClick={fetchBotInfo} variant="outline" size="sm" className="mt-2 bg-transparent">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Yangilash
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bot Token */}
                <Card className="card-beautiful">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Bot Sozlamalari
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Bot Token</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type={showToken ? "text" : "password"}
                          value={BOT_TOKEN}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={() => setShowToken(!showToken)}>
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(BOT_TOKEN)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Bot Havolasi</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={`https://t.me/${botInfo?.username || "globalmarketshopbot"}`}
                          readOnly
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(`https://t.me/${botInfo?.username || "globalmarketshopbot"}`, "_blank")
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button onClick={fetchBotInfo} variant="outline" className="w-full bg-transparent">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Ma'lumotlarni yangilash
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Webhook Tab */}
            <TabsContent value="webhook">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Webhook Status */}
                <Card className="card-beautiful">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Webhook className="h-5 w-5" />
                      Webhook Holati
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {webhookInfo ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Holat:</span>
                          <Badge variant={webhookInfo.url ? "default" : "secondary"}>
                            {webhookInfo.url ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Faol
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Faol emas
                              </>
                            )}
                          </Badge>
                        </div>

                        {webhookInfo.url && (
                          <div>
                            <span className="text-gray-600 text-sm">URL:</span>
                            <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
                              {webhookInfo.url}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Kutilayotgan yangilanishlar:</span>
                          <span className="font-medium">{webhookInfo.pending_update_count}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Maksimal ulanishlar:</span>
                          <span className="font-medium">{webhookInfo.max_connections}</span>
                        </div>

                        {webhookInfo.last_error_message && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-sm font-medium text-red-800 mb-1">Oxirgi xatolik:</div>
                            <div className="text-sm text-red-700">{webhookInfo.last_error_message}</div>
                            {webhookInfo.last_error_date && (
                              <div className="text-xs text-red-600 mt-1">
                                {new Date(webhookInfo.last_error_date * 1000).toLocaleString("uz-UZ")}
                              </div>
                            )}
                          </div>
                        )}

                        {webhookInfo.allowed_updates && webhookInfo.allowed_updates.length > 0 && (
                          <div>
                            <span className="text-gray-600 text-sm">Ruxsat etilgan yangilanishlar:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {webhookInfo.allowed_updates.map((update) => (
                                <Badge key={update} variant="outline" className="text-xs">
                                  {update}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Webhook ma'lumotlari yuklanmadi</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Webhook Management */}
                <Card className="card-beautiful">
                  <CardHeader>
                    <CardTitle>Webhook Boshqaruvi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-domain.com/api/webhook/telegram"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Telegram webhook uchun URL manzil</p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={setWebhook} className="flex-1 btn-primary">
                        <Webhook className="h-4 w-4 mr-2" />
                        Webhook o'rnatish
                      </Button>
                      <Button onClick={deleteWebhook} variant="destructive" className="flex-1">
                        <XCircle className="h-4 w-4 mr-2" />
                        Webhook o'chirish
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-sm text-gray-600 space-y-2">
                        <p>
                          <strong>Eslatma:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Webhook HTTPS protokolini talab qiladi</li>
                          <li>SSL sertifikat haqiqiy bo'lishi kerak</li>
                          <li>Server 443, 80, 88, 8443 portlarida ishlashi kerak</li>
                          <li>Javob vaqti 60 soniyadan oshmasligi kerak</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Test Tab */}
            <TabsContent value="test">
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Bot Testi
                  </CardTitle>
                  <p className="text-gray-600">Bot orqali test xabar yuborish va funksiyalarni tekshirish</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="test-chat-id">Chat ID</Label>
                      <Input
                        id="test-chat-id"
                        value={testChatId}
                        onChange={(e) => setTestChatId(e.target.value)}
                        placeholder="123456789"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Xabar yuborish uchun chat ID</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="test-message">Test Xabar</Label>
                    <Textarea
                      id="test-message"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Salom! Bu test xabari."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  <Button onClick={sendTestMessage} className="btn-primary">
                    <Send className="h-4 w-4 mr-2" />
                    Test Xabar Yuborish
                  </Button>

                  <div className="pt-6 border-t">
                    <h3 className="font-semibold mb-3">Tezkor Havolalar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(`https://t.me/${botInfo?.username || "globalmarketshopbot"}`, "_blank")
                        }
                        className="justify-start"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Botni ochish
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open("https://core.telegram.org/bots/api", "_blank")}
                        className="justify-start"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Bot API hujjatlari
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats">
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Bot Statistikasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Statistika</h3>
                    <p className="text-gray-600">Bot statistikasi va analytics tizimi hozircha ishlab chiqilmoqda</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
