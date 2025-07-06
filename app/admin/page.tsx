"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, TrendingUp, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { JSX } from "react/jsx-runtime"

interface Order {
  id: string
  full_name: string
  phone: string
  address: string
  status: string
  total_amount: number
  created_at: string
  delivery_date: string
  books: {
    title: string
    author: string
  }
}

interface Stats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        window.location.href = "/"
        return
      }

      // Check if user is admin
      const { data: userData, error } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", currentUser.id)
        .single()

      if (error || !userData?.is_admin) {
        toast.error("Sizda admin huquqlari yo'q!")
        window.location.href = "/"
        return
      }

      setUser(currentUser)
      await fetchData()
    } catch (error) {
      console.error("Admin access check error:", error)
      window.location.href = "/"
    }
  }

  const fetchData = async () => {
    try {
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          books (
            title,
            author
          )
        `)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError

      setOrders(ordersData || [])

      // Calculate stats
      const totalOrders = ordersData?.length || 0
      const pendingOrders = ordersData?.filter((o) => o.status === "pending").length || 0
      const completedOrders = ordersData?.filter((o) => o.status === "completed").length || 0
      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error

      toast.success("Buyurtma holati yangilandi!")
      await fetchData()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast.error("Xatolik yuz berdi")
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
          <p className="text-muted-foreground">GlobalMarket boshqaruv paneli</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jami buyurtmalar</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kutilayotgan</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bajarilgan</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jami daromad</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Management */}
        <Card>
          <CardHeader>
            <CardTitle>Buyurtmalar boshqaruvi</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Barchasi</TabsTrigger>
                <TabsTrigger value="pending">Kutilayotgan</TabsTrigger>
                <TabsTrigger value="processing">Jarayonda</TabsTrigger>
                <TabsTrigger value="completed">Bajarilgan</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={updateOrderStatus}
                    formatPrice={formatPrice}
                    formatDate={formatDate}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                {orders
                  .filter((o) => o.status === "pending")
                  .map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusUpdate={updateOrderStatus}
                      formatPrice={formatPrice}
                      formatDate={formatDate}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="processing" className="space-y-4">
                {orders
                  .filter((o) => o.status === "processing")
                  .map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusUpdate={updateOrderStatus}
                      formatPrice={formatPrice}
                      formatDate={formatDate}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {orders
                  .filter((o) => o.status === "completed")
                  .map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusUpdate={updateOrderStatus}
                      formatPrice={formatPrice}
                      formatDate={formatDate}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OrderCard({
  order,
  onStatusUpdate,
  formatPrice,
  formatDate,
  getStatusBadge,
}: {
  order: Order
  onStatusUpdate: (id: string, status: string) => void
  formatPrice: (price: number) => string
  formatDate: (date: string) => string
  getStatusBadge: (status: string) => JSX.Element
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">#{order.id.slice(-8)}</span>
            {getStatusBadge(order.status)}
          </div>

          <div>
            <h3 className="font-semibold">{order.books.title}</h3>
            <p className="text-sm text-muted-foreground">{order.books.author}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="font-medium">Mijoz:</span> {order.full_name}
            </div>
            <div>
              <span className="font-medium">Telefon:</span> {order.phone}
            </div>
            <div>
              <span className="font-medium">Summa:</span> {formatPrice(order.total_amount)}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Manzil:</span> {order.address}
            </div>
            <div>
              <span className="font-medium">Sana:</span> {formatDate(order.created_at)}
            </div>
            {order.delivery_date && (
              <div>
                <span className="font-medium">Yetkazish:</span> {formatDate(order.delivery_date)}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Select value={order.status} onValueChange={(value) => onStatusUpdate(order.id, value)}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Kutilmoqda</SelectItem>
              <SelectItem value="processing">Jarayonda</SelectItem>
              <SelectItem value="completed">Bajarilgan</SelectItem>
              <SelectItem value="cancelled">Bekor qilingan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  )
}
