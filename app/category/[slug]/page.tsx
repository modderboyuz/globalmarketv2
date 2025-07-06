"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, ShoppingCart, Eye, Award, Search, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

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
  rating: number
  has_delivery: boolean
  categories: {
    name_uz: string
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
  name_uz: string
  slug: string
  icon: string
  description: string
}

export default function CategoryPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("popular")
  const [priceRange, setPriceRange] = useState("all")

  useEffect(() => {
    fetchCategoryAndProducts()
  }, [slug, sortBy, priceRange, searchQuery])

  const fetchCategoryAndProducts = async () => {
    try {
      setLoading(true)

      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single()

      if (categoryError) throw categoryError
      setCategory(categoryData)

      // Fetch products in this category
      let query = supabase
        .from("products")
        .select(`
          *,
          categories (
            name_uz,
            icon
          ),
          users (
            full_name,
            company_name,
            is_verified_seller,
            seller_rating
          )
        `)
        .eq("category_id", categoryData.id)
        .gt("stock_quantity", 0)

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`,
        )
      }

      // Apply price range filter
      if (priceRange !== "all") {
        switch (priceRange) {
          case "under-10000":
            query = query.lt("price", 10000)
            break
          case "10000-50000":
            query = query.gte("price", 10000).lte("price", 50000)
            break
          case "50000-100000":
            query = query.gte("price", 50000).lte("price", 100000)
            break
          case "over-100000":
            query = query.gt("price", 100000)
            break
        }
      }

      // Apply sorting
      switch (sortBy) {
        case "popular":
          query = query.order("order_count", { ascending: false })
          break
        case "price-low":
          query = query.order("price", { ascending: true })
          break
        case "price-high":
          query = query.order("price", { ascending: false })
          break
        case "rating":
          query = query.order("rating", { ascending: false })
          break
        case "newest":
          query = query.order("created_at", { ascending: false })
          break
        default:
          query = query.order("order_count", { ascending: false })
      }

      const { data: productsData, error: productsError } = await query.limit(50)

      if (productsError) throw productsError
      setProducts(productsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCategoryAndProducts()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="h-8 bg-gray-200 rounded-xl animate-pulse mb-6 max-w-xs"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card-beautiful p-6">
                <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse mb-4"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Kategoriya topilmadi</h1>
            <Button onClick={() => router.push("/products")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Orqaga qaytish
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-2xl">{category.icon}</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">{category.name_uz}</h1>
              <p className="text-gray-600 text-lg">
                {category.description || `${category.name_uz} kategoriyasidagi mahsulotlar`}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border-2 border-gray-200/60 p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Bu kategoriyada qidirish..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            {/* Price Range Filter */}
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Narx oralig'i" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha narxlar</SelectItem>
                <SelectItem value="under-10000">10,000 so'm gacha</SelectItem>
                <SelectItem value="10000-50000">10,000 - 50,000 so'm</SelectItem>
                <SelectItem value="50000-100000">50,000 - 100,000 so'm</SelectItem>
                <SelectItem value="over-100000">100,000 so'm dan yuqori</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Saralash" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Mashhur</SelectItem>
                <SelectItem value="price-low">Narx: Arzon</SelectItem>
                <SelectItem value="price-high">Narx: Qimmat</SelectItem>
                <SelectItem value="rating">Reyting</SelectItem>
                <SelectItem value="newest">Yangi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
              <span className="text-6xl">{category.icon}</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Bu kategoriyada mahsulotlar topilmadi</h3>
            <p className="text-gray-600">Qidiruv shartlaringizni o'zgartiring yoki boshqa kategoriyalarni ko'ring</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                <span className="font-semibold">{products.length}</span> ta mahsulot topildi
              </p>
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
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full bg-white/90 backdrop-blur-sm border-2 border-white/50 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/product/${product.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4" />
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
                          <span className="text-sm font-medium">{product.rating}</span>
                          <span className="text-sm text-gray-500">({product.order_count})</span>
                        </div>
                        <span className="text-sm text-gray-500">{product.order_count} marta sotilgan</span>
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
