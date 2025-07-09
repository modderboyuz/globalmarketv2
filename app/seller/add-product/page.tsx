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
import { Package, DollarSign, X, Plus, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export default function AddProductPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    stock_quantity: "1",
    product_type: "physical",
    brand: "",
    author: "",
    isbn: "",
    language: "uz",
    condition: "new",
    tags: [] as string[],
    images: [] as string[],
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

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Sotuvchi hisobiga kirish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(userData)
      await fetchCategories()
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Kategoriyalarni olishda xatolik")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Iltimos, tizimga kiring")
      return
    }

    // Validation
    if (!formData.name || !formData.price || !formData.category_id) {
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
      // Create admin message for product approval
      const { error } = await supabase.from("admin_messages").insert({
        type: "product_approval",
        title: "Yangi mahsulot tasdiqlash so'rovi",
        content: `Sotuvchi "${user.company_name || user.full_name}" yangi mahsulot qo'shishni so'rayapti: "${formData.name}"`,
        data: {
          seller_id: user.id,
          product_data: {
            ...formData,
            price: price,
            stock_quantity: Number.parseInt(formData.stock_quantity) || 1,
            seller_id: user.id,
          },
        },
        status: "pending",
        created_by: user.id,
      })

      if (error) throw error

      toast.success("Mahsulot tasdiqlash uchun yuborildi! Admin ko'rib chiqishdan so'ng faollashtiriladi.")

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        category_id: "",
        stock_quantity: "1",
        product_type: "physical",
        brand: "",
        author: "",
        isbn: "",
        language: "uz",
        condition: "new",
        tags: [],
        images: [],
      })
      setNewTag("")

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/seller/dashboard")
      }, 2000)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Yangi mahsulot qo'shish</h1>
            <p className="text-gray-600">Mahsulotingizni bozorga qo'ying</p>
          </div>
        </div>
      </div>

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
                <Label htmlFor="name">
                  Mahsulot nomi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                  placeholder="Masalan: Matematika darsligi"
                  required
                />
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
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="brand">Brend/Muallif</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                  placeholder="Brend yoki muallif nomi"
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

            {/* Book specific fields */}
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
                    Tasdiqlash uchun yuborish
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
