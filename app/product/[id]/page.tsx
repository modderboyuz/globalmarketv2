"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Heart,
  ShoppingCart,
  Truck,
  Shield,
  RotateCcw,
  User,
  Phone,
  Package,
  Star,
  Eye,
  Share2,
  ArrowLeft,
  Plus,
  Minus,
  Clock,
  CheckCircle,
  Send,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  category_id: string
  seller_id: string
  has_delivery: boolean
  delivery_price: number
  has_warranty: boolean
  warranty_period: string
  has_return: boolean
  return_period: string
  is_active: boolean
  view_count: number
  like_count: number
  order_count: number
  average_rating: number
  created_at: string
  author?: string
  brand?: string
  categories: {
    name: string
    icon: string
  }
  users: {
    full_name: string
    phone: string
    company_name?: string
    is_verified_seller: boolean
    username?: string
  }
}

interface SimilarProduct {
  id: string
  name: string
  price: number
  image_url: string
  average_rating: number
  like_count: number
  order_count: number
  stock_quantity: number
  users: {
    full_name: string
    company_name?: string
    is_verified_seller: boolean
  }
}

interface Neighborhood {
  id: string
  name: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [showQuickOrder, setShowQuickOrder] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [quickOrderForm, setQuickOrderForm] = useState({
    full_name: "",
    phone: "",
    neighborhood: "",
    street: "",
    house_number: "",
    with_delivery: false,
  })

  useEffect(() => {
    if (params.id) {
      fetchProduct()
      fetchLikeStatus()
      checkUser()
      fetchNeighborhoods()
      incrementViewCount()
    }
  }, [params.id])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      // Get user profile data
      const { data: profile } = await supabase
        .from("users")
        .select("full_name, phone, username")
        .eq("id", user.id)
        .single()

