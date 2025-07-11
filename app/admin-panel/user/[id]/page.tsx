"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Award, Store, Package, ShoppingCart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface UserDetails {
  id: string
  email: string
  full_name: string
  phone: string
  company_name: string
  address: string
  is_verified_seller: boolean
  is_admin: boolean
  created_at: string
  last_sign_in_at: string
}

interface Order {
  id: string
  total_amount: number
  status: string
  created_at: string
  products: {
    name: string
    image_url: string
  }
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  is_active: boolean
  order_count: number
  created_at: string
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [admin, setAdmin] = useState<any>(null)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

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

      setAdmin(userData)
      await fetchUserDetails()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setUserDetails(result.user)
        setOrders(result.orders)
        setProducts(result.products)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      toast.error("Foydalanuvchi ma'lumotlarini olishda xatolik")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
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
        return <Badge className="bg-green-100 text-green-800">Yakunlandi</Badge>
      case "cancelled":
        return <Badge variant="destructive">Bekor qilingan</Badge>
      case "pending":
        return <Badge variant="secondary">Kutilmoqda</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!userDetails) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Foydalanuvchi topilmadi</h1>
          <Link href="/admin-panel/users">
            <Button>Foydalanuvchilar ro'yxatiga qaytish</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
        <div>
          <h1 className="text-3xl font-bold gradient-text">Foydalanuvchi profili</h1>
          <p className="text-gray-600">Foydalanuvchi ma'lumotlari va faoliyati</p>
        </div>
      </div>

      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Shaxsiy ma'lumotlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="text-2xl">
                {userDetails.full_name?.charAt(0) || userDetails.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold">{userDetails.full_name || "Noma'lum"}</h2>
                {userDetails.is_admin && (
                  <Badge variant="destructive">
                    <Award className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {userDetails.is_verified_seller && (
                  <Badge className="bg-green-100 text-green-800">
                    <Store className="h-3 w-3 mr-1" />
                    Tasdiqlangan sotuvchi
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{userDetails.email}</span>
                  </div>
                  {userDetails.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{userDetails.phone}</span>
                      <Button size="sm" variant="outline" onClick={() => window.open(`tel:${userDetails.phone}`)}>
                        Qo'ng'iroq qilish
                      </Button>
                    </div>
                  )}
                  {userDetails.company_name && (
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-gray-500" />
                      <span>{userDetails.company_name}</span>
                    </div>
                  )}
                  {userDetails.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{userDetails.address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Ro'yxatdan o'tgan: {formatDate(userDetails.created_at)}</span>
                  </div>
                  {userDetails.last_sign_in_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Oxirgi kirish: {formatDate(userDetails.last_sign_in_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Buyurtmalar ({orders.length})
              </div>
              {orders.length > 0 && (
                <Link href={`/admin-panel/orders?userId=${userId}`}>
                  <Button variant="outline" size="sm">
                    Barchasini ko'rish
                  </Button>
                </Link>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Buyurtmalar yo'q</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={order.products?.image_url || "/placeholder.svg?height=40&width=40"}
                        alt={order.products?.name || "Product"}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">#{order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">{order.products?.name || "Mahsulot"}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getOrderStatusBadge(order.status)}
                      <p className="font-bold text-green-600 mt-1">{formatPrice(order.total_amount)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {userDetails.is_verified_seller && (
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Mahsulotlar ({products.length})
                </div>
                {products.length > 0 && (
                  <Link href={`/admin-panel/products?sellerId=${userId}`}>
                    <Button variant="outline" size="sm">
                      Barchasini ko'rish
                    </Button>
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Mahsulotlar yo'q</p>
                ) : (
                  products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image_url || "/placeholder.svg?height=40&width=40"}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{formatPrice(product.price)}</p>
                          <p className="text-xs text-gray-500">{formatDate(product.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Faol" : "Faol emas"}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{product.order_count} marta sotilgan</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
