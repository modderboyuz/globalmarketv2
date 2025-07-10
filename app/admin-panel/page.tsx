"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Users,
  Package,
  ShoppingCart,
  Phone,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Award,
  Store,
  Eye,
  Clock,
  FileText,
  UserCheck,
  PackageCheck,
  MessageCircle,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  full_name: string
  phone: string
  company_name: string
  is_verified_seller: boolean
  is_admin: boolean
  created_at: string
  last_sign_in_at: string
}

interface Order {
  id: string
  full_name: string
  phone: string
  address: string
  quantity: number
  total_amount: number
  status: string
  created_at: string
  products: {
    name: string
    price: number
  }
  users: {
    full_name: string
    email: string
  }
}

interface SellerApplication {
  id: string
  user_id: string
  company_name: string
  business_type: string
  description: string
  phone: string
  address: string
  status: string
  admin_notes: string
  created_at: string
  users: {
    full_name: string
    email: string
    phone: string
  }
}

interface ProductApplication {
  id: string
  user_id: string
  product_data: any
  status: string
  admin_notes: string
  created_at: string
  users: {
    full_name: string
    email: string
    phone: string
  }
}

interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: string
  admin_response: string
  created_at: string
}

interface Complaint {
  id: string
  user_id: string
  order_id: string
  complaint_text: string
  status: string
  admin_response: string
  created_at: string
  orders: {
    id: string
    products: {
      name: string
    }
  }
  users: {
    full_name: string
    email: string
  }
}

interface Stats {
  totalUsers: number
  totalSellers: number
  totalProducts: number
  totalOrders: number
  pendingSellerApplications: number
  pendingProductApplications: number
  pendingContacts: number
  pendingComplaints: number
  todayOrders: number
  totalRevenue: number
}

