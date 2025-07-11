"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  ShoppingCart,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Search,
  Download,
  Eye,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Order {
  id: string
  full_name: string
  phone: string
  address: string
  quantity: number
  total_amount: number
  status: string
  is_agree: boolean | null
  is_client_went: boolean | null
  is_client_claimed: boolean | null
  pickup_address: string | null
  seller_notes: string | null
  client_notes: string | null
  created_at: string
  products: {
    id: string
    name: string
    image_url: string
    price: number
    product_type: string
    brand: string
    author: string
  } | null
  users: {
    full_name: string
    email: string
    phone: string
  } | null
}

export default function SellerOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
  })

  useEffect(() => {
    checkSellerAccess()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter])

  const checkSellerAccess = async () => {
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
      await fetchOrders(currentUser.id)
    } catch (error) {
      console.error("Error checking seller access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async (sellerId: string) => {
    try {
      const response = await fetch(`/api/orders?sellerId=${sellerId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Buyurtmalarni olishda xatolik")
      }

      setOrders(result.orders || [])
      calculateStats(result.orders || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    }
  }

  const calculateStats = (ordersData: Order[]) => {
    const stats = {
      total: ordersData.length,
      pending: ordersData.filter((o) => o.status === "pending").length,
      processing: ordersData.filter((o) => o.status === "processing").length,
      completed: ordersData.filter((o) => o.status === "completed").length,
      cancelled: ordersData.filter((o) => o.status === "cancelled").length,
    }
    setStats(stats)
  }

  const filterOrders = () => {
    let filtered = orders

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.phone?.includes(searchQuery) ||
          order.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.includes(searchQuery),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const handleOrderAction = async (action: string) => {
    if (!selectedOrder) return

    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action,
          notes: actionNotes,
          pickupAddress: pickupAddress || selectedOrder.address,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Xatolik yuz berdi")
      }

      toast.success("Buyurtma holati yangilandi")
      await fetchOrders(user.id)
      setShowActionDialog(false)
      setSelectedOrder(null)
      setActionNotes("")
      setPickupAddress("")
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    }
  }

  const openActionDialog = (order: Order, action: string) => {
    setSelectedOrder(order)
    setActionType(action)
    setPickupAddress(order.address)
    setShowActionDialog(true)
  }

  const getOrderStage = (order: Order) => {
    if (order.status === "cancelled") return 0
    if (order.is_agree === null && order.status === "pending") return 1
    if (order.is_agree === false && order.status === "cancelled") return 0
    if (order.is_agree === true && order.status === "pending") return 2
    if (order.is_agree === true && order.is_client_went === true && order.status === "pending") return 3
    if (
      order.is_agree === true &&
      order.is_client_went === true &&
      order.is_client_claimed === true &&
      order.status === "completed"
    )
      return 4

    // Error case
    if (order.is_client_went === true && order.is_agree === false) return -1

    return 1
  }

  const getStatusBadge = (order: Order) => {
    const stage = getOrderStage(order)

    if (stage === -1) {
      return <Badge variant="destructive">Xatolik</Badge>
    }
    if (stage === 4) {
      return <Badge className="bg-green-100 text-green-800">Yakunlandi</Badge>
    }
    if (stage === 0) {
      return <Badge variant="destructive">Bekor qilingan</Badge>
    }
    if (stage === 1) {
      return <Badge className="bg-yellow-100 text-yellow-800">Javob kutilmoqda</Badge>
    }
    if (stage === 2) {
      return <Badge className="bg-blue-100 text-blue-800">Qabul qilingan</Badge>
    }
    if (stage === 3) {
      return <Badge className="bg-purple-100 text-purple-800">Mijoz keldi</Badge>
    }
    return <Badge variant="secondary">Noma'lum</Badge>
  }

  const canTakeAction = (order: Order, action: string) => {
    const stage = getOrderStage(order)

    switch (action) {
      case "agree":
        return stage === 1
      case "reject":
        return stage === 1
      case "product_given":
        return stage === 3
      case "product_not_given":
        return stage === 3
      default:
        return false
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const exportOrders = () => {
    const csvContent = [
      ["ID", "Mijoz", "Telefon", "Mahsulot", "Miqdor", "Summa", "Holat", "Sana"].join(","),
      ...filteredOrders.map((order) =>
        [
          order.id.slice(-8),
          order.full_name || "",
          order.phone || "",
          order.products?.name || "",
          order.quantity,
          order.total_amount,
          order.status,
          new Date(order.created_at).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "orders.csv"
    a.click()
    window.URL.revokeObjectURL(url)
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
      <div>
        <h1 className="text-3xl font-bold gradient-text">Buyurtmalar</h1>
        <p className="text-gray-600">Sizning mahsulotlaringizga berilgan buyurtmalar</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Jami</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <div className="text-xl font-bold">{stats.pending}</div>
            <div className="text-sm text-gray-600">Kutilmoqda</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-xl font-bold">{stats.processing}</div>
            <div className="text-sm text-gray-600">Jarayonda</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-xl font-bold">{stats.completed}</div>
            <div className="text-sm text-gray-600">Yakunlangan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <div className="text-xl font-bold">{stats.cancelled}</div>
            <div className="text-sm text-gray-600">Bekor qilingan</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Buyurtmalar ro'yxati
            </div>
            <Button onClick={exportOrders} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buyurtma qidirish..."
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
                <SelectItem value="pending">Kutilmoqda</SelectItem>
                <SelectItem value="processing">Jarayonda</SelectItem>
                <SelectItem value="completed">Yakunlangan</SelectItem>
                <SelectItem value="cancelled">Bekor qilingan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Buyurtmalar topilmadi</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={order.products?.image_url || "/placeholder.svg?height=80&width=60"}
                          alt={order.products?.name || "Mahsulot"}
                          className="w-16 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">Buyurtma #{order.id.slice(-8)}</h3>
                            {getStatusBadge(order)}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Mahsulot:</strong> {order.products?.name || "Noma'lum"}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Mijoz:</strong> {order.full_name}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Telefon:</strong> {order.phone}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Miqdor:</strong> {order.quantity} dona
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Sana:</strong> {new Date(order.created_at).toLocaleDateString("uz-UZ")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-green-600 mb-2">{formatPrice(order.total_amount)}</div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => window.open(`tel:${order.phone}`)}>
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Manzil:</p>
                          <p className="text-sm text-gray-600">{order.address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.seller_notes && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 mb-1">Sizning eslatmangiz:</p>
                        <p className="text-sm text-blue-600">{order.seller_notes}</p>
                      </div>
                    )}

                    {order.client_notes && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-700 mb-1">Mijoz eslatmasi:</p>
                        <p className="text-sm text-green-600">{order.client_notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {canTakeAction(order, "agree") && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openActionDialog(order, "agree")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Qabul qilish
                        </Button>
                      )}

                      {canTakeAction(order, "reject") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => openActionDialog(order, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rad etish
                        </Button>
                      )}

                      {canTakeAction(order, "product_given") && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => openActionDialog(order, "product_given")}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Mahsulot berildi
                        </Button>
                      )}

                      {canTakeAction(order, "product_not_given") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                          onClick={() => openActionDialog(order, "product_not_given")}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Mahsulot berilmadi
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "agree" && "Buyurtmani qabul qilish"}
              {actionType === "reject" && "Buyurtmani rad etish"}
              {actionType === "product_given" && "Mahsulot berilganini tasdiqlash"}
              {actionType === "product_not_given" && "Mahsulot berilmaganini tasdiqlash"}
            </DialogTitle>
            <DialogDescription>{selectedOrder && `Buyurtma #${selectedOrder.id.slice(-8)} uchun`}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "agree" && (
              <div>
                <Label htmlFor="pickup-address">Mahsulot olish manzili</Label>
                <Textarea
                  id="pickup-address"
                  placeholder="Mijoz mahsulotni qayerdan olishi kerak..."
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label htmlFor="notes">
                {actionType === "reject" ? "Rad etish sababi" : "Qo'shimcha eslatma"} (ixtiyoriy)
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  actionType === "reject" ? "Buyurtmani nima uchun rad etyapsiz..." : "Qo'shimcha ma'lumot..."
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => handleOrderAction(actionType)}>
              {actionType === "agree" && "Qabul qilish"}
              {actionType === "reject" && "Rad etish"}
              {actionType === "product_given" && "Tasdiqlash"}
              {actionType === "product_not_given" && "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder && !showActionDialog} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buyurtma tafsilotlari</DialogTitle>
            <DialogDescription>{selectedOrder && `Buyurtma #${selectedOrder.id.slice(-8)}`}</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Mijoz ma'lumotlari</h4>
                  <p className="text-sm">
                    <strong>Ism:</strong> {selectedOrder.full_name}
                  </p>
                  <p className="text-sm">
                    <strong>Telefon:</strong> {selectedOrder.phone}
                  </p>
                  {selectedOrder.users?.email && (
                    <p className="text-sm">
                      <strong>Email:</strong> {selectedOrder.users.email}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Buyurtma ma'lumotlari</h4>
                  <p className="text-sm">
                    <strong>Sana:</strong> {new Date(selectedOrder.created_at).toLocaleString("uz-UZ")}
                  </p>
                  <p className="text-sm">
                    <strong>Miqdor:</strong> {selectedOrder.quantity} dona
                  </p>
                  <p className="text-sm">
                    <strong>Summa:</strong> {formatPrice(selectedOrder.total_amount)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Mahsulot</h4>
                <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={selectedOrder.products?.image_url || "/placeholder.svg?height=80&width=60"}
                    alt={selectedOrder.products?.name || "Mahsulot"}
                    className="w-16 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <h5 className="font-medium">{selectedOrder.products?.name || "Noma'lum mahsulot"}</h5>
                    {selectedOrder.products?.author && (
                      <p className="text-sm text-gray-600">Muallif: {selectedOrder.products.author}</p>
                    )}
                    {selectedOrder.products?.brand && (
                      <p className="text-sm text-gray-600">Brend: {selectedOrder.products.brand}</p>
                    )}
                    <p className="text-sm text-gray-600">Narx: {formatPrice(selectedOrder.products?.price || 0)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Yetkazib berish manzili</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{selectedOrder.address}</p>
                </div>
              </div>

              {selectedOrder.pickup_address && (
                <div>
                  <h4 className="font-semibold mb-2">Mahsulot olish manzili</h4>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">{selectedOrder.pickup_address}</p>
                  </div>
                </div>
              )}

              {selectedOrder.seller_notes && (
                <div>
                  <h4 className="font-semibold mb-2">Sizning eslatmangiz</h4>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">{selectedOrder.seller_notes}</p>
                  </div>
                </div>
              )}

              {selectedOrder.client_notes && (
                <div>
                  <h4 className="font-semibold mb-2">Mijoz eslatmasi</h4>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm">{selectedOrder.client_notes}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Holat</h4>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder)}
                  <span className="text-sm text-gray-600">
                    {getOrderStage(selectedOrder) === 1 && "Sizning javobingizni kutmoqda"}
                    {getOrderStage(selectedOrder) === 2 && "Qabul qilingan, mijoz kelishini kutmoqda"}
                    {getOrderStage(selectedOrder) === 3 && "Mijoz keldi, mahsulot berishni kutmoqda"}
                    {getOrderStage(selectedOrder) === 4 && "Buyurtma muvaffaqiyatli yakunlandi"}
                    {getOrderStage(selectedOrder) === 0 && "Buyurtma bekor qilingan"}
                    {getOrderStage(selectedOrder) === -1 && "Buyurtmada xatolik mavjud"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Yopish
            </Button>
            <Button onClick={() => window.open(`tel:${selectedOrder?.phone}`)}>
              <Phone className="h-4 w-4 mr-2" />
              Qo'ng'iroq qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
