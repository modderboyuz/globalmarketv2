"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Search, Eye, ShoppingCart, Package, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string
  username: string
  address: string
  avatar_url: string
  is_seller: boolean
  is_admin: boolean
  telegram_id: string
  created_at: string
  updated_at: string
  orders_count?: number
  total_spent?: number
  last_order_date?: string
}

export default function AdminCustomersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalSpent: 0,
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

      // Get additional stats for each customer
      const customersWithStats = await Promise.all(
        (data || []).map(async (customer) => {
          const [ordersResult] = await Promise.all([
            supabase
              .from("orders")
              .select("total_amount, created_at")
              .eq("user_id", customer.id)
              .eq("status", "completed"),
          ])

          const orders = ordersResult.data || []
          const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
          const lastOrderDate = orders.length > 0 ? orders[0].created_at : null

          return {
            ...customer,
            orders_count: orders.length,
            total_spent: totalSpent,
            last_order_date: lastOrderDate,
          }
        }),
      )

      setCustomers(customersWithStats)
      calculateStats(customersWithStats)
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast.error("Mijozlarni olishda xatolik")
    }
  }

  const calculateStats = (customersData: Customer[]) => {
    const stats = {
      total: customersData.length,
      active: customersData.filter((c) => c.orders_count && c.orders_count > 0).length,
      inactive: customersData.filter((c) => !c.orders_count || c.orders_count === 0).length,
      totalSpent: customersData.reduce((sum, c) => sum + (c.total_spent || 0), 0),
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
          customer.phone?.includes(searchQuery) ||
          customer.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredCustomers(filtered)
  }

  const exportCustomers = async () => {
    try {
      const csvContent = [
        [
          "ID",
          "Ism",
          "Email",
          "Telefon",
          "Buyurtmalar soni",
          "Jami xarajat",
          "Oxirgi buyurtma",
          "Ro'yxatdan o'tgan sana",
        ].join(","),
        ...filteredCustomers.map((customer) =>
          [
            customer.id,
            customer.full_name || "",
            customer.email || "",
            customer.phone || "",
            customer.orders_count || 0,
            customer.total_spent || 0,
            customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : "",
            new Date(customer.created_at).toLocaleDateString(),
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`
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
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Mijozlar</h1>
          <p className="text-gray-600 text-sm lg:text-base">Tizimda ro'yxatdan o'tgan mijozlar</p>
        </div>
        <Button onClick={exportCustomers} variant="outline" className="w-full sm:w-auto bg-transparent">
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
            <ShoppingCart className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.active}</div>
            <div className="text-xs lg:text-sm text-gray-600">Faol mijozlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <Package className="h-6 w-6 lg:h-8 lg:w-8 text-red-600 mx-auto mb-2" />
            <div className="text-lg lg:text-2xl font-bold">{stats.inactive}</div>
            <div className="text-xs lg:text-sm text-gray-600">Nofaol mijozlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-3 lg:p-6 text-center">
            <div className="text-lg lg:text-2xl font-bold text-green-600">{formatPrice(stats.totalSpent)}</div>
            <div className="text-xs lg:text-sm text-gray-600">Jami xarajat</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mijozlar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
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
          </div>

          {/* Customers List */}
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Mijozlar yo'q</h3>
              <p className="text-gray-600">Hozircha hech qanday mijoz topilmadi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="card-beautiful hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4 lg:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                      {/* Customer Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-4">
                          <img
                            src={customer.avatar_url || "/placeholder-user.jpg"}
                            alt={customer.full_name}
                            className="w-12 h-12 lg:w-16 lg:h-16 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-base lg:text-lg">
                                  {customer.full_name || "Noma'lum"}
                                </h3>
                                <p className="text-gray-600 text-sm">@{customer.username}</p>
                              </div>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600">
                              <p>📧 {customer.email}</p>
                              <p>📞 {customer.phone}</p>
                              {customer.address && <p>📍 {customer.address}</p>}
                              {customer.telegram_id && <p>💬 Telegram ID: {customer.telegram_id}</p>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div>
                        <h4 className="font-semibold mb-3">Statistika</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              Buyurtmalar:
                            </span>
                            <span className="font-medium">{customer.orders_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Jami xarajat:</span>
                            <span className="font-medium text-green-600">{formatPrice(customer.total_spent || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Oxirgi buyurtma:</span>
                            <span className="font-medium">
                              {customer.last_order_date ? formatDate(customer.last_order_date) : "Yo'q"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ro'yxatdan o'tgan:</span>
                            <span className="font-medium">{formatDate(customer.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setShowCustomerDialog(true)
                          }}
                          className="w-full btn-primary"
                        >
                          Batafsil ko'rish
                        </Button>

                        <Button asChild variant="outline" className="w-full bg-transparent">
                          <Link href={`/admin-panel/user/${customer.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Profil sahifasi
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.full_name || "Noma'lum mijoz"}</DialogTitle>
            <DialogDescription>Mijoz batafsil ma'lumotlari</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Profile */}
              <div className="flex items-start gap-4">
                <img
                  src={selectedCustomer.avatar_url || "/placeholder-user.jpg"}
                  alt={selectedCustomer.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{selectedCustomer.full_name || "Noma'lum"}</h3>
                  <p className="text-gray-600 mb-2">@{selectedCustomer.username}</p>
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        selectedCustomer.orders_count && selectedCustomer.orders_count > 0 ? "default" : "secondary"
                      }
                    >
                      {selectedCustomer.orders_count && selectedCustomer.orders_count > 0
                        ? "Faol mijoz"
                        : "Nofaol mijoz"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-semibold mb-3">Aloqa ma'lumotlari</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Telefon:</span>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>
                  {selectedCustomer.address && (
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Manzil:</span>
                      <p className="font-medium">{selectedCustomer.address}</p>
                    </div>
                  )}
                  {selectedCustomer.telegram_id && (
                    <div>
                      <span className="text-gray-600">Telegram ID:</span>
                      <p className="font-medium">{selectedCustomer.telegram_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="font-semibold mb-3">Statistika</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold">{selectedCustomer.orders_count || 0}</div>
                    <div className="text-xs text-gray-600">Buyurtmalar</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-green-600">{formatPrice(selectedCustomer.total_spent || 0)}</div>
                    <div className="text-xs text-gray-600">Jami xarajat</div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="font-semibold mb-3">Sanalar</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Ro'yxatdan o'tgan:</span>
                    <p className="font-medium">{formatDate(selectedCustomer.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Oxirgi buyurtma:</span>
                    <p className="font-medium">
                      {selectedCustomer.last_order_date
                        ? formatDate(selectedCustomer.last_order_date)
                        : "Hali buyurtma bermagan"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link href={`/admin-panel/user/${selectedCustomer.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Profil sahifasi
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
