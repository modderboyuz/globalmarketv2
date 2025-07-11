"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Settings, User, Phone, Mail, MapPin, Building, Camera, Save, RefreshCw, Shield, Award } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function SellerSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    full_name: "",
    company_name: "",
    phone: "",
    email: "",
    address: "",
    profile_image_url: "",
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

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Sotuvchi hisobiga kirish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(userData)
      setFormData({
        full_name: userData.full_name || "",
        company_name: userData.company_name || "",
        phone: userData.phone || "",
        email: userData.email || "",
        address: userData.address || "",
        profile_image_url: userData.profile_image_url || "",
      })
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5MB dan kichik bo'lishi kerak")
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath)

      setFormData({ ...formData, profile_image_url: publicUrl })
      toast.success("Rasm muvaffaqiyatli yuklandi")
    } catch (error: any) {
      console.error("Image upload error:", error)
      toast.error("Rasm yuklashda xatolik: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.full_name || !formData.phone) {
      toast.error("Ism va telefon raqam majburiy")
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
          phone: formData.phone,
          address: formData.address,
          profile_image_url: formData.profile_image_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast.success("Ma'lumotlar muvaffaqiyatli saqlandi")

      // Update user state
      setUser({ ...user, ...formData })
    } catch (error: any) {
      console.error("Save error:", error)
      toast.error("Saqlashda xatolik: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">Sozlamalar</h1>
            <p className="text-gray-600 text-lg">Profil ma'lumotlarini boshqaring</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Image */}
        <div className="lg:col-span-1">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Profil rasmi
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="relative w-32 h-32 mx-auto">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
                  {formData.profile_image_url ? (
                    <Image
                      src={formData.profile_image_url || "/placeholder.svg"}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                      <User className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0">
                  <label htmlFor="profile-image" className="cursor-pointer">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-blue-700 transition-colors">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  </label>
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </div>

              {uploading && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Yuklanmoqda...</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Sotuvchi
                  </Badge>
                  {user?.is_verified_seller && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      <Award className="h-3 w-3 mr-1" />
                      Tasdiqlangan
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Maksimal hajm: 5MB
                  <br />
                  Format: JPG, PNG, GIF
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card className="card-beautiful">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Shaxsiy ma'lumotlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">To'liq ism *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="full_name"
                        placeholder="Ism Familiya"
                        className="input-beautiful pl-10"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_name">Kompaniya nomi</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="company_name"
                        placeholder="Kompaniya nomi"
                        className="input-beautiful pl-10"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon raqam *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        placeholder="+998 90 123 45 67"
                        className="input-beautiful pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        className="input-beautiful pl-10"
                        value={formData.email}
                        disabled
                      />
                    </div>
                    <p className="text-xs text-gray-500">Email manzilini o'zgartirib bo'lmaydi</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Manzil</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="address"
                      placeholder="To'liq manzil: shahar, tuman, ko'cha, uy raqami"
                      className="input-beautiful pl-10 min-h-[100px]"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="h-4 w-4" />
                    <span>Ma'lumotlaringiz xavfsiz saqlanadi</span>
                  </div>

                  <Button type="submit" className="btn-primary px-8" disabled={saving}>
                    {saving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saqlanmoqda...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Saqlash
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
