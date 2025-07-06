"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Check, ExternalLink, Settings, Webhook, AlertCircle, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function WebhookSetupPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [setupStatus, setSetupStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [webhookInfo, setWebhookInfo] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)

  const botToken = "8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA"
  const defaultWebhookUrl = `${typeof window !== "undefined" ? window.location.origin : "https://gmarketshop.vercel.app"}/api/webhook/telegram`

  useEffect(() => {
    checkWebhook()
  }, [])

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      toast.success("Nusxalandi!")
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      toast.error("Nusxalashda xatolik")
    }
  }

  const setupWebhook = async () => {
    const url = webhookUrl || defaultWebhookUrl
    setSetupStatus("loading")

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: true, // Clear pending updates
        }),
      })

      const result = await response.json()

      if (result.ok) {
        setSetupStatus("success")
        toast.success("Webhook muvaffaqiyatli o'rnatildi!")
        // Refresh webhook info
        setTimeout(() => checkWebhook(), 1000)
      } else {
        setSetupStatus("error")
        toast.error(`Xatolik: ${result.description}`)
      }
    } catch (error) {
      setSetupStatus("error")
      toast.error("Webhook o'rnatishda xatolik")
    }
  }

  const checkWebhook = async () => {
    setIsChecking(true)
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
      const result = await response.json()

      if (result.ok) {
        setWebhookInfo(result.result)
        const info = result.result

        if (info.url) {
          toast.success(`Webhook faol: ${info.url}`)
        } else {
          toast.info("Webhook o'rnatilmagan")
        }
      }
    } catch (error) {
      toast.error("Webhook holatini tekshirishda xatolik")
    } finally {
      setIsChecking(false)
    }
  }

  const deleteWebhook = async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
        method: "POST",
      })

      const result = await response.json()

      if (result.ok) {
        toast.success("Webhook o'chirildi!")
        setSetupStatus("idle")
        setWebhookInfo(null)
        // Refresh webhook info
        setTimeout(() => checkWebhook(), 1000)
      } else {
        toast.error("Webhook o'chirishda xatolik")
      }
    } catch (error) {
      toast.error("Webhook o'chirishda xatolik")
    }
  }

  const testWebhook = async () => {
    try {
      const response = await fetch("/api/webhook/telegram", {
        method: "GET",
      })
      const result = await response.json()

      if (response.ok) {
        toast.success("Webhook endpoint ishlayapti!")
        console.log("Webhook test result:", result)
      } else {
        toast.error("Webhook endpoint ishlamayapti")
      }
    } catch (error) {
      toast.error("Webhook testida xatolik")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2">Telegram Bot Webhook Sozlash</h1>
            <p className="text-muted-foreground">
              GlobalMarket Telegram botini websayt bilan bog'lash uchun webhook sozlang
            </p>
          </div>

          {/* Webhook Status */}
          {webhookInfo && (
            <Alert
              className={`mb-6 ${webhookInfo.url ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}
            >
              <div className="flex items-center gap-2">
                {webhookInfo.url ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                <AlertDescription className={webhookInfo.url ? "text-green-800" : "text-yellow-800"}>
                  <strong>Webhook holati:</strong> {webhookInfo.url ? `Faol - ${webhookInfo.url}` : "Faol emas"}
                  {webhookInfo.pending_update_count > 0 && (
                    <span className="ml-2">({webhookInfo.pending_update_count} kutilayotgan yangilanish)</span>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bot Ma'lumotlari */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Bot Ma'lumotlari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Bot Token</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={`${botToken.slice(0, 20)}...`} readOnly className="font-mono text-sm" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(botToken, "token")}
                      className="flex-shrink-0"
                    >
                      {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Bot Username</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value="@globalmarketshopbot" readOnly />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => window.open("https://t.me/globalmarketshopbot", "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={defaultWebhookUrl} readOnly className="font-mono text-xs" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(defaultWebhookUrl, "webhook")}
                      className="flex-shrink-0"
                    >
                      {copied === "webhook" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button onClick={testWebhook} variant="outline" className="w-full bg-transparent">
                  Webhook Endpoint Sinash
                </Button>
              </CardContent>
            </Card>

            {/* Webhook Sozlash */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Sozlash
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhookUrl">Maxsus Webhook URL (ixtiyoriy)</Label>
                  <Input
                    id="webhookUrl"
                    placeholder={defaultWebhookUrl}
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Bo'sh qoldiring avtomatik URL ishlatish uchun</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={setupWebhook} disabled={setupStatus === "loading"} className="btn-primary" size="lg">
                    {setupStatus === "loading" ? "O'rnatilmoqda..." : "Webhook O'rnatish"}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      onClick={checkWebhook}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      disabled={isChecking}
                    >
                      {isChecking ? "Tekshirilmoqda..." : "Holatni Tekshirish"}
                    </Button>
                    <Button onClick={deleteWebhook} variant="destructive" size="sm" className="flex-1">
                      Webhook O'chirish
                    </Button>
                  </div>
                </div>

                {setupStatus === "success" && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Webhook muvaffaqiyatli o'rnatildi!</span>
                    </div>
                  </div>
                )}

                {setupStatus === "error" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm text-red-800">Webhook o'rnatishda xatolik yuz berdi.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Webhook Ma'lumotlari */}
          {webhookInfo && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Webhook Tafsilotlari</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>URL:</strong> {webhookInfo.url || "O'rnatilmagan"}
                  </div>
                  <div>
                    <strong>SSL Sertifikat:</strong> {webhookInfo.has_custom_certificate ? "Bor" : "Yo'q"}
                  </div>
                  <div>
                    <strong>Kutilayotgan yangilanishlar:</strong> {webhookInfo.pending_update_count}
                  </div>
                  <div>
                    <strong>Oxirgi xatolik sanasi:</strong>{" "}
                    {webhookInfo.last_error_date
                      ? new Date(webhookInfo.last_error_date * 1000).toLocaleString()
                      : "Yo'q"}
                  </div>
                  {webhookInfo.last_error_message && (
                    <div className="md:col-span-2">
                      <strong>Oxirgi xatolik:</strong> {webhookInfo.last_error_message}
                    </div>
                  )}
                  {webhookInfo.max_connections && (
                    <div>
                      <strong>Maksimal ulanishlar:</strong> {webhookInfo.max_connections}
                    </div>
                  )}
                  {webhookInfo.allowed_updates && (
                    <div className="md:col-span-2">
                      <strong>Ruxsat etilgan yangilanishlar:</strong> {webhookInfo.allowed_updates.join(", ")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Qo'llanma */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Qadamlar bo'yicha qo'llanma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">
                    1
                  </Badge>
                  <div>
                    <h4 className="font-semibold">Websaytni deploy qiling</h4>
                    <p className="text-sm text-muted-foreground">
                      Websaytingizni Vercel, Netlify yoki boshqa platformaga deploy qiling va HTTPS URL oling
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">
                    2
                  </Badge>
                  <div>
                    <h4 className="font-semibold">Webhook URL ni tekshiring</h4>
                    <p className="text-sm text-muted-foreground">
                      "Webhook Endpoint Sinash" tugmasini bosib, endpoint ishlaganini tekshiring
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">
                    3
                  </Badge>
                  <div>
                    <h4 className="font-semibold">Webhook o'rnating</h4>
                    <p className="text-sm text-muted-foreground">
                      "Webhook O'rnatish" tugmasini bosing va natijani kuting
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">
                    4
                  </Badge>
                  <div>
                    <h4 className="font-semibold">Botni sinab ko'ring</h4>
                    <p className="text-sm text-muted-foreground">
                      Telegram botiga o'ting va /start buyrug'ini yuboring
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1">
                    5
                  </Badge>
                  <div>
                    <h4 className="font-semibold">Admin yarating</h4>
                    <p className="text-sm text-muted-foreground">
                      Database da o'zingizni admin qilib belgilang va Telegram ID ni qo'shing
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Foydali Buyruqlar */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Foydali Buyruqlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Webhook o'rnatish (cURL)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-background p-2 rounded flex-1 overflow-x-auto">
                      curl -X POST "https://api.telegram.org/bot{botToken.slice(0, 20)}..."/setWebhook -d "url=
                      {defaultWebhookUrl}"
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          `curl -X POST "https://api.telegram.org/bot${botToken}/setWebhook" -d "url=${defaultWebhookUrl}"`,
                          "curl",
                        )
                      }
                      className="flex-shrink-0"
                    >
                      {copied === "curl" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Webhook holatini tekshirish</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-background p-2 rounded flex-1">
                      curl "https://api.telegram.org/bot{botToken.slice(0, 20)}..."/getWebhookInfo
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(`curl "https://api.telegram.org/bot${botToken}/getWebhookInfo"`, "check")
                      }
                      className="flex-shrink-0"
                    >
                      {copied === "check" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Foydali Havolalar */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Foydali Havolalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" asChild>
                  <a href="https://t.me/globalmarketshopbot" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Botga o'tish
                  </a>
                </Button>

                <Button variant="outline" asChild>
                  <a href="/admin" target="_blank" rel="noopener noreferrer">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Panel
                  </a>
                </Button>

                <Button variant="outline" asChild>
                  <a href="/api/webhook/telegram" target="_blank" rel="noopener noreferrer">
                    <Webhook className="mr-2 h-4 w-4" />
                    Webhook Test
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
