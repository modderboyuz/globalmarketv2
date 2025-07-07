"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Star, Package } from "lucide-react"
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
  author: string
  brand: string
  average_rating: number
  categories: {
    name_uz: string
    icon: string
    slug: string
  }
  users: {
    full_name: string
    company_name: string
    username: string
  }
}

export default function TelegramWebApp() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "search"

  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])

  useEffect(() => {
    fetchAllProducts()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery)
    } else {
      setProducts(allProducts)
    }
  }, [searchQuery, allProducts])

  const fetchAllProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name_uz, icon, slug),
          users (full_name, company_name, username)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock_quantity", 0)
        .order("order_count", { ascending: false })
        .limit(100)

      if (error) throw error

      setAllProducts(data || [])
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Mahsulotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setProducts(allProducts)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("products")
          .select(`
          *,
          categories (name_uz, icon, slug),
          users (full_name, company_name, username)
        `)
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,author.ilike.%${query}%,brand.ilike.%${query}%`)
          .eq("is_active", true)
          .eq("is_approved", true)
          .gt("stock_quantity", 0)
          .order("order_count", { ascending: false })
          .limit(50)

        if (error) throw error

        setProducts(data || [])
      } catch (error) {
        console.error("Error searching products:", error)
        toast.error("Qidirishda xatolik")
      } finally {
        setLoading(false)
      }
    },
    [allProducts],
  )

  const handleProductClick = (product: Product) => {
    const categoryName = product.categories.slug
    const botUrl = `https://t.me/globalmarketshopbot?start=${categoryName}&product_id=${product.id}`

    // Use Telegram WebApp API to close and open bot
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(botUrl)
    } else {
      // Fallback for non-Telegram environments
      window.open(botUrl, "_blank")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold gradient-text mb-2">GlobalMarket</h1>
          <p className="text-gray-600">Mahsulotlarni qidiring va sotib oling</p>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Kitob, qalam, daftar qidiring..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-lg rounded-2xl border-2 border-gray-200 focus:border-blue-400 bg-white/80 backdrop-blur-sm"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Qidirilmoqda...</p>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                <span className="font-semibold">{products.length}</span> ta mahsulot
                {searchQuery && (
                  <span>
                    {" "}
                    "<span className="font-semibold">{searchQuery}</span>" uchun
                  </span>
                )}
              </p>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Hech narsa topilmadi</h3>
                <p className="text-gray-600">Boshqa kalit so'zlar bilan qidirib ko'ring</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-blue-300"
                    onClick={() => handleProductClick(product)}
                  >
                    <CardContent className="p-0">
                      {/* Product Image */}
                      <div className="relative aspect-square bg-gray-100 overflow-hidden rounded-t-lg">
                        <Image
                          src={product.image_url || "/placeholder.svg?height=300&width=300"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-white/90 text-gray-700 border-0">
                            {product.categories.icon} {product.categories.name_uz}
                          </Badge>
                        </div>

                        {/* Stock Badge */}
                        {product.stock_quantity < 10 && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="destructive" className="text-xs">
                              Kam qoldi: {product.stock_quantity}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-lg line-clamp-2 mb-2">{product.name}</h3>

                        {product.author && <p className="text-sm text-gray-600 mb-1">Muallif: {product.author}</p>}

                        {product.brand && <p className="text-sm text-gray-600 mb-1">Brend: {product.brand}</p>}

                        {/* Seller Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {product.users?.company_name?.charAt(0) || product.users?.full_name?.charAt(0) || "G"}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">@{product.users?.username || "globalmarket"}</span>
                        </div>

                        {/* Rating and Orders */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{product.average_rating}</span>
                            <span className="text-sm text-gray-500">({product.order_count})</span>
                          </div>
                          <span className="text-sm text-gray-500">{product.order_count} marta sotilgan</span>
                        </div>

                        {/* Price */}
                        <div className="text-xl font-bold text-blue-600">{formatPrice(product.price)}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Telegram WebApp Script */}
      <script src="https://telegram.org/js/telegram-web-app.js" async />
    </div>
  )
}
