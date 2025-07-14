"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Shield,
  ShoppingCart,
  Package,
  Heart,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface UserProfile {
  id: string
  full_name: string
  email: string
  phone: string
  username?: string
  company_name?: string
  is_seller: boolean
  is_verified_seller: boolean
  is_admin: boolean
  created_at: string
  last_sign_in_at: string
  email_confirmed_at: string
}

interface UserStats {
  total_orders: number
  pending_orders: number
  completed_orders: number
  total_spent: number
  favorite_products: number
  cart_items: number
}

interface Order {
  id: string
  status: string
  total_amount: number
  created_at: string
  products: {
    name: string
    price: number
    image_url: string
  }
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_admin")
          .eq("id", authUser.id)
          .single()

        if (userError || !userData || !userData.is_admin) {
          toast.error("Sizda admin huquqi yo'q")
          router.push("/")
          return
        }

        setCurrentUser(authUser)
        await fetchUserData()
      } catch (error) {
        console.error("Error checking admin access:", error)
        router.push("/")
      }
    }

    checkAdminAccess()
  }, [params.id, router])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      // Fetch user profile
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", params.id)
        .single()

      if (userError) throw userError
      setUser(userProfile)

      // Fetch user stats using the database function
      const { data: statsData, error: statsError } = await supabase.rpc("get_user_stats", {
        user_id: params.id,
      })

      if (statsError) {
        console.error("Error fetching user stats:", statsError)
        // Set default stats if function fails
        setUserStats({
          total_orders: 0,
          pending_orders: 0,
          completed_orders: 0,
          total_spent: 0,
          favorite_products: 0,
          cart_items: 0,
        })
      } else {
        setUserStats(statsData)
      }

      // Fetch recent orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total_amount,
          created_at,
          products (
            name,
            price,
            image_url
          )
        `)
        .eq("user_id", params.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (ordersError) {
        console.error("Error fetching orders:", ordersError)
        setRecentOrders([])
      } else {
        setRecentOrders(ordersData || [])
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast.error("Foydalanuvchi ma'lumotlarini yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Noma'lum"
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Kutilmoqda
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Bajarilgan
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Bekor qilingan
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-20 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-2xl"></div>
              <div className="h-48 bg-gray-200 rounded-2xl"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
              <div className="h-48 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Foydalanuvchi topilmadi</h3>
          <p className="text-gray-600 mb-4">Bu foydalanuvchi mavjud emas yoki o'chirilgan</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga qaytish
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Foydalanuvchi tafsilotlari</h1>
          <p className="text-gray-600">#{user.id.slice(-8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Shaxsiy ma'lumotlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <User className="h-4 w-4" />
                      To'liq ism
                    </div>
                    <p className="font-medium">{user.full_name}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <p className="font-medium">{user.email}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Phone className="h-4 w-4" />
                      Telefon
                    </div>
                    <p className="font-medium">{user.phone || "Kiritilmagan"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {user.username && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Username</div>
                      <p className="font-medium">@{user.username}</p>
                    </div>
                  )}

                  {user.company_name && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Building className="h-4 w-4" />
                        Kompaniya
                      </div>
                      <p className="font-medium">{user.company_name}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Calendar className="h-4 w-4" />
                      Ro'yxatdan o'tgan
                    </div>
                    <p className="font-medium">{formatDate(user.created_at)}</p>
                  </div>

                  {user.last_sign_in_at && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Oxirgi kirish</div>
                      <p className="font-medium">{formatDate(user.last_sign_in_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* User Roles */}
              <div>
                <h3 className="font-semibold mb-3">Rollar va huquqlar</h3>
                <div className="flex flex-wrap gap-2">
                  {user.is_admin && (
                    <Badge className="bg-red-100 text-red-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Administrator
                    </Badge>
                  )}
                  {user.is_seller && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <Package className="h-3 w-3 mr-1" />
                      Sotuvchi
                    </Badge>
                  )}
                  {user.is_verified_seller && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Tasdiqlangan sotuvchi
                    </Badge>
                  )}
                  {user.email_confirmed_at && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Mail className="h-3 w-3 mr-1" />
                      Email tasdiqlangan
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                So'nggi buyurtmalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Hali buyurtmalar yo'q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{order.products?.name || "Mahsulot nomi yo'q"}</p>
                          <p className="text-sm text-gray-600">#{order.id.slice(-8)}</p>
                          <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{order.total_amount.toLocaleString()} so'm</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Stats */}
          {userStats && (
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Statistika
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Jami buyurtmalar</span>
                    </div>
                    <span className="font-bold">{userStats.total_orders}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Kutilayotgan</span>
                    </div>
                    <span className="font-bold">{userStats.pending_orders}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Bajarilgan</span>
                    </div>
                    <span className="font-bold">{userStats.completed_orders}</span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Sevimlilar</span>
                    </div>
                    <span className="font-bold">{userStats.favorite_products}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Savatda</span>
                    </div>
                    <span className="font-bold">{userStats.cart_items}</span>
                  </div>

                  <Separator />

                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Jami sarflangan</p>
                    <p className="text-2xl font-bold text-green-600">{userStats.total_spent.toLocaleString()} so'm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle>Tezkor amallar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open(`tel:${user.phone}`)}
                  disabled={!user.phone}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Qo'ng'iroq qilish
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open(`mailto:${user.email}`)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email yuborish
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => router.push(`/admin-panel/orders?user_id=${user.id}`)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Barcha buyurtmalar
                </Button>

                <Button variant="outline" className="w-full justify-start bg-transparent" onClick={fetchUserData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ma'lumotlarni yangilash
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
