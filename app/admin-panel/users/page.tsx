"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Download, Phone, Eye, Award, Store, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUsers()
    }
  }, [user, searchQuery, filter, pagination.page])

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

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchQuery) params.append("search", searchQuery)
      if (filter !== "all") params.append("filter", filter)

      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sizda ruxsat yo'q. Qayta kirish amalga oshirilmoqda.")
          router.push("/login")
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setUsers(result.users)
        setPagination(result.pagination)
      } else {
        throw new Error(result.error || "Unknown error")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Foydalanuvchilarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const exportUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (filter !== "all") params.append("filter", filter)
      params.append("export", "true")

      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sizda ruxsat yo'q. Qayta kirish amalga oshirilmoqda.")
          router.push("/login")
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const csvContent = [
          ["ID", "Ism", "Email", "Telefon", "Kompaniya", "Rol", "Ro'yxatdan o'tgan sana"].join(","),
          ...result.users.map((user: User) =>
            [
              user.id,
              user.full_name || "",
              user.email || "",
              user.phone || "",
              user.company_name || "",
              user.is_admin ? "Admin" : user.is_verified_seller ? "Sotuvchi" : "Mijoz",
              new Date(user.created_at).toLocaleDateString(),
            ].join(","),
          ),
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "users.csv"
        a.click()
        window.URL.revokeObjectURL(url)

        toast.success("Foydalanuvchilar ro'yxati yuklab olindi")
      } else {
        throw new Error(result.error || "Unknown error")
      }
    } catch (error) {
      console.error("Error exporting users:", error)
      toast.error("Eksport qilishda xatolik")
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Noma'lum sana"
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Responsive phone number display
  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return null
    // Basic formatting for responsiveness, e.g., adding spaces or hyphens
    // You can customize this further based on desired formatting
    if (phone.startsWith('+')) {
      return `+${phone.substring(1, 4)} ${phone.substring(4, 7)} ${phone.substring(7, 9)} ${phone.substring(9, 11)} ${phone.substring(11)}`
    }
    return phone
  }

  if (loading && users.length === 0) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Foydalanuvchilar</h1>
          <p className="text-gray-600 text-sm lg:text-base">Barcha foydalanuvchilarni boshqaring</p>
        </div>
        <Button onClick={exportUsers} variant="outline" className="w-full sm:w-auto bg-transparent">
          <Download className="h-4 w-4 mr-2" />
          Excel yuklab olish
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Foydalanuvchilar ro'yxati ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Ism, email, telefon bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Yuklanmoqda...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Foydalanuvchilar topilmadi</h3>
                <p className="text-gray-600">Hozirgi filtrlar bo'yicha foydalanuvchilar mavjud emas.</p>
              </div>
            ) : (
              users.map((userData) => (
                <Card key={userData.id} className="border hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap lg:flex-nowrap">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarImage src="/placeholder-user.jpg" />
                          <AvatarFallback>
                            {userData.full_name?.charAt(0) || userData.email?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-lg truncate">{userData.full_name || "Noma'lum"}</h3>
                            {userData.is_admin && (
                              <Badge variant="destructive">
                                <Award className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {userData.is_verified_seller && (
                              <Badge className="bg-green-100 text-green-800">
                                <Store className="h-3 w-3 mr-1" />
                                Sotuvchi
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm truncate">{userData.email}</p>
                          {userData.phone && (
                            <p className="text-gray-600 text-sm truncate">{formatPhoneNumber(userData.phone)}</p>
                          )}
                          {userData.company_name && (
                            <p className="text-blue-600 text-sm truncate">{userData.company_name}</p>
                          )}
                          <p className="text-sm text-gray-500">Ro'yxatdan o'tgan: {formatDate(userData.created_at)}</p>
                          {userData.last_sign_in_at && (
                            <p className="text-sm text-gray-500">
                              Oxirgi kirish: {formatDate(userData.last_sign_in_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/admin-panel/user/${userData.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Ko'rish
                          </Button>
                        </Link>
                        {userData.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${userData.phone}`)}
                            aria-label={`Qo'ng'iroq qilish ${userData.phone}`}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
              <p className="text-sm text-gray-600">
                {pagination.total} tadan {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} ko'rsatilmoqda
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Oldingi
                </Button>
                <span className="text-sm min-w-[60px] text-center">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Keyingi
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
