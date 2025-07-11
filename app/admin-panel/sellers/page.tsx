"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Users, Eye, Shield, Award, Phone, Mail, MapPin, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface Seller {
  id: string
  full_name: string
  email: string
  phone: string
  address: string
  company_name: string
  is_verified_seller: boolean
  is_admin: boolean
  profile_image_url: string
  created_at: string
  updated_at: string
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [sellerStats, setSellerStats] = useState<any>({})

  useEffect(() => {
    fetchSellers()
  }, [searchQuery, statusFilter])

  const fetchSellers = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from("users")
        .select("*")
        .eq("is_verified_seller", true)
        .order("created_at", { ascending: false })

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`,
        )
      }

      // Apply status filter
      if (statusFilter !== "all") {
        switch (statusFilter) {
          case "verified":
            query = query.eq("is_verified_seller", true)
            break
          case "admin":
            query = query.eq("is_admin", true)
            break
        }
      }

      const { data, error } = await query

      if (error) throw error
      setSellers(data || [])
    } catch (error) {
      console.error("Error fetching sellers:", error)
      toast.error("Sotuvchilarni olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchSellerStats = async (sellerId: string) => {
    try {
      const [productsResult, ordersResult] = await Promise.all([
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", sellerId)
          .eq("is_active", true),
        supabase.from("orders").select("total_amount").eq("seller_id", sellerId).eq("status", "completed"),
      ])

      const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      return {
        totalProducts: productsResult.count || 0,
        totalOrders: ordersResult.data?.length || 0,
        totalRevenue,
      }
    } catch (error) {
      console.error("Error fetching seller stats:", error)
      return { totalProducts: 0, totalOrders: 0, totalRevenue: 0 }
    }
  }

  const handleVerificationToggle = async (sellerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("users").update({ is_verified_seller: !currentStatus }).eq("id", sellerId)

      if (error) throw error

      toast.success("Sotuvchi holati yangilandi")
      fetchSellers()
    } catch (error) {
      console.error("Error updating seller:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleAdminToggle = async (sellerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("users").update({ is_admin: !currentStatus }).eq("id", sellerId)

      if (error) throw error

      toast.success("Admin huquqi yangilandi")
      fetchSellers()
    } catch (error) {
      console.error("Error updating admin status:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const exportSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("is_verified_seller", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Convert to CSV
      const csvContent = [
        ["ID", "Ism", "Email", "Telefon", "Kompaniya", "Holat", "Ro'yxatdan o'tgan"].join(","),
        ...data.map((seller) =>
          [
            seller.id,
            `"${seller.full_name}"`,
            seller.email,
            seller.phone || "",
            `"${seller.company_name || ""}"`,
            seller.is_verified_seller ? "Tasdiqlangan" : "Tasdiqlanmagan",
            new Date(seller.created_at).toLocaleDateString("uz-UZ"),
          ].join(","),
        ),
      ].join("\n")

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sellers-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Sotuvchilar eksport qilindi")
    } catch (error) {
      console.error("Error exporting sellers:", error)
      toast.error("Eksport qilishda xatolik")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ")
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sotuvchilar boshqaruvi</h1>
          <p className="text-gray-600">Barcha sotuvchilarni boshqaring</p>
        </div>
        <Button onClick={exportSellers} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Eksport
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Jami sotuvchilar</p>
                <p className="text-xl font-bold">{sellers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tasdiqlangan</p>
                <p className="text-xl font-bold">{sellers.filter((s) => s.is_verified_seller).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Adminlar</p>
                <p className="text-xl font-bold">{sellers.filter((s) => s.is_admin).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Sotuvchi qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Holat bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha sotuvchilar</SelectItem>
                <SelectItem value="verified">Tasdiqlangan</SelectItem>
                <SelectItem value="admin">Adminlar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sellers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sotuvchilar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Yuklanmoqda...</p>
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Sotuvchilar topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sotuvchi</TableHead>
                    <TableHead>Aloqa</TableHead>
                    <TableHead>Kompaniya</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Ro'yxatdan o'tgan</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={seller.profile_image_url || "/placeholder.svg"} />
                            <AvatarFallback>{seller.full_name?.charAt(0) || seller.email?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{seller.full_name}</p>
                            <p className="text-sm text-gray-500">{seller.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {seller.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {seller.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {seller.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{seller.company_name || "Kiritilmagan"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={seller.is_verified_seller ? "default" : "secondary"}>
                            {seller.is_verified_seller ? "Tasdiqlangan" : "Tasdiqlanmagan"}
                          </Badge>
                          {seller.is_admin && (
                            <Badge variant="destructive" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(seller.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              setSelectedSeller(seller)
                              const stats = await fetchSellerStats(seller.id)
                              setSellerStats(stats)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={seller.is_verified_seller ? "destructive" : "default"}
                            onClick={() => handleVerificationToggle(seller.id, seller.is_verified_seller)}
                          >
                            {seller.is_verified_seller ? "Bekor qilish" : "Tasdiqlash"}
                          </Button>
                          <Button
                            size="sm"
                            variant={seller.is_admin ? "destructive" : "outline"}
                            onClick={() => handleAdminToggle(seller.id, seller.is_admin)}
                          >
                            {seller.is_admin ? "Admin emas" : "Admin qilish"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sotuvchi tafsilotlari</DialogTitle>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-6">
              {/* Seller Info */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedSeller.profile_image_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-xl">
                    {selectedSeller.full_name?.charAt(0) || selectedSeller.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedSeller.full_name}</h3>
                  <p className="text-gray-600">{selectedSeller.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={selectedSeller.is_verified_seller ? "default" : "secondary"}>
                      {selectedSeller.is_verified_seller ? "Tasdiqlangan" : "Tasdiqlanmagan"}
                    </Badge>
                    {selectedSeller.is_admin && <Badge variant="destructive">Admin</Badge>}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-semibold mb-3">Aloqa ma'lumotlari</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{selectedSeller.email}</span>
                  </div>
                  {selectedSeller.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{selectedSeller.phone}</span>
                    </div>
                  )}
                  {selectedSeller.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                      <span>{selectedSeller.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              {selectedSeller.company_name && (
                <div>
                  <h4 className="font-semibold mb-3">Kompaniya ma'lumotlari</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{selectedSeller.company_name}</p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div>
                <h4 className="font-semibold mb-3">Statistika</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{sellerStats.totalProducts}</div>
                    <div className="text-sm text-gray-600">Mahsulotlar</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{sellerStats.totalOrders}</div>
                    <div className="text-sm text-gray-600">Buyurtmalar</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{formatPrice(sellerStats.totalRevenue)}</div>
                    <div className="text-sm text-gray-600">Daromad</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleVerificationToggle(selectedSeller.id, selectedSeller.is_verified_seller)}
                  variant={selectedSeller.is_verified_seller ? "destructive" : "default"}
                >
                  {selectedSeller.is_verified_seller ? "Tasdiqni bekor qilish" : "Tasdiqlash"}
                </Button>
                <Button
                  onClick={() => handleAdminToggle(selectedSeller.id, selectedSeller.is_admin)}
                  variant={selectedSeller.is_admin ? "destructive" : "outline"}
                >
                  {selectedSeller.is_admin ? "Admin huquqini olib tashlash" : "Admin qilish"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/seller/${selectedSeller.id}`}>Profilni ko'rish</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
