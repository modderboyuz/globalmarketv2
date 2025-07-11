"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  ShoppingCart,
  Package,
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  User,
  Search,
  RefreshCw,
  Truck,
  AlertTriangle,
  ArrowLeft,
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
  is_agree: boolean
  is_client_went: boolean | null
  is_client_claimed: boolean | null
  pickup_address: string | null
  seller_notes: string | null
  client_notes: string | null
  stage: number
  created_at: string
  updated_at: string
  products: {
    id: string
    name: string
    image_url: string
    price: number
  }
  users: {
    full_name: string
    email: string
    phone: string
  } | null
}

export default function SellerOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("id")

  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionNotes, setActionNotes] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (orderId && orders.length > 0) {
      const order = orders.find((o) => o.id === orderId)
      if (order) {
        setSelectedOrder(order)
      }
    }
  }, [orderId, orders])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter])

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
      await fetchOrders(currentUser.id)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async (sellerId: string) => {
    try {
      const response = await fetch(`/api/orders?sellerId=${sellerId}`)
      const result = await response.json()

      if (result.orders) {
        setOrders(result.orders)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    }
  }

  const filterOrders = () => {
    let filtered = orders

    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        filtered = filtered.filter((order) => order.stage === 1)
      } else if (statusFilter === "processing") {
        filtered = filtered.filter((order) => order.stage >= 2 && order.stage < 4)
      } else {
        filtered = filtered.filter((order) => order.status === statusFilter)
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.phone?.includes(searchQuery) ||
          order.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.includes(searchQuery),
      )
    }

    // Sort by priority: pending orders first, then by updated_at
    filtered.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1
      if (b.status === "pending" && a.status !== "pending") return 1
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    })

    setFilteredOrders(filtered)
  }

  const handleOrderAction = async (orderId: string, action: string, notes?: string, address?: string) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          action,
          userId: user.id,
          notes,
          pickupAddress: address,
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
    setPickupAddress(order.address) // Default to order address
    setShowActionDialog(true)
  }

  const executeAction = () => {
    if (!selectedOrder) return

    if (actionType === "agree") {
      handleOrderAction(selectedOrder.id, "agree", actionNotes, pickupAddress)
    } else if (actionType === "reject") {
      handleOrderAction(selectedOrder.id, "reject", actionNotes)
    } else if (actionType === "product_given") {
      handleOrderAction(selectedOrder.id, "product_given", actionNotes)
    } else if (actionType === "product_not_given") {
      handleOrderAction(selectedOrder.id, "product_not_given", actionNotes)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getStatusBadge = (order: Order) => {
    if (order.status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Yakunlandi</Badge>
    }
    if (order.status === "cancelled") {
      return <Badge variant="destructive">Bekor qilingan</Badge>
    }
    if (order.stage === 1) {
      return <Badge variant="secondary">Yangi buyurtma</Badge>
    }
    if (order.stage === 2) {
      return <Badge className="bg-blue-100 text-blue-800">Qabul qilingan</Badge>
    }
    if (order.stage === 3) {
      return <Badge className="bg-yellow-100 text-yellow-800">Mijoz kelishini kutmoqda</Badge>
    }
    return <Badge variant="secondary">Noma'lum</Badge>
  }

  const getOrderStage = (order: Order) => {
    if (order.status === "cancelled") return "Bekor qilingan"
    if (order.stage === 1) return "Yangi buyurtma - javob bering"
    if (order.stage === 2 && order.is_client_went === null) return "Mijoz kelishini kutmoqda"
    if (order.stage === 2 && order.is_client_went === false) return "Mijoz kelmadi"
    if (order.stage === 3) return "Mijoz keldi - mahsulot bering"
    if (order.stage === 4) return "Yakunlandi"
    return "Noma'lum holat"
  }

  const getOrderProgress = (order: Order) => {
    if (order.status === "cancelled") return 0
    return (order.stage / 4) * 100
  }

  const canTakeAction = (order: Order, action: string) => {
    switch (action) {
      case "agree":
        return order.stage === 1 && !order.is_agree
      case "reject":
        return order.stage === 1 && !order.is_agree
      case "product_given":
        return order.stage === 3 && order.is_client_went === true && order.is_client_claimed === null
      case "product_not_given":
        return order.stage === 3 && order.is_client_went === true && order.is_client_claimed === null
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Buyurtmalar yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  // Single order view
  if (selectedOrder && orderId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedOrder(null)
              router.push("/seller-panel/orders")
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Buyurtma #{selectedOrder.id.slice(-8)}</h1>
            <p className="text-gray-600">
              {new Date(selectedOrder.created_at).toLocaleDateString("uz-UZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Info */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle>Mahsulot ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <img
                    src={selectedOrder.products.image_url || "/placeholder.svg?height=120&width=80"}
                    alt={selectedOrder.products.name}
                    className="w-20 h-28 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{selectedOrder.products.name}</h3>
                    <p className="text-gray-600 mb-1">Miqdor: {selectedOrder.quantity} dona</p>
                    <p className="text-2xl font-bold text-green-600">{formatPrice(selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle>Mijoz ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{selectedOrder.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{selectedOrder.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <span>{selectedOrder.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pickup Address */}
            {selectedOrder.pickup_address && (
              <Card className="card-beautiful border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-800">Mahsulot olish manzili</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-700">{selectedOrder.pickup_address}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {selectedOrder.seller_notes && (
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle>Sizning eslatmangiz</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{selectedOrder.seller_notes}</p>
                </CardContent>
              </Card>
            )}

            {selectedOrder.client_notes && (
              <Card className="card-beautiful border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-800">Mijoz eslatmasi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{selectedOrder.client_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Status & Actions */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="card-beautiful">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Buyurtma holati
                  {getStatusBadge(selectedOrder)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Jarayon</span>
                    <span className="text-sm text-gray-600">{selectedOrder.stage}/4</span>
                  </div>
                  <Progress value={getOrderProgress(selectedOrder)} className="h-3" />
                  <p className="text-sm text-gray-600 mt-2">{getOrderStage(selectedOrder)}</p>
                </div>

                {/* Order Steps */}
                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      selectedOrder.stage >= 1
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <CheckCircle
                      className={`h-5 w-5 ${selectedOrder.stage >= 1 ? "text-green-600" : "text-gray-400"}`}
                    />
                    <span className="text-sm">Buyurtma berildi</span>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      selectedOrder.stage >= 2
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <CheckCircle
                      className={`h-5 w-5 ${selectedOrder.stage >= 2 ? "text-green-600" : "text-gray-400"}`}
                    />
                    <span className="text-sm">Siz qabul qildingiz</span>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      selectedOrder.stage >= 3
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <Truck className={`h-5 w-5 ${selectedOrder.stage >= 3 ? "text-green-600" : "text-gray-400"}`} />
                    <span className="text-sm">Mijoz keldi</span>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      selectedOrder.stage >= 4
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <Package className={`h-5 w-5 ${selectedOrder.stage >= 4 ? "text-green-600" : "text-gray-400"}`} />
                    <span className="text-sm">Mahsulot berildi</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Customer */}
            <Card className="card-beautiful border-2 border-gray-100">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Mijoz bilan aloqa</h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => window.open(`tel:${selectedOrder.phone}`)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {selectedOrder.phone}
                </Button>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              {canTakeAction(selectedOrder, "agree") && (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => openActionDialog(selectedOrder, "agree")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Buyurtmani qabul qilish
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => openActionDialog(selectedOrder, "reject")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rad etish
                  </Button>
                </div>
              )}

              {canTakeAction(selectedOrder, "product_given") && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">Mahsulot berildimi?</p>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => openActionDialog(selectedOrder, "product_given")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ha, berildi
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => openActionDialog(selectedOrder, "product_not_given")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Yo'q, berilmadi
                  </Button>
                </div>
              )}
            </div>
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
          <h1 className="text-3xl font-bold gradient-text">Buyurtmalar</h1>
          <p className="text-gray-600">Sizning mahsulotlaringizga berilgan buyurtmalar</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
                <SelectItem value="pending">Yangi</SelectItem>
                <SelectItem value="processing">Jarayonda</SelectItem>
                <SelectItem value="completed">Yakunlangan</SelectItem>
                <SelectItem value="cancelled">Bekor qilingan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Buyurtmalar yo'q</h3>
            <p className="text-gray-600">Hozircha sizning mahsulotlaringizga buyurtma berilmagan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="card-beautiful cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/seller-panel/orders?id=${order.id}`)}
            >
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Buyurtma #{order.id.slice(-8)}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      {new Date(order.created_at).toLocaleDateString("uz-UZ", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order)}
                    <p className="text-2xl font-bold text-green-600 mt-2">{formatPrice(order.total_amount)}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Product & Customer Info */}
                  <div className="lg:col-span-2">
                    <div className="flex gap-4 mb-4">
                      <img
                        src={order.products.image_url || "/placeholder.svg?height=120&width=80"}
                        alt={order.products.name}
                        className="w-16 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{order.products.name}</h3>
                        <p className="text-gray-600 mb-1">Miqdor: {order.quantity} dona</p>
                        <p className="text-xl font-bold text-green-600">{formatPrice(order.total_amount)}</p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Mijoz: {order.full_name}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {order.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col justify-center">
                    <div className="text-center">
                      <div className="mb-2">
                        <Progress value={getOrderProgress(order)} className="h-2" />
                      </div>
                      <p className="text-sm text-gray-600">{getOrderStage(order)}</p>

                      {order.status === "pending" && order.stage === 1 && (
                        <div className="mt-3">
                          <Badge className="bg-red-100 text-red-800 animate-pulse">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Javob kutilmoqda
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "agree"
                ? "Buyurtmani qabul qilish"
                : actionType === "reject"
                  ? "Buyurtmani rad etish"
                  : actionType === "product_given"
                    ? "Mahsulot berildi"
                    : "Mahsulot berilmadi"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "agree"
                ? "Buyurtmani qabul qilish va mahsulot olish manzilini belgilash"
                : actionType === "reject"
                  ? "Buyurtmani rad etish sababini kiriting"
                  : actionType === "product_given"
                    ? "Mahsulot mijozga berilganini tasdiqlash"
                    : "Mahsulot berilmaganini tasdiqlash"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "agree" && (
              <div>
                <Label htmlFor="pickup_address">Mahsulot olish manzili *</Label>
                <Textarea
                  id="pickup_address"
                  placeholder="Mijoz mahsulotni qayerdan olishi kerak?"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="notes">
                {actionType === "reject" ? "Rad etish sababi *" : "Qo'shimcha eslatma (ixtiyoriy)"}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  actionType === "reject"
                    ? "Buyurtmani rad etish sababini kiriting..."
                    : "Mijoz uchun qo'shimcha ma'lumot..."
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                required={actionType === "reject"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={executeAction}
              disabled={
                (actionType === "agree" && !pickupAddress.trim()) || (actionType === "reject" && !actionNotes.trim())
              }
              className={
                actionType === "product_given"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "product_not_given" || actionType === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
              }
            >
              {actionType === "agree"
                ? "Qabul qilish"
                : actionType === "reject"
                  ? "Rad etish"
                  : actionType === "product_given"
                    ? "Ha, berildi"
                    : "Yo'q, berilmadi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
