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
import { Search, Star, ShoppingCart, Heart, Share2, Award, Filter } from "lucide-react"
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

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
    fetchCategories()
    fetchProducts()
  }, [])

  useEffect(() => {
    debouncedSearch()
  }, [searchQuery, selectedCategory, sortBy, minPrice, maxPrice])

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

  const fetchProducts = async () => {
    setLoading(true)
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

      // Apply search filter
      if (searchQuery.trim()) {
        const searchTerms = searchQuery
          .trim()
          .split(" ")
          .filter((term) => term.length > 0)

        if (searchTerms.length > 0) {
          // Create search conditions for each term
          const searchConditions = searchTerms
            .map(
              (term) => `name.ilike.%${term}%,description.ilike.%${term}%,author.ilike.%${term}%,brand.ilike.%${term}%`,
            )
            .join(",")

          query = query.or(searchConditions)
        }
      }

      // Apply category filter
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory)
      }

      // Apply price filters
      if (minPrice) {
        query = query.gte("price", Number.parseFloat(minPrice))
      }
      if (maxPrice) {
        query = query.lte("price", Number.parseFloat(maxPrice))
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
      toast.error("Mahsulotlarni qidirishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(() => {
      fetchProducts()
    }, 300),
    [searchQuery, selectedCategory, sortBy, minPrice, maxPrice],
  )

  const handleLike = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      toast.error("Like qo'shish uchun tizimga kiring")
      return
    }

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        toast.error("Tizimga qayta kiring")
        return
      }

      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        // Refresh products to update like count
        fetchProducts()
      } else {
        toast.error(data.error || "Xatolik yuz berdi")
      }
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

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSortBy("popular")
    setMinPrice("")
    setMaxPrice("")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-4">Mahsulotlar</h1>
          <p className="text-gray-600">Barcha mahsulotlarni ko'ring va xarid qiling</p>
        </div>

        {/* Filters */}
        <Card className="card-beautiful mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Mahsulot qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-beautiful"
                />
              </div>

              {/* Category */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="input-beautiful">
                  <SelectValue placeholder="Kategoriya" />
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

              {/* Sort */}
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

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters} className="bg-transparent">
                  <Filter className="h-4 w-4 mr-2" />
                  Tozalash
                </Button>
              </div>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Input
                  placeholder="Min narx"
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="input-beautiful"
                />
              </div>
              <div>
                <Input
                  placeholder="Max narx"
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="input-beautiful"
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
              <Search className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Hech narsa topilmadi</h3>
            <p className="text-gray-600 mb-4">Qidiruv shartlarini o'zgartiring yoki filtrlarni tozalang</p>
            <Button onClick={clearFilters}>Filtrlarni tozalash</Button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
