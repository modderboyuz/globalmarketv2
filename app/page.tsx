"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Search,
  ShoppingCart,
  Star,
  Heart,
  Award,
  TrendingUp,
  Package,
  Users,
  BookOpen,
  Briefcase,
  Gamepad2,
  Palette,
  Calculator,
  Globe,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { AdBanner } from "@/components/layout/ad-banner"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  average_rating: number
  order_count: number
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

interface Category {
  id: string
  name_uz: string
  name_en: string
  icon: string
  description: string
  product_count: number
}

interface Stats {
  totalProducts: number
  totalSellers: number
  totalOrders: number
  totalUsers: number
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalSellers: 0,
    totalOrders: 0,
    totalUsers: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        fetchFavorites(currentUser.id)
      }
    } catch (error) {
      console.error("Auth check error:", error)
    }
  }

  const fetchData = async () => {
    try {
      // Fetch featured products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          categories (name_uz, icon),
          users (full_name, company_name, is_verified_seller)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("order_count", { ascending: false })
        .limit(12)

      if (productsError) throw productsError
      setProducts(productsData || [])

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name_uz")

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Fetch stats
      const [productsCount, sellersCount, ordersCount, usersCount] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
      ])

      setStats({
        totalProducts: productsCount.count || 0,
        totalSellers: sellersCount.count || 0,
        totalOrders: ordersCount.count || 0,
        totalUsers: usersCount.count || 0,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("favorites").select("product_id").eq("user_id", userId)

      if (error) throw error
      setFavorites(data?.map((fav) => fav.product_id) || [])
    } catch (error) {
      console.error("Error fetching favorites:", error)
    }
  }

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast.error("Sevimlilar uchun tizimga kiring")
      router.push("/login")
      return
    }

    try {
      const isFavorite = favorites.includes(productId)

      if (isFavorite) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId)

        if (error) throw error
        setFavorites(favorites.filter((id) => id !== productId))
        toast.success("Sevimlilardan olib tashlandi")
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          product_id: productId,
        })

        if (error) throw error
        setFavorites([...favorites, productId])
        toast.success("Sevimlilarga qo'shildi")
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getCategoryIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      BookOpen,
      Briefcase,
      Gamepad2,
      Palette,
      Calculator,
      Globe,
    }
    const IconComponent = icons[iconName] || Package
    return <IconComponent className="h-6 w-6" />
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        {/* Ad Banner */}
        <div className="mb-8">
          <AdBanner />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-6">
            GlobalMarket
            <br />
            <span className="text-2xl md:text-3xl text-gray-600">G'uzor tumani bozori</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Kitoblar, maktab buyumlari va boshqa mahsulotlar uchun eng ishonchli onlayn bozor
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-gray-200 focus:border-blue-500"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-xl"
                size="sm"
              >
                Qidirish
              </Button>
            </div>
          </form>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-600">{stats.totalProducts}</div>
              <div className="text-gray-600">Mahsulotlar</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-600">{stats.totalSellers}</div>
              <div className="text-gray-600">Sotuvchilar</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-600">{stats.totalOrders}</div>
              <div className="text-gray-600">Buyurtmalar</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-orange-600">{stats.totalUsers}</div>
              <div className="text-gray-600">Foydalanuvchilar</div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Kategoriyalar</h2>
            <Button variant="outline" onClick={() => router.push("/products")}>
              Barchasini ko'rish
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((category) => (
              <Card
                key={category.id}
                className="card-hover cursor-pointer group"
                onClick={() => router.push(`/category/${category.name_en}`)}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    {getCategoryIcon(category.icon)}
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                    {category.name_uz}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{category.product_count} mahsulot</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Mashhur mahsulotlar</h2>
            <Button variant="outline" onClick={() => router.push("/products")}>
              Barchasini ko'rish
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="card-hover cursor-pointer group overflow-hidden"
                onClick={() => router.push(`/product/${product.id}`)}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=300&width=300"}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <Badge className="badge-beautiful border-blue-200 text-blue-700">
                        {product.categories?.icon} {product.categories?.name_uz}
                      </Badge>
                      {product.users?.is_verified_seller && (
                        <Badge className="badge-beautiful border-green-200 text-green-700">
                          <Award className="h-3 w-3 mr-1" />
                          Tasdiqlangan
                        </Badge>
                      )}
                    </div>

                    {/* Favorite Button */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        size="icon"
                        variant="secondary"
                        className={`rounded-full bg-white/90 backdrop-blur-sm border-2 border-white/50 hover:bg-white ${
                          favorites.includes(product.id) ? "text-red-500" : "text-gray-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(product.id)
                        }}
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(product.id) ? "fill-current" : ""}`} />
                      </Button>
                    </div>

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
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                        {product.name}
                      </h3>
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {product.users?.company_name?.charAt(0) || product.users?.full_name?.charAt(0) || "G"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {product.users?.company_name || product.users?.full_name || "GlobalMarket"}
                      </span>
                    </div>

                    {/* Rating and Orders */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{product.average_rating}</span>
                        <span className="text-sm text-gray-500">({product.order_count})</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs">Mashhur</span>
                      </div>
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-blue-600">{formatPrice(product.price)}</div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/product/${product.id}`)
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Sotib olish
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">Bizning jamiyatga qo'shiling!</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            G'uzor tumanidagi eng katta onlayn bozorda o'z mahsulotlaringizni soting yoki kerakli narsalarni toping
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl"
              onClick={() => router.push("/become-seller")}
            >
              <Users className="h-5 w-5 mr-2" />
              Sotuvchi bo'lish
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-3 rounded-2xl bg-transparent"
              onClick={() => router.push("/products")}
            >
              <Package className="h-5 w-5 mr-2" />
              Mahsulotlarni ko'rish
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
