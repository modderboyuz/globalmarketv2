"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Store, CheckCircle, Clock, XCircle, Send, Star, Award, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface SellerApplication {
  id: string
  full_name: string
  phone: string
  email: string
  company_name: string
  business_type: string
  experience_years: number
  description: string
  status: string
  created_at: string
  admin_notes: string
}

export default function BecomeSellerPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [isAlreadySeller, setIsAlreadySeller] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    companyName: "",
    businessType: "",
    experienceYears: "",
    description: "",
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

      setUser(currentUser)

      // Pre-fill form with user data
      setFormData({
        fullName: currentUser.user_metadata?.full_name || "",
        phone: currentUser.user_metadata?.phone || "",
        email: currentUser.email || "",
        companyName: "",
        businessType: "",
        experienceYears: "",
        description: "",
      })

      // Check if user is already a seller
      const { data: userData } = await supabase
        .from("users")
        .select("is_verified_seller")
        .eq("id", currentUser.id)
        .single()

      if (userData?.is_verified_seller) {
        setIsAlreadySeller(true)
      }

      // Fetch user's applications
      await fetchApplications(currentUser.id)
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("seller_applications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error("Error fetching applications:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Iltimos, avval tizimga kiring")
      return
    }

    if (!formData.fullName || !formData.phone || !formData.companyName || !formData.businessType) {
      toast.error("Barcha majburiy maydonlarni to'ldiring")
      return
    }

    setSubmitting(true)

    try {
      const applicationData = {
        user_id: user.id,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        company_name: formData.companyName,
        business_type: formData.businessType,
        experience_years: Number.parseInt(formData.experienceYears) || 0,
        description: formData.description,
        status: "pending",
      }

      const { data, error } = await supabase.from("seller_applications").insert(applicationData).select().single()

      if (error) throw error

      toast.success("Ariza muvaffaqiyatli yuborildi! Tez orada sizga javob beramiz.")

      // Notify admins via Telegram
      try {
        await fetch("/api/webhook/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "seller_application",
            application_id: data.id,
          }),
        })
      } catch (notifyError) {
        console.error("Error notifying admins:", notifyError)
      }

      // Refresh applications
      await fetchApplications(user.id)

      // Reset form
      setFormData({
        ...formData,
        companyName: "",
        businessType: "",
        experienceYears: "",
        description: "",
      })
    } catch (error: any) {
      console.error("Error submitting application:", error)
      toast.error(error.message || "Ariza yuborishda xatolik")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Kutilmoqda
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Tasdiqlangan
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rad etilgan
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
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
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl md:text-4xl font-bold gradient-text mb-4 flex items-center justify-center gap-3">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                <Store className="h-4 w-4 md:h-6 md:w-6 text-white" />
              </div>
              Sotuvchi bo'lish
            </h1>
            <p className="text-gray-600 text-sm md:text-lg max-w-2xl mx-auto">
              GlobalMarket platformasida o'z mahsulotlaringizni sotish uchun ariza qoldiring. Bizning jamoamiz sizning
              arizangizni ko'rib chiqadi va javob beradi.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <Card className="card-beautiful text-center">
              <CardContent className="p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Keng auditoriya</h3>
                <p className="text-gray-600 text-sm">Minglab mijozlarga mahsulotlaringizni taqdim eting</p>
              </CardContent>
            </Card>

            <Card className="card-beautiful text-center">
              <CardContent className="p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Ishonchli platforma</h3>
                <p className="text-gray-600 text-sm">Xavfsiz to'lovlar va ishonchli yetkazib berish</p>
              </CardContent>
            </Card>

            <Card className="card-beautiful text-center">
              <CardContent className="p-4 md:p-6">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Marketing yordami</h3>
                <p className="text-gray-600 text-sm">Mahsulotlaringizni reklama qilishda yordam</p>
              </CardContent>
            </Card>
          </div>

          {isAlreadySeller ? (
            <Card className="card-beautiful text-center">
              <CardContent className="p-6 md:p-8">
                <div className="w-16 h-16 md:w-24 md:h-24 mx-auto bg-gradient-to-br from-green-500 to-teal-600 rounded-3xl flex items-center justify-center mb-6">
                  <CheckCircle className="h-8 w-8 md:h-12 md:w-12 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-4">Siz allaqachon sotuvchisiz!</h2>
                <p className="text-gray-600 mb-6">
                  Tabriklaymiz! Siz GlobalMarket platformasida tasdiqlangan sotuvchisiz.
                </p>
                <Button onClick={() => router.push("/sell-product")} className="btn-primary">
                  <Store className="mr-2 h-4 w-4" />
                  Mahsulot qo'shish
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Application Form */}
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">Sotuvchi bo'lish uchun ariza</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">To'liq ism *</Label>
                        <Input
                          id="fullName"
                          placeholder="Ism Familiya"
                          className="input-beautiful"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon raqam *</Label>
                        <Input
                          id="phone"
                          placeholder="+998 90 123 45 67"
                          className="input-beautiful"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        className="input-beautiful"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName">Kompaniya/Do'kon nomi *</Label>
                      <Input
                        id="companyName"
                        placeholder="Kompaniya nomi"
                        className="input-beautiful"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Biznes turi *</Label>
                        <Select
                          value={formData.businessType}
                          onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                        >
                          <SelectTrigger className="input-beautiful">
                            <SelectValue placeholder="Biznes turini tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Jismoniy shaxs</SelectItem>
                            <SelectItem value="company">Yuridik shaxs</SelectItem>
                            <SelectItem value="entrepreneur">Tadbirkor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experienceYears">Tajriba (yil)</Label>
                        <Input
                          id="experienceYears"
                          type="number"
                          placeholder="0"
                          className="input-beautiful"
                          value={formData.experienceYears}
                          onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Qo'shimcha ma'lumot</Label>
                      <Textarea
                        id="description"
                        placeholder="Sizning biznesingiz haqida qisqacha ma'lumot, qanday mahsulotlar sotmoqchisiz..."
                        className="input-beautiful min-h-[100px]"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <Button type="submit" className="w-full btn-primary" disabled={submitting}>
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Yuborilmoqda...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Ariza yuborish
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Applications History */}
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">Arizalar tarixi</CardTitle>
                </CardHeader>
                <CardContent>
                  {applications.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Store className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">Hozircha arizalar yo'q</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((application) => (
                        <div key={application.id} className="border-2 border-gray-100 rounded-2xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold">{application.company_name}</h3>
                              <p className="text-sm text-gray-600">{formatDate(application.created_at)}</p>
                            </div>
                            {getStatusBadge(application.status)}
                          </div>

                          <div className="text-sm text-gray-600 mb-2">
                            <p>
                              <strong>Biznes turi:</strong> {application.business_type}
                            </p>
                            <p>
                              <strong>Tajriba:</strong> {application.experience_years} yil
                            </p>
                          </div>

                          {application.description && (
                            <p className="text-sm text-gray-600 mb-3">{application.description}</p>
                          )}

                          {application.admin_notes && (
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                              <p className="text-sm font-medium text-blue-800 mb-1">Admin izohi:</p>
                              <p className="text-sm text-blue-700">{application.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
