"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShoppingCart, Search, Package, User, Phone, MapPin, Clock, CheckCircle, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Order {
  id: string
  full_name: string
  phone: string
  address: string
  delivery_address: string
  delivery_phone: string
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
  updated_at: string
  products: {
    id: string
    name: string
    image_url: string
    price: number
    product_type: string
    brand: string
    author: string
  }
  users: {
    full_name: string
    email: string
    phone: string
  }
}

export default function AdminGlobalMarketOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [actionNotes, setActionNotes] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter])

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
      await fetchOrders(currentUser.id)
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async (adminId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products!orders_product_id_fkey (
            id,
            name,
            image_url,
            price,
            product_type,
            brand,
            author,
            seller_id
          ),
          users!orders_user_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq("products.seller_id", adminId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setOrders(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    }
  }

  const calculateStats = (ordersData: Order[]) => {
    const stats = {
      total: ordersData.length,
      pending: ordersData.filter((o) => o.status === "pending").length,
      completed: ordersData.filter((o) => o.status === "completed").length,
      cancelled: ordersData.filter((o) => o.status === "cancelled").length,
    }
    setStats(stats)
  }

  const filterOrders = () => {
    let filtered = orders

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.phone.includes(searchQuery) ||
          order.products?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const updateOrderStatus = async (orderId: string, action: string, notes?: string, address?: string) => {
    try {
      // Get the current session token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error("Avtorizatsiya xatoligi")
        return
      }

      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId,
          action,
          notes,
          pickupAddress: address,
          userId: user.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Xatolik yuz berdi")
      }

      toast.success("Buyurtma holati yangilandi")
      await fetchOrders(user.id)
      setShowOrderDialog(false)
      setSelectedOrder(null)
      setActionNotes("")
      setPickupAddress("")
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    }
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
    return 1
  }

  const getOrderProgress = (order: Order) => {
    const stage = getOrderStage(order)
    if (stage === 0) return 0
    return (stage / 4) * 100
  }

  const getStatusBadge = (order: Order) => {
    const stage = getOrderStage(order)

    if (stage === 4) {
      return <Badge className="bg-green-100 text-green-800">Yakunlandi</Badge>
    }
    if (stage === 0) {
      return <Badge variant="destructive">Bekor qilingan</Badge>
    }
    if (stage === 1) {
      return <Badge className="bg-yellow-100 text-yellow-800 animate-pulse">Javob kutilmoqda</Badge>
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
      case "reject":
        return stage === 1
      case "product_given":
      case "product_not_given":
        return stage === 3
      default:
        return false
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
      hour: "2-digit",
      minute: "2-digit",
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
        <h1 className="text-3xl font-bold gradient-text">GlobalMarket Buyurtmalari</h1>
        <p className="text-gray-600">GlobalMarket mahsulotlariga berilgan buyurtmalar</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Jami buyurtmalar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-sm text-gray-600">Kutilayotgan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-gray-600">Yakunlangan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.cancelled}</div>
            <div className="text-sm text-gray-600">Bekor qilingan</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Buyurtmalar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buyurtma, mijoz yoki mahsulot qidirish..."
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
                <SelectItem value="pending">Kutilayotgan</SelectItem>
                <SelectItem value="completed">Yakunlangan</SelectItem>
                <SelectItem value="cancelled">Bekor qilingan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Buyurtmalar yo'q</h3>
              <p className="text-gray-600">Hozircha hech qanday buyurtma yo'q</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="card-beautiful hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Order Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">Buyurtma #{order.id.slice(-8)}</h3>
                            <p className="text-gray-600 text-sm">{formatDate(order.created_at)}</p>
                          </div>
                          {getStatusBadge(order)}
                        </div>

                        <div className="flex gap-4 mb-4">
                          <img
                            src={order.products?.image_url || "/placeholder.svg?height=80&width=60"}
                            alt={order.products?.name}
                            className="w-16 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium line-clamp-2">{order.products?.name}</h4>
                            {order.products?.author && (
                              <p className="text-gray-600 text-sm">Muallif: {order.products.author}</p>
                            )}
                            {order.products?.brand && (
                              <p className="text-gray-600 text-sm">Brend: {order.products.brand}</p>
                            )}
                            <p className="text-sm text-gray-600">Miqdor: {order.quantity} dona</p>
                            <p className="text-lg font-bold text-green-600">{formatPrice(order.total_amount)}</p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Buyurtma holati</span>
                            <span className="text-sm text-gray-600">{getOrderProgress(order).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getOrderProgress(order)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Mijoz ma'lumotlari
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-gray-400" />
                            <span>{order.full_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{order.phone}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 text-gray-400 mt-0.5" />
                            <span className="line-clamp-2">{order.address}</span>
                          </div>
                        </div>

                        {order.pickup_address && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h5 className="font-medium text-blue-800 mb-1 text-sm">Olish manzili:</h5>
                            <p className="text-blue-700 text-sm">{order.pickup_address}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button
                          onClick={() => {
                            setSelectedOrder(order)
                            setShowOrderDialog(true)
                          }}
                          className="w-full btn-primary"
                        >
                          Batafsil ko'rish
                        </Button>

                        {canTakeAction(order, "agree") && (
                          <div className="space-y-2">
                            <Button
                              onClick={async () => {
                                setSelectedOrder(order)
                                setPickupAddress(order.address)
                                await updateOrderStatus(order.id, "agree", "", order.address)
                              }}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Qabul qilish
                            </Button>
                            <Button
                              onClick={async () => {
                                setSelectedOrder(order)
                                await updateOrderStatus(order.id, "reject", "Buyurtma rad etildi")
                              }}
                              variant="outline"
                              className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rad etish
                            </Button>
                          </div>
                        )}

                        {canTakeAction(order, "product_given") && (
                          <div className="space-y-2">
                            <Button
                              onClick={async () => {
                                await updateOrderStatus(order.id, "product_given", "Mahsulot berildi")
                              }}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Mahsulot berdim
                            </Button>
                            <Button
                              onClick={async () => {
                                await updateOrderStatus(order.id, "product_not_given", "Mahsulot berilmadi")
                              }}
                              variant="outline"
                              className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Mahsulot bermadim
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {(order.seller_notes || order.client_notes) && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        {order.seller_notes && (
                          <div className="mb-3">
                            <h5 className="font-medium text-sm mb-1">Sizning eslatmangiz:</h5>
                            <p className="text-gray-700 text-sm">{order.seller_notes}</p>
                          </div>
                        )}
                        {order.client_notes && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Mijoz eslatmasi:</h5>
                            <p className="text-gray-700 text-sm">{order.client_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buyurtma #{selectedOrder?.id.slice(-8)}</DialogTitle>
            <DialogDescription>Buyurtma batafsil ma'lumotlari</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="flex gap-4">
                <img
                  src={selectedOrder.products?.image_url || "/placeholder.svg?height=120&width=80"}
                  alt={selectedOrder.products?.name}
                  className="w-20 h-28 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{selectedOrder.products?.name}</h3>
                  {selectedOrder.products?.author && (
                    <p className="text-gray-600 mb-1">Muallif: {selectedOrder.products.author}</p>
                  )}
                  {selectedOrder.products?.brand && (
                    <p className="text-gray-600 mb-1">Brend: {selectedOrder.products.brand}</p>
                  )}
                  <p className="text-gray-600 mb-2">Miqdor: {selectedOrder.quantity} dona</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(selectedOrder.total_amount)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Mijoz ma'lumotlari</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{selectedOrder.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedOrder.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span>{selectedOrder.address}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Buyurtma ma'lumotlari</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600">Holat: </span>
                      {getStatusBadge(selectedOrder)}
                    </div>
                    <div>
                      <span className="text-gray-600">Yaratilgan: </span>
                      <span>{formatDate(selectedOrder.created_at)}</span>
                    </div>
                    {selectedOrder.updated_at !== selectedOrder.created_at && (
                      <div>
                        <span className="text-gray-600">Yangilangan: </span>
                        <span>{formatDate(selectedOrder.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Form */}
              {(canTakeAction(selectedOrder, "agree") || canTakeAction(selectedOrder, "product_given")) && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Eslatma (ixtiyoriy)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Qo'shimcha ma'lumot..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                    />
                  </div>

                  {canTakeAction(selectedOrder, "agree") && (
                    <div>
                      <Label htmlFor="pickup_address">Olish manzili</Label>
                      <Textarea
                        id="pickup_address"
                        placeholder="Mijoz mahsulotni qayerdan olishi kerak?"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
