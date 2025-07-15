"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Truck,
  Shield,
  RotateCcw,
  Award,
  Phone,
  User,
  Package,
  Eye,
  MessageSquare,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  product_type: string
  brand: string
  author: string
  average_rating: number
  like_count: number
  order_count: number
  view_count: number
  has_delivery: boolean
  delivery_price: number
  has_warranty: boolean
  warranty_period: string
  has_return: boolean
  return_period: string
  created_at: string
  seller_id: string
  category_id: string
  categories: {
    name: string
    icon: string
  }
  users: {
    id: string
    full_name: string
    company_name: string
    phone: string
    is_verified_seller: boolean
    seller_rating: number
    created_at: string
  }
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  users: {
    full_name: string
    avatar_url: string
  }
}

interface SimilarProduct {
  id: string
  name: string
  price: number
  image_url: string
  average_rating: number
  order_count: number
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [orderData, setOrderData] = useState({
    full_name: "",
    phone: "",
    address: "",
    quantity: 1,
    with_delivery: false,
    neighborhood: "",
    street: "",
    house_number: "",
  })
  const [orderLoading, setOrderLoading] = useState(false)

  useEffect(() => {
    checkUser()
    fetchProduct()
  }, [params.id])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)

    if (currentUser) {
      // Get user profile data
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, phone, address")
        .eq("id", currentUser.id)
        .single()

      if (userData) {
        setOrderData((prev) => ({
          ...prev,
          full_name: userData.full_name || "",
          phone: userData.phone || "",
          address: userData.address || "",
        }))
      }
    }
  }

  const fetchProduct = async () => {
    try {
      // Increment view count
      await supabase.rpc("increment_view_count", { product_id: params.id })

      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            name,
            icon
          ),
          users (
            id,
            full_name,
            company_name,
            phone,
            is_verified_seller,
            seller_rating,
            created_at
          )
        `)
        .eq("id", params.id)
        .single()

      if (productError || !productData) {
        toast.error("Mahsulot topilmadi")
        router.push("/products")
        return
      }

      setProduct(productData)

      // Check if user liked this product
      if (user) {
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", params.id)
          .single()

        setIsLiked(!!likeData)
      }

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          *,
          users (
            full_name,
            avatar_url
          )
        `)
        .eq("product_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10)

      setReviews(reviewsData || [])

      // Fetch similar products
      const { data: similarData } = await supabase
        .from("products")
        .select("id, name, price, image_url, average_rating, order_count")
        .eq("category_id", productData.category_id)
        .neq("id", params.id)
        .eq("is_active", true)
        .eq("is_approved", true)
        .limit(8)

      setSimilarProducts(similarData || [])
    } catch (error) {
      console.error("Error fetching product:", error)
      toast.error("Mahsulotni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
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
        body: JSON.stringify({ product_id: params.id }),
      })

      const data = await response.json()

      if (data.success) {
        setIsLiked(data.liked)
        toast.success(data.message)
        // Update like count in product
        if (product) {
          setProduct({
            ...product,
            like_count: data.liked ? product.like_count + 1 : product.like_count - 1,
          })
        }
      } else {
        toast.error(data.error || "Xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Error handling like:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/product/${params.id}`
    const shareText = `${product?.name} - ${formatPrice(product?.price || 0)}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Havola nusxalandi!")
      } catch (error) {
        toast.error("Havolani nusxalashda xatolik")
      }
    }
  }

  const handleOrder = async () => {
    if (!orderData.full_name || !orderData.phone || !orderData.address) {
      toast.error("Barcha majburiy maydonlarni to'ldiring")
      return
    }

    if (orderData.quantity <= 0) {
      toast.error("Miqdor 0 dan katta bo'lishi kerak")
      return
    }

    if (product && orderData.quantity > product.stock_quantity) {
      toast.error("Yetarli mahsulot yo'q")
      return
    }

    setOrderLoading(true)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          product_id: params.id,
          ...orderData,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Buyurtma muvaffaqiyatli yaratildi!")
        setShowOrderDialog(false)
        // Refresh product to update stock
        fetchProduct()
      } else {
        toast.error(data.error || "Buyurtma yaratishda xatolik")
      }
    } catch (error) {
      console.error("Error creating order:", error)
      toast.error("Buyurtma yaratishda xatolik")
    } finally {
      setOrderLoading(false)
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-2xl"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Mahsulot topilmadi</h3>
          <p className="text-gray-600 mb-4">Ushbu mahsulot mavjud emas yoki o'chirilgan</p>
          <Link href="/products">
            <Button>Mahsulotlarga qaytish</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">
            Bosh sahifa
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-blue-600">
            Mahsulotlar
          </Link>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={product.image_url || "/placeholder.svg?height=600&width=600"}
                alt={product.name}
                fill
                className="object-cover"
              />
              {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                <Badge className="absolute top-4 left-4 bg-orange-500">Kam qoldi: {product.stock_quantity}</Badge>
              )}
              {product.stock_quantity === 0 && <Badge className="absolute top-4 left-4 bg-red-500">Tugagan</Badge>}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {product.categories?.icon} {product.categories?.name}
                </Badge>
                {product.users?.is_verified_seller && (
                  <Badge className="bg-green-100 text-green-800">
                    <Award className="h-3 w-3 mr-1" />
                    Tasdiqlangan sotuvchi
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.author && <p className="text-gray-600 mb-1">Muallif: {product.author}</p>}
              {product.brand && <p className="text-gray-600 mb-1">Brend: {product.brand}</p>}
            </div>

            {/* Rating and Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{product.average_rating}</span>
                <span className="text-gray-500">({product.order_count} buyurtma)</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                <span className="text-gray-500">{product.like_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-5 w-5 text-gray-400" />
                <span className="text-gray-500">{product.view_count}</span>
              </div>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-blue-600">{formatPrice(product.price)}</div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Tavsif</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.has_delivery && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Truck className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Yetkazib berish</p>
                    <p className="text-sm text-green-600">
                      {product.delivery_price > 0 ? formatPrice(product.delivery_price) : "Bepul"}
                    </p>
                  </div>
                </div>
              )}
              {product.has_warranty && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Kafolat</p>
                    <p className="text-sm text-blue-600">{product.warranty_period}</p>
                  </div>
                </div>
              )}
              {product.has_return && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <RotateCcw className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-800">Qaytarish</p>
                    <p className="text-sm text-purple-600">{product.return_period}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
                <DialogTrigger asChild>
                  <Button size="lg" className="flex-1 btn-primary" disabled={product.stock_quantity === 0}>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    {product.stock_quantity === 0 ? "Tugagan" : "Sotib olish"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Buyurtma berish</DialogTitle>
                    <DialogDescription>Buyurtma ma'lumotlarini to'ldiring</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">To'liq ism *</Label>
                      <Input
                        id="full_name"
                        value={orderData.full_name}
                        onChange={(e) => setOrderData({ ...orderData, full_name: e.target.value })}
                        placeholder="Ismingizni kiriting"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefon *</Label>
                      <Input
                        id="phone"
                        value={orderData.phone}
                        onChange={(e) => setOrderData({ ...orderData, phone: e.target.value })}
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Manzil *</Label>
                      <Textarea
                        id="address"
                        value={orderData.address}
                        onChange={(e) => setOrderData({ ...orderData, address: e.target.value })}
                        placeholder="To'liq manzilingizni kiriting"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantity">Miqdor</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={product.stock_quantity}
                        value={orderData.quantity}
                        onChange={(e) => setOrderData({ ...orderData, quantity: Number(e.target.value) })}
                      />
                    </div>
                    {product.has_delivery && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="delivery">Yetkazib berish</Label>
                          <Switch
                            id="delivery"
                            checked={orderData.with_delivery}
                            onCheckedChange={(checked) => setOrderData({ ...orderData, with_delivery: checked })}
                          />
                        </div>
                        {orderData.with_delivery && (
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Mahalla"
                              value={orderData.neighborhood}
                              onChange={(e) => setOrderData({ ...orderData, neighborhood: e.target.value })}
                            />
                            <Input
                              placeholder="Ko'cha"
                              value={orderData.street}
                              onChange={(e) => setOrderData({ ...orderData, street: e.target.value })}
                            />
                            <Input
                              placeholder="Uy"
                              value={orderData.house_number}
                              onChange={(e) => setOrderData({ ...orderData, house_number: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>Mahsulot narxi:</span>
                        <span>{formatPrice(product.price * orderData.quantity)}</span>
                      </div>
                      {orderData.with_delivery && product.delivery_price > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Yetkazib berish:</span>
                          <span>{formatPrice(product.delivery_price)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center font-bold">
                        <span>Jami:</span>
                        <span>
                          {formatPrice(
                            product.price * orderData.quantity + (orderData.with_delivery ? product.delivery_price : 0),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleOrder} disabled={orderLoading} className="flex-1">
                      {orderLoading ? "Yuklanmoqda..." : "Buyurtma berish"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowOrderDialog(false)} className="bg-transparent">
                      Bekor qilish
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="lg"
                onClick={handleLike}
                className={`bg-transparent ${isLiked ? "text-red-600 border-red-200" : ""}`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
              </Button>

              <Button variant="outline" size="lg" onClick={handleShare} className="bg-transparent">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Seller Info */}
        <Card className="card-beautiful mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Sotuvchi haqida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {product.users?.company_name?.charAt(0) || product.users?.full_name?.charAt(0) || "S"}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">
                  {product.users?.company_name || product.users?.full_name}
                </h3>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{product.users?.seller_rating || 0}</span>
                  </div>
                  {product.users?.is_verified_seller && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      Tasdiqlangan
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">{formatDate(product.users?.created_at || "")} dan beri</span>
                </div>
                <div className="flex gap-2">
                  {product.users?.phone && (
                    <Button size="sm" onClick={() => window.open(`tel:${product.users.phone}`)}>
                      <Phone className="h-4 w-4 mr-2" />
                      Qo'ng'iroq qilish
                    </Button>
                  )}
                  <Link href={`/seller/${product.seller_id}`}>
                    <Button size="sm" variant="outline" className="bg-transparent">
                      <Eye className="h-4 w-4 mr-2" />
                      Sotuvchini ko'rish
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card className="card-beautiful mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Sharhlar ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {review.users?.full_name?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{review.users?.full_name || "Anonim"}</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                O'xshash mahsulotlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {similarProducts.map((similarProduct) => (
                  <Link key={similarProduct.id} href={`/product/${similarProduct.id}`}>
                    <Card className="card-hover cursor-pointer">
                      <CardContent className="p-3">
                        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                          <Image
                            src={similarProduct.image_url || "/placeholder.svg?height=200&width=200"}
                            alt={similarProduct.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2 mb-2">{similarProduct.name}</h4>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600">{formatPrice(similarProduct.price)}</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{similarProduct.average_rating}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
