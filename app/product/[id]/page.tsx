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
import { Heart, ShoppingCart, Truck, Shield, RotateCcw, User, Phone, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Image from "next/image"

interface Product {
  id: string
  title: string
  description: string
  price: number
  image_url: string
  stock: number
  category_id: string
  seller_id: string
  has_delivery: boolean
  delivery_price: number
  has_warranty: boolean
  warranty_period: string
  has_return: boolean
  return_period: string
  is_active: boolean
  created_at: string
  categories: {
    name: string
  }
  users: {
    full_name: string
    phone: string
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
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [showQuickOrder, setShowQuickOrder] = useState(false)

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
    }
  }, [params.id])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      // Get user profile data
      const { data: profile } = await supabase.from("users").select("full_name, phone").eq("id", user.id).single()

      if (profile) {
        setQuickOrderForm((prev) => ({
          ...prev,
          full_name: profile.full_name || "",
          phone: profile.phone || "",
        }))
      }
    }
  }

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name),
          users (full_name, phone)
        `)
        .eq("id", params.id)
        .eq("is_active", true)
        .single()

      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error("Error fetching product:", error)
      toast.error("Mahsulotni yuklashda xatolik")
    } finally {
      setLoading(false)
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
      const { data, error } = await supabase.from("cart_items").upsert(
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

      toast.success("Mahsulot savatga qo'shildi")
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

  const calculateTotal = () => {
    if (!product) return 0
    let total = product.price * quantity
    if (quickOrderForm.with_delivery && product.has_delivery) {
      total += product.delivery_price
    }
    return total
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Mahsulot topilmadi</h2>
        <Button onClick={() => router.push("/products")}>Mahsulotlarga qaytish</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Product Image */}
        <div className="relative aspect-square">
          <Image
            src={product.image_url || "/placeholder.jpg"}
            alt={product.title}
            fill
            className="object-cover rounded-lg"
          />
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {product.categories.name}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {likesCount} yoqtirildi
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {product.stock} dona mavjud
              </span>
            </div>
          </div>

          <div className="text-3xl font-bold text-blue-600">{product.price.toLocaleString()} so'm</div>

          {/* Features */}
          <div className="flex flex-wrap gap-2">
            {product.has_delivery && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Yetkazib berish: {product.delivery_price.toLocaleString()} so'm
              </Badge>
            )}
            {product.has_warranty && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Kafolat: {product.warranty_period}
              </Badge>
            )}
            {product.has_return && (
              <Badge variant="outline" className="flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Qaytarish: {product.return_period}
              </Badge>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Tavsif</h3>
            <p className="text-gray-600">{product.description}</p>
          </div>

          {/* Seller Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Sotuvchi</h3>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span>{product.users.full_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4" />
                <span>{product.users.phone}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quantity and Actions */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Miqdor</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  min="1"
                  max={product.stock}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleLike} variant="outline" size="sm" className={isLiked ? "text-red-600" : ""}>
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>

              <Button onClick={handleAddToCart} variant="outline" className="flex-1 bg-transparent">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Savatga qo'shish
              </Button>

              <Dialog open={showQuickOrder} onOpenChange={setShowQuickOrder}>
                <DialogTrigger asChild>
                  <Button className="flex-1">Tezkor buyurtma</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tezkor buyurtma</DialogTitle>
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
                        <Label htmlFor="quick_with_delivery">
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
                            onValueChange={(value) => setQuickOrderForm((prev) => ({ ...prev, neighborhood: value }))}
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
                            onChange={(e) => setQuickOrderForm((prev) => ({ ...prev, house_number: e.target.value }))}
                            placeholder="Uy raqami"
                          />
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Mahsulot ({quantity} dona):</span>
                        <span>{(product.price * quantity).toLocaleString()} so'm</span>
                      </div>

                      {quickOrderForm.with_delivery && product.has_delivery && (
                        <div className="flex justify-between">
                          <span>Yetkazib berish:</span>
                          <span>{product.delivery_price.toLocaleString()} so'm</span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex justify-between font-bold text-lg">
                        <span>Jami:</span>
                        <span>{calculateTotal().toLocaleString()} so'm</span>
                      </div>
                    </div>

                    <Button onClick={handleQuickOrder} className="w-full">
                      Buyurtma berish
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
