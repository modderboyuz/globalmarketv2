"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  Star,
  Heart,
  Award,
  TrendingUp,
  Users,
  ChevronRight,
  DollarSign,
  Crown,
  Store,
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
    name: string
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
  name: string
  slug: string
  icon: string
  description: string
}

interface Seller {
  id: string
  full_name: string
  company_name: string
  is_verified_seller: boolean
  seller_rating: number
  total_sales: number
  avatar_url: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [cheapProducts, setCheapProducts] = useState<Product[]>([])
  const [popularProducts, setPopularProducts] = useState<Product[]>([])
  const [bookProducts, setBookProducts] = useState<Product[]>([])
  const [otherProducts, setOtherProducts] = useState<Product[]>([])
  const [topSellers, setTopSellers] = useState<Seller[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<"cheap" | "popular" | "sellers">("cheap")

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
      // Fetch cheap products (arzon mahsulotlar)
      const { data: cheapData, error: cheapError } = await supabase
        .from("products")
        .select(`
          *,
          categories (name, icon),
          users (full_name, company_name, is_verified_seller)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock_quantity", 0)
        .order("price", { ascending: true })
        .limit(8)

      if (cheapError) throw cheapError
      setCheapProducts(shuffleArray(cheapData || []))

      // Fetch popular products (mashhur mahsulotlar)
      const { data: popularData, error: popularError } = await supabase
        .from("products")
        .select(`
          *,
          categories (name, icon),
          users (full_name, company_name, is_verified_seller)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock_quantity", 0)
        .order("popularity_score", { ascending: false })
        .limit(8)

      if (popularError) throw popularError
      setPopularProducts(shuffleArray(popularData || []))

      // Fetch books (kitoblar kategoriyasidan)
      const { data: booksData, error: booksError } = await supabase
        .from("products")
        .select(`
          *,
          categories!inner (name, icon),
          users (full_name, company_name, is_verified_seller)
        `)
        .eq("categories.slug", "kitoblar")
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock_quantity", 0)
        .order("order_count", { ascending: false })
        .limit(8)

      if (booksError) throw booksError
      setBookProducts(shuffleArray(booksData || []))

      // Fetch other random products
      const { data: otherData, error: otherError } = await supabase
        .from("products")
        .select(`
          *,
          categories (name, icon),
          users (full_name, company_name, is_verified_seller)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false })
        .limit(12)

      if (otherError) throw otherError
      setOtherProducts(shuffleArray(otherData || []))

      // Fetch top sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from("users")
        .select("id, full_name, company_name, is_verified_seller, seller_rating, total_sales, avatar_url")
        .eq("is_verified_seller", true)
        .order("seller_rating", { ascending: false })
        .limit(6)

      if (sellersError) throw sellersError
      setTopSellers(sellersData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
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

  const getCurrentProducts = () => {
    switch (activeFilter) {
      case "cheap":
        return cheapProducts
      case "popular":
        return popularProducts
      case "sellers":
        return topSellers
      default:
        return cheapProducts
    }
  }

  const renderProductCard = (product: Product) => (
    <Card
      key={product.id}
      className="card-hover cursor-pointer group overflow-hidden"
      onClick={() => router.push(`/product/${product.id}`)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          <Image
            src={product.image_url || "/placeholder.svg?height=300&width=300"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />

          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge className="badge-beautiful border-blue-200 text-blue-700">
              {product.categories?.icon} {product.categories?.name}
            </Badge>
            {product.users?.is_verified_seller && (
              <Badge className="badge-beautiful border-green-200 text-green-700">
                <Award className="h-3 w-3 mr-1" />
                Tasdiqlangan
              </Badge>
            )}
          </div>

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

          {product.stock_quantity < 10 && product.stock_quantity > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="destructive" className="text-xs">
                Kam qoldi: {product.stock_quantity}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-2">
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
              {product.name}
            </h3>
          </div>

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
  )

  const renderSellerCard = (seller: Seller) => (
    <Card
      key={seller.id}
      className="card-hover cursor-pointer group"
      onClick={() => router.push(`/seller/${seller.id}`)}
    >
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
          {seller.company_name?.charAt(0) || seller.full_name?.charAt(0) || "S"}
        </div>
        <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300 mb-2">
          {seller.company_name || seller.full_name}
        </h3>
        <div className="flex items-center justify-center gap-1 mb-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium">{seller.seller_rating}</span>
        </div>
        <p className="text-sm text-gray-500">{seller.total_sales} ta sotilgan</p>
        {seller.is_verified_seller && (
          <Badge className="mt-2 badge-beautiful border-green-200 text-green-700">
            <Award className="h-3 w-3 mr-1" />
            Tasdiqlangan
          </Badge>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="h-16 bg-gray-200 rounded-2xl"></div>
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
      <div className="container mx-auto px-4 py-4">
        {/* Ad Banner - Larger and closer to top */}
        <div className="mb-6">
          <div className="h-48 md:h-64 lg:h-80">
            <AdBanner />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={activeFilter === "cheap" ? "default" : "outline"}
            onClick={() => setActiveFilter("cheap")}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl"
          >
            <DollarSign className="h-5 w-5" />
            Arzon va kafolatli
          </Button>
          <Button
            variant={activeFilter === "popular" ? "default" : "outline"}
            onClick={() => setActiveFilter("popular")}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl"
          >
            <Crown className="h-5 w-5" />
            Eng mashhurlari
          </Button>
          <Button
            variant={activeFilter === "sellers" ? "default" : "outline"}
            onClick={() => setActiveFilter("sellers")}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl"
          >
            <Store className="h-5 w-5" />
            Top sotuvchilar
          </Button>
        </div>

        {/* Dynamic Content Based on Filter */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeFilter === "cheap" && "Arzon va kafolatli mahsulotlar"}
              {activeFilter === "popular" && "Eng mashhur mahsulotlar"}
              {activeFilter === "sellers" && "Top sotuvchilar"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeFilter === "sellers"
              ? topSellers.map(renderSellerCard)
              : getCurrentProducts().map(renderProductCard)}
          </div>
        </div>

        {/* Books Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📚 Kitoblar</h2>
            <Button variant="outline" onClick={() => router.push("/category/kitoblar")}>
              Barchasini ko'rish
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bookProducts.map(renderProductCard)}
          </div>
        </div>

        {/* Other Products Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Boshqa mahsulotlar</h2>
            <Button variant="outline" onClick={() => router.push("/products")}>
              Barchasini ko'rish
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {otherProducts.map(renderProductCard)}
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">Bizga murojaat qiling!</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Savollaringiz bormi? Yordam kerakmi? Biz bilan bog'laning!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl"
              onClick={() => router.push("/contact")}
            >
              <Users className="h-5 w-5 mr-2" />
              Murojaat qilish
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-3 rounded-2xl bg-transparent"
              onClick={() => window.open("tel:+998958657500")}
            >
              📞 Qo'ng'iroq qilish
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
