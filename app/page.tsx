"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart, Award, TrendingUp, Crown, Store, Heart, Share2 } from "lucide-react"
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
  like_count: number
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

interface TopSeller {
  id: string
  full_name: string
  company_name: string
  is_verified_seller: boolean
  seller_rating: number
  total_sales: number
  product_count: number
}

export default function HomePage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [books, setBooks] = useState<Product[]>([])
  const [topSellers, setTopSellers] = useState<TopSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
    fetchData()
  }, [])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)
  }

  const fetchData = async () => {
    try {
      // Fetch books specifically for homepage
      const { data: booksData, error: booksError } = await supabase
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
        .eq("product_type", "book")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("order_count", { ascending: false })
        .limit(12)

      if (booksError) throw booksError

      // Fetch other popular products
      const { data: productsData, error: productsError } = await supabase
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
        .neq("product_type", "book")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("order_count", { ascending: false })
        .limit(8)

      if (productsError) throw productsError

      // Fetch top sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          company_name,
          is_verified_seller,
          seller_rating,
          total_sales
        `)
        .eq("is_verified_seller", true)
        .order("total_sales", { ascending: false })
        .limit(8)

      if (sellersError) throw sellersError

      // Get product count for each seller
      const sellersWithProductCount = await Promise.all(
        (sellersData || []).map(async (seller) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("seller_id", seller.id)

          return {
            ...seller,
            product_count: count || 0,
          }
        }),
      )

      setBooks(booksData || [])
      setProducts(productsData || [])
      setTopSellers(sellersWithProductCount || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

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

        // Update like count
        await supabase.rpc("decrement_like_count", { product_id: productId })

        toast.success("Like olib tashlandi")
      } else {
        // Like
        await supabase.from("product_likes").insert({ user_id: user.id, product_id: productId })

        // Update like count
        await supabase.rpc("increment_like_count", { product_id: productId })

        toast.success("Like qo'shildi")
      }

      // Refresh data
      fetchData()
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

  const ProductCard = ({ product }: { product: Product }) => (
    <Card
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
            {product.has_delivery && (
              <Badge className="badge-beautiful border-purple-200 text-purple-700">🚚 Yetkazib berish</Badge>
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
              <span className="text-sm font-medium">{product.rating}</span>
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
  )

  if (loading) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          {/* Books Grid Skeleton */}
          <div className="mb-12">
            <div className="h-8 bg-gray-200 rounded-xl animate-pulse mb-6 max-w-xs"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="card-beautiful p-4">
                  <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
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
        {/* Books Section - Main Focus */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                <span className="text-white text-2xl">📚</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold gradient-text">Kitoblar</h2>
                <p className="text-gray-600">O'zbek va jahon adabiyoti</p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/category/kitoblar")}
              variant="outline"
              className="border-2 border-green-200 hover:border-green-400 hover:bg-green-50"
            >
              Barchasini ko'rish
            </Button>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
                <span className="text-6xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Kitoblar topilmadi</h3>
              <p className="text-gray-600">Hozircha kitoblar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {books.map((book) => (
                <ProductCard key={book.id} product={book} />
              ))}
            </div>
          )}
        </section>

        {/* Other Products Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold gradient-text">Boshqa Mahsulotlar</h2>
                <p className="text-gray-600">Maktab va ofis buyumlari</p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/products")}
              variant="outline"
              className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
            >
              Barchasini ko'rish
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
                <ShoppingCart className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Mahsulotlar topilmadi</h3>
              <p className="text-gray-600">Hozircha boshqa mahsulotlar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Top Sellers Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold gradient-text">Top Sotuvchilar</h2>
                <p className="text-gray-600">Eng yaxshi va ishonchli sotuvchilar</p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/sellers")}
              variant="outline"
              className="border-2 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50"
            >
              Barchasini ko'rish
            </Button>
          </div>

          {topSellers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
                <Store className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sotuvchilar topilmadi</h3>
              <p className="text-gray-600">Hozircha top sotuvchilar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topSellers.map((seller, index) => (
                <Card
                  key={seller.id}
                  className="card-hover cursor-pointer group text-center"
                  onClick={() => router.push(`/seller/${seller.id}`)}
                >
                  <CardContent className="p-6">
                    {/* Seller Avatar */}
                    <div className="relative mb-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">
                          {seller.company_name?.charAt(0) || seller.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                          <Crown className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {seller.is_verified_seller && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Award className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Seller Info */}
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors duration-300">
                        {seller.company_name || seller.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">{seller.full_name}</p>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Reyting:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{seller.seller_rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Sotilgan:</span>
                        <span className="font-medium">{seller.total_sales}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mahsulotlar:</span>
                        <span className="font-medium">{seller.product_count}</span>
                      </div>
                    </div>

                    {/* View Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/seller/${seller.id}`)
                      }}
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Do'konni ko'rish
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
