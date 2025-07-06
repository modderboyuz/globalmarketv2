"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Search,
  ShoppingCart,
  Heart,
  Star,
  Award,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Package,
  Users,
  TrendingUp,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { AdBanner } from "@/components/layout/ad-banner"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  order_count: number
  like_count: number
  average_rating: number
  product_type: string
  brand: string
  author: string
  has_delivery: boolean
  categories: {
    name_uz: string
    icon: string
  }
  users: {
    full_name: string
    company_name: string
    is_verified_seller: boolean
  }
}

interface Stats {
  totalProducts: number
  totalOrders: number
  totalUsers: number
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      setUser(currentUser)
    } catch (error) {
      console.error("Error checking user:", error)
    }
  }

  const fetchData = async () => {
    try {
      // Fetch all products
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          *,
          categories (name_uz, icon),
          users (full_name, company_name, is_verified_seller)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock_quantity", 0)
        .order("order_count", { ascending: false })
        .limit(24)

      // Fetch stats
      const [productsResult, ordersResult, usersResult] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
      ])

      setProducts(productsData || [])
      setStats({
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalUsers: usersResult.count || 0,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast.error("Sevimlilar uchun tizimga kiring")
      return
    }

    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .single()

      if (existing) {
        // Remove from favorites
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId)
        toast.success("Sevimlilardan olib tashlandi")
      } else {
        // Add to favorites
        await supabase.from("favorites").insert({
          user_id: user.id,
          product_id: productId,
        })
        toast.success("Sevimlilarga qo'shildi")
      }

      // Refresh data
      fetchData()
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const ProductCard = ({ product }: { product: Product }) => (
    <Card className="product-card card-beautiful card-hover group">
      <CardContent className="product-card-content">
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
          <Image
            src={product.image_url || "/placeholder.svg?height=300&width=300"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge className="badge-beautiful border-blue-200 text-blue-700 text-xs">
              {product.categories?.icon} {product.categories?.name_uz}
            </Badge>
            {product.users?.is_verified_seller && (
              <Badge className="badge-beautiful border-green-200 text-green-700 text-xs">
                <Award className="h-3 w-3 mr-1" />
                Tasdiqlangan
              </Badge>
            )}
            {product.has_delivery && (
              <Badge className="badge-beautiful border-purple-200 text-purple-700 text-xs">🚚 Yetkazib berish</Badge>
            )}
          </div>

          {/* Favorite Button */}
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur-sm border-2 border-white/50 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(product.id)
            }}
          >
            <Heart className="h-4 w-4 text-red-500" />
          </Button>

          {/* Stock Status */}
          {product.stock_quantity < 10 && product.stock_quantity > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="destructive" className="text-xs">
                Kam qoldi: {product.stock_quantity}
              </Badge>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
              {product.name}
            </h3>
            {product.author && <p className="text-sm text-gray-500 mt-1">Muallif: {product.author}</p>}
            {product.brand && <p className="text-sm text-gray-500 mt-1">Brend: {product.brand}</p>}
          </div>

          {/* Seller Info */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {product.users?.company_name?.charAt(0) || product.users?.full_name?.charAt(0) || "G"}
              </span>
            </div>
            <span className="text-sm text-gray-600 truncate">
              {product.users?.company_name || product.users?.full_name || "GlobalMarket"}
            </span>
          </div>

          {/* Rating and Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{product.average_rating.toFixed(1)}</span>
              <span className="text-gray-500">({product.order_count})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Heart className="h-3 w-3" />
              <span>{product.like_count}</span>
            </div>
          </div>

          {/* Price */}
          <div className="text-xl font-bold text-blue-600">{formatPrice(product.price)}</div>
        </div>

        {/* Buy Button - Positioned at bottom */}
        <div className="product-card-button">
          <Link href={`/product/${product.id}`} className="block">
            <Button className="w-full btn-primary">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sotib olish
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="page-container">
      {/* Hero Section with Search */}
      <section className="relative py-16 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="floating-animation mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Image
                  src="/placeholder-logo.png"
                  alt="GlobalMarket Logo"
                  width={50}
                  height={50}
                  className="object-contain rounded-lg"
                />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4 text-shadow">GlobalMarket</h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8">G'uzor tumanidagi eng yirik onlayn bozor</p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Qidirayotgan mahsulotingizni yozing..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 h-12 text-lg rounded-3xl border-2 border-gray-200 focus:border-blue-400 bg-white/80 backdrop-blur-sm shadow-lg"
                />
                <Button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-6 rounded-2xl btn-primary"
                >
                  Qidirish
                </Button>
              </div>
            </form>

            {/* Contact Info */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="font-medium">+998 95 865 75 00</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>G'uzor tumani, Qashqadaryo</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>24/7 xizmat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="stats-card text-center">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800 mb-1">{stats.totalProducts}</div>
              <div className="text-gray-600 text-sm">Mahsulotlar</div>
            </div>
            <div className="stats-card text-center">
              <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800 mb-1">{stats.totalOrders}</div>
              <div className="text-gray-600 text-sm">Buyurtmalar</div>
            </div>
            <div className="stats-card text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800 mb-1">{stats.totalUsers}</div>
              <div className="text-gray-600 text-sm">Foydalanuvchilar</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Banner */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <AdBanner />
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold gradient-text mb-2">Barcha mahsulotlar</h2>
              <p className="text-gray-600">Eng yaxshi narxlarda sifatli mahsulotlar</p>
            </div>
            <Link href="/products">
              <Button variant="outline" className="rounded-2xl border-2 bg-transparent">
                Barchasini ko'rish
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="card-beautiful">
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-4">
                      <div className="aspect-square bg-gray-200 rounded-2xl"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
                <Package className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Mahsulotlar topilmadi</h3>
              <p className="text-gray-600">Hozircha mahsulotlar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Bizning jamiyatga qo'shiling!</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              G'uzor tumanidagi eng katta onlayn bozorda o'z mahsulotlaringizni soting
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/become-seller">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 rounded-2xl px-8 py-3 text-lg font-semibold"
                >
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Sotuvchi bo'lish
                </Button>
              </Link>
              <Link href="/products">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-blue-600 rounded-2xl px-8 py-3 text-lg font-semibold bg-transparent"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Mahsulotlarni ko'rish
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
