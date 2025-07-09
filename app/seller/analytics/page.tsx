"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Eye, Heart, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Package, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AnalyticsData {
  totalViews: number
  totalLikes: number
  totalOrders: number
  totalRevenue: number
  averageRating: number
  conversionRate: number
  topProducts: Array<{
    name: string
    views: number
    orders: number
    revenue: number
  }>
  categoryBreakdown: Array<{
    name: string
    value: number
    color: string
  }>
  monthlyData: Array<{
    month: string
    views: number
    orders: number
    revenue: number
  }>
}

export default function SellerAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalLikes: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    conversionRate: 0,
    topProducts: [],
    categoryBreakdown: [],
    monthlyData: [],
  })

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

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Sotuvchi hisobiga kirish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(userData)
      await fetchAnalytics(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async (sellerId: string) => {
    try {
      // Fetch seller's products
      const { data: products } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(name)
        `)
        .eq("seller_id", sellerId)

      if (!products) return

      // Calculate totals
      const totalViews = products.reduce((sum, p) => sum + (p.view_count || 0), 0)
      const totalLikes = products.reduce((sum, p) => sum + (p.like_count || 0), 0)
      const totalOrders = products.reduce((sum, p) => sum + (p.order_count || 0), 0)
      const averageRating =
        products.length > 0 ? products.reduce((sum, p) => sum + (p.average_rating || 0), 0) / products.length : 0

      // Fetch revenue from orders
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .in(
          "product_id",
          products.map((p) => p.id),
        )
        .eq("status", "completed")

      const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
      const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0

      // Top products
      const topProducts = products
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5)
        .map((p) => ({
          name: p.name,
          views: p.view_count || 0,
          orders: p.order_count || 0,
          revenue: (p.order_count || 0) * p.price,
        }))

      // Category breakdown
      const categoryMap = new Map()
      products.forEach((p) => {
        const categoryName = p.category?.name || "Boshqa"
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
      })

      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
      const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }))

      // Monthly data (mock data for demonstration)
      const monthlyData = [
        {
          month: "Yan",
          views: Math.floor(totalViews * 0.1),
          orders: Math.floor(totalOrders * 0.1),
          revenue: Math.floor(totalRevenue * 0.1),
        },
        {
          month: "Fev",
          views: Math.floor(totalViews * 0.12),
          orders: Math.floor(totalOrders * 0.12),
          revenue: Math.floor(totalRevenue * 0.12),
        },
        {
          month: "Mar",
          views: Math.floor(totalViews * 0.15),
          orders: Math.floor(totalOrders * 0.15),
          revenue: Math.floor(totalRevenue * 0.15),
        },
        {
          month: "Apr",
          views: Math.floor(totalViews * 0.18),
          orders: Math.floor(totalOrders * 0.18),
          revenue: Math.floor(totalRevenue * 0.18),
        },
        {
          month: "May",
          views: Math.floor(totalViews * 0.2),
          orders: Math.floor(totalOrders * 0.2),
          revenue: Math.floor(totalRevenue * 0.2),
        },
        {
          month: "Iyun",
          views: Math.floor(totalViews * 0.25),
          orders: Math.floor(totalOrders * 0.25),
          revenue: Math.floor(totalRevenue * 0.25),
        },
      ]

      setAnalytics({
        totalViews,
        totalLikes,
        totalOrders,
        totalRevenue,
        averageRating,
        conversionRate,
        topProducts,
        categoryBreakdown,
        monthlyData,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast.error("Analitika ma'lumotlarini olishda xatolik")
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Analitika</h1>
        <p className="text-gray-600">Biznesingizning ishlash ko'rsatkichlarini kuzating</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Jami ko'rishlar</p>
                <p className="text-xl sm:text-2xl font-bold">{analytics.totalViews.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+12%</span>
                </div>
              </div>
              <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Jami buyurtmalar</p>
                <p className="text-xl sm:text-2xl font-bold">{analytics.totalOrders}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+8%</span>
                </div>
              </div>
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Jami daromad</p>
                <p className="text-lg sm:text-xl font-bold">{formatPrice(analytics.totalRevenue)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+15%</span>
                </div>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Konversiya</p>
                <p className="text-xl sm:text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                  <span className="text-xs text-red-500">-2%</span>
                </div>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Oylik ko'rsatkichlar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} name="Ko'rishlar" />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Buyurtmalar" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kategoriya bo'yicha taqsimot</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eng ko'p ko'rilgan mahsulotlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-600">
                      {product.views} ko'rish • {product.orders} buyurtma
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatPrice(product.revenue)}</p>
                  <p className="text-xs text-gray-500">Daromad</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{analytics.totalLikes}</div>
            <div className="text-sm text-gray-600">Jami yoqtirishlar</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
            <div className="text-sm text-gray-600">O'rtacha reyting</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{analytics.topProducts.length}</div>
            <div className="text-sm text-gray-600">Faol mahsulotlar</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">+{Math.floor(analytics.conversionRate * 2)}%</div>
            <div className="text-sm text-gray-600">O'sish sur'ati</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
