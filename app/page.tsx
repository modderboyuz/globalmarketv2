"use client"

import { Suspense, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Heart, ShoppingCart, Phone, MapPin, Mail, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { AdBanner } from "@/components/layout/ad-banner"
import { BookCategorySection } from "@/components/home/book-category-section"
import { supabase } from "@/lib/supabase"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  average_rating: number
  like_count: number
  order_count: number
  seller: {
    full_name: string
    company_name: string
    is_verified_seller: boolean
  }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  sort_order: number
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <CardContent className="p-3 sm:p-4">
          <div className="relative aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={product.image_url || "/placeholder.svg?height=200&width=200"}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-6 w-6 sm:h-8 sm:w-8 p-0 bg-white/80 hover:bg-white"
            >
              <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>

            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-2 w-2 sm:h-3 sm:w-3 ${
                      i < Math.floor(product.average_rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">({product.order_count})</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-sm sm:text-lg text-blue-600">{product.price.toLocaleString()} so'm</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Heart className="h-2 w-2 sm:h-3 sm:w-3" />
                {product.like_count}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 truncate">
                {product.seller?.company_name || product.seller?.full_name}
              </span>
              {product.seller?.is_verified_seller && (
                <Badge variant="secondary" className="text-xs">
                  ✓
                </Badge>
              )}
            </div>

            <div className="flex gap-1 sm:gap-2 pt-2">
              <Button size="sm" className="flex-1 text-xs">
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Sotib olish</span>
                <span className="sm:hidden">Sotish</span>
              </Button>
              <Button size="sm" variant="outline" className="px-2 bg-transparent">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/category/${category.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">{category.icon}</div>
          <h3 className="font-medium text-xs sm:text-sm">{category.name}</h3>
        </CardContent>
      </Card>
    </Link>
  )
}

function CategoriesSection({ categories, allCategories }: { categories: Category[]; allCategories: Category[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayCategories = showAll ? allCategories : categories

  return (
    <section className="container mx-auto px-4 py-6 sm:py-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">📂 Kategoriyalar</h2>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {displayCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
      {allCategories.length > 6 && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => setShowAll(!showAll)} className="bg-transparent">
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Kamroq ko'rsatish
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Boshqa kategoriyalar
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const [data, setData] = useState({
    categories: [] as Category[],
    allCategories: [] as Category[],
    featuredProducts: [] as Product[],
    popularProducts: [] as Product[],
    books: [] as Product[],
    otherProducts: [] as Product[],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch categories - only first 6 for initial display
      const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(6)

      // Fetch all categories for "show more" functionality
      const { data: allCategories } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")

      // Fetch featured products
      const { data: featuredProducts } = await supabase
        .from("products")
        .select(`
          *,
          seller:users!products_seller_id_fkey(full_name, company_name, is_verified_seller)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .eq("is_featured", true)
        .order("popularity_score", { ascending: false })
        .limit(8)

      // Fetch popular products
      const { data: popularProducts } = await supabase
        .from("products")
        .select(`
          *,
          seller:users!products_seller_id_fkey(full_name, company_name, is_verified_seller)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("popularity_score", { ascending: false })
        .limit(12)

      // Fetch books specifically
      const { data: books } = await supabase
        .from("products")
        .select(`
          *,
          seller:users!products_seller_id_fkey(full_name, company_name, is_verified_seller),
          category:categories!products_category_id_fkey(name, slug)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .eq("product_type", "book")
        .order("created_at", { ascending: false })
        .limit(8)

      // Fetch other products (non-books)
      const { data: otherProducts } = await supabase
        .from("products")
        .select(`
          *,
          seller:users!products_seller_id_fkey(full_name, company_name, is_verified_seller),
          category:categories!products_category_id_fkey(name, slug)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .neq("product_type", "book")
        .order("created_at", { ascending: false })
        .limit(8)

      setData({
        categories: categories || [],
        allCategories: allCategories || [],
        featuredProducts: featuredProducts || [],
        popularProducts: popularProducts || [],
        books: books || [],
        otherProducts: otherProducts || [],
      })
    } catch (error) {
      console.error("Database error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Ad Banner */}
      <AdBanner />

      {/* Categories */}
      {data.categories.length > 0 && (
        <CategoriesSection categories={data.categories} allCategories={data.allCategories} />
      )}

      {/* Featured Products */}
      {data.featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">⭐ Tavsiya etilgan mahsulotlar</h2>
            <Link href="/products">
              <Button variant="outline" size="sm">
                Barchasini ko'rish
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {data.featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Books Section */}
      <Suspense fallback={<div>Loading books...</div>}>
        <BookCategorySection />
      </Suspense>

      {/* Other Products */}
      {data.otherProducts.length > 0 && (
        <section className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">🛍️ Boshqa mahsulotlar</h2>
            <Link href="/products">
              <Button variant="outline" size="sm">
                Barchasini ko'rish
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {data.otherProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Products */}
      {data.popularProducts.length > 0 && (
        <section className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">🔥 Mashhur mahsulotlar</h2>
            <Link href="/products?sort=popular">
              <Button variant="outline" size="sm">
                Barchasini ko'rish
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {data.popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="bg-white py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">📞 Biz bilan bog'laning</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              Savollaringiz bormi? Biz sizga yordam berishga tayyormiz. Quyidagi usullar orqali biz bilan
              bog'lanishingiz mumkin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <Card>
              <CardContent className="p-4 sm:p-6 text-center">
                <Phone className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">📱 Telefon</h3>
                <p className="text-gray-600 text-sm sm:text-base">+998 95 865 75 00</p>
                <Button className="mt-4" size="sm">
                  Qo'ng'iroq qilish
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6 text-center">
                <Mail className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">📧 Email</h3>
                <p className="text-gray-600 text-sm sm:text-base">info@globalmarket.uz</p>
                <Button className="mt-4 bg-transparent" size="sm" variant="outline">
                  Email yuborish
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6 text-center">
                <MapPin className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">📍 Manzil</h3>
                <p className="text-gray-600 text-sm sm:text-base">Qashqadaryo viloyati, G'uzor tumani</p>
                <Button className="mt-4 bg-transparent" size="sm" variant="outline">
                  Xaritada ko'rish
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
