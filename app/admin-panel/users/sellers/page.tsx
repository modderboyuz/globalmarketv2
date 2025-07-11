"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Search, Eye, UserCheck, UserX, Store, Package, ShoppingCart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Seller {
  id: string
  full_name: string
  email: string
  phone: string
  username: string
  company_name: string
  address: string
  avatar_url: string
  is_seller: boolean
  is_verified_seller: boolean
  is_admin: boolean
  telegram_id: string
  created_at: string
  updated_at: string
  products_count?: number
  orders_count?: number
  total_sales?: number
}

export default function AdminSellersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [showSellerDialog, setShowSellerDialog] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    unverified: 0,
    active: 0,
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    filterSellers()
  }, [sellers, searchQuery])

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
      await fetchSellers()
    } catch (error) {
      console.error("Error checking admin access:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("is_seller", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get additional stats for each seller
      const sellersWithStats = await Promise.all(
        (data || []).map(async (seller) => {
          const [productsResult, ordersResult] = await Promise.all([
            supabase.from("products").select("id", { count: "exact" }).eq("seller_id", seller.id),
            supabase
              .from("orders")
              .select("total_amount", { count: "exact" })
              .eq("products.seller_id", seller.id)
              .eq("status", "completed"),
          ])

          return {
            ...seller,
            products_count: productsResult.count || 0,
            orders_count: ordersResult.count || 0,
            total_sales: ordersResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
          }
        }),
      )

      setSellers(sellersWithStats)
      calculateStats(sellersWithStats)
    } catch (error) {
      console.error("Error fetching sellers:", error)
      toast.error("Sotuvchilarni olishda xatolik")
    }
  }

  const calculateStats = (sellersData: Seller[]) => {
    const stats = {
      total: sellersData.length,
      verified: sellersData.filter((s) => s.is_verified_seller).length,
      unverified: sellersData.filter((s) => !s.is_verified_seller).length,
      active: sellersData.filter((s) => s.products_count && s.products_count > 0).length,
    }
    setStats(stats)
  }

  const filterSellers = () => {
    let filtered = sellers

    if (searchQuery) {
      filtered = filtered.filter(
        (seller) =>
          seller.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.phone?.includes(searchQuery) ||
          seller.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredSellers(filtered)
  }

  const toggleSellerVerification = async (sellerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          is_verified_seller: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sellerId)

      if (error) throw error

      setSellers(sellers.map((s) => (s.id === sellerId ? { ...s, is_verified_seller: !currentStatus } : s)))
      toast.success(`Sotuvchi ${!currentStatus ? "tasdiqlandi" : "tasdiq bekor qilindi"}`)
    } catch (error) {
      console.error("Error toggling seller verification:", error)
      toast.error("Sotuvchi tasdiqini o'zgartirishda xatolik")
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
      <div>
        <h1 className="text-3xl font-bold gradient-text">Sotuvchilar</h1>
        <p className="text-gray-600">Tizimda ro'yxatdan o'tgan sotuvchilar</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Jami sotuvchilar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.verified}</div>
            <div className="text-sm text-gray-600">Tasdiqlangan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <UserX className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.unverified}</div>
            <div className="text-sm text-gray-600">Tasdiqlanmagan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-6 text-center">
            <Store className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-gray-600">Faol sotuvchilar</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sotuvchilar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Sotuvchi qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Sellers List */}
          {filteredSellers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sotuvchilar yo'q</h3>
              <p className="text-gray-600">Hozircha hech qanday sotuvchi topilmadi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSellers.map((seller) => (
                <Card key={seller.id} className="card-beautiful hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Seller Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-4">
                          <img
                            src={seller.avatar_url || "/placeholder-user.jpg"}
                            alt={seller.full_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{seller.company_name || seller.full_name}</h3>
                                {seller.company_name && <p className="text-gray-600 text-sm">{seller.full_name}</p>}
                                <p className="text-gray-600 text-sm">@{seller.username}</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Badge variant={seller.is_verified_seller ? "default" : "destructive"}>
                                  {seller.is_verified_seller ? "Tasdiqlangan" : "Tasdiqlanmagan"}
                                </Badge>
                                {seller.is_admin && <Badge variant="secondary">Admin</Badge>}
                              </div>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600">
                              <p>📧 {seller.email}</p>
                              <p>📞 {seller.phone}</p>
                              {seller.address && <p>📍 {seller.address}</p>}
                              {seller.telegram_id && <p>💬 Telegram ID: {seller.telegram_id}</p>}
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
                              <Package className="h-3 w-3" />
                              Mahsulotlar:
                            </span>
                            <span className="font-medium">{seller.products_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              Buyurtmalar:
                            </span>
                            <span className="font-medium">{seller.orders_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Jami sotuv:</span>
                            <span className="font-medium text-green-600">{formatPrice(seller.total_sales || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ro'yxatdan o'tgan:</span>
                            <span className="font-medium">{formatDate(seller.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button
                          onClick={() => {
                            setSelectedSeller(seller)
                            setShowSellerDialog(true)
                          }}
                          className="w-full btn-primary"
                        >
                          Batafsil ko'rish
                        </Button>

                        <Button asChild variant="outline" className="w-full bg-transparent">
                          <Link href={`/seller/${seller.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Sahifani ko'rish
                          </Link>
                        </Button>

                        <Button
                          onClick={() => toggleSellerVerification(seller.id, seller.is_verified_seller)}
                          variant={seller.is_verified_seller ? "destructive" : "default"}
                          className="w-full"
                        >
                          {seller.is_verified_seller ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Tasdiqni bekor qilish
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Tasdiqlash
                            </>
                          )}
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

      {/* Seller Detail Dialog */}
      <Dialog open={showSellerDialog} onOpenChange={setShowSellerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedSeller?.company_name || selectedSeller?.full_name}</DialogTitle>
            <DialogDescription>Sotuvchi batafsil ma'lumotlari</DialogDescription>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-6">
              {/* Profile */}
              <div className="flex items-start gap-4">
                <img
                  src={selectedSeller.avatar_url || "/placeholder-user.jpg"}
                  alt={selectedSeller.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{selectedSeller.company_name || selectedSeller.full_name}</h3>
                  {selectedSeller.company_name && (
                    <p className="text-gray-600 mb-1">Rahbar: {selectedSeller.full_name}</p>
                  )}
                  <p className="text-gray-600 mb-2">@{selectedSeller.username}</p>
                  <div className="flex gap-2">
                    <Badge variant={selectedSeller.is_verified_seller ? "default" : "destructive"}>
                      {selectedSeller.is_verified_seller ? "Tasdiqlangan" : "Tasdiqlanmagan"}
                    </Badge>
                    {selectedSeller.is_admin && <Badge variant="secondary">Admin</Badge>}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-semibold mb-3">Aloqa ma'lumotlari</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedSeller.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Telefon:</span>
                    <p className="font-medium">{selectedSeller.phone}</p>
                  </div>
                  {selectedSeller.address && (
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Manzil:</span>
                      <p className="font-medium">{selectedSeller.address}</p>
                    </div>
                  )}
                  {selectedSeller.telegram_id && (
                    <div>
                      <span className="text-gray-600">Telegram ID:</span>
                      <p className="font-medium">{selectedSeller.telegram_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="font-semibold mb-3">Statistika</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold">{selectedSeller.products_count || 0}</div>
                    <div className="text-xs text-gray-600">Mahsulotlar</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="font-semibold">{selectedSeller.orders_count || 0}</div>
                    <div className="text-xs text-gray-600">Buyurtmalar</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-green-600">{formatPrice(selectedSeller.total_sales || 0)}</div>
                    <div className="text-xs text-gray-600">Jami sotuv</div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="font-semibold mb-3">Sanalar</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Ro'yxatdan o'tgan:</span>
                    <p className="font-medium">{formatDate(selectedSeller.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Oxirgi yangilanish:</span>
                    <p className="font-medium">{formatDate(selectedSeller.updated_at)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link href={`/seller/${selectedSeller.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Sahifani ko'rish
                  </Link>
                </Button>
                <Button
                  onClick={() => toggleSellerVerification(selectedSeller.id, selectedSeller.is_verified_seller)}
                  variant={selectedSeller.is_verified_seller ? "destructive" : "default"}
                  className="flex-1"
                >
                  {selectedSeller.is_verified_seller ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Tasdiqni bekor qilish
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Tasdiqlash
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
