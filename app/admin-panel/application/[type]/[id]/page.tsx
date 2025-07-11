"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Building,
  Package,
  MessageCircle,
  AlertTriangle,
  Award,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Application {
  id: string
  type: string
  status: string
  created_at: string
  admin_notes?: string
  users?: {
    full_name: string
    email: string
    phone: string
    username: string
  }
  // Seller application fields
  company_name?: string
  business_type?: string
  description?: string
  // Product application fields
  product_data?: any
  // Contact message fields
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
  admin_response?: string
  // Complaint fields
  complaint_text?: string
  orders?: {
    id: string
    products: {
      name: string
    }
  }
}

export default function AdminApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as string
  const id = params.id as string

  const [admin, setAdmin] = useState<any>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<string>("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    checkAdminAccess()
  }, [])

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

      setAdmin(userData)
      await fetchApplication()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchApplication = async () => {
    try {
      const response = await fetch(`/api/applications?type=${type}&id=${id}`)
      const result = await response.json()

      if (result.success) {
        setApplication(result.application)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error fetching application:", error)
      toast.error("Ariza ma'lumotlarini olishda xatolik")
    }
  }

  const handleAction = async (action: string) => {
    if (!application) return

    setActionLoading(true)

    try {
      const response = await fetch("/api/applications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: application.id,
          type: application.type,
          action,
          notes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Ariza muvaffaqiyatli yangilandi")
        await fetchApplication()
        setShowConfirmDialog(false)
        setNotes("")
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    } finally {
      setActionLoading(false)
    }
  }

  const openConfirmDialog = (action: string) => {
    setConfirmAction(action)
    setShowConfirmDialog(true)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Kutilmoqda
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Tasdiqlangan
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rad etilgan
          </Badge>
        )
      case "responded":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Javob berilgan
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "seller":
        return <Building className="h-5 w-5" />
      case "product":
        return <Package className="h-5 w-5" />
      case "contact":
        return <MessageCircle className="h-5 w-5" />
      case "complaint":
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <MessageCircle className="h-5 w-5" />
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case "seller":
        return "Sotuvchilik arizasi"
      case "product":
        return "Mahsulot arizasi"
      case "contact":
        return "Murojaat"
      case "complaint":
        return "Shikoyat"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Ariza topilmadi</h1>
          <Button onClick={() => router.push("/admin-panel/applications")}>Arizalar ro'yxatiga qaytish</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>
        <div>
          <h1 className="text-3xl font-bold gradient-text">{getTypeName(application.type)}</h1>
          <p className="text-gray-600">Ariza tafsilotlari va boshqaruv</p>
        </div>
      </div>

      {/* Application Details */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTypeIcon(application.type)}
              Ariza ma'lumotlari
            </div>
            {getStatusBadge(application.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Applicant Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Ariza beruvchi ma'lumotlari
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>
                    {application.type === "contact" ? application.name : application.users?.full_name || "Noma'lum"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>
                    {application.type === "contact" ? application.email : application.users?.email || "Noma'lum"}
                  </span>
                </div>
                {(application.phone || application.users?.phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{application.phone || application.users?.phone}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`tel:${application.phone || application.users?.phone}`)}
                    >
                      Qo'ng'iroq qilish
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ariza ma'lumotlari</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Sana:</strong> {formatDate(application.created_at)}
                </p>
                <p className="text-sm">
                  <strong>ID:</strong> {application.id}
                </p>
                <p className="text-sm">
                  <strong>Holat:</strong> {getStatusBadge(application.status)}
                </p>
              </div>
            </div>
          </div>

          {/* Application Content */}
          <div>
            {application.type === "seller" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Sotuvchilik arizasi tafsilotlari</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Kompaniya nomi:</strong>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.company_name}</p>
                  </div>
                  <div>
                    <strong>Biznes turi:</strong>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.business_type}</p>
                  </div>
                </div>
                {application.description && (
                  <div>
                    <strong>Tavsif:</strong>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.description}</p>
                  </div>
                )}
              </div>
            )}

            {application.type === "product" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Mahsulot arizasi tafsilotlari</h3>
                {application.product_data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <strong>Mahsulot nomi:</strong>
                      <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.product_data.name}</p>
                    </div>
                    <div>
                      <strong>Narx:</strong>
                      <p className="mt-1 p-3 bg-gray-50 rounded-lg">
                        {new Intl.NumberFormat("uz-UZ").format(application.product_data.price)} so'm
                      </p>
                    </div>
                    <div>
                      <strong>Kategoriya:</strong>
                      <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.product_data.category}</p>
                    </div>
                    <div>
                      <strong>Miqdor:</strong>
                      <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.product_data.stock_quantity}</p>
                    </div>
                    {application.product_data.description && (
                      <div className="md:col-span-2">
                        <strong>Tavsif:</strong>
                        <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.product_data.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {application.type === "contact" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Murojaat tafsilotlari</h3>
                <div>
                  <strong>Mavzu:</strong>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.subject}</p>
                </div>
                <div>
                  <strong>Xabar:</strong>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.message}</p>
                </div>
              </div>
            )}

            {application.type === "complaint" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Shikoyat tafsilotlari</h3>
                <div>
                  <strong>Buyurtma:</strong>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">
                    #{application.orders?.id.slice(-8)} - {application.orders?.products?.name}
                  </p>
                </div>
                <div>
                  <strong>Shikoyat matni:</strong>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{application.complaint_text}</p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Response */}
          {(application.admin_notes || application.admin_response) && (
            <div>
              <h3 className="font-semibold mb-2">Admin javobi</h3>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p>{application.admin_notes || application.admin_response}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {application.status === "pending" && (
            <div className="flex gap-4 pt-4 border-t">
              {application.type !== "contact" && application.type !== "complaint" && (
                <>
                  <Button
                    onClick={() => openConfirmDialog("approve")}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tasdiqlash
                  </Button>
                  <Button
                    onClick={() => openConfirmDialog("approve_verified")}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={actionLoading}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    To'liq verifikatsiya bilan tasdiqlash
                  </Button>
                  <Button onClick={() => openConfirmDialog("reject")} variant="destructive" disabled={actionLoading}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rad etish
                  </Button>
                </>
              )}

              {(application.type === "contact" || application.type === "complaint") && (
                <Button
                  onClick={() => openConfirmDialog("respond")}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={actionLoading}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Javob berish
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve" && "Arizani tasdiqlash"}
              {confirmAction === "approve_verified" && "To'liq verifikatsiya bilan tasdiqlash"}
              {confirmAction === "reject" && "Arizani rad etish"}
              {confirmAction === "respond" && "Javob berish"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "approve" && "Bu arizani tasdiqlashni xohlaysizmi?"}
              {confirmAction === "approve_verified" &&
                "Bu arizani to'liq verifikatsiya bilan tasdiqlashni xohlaysizmi? Bu foydalanuvchini tasdiqlangan sotuvchi qiladi."}
              {confirmAction === "reject" && "Bu arizani rad etishni xohlaysizmi?"}
              {confirmAction === "respond" && "Bu murojaatga javob berishni xohlaysizmi?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">{confirmAction === "reject" ? "Rad etish sababi" : "Izoh"} (ixtiyoriy)</Label>
              <Textarea
                id="notes"
                placeholder={
                  confirmAction === "reject"
                    ? "Arizani nima uchun rad etyapsiz..."
                    : confirmAction === "respond"
                      ? "Javobingizni yozing..."
                      : "Qo'shimcha izoh..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={actionLoading}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => handleAction(confirmAction)}
              disabled={actionLoading}
              className={
                confirmAction === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : confirmAction === "approve_verified"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-green-600 hover:bg-green-700"
              }
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                <>
                  {confirmAction === "approve" && (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tasdiqlash
                    </>
                  )}
                  {confirmAction === "approve_verified" && (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      To'liq tasdiqlash
                    </>
                  )}
                  {confirmAction === "reject" && (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Rad etish
                    </>
                  )}
                  {confirmAction === "respond" && (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Javob berish
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
