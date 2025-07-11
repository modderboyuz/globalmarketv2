"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Package, Search, Eye, Trash2, Star, Heart, ShoppingCart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  product_type: string
  brand: string
  author: string
  isbn: string
  publisher: string
  publication_year: number
  language: string
  pages: number
  condition: string
  has_delivery: boolean
  delivery_price: number
  is_active: boolean
  is_approved: boolean
  like_count: number
  view_count: number
  order_count: number
  average_rating: number
  created_at: string
  updated_at: string
  seller_id: string
  category_id: string
  categories: {
    name: string
    slug: string
  }
  users: {
    full_name: string
    company_name: string
    phone: string
    email: string
  }
}

export default function AdminOtherProductsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    approved: 0,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, categoryFilter, statusFilter])

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
      await Promise.all([fetchProducts(currentUser.id), fetchCategories()])
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async (adminId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name, slug),
          users (full_name, company_name, phone, email)
        `)
        .neq("seller_id", adminId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setProducts(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Mahsulotlarni olishda xatolik")
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const calculateStats = (productsData: Product[]) => {
    const stats = {
      total: productsData.length,
      active: productsData.filter((p) => p.is_active).length,
      inactive: productsData.filter((p) => !p.is_active).length,
      approved: productsData.filter((p) => p.is_approved).length,
    }
    setStats(stats)
  }

  const filterProducts = () => {
    let filtered = products

    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.users?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((product) => product.category_id === categoryFilter)
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((product) => product.is_active)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((product) => !product.is_active)
      } else if (statusFilter === "approved") {
        filtered = filtered.filter((product) => product.is_approved)
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((product) => !product.is_approved)
      }
    }

    setFilteredProducts(filtered)
  }

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", productId)

      if (error) throw error

      setProducts(products.map((p) => (p.id === productId ? { ...p, is_active: !currentStatus } : p)))
      toast.success(`Mahsulot ${!currentStatus ? "faollashtirildi" : "nofaol qilindi"}`)
    } catch (error) {
      console.error("Error toggling product status:", error)
      toast.error("Mahsulot holatini o'zgartirishda xatolik")
    }
  }

  const toggleProductApproval = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_approved: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", productId)

      if (error) throw error

      setProducts(products.map((p) => (p.id === productId ? { ...p, is_approved: !currentStatus } : p)))
      toast.success(`Mahsulot ${!currentStatus ? "tasdiqlandi" : "tasdiq bekor qilindi"}`)
    } catch (error) {
      console.error("Error toggling product approval:", error)
      toast.error("Mahsulot tasdiqini o'zgartirishda xatolik")
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm("Mahsulotni o'chirishni xohlaysizmi?")) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) throw error

      setProducts(products.filter((p) => p.id !== productId))
      toast.success("Mahsulot o'chirildi")
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Mahsulotni o'chirishda xatolik")
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
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Boshqa Sotuvchilar Mahsulotlari</h1>
        <p className="text-gray-600">Boshqa sotuvchilar tomonidan qo'shilgan mahsulotlar</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Jami mahsulotlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Eye className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-gray-600">Faol mahsulotlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <div className="text-sm text-gray-600">Nofaol mahsulotlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.approved}</div>
            <div className="text-sm text-gray-600">Tasdiqlangan</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Mahsulotlar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Mahsulot, muallif, brend yoki sotuvchi qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
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
                <SelectItem value="approved">Tasdiqlangan</SelectItem>
                <SelectItem value="pending">Kutilayotgan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
              <p className="text-gray-600">Hozircha hech qanday mahsulot topilmadi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="card-beautiful hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Product Image & Info */}
                      <div className="lg:col-span-2">
                        <div className="flex gap-4">
                          <img
                            src={product.image_url || "/placeholder.svg?height=120&width=80"}
                            alt={product.name}
                            className="w-20 h-28 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg line-clamp-2 mb-2">{product.name}</h3>
                            {product.author && <p className="text-gray-600 text-sm mb-1">Muallif: {product.author}</p>}
                            {product.brand && <p className="text-gray-600 text-sm mb-1">Brend: {product.brand}</p>}
                            <p className="text-gray-600 text-sm mb-2">
                              Kategoriya: {product.categories?.name || "Noma'lum"}
                            </p>
                            <p className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Faol" : "Nofaol"}
                          </Badge>
                          <Badge variant={product.is_approved ? "default" : "destructive"}>
                            {product.is_approved ? "Tasdiqlangan" : "Kutilayotgan"}
                          </Badge>
                          <Badge variant="outline">{product.product_type}</Badge>
                          <Badge variant="outline">{product.condition}</Badge>
                        </div>
                      </div>

                      {/* Stats */}
                      <div>
                        <h4 className="font-semibold mb-3">Statistika</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Ko'rishlar:
                            </span>
                            <span className="font-medium">{product.view_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              Yoqtirishlar:
                            </span>
                            <span className="font-medium">{product.like_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              Buyurtmalar:
                            </span>
                            <span className="font-medium">{product.order_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Reyting:
                            </span>
                            <span className="font-medium">{product.average_rating?.toFixed(1) || "0.0"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ombor:</span>
                            <span className="font-medium">{product.stock_quantity} dona</span>
                          </div>
                        </div>
                      </div>

                      {/* Seller Info */}
                      <div>
                        <h4 className="font-semibold mb-3">Sotuvchi</h4>
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">{product.users?.company_name || product.users?.full_name}</p>
                          <p className="text-gray-600">{product.users?.phone}</p>
                          <p className="text-gray-600">{product.users?.email}</p>
                          <Button asChild size="sm" variant="outline" className="mt-2 bg-transparent">
                            <Link href={`/seller/${product.seller_id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              Sotuvchini ko'rish
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button
                          onClick={() => {
                            setSelectedProduct(product)
                            setShowProductDialog(true)
                          }}
                          className="w-full btn-primary"
                        >
                          Batafsil ko'rish
                        </Button>

                        <Button asChild variant="outline" className="w-full bg-transparent">
                          <Link href={`/product/${product.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Sahifani ko'rish
                          </Link>
                        </Button>

                        <Button
                          onClick={() => toggleProductStatus(product.id, product.is_active)}
                          variant={product.is_active ? "destructive" : "default"}
                          className="w-full"
                        >
                          {product.is_active ? "Nofaol qilish" : "Faollashtirish"}
                        </Button>

                        <Button
                          onClick={() => toggleProductApproval(product.id, product.is_approved)}
                          variant={product.is_approved ? "outline" : "default"}
                          className="w-full bg-transparent"
                        >
                          {product.is_approved ? "Tasdiqni bekor qilish" : "Tasdiqlash"}
                        </Button>

                        <Button
                          onClick={() => deleteProduct(product.id)}
                          variant="destructive"
                          size="sm"
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          O'chirish
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <h5 className="font-medium mb-2">Tavsif:</h5>
                        <p className="text-gray-700 text-sm line-clamp-3">{product.description}</p>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                      <span>Yaratilgan: {formatDate(product.created_at)}</span>
                      <span>Yangilangan: {formatDate(product.updated_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>Mahsulot batafsil ma'lumotlari</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Image & Basic Info */}
              <div className="flex gap-6">
                <img
                  src={selectedProduct.image_url || "/placeholder.svg?height=300&width=200"}
                  alt={selectedProduct.name}
                  className="w-48 h-64 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4">{selectedProduct.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Narx:</span>
                      <p className="font-semibold text-lg text-green-600">{formatPrice(selectedProduct.price)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Ombor:</span>
                      <p className="font-semibold">{selectedProduct.stock_quantity} dona</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Kategoriya:</span>
                      <p className="font-semibold">{selectedProduct.categories?.name || "Noma'lum"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Turi:</span>
                      <p className="font-semibold">{selectedProduct.product_type}</p>
                    </div>
                    {selectedProduct.author && (
                      <div>
                        <span className="text-gray-600">Muallif:</span>
                        <p className="font-semibold">{selectedProduct.author}</p>
                      </div>
                    )}
                    {selectedProduct.brand && (
                      <div>
                        <span className="text-gray-600">Brend:</span>
                        <p className="font-semibold">{selectedProduct.brand}</p>
                      </div>
                    )}
                    {selectedProduct.isbn && (
                      <div>
                        <span className="text-gray-600">ISBN:</span>
                        <p className="font-semibold">{selectedProduct.isbn}</p>
                      </div>
                    )}
                    {selectedProduct.publisher && (
                      <div>
                        <span className="text-gray-600">Nashriyot:</span>
                        <p className="font-semibold">{selectedProduct.publisher}</p>
                      </div>
                    )}
                    {selectedProduct.publication_year && (
                      <div>
                        <span className="text-gray-600">Nashr yili:</span>
                        <p className="font-semibold">{selectedProduct.publication_year}</p>
                      </div>
                    )}
                    {selectedProduct.language && (
                      <div>
                        <span className="text-gray-600">Til:</span>
                        <p className="font-semibold">{selectedProduct.language}</p>
                      </div>
                    )}
                    {selectedProduct.pages && (
                      <div>
                        <span className="text-gray-600">Sahifalar:</span>
                        <p className="font-semibold">{selectedProduct.pages}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Holati:</span>
                      <p className="font-semibold">{selectedProduct.condition}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <h4 className="font-semibold mb-2">Tavsif</h4>
                  <p className="text-gray-700">{selectedProduct.description}</p>
                </div>
              )}

              {/* Delivery Info */}
              <div>
                <h4 className="font-semibold mb-2">Yetkazib berish</h4>
                <div className="flex items-center gap-4">
                  <Badge variant={selectedProduct.has_delivery ? "default" : "secondary"}>
                    {selectedProduct.has_delivery ? "Yetkazib berish bor" : "Yetkazib berish yo'q"}
                  </Badge>
                  {selectedProduct.has_delivery && selectedProduct.delivery_price > 0 && (
                    <span className="text-sm text-gray-600">Narx: {formatPrice(selectedProduct.delivery_price)}</span>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="font-semibold mb-2">Statistika</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Eye className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold">{selectedProduct.view_count || 0}</div>
                    <div className="text-xs text-gray-600">Ko'rishlar</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Heart className="h-6 w-6 text-red-600 mx-auto mb-1" />
                    <div className="font-semibold">{selectedProduct.like_count || 0}</div>
                    <div className="text-xs text-gray-600">Yoqtirishlar</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="font-semibold">{selectedProduct.order_count || 0}</div>
                    <div className="text-xs text-gray-600">Buyurtmalar</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                    <div className="font-semibold">{selectedProduct.average_rating?.toFixed(1) || "0.0"}</div>
                    <div className="text-xs text-gray-600">Reyting</div>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div>
                <h4 className="font-semibold mb-2">Sotuvchi ma'lumotlari</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {selectedProduct.users?.company_name || selectedProduct.users?.full_name}
                      </p>
                      <p className="text-gray-600">{selectedProduct.users?.phone}</p>
                      <p className="text-gray-600">{selectedProduct.users?.email}</p>
                    </div>
                    <Button asChild variant="outline" className="bg-transparent">
                      <Link href={`/seller/${selectedProduct.seller_id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Sotuvchini ko'rish
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Status & Dates */}
              <div>
                <h4 className="font-semibold mb-2">Holat va sanalar</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Holat:</span>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={selectedProduct.is_active ? "default" : "secondary"}>
                        {selectedProduct.is_active ? "Faol" : "Nofaol"}
                      </Badge>
                      <Badge variant={selectedProduct.is_approved ? "default" : "destructive"}>
                        {selectedProduct.is_approved ? "Tasdiqlangan" : "Kutilayotgan"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Sanalar:</span>
                    <p className="text-sm mt-1">Yaratilgan: {formatDate(selectedProduct.created_at)}</p>
                    <p className="text-sm">Yangilangan: {formatDate(selectedProduct.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
