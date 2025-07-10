"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingBag, Users, TrendingUp, Star, ArrowRight, Package, Store, Heart, Eye } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category: { name: string; slug: string }
  seller: { full_name: string; id: string }
  views: number
  likes: number
  is_featured: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  product_count: number
}

interface Stats {
  total_products: number
  total_sellers: number
  total_categories: number
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<Stats>({ total_products: 0, total_sellers: 0, total_categories: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch featured products
      const { data: products } = await supabase
        .from("products")
        .select(`
          *,
          categories(name, slug),
          users(full_name, id)
        `)
        .eq("is_featured", true)
        .eq("status", "active")
        .limit(8)

      // Fetch categories with product count
      const { data: categoriesData } = await supabase
        .from("categories")
        .select(`
          *,
          products(count)
        `)
        .limit(6)

      // Fetch stats
      const [{ count: productCount }, { count: sellerCount }, { count: categoryCount }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_verified_seller", true),
        supabase.from("categories").select("*", { count: "exact", head: true }),
      ])

      setFeaturedProducts(products || [])
      setCategories(categoriesData || [])
      setStats({
        total_products: productCount || 0,
        total_sellers: sellerCount || 0,
        total_categories: categoryCount || 0,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">GlobalMarket ga xush kelibsiz</h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 animate-fade-in">
              G'uzor tumanidagi eng yaxshi onlayn bozor. Sifatli mahsulotlar, ishonchli sotuvchilar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
              <Link href="/products">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Xarid qilishni boshlash
                </Button>
              </Link>
              <Link href="/become-seller">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 bg-transparent"
                >
                  <Store className="mr-2 h-5 w-5" />
                  Sotuvchi bo'lish
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total_products}+</h3>
                <p className="text-gray-600">Mahsulotlar</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total_sellers}+</h3>
                <p className="text-gray-600">Sotuvchilar</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total_categories}+</h3>
                <p className="text-gray-600">Kategoriyalar</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Kategoriyalar</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Turli xil mahsulotlar kategoriyalarini ko'ring</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.product_count || 0} mahsulot</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/products">
              <Button variant="outline" size="lg">
                Barcha kategoriyalar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tavsiya etilgan mahsulotlar</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Eng yaxshi va mashhur mahsulotlarimiz</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden">
                  <div className="relative">
                    <img
                      src={product.image_url || "/placeholder.svg?height=200&width=300"}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    <Badge className="absolute top-2 left-2 bg-blue-600">
                      <Star className="h-3 w-3 mr-1" />
                      Tavsiya
                    </Badge>
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Badge variant="secondary" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {product.views}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Heart className="h-3 w-3 mr-1" />
                        {product.likes}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">{product.price.toLocaleString()} so'm</span>
                      <Badge variant="outline" className="text-xs">
                        {product.category?.name}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Sotuvchi: {product.seller?.full_name}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/products">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Barcha mahsulotlar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Bizga qo'shiling!</h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            GlobalMarket orqali o'z biznesingizni rivojlantiring yoki eng yaxshi mahsulotlarni xarid qiling.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3">
                Ro'yxatdan o'tish
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 bg-transparent"
              >
                Biz bilan bog'lanish
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
