"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Package, Eye, Trash2, Plus, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Image from "next/image"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  is_active: boolean
  is_approved: boolean
  is_featured: boolean
  product_type: string
  brand: string
  author: string
  created_at: string
  categories: {
    name: string
  }
  users: {
    full_name: string
    company_name: string
  }
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [searchQuery, statusFilter, typeFilter])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from("products")
        .select(`
          *,
          categories (name),
          users (full_name, company_name)
        `)
        .order("created_at", { ascending: false })

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`,
        )
      }

      // Apply status filter
      if (statusFilter !== "all") {
        switch (statusFilter) {
          case "active":
            query = query.eq("is_active", true).eq("is_approved", true)
            break
          case "inactive":
            query = query.eq("is_active", false)
            break
          case "pending":
            query = query.eq("is_approved", false)
            break
          case "featured":
            query = query.eq("is_featured", true)
            break
        }
      }

      // Apply type filter
      if (typeFilter !== "all") {
        query = query.eq("product_type", typeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Mahsulotlarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (productId: string, field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ [field]: value })
        .eq("id", productId)

      if (error) throw error

      toast.success("Mahsulot holati yangilandi")
      fetchProducts()
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) throw error

      toast.success("Mahsulot o'chirildi")
      fetchProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const exportProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name),
          users (full_name, company_name)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Convert to CSV
      const csvContent = [
        ["ID", "Nomi", "Narx", "Kategoriya", "Sotuvchi", "Holat", "Yaratilgan sana"].join(","),
        ...data.map((product) =>
          [
            product.id,
            `"${product.name}"`,
            product.price,
            `"${product.categories?.name || ""}"`,
            `"${product.users?.company_name || product.users?.full_name || ""}"`,
            product.is_active ? "Faol" : "Nofaol",
            new Date(product.created_at).toLocaleDateString("uz-UZ"),
          ].join(","),
        ),
      ].join("\n")

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `products-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Mahsulotlar eksport qilindi")
    } catch (error) {
      console.error("Error exporting products:", error)
      toast.error("Eksport qilishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mahsulotlar boshqaruvi</h1>
          <p className="text-gray-600">Barcha mahsulotlarni boshqaring</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportProducts} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Eksport
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yangi mahsulot
          </Button>
        </div>
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
                <p className="text-xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Faol mahsulotlar</p>
                <p className="text-xl font-bold">{products.filter((p) => p.is_active && p.is_approved).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Kutilayotgan</p>
                <p className="text-xl font-bold">{products.filter((p) => !p.is_approved).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tavsiya etilgan</p>
                <p className="text-xl font-bold">{products.filter((p) => p.is_featured).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Holat bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="inactive">Nofaol</SelectItem>
                <SelectItem value="pending">Kutilayotgan</SelectItem>
                <SelectItem value="featured">Tavsiya etilgan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tur bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                <SelectItem value="book">Kitoblar</SelectItem>
                <SelectItem value="pen">Qalamlar</SelectItem>
                <SelectItem value="notebook">Daftarlar</SelectItem>
                <SelectItem value="other">Boshqalar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mahsulotlar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Yuklanmoqda...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Mahsulotlar topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Kategoriya</TableHead>
                    <TableHead>Sotuvchi</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.product_type === "book" && product.author && `Muallif: ${product.author}`}
                              {product.brand && `Brend: ${product.brand}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.categories?.name || "Noma'lum"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {product.users?.company_name || product.users?.full_name || "Noma'lum"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatPrice(product.price)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={product.is_active && product.is_approved ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {product.is_active && product.is_approved
                              ? "Faol"
                              : !product.is_approved
                                ? "Kutilayotgan"
                                : "Nofaol"}
                          </Badge>
                          {product.is_featured && (
                            <Badge variant="outline" className="text-xs">
                              Tavsiya etilgan
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(product.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedProduct(product)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(product.id, "is_approved", !product.is_approved)}
                          >
                            {product.is_approved ? "Rad etish" : "Tasdiqlash"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(product.id, "is_featured", !product.is_featured)}
                          >
                            {product.is_featured ? "Tavsiyadan olib tashlash" : "Tavsiya qilish"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mahsulot tafsilotlari</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={selectedProduct.image_url || "/placeholder.svg"}
                    alt={selectedProduct.name}
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{selectedProduct.name}</h3>
                  <p className="text-gray-600 mb-2">{selectedProduct.description}</p>
                  <div className="flex gap-2 mb-2">
                    <Badge>{selectedProduct.categories?.name}</Badge>
                    <Badge variant="outline">{selectedProduct.product_type}</Badge>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{formatPrice(selectedProduct.price)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Sotuvchi</p>
                  <p className="font-medium">
                    {selectedProduct.users?.company_name || selectedProduct.users?.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Zaxira</p>
                  <p className="font-medium">{selectedProduct.stock_quantity} dona</p>
                </div>
                {selectedProduct.author && (
                  <div>
                    <p className="text-sm text-gray-600">Muallif</p>
                    <p className="font-medium">{selectedProduct.author}</p>
                  </div>
                )}
                {selectedProduct.brand && (
                  <div>
                    <p className="text-sm text-gray-600">Brend</p>
                    <p className="font-medium">{selectedProduct.brand}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleStatusChange(selectedProduct.id, "is_approved", !selectedProduct.is_approved)}
                  variant={selectedProduct.is_approved ? "destructive" : "default"}
                >
                  {selectedProduct.is_approved ? "Rad etish" : "Tasdiqlash"}
                </Button>
                <Button
                  onClick={() => handleStatusChange(selectedProduct.id, "is_featured", !selectedProduct.is_featured)}
                  variant="outline"
                >
                  {selectedProduct.is_featured ? "Tavsiyadan olib tashlash" : "Tavsiya qilish"}
                </Button>
                <Button
                  onClick={() => handleStatusChange(selectedProduct.id, "is_active", !selectedProduct.is_active)}
                  variant="outline"
                >
                  {selectedProduct.is_active ? "Nofaol qilish" : "Faollashtirish"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
