"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Upload, X, Package, ArrowLeft, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Category {
  id: string
  name: string
  icon: string
}

interface ProductData {
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
}

export default function AddProduct() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)

  const [productData, setProductData] = useState<ProductData>({
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

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Mahsulot qo'shish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
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
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Kategoriyalarni olishda xatolik")
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

      const { error: uploadError } = await supabase.storage.from("products").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(filePath)

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

    setLoading(true)

    try {
      // Create product application instead of direct product creation
      const applicationData = {
        user_id: user.id,
        product_data: {
          ...productData,
          seller_id: user.id,
        },
        status: "pending",
      }

      const { error } = await supabase.from("product_applications").insert(applicationData)

      if (error) throw error

      toast.success("Mahsulot arizasi yuborildi! Admin tasdiqlashini kuting.")
      router.push("/seller-panel/products")
    } catch (error) {
      console.error("Error creating product application:", error)
      toast.error("Mahsulot arizasini yuborishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/seller-panel/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yangi mahsulot qo'shish</h1>
          <p className="text-gray-600">Mahsulot ma'lumotlarini to'ldiring va admin tasdiqlashini kuting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategoriya *</Label>
                <Select
                  value={productData.category_id}
                  onValueChange={(value) => setProductData({ ...productData, category_id: value })}
                >
                  <SelectTrigger>
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
                className="min-h-[100px]"
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Turi</Label>
                <Select
                  value={productData.product_type}
                  onValueChange={(value) => setProductData({ ...productData, product_type: value })}
                >
                  <SelectTrigger>
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
        <Card>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Muallif</Label>
                <Input
                  id="author"
                  placeholder="Muallif nomi"
                  value={productData.author}
                  onChange={(e) => setProductData({ ...productData, author: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Settings */}
        <Card>
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
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Mahsulot rasmi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {productData.image_url ? (
              <div className="relative">
                <img
                  src={productData.image_url || "/placeholder.svg"}
                  alt="Product"
                  className="w-full h-64 object-cover rounded-lg"
                />
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Mahsulot rasmini yuklang</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("image-upload")?.click()}
                  disabled={imageUploading}
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
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yuborilmoqda...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Arizani yuborish
              </>
            )}
          </Button>
          <Link href="/seller-panel/products">
            <Button type="button" variant="outline">
              Bekor qilish
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
