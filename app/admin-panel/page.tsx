"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  Package,
  ShoppingCart,
  MessageSquare,
  Phone,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Send,
  Award,
  Store,
  Eye,
  Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { AdsManagement } from "./ads-management"
import { ProductsManagement } from "./products-management"
import { CategoriesManagement } from "./categories-management"

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

interface AdminMessage {
  id: string
  type: string
  title: string
  content: string
  data: any
  status: string
  admin_response: string
  created_by: string
  created_at: string
  users: {
    full_name: string
    email: string
    phone: string
  }
}

interface Stats {
  totalUsers: number
  totalSellers: number
  totalProducts: number
  totalOrders: number
  pendingApplications: number
  pendingProducts: number
  newMessages: number
  todayOrders: number
  totalRevenue: number
  unreadMessages: number
}

export default function AdminPanel() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingApplications: 0,
    pendingProducts: 0,
    newMessages: 0,
    todayOrders: 0,
    totalRevenue: 0,
    unreadMessages: 0,
  })
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [filteredMessages, setFilteredMessages] = useState<AdminMessage[]>([])
  const [userFilter, setUserFilter] = useState("all")
  const [orderFilter, setOrderFilter] = useState("all")
  const [messageFilter, setMessageFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderSearchQuery, setOrderSearchQuery] = useState("")
  const [messageSearchQuery, setMessageSearchQuery] = useState("")
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null)
  const [responseText, setResponseText] = useState("")

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

  useEffect(() => {
    filterMessages()
  }, [adminMessages, messageFilter, messageSearchQuery])

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
        applicationsResult,
        messagesResult,
        todayOrdersResult,
        revenueResult,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("seller_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("admin_messages").select("*", { count: "exact", head: true }).eq("status", "pending"),
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
        pendingApplications: applicationsResult.count || 0,
        pendingProducts: 0, // Will be calculated from admin messages
        newMessages: messagesResult.count || 0,
        todayOrders: todayOrdersResult.count || 0,
        totalRevenue,
        unreadMessages: messagesResult.count || 0,
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

      // Fetch admin messages
      const { data: messagesData } = await supabase
        .from("admin_messages")
        .select(`
          *,
          users (full_name, email, phone)
        `)
        .order("created_at", { ascending: false })
      setAdminMessages(messagesData || [])
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

  const filterMessages = () => {
    let filtered = adminMessages

    if (messageFilter !== "all") {
      if (messageFilter === "unread") {
        filtered = filtered.filter((msg) => msg.status === "pending")
      } else {
        filtered = filtered.filter((msg) => msg.type === messageFilter)
      }
    }

    if (messageSearchQuery) {
      filtered = filtered.filter(
        (msg) =>
          msg.title?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
          msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
          msg.users?.full_name?.toLowerCase().includes(messageSearchQuery.toLowerCase()),
      )
    }

    setFilteredMessages(filtered)
  }

  const handleMessageAction = async (messageId: string, action: "approve" | "reject", response?: string) => {
    try {
      const message = adminMessages.find((m) => m.id === messageId)
      if (!message) return

      const status = action === "approve" ? "approved" : "rejected"

      // Update admin message
      await supabase
        .from("admin_messages")
        .update({
          status,
          admin_response: response || "",
          handled_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId)

      // Handle specific message types
      if (message.type === "seller_application") {
        await supabase
          .from("seller_applications")
          .update({
            status,
            admin_notes: response || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.data.application_id)

        if (action === "approve") {
          await supabase.from("users").update({ is_verified_seller: true }).eq("id", message.data.user_id)
        }
      } else if (message.type === "product_approval") {
        if (action === "approve") {
          // Create the actual product
          const productData = message.data.product_data
          await supabase.from("products").insert({
            ...productData,
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
          })
        }
      } else if (message.type === "product_action_request") {
        if (action === "approve") {
          const { product_id, action: requestedAction } = message.data
          if (requestedAction === "delete") {
            await supabase.from("products").update({ is_active: false }).eq("id", product_id)
          }
          // For edit requests, admin would need to manually edit the product
        }
      } else if (message.type === "contact") {
        await supabase
          .from("contact_messages")
          .update({
            status: "responded",
            admin_response: response || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.data.contact_id)
      }

      toast.success(action === "approve" ? "Tasdiqlandi" : "Rad etildi")
      fetchData()
      setSelectedMessage(null)
      setResponseText("")
    } catch (error) {
      console.error("Error handling message action:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase.from("admin_messages").update({ status: "read" }).eq("id", messageId).eq("status", "pending")

      fetchData()
    } catch (error) {
      console.error("Error marking message as read:", error)
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
      read: { variant: "secondary" as const, text: "O'qilgan", icon: Eye },
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

  const getMessageTypeText = (type: string) => {
    const types: Record<string, string> = {
      seller_application: "Sotuvchi arizasi",
      product_approval: "Mahsulot tasdiqlash",
      product_action_request: "Mahsulot amal so'rovi",
      contact: "Murojaat",
      system_message: "Tizim xabari",
    }
    return types[type] || "Xabar"
  }

  const getMessageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      seller_application: "bg-blue-100 text-blue-800",
      product_approval: "bg-green-100 text-green-800",
      product_action_request: "bg-yellow-100 text-yellow-800",
      contact: "bg-purple-100 text-purple-800",
      system_message: "bg-gray-100 text-gray-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Admin Panel</h1>
        <p className="text-gray-600">Tizimni boshqarish va nazorat qilish</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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
            <MessageSquare className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <div className="text-sm text-gray-600">O'qilmagan xabarlar</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="messages">Xabarlar ({stats.unreadMessages})</TabsTrigger>
          <TabsTrigger value="orders">Buyurtmalar</TabsTrigger>
          <TabsTrigger value="users">Foydalanuvchilar</TabsTrigger>
          <TabsTrigger value="products">Mahsulotlar</TabsTrigger>
          <TabsTrigger value="categories">Kategoriyalar</TabsTrigger>
          <TabsTrigger value="ads">Reklamalar</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Admin Xabarlar
                </div>
                <Badge variant="destructive">{stats.unreadMessages} yangi</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Message Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Xabar qidirish..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={messageFilter} onValueChange={setMessageFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tur bo'yicha filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    <SelectItem value="unread">O'qilmaganlar</SelectItem>
                    <SelectItem value="seller_application">Sotuvchi arizalari</SelectItem>
                    <SelectItem value="product_approval">Mahsulot tasdiqlash</SelectItem>
                    <SelectItem value="product_action_request">Mahsulot amallari</SelectItem>
                    <SelectItem value="contact">Murojaatlar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Messages List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Xabarlar topilmadi</p>
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <Card
                      key={message.id}
                      className={`border cursor-pointer transition-colors ${
                        message.status === "pending" ? "border-l-4 border-l-red-500 bg-red-50/50" : ""
                      }`}
                      onClick={() => {
                        setSelectedMessage(message)
                        if (message.status === "pending") {
                          markMessageAsRead(message.id)
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getMessageTypeColor(message.type)}>
                                {getMessageTypeText(message.type)}
                              </Badge>
                              {getStatusBadge(message.status)}
                            </div>
                            <h3 className="font-semibold mb-1">{message.title}</h3>
                            <p className="text-gray-600 mb-2 line-clamp-2">{message.content}</p>
                            <div className="text-sm text-gray-500">
                              {message.users?.full_name} • {new Date(message.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          {message.status === "pending" && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMessageAction(message.id, "approve")
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Tasdiqlash
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMessageAction(message.id, "reject")
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rad etish
                              </Button>
                            </div>
                          )}
                        </div>
                        {message.admin_response && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm">
                              <strong>Admin javobi:</strong> {message.admin_response}
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
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Buyurtmalar
                </div>
                <Button onClick={() => {}} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
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
                          <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
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
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Foydalanuvchilar
                </div>
                <Button onClick={() => {}} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
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
                            {userData.company_name && <p className="text-sm text-blue-600">{userData.company_name}</p>}
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Send className="h-4 w-4 mr-1" />
                                Xabar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Xabar yuborish</DialogTitle>
                                <DialogDescription>
                                  {userData.full_name || userData.email} ga xabar yuboring
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Xabaringizni yozing..."
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                />
                                <Button
                                  onClick={() => {
                                    // Send message logic here
                                    setResponseText("")
                                  }}
                                  disabled={!responseText.trim()}
                                >
                                  Yuborish
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <ProductsManagement />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <CategoriesManagement />
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads">
          <AdsManagement />
        </TabsContent>
      </Tabs>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedMessage.title}</DialogTitle>
              <DialogDescription>
                {getMessageTypeText(selectedMessage.type)} • {selectedMessage.users?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p>{selectedMessage.content}</p>
              </div>

              {selectedMessage.data && Object.keys(selectedMessage.data).length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Qo'shimcha ma'lumotlar:</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedMessage.data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedMessage.admin_response && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Admin javobi:</h4>
                  <p>{selectedMessage.admin_response}</p>
                </div>
              )}

              {selectedMessage.status === "pending" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Javobingizni yozing..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleMessageAction(selectedMessage.id, "approve", responseText)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tasdiqlash
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleMessageAction(selectedMessage.id, "reject", responseText)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rad etish
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
