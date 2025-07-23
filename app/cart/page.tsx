"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Minus, ShoppingCart, Shield, RotateCcw } from "lucide-react"
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
    has_warranty: boolean
    warranty_period: string
    has_return: boolean
    return_period: string
  }
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [orderForm, setOrderForm] = useState({
    full_name: "",
    phone: "",
  })

  useEffect(() => {
    checkUser()
    fetchCartItems()
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

  const handleSubmitOrder = async () => {
    if (!user) {
      toast.error("Buyurtma berish uchun tizimga kiring")
      return
    }

    if (!orderForm.full_name || !orderForm.phone) {
      toast.error("Ism va telefon raqam majburiy")
      return
    }

    if (cartItems.length === 0) {
      toast.error("Savat bo'sh")
      return
    }

    setSubmitting(true)

    try {
      const session = (await supabase.auth.getSession()).data.session
      const token = session?.access_token

      // Create orders for each cart item
      for (const item of cartItems) {
        const orderData = {
          product_id: item.product_id,
          full_name: orderForm.full_name,
          phone: orderForm.phone,
          address: "Do'kondan olib ketish",
          quantity: item.quantity,
          with_delivery: false,
          neighborhood: null,
          street: null,
          house_number: null,
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

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">🚚 Hozircha faqat do'kondan olib ketish mavjud</p>
                <p className="text-sm text-blue-700 mt-1">📞 Telefon: +998958657500</p>
                <p className="text-sm text-blue-700">📧 Email: admin@globalmarketshop.uz</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Mahsulotlar:</span>
                  <span>{calculateSubtotal().toLocaleString()} so'm</span>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Jami:</span>
                  <span>{calculateSubtotal().toLocaleString()} so'm</span>
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
