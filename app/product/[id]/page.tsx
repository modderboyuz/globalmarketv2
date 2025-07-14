"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Heart, ShoppingCart, Eye, Truck, Shield, RotateCcw, Phone, Plus, Minus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Product {
  id: string
  title: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  view_count: number
  like_count: number
  order_count: number
  has_delivery: boolean
  delivery_price: number
  has_warranty: boolean
  warranty_months: number
  has_return: boolean
  return_days: number
  users: {
    id: string
    full_name: string
    username: string
    phone: string
    avatar_url: string
  }
  categories: {
    name: string
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
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [withDelivery, setWithDelivery] = useState(false)

  // Quick order form
  const [showQuickOrder, setShowQuickOrder] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [street, setStreet] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchProduct()
      checkUser()
      fetchNeighborhoods()
    }
  }, [params.id])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      // Get user profile
      const { data: profile } = await supabase.from("users").select("full_name, phone").eq("id", user.id).single()

      if (profile) {
        setFullName(profile.full_name || "")
        setPhone(profile.phone || "")
      }
    }
  }

  const fetchProduct = async () => {
    try {
      // Increment view count
      await supabase.rpc("increment_view_count", {
        product_id_param: params.id,
      })

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          users!products_seller_id_fkey (
            id,
            full_name,
            username,
            phone,
            avatar_url
          ),
          categories (
            name
          )
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error

      setProduct(data)
      setLikeCount(data.like_count || 0)

      // Check if user liked this product
      if (user) {
        const response = await fetch(`/api/likes?product_id=${params.id}&user_id=${user.id}`)
        const likeData = await response.json()
        setIsLiked(likeData.is_liked)
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      toast.error("Mahsulotni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchNeighborhoods = async () => {
    try {
      const response = await fetch("/api/neighborhoods")
      const data = await response.json()
      setNeighborhoods(data.neighborhoods || [])
    } catch (error) {
      console.error("Error fetching neighborhoods:", error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast.error("Like qilish uchun tizimga kiring")
      router.push("/login")
      return
    }

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: params.id,
          user_id: user.id,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setIsLiked(result.liked)
        setLikeCount(result.like_count)
      }
    } catch (error) {
      console.error("Like error:", error)
      toast.error("Like qilishda xatolik")
    }
  }

  const addToCart = async () => {
    if (!user) {
      toast.error("Savatga qo'shish uchun tizimga kiring")
      router.push("/login")
      return
    }

    try {
      const { data, error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id: params.id,
        quantity: quantity,
      })

      if (error) throw error

      toast.success("Mahsulot savatga qo'shildi")
    } catch (error) {
      console.error("Add to cart error:", error)
      toast.error("Savatga qo'shishda xatolik")
    }
  }

  const handleQuickOrder = async () => {
    if (!fullName || !phone) {
      toast.error("Ism va telefon raqamini kiriting")
      return
    }

    if (withDelivery && (!neighborhood || !street || !houseNumber)) {
      toast.error("Yetkazib berish uchun to'liq manzil kiriting")
      return
    }

    setSubmitting(true)

    try {
      const address = withDelivery ? `${neighborhood}, ${street} ko'chasi, ${houseNumber}-uy` : "Do'konga olib ketish"

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: params.id,
          full_name: fullName,
          phone: phone,
          address: address,
          quantity: quantity,
          user_id: user?.id || null,
          with_delivery: withDelivery,
          neighborhood: withDelivery ? neighborhood : null,
          street: withDelivery ? street : null,
          house_number: withDelivery ? houseNumber : null,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success("Buyurtma muvaffaqiyatli yaratildi!")
        setShowQuickOrder(false)
        if (user) {
          router.push("/orders")
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Quick order error:", error)
      toast.error(error.message || "Buyurtma berishda xatolik")
    } finally {
      setSubmitting(false)
    }
  }

  const calculateTotal = () => {
    if (!product) return 0
    const productTotal = product.price * quantity
    const deliveryPrice = withDelivery && product.has_delivery ? product.delivery_price : 0
    return productTotal + deliveryPrice
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Mahsulot topilmadi</h2>
            <p className="text-gray-600 mb-6">Kechirasiz, bu mahsulot mavjud emas</p>
            <Button onClick={() => router.push("/products")}>Mahsulotlarga qaytish</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Product Image */}
        <div className="relative aspect-square">
          <Image
            src={product.image_url || "/placeholder.svg"}
            alt={product.title}
            fill
            className="object-cover rounded-lg"
          />
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {product.categories?.name}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <p className="text-gray-600 mb-4">{product.description}</p>

            {/* Product features */}
            <div className="flex flex-wrap gap-2 mb-4">
              {product.has_delivery && (
                <Badge variant="outline" className="text-green-600">
                  <Truck className="h-3 w-3 mr-1" />
                  Yetkazib berish (+{product.delivery_price.toLocaleString()} so'm)
                </Badge>
              )}
              {product.has_warranty && (
                <Badge variant="outline" className="text-blue-600">
                  <Shield className="h-3 w-3 mr-1" />
                  {product.warranty_months} oy kafolat
                </Badge>
              )}
              {product.has_return && (
                <Badge variant="outline" className="text-purple-600">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {product.return_days} kun qaytarish
                </Badge>
              )}
            </div>

            <div className="text-3xl font-bold text-green-600 mb-4">{product.price.toLocaleString()} so'm</div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {product.view_count} ko'rildi
              </div>
              <div className="flex items-center">
                <Heart className="h-4 w-4 mr-1" />
                {likeCount} yoqdi
              </div>
              <div className="flex items-center">
                <ShoppingCart className="h-4 w-4 mr-1" />
                {product.order_count} buyurtma
              </div>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center space-x-4 mb-6">
              <Label>Miqdor:</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={quantity >= product.stock_quantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-gray-600">({product.stock_quantity} dona mavjud)</span>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-4 mb-6">
              <Button onClick={handleLike} variant={isLiked ? "default" : "outline"} size="lg" className="flex-1">
                <Heart className={`h-5 w-5 mr-2 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? "Yoqdi" : "Yoqtirish"}
              </Button>

              <Button onClick={addToCart} variant="outline" size="lg" className="flex-1 bg-transparent">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Savatga qo'shish
              </Button>
            </div>

            <Button onClick={() => setShowQuickOrder(true)} size="lg" className="w-full">
              Tezkor buyurtma berish
            </Button>
          </div>
        </div>
      </div>

      {/* Seller Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sotuvchi haqida</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16">
              <Image
                src={product.users.avatar_url || "/placeholder-user.jpg"}
                alt={product.users.full_name}
                fill
                className="object-cover rounded-full"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{product.users.full_name}</h3>
              <p className="text-gray-600">@{product.users.username}</p>
              {product.users.phone && (
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <Phone className="h-4 w-4 mr-1" />
                  {product.users.phone}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Order Modal */}
      {showQuickOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Tezkor buyurtma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">To'liq ism *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ismingizni kiriting"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefon raqam *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div>
                <Label>Miqdor: {quantity}</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Delivery option */}
              {product.has_delivery && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="delivery" checked={withDelivery} onCheckedChange={setWithDelivery} />
                    <Label htmlFor="delivery" className="flex items-center">
                      <Truck className="h-4 w-4 mr-1" />
                      Yetkazib berish (+{product.delivery_price.toLocaleString()} so'm)
                    </Label>
                  </div>
                </div>
              )}

              {/* Address fields */}
              {withDelivery && (
                <>
                  <Separator />
                  <h4 className="font-semibold">Yetkazib berish manzili</h4>

                  <div>
                    <Label htmlFor="neighborhood">Mahalla *</Label>
                    <Select value={neighborhood} onValueChange={setNeighborhood}>
                      <SelectTrigger>
                        <SelectValue placeholder="Mahallani tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {neighborhoods.map((n) => (
                          <SelectItem key={n.id} value={n.name}>
                            {n.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="street">Ko'cha nomi *</Label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ko'cha nomini kiriting"
                    />
                  </div>

                  <div>
                    <Label htmlFor="houseNumber">Uy raqami *</Label>
                    <Input
                      id="houseNumber"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="Uy raqamini kiriting"
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {product.price.toLocaleString()} so'm × {quantity}
                  {withDelivery && product.has_delivery && (
                    <span> + {product.delivery_price.toLocaleString()} so'm yetkazib berish</span>
                  )}
                </p>
                <p className="text-lg font-bold">Jami: {calculateTotal().toLocaleString()} so'm</p>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowQuickOrder(false)} className="flex-1">
                  Bekor qilish
                </Button>
                <Button onClick={handleQuickOrder} disabled={submitting} className="flex-1">
                  {submitting ? "Buyurtma berilmoqda..." : "Buyurtma berish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
