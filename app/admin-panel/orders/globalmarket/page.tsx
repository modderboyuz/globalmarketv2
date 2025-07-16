"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  RefreshCw,
  Search,
  ArrowUpDown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Image from "next/image"

interface Order {
  id: string
  product_id: string
  user_id: string | null
  full_name: string
  phone: string
  address: string
  quantity: number
  total_amount: number
  status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
  selected_group_product_id: string | null
  selected_product_name: string | null
  selected_product_info?: {
    id: string
    name: string
    description: string | null
  }
  products: {
    id: string
    name: string
    price: number
    image_url: string
    product_type: string
    users: {
      id: string
      full_name: string
      company_name: string | null
      phone: string
      username: string | null
    }
  }
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
}

const statusLabels = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped: "Yuborilgan",
  delivered: "Yetkazilgan",
  cancelled: "Bekor qilingan",
}

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
}

export default function AdminGlobalMarketOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [updating, setUpdating] = useState(false)

  const [updateForm, setUpdateForm] = useState({
    status: "",
    admin_notes: "",
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    filterAndSortOrders()
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder])

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

      if (!userData?.is_admin && userData?.username !== "admin") {
        toast.error("Sizda admin huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
      await fetchOrders()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        toast.error("Avtorizatsiya xatosi")
        return
      }

      const response = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        // Filter only GlobalMarket orders (admin products)
        const globalMarketOrders = data.orders.filter((order: Order) => order.products?.users?.username === "admin")
        setOrders(globalMarketOrders)
      } else {
        toast.error(data.error || "Buyurtmalarni olishda xatolik")
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    }
  }

  const filterAndSortOrders = () => {
    let filtered = [...orders]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.phone.includes(searchTerm) ||
          order.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.selected_product_info?.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Order]
      let bValue: any = b[sortBy as keyof Order]

      if (sortBy === "created_at" || sortBy === "updated_at") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortBy === "total_amount") {
        aValue = Number(aValue)
        bValue = Number(bValue)
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredOrders(filtered)
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    setUpdating(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        toast.error("Avtorizatsiya xatosi")
        return
      }

      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          status: updateForm.status,
          admin_notes: updateForm.admin_notes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Buyurtma muvaffaqiyatli yangilandi")
        setShowOrderDialog(false)
        await fetchOrders()
      } else {
        toast.error(data.error || "Buyurtmani yangilashda xatolik")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      toast.error("Buyurtmani yangilashda xatolik")
    } finally {
      setUpdating(false)
    }
  }

  const openOrderDialog = (order: Order) => {
    setSelectedOrder(order)
    setUpdateForm({
      status: order.status,
      admin_notes: order.admin_notes || "",
    })
    setShowOrderDialog(true)
  }

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || Clock
    return <IconComponent className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
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
          <h1 className="text-3xl font-bold gradient-text">GlobalMarket Buyurtmalari</h1>
          <p className="text-gray-600">
            Jami {filteredOrders.length} ta buyurtma
            {statusFilter !== "all" && ` (${statusLabels[statusFilter as keyof typeof statusLabels]})`}
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" className="bg-transparent">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-beautiful">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Qidirish</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Ism, telefon, mahsulot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barchasi</SelectItem>
                  <SelectItem value="pending">Kutilmoqda</SelectItem>
                  <SelectItem value="confirmed">Tasdiqlangan</SelectItem>
                  <SelectItem value="processing">Tayyorlanmoqda</SelectItem>
                  <SelectItem value="shipped">Yuborilgan</SelectItem>
                  <SelectItem value="delivered">Yetkazilgan</SelectItem>
                  <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-by">Saralash</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Yaratilgan vaqt</SelectItem>
                  <SelectItem value="updated_at">Yangilangan vaqt</SelectItem>
                  <SelectItem value="total_amount">Summa</SelectItem>
                  <SelectItem value="full_name">Mijoz ismi</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort-order">Tartib</Label>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="w-full justify-start bg-transparent"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortOrder === "asc" ? "O'sish" : "Kamayish"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <Card className="card-beautiful">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Buyurtmalar topilmadi</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "Qidiruv shartlariga mos buyurtmalar yo'q"
                  : "Hozircha buyurtmalar mavjud emas"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="card-beautiful hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Product Info */}
                  <div className="lg:col-span-2">
                    <div className="flex gap-4">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={order.products.image_url || "/placeholder.svg?height=80&width=80"}
                          alt={order.products.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">{order.products.name}</h3>

                        {/* Group Product Info */}
                        {order.products.product_type === "group" && order.selected_product_info && (
                          <div className="mb-2">
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              Tanlangan: {order.selected_product_info.name}
                            </Badge>
                            {order.selected_product_info.description && (
                              <p className="text-xs text-gray-600 mt-1">{order.selected_product_info.description}</p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.quantity} dona
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {order.products.price.toLocaleString()} so'm
                          </span>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          Jami: {order.total_amount.toLocaleString()} so'm
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-800">Mijoz ma'lumotlari</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{order.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${order.phone}`} className="text-blue-600 hover:underline">
                          {order.phone}
                        </a>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="break-words">{order.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Badge
                        className={`${statusColors[order.status as keyof typeof statusColors]} flex items-center gap-1`}
                      >
                        {getStatusIcon(order.status)}
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                      <span className="text-xs text-gray-500">#{order.id.slice(-8)}</span>
                    </div>

                    {order.admin_notes && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Admin eslatmasi:</strong> {order.admin_notes}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button onClick={() => openOrderDialog(order)} className="w-full btn-primary" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Tahrirlash
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Order Update Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buyurtmani tahrirlash</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedOrder.products.name}</h4>
                {selectedOrder.products.product_type === "group" && selectedOrder.selected_product_info && (
                  <p className="text-sm text-purple-600 mb-2">Tanlangan: {selectedOrder.selected_product_info.name}</p>
                )}
                <p className="text-sm text-gray-600">
                  Mijoz: {selectedOrder.full_name} • {selectedOrder.phone}
                </p>
                <p className="text-sm text-gray-600">
                  Miqdor: {selectedOrder.quantity} • Jami: {selectedOrder.total_amount.toLocaleString()} so'm
                </p>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={updateForm.status}
                  onValueChange={(value) => setUpdateForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Kutilmoqda</SelectItem>
                    <SelectItem value="confirmed">Tasdiqlangan</SelectItem>
                    <SelectItem value="processing">Tayyorlanmoqda</SelectItem>
                    <SelectItem value="shipped">Yuborilgan</SelectItem>
                    <SelectItem value="delivered">Yetkazilgan</SelectItem>
                    <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="admin_notes">Admin eslatmasi</Label>
                <Textarea
                  id="admin_notes"
                  value={updateForm.admin_notes}
                  onChange={(e) => setUpdateForm((prev) => ({ ...prev, admin_notes: e.target.value }))}
                  placeholder="Qo'shimcha eslatma..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleUpdateOrder} disabled={updating} className="flex-1 btn-primary">
                  {updating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Saqlash
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowOrderDialog(false)} variant="outline" className="flex-1 bg-transparent">
                  Bekor qilish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