      if (profile) {
        setQuickOrderForm((prev) => ({
          ...prev,
          full_name: profile.full_name || "",
          phone: profile.phone || "",
        }))

        // Check if user is admin
        setIsAdmin(profile.username === "admin")
      }
    }
  }

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name, icon),
          users (full_name, phone, company_name, is_verified_seller, username)
        `)
        .eq("id", params.id)
        .eq("is_active", true)
        .single()

      if (error) throw error
      setProduct(data)

      // Fetch similar products
      if (data.category_id) {
        fetchSimilarProducts(data.category_id, data.id)
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      toast.error("Mahsulotni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchSimilarProducts = async (categoryId: string, currentProductId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          image_url,
          average_rating,
          like_count,
          order_count,
          stock_quantity,
          users (full_name, company_name, is_verified_seller)
        `)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .eq("is_approved", true)
        .neq("id", currentProductId)
        .gt("stock_quantity", 0)
        .order("order_count", { ascending: false })
        .limit(8)

      if (error) throw error
      setSimilarProducts(data || [])
    } catch (error) {
      console.error("Error fetching similar products:", error)
    }
  }

  const incrementViewCount = async () => {
    try {
      await supabase.rpc("increment_view_count", { product_id: params.id })
    } catch (error) {
      console.error("Error incrementing view count:", error)
    }
  }

  const fetchLikeStatus = async () => {
    try {
      const response = await fetch(`/api/likes?product_id=${params.id}`)
      const data = await response.json()

      if (data.success) {
        setIsLiked(data.liked)
        setLikesCount(data.likes_count)
      }
    } catch (error) {
      console.error("Error fetching like status:", error)
    }
  }

  const fetchNeighborhoods = async () => {
    try {
      const response = await fetch("/api/neighborhoods")
      const data = await response.json()
      if (data.success) {
        setNeighborhoods(data.neighborhoods)
      }
    } catch (error) {
      console.error("Error fetching neighborhoods:", error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast.error("Yoqtirish uchun tizimga kiring")
      return
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: params.id }),
      })

      const data = await response.json()

      if (data.success) {
        setIsLiked(data.liked)
        setLikesCount((prev) => (data.liked ? prev + 1 : prev - 1))
        toast.success(data.message)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Savatga qo'shish uchun tizimga kiring")
      return
    }

    if (!product) return

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: quantity,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Mahsulot savatga qo'shildi")
      } else {
        toast.error(data.error || "Savatga qo'shishda xatolik")
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast.error("Savatga qo'shishda xatolik")
    }
  }

  const handleQuickOrder = async () => {
    if (!product) return

    if (!quickOrderForm.full_name || !quickOrderForm.phone) {
      toast.error("Ism va telefon raqam majburiy")
      return
    }

    if (quickOrderForm.with_delivery && product.has_delivery) {
      if (!quickOrderForm.neighborhood || !quickOrderForm.street || !quickOrderForm.house_number) {
        toast.error("Yetkazib berish uchun to'liq manzil majburiy")
        return
      }
    }

    try {
      const token = user ? (await supabase.auth.getSession()).data.session?.access_token : null

      const orderData = {
        product_id: product.id,
        full_name: quickOrderForm.full_name,
        phone: quickOrderForm.phone,
        address:
          quickOrderForm.with_delivery && product.has_delivery
            ? `${quickOrderForm.neighborhood}, ${quickOrderForm.street}, ${quickOrderForm.house_number}`
            : "Do'kondan olib ketish",
        quantity: quantity,
        with_delivery: quickOrderForm.with_delivery && product.has_delivery,
        neighborhood: quickOrderForm.with_delivery ? quickOrderForm.neighborhood : null,
        street: quickOrderForm.with_delivery ? quickOrderForm.street : null,
        house_number: quickOrderForm.with_delivery ? quickOrderForm.house_number : null,
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Buyurtma muvaffaqiyatli yaratildi!")
        setShowQuickOrder(false)
        if (user) {
          router.push("/orders")
        }
      } else {
        toast.error(data.error || "Buyurtma yaratishda xatolik")
      }
    } catch (error) {
      console.error("Error creating order:", error)
      toast.error("Buyurtma yaratishda xatolik")
    }
  }

  const handleTelegramOrder = () => {
    if (!product) return

    const telegramUrl = `https://t.me/GlobalMarketshopBot?start=order_${product.id}`
    window.open(telegramUrl, "_blank")
  }

  const calculateTotal = () => {
    if (!product) return 0
    let total = product.price * quantity
    if (quickOrderForm.with_delivery && product.has_delivery) {
      total += product.delivery_price
    }
    return total
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success("Havola nusxalandi")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="aspect-square bg-gray-200 rounded-3xl"></div>
              <div className="space-y-6">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="flex gap-4">
                  <div className="h-12 bg-gray-200 rounded flex-1"></div>
                  <div className="h-12 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-3xl flex items-center justify-center mb-6">
            <Package className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-800">Mahsulot topilmadi</h2>
          <p className="text-gray-600 mb-6">Kechirasiz, bu mahsulot mavjud emas yoki o'chirilgan</p>
          <Button onClick={() => router.push("/products")} className="btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Mahsulotlarga qaytish
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-4 lg:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>
          <span className="text-gray-400">/</span>
          <Link href="/products" className="text-blue-600 hover:underline text-sm">
            Mahsulotlar
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 text-sm truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-[4/3] relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-2xl">
              <Image
                src={product.image_url || "/placeholder.svg?height=600&width=600"}
                alt={product.name}
                fill
                className="object-contain p-4"
                priority
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Badge className="bg-white/90 text-gray-800 shadow-lg">
                  {product.categories?.icon} {product.categories?.name}
                </Badge>
                {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                  <Badge className="bg-orange-500 text-white shadow-lg">
                    <Clock className="h-3 w-3 mr-1" />
                    Kam qoldi: {product.stock_quantity}
                  </Badge>
                )}
                {product.stock_quantity === 0 && <Badge className="bg-red-500 text-white shadow-lg">Tugagan</Badge>}
              </div>
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                  onClick={handleLike}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Card className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <Eye className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-700">{product.view_count || 0}</div>
                <div className="text-xs text-blue-600">Ko'rishlar</div>
              </Card>
              <Card className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <Heart className="h-5 w-5 text-red-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-red-700">{likesCount}</div>
                <div className="text-xs text-red-600">Yoqtirishlar</div>
              </Card>
              <Card className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <ShoppingCart className="h-5 w-5 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-700">{product.order_count || 0}</div>
                <div className="text-xs text-green-600">Sotilgan</div>
              </Card>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.average_rating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-2">({product.order_count || 0} sotilgan)</span>
                </div>
              </div>

              {product.author && (
                <p className="text-gray-600 mb-2">
                  <strong>Muallif:</strong> {product.author}
                </p>
              )}
              {product.brand && (
                <p className="text-gray-600 mb-4">
                  <strong>Brend:</strong> {product.brand}
                </p>
              )}
            </div>

            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {product.price.toLocaleString()} so'm
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border">
                <Label htmlFor="quantity" className="text-lg font-semibold mb-4 block">
                  Miqdor
                </Label>
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-12 h-12 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="text-2xl font-bold w-16 text-center">{quantity}</div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="w-12 h-12 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Mavjud: {product.stock_quantity} dona</p>
                    <p className="text-lg font-bold text-green-600">
                      Jami: {(product.price * quantity).toLocaleString()} so'm
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={handleAddToCart}
                    variant="outline"
                    size="lg"
                    className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 hover:from-gray-100 hover:to-gray-200"
                    disabled={product.stock_quantity === 0}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Savatga qo'shish
                  </Button>

                  <Dialog open={showQuickOrder} onOpenChange={setShowQuickOrder}>
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                        disabled={product.stock_quantity === 0}
                      >
                        <Package className="w-5 h-5 mr-2" />
                        Tezkor buyurtma
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Tezkor buyurtma</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="quick_full_name">To'liq ism *</Label>
                          <Input
                            id="quick_full_name"
                            value={quickOrderForm.full_name}
                            onChange={(e) => setQuickOrderForm((prev) => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Ism Familiya"
                          />
                        </div>

                        <div>
                          <Label htmlFor="quick_phone">Telefon raqam *</Label>
                          <Input
                            id="quick_phone"
                            value={quickOrderForm.phone}
                            onChange={(e) => setQuickOrderForm((prev) => ({ ...prev, phone: e.target.value }))}
                            placeholder="+998 90 123 45 67"
                          />
                        </div>

                        {product.has_delivery && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="quick_with_delivery"
                              checked={quickOrderForm.with_delivery}
                              onCheckedChange={(checked) =>
                                setQuickOrderForm((prev) => ({ ...prev, with_delivery: checked as boolean }))
                              }
                            />
                            <Label htmlFor="quick_with_delivery" className="flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              Yetkazib berish kerak (+{product.delivery_price.toLocaleString()} so'm)
                            </Label>
                          </div>
                        )}

                        {quickOrderForm.with_delivery && product.has_delivery && (
                          <>
                            <div>
                              <Label htmlFor="quick_neighborhood">Mahalla *</Label>
                              <Select
                                value={quickOrderForm.neighborhood}
                                onValueChange={(value) =>
                                  setQuickOrderForm((prev) => ({ ...prev, neighborhood: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Mahallani tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                  {neighborhoods.map((neighborhood) => (
                                    <SelectItem key={neighborhood.id} value={neighborhood.name}>
                                      {neighborhood.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="quick_street">Ko'cha nomi *</Label>
                              <Input
                                id="quick_street"
                                value={quickOrderForm.street}
                                onChange={(e) => setQuickOrderForm((prev) => ({ ...prev, street: e.target.value }))}
                                placeholder="Ko'cha nomi"
                              />
                            </div>

                            <div>
                              <Label htmlFor="quick_house_number">Uy raqami *</Label>
                              <Input
                                id="quick_house_number"
                                value={quickOrderForm.house_number}
                                onChange={(e) =>
                                  setQuickOrderForm((prev) => ({ ...prev, house_number: e.target.value }))
                                }
                                placeholder="Uy raqami"
                              />
                            </div>
                          </>
                        )}

                        <Separator />

                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Mahsulot ({quantity} dona):</span>
                              <span className="font-semibold">{(product.price * quantity).toLocaleString()} so'm</span>
                            </div>

                            {quickOrderForm.with_delivery && product.has_delivery && (
                              <div className="flex justify-between">
                                <span>Yetkazib berish:</span>
                                <span className="font-semibold">{product.delivery_price.toLocaleString()} so'm</span>
                              </div>
                            )}

                            <Separator />

                            <div className="flex justify-between font-bold text-lg text-blue-700">
                              <span>Jami:</span>
                              <span>{calculateTotal().toLocaleString()} so'm</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <Button onClick={handleQuickOrder} className="w-full btn-primary" size="lg">
                            <Package className="w-5 h-5 mr-2" />
                            Buyurtma berish
                          </Button>

                          {/* Telegram Order Button - Only show if seller is admin */}
                          {product.users.username === "admin" && (
                            <Button
                              onClick={handleTelegramOrder}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                              size="lg"
                            >
                              <Send className="w-5 h-5 mr-2" />
                              Telegram orqali buyurtma
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-3">
              {product.has_delivery && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                >
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">Yetkazib berish: {product.delivery_price.toLocaleString()} so'm</span>
                </Badge>
              )}
              {product.has_warranty && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-green-100 border-green-200"
                >
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Kafolat: {product.warranty_period}</span>
                </Badge>
              )}
              {product.has_return && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200"
                >
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                  <span className="text-purple-700">Qaytarish: {product.return_period}</span>
                </Badge>
              )}
            </div>

            {product.description && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-gray-800">Tavsif</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Seller Info */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-indigo-800 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Sotuvchi ma'lumotlari
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-indigo-900">
                        {product.users.company_name || product.users.full_name}
                      </p>
                      {product.users.is_verified_seller && (
                        <Badge className="bg-green-500 text-white text-xs mt-1">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Tasdiqlangan
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-white/50 border-indigo-300 text-indigo-700 hover:bg-white"
                    onClick={() => window.open(`tel:${product.users.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {product.users.phone}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
                Shunga o'xshash mahsulotlar
              </h2>
              <p className="text-gray-600">Sizga yoqishi mumkin bo'lgan boshqa mahsulotlar</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {similarProducts.map((similarProduct) => (
                <Card
                  key={similarProduct.id}
                  className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg"
                  onClick={() => router.push(`/product/${similarProduct.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="relative aspect-square mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                      <Image
                        src={similarProduct.image_url || "/placeholder.svg?height=200&width=200"}
                        alt={similarProduct.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {similarProduct.stock_quantity <= 5 && similarProduct.stock_quantity > 0 && (
                        <Badge className="absolute top-2 left-2 bg-orange-500 text-white text-xs">Kam qoldi</Badge>
                      )}
                      {similarProduct.stock_quantity === 0 && (
                        <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">Tugagan</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {similarProduct.name}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < Math.floor(similarProduct.average_rating || 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">{similarProduct.order_count || 0} sotilgan</div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-blue-600">
                          {similarProduct.price.toLocaleString()} so'm
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Heart className="h-3 w-3" />
                          {similarProduct.like_count || 0}
                        </div>
                      </div>

                      <div className="text-xs text-gray-600">
                        {similarProduct.users.company_name || similarProduct.users.full_name}
                        {similarProduct.users.is_verified_seller && (
                          <Badge className="ml-1 bg-green-500 text-white text-xs">
                            <CheckCircle className="w-2 h-2 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
