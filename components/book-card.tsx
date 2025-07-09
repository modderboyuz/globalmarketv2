"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Heart, ShoppingCart } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  average_rating: number
  like_count: number
  order_count: number
  stock_quantity: number
  author?: string
  brand?: string
}

interface BookCardProps {
  product: Product
}

export default function BookCard({ product }: BookCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <CardContent className="p-3">
          <div className="relative aspect-[3/4] mb-3 overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={product.image_url || "/placeholder.svg?height=300&width=200"}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
            {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
              <Badge className="absolute bottom-2 left-2 bg-orange-500 text-xs">Kam qoldi</Badge>
            )}
            {product.stock_quantity === 0 && (
              <Badge className="absolute bottom-2 left-2 bg-red-500 text-xs">Tugagan</Badge>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>

            {product.author && <p className="text-xs text-gray-600 line-clamp-1">{product.author}</p>}

            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.floor(product.average_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">({product.order_count || 0})</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-blue-600">{product.price.toLocaleString()} so'm</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Heart className="h-3 w-3" />
                {product.like_count || 0}
              </div>
            </div>

            <Button
              size="sm"
              className="w-full text-xs"
              disabled={product.stock_quantity === 0}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              {product.stock_quantity === 0 ? "Tugagan" : "Sotib olish"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
