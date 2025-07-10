"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Star, Package, Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

interface Order {
  id: string
  quantity: number
  total_price: number
  status: string
  address: string
  stage: number
  is_agree: boolean
  is_client_went: boolean | null
  is_client_claimed: boolean | null
  created_at: string
  products: {
    id: string
    title: string
    price: number
    image_url: string
    users: {
      id: string
      full_name: string
      company_name: string
    }
  }
  users: {
    id: string
    full_name: string
    phone: string
    email: string
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewDialog, setReviewDialog] = useState<Order | null>(null)
  const [complaintDialog, setComplaintDialog] = useState<Order | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ order: Order; action: string; countdown?: number } | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [complaintText, setComplaintText] = useState("")

  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightOrderId = searchParams.get("highlight")

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders")
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      } else {
        toast.error("Buyurtmalarni yuklashda xatolik")
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      toast.error("Buyurtmalarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleOrderAction = async (orderId: string, action: string, address?: string) => {
    setActionLoading(orderId)

    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, action, address }),
      })

      if (response.ok) {
        toast.success("Buyurtma holati yangilandi")
        fetchOrders()
      } else {
        toast.error("Xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Order action error:", error)
      toast.error("Xatolik yuz berdi")
    } finally {
      setActionLoading(null)
      setConfirmDialog(null)
    }
  }

  const handleConfirmAction = (order: Order, action: string) => {
    if (action === "client_not_went") {
      // Show countdown confirmation for "didn't go"
      setConfirmDialog({ order, action, countdown: 5 })
      const interval = setInterval(() => {
        setConfirmDialog((prev) => {
          if (!prev || prev.countdown === 1) {
            clearInterval(interval)
            return null
          }
          return { ...prev, countdown: prev.countdown! - 1 }
        })
      }, 1000)
    } else {
      setConfirmDialog({ order, action })
    }
  }

  const submitReview = async () => {
    if (!reviewDialog) return

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: reviewDialog.products.id,
          order_id: reviewDialog.id,
          rating,
          comment,
        }),
      })

      if (response.ok) {
        toast.success("Baho qoldirildi")
        setReviewDialog(null)
        setRating(5)
        setComment("")
      } else {
        toast.error("Baho qoldirishda xatolik")
      }
    } catch (error) {
      console.error("Review submission error:", error)
      toast.error("Baho qoldirishda xatolik")
    }
  }

  const submitComplaint = async () => {
    if (!complaintDialog) return

    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: complaintDialog.id,
          complaint_text: complaintText,
        }),
      })

      if (response.ok) {
        toast.success("Shikoyat yuborildi")
        setComplaintDialog(null)
        setComplaintText("")
      } else {
        toast.error("Shikoyat yuborishda xatolik")
      }
    } catch (error) {
      console.error("Complaint submission error:", error)
      toast.error("Shikoyat yuborishda xatolik")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "confirmed":
        return <Package className="h-4 w-4" />
      case "ready":
        return <Package className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "ready":
        return "bg-purple-100 text-purple-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Kutilmoqda"
      case "confirmed":
        return "Tasdiqlangan"
      case "ready":
        return "Tayyor"
      case "completed":
        return "Yakunlangan"
      case "cancelled":
        return "Bekor qilingan"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Yuklanmoqda...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Buyurtmalarim</h1>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Hozircha buyurtmalaringiz yo'q</p>
            <Button className="mt-4" onClick={() => router.push("/products")}>
              Xarid qilishni boshlash
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className={`${highlightOrderId === order.id ? "ring-2 ring-blue-500" : ""}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      {order.products.title}
                    </CardTitle>
                    <CardDescription>Buyurtma #{order.id.slice(0, 8)}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p>
                      <strong>Sotuvchi:</strong> {order.products.users.full_name}
                    </p>
                    <p>
                      <strong>Kompaniya:</strong> {order.products.users.company_name}
                    </p>
                    <p>
                      <strong>Miqdor:</strong> {order.quantity}
                    </p>
                    <p>
                      <strong>Narx:</strong> {order.total_price.toLocaleString()} so'm
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Manzil:</strong> {order.address}
                    </p>
                    <p>
                      <strong>Sana:</strong> {new Date(order.created_at).toLocaleDateString("uz-UZ")}
                    </p>
                    <p>
                      <strong>Bosqich:</strong> {order.stage}/4
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Order Stage Actions */}
                <div className="space-y-3">
                  {order.status === "confirmed" && order.stage === 2 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Buyurtmangiz tayyor! Olishga keldingizmi?</h4>
                      <p className="text-sm text-gray-600 mb-3">Manzil: {order.address}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleOrderAction(order.id, "client_went")}
                          disabled={actionLoading === order.id}
                          size="sm"
                        >
                          Ha, bordim
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleConfirmAction(order, "client_not_went")}
                          disabled={actionLoading === order.id}
                          size="sm"
                        >
                          Yo'q, bormayman
                        </Button>
                      </div>
                    </div>
                  )}

                  {order.status === "completed" && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-green-800">Buyurtma yakunlandi!</h4>
                      <div className="flex gap-2">
                        <Button onClick={() => setReviewDialog(order)} size="sm" variant="outline">
                          <Star className="h-4 w-4 mr-1" />
                          Baho berish
                        </Button>
                        <Button onClick={() => setComplaintDialog(order)} size="sm" variant="outline">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Shikoyat qilish
                        </Button>
                      </div>
                    </div>
                  )}

                  {order.status === "cancelled" && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-red-800">Buyurtma bekor qilindi</h4>
                      <Button onClick={() => router.push(`/product/${order.products.id}`)} size="sm" variant="outline">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Qayta buyurtma qilish
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baho berish</DialogTitle>
            <DialogDescription>{reviewDialog?.products.title} uchun baho va fikr qoldiring</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Baho</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fikr (ixtiyoriy)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Mahsulot haqida fikringizni yozing..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              Bekor qilish
            </Button>
            <Button onClick={submitReview}>Baho berish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog open={!!complaintDialog} onOpenChange={() => setComplaintDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shikoyat qilish</DialogTitle>
            <DialogDescription>
              {complaintDialog?.products.title} buyurtmasi haqida shikoyatingizni yozing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Shikoyat matni</label>
              <Textarea
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Muammo haqida batafsil yozing..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComplaintDialog(null)}>
              Bekor qilish
            </Button>
            <Button onClick={submitComplaint} disabled={!complaintText.trim()}>
              Shikoyat yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tasdiqlash</DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === "client_not_went"
                ? "Haqiqatan ham mahsulotni olishga bormaganmisiz?"
                : "Bu amalni bajarishni tasdiqlaysizmi?"}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog?.countdown && (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-red-500">{confirmDialog.countdown}</div>
              <p className="text-sm text-gray-600">soniya kutib turing...</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => handleOrderAction(confirmDialog!.order.id, confirmDialog!.action)}
              disabled={!!confirmDialog?.countdown}
              variant={confirmDialog?.action === "client_not_went" ? "destructive" : "default"}
            >
              {confirmDialog?.countdown ? `Kutib turing (${confirmDialog.countdown})` : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
