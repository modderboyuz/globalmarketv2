"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { uz } from "date-fns/locale"
import {
  Star,
  ShoppingCart,
  User,
  Phone,
  MapPin,
  CalendarIcon,
  ArrowLeft,
  Heart,
  Share2,
  Truck,
  Shield,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Book {
  id: string
  title: string
  author: string
  description: string
  price: number
  image_url: string
  category_id: string
  order_count: number
  stock_quantity: number
  categories: {
    name_uz: string
  }
}

interface RelatedBook {
  id: string
  title: string
  author: string
  price: number
  image_url: string
}

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.id as string

  const [book, setBook] = useState<Book | null>(null)
  const [relatedBooks, setRelatedBooks] = useState<RelatedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState<Date>()
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    if (bookId) {
      fetchBookDetails()
      checkUser()
    }
  }, [bookId])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)

    if (currentUser?.user_metadata) {
      setFormData({
        fullName: currentUser.user_metadata.full_name || "",
        phone: currentUser.user_metadata.phone || "",
        address: currentUser.user_metadata.address || "",
      })
    }
  }

  const fetchBookDetails = async () => {
    try {
      // Fetch book details
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select(`
          *,
          categories (
            name_uz
          )
        `)
        .eq("id", bookId)
        .single()

      if (bookError) throw bookError
      setBook(bookData)

      // Fetch related books from same category
      if (bookData.category_id) {
        const { data: relatedData, error: relatedError } = await supabase
          .from("books")
          .select("id, title, author, price, image_url")
          .eq("category_id", bookData.category_id)
          .neq("id", bookId)
          .limit(8)

        if (!relatedError) {
          setRelatedBooks(relatedData || [])
        }
      }
    } catch (error) {
      console.error("Error fetching book details:", error)
      toast.error("Kitob ma'lumotlarini olishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!book) return

    setOrderLoading(true)

    try {
      // Generate anonymous temp ID for order tracking
      const anonTempId = Math.random().toString(36).substring(2, 15)

      const orderData = {
        bookId: book.id,
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        deliveryDate: deliveryDate?.toISOString(),
        userId: user?.id || null,
        anonTempId: anonTempId,
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Buyurtma berishda xatolik")
      }

      toast.success("Buyurtma muvaffaqiyatli berildi!")

      // Show bot tracking info
      const botUrl = `https://t.me/globalmarketshopbot?start=order_${anonTempId}_${result.order.id}`
      toast.success(`Buyurtmangizni kuzatish uchun Telegram botimizga o'ting`, {
        duration: 8000,
        action: {
          label: "Botga o'tish",
          onClick: () => window.open(botUrl, "_blank"),
        },
      })

      // Reset form
      setFormData({ fullName: "", phone: "", address: "" })
      setDeliveryDate(undefined)

      // Redirect to orders page if user is logged in
      if (user) {
        setTimeout(() => {
          router.push("/orders")
        }, 2000)
      }
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    } finally {
      setOrderLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Kitob topilmadi</h1>
          <Button onClick={() => router.push("/")} className="btn-primary">
            Bosh sahifaga qaytish
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 hover:bg-muted">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Orqaga
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Book Details */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Book Image */}
              <div className="space-y-4">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
                  <Image
                    src={book.image_url || "/placeholder.svg?height=600&width=450"}
                    alt={book.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button size="icon" variant="secondary" className="rounded-full">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Book Info */}
              <div className="space-y-6">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {book.categories.name_uz}
                  </Badge>
                  <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
                  <p className="text-xl text-muted-foreground mb-4">{book.author}</p>

                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">4.5</span>
                      <span className="text-muted-foreground">({book.order_count} baho)</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-muted-foreground">{book.order_count} marta sotilgan</span>
                  </div>

                  <div className="text-4xl font-bold text-primary mb-6">{formatPrice(book.price)}</div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <span>Tez yetkazib berish</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <span>Kafolat bilan</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <span>Qaytarish mumkin</span>
                  </div>
                </div>

                {/* Description */}
                {book.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Tavsif</h3>
                    <p className="text-muted-foreground leading-relaxed">{book.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Buyurtma berish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrder} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">To'liq ism *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="Ism Familiya"
                        className="pl-10"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon raqam *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+998 90 123 45 67"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Manzil *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="address"
                        placeholder="To'liq manzil: shahar, tuman, ko'cha, uy raqami"
                        className="pl-10 min-h-[80px]"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Yetkazib berish sanasi</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {deliveryDate ? format(deliveryDate, "PPP", { locale: uz }) : <span>Sanani tanlang</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={deliveryDate}
                          onSelect={setDeliveryDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Jami:</span>
                      <span className="text-primary">{formatPrice(book.price)}</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full btn-primary text-lg py-6" disabled={orderLoading}>
                    {orderLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Buyurtma berilmoqda...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Buyurtma berish
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Buyurtma bergandan so'ng sizga Telegram bot orqali kuzatish havolasi yuboriladi
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8">Shunga o'xshash kitoblar</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {relatedBooks.map((relatedBook) => (
                <Card
                  key={relatedBook.id}
                  className="card-hover cursor-pointer group"
                  onClick={() => router.push(`/book/${relatedBook.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="relative aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={relatedBook.image_url || "/placeholder.svg?height=300&width=200"}
                        alt={relatedBook.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {relatedBook.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">{relatedBook.author}</p>
                    <p className="font-bold text-primary">{formatPrice(relatedBook.price)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
