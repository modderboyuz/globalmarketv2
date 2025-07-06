"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Star,
  Package,
  MessageSquare,
  ExternalLink,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  ArrowLeft,
  Shield,
  Award,
  TrendingUp,
  Eye,
  Heart,
  Share2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface SellerProfile {
  id: string
  username: string
  full_name: string
  company_name: string
  bio: string
  phone: string
  email: string
  address: string
  website_url: string
  social_links: any
  profile_image: string
  is_verified_seller: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  average_rating: number
  order_count: number
  created_at: string
  categories: {
    name_uz: string
    icon: string
  }
}

interface SellerStats {
  total_products: number
  total_orders: number
  total_revenue: number
  avg_rating: number
  total_views: number
  followers_count: number
  following_count: number
}

export default function SellerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const sellerId = params.id as string

  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("products")

  useEffect(() => {
    if (sellerId) {
      fetchSellerData()
      checkCurrentUser()
    }
  }, [sellerId])

  const checkCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    } catch (error) {
      console.error("Error checking current user:", error)
    }
  }

  const fetchSellerData = async () => {
    try {
      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from("users")
        .select("*")
        .eq("id", sellerId)
        .single()

      if (sellerError) throw sellerError
      setSeller(sellerData)

      // Fetch seller products
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

      // Fetch seller stats
      const { data: statsData, error: statsError } = await supabase.rpc("get_user_stats", {
        p_user_id: sellerId,
      })

      if (statsError) throw statsError
      setStats(statsData)
    } catch (error) {
      console.error("Error fetching seller data:", error)
      toast.error("Sotuvchi ma'lumotlarini olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const startConversation = async () => {
    if (!currentUser) {
      toast.error("Xabar yuborish uchun tizimga kiring")
      router.push("/login")
      return
    }

    if (currentUser.id === sellerId) {
      toast.error("O'zingizga xabar yubora olmaysiz")
      return
    }

    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(buyer_id.eq.${currentUser.id},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${currentUser.id})`,
        )
        .single()

      if (existingConversation) {
        router.push(`/messages?conversation=${existingConversation.id}`)
        return
      }

      // Create new conversation (need a product context)
      if (products.length > 0) {
        const { data: conversation, error } = await supabase
          .from("conversations")
          .insert({
            product_id: products[0].id,
            buyer_id: currentUser.id,
            seller_id: sellerId,
            status: "active",
          })
          .select()
          .single()

        if (error) throw error

        router.push(`/messages?conversation=${conversation.id}`)
      } else {
        toast.error("Bu sotuvchining faol mahsulotlari yo'q")
      }
    } catch (error) {
      console.error("Error starting conversation:", error)
      toast.error("Suhbat boshlashda xatolik")
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

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram":
        return <Instagram className="h-4 w-4" />
      case "facebook":
        return <Facebook className="h-4 w-4" />
      case "twitter":
        return <Twitter className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <User className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="page-container flex items-center justify-center">
        <Card className="card-beautiful p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Sotuvchi topilmadi</h2>
          <Button onClick={() => router.back()} className="btn-primary">
            Orqaga qaytish
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>

          {/* Seller Header */}
          <Card className="card-beautiful mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-white/20">
                    <AvatarImage src={seller.profile_image || "/placeholder-user.jpg"} />
                    <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                      {seller.full_name?.charAt(0) || seller.company_name?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  {seller.is_verified_seller && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    <div>
                      <h1 className="text-3xl font-bold">{seller.company_name || seller.full_name}</h1>
                      <p className="text-gray-600">@{seller.username}</p>
                    </div>
                    <div className="flex gap-2 justify-center md:justify-start">
                      {seller.is_verified_seller && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          <Shield className="w-3 h-3 mr-1" />
                          Tasdiqlangan
                        </Badge>
                      )}
                      {seller.is_admin && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <Award className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(seller.created_at)}
                      </Badge>
                    </div>
                  </div>

                  {seller.bio && <p className="text-gray-700 mb-4 max-w-2xl">{seller.bio}</p>}

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {seller.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{seller.phone}</span>
                      </div>
                    )}
                    {seller.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{seller.email}</span>
                      </div>
                    )}
                    {seller.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{seller.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  {seller.social_links && Object.keys(seller.social_links).length > 0 && (
                    <div className="flex gap-3 mb-6 justify-center md:justify-start">
                      {Object.entries(seller.social_links).map(([platform, url]) => (
                        <Button
                          key={platform}
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-full bg-transparent"
                        >
                          <a href={url as string} target="_blank" rel="noopener noreferrer">
                            {getSocialIcon(platform)}
                          </a>
                        </Button>
                      ))}
                      {seller.website_url && (
                        <Button variant="outline" size="sm" asChild className="rounded-full bg-transparent">
                          <a href={seller.website_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{stats.total_products}</div>
                        <div className="text-sm text-gray-600">Mahsulotlar</div>
                      </div>
                      <div className="text-center p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{stats.total_orders}</div>
                        <div className="text-sm text-gray-600">Buyurtmalar</div>
                      </div>
                      <div className="text-center p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{stats.avg_rating.toFixed(1)}</div>
                        <div className="text-sm text-gray-600">Reyting</div>
                      </div>
                      <div className="text-center p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{stats.total_views}</div>
                        <div className="text-sm text-gray-600">Ko'rishlar</div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center md:justify-start">
                    <Button onClick={startConversation} className="btn-primary">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Xabar yuborish
                    </Button>
                    <Button variant="outline" className="rounded-xl bg-transparent">
                      <Share2 className="h-4 w-4 mr-2" />
                      Ulashish
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 glass-effect border-0">
              <TabsTrigger value="products">Mahsulotlar ({products.length})</TabsTrigger>
              <TabsTrigger value="reviews">Sharhlar</TabsTrigger>
              <TabsTrigger value="about">Haqida</TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products">
              {products.length === 0 ? (
                <Card className="card-beautiful">
                  <CardContent className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
                    <p className="text-gray-600">Bu sotuvchining hozircha faol mahsulotlari yo'q</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="card-beautiful group hover:scale-105 transition-transform">
                      <CardContent className="p-0">
                        <div className="relative aspect-square overflow-hidden rounded-t-2xl">
                          <Image
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 text-gray-800">
                              {product.categories.icon} {product.categories.name_uz}
                            </Badge>
                          </div>
                          <div className="absolute top-3 right-3 flex gap-2">
                            <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-white/90">
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-white/90">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>

                          {product.description && (
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                          )}

                          <div className="flex items-center justify-between mb-3">
                            <div className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{product.average_rating.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                            <span>Mavjud: {product.stock_quantity} dona</span>
                            <span>{product.order_count} marta sotilgan</span>
                          </div>

                          <Button asChild className="w-full btn-primary">
                            <Link href={`/product/${product.id}`}>Ko'rish</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card className="card-beautiful">
                <CardContent className="text-center py-12">
                  <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Sharhlar</h3>
                  <p className="text-gray-600">Sharhlar tizimi hozircha ishlab chiqilmoqda</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle>Sotuvchi haqida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Umumiy ma'lumot</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>To'liq ism: {seller.full_name}</span>
                      </div>
                      {seller.company_name && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span>Kompaniya: {seller.company_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>Ro'yxatdan o'tgan: {formatDate(seller.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        <span>Oxirgi faollik: {formatDate(seller.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {seller.bio && (
                    <div>
                      <h3 className="font-semibold mb-2">Bio</h3>
                      <p className="text-gray-700">{seller.bio}</p>
                    </div>
                  )}

                  {stats && (
                    <div>
                      <h3 className="font-semibold mb-2">Statistika</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                          <div className="text-xl font-bold text-blue-600">{stats.total_products}</div>
                          <div className="text-sm text-gray-600">Jami mahsulotlar</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                          <div className="text-xl font-bold text-green-600">{stats.total_orders}</div>
                          <div className="text-sm text-gray-600">Jami buyurtmalar</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                          <div className="text-xl font-bold text-purple-600">{formatPrice(stats.total_revenue)}</div>
                          <div className="text-sm text-gray-600">Jami daromad</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                          <div className="text-xl font-bold text-orange-600">{stats.avg_rating.toFixed(1)}</div>
                          <div className="text-sm text-gray-600">O'rtacha reyting</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
