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
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  Send,
  Award,
  Store,
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
  })
  const [users, setUsers] = useState<User[]>([])
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [userFilter, setUserFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
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
        submissionsResult,
        messagesResult,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("seller_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("product_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("admin_messages").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        totalSellers: sellersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        pendingApplications: applicationsResult.count || 0,
        pendingProducts: submissionsResult.count || 0,
        newMessages: messagesResult.count || 0,
      })

      // Fetch users
      const { data: usersData } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      setUsers(usersData || [])

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

    // Filter by type
    if (userFilter === "sellers") {
      filtered = filtered.filter((user) => user.is_verified_seller)
    } else if (userFilter === "customers") {
      filtered = filtered.filter((user) => !user.is_verified_seller && !user.is_admin)
    } else if (userFilter === "admins") {
      filtered = filtered.filter((user) => user.is_admin)
    }

    // Filter by search query
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

        // If approved, update user to be seller
        if (action === "approve") {
          await supabase.from("users").update({ is_verified_seller: true }).eq("id", message.data.user_id)
        }
      } else if (message.type === "product_approval") {
        await supabase
          .from("product_submissions")
          .update({
            status,
            admin_notes: response || "",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", message.data.submission_id)

        // If approved, activate the product
        if (action === "approve") {
          await supabase
            .from("products")
            .update({ is_approved: true, is_active: true })
            .eq("id", message.data.product_id)
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

  const sendMessage = async (userId: string, message: string) => {
    try {
      // Create a system message
      await supabase.from("admin_messages").insert({
        type: "system_message",
        title: "Admin xabari",
        content: message,
        data: { user_id: userId },
        status: "sent",
        created_by: user.id,
      })

      toast.success("Xabar yuborildi")
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Xabar yuborishda xatolik")
    }
  }

  const exportUsers = () => {
    const csvContent = [
      ["Ism", "Email", "Telefon", "Kompaniya", "Sotuvchi", "Ro'yxatdan o'tgan sana"].join(","),
      ...filteredUsers.map((user) =>
        [
          user.full_name || "",
          user.email || "",
          user.phone || "",
          user.company_name || "",
          user.is_verified_seller ? "Ha" : "Yo'q",
          new Date(user.created_at).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "users.csv"
    a.click()
    window.URL.revokeObjectURL(url)
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
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
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.pendingApplications}</div>
            <div className="text-sm text-gray-600">Arizalar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.pendingProducts}</div>
            <div className="text-sm text-gray-600">Tasdiqlash</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.newMessages}</div>
            <div className="text-sm text-gray-600">Xabarlar</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages">Xabarlar ({stats.newMessages})</TabsTrigger>
          <TabsTrigger value="users">Foydalanuvchilar</TabsTrigger>
          <TabsTrigger value="ads">Reklamalar</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Admin Xabarlari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Yangi xabarlar yo'q</p>
                  </div>
                ) : (
                  adminMessages.map((message) => (
                    <Card key={message.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  message.type === "seller_application"
                                    ? "default"
                                    : message.type === "product_approval"
                                      ? "secondary"
                                      : message.type === "contact"
                                        ? "outline"
                                        : "destructive"
                                }
                              >
                                {message.type === "seller_application"
                                  ? "Sotuvchi arizasi"
                                  : message.type === "product_approval"
                                    ? "Mahsulot tasdiqlash"
                                    : message.type === "contact"
                                      ? "Murojaat"
                                      : message.type === "book_request"
                                        ? "Kitob so'rovi"
                                        : "Boshqa"}
                              </Badge>
                              <Badge
                                variant={
                                  message.status === "pending"
                                    ? "destructive"
                                    : message.status === "approved"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {message.status === "pending"
                                  ? "Kutilmoqda"
                                  : message.status === "approved"
                                    ? "Tasdiqlangan"
                                    : "Rad etilgan"}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{message.title}</h3>
                            <p className="text-gray-600 mb-2">{message.content}</p>
                            <div className="text-sm text-gray-500">
                              {message.users?.full_name} • {new Date(message.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          {message.status === "pending" && (
                            <div className="flex gap-2 ml-4">
                              {message.type === "contact" ? (
                                <>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        <MessageCircle className="h-4 w-4 mr-1" />
                                        Javob
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Javob yuborish</DialogTitle>
                                        <DialogDescription>
                                          {message.users?.full_name} ga javob yuboring
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <Textarea
                                          placeholder="Javobingizni yozing..."
                                          value={responseText}
                                          onChange={(e) => setResponseText(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => handleMessageAction(message.id, "approve", responseText)}
                                            disabled={!responseText.trim()}
                                          >
                                            Javob yuborish
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`tel:${message.data?.phone}`)}
                                  >
                                    <Phone className="h-4 w-4 mr-1" />
                                    Qo'ng'iroq
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`sms:${message.data?.phone}`)}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-1" />
                                    SMS
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleMessageAction(message.id, "approve")}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Ruxsat berish
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleMessageAction(message.id, "reject")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rad etish
                                  </Button>
                                </>
                              )}
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Foydalanuvchilar
                </div>
                <Button onClick={exportUsers} variant="outline" size="sm">
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
              <div className="space-y-4">
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
                                    sendMessage(userData.id, responseText)
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

        {/* Ads Tab */}
        <TabsContent value="ads">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle>Reklama boshqaruvi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Reklama boshqaruvi tez orada qo'shiladi...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
