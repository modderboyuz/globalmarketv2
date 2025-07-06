"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  Package,
  Shield,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { OrderCard } from "./order-card"

interface Order {
  id: string
  full_name: string
  phone: string
  address: string
  status: string
  total_amount: number
  quantity: number
  created_at: string
  products: {
    name: string
    image_url: string
    product_type: string
  }
}

interface Stats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
  totalProducts: number
  totalUsers: number
}

export default function AdminPanelPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalUsers: 0,
  })

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    showPassword: false,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      // Check if user is full admin
      const { data: userData, error } = await supabase
        .from("users")
        .select("is_admin_full, phone")
        .eq("id", currentUser.id)
        .single()

      const isMainAdmin = userData?.phone === "6295092422"

      if (error || (!userData?.is_admin_full && !isMainAdmin)) {
        toast.error("Sizda admin huquqlari yo'q!")
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      setIsAuthenticated(true)
      await fetchData()
    } catch (error) {
      console.error("Admin access check error:", error)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      })

      if (error) throw error

      // Check admin status after login
      await checkAdminAccess()

      if (isAuthenticated) {
        toast.success("Muvaffaqiyatli kirildi!")
      }
    } catch (error: any) {
      toast.error(error.message || "Kirish xatosi")
    } finally {
      setLoginLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            name,
            image_url,
            product_type
          )
        `)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError

      setOrders(ordersData || [])

      // Fetch stats
      const [productsResult, usersResult] = await Promise.all([
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("users").select("id", { count: "exact" }),
      ])

      const totalOrders = ordersData?.length || 0
      const pendingOrders = ordersData?.filter((o) => o.status === "pending").length || 0
      const completedOrders = ordersData?.filter((o) => o.status === "completed").length || 0
      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
        totalProducts: productsResult.count || 0,
        totalUsers: usersResult.count || 0,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
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

  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case "book":
        return "📚"
      case "pen":
        return "🖊️"
      case "notebook":
        return "📓"
      case "pencil":
        return "✏️"
      default:
        return "📦"
    }
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <Card className="card-beautiful">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl gradient-text">Admin Panel</CardTitle>
              <p className="text-gray-600">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    className="input-beautiful"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parol</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={loginData.showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="input-beautiful pr-12"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setLoginData({ ...loginData, showPassword: !loginData.showPassword })}
                    >
                      {loginData.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full btn-primary" disabled={loginLoading}>
                  {loginLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Kirish...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Kirish
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              Admin Panel
            </h1>
            <p className="text-gray-600 text-lg">GlobalMarket boshqaruv paneli</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <Card className="card-beautiful">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jami buyurtmalar</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card className="card-beautiful">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kutilayotgan</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
              </CardContent>
            </Card>

            <Card className="card-beautiful">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bajarilgan</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
              </CardContent>
            </Card>

            <Card className="card-beautiful">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jami daromad</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
              </CardContent>
            </Card>

            <Card className="card-beautiful">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mahsulotlar</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
              </CardContent>
            </Card>

            <Card className="card-beautiful">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Foydalanuvchilar</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Management */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="text-2xl">Buyurtmalar boshqaruvi</CardTitle>
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
                      getProductTypeIcon={getProductTypeIcon}
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
                        getProductTypeIcon={getProductTypeIcon}
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
                        getProductTypeIcon={getProductTypeIcon}
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
                        getProductTypeIcon={getProductTypeIcon}
                      />
                    ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
