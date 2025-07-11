"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, ShoppingCart, Heart, Share2, Award } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { debounce } from "lodash"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category_id: string
  order_count: number
  stock_quantity: number
  product_type: string
  brand: string
  author: string
  average_rating: number
  like_count: number
  has_delivery: boolean
  categories: {
    name: string
    icon: string
  }
  users: {
    full_name: string
    company_name: string
    is_verified_seller: boolean
    seller_rating: number
  }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [user, setUser] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    checkUser()
    fetchCategories()
    if (searchParams.get("q")) {
      handleSearch()
    }
  }, [])

  useEffect(() => {
    if (searchQuery || selectedCategory !== "all") {
      debouncedSearch()
    } else {
      setProducts([])
    }
  }, [searchQuery, selectedCategory, sortBy])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery && selectedCategory === "all") {
      setProducts([])
      return
    }

    setLoading(true)
    setIsSearching(true)

    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          categories (
            name,
            icon
          ),
          users (
            full_name,
            company_name,
            is_verified_seller,
            seller_rating
          )
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock_quantity", 0)

      // Apply search filter with improved fuzzy matching
      if (searchQuery) {
        // First try exact matches
        const exactQuery = supabase
          .from("products")
          .select(`
            *,
            categories (
              name,
              icon
            ),
            users (
              full_name,
              company_name,
              is_verified_seller,
              seller_rating
            )
          `)
          .eq("is_active", true)
          .eq("is_approved", true)
          .gt("stock_quantity", 0)
          .or(
            `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`,
          )

        const { data: exactResults } = await exactQuery

        if (exactResults && exactResults.length > 0) {
          query = exactQuery
        } else {
          // If no exact matches, try partial matches with individual words
          const words = searchQuery.split(" ").filter((word) => word.length > 1)
          if (words.length > 0) {
            const partialConditions = words
              .map(
                (word) =>
                  `name.ilike.%${word}%,description.ilike.%${word}%,author.ilike.%${word}%,brand.ilike.%${word}%`,
              )
              .join(",")

            query = query.or(partialConditions)
          }
        }
      }

      // Apply category filter
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory)
      }

      // Apply sorting
      switch (sortBy) {
        case "price_low":
          query = query.order("price", { ascending: true })
          break
        case "price_high":
          query = query.order("price", { ascending: false })
          break
        case "newest":
          query = query.order("created_at", { ascending: false })
          break
        case "rating":
          query = query.order("average_rating", { ascending: false })
          break
        default:
          query = query.order("order_count", { ascending: false })
      }

      query = query.limit(100)

      const { data, error } = await query

      if (error) throw error

      setProducts(data || [])
    } catch (error) {
      console.error("Error searching products:", error)
      toast.error("Qidirishda xatolik yuz berdi")
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(() => {
      handleSearch()
    }, 300),
    [searchQuery, selectedCategory, sortBy],
  )

  const handleLike = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      toast.error("Like qo'shish uchun tizimga kiring")
      return
    }

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from("product_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .single()

      if (existingLike) {
        // Unlike
        await supabase.from("product_likes").delete().eq("user_id", user.id).eq("product_id", productId)

        toast.success("Like olib tashlandi")
      } else {
        // Like
        await supabase.from("product_likes").insert({ user_id: user.id, product_id: productId })

        toast.success("Like qo'shildi")
      }

      // Refresh search results
      handleSearch()
    } catch (error) {
      console.error("Error handling like:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleShare = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()

    const shareUrl = `${window.location.origin}/product/${product.id}`
    const shareText = `${product.name} - ${formatPrice(product.price)}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Havola nusxalandi!")
      } catch (error) {
        toast.error("Havolani nusxalashda xatolik")
      }
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-4">Qidirish</h1>

          {/* Search Form */}
          <form onSubmit={onSearchSubmit} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Kitob, qalam, daftar qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-12 h-12 text-lg transition-all duration-300 ${
                  isSearching
                    ? "border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px] rounded-lg"
                    : "input-beautiful"
                }`}
                style={
                  isSearching
                    ? {
                        background:
                          "linear-gradient(white, white) padding-box, linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899) border-box",
                      }
                    : {}
                }
              />
            </div>

            {/* Filters */}
            <div
              className={`flex flex-col sm:flex-row gap-4 transition-all duration-300 ${isSearching ? "opacity-70" : ""}`}
            >
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="input-beautiful">
                  <SelectValue placeholder="Kategoriya tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="input-beautiful">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Mashhur</SelectItem>
                  <SelectItem value="newest">Yangi</SelectItem>
                  <SelectItem value="price_low">Arzon</SelectItem>
                  <SelectItem value="price_high">Qimmat</SelectItem>
                  <SelectItem value="rating">Reyting</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit" className="btn-primary" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Qidirish
              </Button>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="card-beautiful p-4">
                <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse mb-4"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 && (searchQuery || selectedCategory !== "all") ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
              <Search className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Hech narsa topilmadi</h3>
            <p className="text-gray-600">Boshqa kalit so'zlar bilan qidirib ko'ring</p>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                <span className="font-semibold">{products.length}</span> ta mahsulot topildi
                {searchQuery && (
                  <span>
                    {" "}
                    "<span className="font-semibold">{searchQuery}</span>" uchun
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                          {product.categories?.icon} {product.categories?.name}
                        </Badge>
                        {product.users?.is_verified_seller && (
                          <Badge className="badge-beautiful border-green-200 text-green-700">
                            <Award className="h-3 w-3 mr-1" />
                            Tasdiqlangan
                          </Badge>
                        )}
                        {product.has_delivery && (
                          <Badge className="badge-beautiful border-purple-200 text-purple-700">
                            🚚 Yetkazib berish
                          </Badge>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full bg-white/90 backdrop-blur-sm border-2 border-white/50 hover:bg-white"
                          onClick={(e) => handleLike(product.id, e)}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full bg-white/90 backdrop-blur-sm border-2 border-white/50 hover:bg-white"
                          onClick={(e) => handleShare(product, e)}
                        >
                          <Share2 className="h-4 w-4" />
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
                        {product.author && <p className="text-sm text-gray-500 mt-1">Muallif: {product.author}</p>}
                        {product.brand && <p className="text-sm text-gray-500 mt-1">Brend: {product.brand}</p>}
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
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-gray-500">{product.like_count}</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-blue-600">{formatPrice(product.price)}</div>
                        <Button
                          size="sm"
                          className="btn-primary px-3 py-1 text-sm"
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
          </>
        ) : null}
      </div>
    </div>
  )
}
