"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  FileText,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  User,
  Package,
  MessageSquare,
  Phone,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Application {
  id: string
  type: string
  status: string
  created_at: string
  updated_at: string
  reviewed_at?: string
  admin_notes?: string
  user_id?: string
  users?: {
    full_name: string
    email: string
    phone: string
    username: string
  }
  // Seller application fields
  company_name?: string
  business_type?: string
  experience?: string
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
}

export default function AdminApplicationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState("")
  const [actionNotes, setActionNotes] = useState("")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    filterApplications()
  }, [applications, searchQuery, typeFilter, statusFilter])

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
      await fetchApplications()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/applications", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (result.success) {
        setApplications(result.applications)
        calculateStats(result.applications)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error fetching applications:", error)
      toast.error("Arizalarni olishda xatolik")
    }
  }

  const calculateStats = (applicationsData: Application[]) => {
    const stats = {
      total: applicationsData.length,
      pending: applicationsData.filter((a) => a.status === "pending").length,
      approved: applicationsData.filter((a) => a.status === "approved").length,
      rejected: applicationsData.filter((a) => a.status === "rejected").length,
    }
    setStats(stats)
  }

  const filterApplications = () => {
    let filtered = applications

    if (searchQuery) {
      filtered = filtered.filter(
        (app) =>
          app.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((app) => app.type === typeFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }

  const handleAction = async (action: string) => {
    if (!selectedApplication) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/applications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: selectedApplication.id,
          type: selectedApplication.type,
          action,
          notes: actionNotes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        await fetchApplications()
        setShowActionDialog(false)
        setSelectedApplication(null)
        setActionNotes("")
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    }
  }

  const openActionDialog = (application: Application, action: string) => {
    setSelectedApplication(application)
    setActionType(action)
    setShowActionDialog(true)
  }

  const exportApplications = async () => {
    try {
      const csvContent = [
        ["ID", "Tur", "Holat", "Ariza beruvchi", "Email", "Telefon", "Sana"].join(","),
        ...filteredApplications.map((app) =>
          [
            app.id.slice(-8),
            app.type === "seller" ? "Sotuvchi" : app.type === "product" ? "Mahsulot" : "Murojaat",
            app.status === "pending" ? "Kutilmoqda" : app.status === "approved" ? "Tasdiqlangan" : "Rad etilgan",
            app.users?.full_name || app.name || "",
            app.users?.email || app.email || "",
            app.users?.phone || app.phone || "",
            new Date(app.created_at).toLocaleDateString(),
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Arizalar ro'yxati eksport qilindi")
    } catch (error) {
      console.error("Error exporting applications:", error)
      toast.error("Eksport qilishda xatolik")
    }
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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "seller":
        return <User className="h-4 w-4" />
      case "product":
        return <Package className="h-4 w-4" />
      case "contact":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case "seller":
        return "Sotuvchi arizasi"
      case "product":
        return "Mahsulot arizasi"
      case "contact":
        return "Murojaat"
      default:
        return "Noma'lum"
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Arizalar</h1>
          <p className="text-gray-600 text-sm lg:text-base">Barcha arizalar va murojaatlar</p>
        </div>
        <Button onClick={exportApplications} variant="outline" className="w-full sm:w-auto bg-transparent">
          <Download className="h-4 w-4 mr-2" />
          Excel yuklab olish
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.total}</div>
            <div className="text-xs lg:text-sm text-gray-600">Jami arizalar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.pending}</div>
            <div className="text-xs lg:text-sm text-gray-600">Kutilmoqda</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.approved}</div>
            <div className="text-xs lg:text-sm text-gray-600">Tasdiqlangan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <XCircle className="h-6 w-6 lg:h-8 lg:w-8 text-red-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.rejected}</div>
            <div className="text-xs lg:text-sm text-gray-600">Rad etilgan</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arizalar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Ariza qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tur bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                <SelectItem value="seller">Sotuvchi arizalari</SelectItem>
                <SelectItem value="product">Mahsulot arizalari</SelectItem>
                <SelectItem value="contact">Murojaatlar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Holat bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="pending">Kutilmoqda</SelectItem>
                <SelectItem value="approved">Tasdiqlangan</SelectItem>
                <SelectItem value="rejected">Rad etilgan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Arizalar yo'q</h3>
                <p className="text-gray-600">Hozircha hech qanday ariza topilmadi</p>
              </div>
            ) : (
              filteredApplications.map((application) => (
                <Card key={application.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getTypeIcon(application.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">Ariza #{application.id.slice(-8)}</h3>
                            {getStatusBadge(application.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Tur:</strong> {getTypeName(application.type)}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Ariza beruvchi:</strong>{" "}
                            {application.users?.full_name || application.name || "Noma'lum"}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Email:</strong> {application.users?.email || application.email || "Noma'lum"}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Sana:</strong> {formatDate(application.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApplication(application)
                            setShowDetailsDialog(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ko'rish
                        </Button>
                        {application.users?.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${application.users.phone}`)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Quick Info */}
                    {application.type === "seller" && application.company_name && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-700">Kompaniya: {application.company_name}</p>
                        {application.business_type && (
                          <p className="text-sm text-blue-600">Biznes turi: {application.business_type}</p>
                        )}
                      </div>
                    )}

                    {application.type === "contact" && application.subject && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-700">Mavzu: {application.subject}</p>
                        <p className="text-sm text-green-600 line-clamp-2">{application.message}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {application.status === "pending" && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openActionDialog(application, "approve")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Tasdiqlash
                        </Button>
                        {application.type === "seller" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => openActionDialog(application, "approve_verified")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Tasdiqlash va Verified qilish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => openActionDialog(application, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rad etish
                        </Button>
                      </div>
                    )}

                    {application.admin_notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Admin eslatmasi:</p>
                        <p className="text-sm text-gray-600">{application.admin_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ariza tafsilotlari</DialogTitle>
            <DialogDescription>
              {selectedApplication &&
                `Ariza #${selectedApplication.id.slice(-8)} - ${getTypeName(selectedApplication.type)}`}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Ariza beruvchi</h4>
                  <p className="text-sm">
                    <strong>Ism:</strong>{" "}
                    {selectedApplication.users?.full_name || selectedApplication.name || "Noma'lum"}
                  </p>
                  <p className="text-sm">
                    <strong>Email:</strong>{" "}
                    {selectedApplication.users?.email || selectedApplication.email || "Noma'lum"}
                  </p>
                  <p className="text-sm">
                    <strong>Telefon:</strong>{" "}
                    {selectedApplication.users?.phone || selectedApplication.phone || "Noma'lum"}
                  </p>
                  {selectedApplication.users?.username && (
                    <p className="text-sm">
                      <strong>Username:</strong> @{selectedApplication.users.username}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ariza ma'lumotlari</h4>
                  <p className="text-sm">
                    <strong>Tur:</strong> {getTypeName(selectedApplication.type)}
                  </p>
                  <p className="text-sm">
                    <strong>Holat:</strong> {getStatusBadge(selectedApplication.status)}
                  </p>
                  <p className="text-sm">
                    <strong>Sana:</strong> {formatDate(selectedApplication.created_at)}
                  </p>
                  {selectedApplication.reviewed_at && (
                    <p className="text-sm">
                      <strong>Ko'rib chiqilgan:</strong> {formatDate(selectedApplication.reviewed_at)}
                    </p>
                  )}
                </div>
              </div>

              {/* Type-specific content */}
              {selectedApplication.type === "seller" && (
                <div>
                  <h4 className="font-semibold mb-2">Sotuvchi ma'lumotlari</h4>
                  <div className="space-y-2 text-sm">
                    {selectedApplication.company_name && (
                      <p>
                        <strong>Kompaniya nomi:</strong> {selectedApplication.company_name}
                      </p>
                    )}
                    {selectedApplication.business_type && (
                      <p>
                        <strong>Biznes turi:</strong> {selectedApplication.business_type}
                      </p>
                    )}
                    {selectedApplication.experience && (
                      <p>
                        <strong>Tajriba:</strong> {selectedApplication.experience}
                      </p>
                    )}
                    {selectedApplication.description && (
                      <div>
                        <p className="font-medium">Tavsif:</p>
                        <p className="text-gray-600">{selectedApplication.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedApplication.type === "product" && selectedApplication.product_data && (
                <div>
                  <h4 className="font-semibold mb-2">Mahsulot ma'lumotlari</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Nomi:</strong> {selectedApplication.product_data.name}
                    </p>
                    <p>
                      <strong>Narx:</strong> {selectedApplication.product_data.price} so'm
                    </p>
                    {selectedApplication.product_data.description && (
                      <div>
                        <p className="font-medium">Tavsif:</p>
                        <p className="text-gray-600">{selectedApplication.product_data.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedApplication.type === "contact" && (
                <div>
                  <h4 className="font-semibold mb-2">Murojaat ma'lumotlari</h4>
                  <div className="space-y-2 text-sm">
                    {selectedApplication.subject && (
                      <p>
                        <strong>Mavzu:</strong> {selectedApplication.subject}
                      </p>
                    )}
                    {selectedApplication.message && (
                      <div>
                        <p className="font-medium">Xabar:</p>
                        <p className="text-gray-600">{selectedApplication.message}</p>
                      </div>
                    )}
                    {selectedApplication.admin_response && (
                      <div>
                        <p className="font-medium">Admin javobi:</p>
                        <p className="text-blue-600">{selectedApplication.admin_response}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedApplication.admin_notes && (
                <div>
                  <h4 className="font-semibold mb-2">Admin eslatmasi</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{selectedApplication.admin_notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Yopish
            </Button>
            {selectedApplication?.users?.phone && (
              <Button onClick={() => window.open(`tel:${selectedApplication.users.phone}`)}>
                <Phone className="h-4 w-4 mr-2" />
                Qo'ng'iroq qilish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Arizani tasdiqlash"}
              {actionType === "approve_verified" && "Arizani tasdiqlash va Verified qilish"}
              {actionType === "reject" && "Arizani rad etish"}
            </DialogTitle>
            <DialogDescription>
              {selectedApplication && `Ariza #${selectedApplication.id.slice(-8)} uchun`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">
                {actionType === "reject" ? "Rad etish sababi" : "Qo'shimcha eslatma"} (ixtiyoriy)
              </Label>
              <Textarea
                id="notes"
                placeholder={actionType === "reject" ? "Arizani nima uchun rad etyapsiz..." : "Qo'shimcha ma'lumot..."}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => handleAction(actionType)}>
              {actionType === "approve" && "Tasdiqlash"}
              {actionType === "approve_verified" && "Tasdiqlash va Verified qilish"}
              {actionType === "reject" && "Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
