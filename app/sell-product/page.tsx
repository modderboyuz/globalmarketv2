"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Plus, DollarSign, MapPin, Phone, Mail, Clock, CheckCircle, XCircle, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: string
  name_uz: string
  icon: string
}

interface SellRequest {
  id: string
  product_name: string
  author: string
  description: string
  price: number
  category_id: string
  stock_quantity: number
  condition: string
  contact_phone: string
  contact_email: string
  location: string
  images: string[]
  status: string
  admin_notes: string
  created_at: string
  categories: {
    name_uz: string
    icon: string
  }
}

interface MyProduct {
  id: string
  name: string
  price: number
  stock_quantity: number
  order_count: number
  average_rating: number
  is_active: boolean
  created_at: string
  image_url: string
  categories: {
    name_uz: string
    icon: string
  }
}

export default function SellProductPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([])
  const [myProducts, setMyProducts] = useState<MyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("sell")

  const [formData, setFormData] = useState({
    product_name: "",
    author: "",
    description: "",
    price: "",
    category_id: "",
    stock_quantity: "1",
    condition: "new",
    contact_phone: "",
    contact_email: "",
    location: "",
    images: [] as string[],
  })

  useEffect(() => {
    checkAuth()
    fetchCategories()
  }, [])

  useEffect(() => {
    if (user) {
      fetchSellRequests()
      fetchMyProducts()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      setUser(currentUser)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name_uz")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Kategoriyalarni olishda xatolik")
    }
  }

  const fetchSellRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("sell_requests")
        .select(`
          *,
          categories (name_uz, icon)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSellRequests(data || [])
    } catch (error) {
      console.error("Error fetching sell requests:", error)
      toast.error("So'rovlarni olishda xatolik")
    }
  }

  const fetchMyProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name_uz, icon)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMyProducts(data || [])
    } catch (error) {
      console.error("Error fetching my products:", error)
      toast.error("Mahsulotlarni olishda xatolik")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!formData.product_name || !formData.price || !formData.contact_phone || !formData.location) {
        toast.error("Majburiy maydonlarni to'ldiring")
        return
      }

      const response = await fetch("/api/sell-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          ...formData,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("So'rov muvaffaqiyatli yuborildi! Admin ko'rib chiqadi.")
        setFormData({
          product_name: "",
          author: "",
          description: "",
          price: "",
          category_id: "",
          stock_quantity: "1",
          condition: "new",
          contact_phone: "",
          contact_email: "",
          location: "",
          images: [],
        })
        fetchSellRequests()
      } else {
        toast.error(result.error || "Xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Error submitting sell request:", error)
      toast.error("So'rov yuborishda xatolik")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, text: "Kutilmoqda", icon: Clock },
      approved: { variant: "default" as const, text: "Tasdiqlangan", icon: CheckCircle },
      rejected: { variant: "destructive" as const, text: "Rad etilgan", icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "secondary" as const,
      text: status,
      icon: Clock,
    }

    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">Mahsulot sotish</h1>
          <p className="text-gray-600">Mahsulotingizni sotish uchun so'rov yuboring</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sell">Mahsulot sotish</TabsTrigger>
            <TabsTrigger value="requests">Mening so'rovlarim ({sellRequests.length})</TabsTrigger>
            <TabsTrigger value="products">Mening mahsulotlarim ({myProducts.length})</TabsTrigger>
          </TabsList>

          {/* Sell Product Tab */}
          <TabsContent value="sell">
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-6 w-6" />
                  Yangi mahsulot sotish so'rovi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="product_name">Mahsulot nomi *</Label>
                      <Input
                        id="product_name"
                        placeholder="Mahsulot nomini kiriting"
                        value={formData.product_name}
                        onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="author">Muallif/Brend</Label>
                      <Input
                        id="author"
                        placeholder="Muallif yoki brend nomi"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Tavsif</Label>
                    <Textarea
                      id="description"
                      placeholder="Mahsulot haqida batafsil ma'lumot"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="price">Narx (so'm) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="price"
                          type="number"
                          placeholder="0"
                          className="pl-10"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Kategoriya</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategoriyani tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.icon} {category.name_uz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Miqdor</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        placeholder="1"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Holati</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Yangi</SelectItem>
                        <SelectItem value="like_new">Yangi kabi</SelectItem>
                        <SelectItem value="good">Yaxshi</SelectItem>
                        <SelectItem value="fair">O'rtacha</SelectItem>
                        <SelectItem value="poor">Yomon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact Info */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Aloqa ma'lumotlari</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">Telefon raqam *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="contact_phone"
                            placeholder="+998901234567"
                            className="pl-10"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact_email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="contact_email"
                            type="email"
                            placeholder="email@example.com"
                            className="pl-10"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label htmlFor="location">Joylashuv *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="location"
                          placeholder="G'uzor tumani, Qashqadaryo viloyati"
                          className="pl-10"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Yuborilmoqda...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        So'rov yuborish
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Requests Tab */}
          <TabsContent value="requests">
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  Mening so'rovlarim
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sellRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">So'rovlar yo'q</h3>
                    <p className="text-gray-600">Hali birorta so'rov yubormagansingiz</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sellRequests.map((request) => (
                      <Card key={request.id} className="border">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{request.product_name}</h3>
                              {request.author && <p className="text-gray-600">{request.author}</p>}
                              {request.categories && (
                                <Badge variant="outline" className="mt-2">
                                  {request.categories.icon} {request.categories.name_uz}
                                </Badge>
                              )}
                            </div>
                            {getStatusBadge(request.status)}
                          </div>

                          {request.description && (
                            <p className="text-gray-600 mb-4 line-clamp-2">{request.description}</p>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">Narx</p>
                              <p className="font-semibold">{formatPrice(request.price)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Miqdor</p>
                              <p className="font-semibold">{request.stock_quantity} dona</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Holati</p>
                              <p className="font-semibold capitalize">{request.condition}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Sana</p>
                              <p className="font-semibold">{formatDate(request.created_at)}</p>
                            </div>
                          </div>

                          {request.admin_notes && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                <strong>Admin izohi:</strong> {request.admin_notes}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Products Tab */}
          <TabsContent value="products">
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  Mening mahsulotlarim
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
                    <p className="text-gray-600">Hali tasdiqlangan mahsulotlaringiz yo'q</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myProducts.map((product) => (
                      <Card key={product.id} className="border card-hover">
                        <CardContent className="p-0">
                          <div className="relative aspect-square bg-gray-100 rounded-t-2xl overflow-hidden">
                            <img
                              src={product.image_url || "/placeholder.svg?height=300&width=300"}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 left-3">
                              <Badge variant={product.is_active ? "default" : "secondary"}>
                                {product.is_active ? "Faol" : "Nofaol"}
                              </Badge>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <h3 className="font-semibold line-clamp-2">{product.name}</h3>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {product.categories?.icon} {product.categories?.name_uz}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center">
                                <div className="font-semibold text-blue-600">{product.order_count}</div>
                                <div className="text-gray-500">Sotildi</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-green-600">{product.stock_quantity}</div>
                                <div className="text-gray-500">Qoldi</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-yellow-600">{product.average_rating.toFixed(1)}</div>
                                <div className="text-gray-500">Reyting</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-lg font-bold text-blue-600">{formatPrice(product.price)}</div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`/product/${product.id}`} target="_blank" rel="noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
