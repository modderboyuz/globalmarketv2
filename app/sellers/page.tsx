"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Store, Award, MapPin, Phone, Package, Star, Filter, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Seller {
  id: string
  full_name: string
  company_name: string
  email: string
  phone: string
  address: string
  is_verified_seller: boolean
  created_at: string
  seller_rating: number
  total_products: number
  total_orders: number
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("rating")
  const [filterBy, setFilterBy] = useState("all")

  useEffect(() => {
    fetchSellers()
  }, [])

  useEffect(() => {
    filterAndSortSellers()
  }, [sellers, searchQuery, sortBy, filterBy])

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          company_name,
          email,
          phone,
          address,
          is_verified_seller,
          created_at
        `)
        .eq("is_verified_seller", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get additional seller stats
      const sellersWithStats = await Promise.all(
        (data || []).map(async (seller) => {
          // Get product count
          const { count: productCount } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("seller_id", seller.id)
            .eq("is_active", true)

          // Get order count
          const { count: orderCount } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("seller_id", seller.id)

          // Calculate average rating from products
          const { data: products } = await supabase
            .from("products")
            .select("average_rating")
            .eq("seller_id", seller.id)
            .eq("is_active", true)

          const avgRating =
            products && products.length > 0
              ? products.reduce((sum, p) => sum + (p.average_rating || 0), 0) / products.length
              : 0

          return {
            ...seller,
            total_products: productCount || 0,
            total_orders: orderCount || 0,
            seller_rating: avgRating,
          }
        }),
      )

      setSellers(sellersWithStats)
    } catch (error) {
      console.error("Error fetching sellers:", error)
      toast.error("Sotuvchilarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortSellers = () => {
    let filtered = [...sellers]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (seller) =>
          seller.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seller.address?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply category filter
    if (filterBy === "verified") {
      filtered = filtered.filter((seller) => seller.is_verified_seller)
    } else if (filterBy === "new") {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      filtered = filtered.filter((seller) => new Date(seller.created_at) > oneMonthAgo)
    } else if (filterBy === "active") {
      filtered = filtered.filter((seller) => seller.total_products > 0)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.seller_rating - a.seller_rating
        case "products":
          return b.total_products - a.total_products
        case "orders":
          return b.total_orders - a.total_orders
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "name":
          return (a.company_name || a.full_name || "").localeCompare(b.company_name || b.full_name || "")
        default:
          return 0
      }
    })

    setFilteredSellers(filtered)
  }

  const SellerCard = ({ seller }: { seller: Seller }) => (
    <Card className="card-beautiful card-hover group">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Seller Avatar */}
          <Avatar className="w-16 h-16">
            <AvatarImage src="/placeholder-user.jpg" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
              {seller.company_name?.charAt(0) || seller.full_name?.charAt(0) || "S"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            {/* Seller Info */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                  {seller.company_name || seller.full_name}
                </h3>
                {seller.is_verified_seller && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <Award className="h-3 w-3 mr-1" />
                    Tasdiqlangan
                  </Badge>
                )}
              </div>
              {seller.company_name && seller.full_name && <p className="text-gray-600 text-sm">{seller.full_name}</p>}
            </div>

            {/* Contact Info */}
            <div className="space-y-1 mb-4">
              {seller.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{seller.address}</span>
                </div>
              )}
              {seller.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{seller.phone}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{seller.seller_rating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-gray-500">Reyting</p>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600 mb-1">{seller.total_products}</div>
                <p className="text-xs text-gray-500">Mahsulotlar</p>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600 mb-1">{seller.total_orders}</div>
                <p className="text-xs text-gray-500">Buyurtmalar</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/seller/${seller.id}`} className="flex-1">
                <Button className="w-full btn-primary">
                  <Store className="h-4 w-4 mr-2" />
                  Do'konni ko'rish
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(`tel:${seller.phone}`)}
                disabled={!seller.phone}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Sotuvchilar</h1>
        <p className="text-gray-600">G'uzor tumanidagi ishonchli sotuvchilar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <Store className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{sellers.length}</div>
            <div className="text-sm text-gray-600">Jami sotuvchilar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{sellers.filter((s) => s.is_verified_seller).length}</div>
            <div className="text-sm text-gray-600">Tasdiqlangan</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{sellers.reduce((sum, s) => sum + s.total_products, 0)}</div>
            <div className="text-sm text-gray-600">Jami mahsulotlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{sellers.reduce((sum, s) => sum + s.total_orders, 0)}</div>
            <div className="text-sm text-gray-600">Jami buyurtmalar</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-beautiful mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Sotuvchi yoki kompaniya nomini qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter */}
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="verified">Tasdiqlangan</SelectItem>
                <SelectItem value="active">Faol sotuvchilar</SelectItem>
                <SelectItem value="new">Yangi sotuvchilar</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Saralash" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Reyting bo'yicha</SelectItem>
                <SelectItem value="products">Mahsulotlar soni</SelectItem>
                <SelectItem value="orders">Buyurtmalar soni</SelectItem>
                <SelectItem value="newest">Yangi qo'shilgan</SelectItem>
                <SelectItem value="name">Nom bo'yicha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sellers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="card-beautiful">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
            <Store className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Sotuvchilar topilmadi</h3>
          <p className="text-gray-600">Qidiruv shartlariga mos sotuvchilar yo'q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}

      {/* CTA Section */}
      <section className="py-16 mt-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-3xl">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Siz ham sotuvchi bo'ling!</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              G'uzor tumanidagi eng katta onlayn bozorda o'z mahsulotlaringizni soting
            </p>
            <Link href="/become-seller">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100 rounded-2xl px-8 py-3 text-lg font-semibold"
              >
                <Store className="h-5 w-5 mr-2" />
                Sotuvchi bo'lish
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
