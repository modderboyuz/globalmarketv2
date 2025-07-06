"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Star,
  ShoppingCart,
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
  categories: {
    name_uz: string
  }
  users: {
    full_name: string
    is_verified_seller: boolean
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    if (productId) {
      fetchProductDetails()
      checkUser()
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
  }

  const fetchProductDetails = async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            name_uz
          ),
          users (
            full_name,
            is_verified_seller
          )
        `)
        .eq("id", productId)
        .single()

      if (productError) throw productError
      setProduct(productData)
    } catch (error) {
      console.error("Error fetching product details:", error)
      toast.error("Mahsulot ma'lumotlarini olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleImmediateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    if (!formData.fullName || !formData.phone || !formData.address) {
      toast.error("Barcha maydonlarni to'ldiring")
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

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Savatga qo'shish uchun tizimga kiring")
      router.push("/login")
      return
    }

    if (!product) return

    setCartLoading(true)

    try {
      const { data, error } = await supabase.from("cart").upsert(
        {
          user_id: user.id,
          product_id: product.id,
          quantity: quantity,
        },
        {
          onConflict: "user_id,product_id",
        },
      )

      if (error) throw error

      toast.success("Mahsulot savatga qo'shildi!")

      // Update cart count in header
      window.location.reload()
    } catch (error: any) {
      toast.error("Savatga qo'shishda xatolik yuz berdi")
    } finally {
      setCartLoading(false)
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
                    <Button size="icon" variant="secondary" className="rounded-full bg-white/90 backdrop-blur-sm">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full bg-white/90 backdrop-blur-sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="badge-beautiful border-blue-200 text-blue-700">
                      {getProductTypeIcon(product.product_type)} {product.categories.name_uz}
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
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">4.5</span>
                      <span className="text-gray-500">({product.order_count} baho)</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-gray-500">{product.order_count} marta sotilgan</span>
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
                      <p className="font-medium">{product.users?.full_name || "Noma'lum sotuvchi"}</p>
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
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">Mavjud: {product.stock_quantity} dona</p>
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

                  <Button onClick={handleAddToCart} className="w-full btn-primary text-lg py-6" disabled={cartLoading}>
                    {cartLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Qo'shilmoqda...
                      </>
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

            {/* Immediate Order */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Darhol buyurtma berish
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                      <span className="text-blue-600">{formatPrice(product.price * quantity)}</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full btn-primary text-lg py-6" disabled={orderLoading}>
                    {orderLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Buyurtma berilmoqda...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Darhol buyurtma berish
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Buyurtma bergandan so'ng sizga tez orada aloqaga chiqamiz
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
