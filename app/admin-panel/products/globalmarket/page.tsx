"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Star,
  TrendingUp,
  ShoppingCart,
  Heart,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  order_count: number
  view_count: number
  like_count: number
  average_rating: number
  is_active: boolean
  is_approved: boolean
  created_at: string
  categories: {
    name: string
    icon: string
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
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
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
      await fetchProducts(currentUser.id)
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
          categories (name, icon)
        `)
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
      active: productsData.filter((p) => p.is_active && p.is_approved).length,
      inactive: productsData.filter((p) => !p.is_active).length,
      pending: productsData.filter((p) => p.is_active && !p.is_approved).length,
    }
    setStats(stats)
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

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((product) => product.is_active && product.is_approved)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((product) => !product.is_active)
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((product) => product.is_active && !product.is_approved)
      }
    }

    setFilteredProducts(filtered)
  }

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("products").update({ is_active: !currentStatus }).eq("id", productId)

      if (error) throw error

      toast.success(currentStatus ? "Mahsulot o'chirildi" : "Mahsulot faollashtirildi")
      await fetchProducts(user.id)
    } catch (error) {
      console.error("Error toggling product status:", error)
      toast.error("Mahsulot holatini o'zgartirishda xatolik")
    }
  }

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) throw error

      toast.success("Mahsulot o'chirildi")
      await fetchProducts(user.id)
      setDeleteProductId(null)
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Mahsulotni o'chirishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getStatusBadge = (product: Product) => {
    if (!product.is_active) {
      return <Badge variant="secondary">Faol emas</Badge>
    }
    if (!product.is_approved) {
      return <Badge className="bg-yellow-100 text-yellow-800">Tasdiqlanmagan</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Faol</Badge>
  }

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Tugagan</Badge>
    }
    if (stock <= 5) {
      return <Badge className="bg-orange-100 text-orange-800">Kam qolgan</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Mavjud</Badge>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">GlobalMarket Mahsulotlari</h1>
          <p className="text-gray-600">GlobalMarket tomonidan sotiladigan mahsulotlar</p>
        </div>
        <Button asChild className="btn-primary">
          <Link href="/admin-panel/products/add">
            <Plus className="h-4 w-4 mr-2" />
            Yangi mahsulot
          </Link>
        </Button>
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
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-gray-600">Faol mahsulotlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Eye className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-sm text-gray-600">Tasdiqlanmagan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <div className="text-sm text-gray-600">Faol emas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Holat bo'yicha filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="pending">Tasdiqlanmagan</SelectItem>
                <SelectItem value="inactive">Faol emas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Mahsulotlar yo'q</h3>
              <p className="text-gray-600 mb-6">Hozircha hech qanday mahsulot qo'shmagansiz</p>
              <Button asChild className="btn-primary">
                <Link href="/admin-panel/products/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Birinchi mahsulotni qo'shish
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="card-beautiful group hover:shadow-lg transition-all duration-300">
                  <div className="relative">
                    <div className="aspect-square overflow-hidden rounded-t-2xl bg-gray-100">
                      <Image
                        src={product.image_url || "/placeholder.svg?height=300&width=300"}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/90 text-gray-800">
                        {product.categories?.icon} {product.categories?.name}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-white/90">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/product/${product.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ko'rish
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin-panel/products/${product.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Tahrirlash
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleProductStatus(product.id, product.is_active)}>
                            <Package className="h-4 w-4 mr-2" />
                            {product.is_active ? "O'chirish" : "Faollashtirish"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteProductId(product.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            O'chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 flex-1">{product.name}</h3>
                      {getStatusBadge(product)}
                    </div>

                    {product.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{product.average_rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      {getStockBadge(product.stock_quantity)}
                      <span className="text-sm text-gray-600">{product.stock_quantity} dona</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600 mb-4">
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{product.view_count || 0}</span>
                        </div>
                        <div className="text-xs">Ko'rishlar</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{product.like_count || 0}</span>
                        </div>
                        <div className="text-xs">Yoqtirishlar</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          <span>{product.order_count || 0}</span>
                        </div>
                        <div className="text-xs">Sotilgan</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1 bg-transparent">
                        <Link href={`/product/${product.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ko'rish
                        </Link>
                      </Button>
                      <Button asChild className="flex-1 btn-primary">
                        <Link href={`/admin-panel/products/${product.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Tahrirlash
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mahsulotni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amalni bekor qilib bo'lmaydi. Mahsulot butunlay o'chiriladi va uni qayta tiklab bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductId && deleteProduct(deleteProductId)}
              className="bg-red-600 hover:bg-red-700"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
