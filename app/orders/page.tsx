"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Package, Clock, CheckCircle, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Order {
  id: string
  full_name: string
  phone: string
  address: string
  status: string
  total_amount: number
  quantity: number
  created_at: string
  delivery_address: string
  products: {
    name: string
    author: string
    brand: string
    image_url: string
    product_type: string
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        window.location.href = "/"
        return
      }

      setUser(currentUser)
      await fetchOrders(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/"
    }
  }

  const fetchOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            name,
            author,
            brand,
            image_url,
            product_type
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Kutilmoqda" },
      processing: { variant: "default" as const, icon: RefreshCw, text: "Jarayonda" },
      completed: { variant: "default" as const, icon: CheckCircle, text: "Bajarilgan" },
      cancelled: { variant: "destructive" as const, icon: XCircle, text: "Bekor qilingan" },
    }

    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Mening buyurtmalarim</h1>
          <p className="text-muted-foreground">Barcha buyurtmalaringizni bu yerda ko'rishingiz mumkin</p>
        </div>

        {orders.length === 0 ? (
          <Card className="text-center py-12 card-beautiful">
            <CardContent>
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Buyurtmalar yo'q</h3>
              <p className="text-muted-foreground mb-4">Siz hali hech qanday buyurtma bermagansiz</p>
              <Button onClick={() => (window.location.href = "/")} className="btn-primary">
                Kitoblarni ko'rish
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden card-beautiful">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Buyurtma #{order.id.slice(-8)}</CardTitle>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Product Info */}
                    <div className="lg:col-span-2">
                      <div className="flex gap-4">
                        <img
                          src={order.products.image_url || "/placeholder.svg?height=120&width=80"}
                          alt={order.products.name}
                          className="w-20 h-28 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{order.products.name}</h3>
                          {order.products.author && (
                            <p className="text-muted-foreground mb-2">Muallif: {order.products.author}</p>
                          )}
                          {order.products.brand && (
                            <p className="text-muted-foreground mb-2">Brend: {order.products.brand}</p>
                          )}
                          <p className="text-sm text-muted-foreground mb-2">Miqdor: {order.quantity} dona</p>
                          <p className="text-2xl font-bold text-primary">{formatPrice(order.total_amount)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Buyurtma sanasi</p>
                        <p className="text-sm">{formatDate(order.created_at)}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Manzil</p>
                        <p className="text-sm">{order.address}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Telefon</p>
                        <p className="text-sm">{order.phone}</p>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const botUrl = `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || "globalmarketshopbot"}?start=order_${order.id}_${order.id}`
                            window.open(botUrl, "_blank")
                          }}
                        >
                          Telegram orqali kuzatish
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
