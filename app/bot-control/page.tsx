"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bot, Send, RefreshCw, CheckCircle, Clock, Users, MessageSquare, Settings, ExternalLink } from "lucide-react"
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
  max_connections?: number
  allowed_updates?: string[]
}

interface Order {
  id: string
  full_name: string
  phone: string
  total_amount: number
  status: string
  created_at: string
  products: {
    name: string
    price: number
  }
}

interface AdminMessage {
  id: string
  type: string
  title: string
  content: string
  status: string
  created_at: string
  users: {
    full_name: string
    phone: string
  }
}

export default function BotControlPage() {
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null)
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState("")
  const [message, setMessage] = useState("")
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    pendingMessages: 0,
  })

  useEffect(() => {
    fetchBotInfo()
    fetchOrders()
    fetchMessages()
    fetchStats()
  }, [])

  const fetchBotInfo = async () => {
    try {
      const response = await fetch("/api/telegram-bot/info")
      const data = await response.json()

      if (data.success) {
        setBotInfo(data.bot)
        setWebhookInfo(data.webhook)
      }
    } catch (error) {
      console.error("Bot info fetch error:", error)
      toast.error("Bot ma'lumotlarini olishda xatolik")
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (name, price)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Orders fetch error:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_messages")
        .select(`
          *,
          users (full_name, phone)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Messages fetch error:", error)
      toast.error("Xabarlarni olishda xatolik")
    }
  }

  const fetchStats = async () => {
    try {
      const [usersResult, ordersResult, pendingOrdersResult, pendingMessagesResult] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).not("telegram_id", "is", null),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("admin_messages").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        totalOrders: ordersResult.count || 0,
        pendingOrders: pendingOrdersResult.count || 0,
        pendingMessages: pendingMessagesResult.count || 0,
      })
    } catch (error) {
      console.error("Stats fetch error:", error)
    }
  }

  const sendTestMessage = async () => {
    if (!chatId || !message) {
      toast.error("Chat ID va xabarni kiriting")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/telegram-bot/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: Number.parseInt(chatId),
          text: message,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Xabar yuborildi!")
        setMessage("")
      } else {
        toast.error("Xabar yuborishda xatolik")
      }
    } catch (error) {
      console.error("Send message error:", error)
      toast.error("Xabar yuborishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)

      if (error) throw error

      toast.success("Buyurtma holati yangilandi!")
      fetchOrders()
    } catch (error) {
      console.error("Order update error:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const setWebhook = async () => {
    try {
      const response = await fetch("/api/telegram-bot/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${window.location.origin}/api/webhook/telegram`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Webhook o'rnatildi!")
        fetchBotInfo()
      } else {
        toast.error("Webhook o'rnatishda xatolik")
      }
    } catch (error) {
      console.error("Webhook setup error:", error)
      toast.error("Webhook o'rnatishda xatolik")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2 flex items-center gap-2">
              <Bot className="h-8 w-8" />
              Telegram Bot Boshqaruv Paneli
            </h1>
            <p className="text-muted-foreground">GlobalMarket Telegram botini boshqarish va monitoring qilish</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="card-beautiful">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Bot foydalanuvchilari</div>
              </CardContent>
            </Card>
            <Card className="card-beautiful">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-gray-600">Jami buyurtmalar</div>
              </CardContent>
            </Card>
            <Card className="card-beautiful">
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                <div className="text-sm text-gray-600">Kutilayotgan</div>
              </CardContent>
            </Card>
            <Card className="card-beautiful">
              <CardContent className="p-4 text-center">
                <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.pendingMessages}</div>
                <div className="text-sm text-gray-600">Yangi xabarlar</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Bot Ma'lumotlari */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Bot Ma'lumotlari
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {botInfo ? (
                    <>
                      <div>
                        <p className="text-sm font-medium">Bot Nomi</p>
                        <p className="text-sm text-muted-foreground">{botInfo.first_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Username</p>
                        <p className="text-sm text-muted-foreground">@{botInfo.username}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bot ID</p>
                        <p className="text-sm text-muted-foreground">{botInfo.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={botInfo.is_bot ? "default" : "destructive"}>
                          {botInfo.is_bot ? "Faol" : "Faol emas"}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button onClick={fetchBotInfo} variant="outline" size="sm" className="w-full bg-transparent">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Yangilash
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Webhook Ma'lumotlari */}
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle>Webhook Holati</CardTitle>
                </CardHeader>
                <CardContent>
                  {webhookInfo ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">URL</p>
                        <p className="text-xs text-muted-foreground break-all">{webhookInfo.url || "O'rnatilmagan"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Kutilayotgan yangilanishlar</p>
                        <p className="text-sm text-muted-foreground">{webhookInfo.pending_update_count || 0}</p>
                      </div>
                      {webhookInfo.last_error_message && (
                        <div>
                          <p className="text-sm font-medium text-red-600">Oxirgi xatolik</p>
                          <p className="text-xs text-red-500">{webhookInfo.last_error_message}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">Webhook ma'lumotlari yuklanmadi</p>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <Button onClick={setWebhook} variant="outline" size="sm" className="w-full bg-transparent">
                      <Settings className="h-4 w-4 mr-2" />
                      Webhook o'rnatish
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Test Xabar */}
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Test Xabar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Chat ID</label>
                    <Input placeholder="123456789" value={chatId} onChange={(e) => setChatId(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Xabar</label>
                    <Textarea
                      placeholder="Test xabar..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={sendTestMessage} disabled={loading} className="w-full btn-primary">
                    {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Yuborish
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Buyurtmalar va Xabarlar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Kutilayotgan Buyurtmalar */}
              <Card className="card-beautiful">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Kutilayotgan Buyurtmalar ({orders.length})
                    </CardTitle>
                    <Button onClick={fetchOrders} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Yangilash
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Yangi buyurtmalar yo'q</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">#{order.id.slice(-8)}</h3>
                              <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                            </div>
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Kutilmoqda
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div>
                              <p className="text-sm font-medium">{order.products.name}</p>
                              <p className="text-xs text-muted-foreground">Narx: {formatPrice(order.products.price)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Mijoz:</span> {order.full_name}
                              </div>
                              <div>
                                <span className="font-medium">Telefon:</span> {order.phone}
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Jami summa:</span> {formatPrice(order.total_amount)}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, "processing")}
                            >
                              🔄 Jarayonda
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, "completed")}
                            >
                              ✅ Bajarildi
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateOrderStatus(order.id, "cancelled")}
                            >
                              ❌ Bekor qilish
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Admin Xabarlari */}
              <Card className="card-beautiful">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Yangi Xabarlar ({messages.length})
                    </CardTitle>
                    <Button onClick={fetchMessages} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Yangilash
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Yangi xabarlar yo'q</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-sm">{msg.title}</h3>
                              <p className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</p>
                            </div>
                            <Badge variant="secondary">{msg.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{msg.content}</p>
                          {msg.users && (
                            <div className="text-xs text-muted-foreground">
                              {msg.users.full_name} • {msg.users.phone}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Foydali Havolalar */}
          <Card className="mt-8 card-beautiful">
            <CardHeader>
              <CardTitle>Foydali Havolalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button variant="outline" asChild>
                  <a href="https://t.me/globalmarketshopbot" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Botga o'tish
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/admin-panel" target="_blank" rel="noopener noreferrer">
                    <Users className="mr-2 h-4 w-4" />
                    Admin Panel
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/webhook-setup" target="_blank" rel="noopener noreferrer">
                    <Settings className="mr-2 h-4 w-4" />
                    Webhook Sozlash
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/api/webhook/telegram" target="_blank" rel="noopener noreferrer">
                    <Bot className="mr-2 h-4 w-4" />
                    Webhook Test
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Ma'lumotlari */}
          <Alert className="mt-8">
            <Bot className="h-4 w-4" />
            <AlertDescription>
              <strong>Bot Token:</strong> 8057847116:AAEOUXELJqQNmh0lQDAl2HgPGKQ_e1x1dkA
              <br />
              <strong>Bot Username:</strong> @globalmarketshopbot
              <br />
              <strong>Webhook Endpoint:</strong> <code>/api/webhook/telegram</code>
              <br />
              <strong>Bot Control Panel:</strong> <code>/bot-control</code>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
