"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import Image from "next/image"

interface CartItem {
  id: string
  product_id: string
  quantity: number
  products: {
    id: string
    title: string
    price: number
    image_url: string
    stock: number
    has_delivery: boolean
    delivery_price: number
    has_warranty: boolean
    warranty_period: string
    has_return: boolean
    return_period: string
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
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [orderForm, setOrderForm] = useState({
    full_name: "",
    phone: "",
    neighborhood: "",
    street: "",
    house_number: "",
    with_delivery: false,
  })

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
      // Get user profile data
      const { data: profile } = await supabase.from("users").select("full_name, phone").eq("id", user.id).single()

      if (profile) {
        setOrderForm((prev) => ({
          ...prev,
          full_name: profile.full_name || "",
          phone: profile.phone || "",
        }))
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
            stock,
            has_delivery,
            delivery_price,
            has_warranty,
            warranty_period,
            has_return,
            return_period
          )
        `)
        .eq("user_id", user.id)

      if (error) throw error
      setCartItems(data || [])
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
      if (data.success) {
        setNeighborhoods(data.neighborhoods)
      }
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
      toast.success("Miqdor yangilandi")
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

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.products.price * item.quantity, 0)
  }

  const calculateDeliveryTotal = () => {
    if (!orderForm.with_delivery) return 0
    return cartItems.reduce((sum, item) => {
      if (item.products.has_delivery) {
        return sum + item.products.delivery_price
      }
      return sum
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateDeliveryTotal()
  }

  const handleSubmitOrder = async () => {
    if (!user) {
      toast.error("Buyurtma berish uchun tizimga kiring")
      return
    }

    if (!orderForm.full_name || !orderForm.phone) {
      toast.error("Ism va telefon raqam majburiy")
      return
    }

    if (orderForm.with_delivery && (!orderForm.neighborhood || !orderForm.street || !orderForm.house_number)) {
      toast.error("Yetkazib berish uchun to'liq manzil majburiy")
      return
    }

    if (cartItems.length === 0) {
      toast.error("Savat bo'sh")
      return
    }

    setSubmitting(true)

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token

      // Create orders for each cart item
      for (const item of cartItems) {
        const orderData = {
          product_id: item.product_id,
          full_name: orderForm.full_name,
          phone: orderForm.phone,
          address: orderForm.with_delivery
            ? `${orderForm.neighborhood}, ${orderForm.street}, ${orderForm.house_number}`
            : "Do'kondan olib ketish",
          quantity: item.quantity,
          with_delivery: orderForm.with_delivery && item.products.has_delivery,
          neighborhood: orderForm.with_delivery ? orderForm.neighborhood : null,
          street: orderForm.with_delivery ? orderForm.street : null,
          house_number: orderForm.with_delivery ? orderForm.house_number : null,
        }

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orderData),
        })

        if (!response.ok) {
          throw new Error("Buyurtma yaratishda xatolik")
        }
      }

      // Clear cart
      const { error: clearError } = await supabase.from("cart_items").delete().eq("user_id", user.id)

      if (clearError) throw clearError

      toast.success("Buyurtmalar muvaffaqiyatli yaratildi!")
      router.push("/orders")
    } catch (error) {
      console.error("Error creating orders:", error)
      toast.error("Buyurtma yaratishda xatolik")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Savatni ko'rish uchun tizimga kiring</h2>
        <Button onClick={() => router.push("/login")}>Kirish</Button>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Savat bo'sh</h2>
        <p className="text-gray-600 mb-4">Mahsulotlar qo'shish uchun do'konni ko'ring</p>
        <Button onClick={() => router.push("/products")}>Mahsulotlarni ko'rish</Button>
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
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <Image
                      src={item.products.image_url || "/placeholder.jpg"}
                      alt={item.products.title}
                      fill
                      className="object-cover rounded"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{item.products.title}</h3>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {item.products.has_delivery && (
                        <Badge variant="secondary" className="text-xs">
                          <Truck className="w-3 h-3 mr-1" />
                          Yetkazib berish: {item.products.delivery_price.toLocaleString()} so'm
                        </Badge>
                      )}
                      {item.products.has_warranty && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Kafolat: {item.products.warranty_period}
                        </Badge>
                      )}
                      {item.products.has_return && (
                        <Badge variant="secondary" className="text-xs">
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Qaytarish: {item.products.return_period}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.products.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">{(item.products.price * item.quantity).toLocaleString()} so'm</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Buyurtma berish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">To'liq ism *</Label>
                <Input
                  id="full_name"
                  value={orderForm.full_name}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Ism Familiya"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefon raqam *</Label>
                <Input
                  id="phone"
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="with_delivery"
                  checked={orderForm.with_delivery}
                  onCheckedChange={(checked) =>
                    setOrderForm((prev) => ({ ...prev, with_delivery: checked as boolean }))
                  }
                />
                <Label htmlFor="with_delivery">Yetkazib berish kerak</Label>
              </div>

              {orderForm.with_delivery && (
                <>
                  <div>
                    <Label htmlFor="neighborhood">Mahalla *</Label>
                    <Select
                      value={orderForm.neighborhood}
                      onValueChange={(value) => setOrderForm((prev) => ({ ...prev, neighborhood: value }))}
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
                    <Label htmlFor="street">Ko'cha nomi *</Label>
                    <Input
                      id="street"
                      value={orderForm.street}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, street: e.target.value }))}
                      placeholder="Ko'cha nomi"
                    />
                  </div>

                  <div>
                    <Label htmlFor="house_number">Uy raqami *</Label>
                    <Input
                      id="house_number"
                      value={orderForm.house_number}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, house_number: e.target.value }))}
                      placeholder="Uy raqami"
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Mahsulotlar:</span>
                  <span>{calculateSubtotal().toLocaleString()} so'm</span>
                </div>

                {orderForm.with_delivery && calculateDeliveryTotal() > 0 && (
                  <div className="flex justify-between">
                    <span>Yetkazib berish:</span>
                    <span>{calculateDeliveryTotal().toLocaleString()} so'm</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Jami:</span>
                  <span>{calculateTotal().toLocaleString()} so'm</span>
                </div>
              </div>

              <Button onClick={handleSubmitOrder} disabled={submitting} className="w-full">
                {submitting ? "Buyurtma berilmoqda..." : "Buyurtma berish"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
