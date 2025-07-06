"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Store, MapPin, Phone, Mail, Calendar, Package, Star, ShoppingCart, Award, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Seller {
  id: string
  full_name: string
  company_name: string
  email: string
  phone: string
  address: string
  is_verified_seller: boolean
  created_at: string
  profile_image: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  order_count: number
  average_rating: number
  is_active: boolean
  created_at: string
  categories: {
    name_uz: string
    icon: string
  }
}

interface Stats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  averageRating: number
  joinDate: string
}

export default function SellerProfilePage() {
  const params = useParams()
  const sellerId = params.id as string

  const [seller, setSeller] = useState<Seller | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    joinDate: "",
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("products")

  useEffect(() => {
    if (sellerId) {
      fetchSellerData()
    }
  }, [sellerId])

  const fetchSellerData = async () => {
    try {
      // Fetch seller info
      const { data: sellerData, error: sellerError } = await supabase
        .from("users")
        .select("*")
        .eq("id", sellerId)
        .eq("is_verified_seller", true)
        .single()

      if (sellerError || !sellerData) {
        toast.error("Sotuvchi topilmadi")
        return
      }

      setSeller(sellerData)

      // Fetch seller's products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          categories (name_uz, icon)
        `)
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })

      if (productsError) throw productsError

      setProducts(productsData || [])

      // Calculate stats
      const totalProducts = productsData?.length || 0
      const totalOrders = productsData?.reduce((sum, p) => sum + p.order_count, 0) || 0
      const averageRating =
        productsData && productsData.length > 0
          ? productsData.reduce((sum, p) => sum + p.average_rating, 0) / productsData.length
          : 0

      // Get total revenue from completed orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("seller_id", sellerId)
        .eq("status", "completed")

      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalProducts,
        totalOrders,
        totalRevenue,
        averageRating,
        joinDate: sellerData.created_at,
      })
    } catch (error) {
      console.error("Error fetching seller data:", error)
      toast.error("Ma'lumotlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-gray-200 rounded-3xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
            <Store className="h-16 w-16 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Sotuvchi topilmadi</h1>
          <p className="text-gray-600 mb-8">Bu sotuvchi mavjud emas yoki faol emas.</p>
          <Link href="/sellers">
            <Button className="btn-primary">
              <Store className="h-4 w-4 mr-2" />
              Boshqa sotuvchilar
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Seller Header */}
        <Card className="card-beautiful">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Avatar */}
              <Avatar className="w-32 h-32">
                <AvatarImage src={seller.profile_image || "/placeholder-user.jpg"} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-4xl">
                  {seller.company_name?.charAt(0) || seller.full_name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>

              {/* Seller Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold gradient-text">{seller.company_name || seller.full_name}</h1>
                    {seller.is_verified_seller && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <Award className="h-4 w-4 mr-1" />
                        Tasdiqlangan sotuvchi
                      </Badge>
                    )}
                  </div>
                  {seller.company_name && seller.full_name && (
                    <p className="text-lg text-gray-600">{seller.full_name}</p>
                  )}
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seller.address && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Manzil</p>
                        <p className="font-medium">{seller.address}</p>
                      </div>
                    </div>
                  )}

                  {seller.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Telefon</p>
                        <p className="font-medium">{seller.phone}</p>
                      </div>
                    </div>
                  )}

                  {seller.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{seller.email}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Qo'shilgan sana</p>
                      <p className="font-medium">{formatDate(stats.joinDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Button */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => window.open(`tel:${seller.phone}`)}
                    disabled={!seller.phone}
                    className="btn-primary"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Qo'ng'iroq qilish
                  </Button>
                  <Button
                    onClick={() => window.open(`mailto:${seller.email}`)}
                    disabled={!seller.email}
                    variant="outline"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email yuborish
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="card-beautiful">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalProducts}</div>
              <div className="text-gray-600">Mahsulotlar</div>
            </CardContent>
          </Card>

          <Card className="card-beautiful">
            <CardContent className="p-6 text-center">
              <ShoppingCart className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalOrders}</div>
              <div className="text-gray-600">Buyurtmalar</div>
            </CardContent>
          </Card>

          <Card className="card-beautiful">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <div className="text-2xl font-bold text-purple-600 mb-2">{formatPrice(stats.totalRevenue)}</div>
              <div className="text-gray-600">Daromad</div>
            </CardContent>
          </Card>

          <Card className="card-beautiful">
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <div className="text-3xl font-bold text-yellow-500 mb-2">{stats.averageRating.toFixed(1)}</div>
              <div className="text-gray-600">Reyting</div>
            </CardContent>
          </Card>
        </div>

        {/* Products Section */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Sotuvchi mahsulotlari ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
                <p className="text-gray-600">Bu sotuvchi hali mahsulot qo'shmagan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="border card-hover group">
                    <CardContent className="p-0">
                      {/* Product Image */}
                      <div className="relative aspect-square bg-gray-100 rounded-t-2xl overflow-hidden">
                        <Image
                          src={product.image_url || "/placeholder.svg?height=300&width=300"}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-white/90 text-gray-700 border-0">
                            {product.categories?.icon} {product.categories?.name_uz}
                          </Badge>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4 space-y-3">
                        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>

                        {product.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{product.average_rating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ShoppingCart className="h-4 w-4 text-gray-500" />
                              <span>{product.order_count}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.stock_quantity > 0 ? `${product.stock_quantity} dona` : "Tugagan"}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xl font-bold text-blue-600">{formatPrice(product.price)}</div>
                          <Link href={`/product/${product.id}`}>
                            <Button size="sm" className="btn-primary">
                              Ko'rish
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
