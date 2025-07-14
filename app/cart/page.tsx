"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShoppingCart,
  RefreshCw,
  Package,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  Truck,
  AlertCircle,
  Shield,
  RotateCcw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface CartItem {
  id: string
  quantity: number
  products: {
    id: string
    name: string
    price: number
    image_url: string
    stock_quantity: number
    product_type: string
    brand: string
    author: string
    has_delivery: boolean
    delivery_price: number
    has_warranty: boolean
    warranty_months: number
    has_return: boolean
    return_days: number
  }
}

interface Neighborhood {
  id: string
  name: string
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    neighborhood: "",
    street: "",
    houseNumber: "",
  })

  const [deliveryOptions, setDeliveryOptions] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    checkUser()
    fetchNeighborhoods()
  }, [])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)

    if (currentUser.user_metadata) {
      setFormData({
        fullName: currentUser.user_metadata.full_name || "",
        phone: currentUser.user_metadata.phone || "",
        neighborhood: "",
        street: "",
        houseNumber: "",
      })
    }

    fetchCartItems(currentUser.id)
  }

  const fetchNeighborhoods = async () => {
    try {
      const response = await fetch("/api/neighborhoods")
      const result = await response.json()
      if (result.success) {
        setNeighborhoods(result.neighborhoods)
      }
    } catch (error) {
      console.error("Error fetching neighborhoods:", error)
    }
  }

  const fetchCartItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            stock_quantity,
            product_type,
            brand,
            author,
            has_delivery,
            delivery_price,
            has_warranty,
            warranty_months,
            has_return,
            return_days
          )
        `)
        .eq("user_id", userId)

      if (error) throw error
      setCartItems(data || [])

      // Initialize delivery options
      const initialDeliveryOptions: { [key: string]: boolean } = {}
      data?.forEach((item) => {
        if (item.products?.has_delivery) {
          initialDeliveryOptions[item.id] = false
        }
      })
      setDeliveryOptions(initialDeliveryOptions)
    } catch (error) {
      console.error("Error fetching cart items:", error)
      toast.error("Savatcha ma'lumotlarini olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (cartId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      const { error } = await supabase.from("cart_items").update({ quantity: newQuantity }).eq("id", cartId)

      if (error) throw error

      setCartItems((items) => items.map((item) => (item.id === cartId ? { ...item, quantity: newQuantity } : item)))
    } catch (error) {
      toast.error("Miqdorni yangilashda xatolik")
    }
  }

  const removeItem = async (cartId: string) => {
    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", cartId)

      if (error) throw error

      setCartItems((items) => items.filter((item) => item.id !== cartId))
      toast.success("Mahsulot savatdan olib tashlandi")
    } catch (error) {
      toast.error("Mahsulotni o'chirishda xatolik")
    }
  }

  const toggleDelivery = (cartId: string) => {
    setDeliveryOptions((prev) => ({
      ...prev,
      [cartId]: !prev[cartId],
    }))
  }

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cartItems.length === 0) {
      toast.error("Savatcha bo'sh")
      return
    }

    if (!formData.fullName || !formData.phone || !formData.neighborhood || !formData.street || !formData.houseNumber) {
      toast.error("Barcha maydonlarni to'ldiring")
      return
    }

    setOrderLoading(true)

    try {
      // Create orders for each cart item
      const orderPromises = cartItems.map((item) => {
        const withDelivery = deliveryOptions[item.id] || false
        const address = `${formData.neighborhood}, ${formData.street}, ${formData.houseNumber}`

        return fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: item.products.id,
            fullName: formData.fullName,
            phone: formData.phone,
            address: address,
            quantity: item.quantity,
            userId: user.id,
            orderType: "cart",
            withDelivery: withDelivery,
            neighborhood: formData.neighborhood,
            street: formData.street,
            houseNumber: formData.houseNumber,
          }),
        })
      })

      const results = await Promise.all(orderPromises)

      // Check if all orders were successful
      const allSuccessful = results.every((result) => result.ok)

      if (!allSuccessful) {
        throw new Error("Ba'zi buyurtmalarni yaratishda xatolik")
      }

      // Clear cart
      await supabase.from("cart_items").delete().eq("user_id", user.id)

      toast.success("Barcha buyurtmalar muvaffaqiyatli berildi! Sizga tez orada aloqaga chiqamiz.")

      setTimeout(() => {
        router.push("/orders")
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || "Buyurtma berishda xatolik")
    } finally {
      setOrderLoading(false)
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

  const subtotal = cartItems.reduce((sum, item) => sum + (item.products?.price || 0) * item.quantity, 0)
  const deliveryTotal = cartItems.reduce((sum, item) => {
    if (deliveryOptions[item.id] && item.products?.has_delivery) {
      return sum + (item.products?.delivery_price || 0)
    }
    return sum
  }, 0)
  const totalAmount = subtotal + deliveryTotal

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Savatcha yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold gradient-text mb-2 flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 md:h-6 md:w-6 text-white" />
              </div>
              Savatcha
            </h1>
            <p className="text-gray-600 text-sm md:text-lg">Tanlangan mahsulotlaringiz ({cartItems.length} ta)</p>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8">
                <ShoppingCart className="h-12 w-12 md:h-16 md:w-16 text-gray-400" />
              </div>
              <h2 className="text-xl md:text-3xl font-bold mb-4 text-gray-800">Savatcha bo'sh</h2>
              <p className="text-gray-600 mb-6 md:mb-8 text-base md:text-lg max-w-md mx-auto px-4">
                Hozircha hech qanday mahsulot tanlamadingiz. Xarid qilishni boshlang!
              </p>
              <Button
                onClick={() => router.push("/")}
                className="btn-primary text-base md:text-lg px-6 md:px-8 py-3 md:py-4"
              >
                <Package className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Xarid qilishni boshlash
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
              {/* Cart Items */}
              <div className="xl:col-span-2 space-y-4">
                <div className="card-beautiful p-4 md:p-6">
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <Package className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                    Mahsulotlar
                  </h2>

                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="border-2 border-gray-100 rounded-2xl md:rounded-3xl p-4 md:p-6 hover:border-blue-200 transition-all duration-300"
                      >
                        <div className="flex gap-4 md:gap-6">
                          {/* Product Image */}
                          <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-gray-200">
                            <Image
                              src={item.products?.image_url || "/placeholder.svg?height=100&width=100"}
                              alt={item.products?.name || "Product"}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2 md:mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="badge-beautiful border-blue-200 text-blue-700 text-xs">
                                    {getProductTypeIcon(item.products?.product_type || "")}
                                  </Badge>
                                  {item.products?.has_warranty && (
                                    <Badge className="badge-beautiful border-green-200 text-green-700 text-xs">
                                      <Shield className="h-2 w-2 md:h-3 md:w-3 mr-1" />
                                      {item.products.warranty_months} oy kafolat
                                    </Badge>
                                  )}
                                  {item.products?.has_return && (
                                    <Badge className="badge-beautiful border-orange-200 text-orange-700 text-xs">
                                      <RotateCcw className="h-2 w-2 md:h-3 md:w-3 mr-1" />
                                      {item.products.return_days} kun qaytarish
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-base md:text-xl text-gray-800 truncate">
                                  {item.products?.name}
                                </h3>
                                {item.products?.author && (
                                  <p className="text-gray-600 mt-1 text-sm truncate">Muallif: {item.products.author}</p>
                                )}
                                {item.products?.brand && (
                                  <p className="text-gray-600 mt-1 text-sm truncate">Brend: {item.products.brand}</p>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl md:rounded-2xl h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </div>

                            {/* Delivery Option */}
                            {item.products?.has_delivery && (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                      Yetkazib berish ({formatPrice(item.products.delivery_price)})
                                    </span>
                                  </div>
                                  <Switch
                                    checked={deliveryOptions[item.id] || false}
                                    onCheckedChange={() => toggleDelivery(item.id)}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Quantity and Price */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-gray-600 font-medium text-sm md:text-base">Miqdor:</span>
                                <div className="flex items-center gap-1 md:gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="h-6 w-6 md:h-8 md:w-8 rounded-full border-2"
                                  >
                                    <Minus className="h-2 w-2 md:h-3 md:w-3" />
                                  </Button>
                                  <span className="font-bold text-sm md:text-lg w-6 md:w-8 text-center">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    disabled={item.quantity >= (item.products?.stock_quantity || 0)}
                                    className="h-6 w-6 md:h-8 md:w-8 rounded-full border-2"
                                  >
                                    <Plus className="h-2 w-2 md:h-3 md:w-3" />
                                  </Button>
                                </div>
                                <span className="text-xs text-gray-500">
                                  (Mavjud: {item.products?.stock_quantity || 0})
                                </span>
                              </div>

                              <div className="text-right">
                                <div className="text-lg md:text-2xl font-bold text-blue-600">
                                  {formatPrice((item.products?.price || 0) * item.quantity)}
                                </div>
                                {deliveryOptions[item.id] && item.products?.has_delivery && (
                                  <div className="text-xs md:text-sm text-green-600">
                                    + {formatPrice(item.products?.delivery_price || 0)} yetkazib berish
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="xl:col-span-1">
                <div className="sticky top-4 md:top-24 space-y-6">
                  {/* Price Summary */}
                  <Card className="card-beautiful">
                    <CardHeader>
                      <CardTitle className="text-lg md:text-2xl">Buyurtma xulosasi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between text-base md:text-lg">
                        <span>Mahsulotlar:</span>
                        <span className="font-semibold">{formatPrice(subtotal)}</span>
                      </div>

                      {deliveryTotal > 0 && (
                        <div className="flex justify-between text-base md:text-lg">
                          <span>Yetkazib berish:</span>
                          <span className="font-semibold text-green-600">{formatPrice(deliveryTotal)}</span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex justify-between text-lg md:text-xl font-bold">
                        <span>Jami:</span>
                        <span className="text-blue-600">{formatPrice(totalAmount)}</span>
                      </div>

                      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs md:text-sm text-amber-800">
                            <p className="font-medium mb-1">Yetkazib berish haqida</p>
                            <p>Yetkazib berish faqat Qashqadaryo viloyati, G'uzor tumani hududida amalga oshiriladi.</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Form */}
                  <Card className="card-beautiful">
                    <CardHeader>
                      <CardTitle className="text-lg md:text-2xl">Buyurtma berish</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleOrder} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="text-sm md:text-base font-medium">
                            To'liq ism *
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                            <Input
                              id="fullName"
                              placeholder="Ism Familiya"
                              className="input-beautiful pl-10 md:pl-12 text-sm md:text-base"
                              value={formData.fullName}
                              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm md:text-base font-medium">
                            Telefon raqam *
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                            <Input
                              id="phone"
                              placeholder="+998 90 123 45 67"
                              className="input-beautiful pl-10 md:pl-12 text-sm md:text-base"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="neighborhood" className="text-sm md:text-base font-medium">
                            Mahalla *
                          </Label>
                          <Select
                            value={formData.neighborhood}
                            onValueChange={(value) => setFormData({ ...formData, neighborhood: value })}
                          >
                            <SelectTrigger className="input-beautiful">
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

                        <div className="space-y-2">
                          <Label htmlFor="street" className="text-sm md:text-base font-medium">
                            Ko'cha nomi *
                          </Label>
                          <Input
                            id="street"
                            placeholder="Ko'cha nomi"
                            className="input-beautiful text-sm md:text-base"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="houseNumber" className="text-sm md:text-base font-medium">
                            Uy raqami *
                          </Label>
                          <Input
                            id="houseNumber"
                            placeholder="Uy raqami"
                            className="input-beautiful text-sm md:text-base"
                            value={formData.houseNumber}
                            onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full btn-primary text-base md:text-lg py-4 md:py-6 mt-6"
                          disabled={orderLoading}
                        >
                          {orderLoading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                              Buyurtma berilmoqda...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Buyurtma berish ({formatPrice(totalAmount)})
                            </>
                          )}
                        </Button>

                        <p className="text-xs md:text-sm text-gray-500 text-center mt-4">
                          Buyurtma bergandan so'ng sizga tez orada aloqaga chiqamiz
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
