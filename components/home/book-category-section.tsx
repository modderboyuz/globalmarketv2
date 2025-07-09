"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart, Eye } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Product {
  id: string
  title: string
  description: string
  price: number
  image_url: string
  author?: string
  isbn?: string
  condition: string
  seller: {
    id: string
    full_name: string
    avatar_url?: string
  }
  category: {
    name: string
    icon: string
  }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export function BookCategorySection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("kitoblar")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
    fetchProductsByCategory("kitoblar")
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, icon")
        .eq("is_active", true)
        .order("sort_order")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchProductsByCategory = async (categorySlug: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          title,
          description,
          price,
          image_url,
          author,
          isbn,
          condition,
          seller:seller_id (
            id,
            full_name,
            avatar_url
          ),
          category:category_id (
            name,
            icon
          )
        `)
        .eq("categories.slug", categorySlug)
        .eq("is_active", true)
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(8)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug)
    fetchProductsByCategory(categorySlug)
  }

  return (
    <section className="py-12 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">📚 Kategoriyalar bo'yicha mahsulotlar</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Turli kategoriyalardagi eng yaxshi mahsulotlarni kashf eting
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.slug ? "default" : "outline"}
              onClick={() => handleCategoryChange(category.slug)}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-lg">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={product.image_url || "/placeholder.jpg"}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-white/90">
                      {product.condition}
                    </Badge>
                  </div>
                  {product.category && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="outline" className="bg-white/90">
                        {product.category.icon} {product.category.name}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {product.title}
                  </h3>

                  {product.author && <p className="text-sm text-gray-600 mb-2">👤 Muallif: {product.author}</p>}

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-green-600">{product.price.toLocaleString()} so'm</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">4.5</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                      <Image
                        src={product.seller.avatar_url || "/placeholder-user.jpg"}
                        alt={product.seller.full_name}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm text-gray-600 truncate">{product.seller.full_name}</span>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/product/${product.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <Eye className="w-4 h-4 mr-1" />
                        Ko'rish
                      </Button>
                    </Link>
                    <Button size="sm" className="flex-1">
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Savatga
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Hozircha mahsulotlar yo'q</h3>
            <p className="text-gray-500">Bu kategoriyada hali mahsulotlar qo'shilmagan</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="text-center mt-8">
            <Link href={`/category/${selectedCategory}`}>
              <Button variant="outline" size="lg">
                Barcha mahsulotlarni ko'rish
                <span className="ml-2">→</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default BookCategorySection
