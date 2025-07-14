"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Minus, ShoppingCart, Truck, Shield, RotateCcw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface CartItem {
  id: string
  product_id: string
  quantity: number
  products: {
    id: string
    title: string
    price: number
    image_url: string
    stock_quantity: number
    has_delivery: boolean
    delivery_price: number
    has_warranty: boolean
    warranty_months: number
    has_return: boolean
    return_days: number
    users: {
      full_name: string
      username: string
    }
  }
}

interface Neighborhood {
  id: string
  name: string
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Order form data
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [street, setStreet] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [deliveryOptions, setDeliveryOptions] = useState<{ [key: string]: boolean }>({})

  const router = useRouter()

  useEffect(() => {
    checkUser()
    fetchCartItems()
    fetchNeighborhoods()
  }, [])

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

  const fetchCartItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          products (
            id,
            title,
            price,
            image_url,
            stock_quantity,
            has_delivery,
            delivery_price,
            has_warranty,
            warranty_months,
            has_return,
            return_days,
            users!products_seller_id_fkey (
              full_name,
              username
            )
          )
        `)
        .eq("user_id", user.id)

      if (error) throw error

      setCartItems(data || [])

      // Initialize delivery options
      const initialDeliveryOptions: { [key: string]: boolean } = {}
      data?.forEach((item) => {
        if (item.products.has_delivery) {
          initialDeliveryOptions[item.id] = false
        }
      })
      setDeliveryOptions(initialDeliveryOptions)
    } catch (error) {
      console.error("Error fetching cart:", error)
      toast.error("Savatni yuklashda xatolik")
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

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      const { error } = await supabase.from("cart_items").update({ quantity: newQuantity }).eq("id", itemId)

      if (error) throw error

      setCartItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item)))
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast.error("Miqdorni yangilashda xatolik")
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId)

      if (error) throw error

      setCartItems((prev) => prev.filter((item) => item.id !== itemId))
      toast.success("Mahsulot savatdan olib tashlandi")
    } catch (error) {
      console.error("Error removing item:", error)
      toast.error("Mahsulotni olib tashlashda xatolik")
    }
  }

  const toggleDelivery = (itemId: string) => {
    setDeliveryOptions((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  const calculateItemTotal = (item: CartItem) => {
    const productTotal = item.products.price * item.quantity
    const deliveryPrice = deliveryOptions[item.id] && item.products.has_delivery ? item.products.delivery_price : 0
    return productTotal + deliveryPrice
  }

  const calculateGrandTotal = () => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item), 0)
  }

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Buyurtma berish uchun tizimga kiring")
      router.push("/login")
      return
    }

    if (!fullName || !phone) {
      toast.error("Ism va telefon raqamini kiriting")
      return
    }

    if (cartItems.length === 0) {
      toast.error("Savat bo'sh")
      return
    }

    // Check if any item with delivery needs address
    const needsAddress = cartItems.some((item) => deliveryOptions[item.id])
    if (needsAddress && (!neighborhood || !street || !houseNumber)) {
      toast.error("Yetkazib berish uchun to'liq manzil kiriting")
      return
    }

    setSubmitting(true)

    try {
      // Create orders for each cart item
      for (const item of cartItems) {
        const withDelivery = deliveryOptions[item.id] || false
        const address = withDelivery ? `${neighborhood}, ${street} ko'chasi, ${houseNumber}-uy` : "Do'konga olib ketish"

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: item.product_id,
            full_name: fullName,
            phone: phone,
            address: address,
            quantity: item.quantity,
            user_id: user.id,
            with_delivery: withDelivery,
            neighborhood: withDelivery ? neighborhood : null,
            street: withDelivery ? street : null,
            house_number: withDelivery ? houseNumber : null,
          }),
        })

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error)
        }
      }

      // Clear cart after successful orders
      const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id)

      if (error) throw error

      toast.success("Buyurtmalar muvaffaqiyatli yaratildi!")
      router.push("/orders")
    } catch (error: any) {
      console.error("Checkout error:", error)
      toast.error(error.message || "Buyurtma berishda xatolik")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Savat bo'sh</h2>
            <p className="text-gray-600 mb-6">Hozircha savatda hech qanday mahsulot yo'q</p>
            <Button onClick={() => router.push("/products")}>Xarid qilishni boshlash</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Savat</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <Image
                      src={item.products.image_url || "/placeholder.svg"}
                      alt={item.products.title}
                      fill
                      className="object-cover rounded"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">{item.products.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">Sotuvchi: {item.products.users?.full_name}</p>

                    {/* Product features */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.products.has_warranty && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {item.products.warranty_months} oy kafolat
                        </Badge>
                      )}
                      {item.products.has_return && (
                        <Badge variant="secondary" className="text-xs">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {item.products.return_days} kun qaytarish
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.products.stock_quantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Delivery option */}
                    {item.products.has_delivery && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`delivery-${item.id}`}
                            checked={deliveryOptions[item.id] || false}
                            onCheckedChange={() => toggleDelivery(item.id)}
                          />
                          <Label htmlFor={`delivery-${item.id}`} className="flex items-center">
                            <Truck className="h-4 w-4 mr-1" />
                            Yetkazib berish (+{item.products.delivery_price.toLocaleString()} so'm)
                          </Label>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 text-right">
                      <p className="text-sm text-gray-600">
                        {item.products.price.toLocaleString()} so'm × {item.quantity}
                        {deliveryOptions[item.id] && item.products.has_delivery && (
                          <span> + {item.products.delivery_price.toLocaleString()} so'm yetkazib berish</span>
                        )}
                      </p>
                      <p className="text-lg font-bold">{calculateItemTotal(item).toLocaleString()} so'm</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Buyurtma ma'lumotlari</CardTitle>
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

              {/* Address fields - only show if delivery is selected */}
              {Object.values(deliveryOptions).some(Boolean) && (
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

              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Jami:</span>
                  <span>{calculateGrandTotal().toLocaleString()} so'm</span>
                </div>
              </div>

              <Button onClick={handleCheckout} disabled={submitting} className="w-full" size="lg">
                {submitting ? "Buyurtma berilmoqda..." : "Buyurtma berish"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
