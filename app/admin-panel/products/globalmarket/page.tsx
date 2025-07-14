"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Package,
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Star,
  Heart,
  ShoppingCart,
  Truck,
  RotateCcw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

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

export default function AdminGlobalMarketProductsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalViews: 0,
    totalOrders: 0,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, statusFilter])

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
      await fetchProducts(userData.id)
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
        .select(`*, categories(name)`)
        .eq("seller_id", adminId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setProducts(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Mahsulotlarni olishda xatolik")
    }
  }

  const calculateStats = (productsData: Product[]) => {
    const stats = {
      total: productsData.length,
      active: productsData.filter((p) => p.status === "active").length,
      inactive: productsData.filter((p) => p.status !== "active").length,
      totalViews: productsData.reduce((sum, p) => sum + (p.views || 0), 0),
      totalOrders: productsData.reduce((sum, p) => sum + (p.orders_count || 0), 0),
    }
    setStats(stats)
  }

  const filterProducts = () => {
    let filtered = products

    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((product) => product.status === statusFilter)
    }

    setFilteredProducts(filtered)
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", selectedProduct.id)

      if (error) throw error

      toast.success("Mahsulot o'chirildi")
      await fetchProducts(user.id)
      setShowDeleteDialog(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Mahsulotni o'chirishda xatolik")
    }
  }

  const exportProducts = async () => {
    try {
      const csvContent = [
        [
          "ID",
          "Nomi",
          "Narx",
          "Yetkazib berish narxi",
          "Qaytarish narxi",
          "Holat",
          "Zaxira",
          "Ko'rishlar",
          "Buyurtmalar",
          "Yaratilgan sana",
        ].join(","),
        ...filteredProducts.map((product) =>
          [
            product.id.slice(-8),
            product.name || "",
            product.price || 0,
            product.delivery_price || 0,
            product.return_price || 0,
            product.status || "",
            product.stock_quantity || 0,
            product.views || 0,
            product.orders_count || 0,
            new Date(product.created_at).toLocaleDateString(),
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `globalmarket-products-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Mahsulotlar ro'yxati eksport qilindi")
    } catch (error) {
      console.error("Error exporting products:", error)
      toast.error("Eksport qilishda xatolik")
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Faol</Badge>
      case "inactive":
        return <Badge variant="secondary">Nofaol</Badge>
      case "out_of_stock":
        return <Badge variant="destructive">Tugagan</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
            {[...Array(5)].map((_, i) => (
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">GlobalMarket Mahsulotlari</h1>
          <p className="text-gray-600 text-sm lg:text-base">GlobalMarket tomonidan sotiladigan mahsulotlar</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportProducts} variant="outline" className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Excel yuklab olish
          </Button>
          <Button asChild>
            <Link href="/admin-panel/products/add">
              <Plus className="h-4 w-4 mr-2" />
              Yangi mahsulot
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <Package className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.total}</div>
            <div className="text-xs lg:text-sm text-gray-600">Jami mahsulotlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <div className="text-lg lg:text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-xs lg:text-sm text-gray-600">Faol</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <div className="text-lg lg:text-2xl font-bold text-red-600">{stats.inactive}</div>
            <div className="text-xs lg:text-sm text-gray-600">Nofaol</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <Eye className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.totalViews}</div>
            <div className="text-xs lg:text-sm text-gray-600">Ko'rishlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <ShoppingCart className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-xs lg:text-sm text-gray-600">Buyurtmalar</div>
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Holat bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="inactive">Nofaol</SelectItem>
                <SelectItem value="out_of_stock">Tugagan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products List */}
          <div className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
                <p className="text-gray-600 mb-4">Hozircha hech qanday mahsulot topilmadi</p>
                <Button asChild>
                  <Link href="/admin-panel/products/add">
                    <Plus className="h-4 w-4 mr-2" />
                    Birinchi mahsulotni qo'shish
                  </Link>
                </Button>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card key={product.id} className="card-beautiful hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4 lg:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                      {/* Product Image & Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-4">
                          <img
                            src={product.images?.[0] || "/placeholder.jpg"}
                            alt={product.name}
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-base lg:text-lg">{product.name}</h3>
                                <p className="text-gray-600 text-sm">{product.categories?.name}</p>
                              </div>
                              {getStatusBadge(product.status)}
                            </div>

                            <p className="text-gray-600 text-sm line-clamp-2 mb-2">{product.description}</p>

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {product.views || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {product.likes_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                {product.orders_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {product.rating || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pricing & Delivery */}
                      <div>
                        <h4 className="font-semibold mb-3">Narxlar</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Asosiy narx:</span>
                            <span className="font-medium text-green-600">{formatPrice(product.price)}</span>
                          </div>
                          {product.has_delivery && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                Yetkazib berish:
                              </span>
                              <span className="font-medium">{formatPrice(product.delivery_price || 0)}</span>
                            </div>
                          )}
                          {product.has_return && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                Qaytarish:
                              </span>
                              <span className="font-medium">{formatPrice(product.return_price || 0)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span>Zaxira:</span>
                            <span className="font-medium">{product.stock_quantity || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Yaratilgan:</span>
                            <span className="font-medium">{formatDate(product.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button asChild className="w-full">
                          <Link href={`/product/${product.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ko'rish
                          </Link>
                        </Button>

                        <Button asChild variant="outline" className="w-full bg-transparent">
                          <Link href={`/admin-panel/products/edit/${product.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Tahrirlash
                          </Link>
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => {
                            setSelectedProduct(product)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          O'chirish
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mahsulotni o'chirish</DialogTitle>
            <DialogDescription>
              {selectedProduct && `"${selectedProduct.name}" mahsulotini o'chirishni xohlaysizmi?`}
              <br />
              Bu amalni bekor qilib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
