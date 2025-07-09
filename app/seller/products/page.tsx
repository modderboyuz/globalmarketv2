"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Search, Eye, Heart, ShoppingCart, Edit, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Image from "next/image"

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  view_count: number
  like_count: number
  order_count: number
  average_rating: number
  stock_quantity: number
  is_active: boolean
  is_approved: boolean
  created_at: string
  category: {
    name: string
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

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Sotuvchi hisobiga kirish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(userData)
      await fetchProducts(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
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
          category:categories(name)
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

  const filterProducts = () => {
    let filtered = products

    // Filter by status
    if (statusFilter === "active") {
      filtered = filtered.filter((product) => product.is_active && product.is_approved)
    } else if (statusFilter === "pending") {
      filtered = filtered.filter((product) => !product.is_approved)
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((product) => !product.is_active)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((product) => product.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    setFilteredProducts(filtered)
  }

  const requestProductAction = async (productId: string, action: "edit" | "delete", reason: string) => {
    try {
      const product = products.find((p) => p.id === productId)
      if (!product) return

      const { error } = await supabase.from("admin_messages").insert({
        type: "product_action_request",
        title: `Mahsulot ${action === "edit" ? "tahrirlash" : "o'chirish"} so'rovi`,
        content: `Sotuvchi "${product.name}" mahsulotini ${action === "edit" ? "tahrirlashni" : "o'chirishni"} so'rayapti. Sabab: ${reason}`,
        data: {
          product_id: productId,
          action,
          reason,
          seller_id: user.id,
          product_name: product.name,
        },
        status: "pending",
        created_by: user.id,
      })

      if (error) throw error

      toast.success(`${action === "edit" ? "Tahrirlash" : "O'chirish"} so'rovi yuborildi`)
    } catch (error) {
      console.error("Error requesting product action:", error)
      toast.error("So'rov yuborishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getStatusBadge = (product: Product) => {
    if (!product.is_approved) {
      return <Badge variant="destructive">Kutilmoqda</Badge>
    } else if (product.is_active) {
      return <Badge className="bg-green-500">Faol</Badge>
    } else {
      return <Badge variant="secondary">Nofaol</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mening mahsulotlarim</h1>
            <p className="text-gray-600">Mahsulotlaringizni boshqaring va yangilarini qo'shing</p>
          </div>
          <Button onClick={() => router.push("/seller/add-product")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Yangi mahsulot qo'shish
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
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
                <SelectValue placeholder="Holat bo'yicha filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="pending">Kutilmoqda</SelectItem>
                <SelectItem value="inactive">Nofaol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-100 relative">
                <Image
                  src={product.image_url || "/placeholder.svg?height=200&width=200"}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2">{getStatusBadge(product)}</div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-2">{product.name}</h3>
                <p className="text-lg font-bold text-blue-600 mb-3">{formatPrice(product.price)}</p>

                <div className="text-xs text-gray-600 mb-3">Kategoriya: {product.category?.name}</div>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-4">
                  <div className="text-center">
                    <Eye className="h-4 w-4 mx-auto mb-1" />
                    <span>{product.view_count || 0}</span>
                  </div>
                  <div className="text-center">
                    <Heart className="h-4 w-4 mx-auto mb-1" />
                    <span>{product.like_count || 0}</span>
                  </div>
                  <div className="text-center">
                    <ShoppingCart className="h-4 w-4 mx-auto mb-1" />
                    <span>{product.order_count || 0}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 mb-4">Qoldiq: {product.stock_quantity} dona</div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs bg-transparent"
                    onClick={() => requestProductAction(product.id, "edit", "Mahsulot ma'lumotlarini yangilash")}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Tahrirlash
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 text-xs"
                    onClick={() => requestProductAction(product.id, "delete", "Mahsulot endi kerak emas")}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    O'chirish
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery || statusFilter !== "all" ? "Mahsulot topilmadi" : "Mahsulotlar yo'q"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Qidiruv shartlaringizni o'zgartiring"
                : "Birinchi mahsulotingizni qo'shing va sotishni boshlang!"}
            </p>
            <Button onClick={() => router.push("/seller/add-product")}>
              <Plus className="h-4 w-4 mr-2" />
              Mahsulot qo'shish
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
