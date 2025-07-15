"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Upload, X, ArrowLeft, Loader2, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

interface Category {
  id: string
  name: string
  icon: string
}

interface ProductData {
  id: string
  name: string
  description: string
  price: number
  stock_quantity: number
  category_id: string
  product_type: string
  brand: string
  author: string
  has_delivery: boolean
  delivery_price: number
  image_url: string
  has_warranty: boolean
  warranty_period: string
  has_return: boolean
  return_period: string
}

export default function EditProduct() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)

  const [productData, setProductData] = useState<ProductData>({
    id: "",
    name: "",
    description: "",
    price: 0,
    stock_quantity: 1,
    category_id: "",
    product_type: "physical",
    brand: "",
    author: "",
    has_delivery: false,
    delivery_price: 0,
    image_url: "",
    has_warranty: false,
    warranty_period: "",
    has_return: false,
    return_period: "",
  })

  useEffect(() => {
    checkUser()
    fetchCategories()
    fetchProduct()
  }, [params.id])

  const checkUser = async () => {
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
        toast.error("Mahsulot tahrirlash uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(userData)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon")
        .eq("is_active", true)
        .order("sort_order")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Kategoriyalarni olishda xatolik")
    }
  }

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*").eq("id", params.id).single()

      if (error) throw error

      if (!data) {
        toast.error("Mahsulot topilmadi")
        router.push("/seller-panel/products")
        return
      }

      // Check if user owns this product
      if (data.seller_id !== user?.id) {
        toast.error("Bu mahsulotni tahrirlash huquqingiz yo'q")
        router.push("/seller-panel/products")
        return
      }

      setProductData({
        id: data.id,
        name: data.name || "",
        description: data.description || "",
        price: data.price || 0,
        stock_quantity: data.stock_quantity || 1,
        category_id: data.category_id || "",
        product_type: data.product_type || "physical",
        brand: data.brand || "",
        author: data.author || "",
        has_delivery: data.has_delivery || false,
        delivery_price: data.delivery_price || 0,
        image_url: data.image_url || "",
        has_warranty: data.has_warranty || false,
        warranty_period: data.warranty_period || "",
        has_return: data.has_return || false,
        return_period: data.return_period || "",
      })
    } catch (error) {
      console.error("Error fetching product:", error)
      toast.error("Mahsulotni olishda xatolik")
      router.push("/seller-panel/products")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5MB dan oshmasligi kerak")
      return
    }

    setImageUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `products/${fileName}`

      // Upload to 'images' bucket instead of 'products'
      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath)

      setProductData({ ...productData, image_url: publicUrl })
      toast.success("Rasm muvaffaqiyatli yuklandi")
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Rasmni yuklashda xatolik")
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productData.name.trim() || !productData.description.trim() || !productData.category_id) {
      toast.error("Barcha majburiy maydonlarni to'ldiring")
      return
    }

    if (productData.price <= 0) {
      toast.error("Narx 0 dan katta bo'lishi kerak")
      return
    }

    if (productData.stock_quantity <= 0) {
      toast.error("Miqdor 0 dan katta bo'lishi kerak")
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: productData.name.trim(),
          description: productData.description.trim(),
          price: productData.price,
          stock_quantity: productData.stock_quantity,
          category_id: productData.category_id,
          product_type: productData.product_type,
          brand: productData.brand.trim(),
          author: productData.author.trim(),
          has_delivery: productData.has_delivery,
          delivery_price: productData.delivery_price,
          image_url: productData.image_url,
          has_warranty: productData.has_warranty,
          warranty_period: productData.warranty_period.trim(),
          has_return: productData.has_return,
          return_period: productData.return_period.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", productData.id)

      if (error) throw error

      toast.success("Mahsulot muvaffaqiyatli yangilandi!")
      router.push("/seller-panel/products")
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Mahsulotni yangilashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/seller-panel/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Mahsulotni tahrirlash</h1>
          <p className="text-gray-600">Mahsulot ma'lumotlarini yangilang</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle>Asosiy ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Mahsulot nomi *</Label>
                <Input
                  id="name"
                  placeholder="Mahsulot nomini kiriting"
                  value={productData.name}
                  onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                  required
                  className="input-beautiful"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategoriya *</Label>
                <Select
                  value={productData.category_id}
                  onValueChange={(value) => setProductData({ ...productData, category_id: value })}
                >
                  <SelectTrigger className="input-beautiful">
                    <SelectValue placeholder="Kategoriya tanlang" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Tavsif *</Label>
              <Textarea
                id="description"
                placeholder="Mahsulot haqida batafsil ma'lumot"
                className="min-h-[100px] input-beautiful"
                value={productData.description}
                onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Narx (so'm) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  value={productData.price || ""}
                  onChange={(e) => setProductData({ ...productData, price: Number(e.target.value) })}
                  required
                  className="input-beautiful"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Miqdor *</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="1"
                  value={productData.stock_quantity || ""}
                  onChange={(e) => setProductData({ ...productData, stock_quantity: Number(e.target.value) })}
                  required
                  className="input-beautiful"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Turi</Label>
                <Select
                  value={productData.product_type}
                  onValueChange={(value) => setProductData({ ...productData, product_type: value })}
                >
                  <SelectTrigger className="input-beautiful">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Jismoniy mahsulot</SelectItem>
                    <SelectItem value="digital">Raqamli mahsulot</SelectItem>
                    <SelectItem value="service">Xizmat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle>Qo'shimcha ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brend</Label>
                <Input
                  id="brand"
                  placeholder="Brend nomi"
                  value={productData.brand}
                  onChange={(e) => setProductData({ ...productData, brand: e.target.value })}
                  className="input-beautiful"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Muallif</Label>
                <Input
                  id="author"
                  placeholder="Muallif nomi"
                  value={productData.author}
                  onChange={(e) => setProductData({ ...productData, author: e.target.value })}
                  className="input-beautiful"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Settings */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle>Yetkazib berish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="delivery">Yetkazib berish xizmati</Label>
                <p className="text-sm text-gray-600">Mahsulotni yetkazib berasizmi?</p>
              </div>
              <Switch
                id="delivery"
                checked={productData.has_delivery}
                onCheckedChange={(checked) => setProductData({ ...productData, has_delivery: checked })}
              />
            </div>

            {productData.has_delivery && (
              <div className="space-y-2">
                <Label htmlFor="delivery_price">Yetkazib berish narxi (so'm)</Label>
                <Input
                  id="delivery_price"
                  type="number"
                  placeholder="0"
                  value={productData.delivery_price || ""}
                  onChange={(e) => setProductData({ ...productData, delivery_price: Number(e.target.value) })}
                  className="input-beautiful"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warranty & Return */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle>Kafolat va qaytarish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="warranty">Kafolat</Label>
                <p className="text-sm text-gray-600">Mahsulotga kafolat berasizmi?</p>
              </div>
              <Switch
                id="warranty"
                checked={productData.has_warranty}
                onCheckedChange={(checked) => setProductData({ ...productData, has_warranty: checked })}
              />
            </div>

            {productData.has_warranty && (
              <div className="space-y-2">
                <Label htmlFor="warranty_period">Kafolat muddati</Label>
                <Input
                  id="warranty_period"
                  placeholder="Masalan: 1 yil, 6 oy"
                  value={productData.warranty_period}
                  onChange={(e) => setProductData({ ...productData, warranty_period: e.target.value })}
                  className="input-beautiful"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="return">Qaytarish</Label>
                <p className="text-sm text-gray-600">Mahsulotni qaytarib olasizmi?</p>
              </div>
              <Switch
                id="return"
                checked={productData.has_return}
                onCheckedChange={(checked) => setProductData({ ...productData, has_return: checked })}
              />
            </div>

            {productData.has_return && (
              <div className="space-y-2">
                <Label htmlFor="return_period">Qaytarish muddati</Label>
                <Input
                  id="return_period"
                  placeholder="Masalan: 7 kun, 14 kun"
                  value={productData.return_period}
                  onChange={(e) => setProductData({ ...productData, return_period: e.target.value })}
                  className="input-beautiful"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle>Mahsulot rasmi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {productData.image_url ? (
              <div className="relative">
                <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-gray-100">
                  <Image
                    src={productData.image_url || "/placeholder.svg"}
                    alt="Product"
                    fill
                    className="object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setProductData({ ...productData, image_url: "" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Mahsulot rasmini yuklang</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("image-upload")?.click()}
                  disabled={imageUploading}
                  className="bg-transparent"
                >
                  {imageUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Yuklanmoqda...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Rasm tanlash
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2">Maksimal hajm: 5MB</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" className="flex-1 btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Saqlash
              </>
            )}
          </Button>
          <Link href="/seller-panel/products">
            <Button type="button" variant="outline" className="bg-transparent">
              Bekor qilish
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
