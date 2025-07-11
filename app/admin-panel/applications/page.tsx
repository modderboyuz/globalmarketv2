"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileText,
  UserCheck,
  PackageCheck,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Application {
  id: string
  type: string
  status: string
  created_at: string
  users?: {
    full_name: string
    email: string
    phone: string
    username: string
  }
  company_name?: string
  business_type?: string
  description?: string
  product_data?: any
  name?: string
  email?: string
  subject?: string
  message?: string
  complaint_text?: string
  orders?: {
    id: string
    products: {
      name: string
    }
  }
}

export default function AdminApplicationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (user) {
      fetchApplications()
    }
  }, [user, filter, statusFilter])

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
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== "all") params.append("type", filter)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/applications?${params}`)
      const result = await response.json()

      if (result.success) {
        setApplications(result.applications)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error fetching applications:", error)
      toast.error("Arizalarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
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
        return <UserCheck className="h-4 w-4" />
      case "product":
        return <PackageCheck className="h-4 w-4" />
      case "contact":
        return <MessageCircle className="h-4 w-4" />
      case "complaint":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
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

  const getApplicationTitle = (app: Application) => {
    switch (app.type) {
      case "seller":
        return app.company_name || "Sotuvchilik arizasi"
      case "product":
        return app.product_data?.name || "Mahsulot arizasi"
      case "contact":
        return app.subject || "Murojaat"
      case "complaint":
        return `Shikoyat - ${app.orders?.products?.name || "Mahsulot"}`
      default:
        return "Ariza"
    }
  }

  const getApplicationDescription = (app: Application) => {
    switch (app.type) {
      case "seller":
        return app.description || ""
      case "product":
        return app.product_data?.description || ""
      case "contact":
        return app.message || ""
      case "complaint":
        return app.complaint_text || ""
      default:
        return ""
    }
  }

  const getApplicantName = (app: Application) => {
    if (app.type === "contact") {
      return app.name || "Noma'lum"
    }
    return app.users?.full_name || "Noma'lum"
  }

  if (loading && applications.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Arizalar</h1>
        <p className="text-gray-600">Barcha arizalar va murojaatlarni boshqaring</p>
      </div>

      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arizalar ro'yxati ({applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tur bo'yicha filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="seller">Sotuvchilik arizalari</SelectItem>
                <SelectItem value="product">Mahsulot arizalari</SelectItem>
                <SelectItem value="contact">Murojaatlar</SelectItem>
                <SelectItem value="complaint">Shikoyatlar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Holat bo'yicha filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="pending">Kutilmoqda</SelectItem>
                <SelectItem value="approved">Tasdiqlangan</SelectItem>
                <SelectItem value="rejected">Rad etilgan</SelectItem>
                <SelectItem value="responded">Javob berilgan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Yuklanmoqda...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Arizalar topilmadi</p>
              </div>
            ) : (
              applications.map((app) => (
                <Card
                  key={app.id}
                  className={`border hover:shadow-md transition-shadow ${
                    app.status === "pending" ? "border-l-4 border-l-yellow-500 bg-yellow-50/30" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                            {getTypeIcon(app.type)}
                            {getTypeName(app.type)}
                          </Badge>
                          {getStatusBadge(app.status)}
                        </div>

                        <h3 className="font-semibold text-lg mb-1">{getApplicationTitle(app)}</h3>

                        <p className="text-gray-600 mb-2 line-clamp-2">{getApplicationDescription(app)}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{getApplicantName(app)}</span>
                          <span>•</span>
                          <span>{formatDate(app.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/admin-panel/application/${app.type}/${app.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Ko'rish
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
