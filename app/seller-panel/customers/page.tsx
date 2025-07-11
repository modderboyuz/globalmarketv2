"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Package,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Download,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Customer {
  id: string
  full_name: string
  phone: string
  email: string
  address: string
  total_orders: number
  total_spent: number
  last_order_date: string
  first_order_date: string
  status: string
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
}

export default function SellerCustomersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  })

  useEffect(() => {
    checkSellerAccess()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchQuery, statusFilter])

  const checkSellerAccess = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Sizda sotuvchi huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
      await fetchCustomersData(currentUser.id)
    } catch (error) {
      console.error("Error checking seller access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomersData = async (sellerId: string) => {
    try {
      // Fetch orders for this seller
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          products!inner (
            name,
            price,
            seller_id
          )
        `)
        .eq("products.seller_id", sellerId)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError
      setOrders(ordersData || [])

      // Process customer data from orders
      const customerMap = new Map<string, Customer>()

      ordersData?.forEach((order) => {
        const customerId = order.user_id || `anon_${order.phone}`
        const customerKey = customerId

        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            id: customerKey,
            full_name: order.full_name,
            phone: order.phone,
            email: order.email || "",
            address: order.address,
            total_orders: 0,
            total_spent: 0,
            last_order_date: order.created_at,
            first_order_date: order.created_at,
            status: "active",
          })
        }

        const customer = customerMap.get(customerKey)!
        customer.total_orders += 1
        customer.total_spent += order.total_amount

        // Update dates
        if (new Date(order.created_at) > new Date(customer.last_order_date)) {
          customer.last_order_date = order.created_at
        }
        if (new Date(order.created_at) < new Date(customer.first_order_date)) {
          customer.first_order_date = order.created_at
        }
      })

      const customersArray = Array.from(customerMap.values())
      setCustomers(customersArray)

      // Calculate stats
      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
      setStats({
        totalCustomers: customersArray.length,
        totalOrders: ordersData?.length || 0,
        totalRevenue,
        averageOrderValue: ordersData?.length ? totalRevenue / ordersData.length : 0,
      })
    } catch (error) {
      console.error("Error fetching customers data:", error)
      toast.error("Mijozlar ma'lumotlarini olishda xatolik")
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (customer) =>
          customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone?.includes(searchQuery) ||
          customer.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      if (statusFilter === "recent") {
        filtered = filtered.filter((customer) => new Date(customer.last_order_date) > thirtyDaysAgo)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((customer) => new Date(customer.last_order_date) <= thirtyDaysAgo)
      } else if (statusFilter === "vip") {
        filtered = filtered.filter((customer) => customer.total_spent > 500000) // 500k+ so'm
      }
    }

    setFilteredCustomers(filtered)
  }

  const exportCustomers = () => {
    const csvContent = [
      ["Ism", "Telefon", "Email", "Buyurtmalar soni", "Jami xarid", "Oxirgi buyurtma"].join(","),
      ...filteredCustomers.map((customer) =>
        [
          customer.full_name || "",
          customer.phone || "",
          customer.email || "",
          customer.total_orders,
          customer.total_spent,
          new Date(customer.last_order_date).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "customers.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getCustomerBadge = (customer: Customer) => {
    if (customer.total_spent > 1000000) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <TrendingUp className="h-3 w-3 mr-1" />
          VIP
        </Badge>
      )
    } else if (customer.total_spent > 500000) {
      return (
        <Badge variant="default">
          <Users className="h-3 w-3 mr-1" />
          Doimiy
        </Badge>
      )
    } else if (customer.total_orders === 1) {
      return (
        <Badge variant="secondary">
          <Package className="h-3 w-3 mr-1" />
          Yangi
        </Badge>
      )
    }
    return (
      <Badge variant="outline">
        <Users className="h-3 w-3 mr-1" />
        Oddiy
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Mijozlarim</h1>
        <p className="text-gray-600">Sizning mijozlaringiz va ularning buyurtmalari</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <div className="text-sm text-gray-600">Jami mijozlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-sm text-gray-600">Jami buyurtmalar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-lg font-bold">{formatPrice(stats.totalRevenue)}</div>
            <div className="text-sm text-gray-600">Jami daromad</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-lg font-bold">{formatPrice(stats.averageOrderValue)}</div>
            <div className="text-sm text-gray-600">O'rtacha buyurtma</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mijozlar ro'yxati
            </div>
            <Button onClick={exportCustomers} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="recent">So'nggi 30 kun</SelectItem>
                <SelectItem value="inactive">Faol emas</SelectItem>
                <SelectItem value="vip">VIP mijozlar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customers List */}
          <div className="space-y-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Mijozlar topilmadi</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src="/placeholder-user.jpg" />
                          <AvatarFallback>{customer.full_name?.charAt(0) || "M"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{customer.full_name}</h3>
                            {getCustomerBadge(customer)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-1">
                                <span>{customer.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-xs">{customer.address}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{customer.total_orders}</div>
                            <div className="text-xs text-gray-500">Buyurtmalar</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{formatPrice(customer.total_spent)}</div>
                            <div className="text-xs text-gray-500">Jami xarid</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-500">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Oxirgi: {formatDate(customer.last_order_date)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => window.open(`tel:${customer.phone}`)}>
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`sms:${customer.phone}`)}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
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
