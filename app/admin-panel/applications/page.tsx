"use client"

import type React from "react"

import { useState, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  UserIcon,
  Package,
  MessageSquare,
  Phone,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface Application {
  id: string
  type: "seller" | "product" | "contact" | "complaint"
  status: "pending" | "approved" | "approved_verified" | "rejected" | "responded" | "resolved"
  created_at: string
  updated_at: string
  reviewed_at?: string
  admin_notes?: string
  admin_response?: string
  user_id?: string
  users?: {
    id: string
    full_name: string
    email: string
    phone: string
    company_name?: string
    is_verified_seller: boolean
    is_admin: boolean
    created_at: string
    last_sign_in_at: string
  } | null
  /* Seller */
  company_name?: string
  business_type?: string
  experience?: string
  description?: string
  /* Product */
  product_data?: {
    name: string
    brand?: string
    price: number
    description?: string
    images?: string[]
    seller_id?: string
    category_id?: string
    has_delivery?: boolean
    product_type?: string
    delivery_price?: number
    stock_quantity?: number
  }
  /* Contact / Complaint */
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
  full_name?: string
  message_type?: string
  book_request_title?: string
  book_request_author?: string
}

/* -------------------------------------------------------------------------- */
/*                           Component: AdminApplications                     */
/* -------------------------------------------------------------------------- */

export default function AdminApplicationsPage() {
  const router = useRouter()

  /* ------------------------------ State ----------------------------------- */
  const [currentUser, setCurrentUser] = useState<{
    id: string
    full_name: string
    email: string
    phone: string
    company_name?: string
    is_verified_seller: boolean
    is_admin: boolean
    created_at: string
    last_sign_in_at: string
  } | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | Application["type"]>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | Application["status"]>("all")

  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  /* Action dialog */
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "approve_verified" | "reject" | "respond" | "resolve" | "">(
    "",
  )
  const [actionNotes, setActionNotes] = useState("")

  /* Stats */
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  /* ------------------------------------------------------------------------ */
  /*                         Check admin & fetch apps                         */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        const { data: userData, error } = await supabase
          .from("users")
          .select(
            "id, full_name, email, phone, company_name, is_verified_seller, is_admin, created_at, last_sign_in_at",
          )
          .eq("id", user.id)
          .single()

        if (error || !userData || !userData.is_admin) {
          toast.error("Sizda admin huquqi yo‘q")
          router.push("/")
          return
        }

        setCurrentUser(userData)
        await fetchApplications()
      } catch (err) {
        console.error("Error checking admin access:", err)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    checkAdminAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --------------------------- Fetch Applications ------------------------- */
  const fetchApplications = async () => {
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        toast.error("Tizimga qayta kiring")
        return
      }

      const res = await fetch("/api/applications", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (data.success) {
        setApplications(data.applications || [])
        calculateStats(data.applications || [])
      } else {
        toast.error(data.error || "Arizalarni olishda xatolik")
      }
    } catch (err) {
      console.error(err)
      toast.error("Arizalarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (apps: Application[]) => {
    setStats({
      total: apps.length,
      pending: apps.filter((a) => a.status === "pending").length,
      approved: apps.filter((a) => ["approved", "approved_verified", "responded"].includes(a.status)).length,
      rejected: apps.filter((a) => a.status === "rejected").length,
    })
  }

  /* ------------------------------- Filters -------------------------------- */
  useEffect(() => {
    let filtered = [...applications]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.users?.full_name?.toLowerCase().includes(q) ||
          a.users?.email?.toLowerCase().includes(q) ||
          a.company_name?.toLowerCase().includes(q) ||
          a.name?.toLowerCase().includes(q) ||
          a.full_name?.toLowerCase().includes(q) ||
          a.subject?.toLowerCase().includes(q) ||
          a.message?.toLowerCase().includes(q) ||
          a.users?.phone?.includes(searchQuery) ||
          a.phone?.includes(searchQuery),
      )
    }

    if (typeFilter !== "all") filtered = filtered.filter((a) => a.type === typeFilter)
    if (statusFilter !== "all") filtered = filtered.filter((a) => a.status === statusFilter)

    setFilteredApplications(filtered)
  }, [applications, searchQuery, typeFilter, statusFilter])

  /* ------------------------------------------------------------------------ */
  /*                             Helper Functions                             */
  /* ------------------------------------------------------------------------ */

  const getStatusBadge = (status: Application["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Kutilmoqda
          </Badge>
        )
      case "approved":
      case "approved_verified":
      case "responded":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {status === "approved_verified"
              ? "Tasdiqlangan (Verified)"
              : status === "responded"
                ? "Javob berilgan"
                : "Tasdiqlangan"}
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rad etilgan
          </Badge>
        )
      case "resolved":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Hal qilingan
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: Application["type"]) => {
    switch (type) {
      case "seller":
        return <UserIcon className="h-4 w-4" />
      case "product":
        return <Package className="h-4 w-4" />
      case "contact":
      case "complaint":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeName = (type: Application["type"]) => {
    switch (type) {
      case "seller":
        return "Sotuvchi arizasi"
      case "product":
        return "Mahsulot arizasi"
      case "contact":
        return "Murojaat"
      case "complaint":
        return "Shikoyat"
      default:
        return "Noma'lum"
    }
  }

  const formatDate = (str?: string) => {
    if (!str) return "Noma'lum sana"
    try {
      return new Date(str).toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Noto‘g‘ri sana"
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                           Action & Dialog Logic                          */
  /* ------------------------------------------------------------------------ */

  const openActionDialog = (
    application: Application,
    action: "approve" | "approve_verified" | "reject" | "respond" | "resolve",
  ) => {
    setSelectedApplication(application)
    setActionType(action)
    setActionNotes("")
    setShowActionDialog(true)
  }

  const handleAction = async () => {
    if (!selectedApplication || !actionType) return
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        toast.error("Tizimga qayta kiring")
        return
      }

      const res = await fetch("/api/applications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedApplication.id,
          type: selectedApplication.type,
          action: actionType,
          notes: actionNotes,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Ariza yangilandi")
        await fetchApplications()
        setShowActionDialog(false)
        setSelectedApplication(null)
      } else {
        toast.error(data.error || "Xatolik yuz berdi")
      }
    } catch (err) {
      console.error(err)
      toast.error("Xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                               CSV Export                                 */
  /* ------------------------------------------------------------------------ */

  const exportApplications = async () => {
    if (!filteredApplications.length) {
      toast.warning("Eksport qilish uchun maʼlumot yo‘q")
      return
    }
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        toast.error("Tizimga qayta kiring")
        return
      }
      const res = await fetch("/api/applications?export=csv", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `arizalar-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV eksport qilindi")
      } else {
        toast.error("Eksport qilishda xatolik")
      }
    } catch (err) {
      console.error(err)
      toast.error("Eksport qilishda xatolik")
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                                 Render                                   */
  /* ------------------------------------------------------------------------ */

  if (loading)
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded-md w-full"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )

  return (
    <div className="space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Arizalar</h1>
          <p className="text-gray-600 text-sm lg:text-base">Barcha arizalar va murojaatlar</p>
        </div>
        <Button onClick={exportApplications} variant="outline" className="w-full sm:w-auto bg-transparent">
          <Download className="h-4 w-4 mr-2" />
          CSV yuklab olish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <StatCard icon={<FileText className="h-6 w-6 text-blue-600" />} value={stats.total} label="Jami arizalar" />
        <StatCard icon={<Clock className="h-6 w-6 text-yellow-600" />} value={stats.pending} label="Kutilmoqda" />
        <StatCard
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          value={stats.approved}
          label="Tasdiqlangan"
        />
        <StatCard icon={<XCircle className="h-6 w-6 text-red-600" />} value={stats.rejected} label="Rad etilgan" />
      </div>

      {/* Filters & Table */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arizalar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ID, ism, email, telefon..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                <SelectItem value="seller">Sotuvchi</SelectItem>
                <SelectItem value="product">Mahsulot</SelectItem>
                <SelectItem value="contact">Murojaat</SelectItem>
                <SelectItem value="complaint">Shikoyat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="pending">Kutilmoqda</SelectItem>
                <SelectItem value="approved">Tasdiqlangan</SelectItem>
                <SelectItem value="rejected">Rad etilgan</SelectItem>
                <SelectItem value="resolved">Hal qilingan</SelectItem>
                <SelectItem value="responded">Javob berilgan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          {filteredApplications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <Card key={app.id} className="border hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex flex-wrap lg:flex-nowrap gap-4 justify-between">
                      {/* Left */}
                      <div className="flex gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          {getTypeIcon(app.type)}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">Ariza #{app.id.slice(-8)}</h3>
                            {getStatusBadge(app.status)}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            <b>Tur:</b> {getTypeName(app.type)}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            <b>Ariza beruvchi:</b> {app.users?.full_name || app.name || app.full_name || "Noma'lum"}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            <b>Email:</b> {app.users?.email || app.email || "Noma'lum"}
                          </p>
                          <p className="text-sm text-gray-600">
                            <b>Sana:</b> {formatDate(app.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApplication(app)
                            setShowDetailsDialog(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ko'rish
                        </Button>

                        {(app.users?.phone || app.phone) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${app.users?.phone || app.phone}`)}
                            aria-label="Qo‘ng‘iroq qilish"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Quick seller/contact info */}
                    {(app.type === "seller" || app.type === "contact") && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-1">
                        {app.type === "seller" && app.company_name && (
                          <p className="text-sm">
                            <b>Kompaniya:</b> {app.company_name}
                          </p>
                        )}
                        {app.type === "contact" && app.subject && (
                          <p className="text-sm">
                            <b>Mavzu:</b> {app.subject}
                          </p>
                        )}
                        {app.type === "contact" && app.message && (
                          <p className="text-sm text-gray-600 line-clamp-2">{app.message}</p>
                        )}
                      </div>
                    )}

                    {/* Pending action buttons */}
                    {app.status === "pending" && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {app.type !== "complaint" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openActionDialog(app, "approve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Tasdiqlash
                          </Button>
                        )}
                        {app.type === "seller" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => openActionDialog(app, "approve_verified")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verified
                          </Button>
                        )}
                        {app.type === "contact" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openActionDialog(app, "respond")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Javob berish
                          </Button>
                        )}
                        {app.type === "complaint" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openActionDialog(app, "resolve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Hal qilish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => openActionDialog(app, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rad etish
                        </Button>
                      </div>
                    )}

                    {/* Admin notes / response */}
                    {app.admin_notes && (
                      <AdminNote title="Admin eslatmasi" color="gray">
                        {app.admin_notes}
                      </AdminNote>
                    )}
                    {app.admin_response && (
                      <AdminNote title="Admin javobi" color="blue">
                        {app.admin_response}
                      </AdminNote>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------ Details Dialog ------------------------ */}
      <Dialog
        open={showDetailsDialog}
        onOpenChange={(isOpen) => {
          setShowDetailsDialog(isOpen)
          if (!isOpen) setSelectedApplication(null)
        }}
      >
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ariza tafsilotlari</DialogTitle>
            <DialogDescription>
              {selectedApplication &&
                `Ariza #${selectedApplication.id.slice(-8)} - ${getTypeName(selectedApplication.type)}`}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication ? (
            <div className="space-y-6">
              {/* Applicant info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ariza beruvchi haqida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <InfoRow label="Ism">
                      {selectedApplication.users?.full_name ||
                        selectedApplication.name ||
                        selectedApplication.full_name ||
                        "Noma'lum"}
                    </InfoRow>
                    <InfoRow label="Email">
                      {selectedApplication.users?.email || selectedApplication.email || "Noma'lum"}
                    </InfoRow>
                    <InfoRow label="Telefon">
                      {selectedApplication.users?.phone || selectedApplication.phone || "Noma'lum"}
                    </InfoRow>
                    {selectedApplication.company_name && (
                      <InfoRow label="Kompaniya">{selectedApplication.company_name}</InfoRow>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Conditional details */}
              {selectedApplication.type === "product" && selectedApplication.product_data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mahsulot maʼlumotlari</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Nomi">{selectedApplication.product_data.name}</InfoRow>
                      <InfoRow label="Narxi">{selectedApplication.product_data.price} so'm</InfoRow>
                      {selectedApplication.product_data.description && (
                        <InfoRow label="Tavsif">{selectedApplication.product_data.description}</InfoRow>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(selectedApplication.type === "contact" || selectedApplication.type === "complaint") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Xabar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-line">{selectedApplication.message || "—"}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-600">Maʼlumot yuklanmoqda...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------ Action Dialog ------------------------ */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ariza uchun amal</DialogTitle>
            <DialogDescription>
              {selectedApplication &&
                `Ariza #${selectedApplication.id.slice(-8)} - ${getTypeName(selectedApplication.type)}`}
            </DialogDescription>
          </DialogHeader>
          {actionType && (
            <Fragment>
              <div className="space-y-4">
                <Textarea
                  placeholder="Eslatma / izoh..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button variant="secondary" onClick={() => setShowActionDialog(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={handleAction} disabled={loading}>
                  Tasdiqlash
                </Button>
              </DialogFooter>
            </Fragment>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                        Reusable Small Helper Components                    */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <Card className="card-beautiful">
      <CardContent className="p-3 lg:p-6 text-center space-y-1">
        <div className="mx-auto mb-1">{icon}</div>
        <div className="text-lg lg:text-2xl font-bold">{value}</div>
        <div className="text-xs lg:text-sm text-gray-600">{label}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">Arizalar yo‘q</h3>
      <p className="text-gray-600">Tanlangan mezonlarga mos arizalar topilmadi.</p>
    </div>
  )
}

function InfoRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="font-semibold mb-1">{label}:</p>
      <p className="text-gray-700 break-all">{children}</p>
    </div>
  )
}

function AdminNote({
  title,
  color,
  children,
}: {
  title: string
  color: "gray" | "blue"
  children: React.ReactNode
}) {
  const bg = color === "blue" ? "bg-blue-50" : "bg-gray-50"
  const text = color === "blue" ? "text-blue-700" : "text-gray-700"
  return (
    <div className={`mt-4 p-3 rounded-lg ${bg}`}>
      <p className={`text-sm font-medium mb-1 ${text}`}>{title}:</p>
      <p className={`text-sm ${color === "blue" ? "text-blue-600" : "text-gray-600"}`}>{children}</p>
    </div>
  )
}
