"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Package, DollarSign, Eye, Heart, ShoppingCart, Star, Plus, Edit, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface DashboardStats {
  totalProducts: number
  totalViews: number
  totalLikes: number
  totalOrders: number
  totalRevenue: number
  averageRating: number
  pendingProducts: number
  activeProducts: number
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  view_count: number
  like_count: number
  order_count: number
  average_rating: number
  stock_quantity: number
  is_active: boolean
  is_approved: boolean
  created_at: string
}

export default function SellerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    pendingProducts: 0,
    activeProducts: 0,
  })
  const [products, setProducts] = useState<Product[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    checkSellerAuth()
  }, [])

  const checkSellerAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Sotuvchi hisobiga kirish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(userData)
      await fetchDashboardData(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async (sellerId: string) => {
    try {
      // Fetch seller's products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })

      if (productsError) throw productsError
      setProducts(productsData || [])

      // Calculate stats
      const totalProducts = productsData?.length || 0
      const activeProducts = productsData?.filter((p) => p.is_active && p.is_approved).length || 0
      const pendingProducts = productsData?.filter((p) => !p.is_approved).length || 0
      const totalViews = productsData?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0
      const totalLikes = productsData?.reduce((sum, p) => sum + (p.like_count || 0), 0) || 0
      const totalOrders = productsData?.reduce((sum, p) => sum + (p.order_count || 0), 0) || 0

      // Fetch revenue from orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_amount")
        .in("product_id", productsData?.map((p) => p.id) || [])
        .eq("status", "completed")

      const totalRevenue = ordersData?.reduce((sum, o) => sum + o.total_amount, 0) || 0

      // Calculate average rating
      const ratingsSum = productsData?.reduce((sum, p) => sum + (p.average_rating || 0), 0) || 0
      const averageRating = totalProducts > 0 ? ratingsSum / totalProducts : 0

      setStats({
        totalProducts,
        totalViews,
        totalLikes,
        totalOrders,
        totalRevenue,
        averageRating,
        pendingProducts,
        activeProducts,
      })

      // Prepare chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split("T")[0]
      }).reverse()

      const chartData = last7Days.map((date) => ({
        date: new Date(date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
        views: Math.floor(Math.random() * 100), // Mock data - replace with real data
        orders: Math.floor(Math.random() * 10),
      }))

      setChartData(chartData)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
    }
  }

  const requestProductAction = async (productId: string, action: "edit" | "delete", reason: string) => {
    try {
      const product = products.find((p) => p.id === productId)
      if (!product) return

      const { error } = await supabase.from("admin_messages").insert({
        type: "product_action_request",
        title: `Mahsulot ${action === "edit" ? "tahrirlash" : "o'chirish"} so'rovi`,
        content: `Sotuvchi "${product.name}" mahsulotini ${action === "edit" ? "tahrirlashni" : "o'chirishni"} so'rayapti. Sabab: ${reason}`,
        data: {
          product_id: productId,
          action,
          reason,
          seller_id: user.id,
          product_name: product.name,
        },
        status: "pending",
        created_by: user.id,
      })

      if (error) throw error

      toast.success(`${action === "edit" ? "Tahrirlash" : "O'chirish"} so'rovi yuborildi`)
    } catch (error) {
      console.error("Error requesting product action:", error)
      toast.error("So'rov yuborishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sotuvchi paneli</h1>
              <p className="text-gray-600">
                Xush kelibsiz, {user?.company_name || user?.full_name}! Bu yerda biznesingizni boshqaring.
              </p>
            </div>
            <Button onClick={() => router.push("/seller/add-product")} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Yangi mahsulot
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Jami mahsulotlar</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalProducts}</p>
                </div>
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Jami ko'rishlar</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalViews}</p>
                </div>
                <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Jami buyurtmalar</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Jami daromad</p>
                  <p className="text-lg sm:text-xl font-bold">{formatPrice(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Umumiy ko'rinish</TabsTrigger>
            <TabsTrigger value="products">Mahsulotlar</TabsTrigger>
            <TabsTrigger value="analytics">Analitika</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">So'nggi 7 kun</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tezkor statistika</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Faol mahsulotlar</span>
                    <Badge variant="default">{stats.activeProducts}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Kutilayotgan mahsulotlar</span>
                    <Badge variant="secondary">{stats.pendingProducts}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">O'rtacha reyting</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{stats.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Jami yoqtirishlar</span>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="font-medium">{stats.totalLikes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Mening mahsulotlarim</h2>
              <Button onClick={() => router.push("/seller/add-product")} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Yangi mahsulot qo'shish
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={product.image_url || "/placeholder.svg?height=200&width=200"}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      {product.is_approved ? (
                        product.is_active ? (
                          <Badge className="bg-green-500">Faol</Badge>
                        ) : (
                          <Badge variant="secondary">Nofaol</Badge>
                        )
                      ) : (
                        <Badge variant="destructive">Kutilmoqda</Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-2">{product.name}</h3>
                    <p className="text-lg font-bold text-blue-600 mb-3">{formatPrice(product.price)}</p>

                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-4">
                      <div className="text-center">
                        <Eye className="h-4 w-4 mx-auto mb-1" />
                        <span>{product.view_count || 0}</span>
                      </div>
                      <div className="text-center">
                        <Heart className="h-4 w-4 mx-auto mb-1" />
                        <span>{product.like_count || 0}</span>
                      </div>
                      <div className="text-center">
                        <ShoppingCart className="h-4 w-4 mx-auto mb-1" />
                        <span>{product.order_count || 0}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs bg-transparent"
                        onClick={() => requestProductAction(product.id, "edit", "Mahsulot ma'lumotlarini yangilash")}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Tahrirlash
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 text-xs"
                        onClick={() => requestProductAction(product.id, "delete", "Mahsulot endi kerak emas")}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        O'chirish
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {products.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
                  <p className="text-gray-600 mb-4">Birinchi mahsulotingizni qo'shing va sotishni boshlang!</p>
                  <Button onClick={() => router.push("/seller/add-product")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Mahsulot qo'shish
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Views Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ko'rishlar statistikasi</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="views" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Product Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Eng ko'p ko'rilgan mahsulotlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {products
                      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                      .slice(0, 5)
                      .map((product, index) => (
                        <div key={product.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.view_count || 0} ko'rish</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
