"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, ShoppingCart, Eye, Phone, MapPin, Package, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  quantity: number
  customer_name: string
  customer_phone: string
  customer_address: string
  created_at: string
  updated_at: string
  products: {
    name: string
    price: number
    image_url: string
  }
  users: {
    full_name: string
    email: string
  }
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels = {
  pending: "Kutilayotgan",
  confirmed: "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped: "Yuborilgan",
  delivered: "Yetkazilgan",
  completed: "Yakunlangan",
  cancelled: "Bekor qilingan",
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [searchQuery, statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from("orders")
        .select(`
          *,
          products (name, price, image_url),
          users (full_name, email)
        `)
        .order("created_at", { ascending: false })

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `order_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`,
        )
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error

      toast.success("Buyurtma holati yangilandi")
      fetchOrders()

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    } catch (error) {
      console.error("Error updating order:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const exportOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (name, price),
          users (full_name, email)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Convert to CSV
      const csvContent = [
        ["Buyurtma raqami", "Mijoz", "Telefon", "Mahsulot", "Miqdor", "Summa", "Holat", "Sana"].join(","),
        ...data.map((order) =>
          [
            order.order_number,
            `"${order.customer_name}"`,
            order.customer_phone,
            `"${order.products?.name || ""}"`,
            order.quantity,
            order.total_amount,
            statusLabels[order.status as keyof typeof statusLabels] || order.status,
            new Date(order.created_at).toLocaleDateString("uz-UZ"),
          ].join(","),
        ),
      ].join("\n")

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Buyurtmalar eksport qilindi")
    } catch (error) {
      console.error("Error exporting orders:", error)
      toast.error("Eksport qilishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Buyurtmalar boshqaruvi</h1>
          <p className="text-gray-600">Barcha buyurtmalarni boshqaring</p>
        </div>
        <Button onClick={exportOrders} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Eksport
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Jami</p>
                <p className="text-xl font-bold">{orders.length}</p>
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
                <p className="text-sm text-gray-600">Kutilayotgan</p>
                <p className="text-xl font-bold">{orders.filter((o) => o.status === "pending").length}</p>
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
                <p className="text-sm text-gray-600">Tayyorlanmoqda</p>
                <p className="text-xl font-bold">{orders.filter((o) => o.status === "processing").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Yakunlangan</p>
                <p className="text-xl font-bold">{orders.filter((o) => o.status === "completed").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bekor qilingan</p>
                <p className="text-xl font-bold">{orders.filter((o) => o.status === "cancelled").length}</p>
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
                placeholder="Buyurtma qidirish..."
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
                <SelectItem value="pending">Kutilayotgan</SelectItem>
                <SelectItem value="confirmed">Tasdiqlangan</SelectItem>
                <SelectItem value="processing">Tayyorlanmoqda</SelectItem>
                <SelectItem value="shipped">Yuborilgan</SelectItem>
                <SelectItem value="delivered">Yetkazilgan</SelectItem>
                <SelectItem value="completed">Yakunlangan</SelectItem>
                <SelectItem value="cancelled">Bekor qilingan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Buyurtmalar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Yuklanmoqda...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Buyurtmalar topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyurtma</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Summa</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">#{order.order_number}</p>
                          <p className="text-sm text-gray-500">{order.quantity} dona</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customer_phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{order.products?.name}</p>
                          <p className="text-sm text-gray-500">{formatPrice(order.products?.price || 0)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">{formatPrice(order.total_amount)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[order.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                          }
                        >
                          {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === "pending" && (
                            <Button size="sm" onClick={() => handleStatusChange(order.id, "confirmed")}>
                              Tasdiqlash
                            </Button>
                          )}
                          {order.status === "confirmed" && (
                            <Button size="sm" onClick={() => handleStatusChange(order.id, "processing")}>
                              Tayyorlash
                            </Button>
                          )}
                          {order.status === "processing" && (
                            <Button size="sm" onClick={() => handleStatusChange(order.id, "shipped")}>
                              Yuborish
                            </Button>
                          )}
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

      {/* Order Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buyurtma tafsilotlari</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Buyurtma raqami</p>
                  <p className="font-bold">#{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Holat</p>
                  <Badge className={statusColors[selectedOrder.status as keyof typeof statusColors]}>
                    {statusLabels[selectedOrder.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Yaratilgan</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Yangilangan</p>
                  <p className="font-medium">{formatDate(selectedOrder.updated_at)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-3">Mijoz ma'lumotlari</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <span>{selectedOrder.customer_address}</span>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div>
                <h3 className="font-semibold mb-3">Mahsulot ma'lumotlari</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={selectedOrder.products?.image_url || "/placeholder.svg"}
                        alt={selectedOrder.products?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedOrder.products?.name}</p>
                      <p className="text-gray-600">Miqdor: {selectedOrder.quantity} dona</p>
                      <p className="text-gray-600">Narx: {formatPrice(selectedOrder.products?.price || 0)}</p>
                      <p className="font-bold text-green-600">Jami: {formatPrice(selectedOrder.total_amount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div>
                <h3 className="font-semibold mb-3">Holat o'zgartirish</h3>
                <div className="flex gap-2 flex-wrap">
                  {selectedOrder.status === "pending" && (
                    <>
                      <Button onClick={() => handleStatusChange(selectedOrder.id, "confirmed")}>Tasdiqlash</Button>
                      <Button variant="destructive" onClick={() => handleStatusChange(selectedOrder.id, "cancelled")}>
                        Bekor qilish
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === "confirmed" && (
                    <Button onClick={() => handleStatusChange(selectedOrder.id, "processing")}>
                      Tayyorlashga yuborish
                    </Button>
                  )}
                  {selectedOrder.status === "processing" && (
                    <Button onClick={() => handleStatusChange(selectedOrder.id, "shipped")}>
                      Yuborilgan deb belgilash
                    </Button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <Button onClick={() => handleStatusChange(selectedOrder.id, "delivered")}>
                      Yetkazilgan deb belgilash
                    </Button>
                  )}
                  {selectedOrder.status === "delivered" && (
                    <Button onClick={() => handleStatusChange(selectedOrder.id, "completed")}>Yakunlash</Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
