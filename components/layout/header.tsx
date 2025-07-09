"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  ShoppingCart,
  User,
  LogOut,
  Package,
  Heart,
  Store,
  Plus,
  MessageSquare,
  Info,
  BookOpen,
  PenTool,
  Phone,
  BarChart3,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { AuthModal } from "@/components/auth/auth-modal"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string
}

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [cartCount, setCartCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])

  useEffect(() => {
    checkUser()
    fetchCategories()
    fetchFeaturedProducts()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setUser(session?.user)
        if (session?.user) {
          fetchCartCount(session.user.id)
          fetchUserData(session.user.id)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setCartCount(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (currentUser) {
        await fetchUserData(currentUser.id)
        await fetchCartCount(currentUser.id)
      }
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserData = async (userId: string) => {
    try {
      const { data: userData } = await supabase.from("users").select("*").eq("id", userId).single()
      setUser(userData)
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  const fetchCartCount = async (userId: string) => {
    try {
      const { count } = await supabase.from("cart").select("*", { count: "exact", head: true }).eq("user_id", userId)
      setCartCount(count || 0)
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order").limit(6)
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("order_count", { ascending: false })
        .limit(6)

      if (error) throw error
      setFeaturedProducts(data || [])
    } catch (error) {
      console.error("Error fetching featured products:", error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setCartCount(0)
      toast.success("Muvaffaqiyatli chiqildi")
      router.push("/")
    } catch (error) {
      toast.error("Chiqishda xatolik yuz berdi")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image src="/placeholder-logo.png" alt="GlobalMarket Logo" fill className="object-contain" priority />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-800">GlobalMarket</h1>
                <p className="text-xs text-gray-500">G'uzor tumani</p>
              </div>
            </Link>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Kitob, qalam, daftar qidiring..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 h-10 rounded-2xl border-2 border-gray-200 focus:border-blue-400 bg-gray-50/50"
                  />
                </div>
              </form>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {/* Contact Button */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex items-center gap-2 text-blue-600 hover:bg-blue-50"
                onClick={() => window.open("tel:+998958657500")}
              >
                <Phone className="h-4 w-4" />
                <span className="font-medium">+998 95 865 75 00</span>
              </Button>

              {/* Search Button - Mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-2xl"
                onClick={() => router.push("/search")}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Cart */}
              <Button variant="ghost" size="icon" className="relative rounded-2xl" onClick={() => router.push("/cart")}>
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{user.full_name || "Foydalanuvchi"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      {user.is_verified_seller && (
                        <Badge variant="default" className="text-xs w-fit bg-green-500">
                          Tasdiqlangan sotuvchi
                        </Badge>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/orders")}>
                      <Package className="mr-2 h-4 w-4" />
                      <span>Buyurtmalar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/favorites")}>
                      <Heart className="mr-2 h-4 w-4" />
                      <span>Sevimlilar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/messages")}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Xabarlar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.is_verified_seller ? (
                      <DropdownMenuItem onClick={() => router.push("/seller/dashboard")}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Sotuvchi paneli</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => router.push("/become-seller")}>
                        <Store className="mr-2 h-4 w-4" />
                        <span>Sotuvchi bo'lish</span>
                      </DropdownMenuItem>
                    )}
                    {!user.is_verified_seller && (
                      <DropdownMenuItem onClick={() => router.push("/sell-product")}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Mahsulot qo'shish</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/contact")}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Murojaat</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/about")}>
                      <Info className="mr-2 h-4 w-4" />
                      <span>Biz haqimizda</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Chiqish</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="default"
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-700"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Kirish</span>
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Menu */}
          <div className="hidden lg:block border-t border-gray-100">
            <NavigationMenu className="mx-auto">
              <NavigationMenuList className="flex space-x-6 py-3">
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-gray-700 hover:text-blue-600">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Kitoblar
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[600px] grid-cols-2">
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Kategoriyalar</h4>
                        {categories
                          .filter((cat) => cat.slug.includes("kitob"))
                          .map((category) => (
                            <NavigationMenuLink key={category.id} asChild>
                              <Link
                                href={`/category/${category.slug}`}
                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              >
                                <div className="text-sm font-medium leading-none">
                                  {category.icon} {category.name}
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          ))}
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Mashhur kitoblar</h4>
                        {featuredProducts.slice(0, 3).map((product) => (
                          <NavigationMenuLink key={product.id} asChild>
                            <Link
                              href={`/product/${product.id}`}
                              className="flex items-center space-x-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={product.image_url || "/placeholder.svg"}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium leading-none line-clamp-1">{product.name}</div>
                                <div className="text-xs text-blue-600 mt-1">{formatPrice(product.price)}</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-gray-700 hover:text-blue-600">
                    <PenTool className="h-4 w-4 mr-2" />
                    Maktab buyumlari
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[600px] grid-cols-2">
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Kategoriyalar</h4>
                        {categories
                          .filter((cat) => !cat.slug.includes("kitob"))
                          .map((category) => (
                            <NavigationMenuLink key={category.id} asChild>
                              <Link
                                href={`/category/${category.slug}`}
                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              >
                                <div className="text-sm font-medium leading-none">
                                  {category.icon} {category.name}
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          ))}
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Mashhur mahsulotlar</h4>
                        {featuredProducts.slice(3, 6).map((product) => (
                          <NavigationMenuLink key={product.id} asChild>
                            <Link
                              href={`/product/${product.id}`}
                              className="flex items-center space-x-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={product.image_url || "/placeholder.svg"}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium leading-none line-clamp-1">{product.name}</div>
                                <div className="text-xs text-blue-600 mt-1">{formatPrice(product.price)}</div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    href="/products"
                    className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-md transition-colors"
                  >
                    Barcha mahsulotlar
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    href="/sellers"
                    className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-md transition-colors"
                  >
                    Sotuvchilar
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    href="/contact"
                    className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-md transition-colors"
                  >
                    Aloqa
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
