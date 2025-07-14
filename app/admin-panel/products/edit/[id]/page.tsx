"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Package, Upload, X, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

interface Product {
  id: string
  name: string
  description: string
  price: number
  delivery_price: number
  return_price: number
  has_delivery: boolean
  has_return: boolean
  category_id: string
  seller_id: string
  status: string
  stock_quantity: number
  images: string[]
  views: number
  likes_count: number
  orders_count: number
  rating: number
  created_at: string
  updated_at: string
  categories?: {
    name: string
  }
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    delivery_price: 0,
    return_price: 0,
    has_delivery: false,
    has_return: false,
    category_id: "",
    status: "active",
    stock_quantity: 0,
    images: [] as string[],
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (user && productId) {
      fetchProduct()
      fetchCategories()
    }
  }, [user, productId])

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
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    }
  }

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase.from("products").select(`*, categories(name)`).eq("id", productId).single()

      if (error) throw error

      if (!data) {
        toast.error("Mahsulot topilmadi")
        router.push("/admin-panel/products/globalmarket")
        return
      }

      setProduct(data)
      setFormData({
        name: data.name || "",
        description: data.description || "",
        price: data.price || 0,
        delivery_price: data.delivery_price || 0,
        return_price: data.return_price || 0,
        has_delivery: data.has_delivery || false,
        has_return: data.has_return || false,
        category_id: data.category_id || "",
        status: data.status || "active",
        stock_quantity: data.stock_quantity || 0,
        images: data.images || [],
      })
    } catch (error) {
      console.error("Error fetching product:", error)
      toast.error("Mahsulotni olishda xatolik")
      router.push("/admin-panel/products/globalmarket")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split(".").pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("images").getPublicUrl(filePath)

        return publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }))

      toast.success("Rasmlar yuklandi")
    } catch (error) {
      console.error("Error uploading images:", error)
      toast.error("Rasmlarni yuklashda xatolik")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Mahsulot nomini kiriting")
      return
    }

    if (formData.price <= 0) {
      toast.error("Mahsulot narxini kiriting")
      return
    }

    if (!formData.category_id) {
      toast.error("Kategoriyani tanlang")
      return
    }

    setSaving(true)

    try {
      const updateData = {
        ...formData,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("products").update(updateData).eq("id", productId)

      if (error) throw error

      toast.success("Mahsulot yangilandi")
      router.push("/admin-panel/products/globalmarket")
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Mahsulotni yangilashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded-2xl"></div>
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded-2xl"></div>
              <div className="h-48 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Mahsulot topilmadi</h3>
        <Button asChild>
          <Link href="/admin-panel/products/globalmarket">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga qaytish
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin-panel/products/globalmarket">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Mahsulotni tahrirlash</h1>
            <p className="text-gray-600">
              {product.name} - {product.categories?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/product/${productId}`}>
              <Eye className="h-4 w-4 mr-2" />
              Ko'rish
            </Link>
          </Button>
          <Badge variant={product.status === "active" ? "default" : "secondary"}>
            {product.status === "active" ? "Faol" : "Nofaol"}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Product Images */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle>Mahsulot rasmlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Images */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`Product ${index + 1}`}
                        width={150}
                        height={150}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">Yangi rasmlar yuklash</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <Button type="button" variant="outline" asChild disabled={uploading}>
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {uploading ? "Yuklanmoqda..." : "Rasmlarni tanlash"}
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle>Asosiy ma'lumotlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Mahsulot nomi *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mahsulot nomini kiriting"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Tavsif</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mahsulot haqida batafsil ma'lumot"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="category">Kategoriya *</Label>
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
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock">Zaxira miqdori</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number.parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Holat</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Faol</SelectItem>
                      <SelectItem value="inactive">Nofaol</SelectItem>
                      <SelectItem value="out_of_stock">Tugagan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Pricing & Services */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle>Narxlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="price">Asosiy narx (so'm) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number.parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_delivery">Yetkazib berish xizmati</Label>
                  <Switch
                    id="has_delivery"
                    checked={formData.has_delivery}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_delivery: checked })}
                  />
                </div>

                {formData.has_delivery && (
                  <div>
                    <Label htmlFor="delivery_price">Yetkazib berish narxi (so'm)</Label>
                    <Input
                      id="delivery_price"
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.delivery_price}
                      onChange={(e) =>
                        setFormData({ ...formData, delivery_price: Number.parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_return">Qaytarish xizmati</Label>
                  <Switch
                    id="has_return"
                    checked={formData.has_return}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_return: checked })}
                  />
                </div>

                {formData.has_return && (
                  <div>
                    <Label htmlFor="return_price">Qaytarish narxi (so'm)</Label>
                    <Input
                      id="return_price"
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.return_price}
                      onChange={(e) => setFormData({ ...formData, return_price: Number.parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Stats */}
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle>Mahsulot statistikasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{product.views || 0}</div>
                  <div className="text-sm text-gray-600">Ko'rishlar</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{product.likes_count || 0}</div>
                  <div className="text-sm text-gray-600">Yoqtirishlar</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{product.orders_count || 0}</div>
                  <div className="text-sm text-gray-600">Buyurtmalar</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{product.rating || 0}</div>
                  <div className="text-sm text-gray-600">Reyting</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="card-beautiful">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin-panel/products/globalmarket">Bekor qilish</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
