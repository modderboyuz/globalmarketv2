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

      const response = await fetch(`/api/admin/users?${params}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.users)
        setPagination(result.pagination)
      } else {
        throw new Error(result.error)
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

      const response = await fetch(`/api/admin/users?${params}`)
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
      }
    } catch (error) {
      console.error("Error exporting users:", error)
      toast.error("Eksport qilishda xatolik")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Foydalanuvchilar</h1>
          <p className="text-gray-600">Barcha foydalanuvchilarni boshqaring</p>
        </div>
        <Button onClick={exportUsers} variant="outline">
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
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Ism, email, telefon yoki username bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
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
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Yuklanmoqda...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Foydalanuvchilar topilmadi</p>
              </div>
            ) : (
              users.map((userData) => (
                <Card key={userData.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src="/placeholder-user.jpg" />
                          <AvatarFallback>
                            {userData.full_name?.charAt(0) || userData.email?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{userData.full_name || "Noma'lum"}</h3>
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
                          <p className="text-gray-600 mb-1">{userData.email}</p>
                          {userData.phone && <p className="text-gray-600 mb-1">{userData.phone}</p>}
                          {userData.company_name && <p className="text-blue-600 mb-1">{userData.company_name}</p>}
                          <p className="text-sm text-gray-500">Ro'yxatdan o'tgan: {formatDate(userData.created_at)}</p>
                          {userData.last_sign_in_at && (
                            <p className="text-sm text-gray-500">
                              Oxirgi kirish: {formatDate(userData.last_sign_in_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin-panel/user/${userData.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Ko'rish
                          </Button>
                        </Link>
                        {userData.phone && (
                          <Button size="sm" variant="outline" onClick={() => window.open(`tel:${userData.phone}`)}>
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
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                {pagination.total} tadan {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} ko'rsatilmoqda
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Oldingi
                </Button>
                <span className="text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
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
