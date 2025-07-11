"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  Package,
  ShoppingCart,
  Store,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  Phone,
  Award,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AdminStats {
  totalUsers: number
  totalCustomers: number
  totalSellers: number
  totalProducts: number
  globalMarketProducts: number
  otherSellerProducts: number
  totalOrders: number
  globalMarketOrders: number
  otherSellerOrders: number
  pendingApplications: number
  recentUsers: any[]
  recentOrders: any[]
}

export default function AdminPanelPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCustomers: 0,
    totalSellers: 0,
    totalProducts: 0,
    globalMarketProducts: 0,
    otherSellerProducts: 0,
    totalOrders: 0,
    globalMarketOrders: 0,
    otherSellerOrders: 0,
    pendingApplications: 0,
    recentUsers: [],
    recentOrders: [],
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
      await fetchStats(userData.id)
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (adminId: string) => {
    try {
      // Get all stats in parallel
      const [
        usersResult,
        customersResult,
        sellersResult,
        productsResult,
        globalMarketProductsResult,
        ordersResult,
        globalMarketOrdersResult,
        pendingApplicationsResult,
        recentUsersResult,
        recentOrdersResult,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("is_seller", false)
          .eq("is_verified_seller", false),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", adminId),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("*, products!inner(seller_id)", { count: "exact", head: true })
          .eq("products.seller_id", adminId),
        Promise.all([
          supabase.from("seller_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("product_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]),
        supabase
          .from("users")
          .select("*")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("orders")
          .select(`*, products(name), users(full_name)`)
          .in("status", ["completed", "cancelled"])
          .gte("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("updated_at", { ascending: false })
          .limit(10),
      ])

      const newStats = {
        totalUsers: usersResult.count || 0,
        totalCustomers: customersResult.count || 0,
        totalSellers: sellersResult.count || 0,
        totalProducts: productsResult.count || 0,
        globalMarketProducts: globalMarketProductsResult.count || 0,
        otherSellerProducts: (productsResult.count || 0) - (globalMarketProductsResult.count || 0),
        totalOrders: ordersResult.count || 0,
        globalMarketOrders: globalMarketOrdersResult.count || 0,
        otherSellerOrders: (ordersResult.count || 0) - (globalMarketOrdersResult.count || 0),
        pendingApplications:
          (pendingApplicationsResult[0].count || 0) +
          (pendingApplicationsResult[1].count || 0) +
          (pendingApplicationsResult[2].count || 0),
        recentUsers: recentUsersResult.data || [],
        recentOrders: recentOrdersResult.data || [],
      }

      setStats(newStats)
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Statistikani olishda xatolik")
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

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Yakunlandi
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Bekor qilingan
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Kutilmoqda
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
        <p className="text-gray-600">Tizimni boshqarish va nazorat qilish</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin-panel/users">
          <Card className="card-beautiful hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Jami foydalanuvchilar</div>
              <div className="text-xs text-gray-500 mt-1">
                Sotuvchilar: {stats.totalSellers} | Mijozlar: {stats.totalCustomers}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <div className="text-sm text-gray-600">Jami mahsulotlar</div>
            <div className="text-xs text-gray-500 mt-1">
              GlobalMarket: {stats.globalMarketProducts} | Boshqalar: {stats.otherSellerProducts}
            </div>
          </CardContent>
        </Card>

        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-sm text-gray-600">Jami buyurtmalar</div>
            <div className="text-xs text-gray-500 mt-1">
              GlobalMarket: {stats.globalMarketOrders} | Boshqalar: {stats.otherSellerOrders}
            </div>
          </CardContent>
        </Card>

        <Link href="/admin-panel/applications">
          <Card className="card-beautiful hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-2xl font-bold">{stats.pendingApplications}</div>
              <div className="text-sm text-gray-600">Kutilayotgan arizalar</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Applications Card */}
      {stats.pendingApplications > 0 && (
        <Link href="/admin-panel/applications">
          <Card className="card-beautiful hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-red-500 bg-red-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-red-600" />
                  <div>
                    <h3 className="text-xl font-bold">Kutilayotgan arizalar</h3>
                    <p className="text-gray-600">Yangi arizalar sizning javobingizni kutmoqda</p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg px-3 py-1">
                  {stats.pendingApplications}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Yaqinda qo'shilganlar
              </div>
              <Link href="/admin-panel/users">
                <Button variant="outline" size="sm">
                  Barchasini ko'rish
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Yaqinda qo'shilgan foydalanuvchilar yo'q</p>
              ) : (
                stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src="/placeholder-user.jpg" />
                        <AvatarFallback>{user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "Noma'lum"}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">{formatDate(user.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.is_admin && (
                        <Badge variant="destructive">
                          <Award className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.is_verified_seller && (
                        <Badge className="bg-green-100 text-green-800">
                          <Store className="h-3 w-3 mr-1" />
                          Sotuvchi
                        </Badge>
                      )}
                      <Link href={`/admin-panel/user/${user.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </Link>
                      {user.phone && (
                        <Button size="sm" variant="outline" onClick={() => window.open(`tel:${user.phone}`)}>
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                Yaqinda yakunlangan buyurtmalar
              </div>
              <Link href="/admin-panel/orders">
                <Button variant="outline" size="sm">
                  Barchasini ko'rish
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Yaqinda yakunlangan buyurtmalar yo'q</p>
              ) : (
                stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">#{order.id.slice(-8)}</p>
                        {getOrderStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600">{order.products?.name || "Mahsulot"}</p>
                      <p className="text-sm text-gray-600">{order.users?.full_name || "Mijoz"}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.updated_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatPrice(order.total_amount)}</p>
                      <Link href={`/admin-panel/order/${order.id}`}>
                        <Button size="sm" variant="outline" className="mt-1 bg-transparent">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
