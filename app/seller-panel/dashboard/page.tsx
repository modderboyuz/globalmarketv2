"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ShoppingCart, TrendingUp, Star, Plus, BarChart3, DollarSign, Eye, Heart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Stats {
  totalProducts: number
  activeProducts: number
  totalOrders: number
  totalRevenue: number
  totalViews: number
  totalLikes: number
  averageRating: number
  pendingOrders: number
}

interface RecentOrder {
  id: string
  full_name: string
  phone: string
  quantity: number
  total_amount: number
  status: string
  stage: number
  created_at: string
  products: {
    name: string
    price: number
  }
}

interface TopProduct {
  id: string
  name: string
  price: number
  order_count: number
  view_count: number
  like_count: number
  average_rating: number
  image_url: string
  stock_quantity: number
}

export default function SellerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalViews: 0,
    totalLikes: 0,
    averageRating: 0,
    pendingOrders: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserAndData()
  }, [])

  const fetchUserAndData = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) return

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()
      setUser(userData)

      if (userData?.is_verified_seller) {
        await fetchStats(currentUser.id)
        await fetchRecentOrders(currentUser.id)
        await fetchTopProducts(currentUser.id)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (sellerId: string) => {
    try {
      // Fetch products stats
      const { data: products } = await supabase.from("products").select("*").eq("seller_id", sellerId)

      const totalProducts = products?.length || 0
      const activeProducts = products?.filter((p) => p.is_active)?.length || 0
      const totalViews = products?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0
      const totalLikes = products?.reduce((sum, p) => sum + (p.like_count || 0), 0) || 0
      const averageRating = products?.length
        ? products.reduce((sum, p) => sum + (p.average_rating || 0), 0) / products.length
        : 0

      // Fetch orders stats
      const productIds = products?.map((p) => p.id) || []

      if (productIds.length > 0) {
        const { data: orders } = await supabase.from("orders").select("*").in("product_id", productIds)

        const totalOrders = orders?.length || 0
        const totalRevenue =
          orders?.filter((o) => o.status === "completed")?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
        const pendingOrders = orders?.filter((o) => o.status === "pending" || o.stage < 4)?.length || 0

        setStats({
          totalProducts,
          activeProducts,
          totalOrders,
          totalRevenue,
          totalViews,
          totalLikes,
          averageRating: Math.round(averageRating * 10) / 10,
          pendingOrders,
        })
      } else {
        setStats({
          totalProducts,
          activeProducts,
          totalOrders: 0,
          totalRevenue: 0,
          totalViews,
          totalLikes,
          averageRating: Math.round(averageRating * 10) / 10,
          pendingOrders: 0,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchRecentOrders = async (sellerId: string) => {
    try {
      const { data: products } = await supabase.from("products").select("id").eq("seller_id", sellerId)

      const productIds = products?.map((p) => p.id) || []

      if (productIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select(`
            *,
            products (name, price)
          `)
          .in("product_id", productIds)
          .order("created_at", { ascending: false })
          .limit(5)

        setRecentOrders(orders || [])
      }
    } catch (error) {
      console.error("Error fetching recent orders:", error)
    }
  }

  const fetchTopProducts = async (sellerId: string) => {
    try {
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("order_count", { ascending: false })
        .limit(5)

      setTopProducts(products || [])
    } catch (error) {
      console.error("Error fetching top products:", error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getStatusBadge = (status: string, stage: number) => {
    if (status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Yakunlandi</Badge>
    }
    if (status === "cancelled") {
      return <Badge variant="destructive">Bekor qilingan</Badge>
    }
    if (stage === 1) {
      return <Badge variant="secondary">Yangi</Badge>
    }
    if (stage === 2) {
      return <Badge className="bg-blue-100 text-blue-800">Qabul qilingan</Badge>
    }
    if (stage === 3) {
      return <Badge className="bg-yellow-100 text-yellow-800">Kutilmoqda</Badge>
    }
    return <Badge variant="secondary">Noma'lum</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Xush kelibsiz, {user?.company_name || user?.full_name}!
        </h1>
        <p className="text-gray-600 mb-4">
          Bu yerda sizning sotuvlar statistikangiz va eng so'nggi buyurtmalaringizni ko'rishingiz mumkin
        </p>
        <div className="flex gap-3">
          <Link href="/seller-panel/add-product">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Yangi mahsulot qo'shish
            </Button>
          </Link>
          <Link href="/seller-panel/analytics">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analitika
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <div className="text-sm text-gray-600">Jami mahsulotlar</div>
            <div className="text-xs text-green-600 mt-1">{stats.activeProducts} faol</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-sm text-gray-600">Jami buyurtmalar</div>
            <div className="text-xs text-orange-600 mt-1">{stats.pendingOrders} kutilmoqda</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            <div className="text-sm text-gray-600">Jami daromad</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <div className="text-sm text-gray-600">Jami ko'rishlar</div>
            <div className="text-xs text-red-600 mt-1">{stats.totalLikes} like</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                So'nggi buyurtmalar
              </div>
              <Link href="/seller-panel/orders">
                <Button variant="outline" size="sm">
                  Barchasini ko'rish
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Hali buyurtmalar yo'q</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{order.products?.name}</h4>
                      <p className="text-sm text-gray-600">{order.full_name}</p>
                      <p className="text-sm text-gray-500">Miqdor: {order.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatPrice(order.total_amount)}</p>
                      {getStatusBadge(order.status, order.stage)}
                      <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Eng mashhur mahsulotlar
              </div>
              <Link href="/seller-panel/products">
                <Button variant="outline" size="sm">
                  Barchasini ko'rish
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Hali mahsulotlar yo'q</p>
                <Link href="/seller-panel/add-product">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Birinchi mahsulotni qo'shish
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">{product.name}</h4>
                      <p className="text-sm text-gray-600">{formatPrice(product.price)}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {product.order_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {product.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {product.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {product.average_rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Ombor: {product.stock_quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Tezkor amallar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/seller-panel/add-product">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <Plus className="h-6 w-6" />
                <span className="text-sm">Mahsulot qo'shish</span>
              </Button>
            </Link>
            <Link href="/seller-panel/products">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <Package className="h-6 w-6" />
                <span className="text-sm">Mahsulotlarim</span>
              </Button>
            </Link>
            <Link href="/seller-panel/orders">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <ShoppingCart className="h-6 w-6" />
                <span className="text-sm">Buyurtmalar</span>
              </Button>
            </Link>
            <Link href="/seller-panel/analytics">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm">Analitika</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
