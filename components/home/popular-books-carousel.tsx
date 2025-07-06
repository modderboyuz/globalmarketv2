"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, ArrowLeft, ArrowRight } from "lucide-react"

const popularBooks = [
  {
    id: "1",
    title: "O'tkan kunlar",
    author: "Abdulla Qodiriy",
    price: 45000,
    originalPrice: 55000,
    rating: 4.8,
    reviews: 120,
    image: "/placeholder.svg?height=400&width=300",
    badge: "Eng mashhur",
    badgeColor: "bg-red-500",
  },
  {
    id: "2",
    title: "Mehrobdan chayon",
    author: "Abdulla Qodiriy",
    price: 38000,
    originalPrice: 45000,
    rating: 4.7,
    reviews: 95,
    image: "/placeholder.svg?height=400&width=300",
    badge: "Chegirma",
    badgeColor: "bg-green-500",
  },
  {
    id: "3",
    title: "Xamsa",
    author: "Alisher Navoiy",
    price: 65000,
    rating: 4.9,
    reviews: 80,
    image: "/placeholder.svg?height=400&width=300",
    badge: "Klassik",
    badgeColor: "bg-purple-500",
  },
  {
    id: "4",
    title: "Sarob",
    author: "Abdulla Qahhor",
    price: 32000,
    originalPrice: 40000,
    rating: 4.6,
    reviews: 67,
    image: "/placeholder.svg?height=400&width=300",
    badge: "Yangi",
    badgeColor: "bg-blue-500",
  },
  {
    id: "5",
    title: "Ikki eshik orasi",
    author: "Ulug'bek Hamdam",
    price: 28000,
    rating: 4.5,
    reviews: 45,
    image: "/placeholder.svg?height=400&width=300",
    badge: "Tavsiya",
    badgeColor: "bg-orange-500",
  },
]

export function PopularBooksCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === popularBooks.length - 1 ? 0 : prevIndex + 1))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  const handleBookClick = (bookId: string) => {
    router.push(`/book/${bookId}`)
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === popularBooks.length - 1 ? 0 : prevIndex + 1))
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? popularBooks.length - 1 : prevIndex - 1))
  }

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-3xl border-4 border-white/30 shadow-2xl cursor-pointer group">
      <div
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {popularBooks.map((book, index) => (
          <div key={book.id} className="w-full flex-shrink-0 relative" onClick={() => handleBookClick(book.id)}>
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10" />
            <Image
              src={book.image || "/placeholder.svg"}
              alt={book.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 z-20 flex items-center">
              <div className="container mx-auto px-8">
                <div className="max-w-2xl text-white">
                  <Badge
                    className={`mb-6 ${book.badgeColor} text-white border-2 border-white/30 text-sm px-4 py-2 rounded-full`}
                  >
                    {book.badge}
                  </Badge>
                  <h2 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in hover:text-blue-200 transition-colors text-shadow">
                    {book.title}
                  </h2>
                  <p className="text-xl md:text-2xl mb-6 opacity-90 text-shadow">{book.author}</p>
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border-2 border-white/30">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{book.rating}</span>
                      <span className="opacity-75">({book.reviews} baho)</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 mb-10">
                    <span className="text-4xl font-bold bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 border-2 border-white/30">
                      {formatPrice(book.price)}
                    </span>
                    {book.originalPrice && (
                      <span className="text-xl line-through opacity-60 bg-red-500/20 backdrop-blur-sm rounded-xl px-4 py-2 border-2 border-red-300/30">
                        {formatPrice(book.originalPrice)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="btn-primary text-lg px-10 py-4 hover:scale-110 transition-transform shadow-2xl"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleBookClick(book.id)
                    }}
                  >
                    <ShoppingCart className="mr-3 h-6 w-6" />
                    Batafsil ko'rish
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 hover:bg-white/30 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
        onClick={(e) => {
          e.stopPropagation()
          prevSlide()
        }}
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 hover:bg-white/30 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
        onClick={(e) => {
          e.stopPropagation()
          nextSlide()
        }}
      >
        <ArrowRight className="h-6 w-6" />
      </Button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex space-x-3">
          {popularBooks.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(index)
              }}
              className={`w-4 h-4 rounded-full transition-all duration-300 border-2 ${
                index === currentIndex
                  ? "bg-white scale-125 border-white"
                  : "bg-white/50 hover:bg-white/75 border-white/50 hover:border-white/75"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
