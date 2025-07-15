"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface User {
  id: string
  full_name: string
  email: string
  phone: string
  company_name?: string
  is_verified_seller: boolean
  is_admin: boolean
  created_at: string
  last_sign_in_at: string
}

interface Application {
  id: string
  type: string
  status: string
  created_at: string
  updated_at: string
  reviewed_at?: string
  admin_notes?: string
  user_id?: string
  users?: User | null
  // Seller application fields
  company_name?: string
  business_type?: string
  experience?: string
  description?: string
  // Product application fields
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
  const [currentUser, setCurrentUser] = useState<any>(null)
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
    const checkAdminAccess = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, full_name, email, phone, company_name, is_verified_seller, is_admin, created_at, last_sign_in_at")
          .eq("id", user.id)
          .single()

        if (userError || !userData || !userData.is_admin) {
          toast.error("Sizda admin huquqi yo'q")
          router.push("/")
          return
        }

        setCurrentUser(userData)
        await fetchApplications()
      } catch (error) {
        console.error("Error checking admin access:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    checkAdminAccess()
  }, [router])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      // Fetch seller applications
      const { data: sellerApps, error: sellerError } = await supabase
        .from("seller_applications")
        .select(`
          *,
          users:users!seller_applications_user_id_fkey (
            id, full_name, email, phone, username, company_name, is_verified_seller, is_admin, created_at, last_sign_in_at
          )
        `)
        .order("created_at", { ascending: false })

      if (sellerError) throw sellerError

      // Fetch product applications
      const { data: productApps, error: productError } = await supabase
        .from("product_applications")
        .select(`
          *,
          users:users!product_applications_user_id_fkey (
            id, full_name, email, phone, username, company_name, is_verified_seller, is_admin, created_at, last_sign_in_at
          )
        `)
        .order("created_at", { ascending: false })

      if (productError) throw productError

      // Fetch complaints
      const { data: complaints, error: complaintsError } = await supabase
        .from("complaints")
        .select(`
          *,
          users:users!complaints_user_id_fkey (
            id, full_name, email, phone, username, company_name, is_verified_seller, is_admin, created_at, last_sign_in_at
          ),
          orders (
            id,
            products (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (complaintsError) throw complaintsError

      // Fetch contact messages
      const { data: contactMessages, error: contactError } = await supabase
        .from("contact_messages")
        .select(`
          id, name, email, phone, subject, message, status, admin_response, created_at, updated_at,
          users (id, full_name, email, phone, username)
        `)
        .order("created_at", { ascending: false }) // Sort by creation date

      if (contactError) throw contactError

      // Combine all data with type identifier
      const allApps: Application[] = [
        ...(sellerApps || []).map((app: any) => ({ ...app, type: "seller", users: app.users || null })),
        ...(productApps || []).map((app: any) => ({ ...app, type: "product", users: app.users || null })),
        ...(complaints || []).map((app: any) => ({
          ...app,
          type: "complaint",
          status: app.status || "pending",
          admin_response: app.admin_response || null,
          users: app.users || null,
          orders: app.orders || null,
        })),
        ...(contactMessages || []).map((msg: any) => ({ // Map contact messages
          ...msg,
          type: "contact",
          status: msg.status || "pending",
          admin_response: msg.admin_response || null,
          // Combine user and message data if user is logged in
          users: msg.user_id ? {
            id: msg.user_id,
            full_name: msg.full_name || msg.name,
            email: msg.email,
            phone: msg.phone,
            username: msg.users?.username // Assuming users join provides username
            // Other user fields might be missing if not joined correctly
          } : null,
          name: msg.name, // Keep direct fields for anonymous messages
          email: msg.email,
          phone: msg.phone,
          subject: msg.subject,
          message: msg.message,
        })),
      ]

      // Sort all combined applications by created_at
      allApps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setApplications(allApps)
      calculateStats(allApps)
    } catch (error: any) {
      console.error("Error fetching applications directly from Supabase:", error.message)
      toast.error(`Arizalarni olishda xatolik: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (appsData: Application[]) => {
    const stats = {
      total: appsData.length,
      pending: appsData.filter((a) => a.status === "pending").length,
      approved: appsData.filter((a) => a.status === "approved" || a.status === "approved_verified").length,
      rejected: appsData.filter((a) => a.status === "rejected").length,
      // Add 'resolved' for complaints if needed in stats
    }
    setStats(stats)
  }

  useEffect(() => {
    let filtered = applications

    if (searchQuery) {
      const lowerCaseSearch = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (app) =>
          app.id.toLowerCase().includes(lowerCaseSearch) ||
          app.users?.full_name?.toLowerCase().includes(lowerCaseSearch) ||
          app.users?.email?.toLowerCase().includes(lowerCaseSearch) ||
          app.company_name?.toLowerCase().includes(lowerCaseSearch) ||
          app.name?.toLowerCase().includes(lowerCaseSearch) ||
          app.subject?.toLowerCase().includes(lowerCaseSearch) ||
          app.message?.toLowerCase().includes(lowerCaseSearch) ||
          app.users?.phone?.includes(searchQuery)
      )
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((app) => app.type === typeFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }, [applications, searchQuery, typeFilter, statusFilter])

  const handleAction = async (action: string) => {
    if (!selectedApplication || !currentUser) return

    setLoading(true)
    try {
      let updateData: any = {
        updated_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      }

      let tableName = ""
      switch (selectedApplication.type) {
        case "seller":
          tableName = "seller_applications"
          updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action
          updateData.admin_notes = actionNotes
          break
        case "product":
          tableName = "product_applications"
          updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action
          updateData.admin_notes = actionNotes
          break
        case "complaint":
          tableName = "complaints"
          updateData.status = action === "resolve" ? "resolved" : action === "reject" ? "stopped" : action // Use 'stopped' for reject
          updateData.admin_response = actionNotes // For complaints, notes go to admin_response
          break
        case "contact": // Handle contact messages
          tableName = "contact_messages"
          updateData.status = action === "approve" ? "completed" : action === "reject" ? "stopped" : action
          updateData.admin_response = actionNotes // For contact messages, notes go to admin_response
          break
        default:
          throw new Error("Noto'g'ri application type")
      }

      // 1. Update the application status first
      const { data: updatedApp, error: appUpdateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", selectedApplication.id)
        .select()
        .single()

      if (appUpdateError) throw appUpdateError

      // 2. If product application is approved, copy data to 'products' table
      if (selectedApplication.type === "product" && action === "approve") {
        if (!selectedApplication.product_data) {
          throw new Error("Product data is missing for approval.")
        }

        const productToInsert = {
          name: selectedApplication.product_data.name,
          brand: selectedApplication.product_data.brand || null,
          price: selectedApplication.product_data.price,
          description: selectedApplication.product_data.description || null,
          image_url: selectedApplication.product_data.image_url || null,
          seller_id: selectedApplication.user_id || selectedApplication.product_data.seller_id || null,
          category_id: selectedApplication.product_data.category_id || null,
          has_delivery: selectedApplication.product_data.has_delivery || false,
          product_type: selectedApplication.product_data.product_type || "physical",
          delivery_price: selectedApplication.product_data.delivery_price || 0,
          stock_quantity: selectedApplication.product_data.stock_quantity || 0,
        }

        if (!productToInsert.seller_id) {
          toast.warn("Mahsulotni qo'shish uchun sotuvchi ID'si topilmadi. Mahsulot yaratilmadi.")
        } else {
          const { data: newProduct, error: productInsertError } = await supabase
            .from("products")
            .insert([productToInsert])
            .select()
            .single()

          if (productInsertError) {
            console.error("Error inserting product:", productInsertError)
            throw productInsertError
          }
        }
      }

      // 3. If approving seller application, update user's seller status
      if (selectedApplication.type === "seller" && (action === "approve" || action === "approve_verified")) {
        await supabase
          .from("users")
          .update({
            is_seller: true,
            is_verified_seller: true,
          })
          .eq("id", selectedApplication.user_id!)
          .then(({ error: userUpdateError }) => {
            if (userUpdateError) {
              console.error("Error updating user status:", userUpdateError)
            }
          })
      }

      toast.success(`Ariza muvaffaqiyatli ${action === "approve" ? "tasdiqlandi" : action === "reject" ? "rad etildi" : action === "resolve" ? "hal qilindi" : action === "completed" ? "bajarildi" : action === "stopped" ? "to'xtatildi" : action}.`)
      await fetchApplications()
      setShowActionDialog(false)
      setSelectedApplication(null)
      setActionNotes("")
    } catch (error: any) {
      console.error("Error handling application action:", error)
      toast.error(`Xatolik yuz berdi: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const openActionDialog = (application: Application, action: string) => {
    setSelectedApplication(application)
    setActionType(action)
    setActionNotes("")
    setShowActionDialog(true)
  }

  const exportApplications = async () => {
    if (!filteredApplications.length) {
      toast.warn("Eksport qilish uchun hech qanday ariza topilmadi.")
      return
    }
    try {
      const csvContent = [
        ["ID", "Tur", "Holat", "Ariza beruvchi", "Email", "Telefon", "Sana", "Kompaniya/Mavzu", "Admin Eslatmasi"].join(","),
        ...filteredApplications.map((app) =>
          [
            app.id.slice(-8),
            app.type === "seller" ? "Sotuvchi" : app.type === "product" ? "Mahsulot" : app.type === "complaint" ? "Shikoyat" : "Murojaat",
            app.status === "pending" ? "Kutilmoqda" : app.status === "approved" || app.status === "approved_verified" ? "Tasdiqlangan" : app.status === "resolved" ? "Hal qilingan" : app.status === "stopped" ? "To'xtatilgan" : "Rad etilgan",
            app.users?.full_name || app.name || "Noma'lum",
            app.users?.email || app.email || "Noma'lum",
            app.users?.phone || app.phone || "Noma'lum",
            new Date(app.created_at).toLocaleDateString(),
            app.type === "seller" ? app.company_name || "" : app.type === "contact" ? app.subject || "" : "",
            app.admin_notes || "",
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
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
      case "approved_verified":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {status === "approved_verified" ? "Tasdiqlangan (Verified)" : "Tasdiqlangan"}
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
      case "stopped": // For rejected contact messages or complaints
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            <XCircle className="h-3 w-3 mr-1" />
            To'xtatilgan
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
      case "complaint":
        return "Shikoyat"
      case "contact":
        return "Murojaat"
      default:
        return "Noma'lum"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Noma'lum sana"
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return null
    if (phone.startsWith('+')) {
      return `+${phone.substring(1, 4)} ${phone.substring(4, 7)} ${phone.substring(7, 9)} ${phone.substring(9, 11)} ${phone.substring(11)}`
    }
    return phone
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 w-full sm:w-auto bg-gray-200 rounded-md"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
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
    <div className="space-y-6 p-4 lg:p-8">
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

      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arizalar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Ariza ID, ism, email, kompaniya, mavzu bo'yicha qidirish..."
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
                <SelectItem value="complaint">Shikoyatlar</SelectItem>
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
                <SelectItem value="resolved">Hal qilingan</SelectItem>
                <SelectItem value="stopped">To'xtatilgan</SelectItem>
                <SelectItem value="completed">Bajarilgan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Yuklanmoqda...</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Arizalar yo'q</h3>
                <p className="text-gray-600">Tanlangan mezonlarga mos keladigan arizalar topilmadi.</p>
              </div>
            ) : (
              filteredApplications.map((application) => (
                <Card key={application.id} className="border hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap lg:flex-nowrap">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          {getTypeIcon(application.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-lg truncate">Ariza #{application.id.slice(-8)}</h3>
                            {getStatusBadge(application.status)}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            <strong>Tur:</strong> {getTypeName(application.type)}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            <strong>Ariza beruvchi:</strong>{" "}
                            {application.users?.full_name || application.name || "Noma'lum"}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            <strong>Email:</strong> {application.users?.email || application.email || "Noma'lum"}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Sana:</strong> {formatDate(application.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
                            aria-label={`Qo'ng'iroq qilish ${application.users.phone}`}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {(application.type === "seller" || application.type === "contact") && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        {application.type === "seller" && application.company_name && (
                          <p className="text-sm font-medium text-gray-800 mb-1">
                            Kompaniya: {application.company_name}
                          </p>
                        )}
                        {application.type === "contact" && application.subject && (
                          <p className="text-sm font-medium text-gray-800 mb-1">
                            Mavzu: {application.subject}
                          </p>
                        )}
                        {application.type === "contact" && application.message && (
                          <p className="text-sm text-gray-600 line-clamp-2">{application.message}</p>
                        )}
                      </div>
                    )}

                    {(application.status === "pending" || (application.type === "complaint" && application.status === "pending")) && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {application.type !== "complaint" && application.type !== "contact" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openActionDialog(application, "approve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Tasdiqlash
                          </Button>
                        )}
                        {application.type === "seller" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => openActionDialog(application, "approve_verified")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verified qilish
                          </Button>
                        )}
                        {application.type === "complaint" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openActionDialog(application, "resolve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Hal qilish
                          </Button>
                        )}
                        {application.type === "contact" && ( // Contact message actions
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openActionDialog(application, "completed")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Bajarildi
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => openActionDialog(application, "stopped")}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              To'xtatish
                            </Button>
                          </>
                        )}
                        {application.type !== "contact" && ( // Reject action for non-contact types
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => openActionDialog(application, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rad etish
                          </Button>
                        )}
                      </div>
                    )}

                    {application.admin_notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Admin eslatmasi:</p>
                        <p className="text-sm text-gray-600">{application.admin_notes}</p>
                      </div>
                    )}
                    {application.admin_response && application.type === "complaint" && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 mb-1">Admin javobi:</p>
                        <p className="text-sm text-blue-600">{application.admin_response}</p>
                      </div>
                    )}
                    {application.admin_response && application.type === "contact" && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-700 mb-1">Admin javobi:</p>
                        <p className="text-sm text-green-600">{application.admin_response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {filteredApplications.length > 0 && Math.ceil(applications.length / 10) > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
              <p className="text-sm text-gray-600">
                {applications.length} ta umumiydan {filteredApplications.length} ta ko'rsatilmoqda
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {}}
                  disabled={true}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Oldingi
                </Button>
                <span className="text-sm min-w-[60px] text-center">
                  1 / 1
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {}}
                  disabled={true}
                >
                  Keyingi
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={(isOpen) => {
        setShowDetailsDialog(isOpen)
        if (!isOpen) setSelectedApplication(null)
      }}>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ariza beruvchi haqida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold mb-1">Ism:</p>
                      <p className="text-gray-700">{selectedApplication.users?.full_name || selectedApplication.name || "Noma'lum"}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Email:</p>
                      <p className="text-gray-700">{selectedApplication.users?.email || selectedApplication.email || "Noma'lum"}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Telefon:</p>
                      <p className="text-gray-700">{selectedApplication.users?.phone || selectedApplication.phone || "Noma'lum"}</p>
                    </div>
                    {selectedApplication.users?.username && (
                      <div>
                        <p className="font-semibold mb-1">Username:</p>
                        <p className="text-gray-700">@{selectedApplication.users.username}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ariza haqida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold mb-1">Tur:</p>
                      <p className="text-gray-700">{getTypeName(selectedApplication.type)}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Holat:</p>
                      <p>{getStatusBadge(selectedApplication.status)}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Ariza berilgan sana:</p>
                      <p className="text-gray-700">{formatDate(selectedApplication.created_at)}</p>
                    </div>
                    {selectedApplication.reviewed_at && (
                      <div>
                        <p className="font-semibold mb-1">Ko'rib chiqilgan sana:</p>
                        <p className="text-gray-700">{formatDate(selectedApplication.reviewed_at)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {(selectedApplication.type === "seller" || selectedApplication.type === "product") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {selectedApplication.type === "seller" ? "Sotuvchi ma'lumotlari" : "Mahsulot ma'lumotlari"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {selectedApplication.type === "seller" && (
                        <>
                          {selectedApplication.company_name && (
                            <p><span className="font-semibold">Kompaniya nomi: </span><span className="text-gray-700">{selectedApplication.company_name}</span></p>
                          )}
                          {selectedApplication.business_type && (
                            <p><span className="font-semibold">Biznes turi: </span><span className="text-gray-700">{selectedApplication.business_type}</span></p>
                          )}
                          {selectedApplication.experience && (
                            <p><span className="font-semibold">Tajriba: </span><span className="text-gray-700">{selectedApplication.experience}</span></p>
                          )}
                          {selectedApplication.description && (
                            <div>
                              <p className="font-semibold mb-1">Tavsif:</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.description}</p>
                            </div>
                          )}
                        </>
                      )}
                      {selectedApplication.type === "product" && selectedApplication.product_data && (
                        <>
                          {selectedApplication.product_data.name && (
                            <p><span className="font-semibold">Mahsulot nomi: </span><span className="text-gray-700">{selectedApplication.product_data.name}</span></p>
                          )}
                          {selectedApplication.product_data.price !== undefined && (
                            <p><span className="font-semibold">Narxi: </span><span className="text-gray-700">{selectedApplication.product_data.price.toLocaleString('uz-UZ')} so'm</span></p>
                          )}
                          {selectedApplication.product_data.description && (
                            <div>
                              <p className="font-semibold mb-1">Mahsulot tavsifi:</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.product_data.description}</p>
                            </div>
                          )}
                          {selectedApplication.product_data.images && selectedApplication.product_data.images.length > 0 && (
                            <div>
                              <p className="font-semibold mb-1">Mahsulot rasmlari:</p>
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {selectedApplication.product_data.images.map((imgUrl, index) => (
                                  <img
                                    key={index}
                                    src={imgUrl}
                                    alt={`Mahsulot rasmi ${index + 1}`}
                                    className="w-20 h-20 object-cover rounded-md cursor-pointer"
                                    onClick={() => window.open(imgUrl)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedApplication.type === "contact" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Murojaat tafsilotlari</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {selectedApplication.subject && (
                        <p><span className="font-semibold">Mavzu: </span><span className="text-gray-700">{selectedApplication.subject}</span></p>
                      )}
                      {selectedApplication.message && (
                        <div>
                          <p className="font-semibold mb-1">Xabar:</p>
                          <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.message}</p>
                        </div>
                      )}
                      {selectedApplication.admin_response && (
                        <div>
                          <p className="font-semibold mb-1 text-blue-700">Admin javobi:</p>
                          <p className="text-blue-700 whitespace-pre-wrap">{selectedApplication.admin_response}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedApplication.admin_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Admin eslatmasi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.admin_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Yuklanmoqda...</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Yopish
            </Button>
            {selectedApplication?.users?.phone && (
              <Button onClick={() => window.open(`tel:${selectedApplication.users.phone}`)} aria-label={`Qo'ng'iroq qilish ${selectedApplication.users.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Qo'ng'iroq qilish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={(isOpen) => {
        setShowActionDialog(isOpen)
        if (!isOpen) {
          setSelectedApplication(null)
          setActionNotes("")
        }
      }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Arizani tasdiqlash"}
              {actionType === "approve_verified" && "Arizani tasdiqlash va Verified qilish"}
              {actionType === "reject" && "Arizani rad etish"}
              {actionType === "resolve" && "Murojaatni hal qilish"}
              {actionType === "completed" && "Ishni tugallash"}
              {actionType === "stopped" && "Amalni to'xtatish"}
            </DialogTitle>
            <DialogDescription>
              {selectedApplication && `Ariza #${selectedApplication.id.slice(-8)} uchun amalni bajaring.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="actionNotes">
                {actionType === "reject" ? "Rad etish sababi" : actionType === "resolve" ? "Admin javobi" : actionType === "stopped" ? "To'xtatish sababi" : actionType === "completed" ? "Bajarilgani haqida eslatma" : "Qo'shimcha eslatma"} (ixtiyoriy)
              </Label>
              <Textarea
                id="actionNotes"
                placeholder={
                  actionType === "reject" ? "Arizani nima uchun rad etyapsiz..." :
                  actionType === "resolve" ? "Admin javobingizni kiriting..." :
                  actionType === "stopped" ? "Nima uchun to'xtatildi..." :
                  actionType === "completed" ? "Qanday bajarildi..." :
                  "Qo'shimcha ma'lumot yoki eslatmalar..."
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => handleAction(actionType)} disabled={loading}>
              {actionType === "approve" && "Tasdiqlash"}
              {actionType === "approve_verified" && "Tasdiqlash va Verified qilish"}
              {actionType === "reject" && "Rad etish"}
              {actionType === "resolve" && "Hal qilish"}
              {actionType === "completed" && "Tasdiqlash"}
              {actionType === "stopped" && "To'xtatish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
