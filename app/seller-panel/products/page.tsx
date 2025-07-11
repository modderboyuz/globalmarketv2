"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, Plus, Search, Edit, Trash2, Eye, Star, Heart, ShoppingCart, RefreshCw } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
  average_rating: number
  like_count: number
  order_count: number
  view_count: number
  created_at: string
  category: {
    name: string
    slug: string
  }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export default function SellerProductsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, selectedCategory, statusFilter])

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
        toast.error("Sizda sotuvchi huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
      await fetchProducts(currentUser.id)
      await fetchCategories()
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories!products_category_id_fkey(name, slug)
        `)
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Mahsulotlarni olishda xatolik")
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const filterProducts = () => {
    let filtered = products

    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.category?.slug === selectedCategory)
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((product) => product.is_active && product.is_approved)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((product) => !product.is_active)
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((product) => !product.is_approved)
      }
    }

    setFilteredProducts(filtered)
  }

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", productId)

      if (error) throw error

      setProducts((prev) =>
        prev.map((product) => (product.id === productId ? { ...product, is_active: isActive } : product)),
      )

      toast.success(isActive ? "Mahsulot faollashtirildi" : "Mahsulot o'chirildi")
    } catch (error) {
      toast.error("Mahsulot holatini o'zgartirishda xatolik")
    }
  }

  const deleteProduct = async () => {
    if (!productToDelete) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", productToDelete.id)

      if (error) throw error

      setProducts((prev) => prev.filter((product) => product.id !== productToDelete.id))
      setShowDeleteDialog(false)
      setProductToDelete(null)
      toast.success("Mahsulot o'chirildi")
    } catch (error) {
      toast.error("Mahsulotni o'chirishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getStatusBadge = (product: Product) => {
    if (!product.is_approved) {
      return <Badge variant="secondary">Kutilmoqda</Badge>
    }
    if (!product.is_active) {
      return <Badge variant="destructive">Nofaol</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Faol</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Mahsulotlar yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Mahsulotlarim</h1>
          <p className="text-gray-600">Sizning barcha mahsulotlaringizni boshqaring</p>
        </div>
        <Button asChild className="btn-primary">
          <Link href="/seller-panel/add-product">
            <Plus className="h-4 w-4 mr-2" />
            Yangi mahsulot
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Jami mahsulotlar</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Faol mahsulotlar</p>
                <p className="text-2xl font-bold">{products.filter((p) => p.is_active && p.is_approved).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Jami buyurtmalar</p>
                <p className="text-2xl font-bold">{products.reduce((sum, p) => sum + (p.order_count || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Jami yoqtirishlar</p>
                <p className="text-2xl font-bold">{products.reduce((sum, p) => sum + (p.like_count || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Mahsulot qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="inactive">Nofaol</SelectItem>
                <SelectItem value="pending">Kutilmoqda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
            <p className="text-gray-600 mb-4">Hozircha sizda hech qanday mahsulot yo'q</p>
            <Button asChild>
              <Link href="/seller-panel/add-product">
                <Plus className="h-4 w-4 mr-2" />
                Birinchi mahsulotni qo'shish
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="card-beautiful overflow-hidden">
              <div className="relative">
                <div className="aspect-square overflow-hidden">
                  <Image
                    src={product.image_url || "/placeholder.svg?height=300&width=300"}
                    alt={product.name}
                    width={300}
                    height={300}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute top-2 right-2">{getStatusBadge(product)}</div>
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {product.view_count || 0}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Heart className="h-3 w-3 mr-1" />
                    {product.like_count || 0}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {product.order_count || 0}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(product.average_rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">({product.average_rating?.toFixed(1) || "0.0"})</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{formatPrice(product.price)}</p>
                      <p className="text-sm text-gray-600">Stok: {product.stock_quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{product.category?.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(product.created_at).toLocaleDateString("uz-UZ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${product.id}`} className="text-sm">
                        Faol
                      </Label>
                      <Switch
                        id={`active-${product.id}`}
                        checked={product.is_active}
                        onCheckedChange={(checked) => toggleProductStatus(product.id, checked)}
                        disabled={!product.is_approved}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild className="bg-transparent">
                        <Link href={`/product/${product.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="bg-transparent">
                        <Link href={`/seller-panel/products/edit/${product.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setProductToDelete(product)
                          setShowDeleteDialog(true)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mahsulotni o'chirish</DialogTitle>
            <DialogDescription>
              Haqiqatan ham "{productToDelete?.name}" mahsulotini o'chirmoqchimisiz? Bu amalni bekor qilib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={deleteProduct}>
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
