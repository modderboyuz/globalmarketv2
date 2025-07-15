"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Store,
  Package,
  ShoppingCart,
  Star,
  Heart,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface UserData {
  id: string
  full_name: string
  email: string
  phone: string
  address: string
  username: string
  company_name: string
  is_admin: boolean
  is_seller: boolean
  is_verified_seller: boolean
  is_banned: boolean
  created_at: string
  last_sign_in_at: string
  avatar_url: string
  seller_rating: number
  total_sales: number
  total_orders: number
  total_products: number
}

interface UserStats {
  total_products: number
  total_orders: number
  total_sales: number
  total_reviews: number
  average_rating: number
  total_likes: number
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: userData, error } = await supabase.from("users").select("is_admin").eq("id", authUser.id).single()

      if (error || !userData?.is_admin) {
        toast.error("Admin huquqi yo'q")
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

  const fetchUserData = async () => {
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", params.id).single()

      if (userError || !userData) {
        toast.error("Foydalanuvchi topilmadi")
        router.push("/admin-panel/users")
        return
      }

      setUser(userData)

      // Fetch user statistics
      const [productsResult, ordersResult, reviewsResult, likesResult] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", params.id),
        supabase.from("orders").select("total_amount").eq("user_id", params.id).eq("status", "completed"),
        supabase.from("reviews").select("rating").eq("user_id", params.id),
        supabase.from("likes").select("*", { count: "exact", head: true }).eq("user_id", params.id),
      ])

      const totalSales = ordersResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const averageRating = reviewsResult.data?.length
        ? reviewsResult.data.reduce((sum, review) => sum + review.rating, 0) / reviewsResult.data.length
        : 0

      setStats({
        total_products: productsResult.count || 0,
        total_orders: ordersResult.data?.length || 0,
        total_sales: totalSales,
        total_reviews: reviewsResult.data?.length || 0,
        average_rating: averageRating,
        total_likes: likesResult.count || 0,
      })
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (action: string) => {
    if (!user || !currentUser) return

    try {
      const updateData: any = {}
      let message = ""

      switch (action) {
        case "ban":
          updateData.is_banned = true
          message = "Foydalanuvchi bloklandi"
          break
        case "unban":
          updateData.is_banned = false
          message = "Foydalanuvchi blokdan chiqarildi"
          break
        case "make_seller":
          updateData.is_seller = true
          updateData.is_verified_seller = true
          message = "Foydalanuvchi sotuvchi qilindi"
          break
        case "remove_seller":
          updateData.is_seller = false
          updateData.is_verified_seller = false
          message = "Sotuvchi huquqi olib tashlandi"
          break
        case "make_admin":
          updateData.is_admin = true
          message = "Foydalanuvchi admin qilindi"
          break
        case "remove_admin":
          updateData.is_admin = false
          message = "Admin huquqi olib tashlandi"
          break
        default:
          return
      }

      const { error } = await supabase.from("users").update(updateData).eq("id", user.id)

      if (error) throw error

      toast.success(message)
      await fetchUserData()
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Noma'lum"
    try {
      return new Date(dateString).toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Noto'g'ri sana"
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Foydalanuvchi topilmadi</h3>
        <p className="text-gray-600 mb-4">Ushbu foydalanuvchi mavjud emas yoki o'chirilgan</p>
        <Link href="/admin-panel/users">
          <Button>Orqaga qaytish</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin-panel/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Foydalanuvchi tafsilotlari</h1>
          <p className="text-gray-600">Foydalanuvchi ma'lumotlari va statistikasi</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="card-beautiful">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name} />
                <AvatarFallback className="text-2xl">
                  {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold">{user.full_name || "Noma'lum"}</h2>
                {user.username && <p className="text-gray-600">@{user.username}</p>}
                {user.company_name && <p className="text-gray-600">{user.company_name}</p>}
              </div>
            </div>

            {/* User Details */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{user.email || "Email yo'q"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{user.phone || "Telefon yo'q"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{user.address || "Manzil yo'q"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Ro'yxatdan o'tgan: {formatDate(user.created_at)}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {user.is_admin && (
                  <Badge className="bg-red-100 text-red-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {user.is_verified_seller && (
                  <Badge className="bg-green-100 text-green-800">
                    <Store className="h-3 w-3 mr-1" />
                    Tasdiqlangan sotuvchi
                  </Badge>
                )}
                {user.is_seller && !user.is_verified_seller && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <Store className="h-3 w-3 mr-1" />
                    Sotuvchi
                  </Badge>
                )}
                {user.is_banned && (
                  <Badge variant="destructive">
                    <Ban className="h-3 w-3 mr-1" />
                    Bloklangan
                  </Badge>
                )}
                {user.last_sign_in_at && (
                  <Badge variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    Oxirgi kirish: {formatDate(user.last_sign_in_at)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="card-beautiful">
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.total_products}</div>
              <div className="text-xs text-gray-600">Mahsulotlar</div>
            </CardContent>
          </Card>
          <Card className="card-beautiful">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.total_orders}</div>
              <div className="text-xs text-gray-600">Buyurtmalar</div>
            </CardContent>
          </Card>
          <Card className="card-beautiful">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.average_rating.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Reyting</div>
            </CardContent>
          </Card>
          <Card className="card-beautiful">
            <CardContent className="p-4 text-center">
              <Heart className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.total_likes}</div>
              <div className="text-xs text-gray-600">Yoqtirishlar</div>
            </CardContent>
          </Card>
          <Card className="card-beautiful">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.total_reviews}</div>
              <div className="text-xs text-gray-600">Sharhlar</div>
            </CardContent>
          </Card>
          <Card className="card-beautiful">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <div className="text-lg font-bold">{formatPrice(stats.total_sales)}</div>
              <div className="text-xs text-gray-600">Jami sotuvlar</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle>Amallar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Ban/Unban */}
            <div className="space-y-2">
              <h4 className="font-medium">Bloklash</h4>
              {user.is_banned ? (
                <Button onClick={() => handleUserAction("unban")} className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Blokdan chiqarish
                </Button>
              ) : (
                <Button onClick={() => handleUserAction("ban")} variant="destructive" className="w-full">
                  <Ban className="h-4 w-4 mr-2" />
                  Bloklash
                </Button>
              )}
            </div>

            {/* Seller Status */}
            <div className="space-y-2">
              <h4 className="font-medium">Sotuvchi huquqi</h4>
              {user.is_verified_seller ? (
                <Button
                  onClick={() => handleUserAction("remove_seller")}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Sotuvchi huquqini olib tashlash
                </Button>
              ) : (
                <Button
                  onClick={() => handleUserAction("make_seller")}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Sotuvchi qilish
                </Button>
              )}
            </div>

            {/* Admin Status */}
            <div className="space-y-2">
              <h4 className="font-medium">Admin huquqi</h4>
              {user.is_admin ? (
                <Button
                  onClick={() => handleUserAction("remove_admin")}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Admin huquqini olib tashlash
                </Button>
              ) : (
                <Button onClick={() => handleUserAction("make_admin")} className="w-full bg-red-600 hover:bg-red-700">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin qilish
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
