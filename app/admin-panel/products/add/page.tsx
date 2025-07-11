"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Package, Upload, Save, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Category {
  id: string
  name: string
  slug: string
}

export default function AdminAddProductPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    product_type: "book",
    brand: "",
    author: "",
    isbn: "",
    publisher: "",
    publication_year: "",
    language: "uzbek",
    pages: "",
    condition: "new",
    category_id: "",
    has_delivery: false,
    delivery_price: "",
    is_active: true,
    is_approved: true,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_admin) {
        toast.error("Sizda admin huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
      await fetchCategories()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
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

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `products/${fileName}`

    const { error: uploadError } = await supabase.storage.from("products").upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.price || !formData.stock_quantity || !formData.category_id) {
        toast.error("Majburiy maydonlarni to'ldiring")
        return
      }

      let imageUrl = ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      // Prepare product data
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: Number.parseFloat(formData.price),
        stock_quantity: Number.parseInt(formData.stock_quantity),
        product_type: formData.product_type,
        brand: formData.brand || null,
        author: formData.author || null,
        isbn: formData.isbn || null,
        publisher: formData.publisher || null,
        publication_year: formData.publication_year ? Number.parseInt(formData.publication_year) : null,
        language: formData.language,
        pages: formData.pages ? Number.parseInt(formData.pages) : null,
        condition: formData.condition,
        category_id: formData.category_id,
        seller_id: user.id,
        image_url: imageUrl,
        has_delivery: formData.has_delivery,
        delivery_price: formData.has_delivery ? Number.parseFloat(formData.delivery_price || "0") : 0,
        is_active: formData.is_active,
        is_approved: formData.is_approved,
        like_count: 0,
        view_count: 0,
        order_count: 0,
        average_rating: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("products").insert(productData).select().single()

      if (error) throw error

      toast.success("Mahsulot muvaffaqiyatli qo'shildi")
      router.push("/admin-panel/products")
    } catch (error) {
      console.error("Error creating product:", error)
      toast.error("Mahsulot qo'shishda xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Mahsulot qo'shish</h1>
          <p className="text-gray-600">Yangi mahsulot qo'shish</p>
        </div>
        <Button asChild variant="outline" className="bg-transparent">
          <Link href="/admin-panel/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Link>
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asosiy ma'lumotlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Mahsulot nomi *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Mahsulot nomini kiriting"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Tavsif</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Mahsulot haqida batafsil ma'lumot"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Narx (so'm) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock_quantity">Ombor miqdori *</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => handleInputChange("stock_quantity", e.target.value)}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category_id">Kategoriya *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleInputChange("category_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategoriyani tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="product_type">Mahsulot turi</Label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value) => handleInputChange("product_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="book">Kitob</SelectItem>
                        <SelectItem value="electronics">Elektronika</SelectItem>
                        <SelectItem value="clothing">Kiyim</SelectItem>
                        <SelectItem value="home">Uy-ro'zg'or</SelectItem>
                        <SelectItem value="sports">Sport</SelectItem>
                        <SelectItem value="beauty">Go'zallik</SelectItem>
                        <SelectItem value="other">Boshqa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition">Holati</Label>
                    <Select value={formData.condition} onValueChange={(value) => handleInputChange("condition", value)}>
                      <SelectTrigger>
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
                  <div>
                    <Label htmlFor="language">Til</Label>
                    <Select value={formData.language} onValueChange={(value) => handleInputChange("language", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uzbek">O'zbek</SelectItem>
                        <SelectItem value="russian">Rus</SelectItem>
                        <SelectItem value="english">Ingliz</SelectItem>
                        <SelectItem value="other">Boshqa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Book Specific Fields */}
            {formData.product_type === "book" && (
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle>Kitob ma'lumotlari</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="author">Muallif</Label>
                      <Input
                        id="author"
                        value={formData.author}
                        onChange={(e) => handleInputChange("author", e.target.value)}
                        placeholder="Muallif ismi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="publisher">Nashriyot</Label>
                      <Input
                        id="publisher"
                        value={formData.publisher}
                        onChange={(e) => handleInputChange("publisher", e.target.value)}
                        placeholder="Nashriyot nomi"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="isbn">ISBN</Label>
                      <Input
                        id="isbn"
                        value={formData.isbn}
                        onChange={(e) => handleInputChange("isbn", e.target.value)}
                        placeholder="ISBN raqami"
                      />
                    </div>
                    <div>
                      <Label htmlFor="publication_year">Nashr yili</Label>
                      <Input
                        id="publication_year"
                        type="number"
                        value={formData.publication_year}
                        onChange={(e) => handleInputChange("publication_year", e.target.value)}
                        placeholder="2024"
                        min="1900"
                        max="2030"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pages">Sahifalar soni</Label>
                      <Input
                        id="pages"
                        type="number"
                        value={formData.pages}
                        onChange={(e) => handleInputChange("pages", e.target.value)}
                        placeholder="0"
                        min="1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Product Fields */}
            {formData.product_type !== "book" && (
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle>Qo'shimcha ma'lumotlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="brand">Brend</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => handleInputChange("brand", e.target.value)}
                      placeholder="Brend nomi"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle>Yetkazib berish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_delivery"
                    checked={formData.has_delivery}
                    onCheckedChange={(checked) => handleInputChange("has_delivery", checked)}
                  />
                  <Label htmlFor="has_delivery">Yetkazib berish xizmati bor</Label>
                </div>

                {formData.has_delivery && (
                  <div>
                    <Label htmlFor="delivery_price">Yetkazib berish narxi (so'm)</Label>
                    <Input
                      id="delivery_price"
                      type="number"
                      value={formData.delivery_price}
                      onChange={(e) => handleInputChange("delivery_price", e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1000"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Image Upload */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Mahsulot rasmi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg mx-auto"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview("")
                        }}
                        className="bg-transparent"
                      >
                        Rasmni o'chirish
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <Label htmlFor="image" className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-500">Rasm yuklash</span>
                          <span className="text-gray-600"> yoki shu yerga tashlang</span>
                        </Label>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF (max. 5MB)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle>Holat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                  />
                  <Label htmlFor="is_active">Faol</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_approved"
                    checked={formData.is_approved}
                    onCheckedChange={(checked) => handleInputChange("is_approved", checked)}
                  />
                  <Label htmlFor="is_approved">Tasdiqlangan</Label>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="card-beautiful">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button type="submit" disabled={saving} className="w-full btn-primary">
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saqlanmoqda...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Mahsulotni saqlash
                      </>
                    )}
                  </Button>

                  <Button asChild type="button" variant="outline" className="w-full bg-transparent">
                    <Link href="/admin-panel/products">Bekor qilish</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
