"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Star,
  AlertTriangle,
  RefreshCw,
  Phone,
  MapPin,
  User,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import NotificationPopup from "@/components/notifications/notification-popup"

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
  products: {
    id: string
    name: string
    image_url: string
    price: number
    product_type: string
    brand: string
    author: string
    has_delivery: boolean
    delivery_price: number
    seller_id: string
    users: {
      full_name: string
      company_name: string
      phone: string
    }
  }
}

interface Review {
  rating: number
  comment: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showComplaintDialog, setShowComplaintDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<string>("")
  const [confirmTimer, setConfirmTimer] = useState(0)
  const [review, setReview] = useState<Review>({ rating: 5, comment: "" })
  const [complaintText, setComplaintText] = useState("")
  const [actionNotes, setActionNotes] = useState("")

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (confirmTimer > 0) {
      interval = setInterval(() => {
        setConfirmTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [confirmTimer])

  const checkUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      setUser(currentUser)
      await fetchOrders(currentUser.id)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            id,
            name,
            image_url,
            price,
            product_type,
            brand,
            author,
            has_delivery,
            delivery_price,
            seller_id,
            users:seller_id (
              full_name,
              company_name,
              phone
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni olishda xatolik")
    }
  }

  const updateOrderStatus = async (orderId: string, action: string, notes?: string) => {
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
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Xatolik yuz berdi")
      }

      toast.success("Buyurtma holati yangilandi")
      await fetchOrders(user.id)
      setSelectedOrder(null)
      setShowConfirmDialog(false)
      setActionNotes("")
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    }
  }

  const submitReview = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedOrder.products.id,
          orderId: selectedOrder.id,
          rating: review.rating,
          comment: review.comment,
          userId: user.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Xatolik yuz berdi")
      }

      toast.success("Sharh muvaffaqiyatli qoldirildi")
      setShowReviewDialog(false)
      setReview({ rating: 5, comment: "" })
      await fetchOrders(user.id)
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    }
  }

  const submitComplaint = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          complaintText,
          userId: user.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Xatolik yuz berdi")
      }

      toast.success("Shikoyat muvaffaqiyatli yuborildi")
      setShowComplaintDialog(false)
      setComplaintText("")
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    }
  }

  const handleConfirmAction = (action: string) => {
    setConfirmAction(action)
    setConfirmTimer(5)
    setShowConfirmDialog(true)
  }

  const executeAction = () => {
    if (confirmTimer > 0) return
    updateOrderStatus(selectedOrder!.id, confirmAction, actionNotes)
  }

  const getOrderProgress = (order: Order) => {
    if (order.status === "cancelled") return 0
    if (order.stage === 1) return 25
    if (order.stage === 2) return 50
    if (order.stage === 3) return 75
    if (order.stage === 4) return 100
    return 25
  }

  const getOrderStage = (order: Order) => {
    if (order.status === "cancelled") return "Bekor qilingan"
    if (order.stage === 1) return "Sotuvchi javobini kutmoqda"
    if (order.stage === 2 && order.is_client_went === null) return "Mahsulot olishga boring"
    if (order.stage === 2 && order.is_client_went === false) return "Mahsulot olishga bormaganingizni bildirdingiz"
    if (order.stage === 3) return "Sotuvchi mahsulot berishini kutmoqda"
    if (order.stage === 4 && order.status === "completed") return "Buyurtma yakunlandi"
    return "Noma'lum holat"
  }

  const canTakeAction = (order: Order, action: string) => {
    switch (action) {
      case "client_went":
        return order.is_agree && order.is_client_went === null && order.stage === 2
      case "client_not_went":
        return order.is_agree && order.is_client_went === null && order.stage === 2
      case "reorder":
        return order.status === "cancelled"
      case "review":
        return order.status === "completed" && order.stage === 4
      case "complaint":
        return order.status === "cancelled" || order.status === "completed"
      default:
        return false
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
    if (!order.is_agree) {
      return <Badge variant="secondary">Kutilmoqda</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800">Jarayonda</Badge>
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Buyurtmalar yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {user && <NotificationPopup userId={user.id} />}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              Buyurtmalarim
            </h1>
            <p className="text-gray-600 text-lg">Barcha buyurtmalaringizni bu yerda ko'rishingiz mumkin</p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
                <ShoppingCart className="h-16 w-16 text-gray-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-800">Buyurtmalar yo'q</h2>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                Hozircha hech qanday buyurtma bermadingiz. Xarid qilishni boshlang!
              </p>
              <Button onClick={() => router.push("/")} className="btn-primary text-lg px-8 py-4">
                <Package className="mr-2 h-5 w-5" />
                Xarid qilishni boshlash
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="card-beautiful overflow-hidden">
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">Buyurtma #{order.id.slice(-8)}</CardTitle>
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
                        <p className="text-2xl font-bold text-blue-600 mt-2">{formatPrice(order.total_amount)}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Product Info */}
                      <div className="lg:col-span-2">
                        <div className="flex gap-4 mb-6">
                          <img
                            src={order.products.image_url || "/placeholder.svg?height=120&width=80"}
                            alt={order.products.name}
                            className="w-20 h-28 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-800 mb-1">{order.products.name}</h3>
                            {order.products.author && (
                              <p className="text-gray-600 mb-1">Muallif: {order.products.author}</p>
                            )}
                            {order.products.brand && (
                              <p className="text-gray-600 mb-2">Brend: {order.products.brand}</p>
                            )}
                            <p className="text-sm text-muted-foreground mb-2">Miqdor: {order.quantity} dona</p>
                            <p className="text-2xl font-bold text-primary">{formatPrice(order.total_amount)}</p>
                          </div>
                        </div>

                        {/* Order Progress */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">Buyurtma holati</h4>
                            <span className="text-sm text-gray-600">{getOrderProgress(order)}%</span>
                          </div>
                          <Progress value={getOrderProgress(order)} className="h-3 mb-2" />
                          <p className="text-sm text-gray-600">{getOrderStage(order)}</p>
                        </div>

                        {/* Order Steps */}
                        <div className="space-y-3">
                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              order.stage >= 1
                                ? "bg-green-50 border border-green-200"
                                : "bg-gray-50 border border-gray-200"
                            }`}
                          >
                            <CheckCircle
                              className={`h-5 w-5 ${order.stage >= 1 ? "text-green-600" : "text-gray-400"}`}
                            />
                            <span className="text-sm">Buyurtma berildi</span>
                          </div>

                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              order.stage >= 2
                                ? "bg-green-50 border border-green-200"
                                : "bg-gray-50 border border-gray-200"
                            }`}
                          >
                            <CheckCircle
                              className={`h-5 w-5 ${order.stage >= 2 ? "text-green-600" : "text-gray-400"}`}
                            />
                            <span className="text-sm">Sotuvchi qabul qildi</span>
                          </div>

                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              order.stage >= 3
                                ? "bg-green-50 border border-green-200"
                                : "bg-gray-50 border border-gray-200"
                            }`}
                          >
                            <Truck className={`h-5 w-5 ${order.stage >= 3 ? "text-green-600" : "text-gray-400"}`} />
                            <span className="text-sm">Mahsulot olishga bordingiz</span>
                          </div>

                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              order.stage >= 4
                                ? "bg-green-50 border border-green-200"
                                : "bg-gray-50 border border-gray-200"
                            }`}
                          >
                            <Package className={`h-5 w-5 ${order.stage >= 4 ? "text-green-600" : "text-gray-400"}`} />
                            <span className="text-sm">Mahsulot berildi</span>
                          </div>
                        </div>

                        {/* Pickup Address */}
                        {order.pickup_address && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div>
                                <h5 className="font-semibold text-blue-800 mb-1">Mahsulot olish manzili:</h5>
                                <p className="text-blue-700">{order.pickup_address}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Seller Notes */}
                        {order.seller_notes && (
                          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <h5 className="font-semibold text-gray-800 mb-1">Sotuvchi eslatmasi:</h5>
                            <p className="text-gray-700">{order.seller_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-4">
                        {/* Seller Contact */}
                        <Card className="border-2 border-gray-100">
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Sotuvchi
                            </h4>
                            <div className="space-y-2">
                              <p className="font-medium">
                                {order.products.users.company_name || order.products.users.full_name}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full bg-transparent"
                                onClick={() => window.open(`tel:${order.products.users.phone}`)}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                {order.products.users.phone}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                          {canTakeAction(order, "client_went") && (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600 font-medium">Mahsulot olishga bordingizmi?</p>
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  handleConfirmAction("client_went")
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Ha, bordim
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  handleConfirmAction("client_not_went")
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Yo'q, bormayman
                              </Button>
                            </div>
                          )}

                          {canTakeAction(order, "review") && (
                            <Button
                              className="w-full bg-yellow-500 hover:bg-yellow-600"
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowReviewDialog(true)
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Sharh qoldirish
                            </Button>
                          )}

                          {canTakeAction(order, "reorder") && (
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => router.push(`/product/${order.products.id}`)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Qayta buyurtma qilish
                            </Button>
                          )}

                          {canTakeAction(order, "complaint") && (
                            <Button
                              variant="outline"
                              className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowComplaintDialog(true)
                              }}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Shikoyat qilish
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tasdiqlash</DialogTitle>
            <DialogDescription>
              {confirmAction === "client_went"
                ? "Mahsulot olishga borgan ekanligingizni tasdiqlaysizmi?"
                : "Mahsulot olishga bormaganingizni tasdiqlaysizmi?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Izoh (ixtiyoriy)</Label>
              <Textarea
                id="notes"
                placeholder="Qo'shimcha ma'lumot..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={executeAction}
              disabled={confirmTimer > 0}
              className={confirmTimer > 0 ? "bg-gray-400" : ""}
            >
              {confirmTimer > 0 ? `Kutish (${confirmTimer}s)` : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sharh qoldirish</DialogTitle>
            <DialogDescription>{selectedOrder?.products.name} mahsuloti haqida fikringizni bildiring</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reyting</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReview({ ...review, rating: star })} className="p-1">
                    <Star
                      className={`h-6 w-6 ${
                        star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="comment">Sharh (ixtiyoriy)</Label>
              <Textarea
                id="comment"
                placeholder="Mahsulot haqida fikringiz..."
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Bekor qilish
            </Button>
            <Button onClick={submitReview}>Sharh qoldirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog open={showComplaintDialog} onOpenChange={setShowComplaintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shikoyat qilish</DialogTitle>
            <DialogDescription>
              {selectedOrder?.products.name} buyurtmasi haqida shikoyatingizni bildiring
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="complaint">Shikoyat matni</Label>
              <Textarea
                id="complaint"
                placeholder="Shikoyatingizni batafsil yozing..."
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComplaintDialog(false)}>
              Bekor qilish
            </Button>
            <Button onClick={submitComplaint} disabled={!complaintText.trim()}>
              Shikoyat yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
