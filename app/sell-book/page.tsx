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
import { BookOpen, Upload, DollarSign, Package, ArrowLeft, Loader2, Camera, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: string
  name_uz: string
  slug: string
}

export default function SellBookPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    price: "",
    category_id: "",
    stock_quantity: "1",
    condition: "new",
    contact_phone: "",
    contact_email: "",
    location: "",
  })

  useEffect(() => {
    checkAuth()
    fetchCategories()
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
      setFormData((prev) => ({
        ...prev,
        contact_email: currentUser.email || "",
      }))
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name_uz")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Kategoriyalarni olishda xatolik")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Ensure user exists in users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single()

      if (userCheckError && userCheckError.code === "PGRST116") {
        // User doesn't exist, create them
        const { error: createUserError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || "",
          phone: formData.contact_phone,
        })

        if (createUserError) {
          console.error("Error creating user:", createUserError)
          throw new Error("Foydalanuvchi yaratishda xatolik")
        }
      }

      // Create contact request for admin notification
      const message = `
Kitob sotish so'rovi:
📚 Kitob: ${formData.title}
✍️ Muallif: ${formData.author}
💰 Narx: ${formData.price} so'm
📦 Miqdor: ${formData.stock_quantity}
🏷️ Holat: ${getConditionText(formData.condition)}
📍 Joylashuv: ${formData.location}
📞 Telefon: ${formData.contact_phone}

Tavsif:
${formData.description || "Yo'q"}
      `.trim()

      const { error: contactError } = await supabase.from("contact_requests").insert({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || "Noma'lum",
        phone: formData.contact_phone,
        message: message,
        book_title: formData.title,
        request_type: "sell_request",
        status: "new",
      })

      if (contactError) {
        console.error("Contact request error:", contactError)
        throw new Error("So'rov yuborishda xatolik")
      }

      toast.success("Kitob sotish so'rovi muvaffaqiyatli yuborildi!")
      toast.info("Adminlar tez orada siz bilan bog'lanishadi")

      // Reset form
      setFormData({
        title: "",
        author: "",
        description: "",
        price: "",
        category_id: "",
        stock_quantity: "1",
        condition: "new",
        contact_phone: "",
        contact_email: user?.email || "",
        location: "",
      })
    } catch (error: any) {
      console.error("Error submitting book:", error)
      toast.error(error.message || "Xatolik yuz berdi")
    } finally {
      setSubmitting(false)
    }
  }

  const getConditionText = (condition: string) => {
    const conditions: { [key: string]: string } = {
      new: "Yangi",
      like_new: "Yangidek",
      good: "Yaxshi",
      fair: "O'rtacha",
      poor: "Yomon",
    }
    return conditions[condition] || condition
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 hover:bg-white/20 text-gray-700 border-2 border-transparent hover:border-gray-300 rounded-2xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga qaytish
          </Button>

          <Card className="card-beautiful">
            <CardHeader className="text-center pb-6">
              <div className="floating-animation mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl pulse-glow">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold gradient-text">Kitob sotish</CardTitle>
              <p className="text-gray-600">Kitobingizni sotish uchun ma'lumotlarni to'ldiring</p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Book Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-container">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold gradient-text">Kitob ma'lumotlari</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                        Kitob nomi *
                      </Label>
                      <Input
                        id="title"
                        placeholder="Kitob nomini kiriting"
                        className="input-beautiful"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="author" className="text-sm font-medium text-gray-700">
                        Muallif *
                      </Label>
                      <Input
                        id="author"
                        placeholder="Muallif nomini kiriting"
                        className="input-beautiful"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Tavsif
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Kitob haqida qisqacha ma'lumot"
                      className="min-h-[120px] rounded-2xl border-2 border-gray-200/60 bg-white/80 backdrop-blur-sm focus:border-blue-400/70 focus:ring-4 focus:ring-blue-100/50 transition-all duration-300"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Kategoriya *
                      </Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger className="input-beautiful">
                          <SelectValue placeholder="Kategoriyani tanlang" />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-gray-200 rounded-2xl">
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name_uz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                        Narx (so'm) *
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                        <Input
                          id="price"
                          type="number"
                          placeholder="0"
                          className="input-beautiful pl-12"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity" className="text-sm font-medium text-gray-700">
                        Miqdor *
                      </Label>
                      <div className="relative">
                        <Package className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                        <Input
                          id="stock_quantity"
                          type="number"
                          placeholder="1"
                          className="input-beautiful pl-12"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition" className="text-sm font-medium text-gray-700">
                      Kitob holati *
                    </Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value })}
                    >
                      <SelectTrigger className="input-beautiful">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-2 border-gray-200 rounded-2xl">
                        <SelectItem value="new">Yangi</SelectItem>
                        <SelectItem value="like_new">Yangidek</SelectItem>
                        <SelectItem value="good">Yaxshi</SelectItem>
                        <SelectItem value="fair">O'rtacha</SelectItem>
                        <SelectItem value="poor">Yomon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="section-divider"></div>

                {/* Contact Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-container">
                      <Star className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold gradient-text">Aloqa ma'lumotlari</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone" className="text-sm font-medium text-gray-700">
                        Telefon raqam *
                      </Label>
                      <Input
                        id="contact_phone"
                        placeholder="+998 90 123 45 67"
                        className="input-beautiful"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_email" className="text-sm font-medium text-gray-700">
                        Email
                      </Label>
                      <Input
                        id="contact_email"
                        type="email"
                        placeholder="email@example.com"
                        className="input-beautiful bg-gray-50"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                      Joylashuv *
                    </Label>
                    <Input
                      id="location"
                      placeholder="Shahar, tuman"
                      className="input-beautiful"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button type="submit" className="w-full btn-primary text-lg py-4" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Yuborilmoqda...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Kitob sotish so'rovini yuborish
                      </>
                    )}
                  </Button>
                </div>

                <div className="card-beautiful p-6 bg-blue-50/80 border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <Camera className="h-5 w-5" />💡 Maslahat
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li>• Kitob nomini to'liq va aniq yozing</li>
                    <li>• Kitob holatini rostgoylik bilan belgilang</li>
                    <li>• Raqobatbardosh narx qo'ying</li>
                    <li>• Telefon raqamingizni to'g'ri kiriting</li>
                    <li>• Kitob haqida qo'shimcha ma'lumot berish sotish imkonini oshiradi</li>
                  </ul>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>
                    So'rovingiz yuborilgandan so'ng, adminlar siz bilan bog'lanib, kitobingizni ko'rib chiqishadi va
                    tasdiqlashadi.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
