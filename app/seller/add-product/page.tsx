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
import { Switch } from "@/components/ui/switch"
import { Plus, Upload, Package, DollarSign, ArrowLeft, Loader2, ImageIcon, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: string
  name_uz: string
  slug: string
  icon: string
}

export default function AddProductPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    productType: "other",
    brand: "",
    author: "",
    isbn: "",
    stockQuantity: "1",
    hasDelivery: false,
    deliveryPrice: "0",
    hasWarranty: false,
    warrantyMonths: "0",
    isReturnable: true,
    returnDays: "7",
    imageUrl: "",
  })

  useEffect(() => {
    checkUser()
    fetchCategories()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      // Check if user is verified seller
      const { data: userData } = await supabase
        .from("users")
        .select("is_verified_seller, verification_status")
        .eq("id", currentUser.id)
        .single()

      if (!userData?.is_verified_seller) {
        toast.error("Mahsulot qo'shish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(currentUser)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Kategoriyalarni olishda xatolik")
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm fayllari ruxsat etilgan")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5MB dan oshmasligi kerak")
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage.from("products").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(filePath)

      setFormData({ ...formData, imageUrl: publicUrl })
      toast.success("Rasm muvaffaqiyatli yuklandi!")
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast.error("Rasm yuklashda xatolik: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!formData.name || !formData.price || !formData.categoryId) {
        toast.error("Barcha majburiy maydonlarni to'ldiring")
        return
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        image_url: formData.imageUrl,
        category_id: formData.categoryId,
        seller_id: user.id,
        product_type: formData.productType,
        brand: formData.brand || null,
        author: formData.author || null,
        isbn: formData.isbn || null,
        stock_quantity: Number.parseInt(formData.stockQuantity),
        has_delivery: formData.hasDelivery,
        delivery_price: formData.hasDelivery ? Number.parseFloat(formData.deliveryPrice) : 0,
        has_warranty: formData.hasWarranty,
        warranty_months: formData.hasWarranty ? Number.parseInt(formData.warrantyMonths) : 0,
        is_returnable: formData.isReturnable,
        return_days: formData.isReturnable ? Number.parseInt(formData.returnDays) : 0,
        is_active: true,
      }

      const { error } = await supabase.from("products").insert(productData)

      if (error) throw error

      toast.success("Mahsulot muvaffaqiyatli qo'shildi!")
      router.push("/seller/products")
    } catch (error: any) {
      console.error("Error adding product:", error)
      toast.error(error.message || "Mahsulot qo'shishda xatolik")
    } finally {
      setSubmitting(false)
    }
  }

  const productTypes = [
    { value: "book", label: "Kitob", icon: "📚" },
    { value: "notebook", label: "Daftar", icon: "📓" },
    { value: "pen", label: "Qalam", icon: "🖊️" },
    { value: "pencil", label: "Rangli qalam", icon: "✏️" },
    { value: "bag", label: "Sumka", icon: "🎒" },
    { value: "calculator", label: "Kalkulyator", icon: "🔢" },
    { value: "geometry", label: "Geometriya to'plami", icon: "📐" },
    { value: "folder", label: "Papka", icon: "📁" },
    { value: "clips", label: "Skrepka", icon: "📎" },
    { value: "stickers", label: "Stiker", icon: "🏷️" },
    { value: "other", label: "Boshqa", icon: "📦" },
  ]

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>

          <Card className="card-beautiful">
            <CardHeader className="text-center pb-6">
              <div className="floating-animation mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
                  <Plus className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold gradient-text">Yangi mahsulot qo'shish</CardTitle>
              <p className="text-gray-600">Mahsulot ma'lumotlarini to'ldiring</p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Product Image */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-container">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold gradient-text">Mahsulot rasmi</h3>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    {formData.imageUrl ? (
                      <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-gray-200">
                        <img
                          src={formData.imageUrl || "/placeholder.svg"}
                          alt="Product"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setFormData({ ...formData, imageUrl: "" })}
                        >
                          O'chirish
                        </Button>
                      </div>
                    ) : (
                      <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Rasm yuklang</p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <Button type="button" variant="outline" disabled={uploading} className="border-2 bg-transparent">
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Yuklanmoqda...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Rasm yuklash
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="section-divider"></div>

                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-container">
                      <Package className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold gradient-text">Asosiy ma'lumotlar</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Mahsulot nomi *</Label>
                      <Input
                        id="name"
                        placeholder="Mahsulot nomini kiriting"
                        className="input-beautiful"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Narx (so'm) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                        <Input
                          id="price"
                          type="number"
                          placeholder="0"
                          className="input-beautiful pl-12"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Tavsif</Label>
                    <Textarea
                      id="description"
                      placeholder="Mahsulot haqida batafsil ma'lumot"
                      className="input-beautiful min-h-[120px]"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategoriya *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                      >
                        <SelectTrigger className="input-beautiful">
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
                      <Label htmlFor="productType">Mahsulot turi *</Label>
                      <Select
                        value={formData.productType}
                        onValueChange={(value) => setFormData({ ...formData, productType: value })}
                      >
                        <SelectTrigger className="input-beautiful">
                          <SelectValue placeholder="Turni tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stockQuantity">Miqdor *</Label>
                      <Input
                        id="stockQuantity"
                        type="number"
                        placeholder="1"
                        className="input-beautiful"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Product Type Specific Fields */}
                  {formData.productType === "book" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                      <div className="space-y-2">
                        <Label htmlFor="author">Muallif</Label>
                        <Input
                          id="author"
                          placeholder="Muallif nomi"
                          className="input-beautiful"
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="isbn">ISBN</Label>
                        <Input
                          id="isbn"
                          placeholder="ISBN raqami"
                          className="input-beautiful"
                          value={formData.isbn}
                          onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {formData.productType !== "book" && (
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brend</Label>
                      <Input
                        id="brand"
                        placeholder="Brend nomi"
                        className="input-beautiful"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="section-divider"></div>

                {/* Delivery & Services */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-container">
                      <Star className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold gradient-text">Xizmatlar</h3>
                  </div>

                  {/* Delivery */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-2xl">
                      <div>
                        <h4 className="font-medium">Yetkazib berish</h4>
                        <p className="text-sm text-gray-600">Mahsulotni yetkazib berish xizmati</p>
                      </div>
                      <Switch
                        checked={formData.hasDelivery}
                        onCheckedChange={(checked) => setFormData({ ...formData, hasDelivery: checked })}
                      />
                    </div>

                    {formData.hasDelivery && (
                      <div className="space-y-2 ml-4">
                        <Label htmlFor="deliveryPrice">Yetkazib berish narxi (so'm)</Label>
                        <Input
                          id="deliveryPrice"
                          type="number"
                          placeholder="0"
                          className="input-beautiful"
                          value={formData.deliveryPrice}
                          onChange={(e) => setFormData({ ...formData, deliveryPrice: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Warranty */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-2xl">
                      <div>
                        <h4 className="font-medium">Kafolat</h4>
                        <p className="text-sm text-gray-600">Mahsulot uchun kafolat berish</p>
                      </div>
                      <Switch
                        checked={formData.hasWarranty}
                        onCheckedChange={(checked) => setFormData({ ...formData, hasWarranty: checked })}
                      />
                    </div>

                    {formData.hasWarranty && (
                      <div className="space-y-2 ml-4">
                        <Label htmlFor="warrantyMonths">Kafolat muddati (oy)</Label>
                        <Input
                          id="warrantyMonths"
                          type="number"
                          placeholder="12"
                          className="input-beautiful"
                          value={formData.warrantyMonths}
                          onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Return Policy */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-2xl">
                      <div>
                        <h4 className="font-medium">Qaytarish</h4>
                        <p className="text-sm text-gray-600">Mahsulotni qaytarish imkoniyati</p>
                      </div>
                      <Switch
                        checked={formData.isReturnable}
                        onCheckedChange={(checked) => setFormData({ ...formData, isReturnable: checked })}
                      />
                    </div>

                    {formData.isReturnable && (
                      <div className="space-y-2 ml-4">
                        <Label htmlFor="returnDays">Qaytarish muddati (kun)</Label>
                        <Input
                          id="returnDays"
                          type="number"
                          placeholder="7"
                          className="input-beautiful"
                          value={formData.returnDays}
                          onChange={(e) => setFormData({ ...formData, returnDays: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button type="submit" className="w-full btn-primary text-lg py-4" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Qo'shilmoqda...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-5 w-5" />
                        Mahsulot qo'shish
                      </>
                    )}
                  </Button>
                </div>

                <div className="card-beautiful p-6 bg-green-50/80 border-green-200">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" />💡 Maslahat
                  </h4>
                  <ul className="text-sm text-green-700 space-y-2">
                    <li>• Mahsulot nomini aniq va tushunarli yozing</li>
                    <li>• Sifatli rasm yuklang (5MB gacha)</li>
                    <li>• Batafsil tavsif yozing</li>
                    <li>• Raqobatbardosh narx belgilang</li>
                    <li>• Xizmatlarni to'g'ri sozlang</li>
                    <li>• Faqat G'uzor tumani uchun xizmat ko'rsatamiz</li>
                  </ul>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
