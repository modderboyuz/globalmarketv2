"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart, Star, Award, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface FavoriteProduct {
  id: string
  created_at: string
  products: {
    id: string
    name: string
    description: string
    price: number
    image_url: string
    stock_quantity: number
    rating: number
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
}

export default function FavoritesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      setUser(currentUser)
      await fetchFavorites(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    }
  }

  const fetchFavorites = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          created_at,
          products (
            id,
            name,
            description,
            price,
            image_url,
            stock_quantity,
            rating,
            order_count,
            categories (
              name_uz,
              icon
            ),
            users (
              full_name,
              company_name,
              is_verified_seller
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setFavorites(data || [])
    } catch (error) {
      console.error("Error fetching favorites:", error)
      toast.error("Sevimlilarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (productId: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId)

      if (error) throw error

      setFavorites(favorites.filter((fav) => fav.products.id !== productId))
      toast.success("Sevimlilardan olib tashlandi")
    } catch (error) {
      console.error("Error removing favorite:", error)
      toast.error("Xatolik yuz berdi")
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
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

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Sevimli mahsulotlar</h1>
              <p className="text-gray-600 text-lg">Sizga yoqqan mahsulotlar</p>
            </div>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
              <Heart className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sevimli mahsulotlar yo'q</h3>
            <p className="text-gray-600 mb-6">Yoqqan mahsulotlaringizni sevimlilar ro'yxatiga qo'shing</p>
            <Button onClick={() => router.push("/products")} className="bg-blue-600 hover:bg-blue-700">
              Mahsulotlarni ko'rish
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                <span className="font-semibold">{favorites.length}</span> ta sevimli mahsulot
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((favorite) => (
                <Card
                  key={favorite.id}
                  className="card-hover cursor-pointer group overflow-hidden"
                  onClick={() => router.push(`/product/${favorite.products.id}`)}
                >
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      <Image
                        src={favorite.products.image_url || "/placeholder.svg?height=300&width=300"}
                        alt={favorite.products.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <Badge className="badge-beautiful border-blue-200 text-blue-700">
                          {favorite.products.categories?.icon} {favorite.products.categories?.name_uz}
                        </Badge>
                        {favorite.products.users?.is_verified_seller && (
                          <Badge className="badge-beautiful border-green-200 text-green-700">
                            <Award className="h-3 w-3 mr-1" />
                            Tasdiqlangan
                          </Badge>
                        )}
                      </div>

                      {/* Remove from favorites */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="icon"
                          variant="destructive"
                          className="rounded-full bg-red-500/90 backdrop-blur-sm border-2 border-white/50 hover:bg-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFavorite(favorite.products.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Stock Status */}
                      {favorite.products.stock_quantity < 10 && favorite.products.stock_quantity > 0 && (
                        <div className="absolute bottom-3 left-3">
                          <Badge variant="destructive" className="text-xs">
                            Kam qoldi: {favorite.products.stock_quantity}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="mb-2">
                        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                          {favorite.products.name}
                        </h3>
                      </div>

                      {/* Seller Info */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {favorite.products.users?.company_name?.charAt(0) ||
                              favorite.products.users?.full_name?.charAt(0) ||
                              "G"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {favorite.products.users?.company_name ||
                            favorite.products.users?.full_name ||
                            "GlobalMarket"}
                        </span>
                      </div>

                      {/* Rating and Orders */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{favorite.products.rating}</span>
                          <span className="text-sm text-gray-500">({favorite.products.order_count})</span>
                        </div>
                        <span className="text-xs text-gray-500">Qo'shilgan: {formatDate(favorite.created_at)}</span>
                      </div>

                      {/* Price and Action */}
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-blue-600">{formatPrice(favorite.products.price)}</div>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/product/${favorite.products.id}`)
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
