"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, Copy, ExternalLink, Globe, Key, RefreshCw, Settings, Webhook } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function WebhookSetup() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [botToken, setBotToken] = useState("")
  const [webhookStatus, setWebhookStatus] = useState<"unknown" | "active" | "inactive">("unknown")
  const [testingWebhook, setTestingWebhook] = useState(false)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_admin) {
        toast.error("Sizda admin huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
      loadWebhookSettings()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const loadWebhookSettings = () => {
    // Load from environment or localStorage
    const savedWebhookUrl = localStorage.getItem("telegram_webhook_url") || ""
    const savedBotToken = localStorage.getItem("telegram_bot_token") || ""

    setWebhookUrl(savedWebhookUrl)
    setBotToken(savedBotToken)
  }

  const saveWebhookSettings = () => {
    localStorage.setItem("telegram_webhook_url", webhookUrl)
    localStorage.setItem("telegram_bot_token", botToken)
    toast.success("Sozlamalar saqlandi")
  }

  const setupWebhook = async () => {
    if (!botToken || !webhookUrl) {
      toast.error("Bot token va webhook URL ni kiriting")
      return
    }

    try {
      setTestingWebhook(true)

      // Set webhook via Telegram API
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query", "inline_query"],
        }),
      })

      const result = await response.json()

      if (result.ok) {
        setWebhookStatus("active")
        toast.success("Webhook muvaffaqiyatli o'rnatildi")
        saveWebhookSettings()
      } else {
        toast.error(`Webhook o'rnatishda xatolik: ${result.description}`)
      }
    } catch (error) {
      console.error("Error setting webhook:", error)
      toast.error("Webhook o'rnatishda xatolik yuz berdi")
    } finally {
      setTestingWebhook(false)
    }
  }

  const checkWebhookStatus = async () => {
    if (!botToken) {
      toast.error("Bot token ni kiriting")
      return
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
      const result = await response.json()

      if (result.ok) {
        const info = result.result
        if (info.url) {
          setWebhookStatus("active")
          setWebhookUrl(info.url)
          toast.success("Webhook faol")
        } else {
          setWebhookStatus("inactive")
          toast.warning("Webhook o'rnatilmagan")
        }
      } else {
        toast.error("Webhook holatini tekshirishda xatolik")
      }
    } catch (error) {
      console.error("Error checking webhook:", error)
      toast.error("Webhook holatini tekshirishda xatolik")
    }
  }

  const deleteWebhook = async () => {
    if (!botToken) {
      toast.error("Bot token ni kiriting")
      return
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
        method: "POST",
      })

      const result = await response.json()

      if (result.ok) {
        setWebhookStatus("inactive")
        toast.success("Webhook o'chirildi")
      } else {
        toast.error("Webhook o'chirishda xatolik")
      }
    } catch (error) {
      console.error("Error deleting webhook:", error)
      toast.error("Webhook o'chirishda xatolik")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Nusxalandi")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentDomain = typeof window !== "undefined" ? window.location.origin : ""
  const suggestedWebhookUrl = `${currentDomain}/api/webhook/telegram`

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Telegram Bot Sozlamalari</h1>
        <p className="text-gray-600">Telegram bot webhook sozlamalarini boshqaring</p>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Sozlash</TabsTrigger>
          <TabsTrigger value="status">Holat</TabsTrigger>
          <TabsTrigger value="help">Yordam</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Webhook Sozlamalari
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bot Token</label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(botToken)} disabled={!botToken}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">@BotFather dan olgan bot tokeningizni kiriting</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://yoursite.com/api/webhook/telegram"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl)}
                    disabled={!webhookUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Tavsiya etilgan: <code className="bg-gray-100 px-1 rounded">{suggestedWebhookUrl}</code>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto ml-2"
                    onClick={() => setWebhookUrl(suggestedWebhookUrl)}
                  >
                    Ishlatish
                  </Button>
                </p>
              </div>

              <div className="flex gap-4">
                <Button onClick={setupWebhook} disabled={testingWebhook || !botToken || !webhookUrl} className="flex-1">
                  {testingWebhook ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      O'rnatilmoqda...
                    </>
                  ) : (
                    <>
                      <Webhook className="h-4 w-4 mr-2" />
                      Webhook O'rnatish
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={saveWebhookSettings}>
                  Saqlash
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Holati
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {webhookStatus === "active" ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : webhookStatus === "inactive" ? (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  ) : (
                    <RefreshCw className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">
                      {webhookStatus === "active"
                        ? "Webhook Faol"
                        : webhookStatus === "inactive"
                          ? "Webhook Faol Emas"
                          : "Noma'lum Holat"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {webhookStatus === "active"
                        ? "Bot xabarlarni qabul qilmoqda"
                        : webhookStatus === "inactive"
                          ? "Bot xabarlarni qabul qilmayapti"
                          : "Holatni tekshiring"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    webhookStatus === "active" ? "default" : webhookStatus === "inactive" ? "destructive" : "secondary"
                  }
                >
                  {webhookStatus === "active" ? "Faol" : webhookStatus === "inactive" ? "Faol emas" : "Noma'lum"}
                </Badge>
              </div>

              <div className="flex gap-4">
                <Button onClick={checkWebhookStatus} variant="outline" className="flex-1 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Holatni Tekshirish
                </Button>
                <Button onClick={deleteWebhook} variant="destructive" disabled={webhookStatus !== "active"}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Webhook O'chirish
                </Button>
              </div>

              {webhookUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Joriy Webhook URL:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-white p-2 rounded border">{webhookUrl}</code>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle>Qo'llanma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">1. Bot yaratish</h3>
                  <p className="text-gray-600 mb-2">Telegram da @BotFather ga yozing va yangi bot yarating:</p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    /newbot
                    <br />
                    Bot nomini kiriting
                    <br />
                    Bot username ini kiriting (@username_bot)
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Bot tokenini olish</h3>
                  <p className="text-gray-600">
                    @BotFather sizga bot token beradi. Bu tokenni yuqoridagi "Bot Token" maydoniga kiriting.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. Webhook o'rnatish</h3>
                  <p className="text-gray-600">
                    Webhook URL ni kiriting va "Webhook O'rnatish" tugmasini bosing. Tavsiya etilgan URL dan
                    foydalanishingiz mumkin.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">4. Botni sinash</h3>
                  <p className="text-gray-600">
                    Webhook o'rnatilgandan so'ng, botingizga Telegram da xabar yuboring va javob qaytarishini
                    tekshiring.
                  </p>
                </div>
              </div>

              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <strong>Muhim:</strong> Bot tokenini hech kimga bermang va xavfsiz saqlang. Bu token orqali botingizni
                  boshqarish mumkin.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button variant="outline" asChild>
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    @BotFather ga o'tish
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://core.telegram.org/bots/api#setwebhook" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Telegram Bot API
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
