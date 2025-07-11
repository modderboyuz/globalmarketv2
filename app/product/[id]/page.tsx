"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Star,
  User,
  Phone,
  MapPin,
  ArrowLeft,
  Heart,
  Share2,
  Package,
  Shield,
  RefreshCw,
  Plus,
  Minus,
  Award,
  Zap,
  Eye,
  ShoppingCart,
  LogIn,
  MessageSquare,
} from "lucide-react"
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
  view_count: number
  like_count: number
  average_rating: number
  categories: {
    name_uz: string
  }
  users: {
    full_name: string
    is_verified_seller: boolean
    company_name: string
    id: string
    username: string
  }
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  users: {
    full_name: string
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    if (productId) {
      fetchProductDetails()
      checkUser()
      incrementViewCount()
    }
  }, [productId])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)

    if (currentUser?.user_metadata) {
      setFormData({
        fullName: currentUser.user_metadata.full_name || "",
        phone: currentUser.user_metadata.phone || "",
        address: currentUser.user_metadata.address || "",
      })
    }

    if (currentUser) {
      checkLikeStatus(currentUser.id)
    }
  }

  const fetchProductDetails = async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`
          *,
          categories!products_category_id_fkey (
            name_uz
          ),
          users!products_seller_id_fkey (
            full_name,
            is_verified_seller,
            company_name,
            id,
            username
          )
        `)
        .eq("id", productId)
        .single()

      if (productError) throw productError
      setProduct(productData)

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("product_reviews")
        .select(`
          *,
          users (full_name)
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })

      setReviews(reviewsData || [])

      // Fetch similar products from same category
      if (productData.category_id) {
        const { data: similarData } = await supabase
          .from("products")
          .select(`
            *,
            categories!products_category_id_fkey (
              name_uz
            ),
            users!products_seller_id_fkey (
              full_name,
              is_verified_seller,
              company_name,
              id,
              username
            )
          `)
          .eq("category_id", productData.category_id)
          .neq("id", productId)
          .eq("is_active", true)
          .limit(30)
          .order("order_count", { ascending: false })

        setSimilarProducts(similarData || [])
      }
    } catch (error) {
      console.error("Error fetching product details:", error)
      toast.error("Mahsulot ma'lumotlarini olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const incrementViewCount = async () => {
    try {
      await supabase.rpc("increment_view_count", { product_id: productId })
    } catch (error) {
      console.error("Error incrementing view count:", error)
    }
  }

  const checkLikeStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/likes?productId=${productId}&userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setIsLiked(result.isLiked)
      }
    } catch (error) {
      console.error("Error checking like status:", error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast.error("Like qilish uchun tizimga kiring")
      return
    }

    setLikeLoading(true)

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          userId: user.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsLiked(result.liked)
        // Update product like count
        if (product) {
          setProduct({
            ...product,
            like_count: result.liked ? product.like_count + 1 : product.like_count - 1,
          })
        }
        toast.success(result.liked ? "Like qilindi" : "Like olib tashlandi")
      }
    } catch (error) {
      console.error("Error handling like:", error)
      toast.error("Like qilishda xatolik")
    } finally {
      setLikeLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    if (!product) return

    setCartLoading(true)

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          userId: user.id,
          quantity: quantity,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Mahsulot savatga qo'shildi!")
      } else {
        throw new Error(result.error || "Savatga qo'shishda xatolik")
      }
    } catch (error: any) {
      toast.error(error.message || "Savatga qo'shishda xatolik yuz berdi")
    } finally {
      setCartLoading(false)
    }
  }

  const handleOrderClick = () => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }
    setShowOrderDialog(true)
  }

  const handleImmediateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    if (!formData.fullName || !formData.phone || !formData.address) {
      toast.error("Barcha maydonlarni to'ldiring")
      return
    }

    if (product.stock_quantity < quantity) {
      toast.error("Yetarli miqdorda mahsulot yo'q")
      return
    }

    setOrderLoading(true)

    try {
      const orderData = {
        productId: product.id,
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        quantity: quantity,
        userId: user?.id || null,
        orderType: "immediate",
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Buyurtma berishda xatolik")
      }

      toast.success("Buyurtma muvaffaqiyatli berildi! Sizga tez orada aloqaga chiqamiz.")

      // Reset form
      setFormData({ fullName: "", phone: "", address: "" })
      setQuantity(1)
      setShowOrderDialog(false)

      // Update product stock in UI
      setProduct((prev) => (prev ? { ...prev, stock_quantity: prev.stock_quantity - quantity } : null))

      // Redirect to orders page if user is logged in
      if (user) {
        setTimeout(() => {
          router.push("/orders")
        }, 2000)
      }
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    } finally {
      setOrderLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: url,
        })
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(url)
      }
    } else {
      copyToClipboard(url)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Havola nusxalandi!")
    } catch (error) {
      toast.error("Havolani nusxalashda xatolik")
    }
  }

  const handleTelegramOrder = () => {
    if (product?.users?.username === "admin") {
      const botUrl = `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || "globalmarketshopbot"}?start=product_${productId}`
      window.open(botUrl, "_blank")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case "book":
        return "📚"
      case "pen":
        return "🖊️"
      case "notebook":
        return "📓"
      case "pencil":
        return "✏️"
      default:
        return "📦"
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ))
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Mahsulot topilmadi</h1>
          <Button onClick={() => router.push("/")} className="btn-primary">
            Bosh sahifaga qaytish
          </Button>
        </div>
      </div>
    )
  }

  // Check if this product is from admin (username === 'admin')
  const isAdminProduct = product.users?.username === "admin"

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product Details */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product Image */}
              <div className="space-y-4">
                <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                  <Image
                    src={product.image_url || "/placeholder.svg?height=600&width=600"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full bg-white/90 backdrop-blur-sm"
                      onClick={handleLike}
                      disabled={likeLoading}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full bg-white/90 backdrop-blur-sm"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <Badge className="bg-white/90 text-gray-800 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {product.view_count || 0}
                    </Badge>
                    <Badge className="bg-white/90 text-gray-800 flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {product.like_count || 0}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="badge-beautiful border-blue-200 text-blue-700">
                      {getProductTypeIcon(product.product_type)} {product.categories?.name_uz || "Kategoriya"}
                    </Badge>
                    {product.users?.is_verified_seller && (
                      <Badge className="badge-beautiful border-green-200 text-green-700">
                        <Award className="h-3 w-3 mr-1" />
                        Tasdiqlangan sotuvchi
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

                  {product.author && <p className="text-xl text-gray-600 mb-2">Muallif: {product.author}</p>}
                  {product.brand && <p className="text-xl text-gray-600 mb-4">Brend: {product.brand}</p>}

                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-1">
                      <div className="flex">{renderStars(Math.round(product.average_rating || 0))}</div>
                      <span className="font-semibold">{(product.average_rating || 0).toFixed(1)}</span>
                      <span className="text-gray-500">({reviews.length} sharh)</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-gray-500">{product.order_count || 0} marta sotilgan</span>
                  </div>

                  <div className="text-4xl font-bold text-blue-600 mb-6">{formatPrice(product.price)}</div>
                </div>

                {/* Seller Info */}
                <div className="card-beautiful p-4">
                  <h3 className="font-semibold mb-2">Sotuvchi ma'lumotlari</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold">{product.users?.full_name?.charAt(0) || "?"}</span>
                    </div>
                    <div>
                      <p className="font-medium">
                        <Link
                          href={`/seller/${product.users.id}`}
                          className="hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {product.users?.company_name || product.users?.full_name || "Noma'lum sotuvchi"}
                        </Link>
                      </p>
                      {product.users?.is_verified_seller && (
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Tasdiqlangan sotuvchi
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span>Tez yetkazib berish</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span>Kafolat bilan</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <span>Qaytarish mumkin</span>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Tavsif</h3>
                    <p className="text-gray-600 leading-relaxed">{product.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div className="mt-12">
                <h3 className="text-2xl font-bold mb-6">Sharhlar ({reviews.length})</h3>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="card-beautiful">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{review.users.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">{renderStars(review.rating)}</div>
                              <span className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString("uz-UZ")}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.comment && <p className="text-gray-700">{review.comment}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Options */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quantity Selector */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle>Miqdor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="rounded-full border-2"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="rounded-full border-2"
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">Mavjud: {product.stock_quantity} dona</p>
                {product.stock_quantity === 0 && (
                  <p className="text-center text-sm text-red-500 mt-2 font-medium">Mahsulot tugagan</p>
                )}
              </CardContent>
            </Card>

            {/* Add to Cart */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Savatga qo'shish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">{formatPrice(product.price * quantity)}</div>
                    <p className="text-sm text-gray-500">Jami summa</p>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    className="w-full btn-primary text-lg py-6"
                    disabled={cartLoading || product.stock_quantity === 0 || quantity > product.stock_quantity}
                  >
                    {cartLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Qo'shilmoqda...
                      </>
                    ) : product.stock_quantity === 0 ? (
                      "Mahsulot tugagan"
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Savatga qo'shish
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Options */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Buyurtma berish
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleOrderClick}
                  className="w-full btn-primary text-lg py-6"
                  disabled={product.stock_quantity === 0 || quantity > product.stock_quantity}
                >
                  {product.stock_quantity === 0 ? (
                    "Mahsulot tugagan"
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Buyurtma berish
                    </>
                  )}
                </Button>

                {/* Only show Telegram option for admin products */}
                {isAdminProduct && (
                  <Button
                    onClick={handleTelegramOrder}
                    variant="outline"
                    className="w-full bg-transparent border-blue-200 text-blue-600 hover:bg-blue-50"
                    disabled={product.stock_quantity === 0}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Telegram orqali buyurtma
                  </Button>
                )}

                <p className="text-xs text-gray-500 text-center">
                  Buyurtma bergandan so'ng sizga tez orada aloqaga chiqamiz
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold mb-8">Shunga o'xshash mahsulotlar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {similarProducts.slice(0, 10).map((similarProduct) => (
                <Link key={similarProduct.id} href={`/product/${similarProduct.id}`}>
                  <Card className="card-beautiful hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="relative aspect-square rounded-t-2xl overflow-hidden bg-gray-100">
                      <Image
                        src={similarProduct.image_url || "/placeholder.svg?height=200&width=200"}
                        alt={similarProduct.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-white/90 text-gray-800 text-xs">
                          {getProductTypeIcon(similarProduct.product_type)}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2">{similarProduct.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                          {renderStars(Math.round(similarProduct.average_rating || 0)).slice(0, 5)}
                        </div>
                        <span className="text-xs text-gray-500">({similarProduct.order_count || 0})</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">{formatPrice(similarProduct.price)}</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {similarProduct.users?.company_name || similarProduct.users?.full_name}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buyurtma berish</DialogTitle>
            <DialogDescription>
              Buyurtma berish uchun tizimga kirishingiz kerak
              {isAdminProduct && " yoki Telegram bot orqali buyurtma berishingiz mumkin"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button onClick={() => router.push("/login")} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Google orqali kirish
            </Button>
            {isAdminProduct && (
              <Button onClick={handleTelegramOrder} variant="outline" className="w-full bg-transparent">
                <MessageSquare className="mr-2 h-4 w-4" />
                Telegram bot orqali buyurtma
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLoginDialog(false)}>
              Bekor qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buyurtma berish</DialogTitle>
            <DialogDescription>{product?.name} mahsuloti uchun buyurtma ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImmediateOrder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">To'liq ism *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="fullName"
                  placeholder="Ism Familiya"
                  className="input-beautiful pl-10"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqam *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  placeholder="+998 90 123 45 67"
                  className="input-beautiful pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Manzil *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="address"
                  placeholder="To'liq manzil: shahar, tuman, ko'cha, uy raqami"
                  className="input-beautiful pl-10 min-h-[80px]"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Jami:</span>
                <span className="text-blue-600">{formatPrice(product?.price * quantity || 0)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowOrderDialog(false)}>
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={orderLoading || product?.stock_quantity === 0 || quantity > (product?.stock_quantity || 0)}
              >
                {orderLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Buyurtma berilmoqda...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Buyurtma berish
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