export default function AdminPanel() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingSellerApplications: 0,
    pendingProductApplications: 0,
    pendingContacts: 0,
    pendingComplaints: 0,
    todayOrders: 0,
    totalRevenue: 0,
  })
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [sellerApplications, setSellerApplications] = useState<SellerApplication[]>([])
  const [productApplications, setProductApplications] = useState<ProductApplication[]>([])
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [userFilter, setUserFilter] = useState("all")
  const [orderFilter, setOrderFilter] = useState("all")
  const [applicationFilter, setApplicationFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderSearchQuery, setOrderSearchQuery] = useState("")
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [responseText, setResponseText] = useState("")
  const [activeTab, setActiveTab] = useState("applications")

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  useEffect(() => {
    filterUsers()
  }, [users, userFilter, searchQuery])

  useEffect(() => {
    filterOrders()
  }, [orders, orderFilter, orderSearchQuery])

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

  const fetchData = async () => {
    try {
      // Fetch stats
      const [
        usersResult,
        sellersResult,
        productsResult,
        ordersResult,
        sellerAppsResult,
        productAppsResult,
        contactsResult,
        complaintsResult,
        todayOrdersResult,
        revenueResult,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("seller_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("product_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date().toISOString().split("T")[0]),
        supabase.from("orders").select("total_amount").eq("status", "completed"),
      ])

      const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalUsers: usersResult.count || 0,
        totalSellers: sellersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        pendingSellerApplications: sellerAppsResult.count || 0,
        pendingProductApplications: productAppsResult.count || 0,
        pendingContacts: contactsResult.count || 0,
        pendingComplaints: complaintsResult.count || 0,
        todayOrders: todayOrdersResult.count || 0,
        totalRevenue,
      })

      // Fetch users
      const { data: usersData } = await supabase.from("users").select("*").order("created_at", { ascending: false })
      setUsers(usersData || [])

      // Fetch orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          *,
          products (name, price),
          users (full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100)
      setOrders(ordersData || [])

      // Fetch seller applications
      const { data: sellerAppsData } = await supabase
        .from("seller_applications")
        .select(`
          *,
          users (full_name, email, phone)
        `)
        .order("created_at", { ascending: false })
      setSellerApplications(sellerAppsData || [])

      // Fetch product applications
      const { data: productAppsData } = await supabase
        .from("product_applications")
        .select(`
          *,
          users (full_name, email, phone)
        `)
        .order("created_at", { ascending: false })
      setProductApplications(productAppsData || [])

      // Fetch contact messages
      const { data: contactsData } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
      setContactMessages(contactsData || [])

      // Fetch complaints
      const { data: complaintsData } = await supabase
        .from("complaints")
        .select(`
          *,
          orders (
            id,
            products (name)
          ),
          users (full_name, email)
        `)
        .order("created_at", { ascending: false })
      setComplaints(complaintsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Ma'lumotlarni yuklashda xatolik")
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (userFilter === "sellers") {
      filtered = filtered.filter((user) => user.is_verified_seller)
    } else if (userFilter === "customers") {
      filtered = filtered.filter((user) => !user.is_verified_seller && !user.is_admin)
    } else if (userFilter === "admins") {
      filtered = filtered.filter((user) => user.is_admin)
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone?.includes(searchQuery) ||
          user.company_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredUsers(filtered)
  }

  const filterOrders = () => {
    let filtered = orders

    if (orderFilter !== "all") {
      filtered = filtered.filter((order) => order.status === orderFilter)
    }

    if (orderSearchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.full_name?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
          order.phone?.includes(orderSearchQuery) ||
          order.products?.name?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
          order.id.includes(orderSearchQuery),
      )
    }

    setFilteredOrders(filtered)
  }

  const handleApplicationAction = async (applicationId: string, type: string, action: "approve" | "reject") => {
    try {
      const status = action === "approve" ? "approved" : "rejected"

      if (type === "seller") {
        const application = sellerApplications.find((app) => app.id === applicationId)
        if (!application) return

        // Update application status
        await supabase
          .from("seller_applications")
          .update({
            status,
            admin_notes: responseText || "",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", applicationId)

        // If approved, make user a verified seller
        if (action === "approve") {
          await supabase.from("users").update({ is_verified_seller: true }).eq("id", application.user_id)
        }
      } else if (type === "product") {
        const application = productApplications.find((app) => app.id === applicationId)
        if (!application) return

        // Update application status
        await supabase
          .from("product_applications")
          .update({
            status,
            admin_notes: responseText || "",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", applicationId)

        // If approved, create the product
        if (action === "approve") {
          const productData = application.product_data
          await supabase.from("products").insert({
            ...productData,
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
          })
        }
      }

      toast.success(action === "approve" ? "Tasdiqlandi" : "Rad etildi")
      fetchData()
      setSelectedApplication(null)
      setResponseText("")
    } catch (error) {
      console.error("Error handling application action:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleContactResponse = async (contactId: string) => {
    try {
      await supabase
        .from("contact_messages")
        .update({
          status: "responded",
          admin_response: responseText || "",
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", contactId)

      toast.success("Javob yuborildi")
      fetchData()
      setSelectedApplication(null)
      setResponseText("")
    } catch (error) {
      console.error("Error responding to contact:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleComplaintResponse = async (complaintId: string) => {
    try {
      await supabase
        .from("complaints")
        .update({
          status: "resolved",
          admin_response: responseText || "",
        })
        .eq("id", complaintId)

      toast.success("Shikoyat hal qilindi")
      fetchData()
      setSelectedApplication(null)
      setResponseText("")
    } catch (error) {
      console.error("Error responding to complaint:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId)

      if (error) throw error

      toast.success("Buyurtma holati yangilandi")
      fetchData()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const exportData = async (type: string, format = "csv") => {
    try {
      const response = await fetch(`/api/export?type=${type}&format=${format}`)

      if (!response.ok) {
        throw new Error("Export failed")
      }

      if (format === "csv") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}_export.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${data.filename}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      toast.success("Ma'lumotlar muvaffaqiyatli eksport qilindi")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Eksport qilishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, text: "Kutilmoqda", icon: Clock },
      processing: { variant: "default" as const, text: "Jarayonda", icon: Package },
      completed: { variant: "default" as const, text: "Bajarilgan", icon: CheckCircle },
      cancelled: { variant: "destructive" as const, text: "Bekor qilingan", icon: XCircle },
      approved: { variant: "default" as const, text: "Tasdiqlangan", icon: CheckCircle },
      rejected: { variant: "destructive" as const, text: "Rad etilgan", icon: XCircle },
      responded: { variant: "default" as const, text: "Javob berilgan", icon: CheckCircle },
      resolved: { variant: "default" as const, text: "Hal qilingan", icon: CheckCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "secondary" as const,
      text: status,
      icon: Clock,
    }

    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="text-xs flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const getFilteredApplications = () => {
    switch (applicationFilter) {
      case "seller":
        return sellerApplications
      case "product":
        return productApplications
      case "contact":
        return contactMessages
      case "complaint":
        return complaints
      default:
        return [
          ...sellerApplications.map((app) => ({ ...app, type: "seller" })),
          ...productApplications.map((app) => ({ ...app, type: "product" })),
          ...contactMessages.map((msg) => ({ ...msg, type: "contact" })),
          ...complaints.map((comp) => ({ ...comp, type: "complaint" })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const sidebarItems = [
    { id: "overview", name: "Umumiy ko'rinish", icon: Eye },
    { id: "applications", name: "Arizalar", icon: FileText },
    { id: "orders", name: "Buyurtmalar", icon: ShoppingCart },
    { id: "users", name: "Foydalanuvchilar", icon: Users },
    { id: "products", name: "Mahsulotlar", icon: Package },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Admin</h2>
                    <p className="text-xs text-gray-500">Panel</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {sidebarItems.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveTab(item.id)
                          setSidebarOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                        {item.id === "applications" && (
                          <Badge variant="destructive" className="ml-auto">
                            {stats.pendingSellerApplications +
                              stats.pendingProductApplications +
                              stats.pendingContacts +
                              stats.pendingComplaints}
                          </Badge>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          {/* Desktop Header */}
          <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-600">Tizimni boshqarish va nazorat qilish</p>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="p-4 lg:p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card className="card-beautiful">
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stats.totalUsers}</div>
                      <div className="text-sm text-gray-600">Foydalanuvchilar</div>
                    </CardContent>
                  </Card>
                  <Card className="card-beautiful">
                    <CardContent className="p-4 text-center">
                      <Store className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stats.totalSellers}</div>
                      <div className="text-sm text-gray-600">Sotuvchilar</div>
                    </CardContent>
                  </Card>
                  <Card className="card-beautiful">
                    <CardContent className="p-4 text-center">
                      <Package className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stats.totalProducts}</div>
                      <div className="text-sm text-gray-600">Mahsulotlar</div>
                    </CardContent>
                  </Card>
                  <Card className="card-beautiful">
                    <CardContent className="p-4 text-center">
                      <ShoppingCart className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stats.totalOrders}</div>
                      <div className="text-sm text-gray-600">Buyurtmalar</div>
                    </CardContent>
                  </Card>
                  <Card className="card-beautiful">
                    <CardContent className="p-4 text-center">
                      <FileText className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold">
                        {stats.pendingSellerApplications +
                          stats.pendingProductApplications +
                          stats.pendingContacts +
                          stats.pendingComplaints}
                      </div>
                      <div className="text-sm text-gray-600">Kutilayotgan arizalar</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "applications" && (
              <div className="space-y-6">
                <Card className="card-beautiful">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Arizalar
                      </div>
                      <Badge variant="destructive">
                        {stats.pendingSellerApplications +
                          stats.pendingProductApplications +
                          stats.pendingContacts +
                          stats.pendingComplaints}{" "}
                        yangi
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Application Filters */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                      <Button
                        size="sm"
                        variant={applicationFilter === "all" ? "default" : "outline"}
                        onClick={() => setApplicationFilter("all")}
                      >
                        Barchasi
                      </Button>
                      <Button
                        size="sm"
                        variant={applicationFilter === "seller" ? "default" : "outline"}
                        onClick={() => setApplicationFilter("seller")}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Sotuvchilik arizalari ({stats.pendingSellerApplications})
                      </Button>
                      <Button
                        size="sm"
                        variant={applicationFilter === "product" ? "default" : "outline"}
                        onClick={() => setApplicationFilter("product")}
                      >
                        <PackageCheck className="h-4 w-4 mr-1" />
                        Mahsulot arizalari ({stats.pendingProductApplications})
                      </Button>
                      <Button
                        size="sm"
                        variant={applicationFilter === "contact" ? "default" : "outline"}
                        onClick={() => setApplicationFilter("contact")}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Murojaatlar ({stats.pendingContacts})
                      </Button>
                      <Button
                        size="sm"
                        variant={applicationFilter === "complaint" ? "default" : "outline"}
                        onClick={() => setApplicationFilter("complaint")}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Shikoyatlar ({stats.pendingComplaints})
                      </Button>
                    </div>

                    {/* Applications List */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {getFilteredApplications().length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">Arizalar topilmadi</p>
                        </div>
                      ) : (
                        getFilteredApplications().map((application: any) => (
                          <Card
                            key={application.id}
                            className={`border cursor-pointer transition-colors ${
                              application.status === "pending" ? "border-l-4 border-l-red-500 bg-red-50/50" : ""
                            }`}
                            onClick={() => setSelectedApplication(application)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-blue-100 text-blue-800">
                                      {application.type === "seller"
                                        ? "Sotuvchilik arizasi"
                                        : application.type === "product"
                                          ? "Mahsulot arizasi"
                                          : application.type === "contact"
                                            ? "Murojaat"
                                            : "Shikoyat"}
                                    </Badge>
                                    {getStatusBadge(application.status)}
                                  </div>
                                  <h3 className="font-semibold mb-1">
                                    {application.type === "seller"
                                      ? application.company_name
                                      : application.type === "product"
                                        ? application.product_data?.name || "Mahsulot arizasi"
                                        : application.type === "contact"
                                          ? application.subject || "Murojaat"
                                          : `Shikoyat - ${application.orders?.products?.name || "Mahsulot"}`}
                                  </h3>
                                  <p className="text-gray-600 mb-2 line-clamp-2">
                                    {application.type === "seller"
                                      ? application.description
                                      : application.type === "product"
                                        ? application.product_data?.description
                                        : application.type === "contact"
                                          ? application.message
                                          : application.complaint_text}
                                  </p>
                                  <div className="text-sm text-gray-500">
                                    {application.type === "contact" ? application.name : application.users?.full_name} •{" "}
                                    {new Date(application.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                {application.status === "pending" && (
                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (application.type === "contact") {
                                          handleContactResponse(application.id)
                                        } else if (application.type === "complaint") {
                                          handleComplaintResponse(application.id)
                                        } else {
                                          handleApplicationAction(application.id, application.type, "approve")
                                        }
                                      }}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      {application.type === "contact" || application.type === "complaint"
                                        ? "Javob berish"
                                        : "Tasdiqlash"}
                                    </Button>
                                    {application.type !== "contact" && application.type !== "complaint" && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleApplicationAction(application.id, application.type, "reject")
                                        }}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Rad etish
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {application.admin_response && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm">
                                    <strong>Admin javobi:</strong> {application.admin_response}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-6">
                <Card className="card-beautiful">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Buyurtmalar
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => exportData("orders", "csv")} variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button onClick={() => exportData("orders", "json")} variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Buyurtma qidirish..."
                            value={orderSearchQuery}
                            onChange={(e) => setOrderSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={orderFilter} onValueChange={setOrderFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Holat bo'yicha filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Barchasi</SelectItem>
                          <SelectItem value="pending">Kutilmoqda</SelectItem>
                          <SelectItem value="processing">Jarayonda</SelectItem>
                          <SelectItem value="completed">Bajarilgan</SelectItem>
                          <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Orders List */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {filteredOrders.map((order) => (
                        <Card key={order.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <h3 className="font-semibold">#{order.id.slice(-8)}</h3>
                                  <p className="text-sm text-gray-600">{order.full_name}</p>
                                  <p className="text-sm text-gray-600">{order.phone}</p>
                                </div>
                                <div>
                                  <p className="font-medium">{order.products?.name}</p>
                                  <p className="text-sm text-gray-600">Miqdor: {order.quantity}</p>
                                  <p className="text-sm font-bold text-green-600">{formatPrice(order.total_amount)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(order.status)}
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => updateOrderStatus(order.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Kutilmoqda</SelectItem>
                                    <SelectItem value="processing">Jarayonda</SelectItem>
                                    <SelectItem value="completed">Bajarilgan</SelectItem>
                                    <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button size="sm" variant="outline" onClick={() => window.open(`tel:${order.phone}`)}>
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <Card className="card-beautiful">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Foydalanuvchilar
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => exportData("users", "csv")} variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button onClick={() => exportData("users", "json")} variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Qidirish..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Barchasi</SelectItem>
                          <SelectItem value="customers">Mijozlar</SelectItem>
                          <SelectItem value="sellers">Sotuvchilar</SelectItem>
                          <SelectItem value="admins">Adminlar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Users List */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {filteredUsers.map((userData) => (
                        <Card key={userData.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Avatar>
                                  <AvatarImage src="/placeholder-user.jpg" />
                                  <AvatarFallback>
                                    {userData.full_name?.charAt(0) || userData.email?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold">{userData.full_name || "Noma'lum"}</h3>
                                  <p className="text-sm text-gray-600">{userData.email}</p>
                                  {userData.phone && <p className="text-sm text-gray-600">{userData.phone}</p>}
                                  {userData.company_name && (
                                    <p className="text-sm text-blue-600">{userData.company_name}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {userData.is_admin && (
                                  <Badge variant="destructive">
                                    <Award className="h-3 w-3 mr-1" />
                                    Admin
                                  </Badge>
                                )}
                                {userData.is_verified_seller && (
                                  <Badge variant="default">
                                    <Store className="h-3 w-3 mr-1" />
                                    Sotuvchi
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedApplication.type === "seller"
                  ? "Sotuvchilik arizasi"
                  : selectedApplication.type === "product"
                    ? "Mahsulot arizasi"
                    : selectedApplication.type === "contact"
                      ? "Murojaat"
                      : "Shikoyat"}
              </DialogTitle>
              <DialogDescription>
                {selectedApplication.type === "contact"
                  ? selectedApplication.name
                  : selectedApplication.users?.full_name}{" "}
                tomonidan yuborilgan
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedApplication.type === "seller" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Ism:</strong> {selectedApplication.users?.full_name}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedApplication.users?.email}
                  </div>
                  <div>
                    <strong>Telefon:</strong> {selectedApplication.users?.phone}
                  </div>
                  <div>
                    <strong>Kompaniya:</strong> {selectedApplication.company_name}
                  </div>
                  <div>
                    <strong>Biznes turi:</strong> {selectedApplication.business_type}
                  </div>
                  <div>
                    <strong>Status:</strong> {getStatusBadge(selectedApplication.status)}
                  </div>
                </div>
              )}

              {selectedApplication.type === "contact" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Ism:</strong> {selectedApplication.name}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedApplication.email}
                  </div>
                  <div>
                    <strong>Telefon:</strong> {selectedApplication.phone}
                  </div>
                  <div>
                    <strong>Mavzu:</strong> {selectedApplication.subject}
                  </div>
                  <div>
                    <strong>Status:</strong> {getStatusBadge(selectedApplication.status)}
                  </div>
                </div>
              )}

              {selectedApplication.type === "complaint" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Ism:</strong> {selectedApplication.users?.full_name}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedApplication.users?.email}
                  </div>
                  <div>
                    <strong>Mahsulot:</strong> {selectedApplication.orders?.products?.name}
                  </div>
                  <div>
                    <strong>Status:</strong> {getStatusBadge(selectedApplication.status)}
                  </div>
                </div>
              )}

              <div>
                <strong>
                  {selectedApplication.type === "seller"
                    ? "Tavsif:"
                    : selectedApplication.type === "contact"
                      ? "Xabar:"
                      : "Shikoyat:"}
                </strong>
                <p className="mt-2 p-3 bg-gray-50 rounded-lg">
                  {selectedApplication.type === "seller"
                    ? selectedApplication.description
                    : selectedApplication.type === "contact"
                      ? selectedApplication.message
                      : selectedApplication.complaint_text}
                </p>
              </div>

              {selectedApplication.admin_response && (
                <div>
                  <strong>Admin javobi:</strong>
                  <p className="mt-2 p-3 bg-green-50 rounded-lg">{selectedApplication.admin_response}</p>
                </div>
              )}

              {selectedApplication.status === "pending" && (
                <div>
                  <strong>Javob:</strong>
                  <Textarea
                    placeholder="Javobingizni yozing..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {selectedApplication.status === "pending" && (
              <DialogFooter>
                {selectedApplication.type !== "contact" && selectedApplication.type !== "complaint" && (
                  <Button
                    variant="outline"
                    onClick={() => handleApplicationAction(selectedApplication.id, selectedApplication.type, "reject")}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rad etish
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (selectedApplication.type === "contact") {
                      handleContactResponse(selectedApplication.id)
                    } else if (selectedApplication.type === "complaint") {
                      handleComplaintResponse(selectedApplication.id)
                    } else {
                      handleApplicationAction(selectedApplication.id, selectedApplication.type, "approve")
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {selectedApplication.type === "contact" || selectedApplication.type === "complaint"
                    ? "Javob berish"
                    : "Tasdiqlash"}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
