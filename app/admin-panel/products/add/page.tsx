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
import { Package, Upload, Save, ArrowLeft, Plus, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Category {
  id: string
  name: string
  slug: string
}

interface GroupProduct {
  id: string
  product_name: string
  product_description: string
  individual_price: string
}

export default function AdminAddProductPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [productType, setProductType] = useState<"single" | "group">("single")
  const [groupProducts, setGroupProducts] = useState<GroupProduct[]>([
    { id: "1", product_name: "", product_description: "", individual_price: "" },
  ])

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
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

  const addGroupProduct = () => {
    if (groupProducts.length < 30) {
      setGroupProducts([
        ...groupProducts,
        { id: Date.now().toString(), product_name: "", product_description: "", individual_price: "" },
      ])
    } else {
      toast.error("Maksimal 30 ta mahsulot qo'shish mumkin")
    }
  }

  const removeGroupProduct = (id: string) => {
    if (groupProducts.length > 1) {
      setGroupProducts(groupProducts.filter((p) => p.id !== id))
    }
  }

  const updateGroupProduct = (id: string, field: string, value: string) => {
    setGroupProducts(groupProducts.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const generateGroupTitle = () => {
    const validProducts = groupProducts.filter((p) => p.product_name.trim())
    return validProducts.map((p) => p.product_name.trim()).join(", ")
  }

  const generateGroupDescription = () => {
    const validProducts = groupProducts.filter((p) => p.product_name.trim())
    let description = "Bu to'plamda quyidagi mahsulotlar mavjud:\n\n"

    validProducts.forEach((product, index) => {
      description += `${index + 1}. ${product.product_name}`
      if (product.product_description.trim()) {
        description += ` - ${product.product_description}`
      }
      if (product.individual_price.trim()) {
        description += ` (${Number(product.individual_price).toLocaleString()} so'm)`
      }
      description += "\n"
    })

    return description
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

      // For group products, validate group products
      if (productType === "group") {
        const validGroupProducts = groupProducts.filter((p) => p.product_name.trim())
        if (validGroupProducts.length === 0) {
          toast.error("Kamida bitta mahsulot qo'shing")
          return
        }
      }

      let imageUrl = ""
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      // Prepare product data
      const productData = {
        name: productType === "group" ? generateGroupTitle() : formData.name,
        description: productType === "group" ? generateGroupDescription() : formData.description || null,
        price: Number.parseFloat(formData.price),
        stock_quantity: Number.parseInt(formData.stock_quantity),
        product_type: productType,
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

      const { data: product, error } = await supabase.from("products").insert(productData).select().single()

      if (error) throw error

      // If group product, insert group products
      if (productType === "group") {
        const validGroupProducts = groupProducts.filter((p) => p.product_name.trim())
        const groupProductsData = validGroupProducts.map((gp) => ({
          group_id: product.id,
          product_name: gp.product_name.trim(),
          product_description: gp.product_description.trim() || null,
          individual_price: gp.individual_price.trim() ? Number.parseFloat(gp.individual_price) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        const { error: groupError } = await supabase.from("group_products").insert(groupProductsData)
        if (groupError) throw groupError
      }

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
            {/* Product Type Selection */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle>Mahsulot turi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={productType === "single" ? "default" : "outline"}
                    onClick={() => setProductType("single")}
                    className="flex-1"
                  >
                    Yakka mahsulot
                  </Button>
                  <Button
                    type="button"
                    variant={productType === "group" ? "default" : "outline"}
                    onClick={() => setProductType("group")}
                    className="flex-1"
                  >
                    Guruhli mahsulot
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asosiy ma'lumotlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {productType === "single" && (
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
                )}

                {productType === "single" && (
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
                )}

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
                </div>

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
                    <Label htmlFor="brand">Brend</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => handleInputChange("brand", e.target.value)}
                      placeholder="Brend nomi"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Group Products */}
            {productType === "group" && (
              <Card className="card-beautiful">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Guruh mahsulotlari</CardTitle>
                    <Button type="button" onClick={addGroupProduct} size="sm" disabled={groupProducts.length >= 30}>
                      <Plus className="h-4 w-4 mr-2" />
                      Mahsulot qo'shish
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupProducts.map((product, index) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Mahsulot {index + 1}</h4>
                        {groupProducts.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGroupProduct(product.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Mahsulot nomi *</Label>
                          <Input
                            value={product.product_name}
                            onChange={(e) => updateGroupProduct(product.id, "product_name", e.target.value)}
                            placeholder="Mahsulot nomini kiriting"
                            required
                          />
                        </div>
                        <div>
                          <Label>Alohida narx (ixtiyoriy)</Label>
                          <Input
                            type="number"
                            value={product.individual_price}
                            onChange={(e) => updateGroupProduct(product.id, "individual_price", e.target.value)}
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Tavsif (ixtiyoriy)</Label>
                        <Textarea
                          value={product.product_description}
                          onChange={(e) => updateGroupProduct(product.id, "product_description", e.target.value)}
                          placeholder="Mahsulot haqida qisqacha"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}

                  {productType === "group" && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-2">Avtomatik yaratilgan ma'lumotlar:</h5>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Sarlavha:</strong> {generateGroupTitle() || "Mahsulot nomlarini kiriting"}
                        </div>
                        <div>
                          <strong>Tavsif:</strong>
                          <pre className="whitespace-pre-wrap text-xs mt-1 bg-white p-2 rounded border">
                            {generateGroupDescription()}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
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
