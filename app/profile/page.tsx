"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Camera,
  Shield,
  Star,
  Package,
  MessageSquare,
  Settings,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string
  address: string
  avatar_url: string
  is_admin: boolean
  is_seller: boolean
  telegram_id: number
  created_at: string
}

interface UserStats {
  totalOrders: number
  completedOrders: number
  totalSpent: number
  favoriteBooks: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats>({
    totalOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
    favoriteBooks: 0,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      setUser(currentUser)
      await fetchProfile(currentUser.id)
      await fetchStats(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error && error.code === "PGRST116") {
        // User not found in users table, create one
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: userId,
            email: user?.email,
            full_name: user?.user_metadata?.full_name || "",
            phone: user?.user_metadata?.phone || "",
            address: user?.user_metadata?.address || "",
          })
          .select()
          .single()

        if (createError) throw createError
        setProfile(newUser)
      } else if (error) {
        throw error
      } else {
        setProfile(data)
      }

      setEditForm({
        full_name: data?.full_name || "",
        phone: data?.phone || "",
        address: data?.address || "",
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Profil ma'lumotlarini olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (userId: string) => {
    try {
      const { data: orders, error } = await supabase.from("orders").select("status, total_amount").eq("user_id", userId)

      if (error) throw error

      const totalOrders = orders?.length || 0
      const completedOrders = orders?.filter((o) => o.status === "completed").length || 0
      const totalSpent = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalOrders,
        completedOrders,
        totalSpent,
        favoriteBooks: 0, // TODO: Implement favorites
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          address: editForm.address,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        full_name: editForm.full_name,
        phone: editForm.phone,
        address: editForm.address,
      })

      setIsEditing(false)
      toast.success("Profil muvaffaqiyatli yangilandi!")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Profil yangilashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    })
    setIsEditing(false)
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
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <Card className="glass-effect border-0 soft-shadow p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Profil topilmadi</h2>
          <Button onClick={() => router.push("/")} className="btn-primary">
            Bosh sahifaga qaytish
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hero-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="glass-effect border-0 soft-shadow mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-white/20">
                    <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                      {profile.full_name?.charAt(0) || profile.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary hover:bg-primary/90"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    <h1 className="text-2xl font-bold">{profile.full_name || "Foydalanuvchi"}</h1>
                    <div className="flex gap-2 justify-center md:justify-start">
                      {profile.is_admin && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {profile.is_seller && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Star className="w-3 h-3 mr-1" />
                          Sotuvchi
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(profile.created_at)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
                      <div className="text-sm text-muted-foreground">Jami buyurtmalar</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
                      <div className="text-sm text-muted-foreground">Bajarilgan</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-2xl font-bold text-purple-600">{formatPrice(stats.totalSpent)}</div>
                      <div className="text-sm text-muted-foreground">Jami xarajat</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">{stats.favoriteBooks}</div>
                      <div className="text-sm text-muted-foreground">Sevimli kitoblar</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Tabs */}
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 glass-effect border-0">
              <TabsTrigger value="info">Ma'lumotlar</TabsTrigger>
              <TabsTrigger value="orders">Buyurtmalar</TabsTrigger>
              <TabsTrigger value="favorites">Sevimlilar</TabsTrigger>
              <TabsTrigger value="settings">Sozlamalar</TabsTrigger>
            </TabsList>

            {/* Personal Information */}
            <TabsContent value="info">
              <Card className="glass-effect border-0 soft-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Shaxsiy ma'lumotlar</CardTitle>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Tahrirlash
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm" disabled={saving} className="btn-primary">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Saqlanmoqda..." : "Saqlash"}
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Bekor qilish
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">To'liq ism</Label>
                      {isEditing ? (
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="full_name"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="pl-10 h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{profile.full_name || "Kiritilmagan"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.email}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon raqam</Label>
                      {isEditing ? (
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="pl-10 h-12 rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{profile.phone || "Kiritilmagan"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telegram_id">Telegram ID</Label>
                      <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.telegram_id || "Bog'lanmagan"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Manzil</Label>
                    {isEditing ? (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="pl-10 min-h-[80px] rounded-xl border-0 bg-white/50 backdrop-blur-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-3 bg-white/10 rounded-xl">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <span>{profile.address || "Kiritilmagan"}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card className="glass-effect border-0 soft-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Buyurtmalar tarixi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Buyurtmalar tarixi bu yerda ko'rsatiladi</p>
                    <Button onClick={() => router.push("/orders")} className="btn-primary">
                      Buyurtmalarni ko'rish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              <Card className="glass-effect border-0 soft-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Sevimli kitoblar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Sevimli kitoblaringiz bu yerda ko'rsatiladi</p>
                    <Button onClick={() => router.push("/")} className="btn-primary">
                      Kitoblarni ko'rish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="glass-effect border-0 soft-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Hisob sozlamalari
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                      <div>
                        <h3 className="font-medium">Email bildirishnomalar</h3>
                        <p className="text-sm text-muted-foreground">Buyurtma holati haqida email olish</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Yoqish
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                      <div>
                        <h3 className="font-medium">Telegram bildirishnomalar</h3>
                        <p className="text-sm text-muted-foreground">Telegram bot orqali xabar olish</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Bog'lash
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                      <div>
                        <h3 className="font-medium">Parolni o'zgartirish</h3>
                        <p className="text-sm text-muted-foreground">Hisob xavfsizligi uchun</p>
                      </div>
                      <Button variant="outline" size="sm">
                        O'zgartirish
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div>
                        <h3 className="font-medium text-red-800">Hisobni o'chirish</h3>
                        <p className="text-sm text-red-600">Bu amalni qaytarib bo'lmaydi</p>
                      </div>
                      <Button variant="destructive" size="sm">
                        O'chirish
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
