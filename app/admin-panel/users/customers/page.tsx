"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Users, Search, MoreHorizontal, Eye, UserCheck, UserX, Download, Mail, Phone, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string
  username: string
  avatar_url: string
  is_active: boolean
  is_seller: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
  last_login: string
}

interface CustomerStats {
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
}

export default function AdminCustomersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchQuery])

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
      await fetchCustomers()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("is_seller", false)
        .eq("is_admin", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      setCustomers(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast.error("Mijozlarni olishda xatolik")
    }
  }

  const calculateStats = (customersData: Customer[]) => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const stats = {
      total: customersData.length,
      active: customersData.filter((c) => c.is_active).length,
      inactive: customersData.filter((c) => !c.is_active).length,
      newThisMonth: customersData.filter((c) => new Date(c.created_at) >= thisMonth).length,
    }
    setStats(stats)
  }

  const filterCustomers = () => {
    let filtered = customers

    if (searchQuery) {
      filtered = filtered.filter(
        (customer) =>
          customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.username?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredCustomers(filtered)
  }

  const fetchCustomerStats = async (customerId: string) => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("user_id", customerId)

      if (error) throw error

      const totalOrders = orders?.length || 0
      const totalSpent = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const lastOrderDate = orders?.[0]?.created_at || ""

      setCustomerStats({
        totalOrders,
        totalSpent,
        lastOrderDate,
      })
    } catch (error) {
      console.error("Error fetching customer stats:", error)
      setCustomerStats({
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: "",
      })
    }
  }

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailsDialog(true)
    await fetchCustomerStats(customer.id)
  }

  const handleToggleStatus = async (customerId: string, currentStatus: boolean) => {
    setUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId)

      if (error) throw error

      toast.success(currentStatus ? "Mijoz bloklandi" : "Mijoz faollashtirildi")
      await fetchCustomers()
    } catch (error) {
      console.error("Error updating customer status:", error)
      toast.error("Mijoz holatini o'zgartirishda xatolik")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const exportCustomers = async () => {
    try {
      const csvContent = [
        ["ID", "To'liq ism", "Email", "Telefon", "Username", "Holat", "Ro'yxatdan o'tgan sana", "Oxirgi kirish"].join(
          ",",
        ),
        ...filteredCustomers.map((customer) =>
          [
            customer.id.slice(-8),
            customer.full_name || "",
            customer.email || "",
            customer.phone || "",
            customer.username || "",
            customer.is_active ? "Faol" : "Nofaol",
            new Date(customer.created_at).toLocaleDateString(),
            customer.last_login ? new Date(customer.last_login).toLocaleDateString() : "Hech qachon",
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mijozlar-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Mijozlar ro'yxati eksport qilindi")
    } catch (error) {
      console.error("Error exporting customers:", error)
      toast.error("Eksport qilishda xatolik")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Ma'lumot yo'q"
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?"
    )
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
              <div key={i} className="h-20 bg-gray-200 rounded-2xl"></div>
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
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Mijozlar</h1>
          <p className="text-gray-600">Tizimda ro'yxatdan o'tgan mijozlar</p>
        </div>
        <Button onClick={exportCustomers} variant="outline" className="bg-transparent">
          <Download className="h-4 w-4 mr-2" />
          Excel yuklab olish
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <Users className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.total}</div>
            <div className="text-xs lg:text-sm text-gray-600">Jami mijozlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <div className="text-lg lg:text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-xs lg:text-sm text-gray-600">Faol mijozlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <div className="text-lg lg:text-2xl font-bold text-red-600">{stats.inactive}</div>
            <div className="text-xs lg:text-sm text-gray-600">Bloklangan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <div className="text-lg lg:text-2xl font-bold text-purple-600">{stats.newThisMonth}</div>
            <div className="text-xs lg:text-sm text-gray-600">Bu oy yangi</div>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mijozlar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Mijoz qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Customers Table */}
          <div className="space-y-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Mijozlar yo'q</h3>
                <p className="text-gray-600">Hozircha hech qanday mijoz topilmadi</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={customer.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(customer.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{customer.full_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(customer.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={customer.is_active ? "default" : "secondary"}>
                          {customer.is_active ? "Faol" : "Bloklangan"}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Batafsil ko'rish
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(customer.id, customer.is_active)}
                              disabled={updatingStatus}
                            >
                              {customer.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Bloklash
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Faollashtirish
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mijoz ma'lumotlari</DialogTitle>
            <DialogDescription>{selectedCustomer?.full_name} haqida batafsil ma'lumot</DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCustomer.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{getInitials(selectedCustomer.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.full_name}</h3>
                  <p className="text-gray-600">@{selectedCustomer.username}</p>
                  <Badge variant={selectedCustomer.is_active ? "default" : "secondary"}>
                    {selectedCustomer.is_active ? "Faol" : "Bloklangan"}
                  </Badge>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Aloqa ma'lumotlari</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Tizim ma'lumotlari</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Ro'yxatdan o'tgan: {formatDate(selectedCustomer.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Oxirgi kirish: {formatDate(selectedCustomer.last_login)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Stats */}
              {customerStats && (
                <div>
                  <h4 className="font-semibold mb-3">Buyurtma statistikasi</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{customerStats.totalOrders}</div>
                      <div className="text-sm text-gray-600">Jami buyurtmalar</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{formatPrice(customerStats.totalSpent)}</div>
                      <div className="text-sm text-gray-600">Jami xarajat</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm font-bold text-purple-600">
                        {customerStats.lastOrderDate ? formatDate(customerStats.lastOrderDate) : "Hech qachon"}
                      </div>
                      <div className="text-sm text-gray-600">Oxirgi buyurtma</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Yopish
            </Button>
            {selectedCustomer && (
              <Button
                onClick={() => handleToggleStatus(selectedCustomer.id, selectedCustomer.is_active)}
                disabled={updatingStatus}
                variant={selectedCustomer.is_active ? "destructive" : "default"}
              >
                {selectedCustomer.is_active ? "Bloklash" : "Faollashtirish"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
