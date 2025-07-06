"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhoneInput } from "@/components/ui/phone-input"
import { MessageSquare, Phone, Mail, MapPin, Clock, Send, ArrowLeft, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function ContactPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    messageType: "general",
    subject: "",
    message: "",
    bookRequestTitle: "",
    bookRequestAuthor: "",
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (currentUser) {
      setUser(currentUser)
      setFormData((prev) => ({
        ...prev,
        email: currentUser.email || "",
        fullName: currentUser.user_metadata?.full_name || "",
        phone: currentUser.user_metadata?.phone || "",
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Ensure user exists in users table if logged in
      if (user) {
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
            full_name: formData.fullName,
            phone: formData.phone,
          })

          if (createUserError) {
            console.error("Error creating user:", createUserError)
            throw new Error("Foydalanuvchi yaratishda xatolik")
          }
        }
      }

      // Create contact message
      const messageData = {
        user_id: user?.id || null,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        message_type: formData.messageType,
        subject: formData.subject,
        message: formData.message,
        book_request_title: formData.messageType === "book_request" ? formData.bookRequestTitle : null,
        book_request_author: formData.messageType === "book_request" ? formData.bookRequestAuthor : null,
        status: "new",
      }

      const { error: messageError } = await supabase.from("contact_messages").insert(messageData)

      if (messageError) {
        console.error("Contact message error:", messageError)
        throw new Error("Xabar yuborishda xatolik")
      }

      toast.success("Xabaringiz muvaffaqiyatli yuborildi!")
      toast.info("Tez orada siz bilan bog'lanamiz")

      // Reset form
      setFormData({
        fullName: user?.user_metadata?.full_name || "",
        phone: user?.user_metadata?.phone || "",
        email: user?.email || "",
        messageType: "general",
        subject: "",
        message: "",
        bookRequestTitle: "",
        bookRequestAuthor: "",
      })
    } catch (error: any) {
      console.error("Error submitting contact form:", error)
      toast.error(error.message || "Xatolik yuz berdi")
    } finally {
      setSubmitting(false)
    }
  }

  const messageTypes = [
    { value: "general", label: "Umumiy savol", icon: "💬" },
    { value: "book_request", label: "Kitob so'rash", icon: "📚" },
    { value: "complaint", label: "Shikoyat", icon: "⚠️" },
    { value: "suggestion", label: "Taklif", icon: "💡" },
    { value: "technical", label: "Texnik yordam", icon: "🔧" },
  ]

  const contactInfo = [
    {
      icon: Phone,
      title: "Telefon",
      value: "+998 90 123 45 67",
      description: "Har kuni 9:00 dan 21:00 gacha",
    },
    {
      icon: Mail,
      title: "Email",
      value: "info@globalmarket.uz",
      description: "24 soat ichida javob beramiz",
    },
    {
      icon: MapPin,
      title: "Manzil",
      value: "G'uzor tumani, Fazo yonida",
      description: "O'zbekiston, Qashqadaryo viloyati",
    },
    {
      icon: Clock,
      title: "Ish vaqti",
      value: "9:00 - 21:00",
      description: "Dushanba - Yakshanba",
    },
  ]

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orqaga
          </Button>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="floating-animation mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-4">Biz bilan bog'laning</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Savollaringiz bormi? Yordam kerakmi? Biz sizga yordam berishga tayyormiz!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Send className="h-5 w-5" />
                    Xabar yuborish
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <PhoneInput
                          id="phone"
                          value={formData.phone}
                          onChange={(value) => setFormData({ ...formData, phone: value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email manzil</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        className="input-beautiful"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    {/* Message Type */}
                    <div className="space-y-2">
                      <Label htmlFor="messageType">Xabar turi *</Label>
                      <Select
                        value={formData.messageType}
                        onValueChange={(value) => setFormData({ ...formData, messageType: value })}
                      >
                        <SelectTrigger className="input-beautiful">
                          <SelectValue placeholder="Xabar turini tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {messageTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Book Request Fields */}
                    {formData.messageType === "book_request" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                        <div className="space-y-2">
                          <Label htmlFor="bookTitle">Kitob nomi *</Label>
                          <Input
                            id="bookTitle"
                            placeholder="Kitob nomini kiriting"
                            className="input-beautiful"
                            value={formData.bookRequestTitle}
                            onChange={(e) => setFormData({ ...formData, bookRequestTitle: e.target.value })}
                            required={formData.messageType === "book_request"}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bookAuthor">Muallif *</Label>
                          <Input
                            id="bookAuthor"
                            placeholder="Muallif nomini kiriting"
                            className="input-beautiful"
                            value={formData.bookRequestAuthor}
                            onChange={(e) => setFormData({ ...formData, bookRequestAuthor: e.target.value })}
                            required={formData.messageType === "book_request"}
                          />
                        </div>
                      </div>
                    )}

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Mavzu</Label>
                      <Input
                        id="subject"
                        placeholder="Xabar mavzusi"
                        className="input-beautiful"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Xabar *</Label>
                      <Textarea
                        id="message"
                        placeholder="Sizning xabaringiz..."
                        className="input-beautiful min-h-[120px]"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full btn-primary text-lg py-4" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Yuborilmoqda...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Xabar yuborish
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              {/* Contact Info Cards */}
              {contactInfo.map((info, index) => (
                <Card key={index} className="card-beautiful">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <info.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{info.title}</h3>
                        <p className="text-blue-600 font-medium mb-1">{info.value}</p>
                        <p className="text-sm text-gray-600">{info.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Location Image */}
              <Card className="card-beautiful">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Bizning joylashuvimiz
                  </h3>
                  <div className="relative aspect-video rounded-2xl overflow-hidden">
                    <Image
                      src="/assets/location.png"
                      alt="GlobalMarket joylashuvi - G'uzor tumani, Fazo yonida"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-medium text-gray-800">O'zbekiston, Qashqadaryo viloyati</p>
                    <p className="text-gray-600">G'uzor tumani, Fazo yonida</p>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ */}
              <Card className="card-beautiful">
                <CardHeader>
                  <CardTitle className="text-lg">Tez-tez so'raladigan savollar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-gray-100 rounded-2xl p-4">
                    <h4 className="font-medium mb-2">Buyurtma qancha vaqtda yetkaziladi?</h4>
                    <p className="text-sm text-gray-600">
                      G'uzor tumani bo'yicha 1-2 soat ichida, boshqa hududlarga 1-3 kun ichida yetkazib beramiz.
                    </p>
                  </div>

                  <div className="border-2 border-gray-100 rounded-2xl p-4">
                    <h4 className="font-medium mb-2">To'lov usullari qanday?</h4>
                    <p className="text-sm text-gray-600">
                      Naqd pul, plastik karta va Click/Payme orqali to'lash mumkin. Yetkazib berganda ham to'lash
                      mumkin.
                    </p>
                  </div>

                  <div className="border-2 border-gray-100 rounded-2xl p-4">
                    <h4 className="font-medium mb-2">Kitob topilmasa nima qilish kerak?</h4>
                    <p className="text-sm text-gray-600">
                      "Kitob so'rash" turini tanlab xabar yuboring. Biz sizga kerakli kitobni topishga harakat qilamiz.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
