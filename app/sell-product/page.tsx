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
import {
  Package,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  BookOpen,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Plus,
  X,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: string
  name_uz: string
  name_en: string
  icon: string
}

interface SellRequest {
  id: string
  product_name: string
  author: string
  brand: string
  description: string
  price: number
  category_id: string
  stock_quantity: number
  condition: string
  contact_phone: string
  contact_email: string
  location: string
  images: string[]
  product_type: string
  isbn: string
  language: string
  tags: string[]
  status: string
  created_at: string
  admin_notes: string
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("new")

  const [formData, setFormData] = useState({
    product_name: "",
    author: "",
    brand: "",
    description: "",
    price: "",
    category_id: "",
    stock_quantity: "1",
    condition: "new",
    contact_phone: "",
    contact_email: "",
    location: "",
    images: [] as string[],
    product_type: "physical",
    isbn: "",
    language: "uz",
    tags: [] as string[],
  })

  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    checkAuth()
  }, [])

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
      await Promise.all([fetchCategories(), fetchUserSellRequests(currentUser.id)])

      // Pre-fill user data
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, phone, email")
        .eq("id", currentUser.id)
        .single()

      if (userData) {
        setFormData((prev) => ({
          ...prev,
          contact_phone: userData.phone || "",
          contact_email: userData.email || "",
        }))
      }
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

  const fetchUserSellRequests = async (userId: string) => {
    try {
      const response = await fetch(`/api/sell-product?user_id=${userId}`)
      const result = await response.json()

      if (result.success) {
        setSellRequests(result.data)
      }
    } catch (error) {
      console.error("Error fetching sell requests:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Iltimos, tizimga kiring")
      return
    }

    // Validation
    if (
      !formData.product_name ||
      !formData.price ||
      !formData.category_id ||
      !formData.contact_phone ||
      !formData.location
    ) {
      toast.error("Majburiy maydonlarni to'ldiring")
      return
    }

    const price = Number.parseFloat(formData.price)
    if (isNaN(price) || price <= 0) {
      toast.error("Narxni to'g'ri kiriting")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/sell-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
          price: price,
          stock_quantity: Number.parseInt(formData.stock_quantity) || 1,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        // Reset form
        setFormData({
          product_name: "",
          author: "",
          brand: "",
          description: "",
          price: "",
          category_id: "",
          stock_quantity: "1",
          condition: "new",
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          location: "",
          images: [],
          product_type: "physical",
          isbn: "",
          language: "uz",
          tags: [],
        })
        setNewTag("")
        // Refresh requests
        await fetchUserSellRequests(user.id)
        setActiveTab("requests")
      } else {
        toast.error(result.error || "Xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Submit error:", error)
      toast.error("Server bilan aloqada xatolik")
    } finally {
      setSubmitting(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Kutilmoqda
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Tasdiqlangan
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rad etilgan
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Noma'lum
          </Badge>
        )
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
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Orqaga
            </Button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text">Mahsulot sotish</h1>
                <p className="text-gray-600 text-lg">Mahsulotingizni bozorga qo'ying</p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 glass-effect border-0">
              <TabsTrigger value="new">Yangi so'rov</TabsTrigger>
              <TabsTrigger value="requests">Mening so'rovlarim ({sellRequests.length})</TabsTrigger>
            </TabsList>

            {/* New Request Tab */}
            <TabsContent value="new">
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle>Mahsulot ma'lumotlari</CardTitle>
                  <p className="text-gray-600">
                    Mahsulotingiz haqida to'liq ma'lumot bering. Admin ko'rib chiqishdan so'ng bozorga qo'shiladi.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="product_name">
                          Mahsulot nomi <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="product_name"
                            value={formData.product_name}
                            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                            className="pl-10 h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                            placeholder="Masalan: Matematika darsligi"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category_id">
                          Kategoriya <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.category_id}
                          onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm">
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
                        <Label htmlFor="author">Muallif/Brend</Label>
                        <Input
                          id="author"
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                          className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                          placeholder="Muallif yoki brend nomi"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price">
                          Narx (so'm) <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="price"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="pl-10 h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                            placeholder="50000"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stock_quantity">Miqdor</Label>
                        <Input
                          id="stock_quantity"
                          type="number"
                          min="1"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                          className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                          placeholder="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="condition">Holati</Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(value) => setFormData({ ...formData, condition: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Yangi</SelectItem>
                            <SelectItem value="like_new">Yangidek</SelectItem>
                            <SelectItem value="good">Yaxshi</SelectItem>
                            <SelectItem value="fair">O'rtacha</SelectItem>
                            <SelectItem value="poor">Yomon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Tavsif</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-[100px] rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                        placeholder="Mahsulot haqida batafsil ma'lumot bering..."
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Teglar</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-1 h-4 w-4 p-0"
                              onClick={() => removeTag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="h-10 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                          placeholder="Teg qo'shish..."
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} size="sm" className="h-10 px-4">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">
                          Telefon raqam <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="contact_phone"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            className="pl-10 h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                            placeholder="+998 90 123 45 67"
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
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            className="pl-10 h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">
                        Joylashuv <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="pl-10 h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                          placeholder="Shahar, tuman, ko'cha..."
                          required
                        />
                      </div>
                    </div>

                    {/* Additional fields for books */}
                    {formData.product_type === "book" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="isbn">ISBN</Label>
                          <Input
                            id="isbn"
                            value={formData.isbn}
                            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                            className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                            placeholder="978-0-123456-78-9"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="language">Til</Label>
                          <Select
                            value={formData.language}
                            onValueChange={(value) => setFormData({ ...formData, language: value })}
                          >
                            <SelectTrigger className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="uz">O'zbek</SelectItem>
                              <SelectItem value="ru">Rus</SelectItem>
                              <SelectItem value="en">Ingliz</SelectItem>
                              <SelectItem value="other">Boshqa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-6">
                      <Button type="submit" disabled={submitting} className="btn-primary px-8 py-3 text-lg">
                        {submitting ? (
                          <>
                            <Package className="mr-2 h-4 w-4 animate-spin" />
                            Yuborilmoqda...
                          </>
                        ) : (
                          <>
                            <Package className="mr-2 h-4 w-4" />
                            So'rov yuborish
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests">
              <div className="space-y-6">
                {sellRequests.length === 0 ? (
                  <Card className="card-beautiful">
                    <CardContent className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">So'rovlar yo'q</h3>
                      <p className="text-gray-600 mb-6">Hali birorta mahsulot sotish so'rovi yubormagansiz</p>
                      <Button onClick={() => setActiveTab("new")} className="btn-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Birinchi so'rov yuborish
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  sellRequests.map((request) => (
                    <Card key={request.id} className="card-beautiful">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              {request.categories?.icon || "📦"}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">{request.product_name}</h3>
                              <p className="text-gray-600">
                                {request.categories?.name_uz} • {formatDate(request.created_at)}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="font-semibold text-green-600">{formatPrice(request.price)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <span>{request.stock_quantity} dona</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>{request.location}</span>
                          </div>
                        </div>

                        {request.description && (
                          <div className="mb-4">
                            <p className="text-gray-700">{request.description}</p>
                          </div>
                        )}

                        {request.tags && request.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {request.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {request.admin_notes && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                            <h4 className="font-medium mb-2">Admin izohi:</h4>
                            <p className="text-gray-700">{request.admin_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
