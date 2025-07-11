"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Star, Heart, ShoppingCart, Search, Filter, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  average_rating: number
  like_count: number
  order_count: number
  stock_quantity: number
  seller: {
    full_name: string
    company_name: string
    is_verified_seller: boolean
  }
  category: {
    name: string
    slug: string
  }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full">
        <CardContent className="p-3 md:p-4 h-full flex flex-col">
          <div className="relative aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={product.image_url || "/placeholder.svg?height=200&width=200"}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-6 w-6 md:h-8 md:w-8 p-0 bg-white/80 hover:bg-white"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Handle like functionality
              }}
            >
              <Heart className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
              <Badge className="absolute bottom-2 left-2 bg-orange-500 text-xs">
                Kam qoldi: {product.stock_quantity}
              </Badge>
            )}
            {product.stock_quantity === 0 && (
              <Badge className="absolute bottom-2 left-2 bg-red-500 text-xs">Tugagan</Badge>
            )}
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <h3 className="font-medium text-xs md:text-sm line-clamp-2 group-hover:text-blue-600 transition-colors flex-1">
              {product.name}
            </h3>

            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-2 w-2 md:h-3 md:w-3 ${
                      i < Math.floor(product.average_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">({product.order_count || 0})</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-sm md:text-lg text-blue-600">{product.price.toLocaleString()} so'm</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Heart className="h-3 w-3" />
                {product.like_count || 0}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 truncate">
                {product.seller?.company_name || product.seller?.full_name || "Noma'lum sotuvchi"}
              </span>
              {product.seller?.is_verified_seller && (
                <Badge variant="secondary" className="text-xs">
                  ✓
                </Badge>
              )}
            </div>

            <div className="text-xs text-gray-500">{product.category?.name || "Kategoriya"}</div>

            <div className="flex gap-1 md:gap-2 pt-2 mt-auto">
              <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={product.stock_quantity === 0}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Handle add to cart
                }}
              >
                <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                {product.stock_quantity === 0 ? "Tugagan" : "Sotib olish"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="px-2 bg-transparent"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Handle like
                }}
              >
                <Heart className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch products with enhanced search
      let query = supabase
        .from("products")
        .select(`
          *,
          seller:users!products_seller_id_fkey(full_name, company_name, is_verified_seller),
          category:categories!products_category_id_fkey(name, slug)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)

      // Apply search with full-text search
      if (searchQuery.trim()) {
        query = query.or(`
          name.ilike.%${searchQuery}%,
          description.ilike.%${searchQuery}%,
          author.ilike.%${searchQuery}%,
          brand.ilike.%${searchQuery}%,
          search_vector.fts.${searchQuery}
        `)
      }

      // Apply category filter
      if (selectedCategory !== "all") {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", selectedCategory)
          .single()

        if (categoryData) {
          query = query.eq("category_id", categoryData.id)
        }
      }

      // Apply price filters
      if (minPrice) {
        query = query.gte("price", Number(minPrice))
      }
      if (maxPrice) {
        query = query.lte("price", Number(maxPrice))
      }

      // Apply sorting
      switch (sortBy) {
        case "price_asc":
          query = query.order("price", { ascending: true })
          break
        case "price_desc":
          query = query.order("price", { ascending: false })
          break
        case "popular":
          query = query.order("order_count", { ascending: false })
          break
        case "rating":
          query = query.order("average_rating", { ascending: false })
          break
        case "newest":
          query = query.order("created_at", { ascending: false })
          break
        default:
          query = query.order("order_count", { ascending: false })
      }

      const { data: productsData, error: productsError } = await query.limit(24)

      if (productsError) {
        console.error("Products error:", productsError)
      } else {
        setProducts(productsData || [])
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")

      if (categoriesError) {
        console.error("Categories error:", categoriesError)
      } else {
        setCategories(categoriesData || [])
      }
    } catch (error) {
      console.error("Database error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategory, sortBy, minPrice, maxPrice])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSortBy("popular")
    setMinPrice("")
    setMaxPrice("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Barcha mahsulotlar</h1>
          <p className="text-gray-600">{products.length} ta mahsulot topildi</p>
        </div>

        {/* Mobile Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Mahsulot qidirish..."
              className="pl-10 pr-16"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filtrlar</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Kategoriya</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategoriya tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.slug}>
                            {category.icon} {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Narx oralig'i</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min narx"
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                      <Input
                        placeholder="Max narx"
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Saralash</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Saralash" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popular">Mashhur</SelectItem>
                        <SelectItem value="newest">Yangi</SelectItem>
                        <SelectItem value="price_asc">Narx: Arzon</SelectItem>
                        <SelectItem value="price_desc">Narx: Qimmat</SelectItem>
                        <SelectItem value="rating">Reyting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setShowFilters(false)} className="flex-1">
                      Qo'llash
                    </Button>
                    <Button variant="outline" onClick={clearFilters} className="bg-transparent">
                      Tozalash
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:block bg-white rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategoriya tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Price Range */}
            <div className="flex gap-2">
              <Input
                placeholder="Min narx"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                placeholder="Max narx"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Saralash" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Mashhur</SelectItem>
                <SelectItem value="newest">Yangi</SelectItem>
                <SelectItem value="price_asc">Narx: Arzon</SelectItem>
                <SelectItem value="price_desc">Narx: Qimmat</SelectItem>
                <SelectItem value="rating">Reyting</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters} className="bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              Tozalash
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Mahsulot topilmadi</h3>
            <p className="text-gray-600 mb-4">Qidiruv shartlaringizni o'zgartiring yoki boshqa kategoriyani tanlang</p>
            <Button onClick={clearFilters}>Barcha mahsulotlarni ko'rish</Button>
          </div>
        )}

        {/* Load More */}
        {products.length >= 24 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              Ko'proq yuklash
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
