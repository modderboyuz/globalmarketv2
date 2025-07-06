"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Star,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
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
  like_count: number
  average_rating: number
  is_active: boolean
  is_approved: boolean
  moderation_status: string
  admin_notes: string
  created_at: string
  categories: {
    name_uz: string
    icon: string
  }
}

export default function SellerProductsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, statusFilter])

  const checkAuth = async () => {
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
        .select("is_verified_seller")
        .eq("id", currentUser.id)
        .single()

      if (!userData?.is_verified_seller) {
        router.push("/become-seller")
        return
      }

      setUser(currentUser)
      await fetchProducts(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    }
  }

  const fetchProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            name_uz,
            icon
          )
        `)
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Mahsulotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "active":
          filtered = filtered.filter((p) => p.is_active && p.is_approved)
          break
        case "pending":
          filtered = filtered.filter((p) => p.moderation_status === "pending")
          break
        case "rejected":
          filtered = filtered.filter((p) => p.moderation_status === "rejected")
          break
        case "inactive":
          filtered = filtered.filter((p) => !p.is_active)
          break
      }
    }

    setFilteredProducts(filtered)
  }

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("products").update({ is_active: !currentStatus }).eq("id", productId)

      if (error) throw error

      toast.success(`Mahsulot ${!currentStatus ? "faollashtirildi" : "o'chirildi"}!`)
      await fetchProducts(user.id)
    } catch (error) {
      console.error("Error toggling product status:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const deleteProduct = async () => {
    if (!deleteProductId) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteProductId)

      if (error) throw error

      toast.success("Mahsulot o'chirildi!")
      setDeleteProductId(null)
      await fetchProducts(user.id)
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const getStatusBadge = (product: Product) => {
    if (!product.is_approved) {
      switch (product.moderation_status) {
        case "pending":
          return (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Moderatsiyada
            </Badge>
          )
        case "rejected":
          return (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Rad etilgan
            </Badge>
          )
        default:
          return (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Kutilmoqda
            </Badge>
          )
      }
    }

    if (!product.is_active) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Nofaol
        </Badge>
      )
    }

    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Faol
      </Badge>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="card-beautiful">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="aspect-square bg-gray-200 rounded-2xl"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text">Mening mahsulotlarim</h1>
                <p className="text-gray-600 text-lg">Mahsulotlaringizni boshqaring</p>
              </div>
            </div>

            <Link href="/seller/add-product">
              <Button className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Yangi mahsulot
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-beautiful"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 input-beautiful">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Holat bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="pending">Moderatsiyada</SelectItem>
                <SelectItem value="rejected">Rad etilgan</SelectItem>
                <SelectItem value="inactive">Nofaol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card className="card-beautiful">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery || statusFilter !== "all" ? "Mahsulot topilmadi" : "Mahsulotlar yo'q"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Qidiruv shartlaringizni o'zgartiring"
                  : "Birinchi mahsulotingizni qo'shing"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/seller/add-product">
                  <Button className="btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Mahsulot qo'shish
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="card-beautiful group">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100 rounded-t-3xl overflow-hidden">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=300&width=300"}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">{getStatusBadge(product)}</div>

                    {/* Actions Menu */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="rounded-full bg-white/90 backdrop-blur-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/product/${product.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ko'rish
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/seller/edit-product/${product.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleProductStatus(product.id, product.is_active)}
                            disabled={!product.is_approved}
                          >
                            {product.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                O'chirish
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Faollashtirish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteProductId(product.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            O'chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stock Warning */}
                    {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                      <div className="absolute bottom-3 left-3">
                        <Badge variant="destructive" className="text-xs">
                          Kam qoldi: {product.stock_quantity}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-beautiful border-blue-200 text-blue-700 text-xs">
                          {product.categories?.icon} {product.categories?.name_uz}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg line-clamp-2 mb-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{product.average_rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-4 w-4 text-gray-500" />
                          <span>{product.order_count}</span>
                        </div>
                      </div>
                      <span className="text-gray-500">{formatDate(product.created_at)}</span>
                    </div>

                    {/* Price */}
                    <div className="text-xl font-bold text-blue-600">{formatPrice(product.price)}</div>

                    {/* Admin Notes */}
                    {product.admin_notes && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Admin izohi:</strong> {product.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
              <AlertDialogAction onClick={deleteProduct} className="bg-red-600 hover:bg-red-700">
                O'chirish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
