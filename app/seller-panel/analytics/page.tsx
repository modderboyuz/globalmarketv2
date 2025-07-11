"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Package,
  RefreshCw,
  TrendingUp,
  Eye,
  Heart,
  ShoppingCart,
  Star,
  DollarSign,
  Calendar,
  BarChart3,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AnalyticsData {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  totalViews: number
  totalLikes: number
  avgRating: number
  monthlyOrders: Array<{ month: string; orders: number; revenue: number }>
  topProducts: Array<{ name: string; orders: number; revenue: number }>
  categoryStats: Array<{ name: string; count: number; revenue: number }>
}

export default function SellerAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30")

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [user, timeRange])

  const checkUser = async () => {
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
        toast.error("Sizda sotuvchi huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      // Get seller's products
      const { data: products } = await supabase.from("products").select("*").eq("seller_id", user.id)

      if (!products) return

      const productIds = products.map((p) => p.id)

      // Get orders for seller's products
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            name,
            category:categories!products_category_id_fkey(name)
          )
        `)
        .in("product_id", productIds)
        .gte("created_at", new Date(Date.now() - Number(timeRange) * 24 * 60 * 60 * 1000).toISOString())

      // Calculate analytics
      const totalProducts = products.length
      const totalOrders = orders?.length || 0
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const totalViews = products.reduce((sum, product) => sum + (product.view_count || 0), 0)
      const totalLikes = products.reduce((sum, product) => sum + (product.like_count || 0), 0)
      const avgRating = products.reduce((sum, product) => sum + (product.average_rating || 0), 0) / products.length || 0

      // Monthly orders
      const monthlyData = new Map()
      orders?.forEach((order) => {
        const month = new Date(order.created_at).toLocaleDateString("uz-UZ", { month: "short", year: "numeric" })
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, orders: 0, revenue: 0 })
        }
        const data = monthlyData.get(month)
        data.orders += 1
        data.revenue += order.total_amount || 0
      })

      // Top products
      const productStats = new Map()
      orders?.forEach((order) => {
        const productName = order.products?.name || "Unknown"
        if (!productStats.has(productName)) {
          productStats.set(productName, { name: productName, orders: 0, revenue: 0 })
        }
        const stats = productStats.get(productName)
        stats.orders += 1
        stats.revenue += order.total_amount || 0
      })

      // Category stats
      const categoryStats = new Map()
      orders?.forEach((order) => {
        const categoryName = order.products?.category?.name || "Other"
        if (!categoryStats.has(categoryName)) {
          categoryStats.set(categoryName, { name: categoryName, count: 0, revenue: 0 })
        }
        const stats = categoryStats.get(categoryName)
        stats.count += 1
        stats.revenue += order.total_amount || 0
      })

      setAnalytics({
        totalProducts,
        totalOrders,
        totalRevenue,
        totalViews,
        totalLikes,
        avgRating,
        monthlyOrders: Array.from(monthlyData.values()).slice(-6),
        topProducts: Array.from(productStats.values())
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5),
        categoryStats: Array.from(categoryStats.values()),
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast.error("Analitika ma'lumotlarini olishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Analitika yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Ma'lumot yo'q</h3>
        <p className="text-gray-600 mb-4">Analitika ma'lumotlari topilmadi</p>
        <Button onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Qayta yuklash
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Analitika</h1>
          <p className="text-gray-600">Biznesingiz haqida batafsil ma'lumot</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">So'nggi 7 kun</SelectItem>
              <SelectItem value="30">So'nggi 30 kun</SelectItem>
              <SelectItem value="90">So'nggi 90 kun</SelectItem>
              <SelectItem value="365">So'nggi yil</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jami daromad</p>
                <p className="text-2xl font-bold text-green-600">{formatPrice(analytics.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-beautiful">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jami buyurtmalar</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-beautiful">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jami ko'rishlar</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(analytics.totalViews)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-beautiful">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">O'rtacha reyting</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.avgRating.toFixed(1)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Orders Chart */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Oylik buyurtmalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyOrders.length > 0 ? (
              <div className="space-y-4">
                {analytics.monthlyOrders.map((data, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{data.month}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{data.orders} buyurtma</p>
                      <p className="text-sm text-gray-600">{formatPrice(data.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Ma'lumot yo'q</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top mahsulotlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topProducts.length > 0 ? (
              <div className="space-y-4">
                {analytics.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.orders} buyurtma</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatPrice(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Ma'lumot yo'q</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Stats */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle>Kategoriya bo'yicha statistika</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.categoryStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.categoryStats.map((category, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{category.name}</h4>
                    <span className="text-sm text-gray-600">{category.count} buyurtma</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatPrice(category.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Ma'lumot yo'q</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jami mahsulotlar</p>
                <p className="text-2xl font-bold">{analytics.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-beautiful">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jami yoqtirishlar</p>
                <p className="text-2xl font-bold text-red-600">{analytics.totalLikes}</p>
              </div>
              <Heart className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-beautiful">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">O'rtacha buyurtma</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.totalOrders > 0 ? formatPrice(analytics.totalRevenue / analytics.totalOrders) : "0 so'm"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
