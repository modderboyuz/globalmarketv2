"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ArrowRight, BookOpen } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Book {
  id: string
  title: string
  author: string
  price: number
  image_url: string
  order_count: number
}

interface Category {
  id: string
  name_uz: string
  slug: string
}

interface BookCategorySectionProps {
  category: Category
}

export function BookCategorySection({ category }: BookCategorySectionProps) {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBooks()
  }, [category.id])

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("category_id", category.id)
        .order("order_count", { ascending: false })
        .limit(8)

      if (error) throw error
      setBooks(data || [])
    } catch (error) {
      console.error("Error fetching books:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const handleBookClick = (bookId: string) => {
    router.push(`/book/${bookId}`)
  }

  if (loading) {
    return (
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded-2xl animate-pulse w-64" />
          <div className="h-10 bg-gray-200 rounded-2xl animate-pulse w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card-beautiful p-4">
              <div className="aspect-[3/4] bg-gray-200 rounded-2xl animate-pulse mb-4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (books.length === 0) {
    return null
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="icon-container">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold gradient-text">{category.name_uz}</h2>
        </div>
        <Button
          variant="outline"
          className="border-2 border-gray-300 hover:border-blue-400 rounded-2xl px-6 py-2 bg-transparent"
          onClick={() => router.push(`/category/${category.slug}`)}
        >
          Barchasini ko'rish
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {books.map((book) => (
          <Card
            key={book.id}
            className="card-hover cursor-pointer group overflow-hidden"
            onClick={() => handleBookClick(book.id)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={book.image_url || "/placeholder.svg?height=300&width=200"}
                  alt={book.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3">
                  <Badge className="badge-beautiful border-green-200 text-green-800">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    4.5
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-1">{book.author}</p>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-blue-600 text-sm">{formatPrice(book.price)}</p>
                  <Badge
                    variant="secondary"
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {book.order_count} sotilgan
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
