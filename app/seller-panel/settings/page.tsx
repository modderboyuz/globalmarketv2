"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Settings,
  User,
  Store,
  Bell,
  Shield,
  Phone,
  Mail,
  MapPin,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface SellerProfile {
  id: string
  full_name: string
  email: string
  phone: string
  company_name: string
  company_description: string
  address: string
  is_verified_seller: boolean
  seller_rating: number
  total_sales: number
  notification_preferences: {
    email_notifications: boolean
    sms_notifications: boolean
    push_notifications: boolean
    order_notifications: boolean
    review_notifications: boolean
  }
}

export default function SellerSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company_name: "",
    company_description: "",
    address: "",
    notification_preferences: {
      email_notifications: true,
      sms_notifications: true,
      push_notifications: true,
      order_notifications: true,
      review_notifications: true,
    },
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
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
      setFormData({
        full_name: userData.full_name || "",
        phone: userData.phone || "",
        company_name: userData.company_name || "",
        company_description: userData.company_description || "",
        address: userData.address || "",
        notification_preferences: userData.notification_preferences || {
          email_notifications: true,
          sms_notifications: true,
          push_notifications: true,
          order_notifications: true,
          review_notifications: true,
        },
      })
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNotificationChange = (field: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [field]: value,
      },
    }))
  }

  const saveSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          company_name: formData.company_name,
          company_description: formData.company_description,
          address: formData.address,
          notification_preferences: formData.notification_preferences,
        })
        .eq("id", user.id)

      if (error) throw error

      toast.success("Sozlamalar saqlandi")
      await checkUser() // Refresh user data
    } catch (error: any) {
      toast.error("Sozlamalarni saqlashda xatolik: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    if (!user) return

    try {
      // First, deactivate all products
      await supabase.from("products").update({ is_active: false }).eq("seller_id", user.id)

      // Then mark user as inactive
      await supabase.from("users").update({ is_verified_seller: false }).eq("id", user.id)

      toast.success("Hisob o'chirildi")
      router.push("/")
    } catch (error: any) {
      toast.error("Hisobni o'chirishda xatolik: " + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Sozlamalar yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Xatolik</h3>
        <p className="text-gray-600">Foydalanuvchi ma'lumotlari topilmadi</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Sozlamalar
          </h1>
          <p className="text-gray-600">Hisobingiz va sotuvchi profilingizni boshqaring</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Saqlash
            </>
          )}
        </Button>
      </div>

      {/* Account Status */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Hisob holati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Tasdiqlangan sotuvchi</p>
                <p className="text-sm text-gray-600">Sizning sotuvchi hisobingiz tasdiqlangan</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">Faol</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{user.seller_rating?.toFixed(1) || "0.0"}</p>
              <p className="text-sm text-gray-600">Sotuvchi reytingi</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{user.total_sales || 0}</p>
              <p className="text-sm text-gray-600">Jami sotuvlar</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{new Date(user.id).toLocaleDateString("uz-UZ")}</p>
              <p className="text-sm text-gray-600">Ro'yxatdan o'tgan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Shaxsiy ma'lumotlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">To'liq ism</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                placeholder="Ismingizni kiriting"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon raqam</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="email"
                value={user.email}
                disabled
                className="pl-10 bg-gray-50"
                placeholder="Email o'zgartirib bo'lmaydi"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Manzil</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="To'liq manzilingizni kiriting"
                className="pl-10"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Kompaniya ma'lumotlari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company_name">Kompaniya nomi</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => handleInputChange("company_name", e.target.value)}
              placeholder="Kompaniya nomini kiriting"
            />
          </div>

          <div>
            <Label htmlFor="company_description">Kompaniya haqida</Label>
            <Textarea
              id="company_description"
              value={formData.company_description}
              onChange={(e) => handleInputChange("company_description", e.target.value)}
              placeholder="Kompaniyangiz haqida qisqacha ma'lumot"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirishnoma sozlamalari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email bildirishnomalar</p>
                <p className="text-sm text-gray-600">Email orqali bildirishnoma olish</p>
              </div>
              <Switch
                checked={formData.notification_preferences.email_notifications}
                onCheckedChange={(checked) => handleNotificationChange("email_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SMS bildirishnomalar</p>
                <p className="text-sm text-gray-600">SMS orqali bildirishnoma olish</p>
              </div>
              <Switch
                checked={formData.notification_preferences.sms_notifications}
                onCheckedChange={(checked) => handleNotificationChange("sms_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push bildirishnomalar</p>
                <p className="text-sm text-gray-600">Brauzer orqali bildirishnoma olish</p>
              </div>
              <Switch
                checked={formData.notification_preferences.push_notifications}
                onCheckedChange={(checked) => handleNotificationChange("push_notifications", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Buyurtma bildirishnomalari</p>
                <p className="text-sm text-gray-600">Yangi buyurtmalar haqida xabar olish</p>
              </div>
              <Switch
                checked={formData.notification_preferences.order_notifications}
                onCheckedChange={(checked) => handleNotificationChange("order_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sharh bildirishnomalari</p>
                <p className="text-sm text-gray-600">Yangi sharhlar haqida xabar olish</p>
              </div>
              <Switch
                checked={formData.notification_preferences.review_notifications}
                onCheckedChange={(checked) => handleNotificationChange("review_notifications", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Xavfli zona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Hisobni o'chirish</h4>
            <p className="text-sm text-red-700 mb-4">
              Hisobingizni o'chirsangiz, barcha mahsulotlaringiz nofaol bo'ladi va sotuvchi huquqingiz bekor qilinadi.
              Bu amalni bekor qilib bo'lmaydi.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Hisobni o'chirish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Hisobni o'chirish</DialogTitle>
            <DialogDescription>
              Haqiqatan ham hisobingizni o'chirmoqchimisiz? Bu amal qaytarib bo'lmaydi va barcha ma'lumotlaringiz
              yo'qoladi.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Quyidagilar sodir bo'ladi:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Barcha mahsulotlaringiz nofaol bo'ladi</li>
              <li>• Sotuvchi huquqingiz bekor qilinadi</li>
              <li>• Profil ma'lumotlaringiz o'chiriladi</li>
              <li>• Bu amalni bekor qilib bo'lmaydi</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={deleteAccount}>
              Ha, hisobni o'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
