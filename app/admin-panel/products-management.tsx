"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Package, DollarSign } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  is_active: boolean
  is_approved: boolean
  author: string
  brand: string
  condition: string
  has_delivery: boolean
  delivery_price: number
  has_warranty: boolean
  warranty_months: number
  created_at: string
  category: {
    name: string
  }
  seller: {
    full_name: string
    company_name: string
  }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    stock_quantity: "1",
    author: "",
    brand: "",
    condition: "new",
    has_delivery: false,
    delivery_price: "",
    has_warranty: false,
    warranty_months: "",
    is_active: true,
    image_url: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories!products_category_id_fkey(name),
          seller:users!products_seller_id_fkey(full_name, company_name)
        `)
        .order("created_at", { ascending: false })

      if (productsError) throw productsError
      setProducts(productsData || [])

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    if (!file) return null

    setUploading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage.from("products").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Rasm yuklashda xatolik")
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error("Majburiy maydonlarni to'ldiring")
      return
    }

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        category_id: formData.category_id,
        stock_quantity: Number.parseInt(formData.stock_quantity) || 1,
        author: formData.author,
        brand: formData.brand,
        condition: formData.condition,
        has_delivery: formData.has_delivery,
        delivery_price: formData.has_delivery ? Number.parseFloat(formData.delivery_price) || 0 : 0,
        has_warranty: formData.has_warranty,
        warranty_months: formData.has_warranty ? Number.parseInt(formData.warranty_months) || 0 : 0,
        is_active: formData.is_active,
        is_approved: true,
        image_url: formData.image_url,
      }

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id)

        if (error) throw error
        toast.success("Mahsulot yangilandi!")
      } else {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error("User not authenticated")

        const { error } = await supabase.from("products").insert({
          ...productData,
          seller_id: userData.user.id,
        })

        if (error) throw error
        toast.success("Mahsulot qo'shildi!")
      }

      setShowDialog(false)
      setEditingProduct(null)
      resetForm()
      await fetchData()
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category_id: "", // Will need to fetch this
      stock_quantity: product.stock_quantity.toString(),
      author: product.author || "",
      brand: product.brand || "",
      condition: product.condition || "new",
      has_delivery: product.has_delivery || false,
      delivery_price: product.delivery_price?.toString() || "",
      has_warranty: product.has_warranty || false,
      warranty_months: product.warranty_months?.toString() || "",
      is_active: product.is_active,
      image_url: product.image_url || "",
    })
    setShowDialog(true)
  }

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) throw error
      toast.success("Mahsulot o'chirildi!")
      await fetchData()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category_id: "",
      stock_quantity: "1",
      author: "",
      brand: "",
      condition: "new",
      has_delivery: false,
      delivery_price: "",
      has_warranty: false,
      warranty_months: "",
      is_active: true,
      image_url: "",
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="card-beautiful">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Mahsulotlar boshqaruvi</h2>
          <p className="text-gray-600">Barcha mahsulotlarni boshqaring</p>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Yangi mahsulot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Mahsulot nomi *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Mahsulot nomini kiriting"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">Kategoriya *</Label>
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
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Narx (so'm) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="pl-10"
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
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Muallif/Brend</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Muallif yoki brend nomi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Ishlab chiqaruvchi</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ishlab chiqaruvchi nomi"
                  />
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
                  placeholder="Mahsulot haqida batafsil ma'lumot"
                  rows={4}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Mahsulot rasmi</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = await handleImageUpload(file)
                        if (url) {
                          setFormData({ ...formData, image_url: url })
                        }
                      }
                    }}
                    disabled={uploading}
                  />
                  {uploading && <div className="text-sm text-gray-500">Yuklanmoqda...</div>}
                </div>
                {formData.image_url && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                    <Image src={formData.image_url || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                )}
              </div>

              {/* Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_delivery"
                      checked={formData.has_delivery}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_delivery: checked })}
                    />
                    <Label htmlFor="has_delivery">Yetkazib berish xizmati</Label>
                  </div>
                  {formData.has_delivery && (
                    <div className="space-y-2">
                      <Label htmlFor="delivery_price">Yetkazib berish narxi (so'm)</Label>
                      <Input
                        id="delivery_price"
                        type="number"
                        value={formData.delivery_price}
                        onChange={(e) => setFormData({ ...formData, delivery_price: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_warranty"
                      checked={formData.has_warranty}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_warranty: checked })}
                    />
                    <Label htmlFor="has_warranty">Kafolat</Label>
                  </div>
                  {formData.has_warranty && (
                    <div className="space-y-2">
                      <Label htmlFor="warranty_months">Kafolat muddati (oy)</Label>
                      <Input
                        id="warranty_months"
                        type="number"
                        value={formData.warranty_months}
                        onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                        placeholder="12"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Faol</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false)
                    setEditingProduct(null)
                    resetForm()
                  }}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" className="btn-primary" disabled={uploading}>
                  {editingProduct ? "Yangilash" : "Qo'shish"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <Card className="card-beautiful">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Mahsulotlar yo'q</h3>
              <p className="text-gray-600 mb-4">Birinchi mahsulotingizni qo'shing</p>
            </CardContent>
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.id} className="card-beautiful">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 relative rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Faol" : "Nofaol"}
                        </Badge>
                        <Badge variant={product.is_approved ? "default" : "destructive"}>
                          {product.is_approved ? "Tasdiqlangan" : "Tasdiqlanmagan"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Narx:</span> {formatPrice(product.price)}
                      </div>
                      <div>
                        <span className="font-medium">Miqdor:</span> {product.stock_quantity}
                      </div>
                      <div>
                        <span className="font-medium">Kategoriya:</span> {product.category?.name}
                      </div>
                      <div>
                        <span className="font-medium">Sotuvchi:</span>{" "}
                        {product.seller?.company_name || product.seller?.full_name}
                      </div>
                    </div>

                    {/* Services */}
                    <div className="flex gap-4 text-sm">
                      {product.has_delivery && (
                        <Badge variant="outline" className="text-green-600">
                          Yetkazib berish: {product.delivery_price ? formatPrice(product.delivery_price) : "Bepul"}
                        </Badge>
                      )}
                      {product.has_warranty && (
                        <Badge variant="outline" className="text-blue-600">
                          Kafolat: {product.warranty_months} oy
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Tahrirlash
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4 mr-1" />
                            O'chirish
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mahsulotni o'chirish</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bu amalni bekor qilib bo'lmaydi. Mahsulot butunlay o'chiriladi.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)}>O'chirish</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
