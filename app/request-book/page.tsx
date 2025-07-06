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
import { MessageSquare, Search, Send, ArrowLeft, Loader2, BookOpen, Clock, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: string
  name_uz: string
  slug: string
}

export default function RequestBookPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    book_title: "",
    author: "",
    category_id: "",
    description: "",
    max_price: "",
    urgency: "normal",
    contact_phone: "",
    additional_info: "",
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

      const message = `
Kitob so'rovi:
📚 Kitob: ${formData.book_title}
✍️ Muallif: ${formData.author || "Noma'lum"}
💰 Maksimal narx: ${formData.max_price ? formData.max_price + " so'm" : "Muhim emas"}
⚡ Shoshilinch: ${getUrgencyText(formData.urgency)}
📞 Telefon: ${formData.contact_phone}

Qo'shimcha ma'lumot:
${formData.additional_info || "Yo'q"}

Tavsif:
${formData.description || "Yo'q"}
      `.trim()

      const { error } = await supabase.from("contact_requests").insert({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || "Noma'lum",
        phone: formData.contact_phone,
        message: message,
        book_title: formData.book_title,
        request_type: "book_request",
        status: "new",
      })

      if (error) {
        console.error("Contact request error:", error)
        throw new Error("So'rov yuborishda xatolik")
      }

      toast.success("Kitob so'rovi muvaffaqiyatli yuborildi!")
      toast.info("Adminlar kitobni topishga harakat qilishadi va siz bilan bog'lanishadi")

      // Reset form
      setFormData({
        book_title: "",
        author: "",
        category_id: "",
        description: "",
        max_price: "",
        urgency: "normal",
        contact_phone: "",
        additional_info: "",
      })
    } catch (error: any) {
      console.error("Error submitting request:", error)
      toast.error(error.message || "Xatolik yuz berdi")
    } finally {
      setSubmitting(false)
    }
  }

  const getUrgencyText = (urgency: string) => {
    const urgencyTexts: { [key: string]: string } = {
      normal: "Oddiy",
      urgent: "Shoshilinch",
      very_urgent: "Juda shoshilinch",
    }
    return urgencyTexts[urgency] || urgency
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
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl pulse-glow">
                  <Search className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold gradient-text">Kitob so'rash</CardTitle>
              <p className="text-gray-600">Qidirayotgan kitobingiz haqida ma'lumot bering</p>
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
                      <Label htmlFor="book_title" className="text-sm font-medium text-gray-700">
                        Kitob nomi *
                      </Label>
                      <Input
                        id="book_title"
                        placeholder="Qidirayotgan kitob nomini kiriting"
                        className="input-beautiful"
                        value={formData.book_title}
                        onChange={(e) => setFormData({ ...formData, book_title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="author" className="text-sm font-medium text-gray-700">
                        Muallif
                      </Label>
                      <Input
                        id="author"
                        placeholder="Muallif nomi (ixtiyoriy)"
                        className="input-beautiful"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Kategoriya
                      </Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger className="input-beautiful">
                          <SelectValue placeholder="Kategoriyani tanlang (ixtiyoriy)" />
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
                      <Label htmlFor="max_price" className="text-sm font-medium text-gray-700">
                        Maksimal narx (so'm)
                      </Label>
                      <Input
                        id="max_price"
                        type="number"
                        placeholder="0 (ixtiyoriy)"
                        className="input-beautiful"
                        value={formData.max_price}
                        onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Kitob haqida ma'lumot
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Kitob haqida bilgan ma'lumotlaringizni yozing (nashriyot, yil, rang va h.k.)"
                      className="min-h-[120px] rounded-2xl border-2 border-gray-200/60 bg-white/80 backdrop-blur-sm focus:border-blue-400/70 focus:ring-4 focus:ring-blue-100/50 transition-all duration-300"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="section-divider"></div>

                {/* Request Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-container">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold gradient-text">So'rov tafsilotlari</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="urgency" className="text-sm font-medium text-gray-700">
                        Shoshilinchlik darajasi
                      </Label>
                      <Select
                        value={formData.urgency}
                        onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                      >
                        <SelectTrigger className="input-beautiful">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-gray-200 rounded-2xl">
                          <SelectItem value="normal">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-green-500" />
                              Oddiy
                            </div>
                          </SelectItem>
                          <SelectItem value="urgent">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              Shoshilinch
                            </div>
                          </SelectItem>
                          <SelectItem value="very_urgent">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-red-500" />
                              Juda shoshilinch
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional_info" className="text-sm font-medium text-gray-700">
                      Qo'shimcha ma'lumot
                    </Label>
                    <Textarea
                      id="additional_info"
                      placeholder="Boshqa muhim ma'lumotlar, maxsus talablar yoki izohlar"
                      className="min-h-[120px] rounded-2xl border-2 border-gray-200/60 bg-white/80 backdrop-blur-sm focus:border-blue-400/70 focus:ring-4 focus:ring-blue-100/50 transition-all duration-300"
                      value={formData.additional_info}
                      onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
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
                        <Send className="mr-2 h-5 w-5" />
                        Kitob so'rovini yuborish
                      </>
                    )}
                  </Button>
                </div>

                <div className="card-beautiful p-6 bg-purple-50/80 border-purple-200">
                  <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                    <Star className="h-5 w-5" />💡 Maslahat
                  </h4>
                  <ul className="text-sm text-purple-700 space-y-2">
                    <li>• Kitob nomini to'liq va aniq yozing</li>
                    <li>• Muallif nomini bilsangiz, albatta qo'shing</li>
                    <li>• Kitob haqida qo'shimcha ma'lumot berish topish imkonini oshiradi</li>
                    <li>• Telefon raqamingizni to'g'ri kiriting - siz bilan bog'lanishimiz uchun</li>
                    <li>• Shoshilinchlik darajasini to'g'ri belgilang</li>
                  </ul>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>
                    So'rovingiz yuborilgandan so'ng, adminlar kitobni qidirishga harakat qilishadi va topilsa siz bilan
                    bog'lanishadi.
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
