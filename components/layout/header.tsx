"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Search,
  ShoppingCart,
  Heart,
  Menu,
  LogOut,
  Settings,
  Package,
  Store,
  Home,
  Phone,
  Info,
  LogIn,
  Briefcase,
} from "lucide-react"

interface AppUser {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: string
  is_seller: boolean
  is_verified_seller: boolean
  is_admin: boolean
  type: string
}

interface CompanyInfo {
  name: string
  logo_url: string
  favicon_url: string
}

export function Header() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isSellerRoute = pathname?.startsWith("/seller-panel")

  useEffect(() => {
    checkUser()
    fetchCompanyInfo()
  }, [])

  useEffect(() => {
    if (user) {
      fetchCartCount()
    }
  }, [user])

  const fetchCompanyInfo = async () => {
    try {
      const { data } = await supabase.from("company").select("name, logo_url, favicon_url").single()
      if (data) {
        setCompany(data)
        // Update favicon
        const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement
        if (favicon && data.favicon_url) {
          favicon.href = data.favicon_url
        }
      }
    } catch (error) {
      console.error("Error fetching company info:", error)
    }
  }

  const checkUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        setUser(userData)
      }
    } catch (error) {
      console.error("Error checking user:", error)
    }
  }

  const fetchCartCount = async () => {
    if (!user) return

    try {
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      setCartCount(count || 0)
    } catch (error) {
      console.error("Error fetching cart count:", error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/")
  }

  const switchToSeller = () => {
    router.push("/seller-panel/dashboard")
  }

  const switchToCustomer = () => {
    router.push("/")
  }

  const navigationItems = [
    { href: "/", label: "Bosh sahifa", icon: Home },
    { href: "/products", label: "Mahsulotlar", icon: Package },
    { href: "/sellers", label: "Sotuvchilar", icon: Store },
    { href: "/about", label: "Biz haqimizda", icon: Info },
    { href: "/contact", label: "Aloqa", icon: Phone },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            {company?.logo_url ? (
              <img src={company.logo_url || "/placeholder.svg"} alt={company.name} className="h-8 w-auto" />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GM</span>
              </div>
            )}
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {company?.name || "GlobalMarket"}
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          {!isSellerRoute && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="search"
                  placeholder="Mahsulotlarni qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
              </div>
            </form>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            {!isSellerRoute ? (
              <>
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600 ${
                      pathname === item.href ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </>
            ) : null}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Mode Switch Buttons */}
            {user?.is_verified_seller && (
              <div className="hidden md:flex">
                {!isSellerRoute ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={switchToSeller}
                    className="flex items-center space-x-1 bg-transparent"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Sotuvchilikka o'tish</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={switchToCustomer}
                    className="flex items-center space-x-1 bg-transparent"
                  >
                    <Home className="w-4 h-4" />
                    <span>Mijozga o'tish</span>
                  </Button>
                )}
              </div>
            )}

            {/* Cart and Favorites - Only for customer mode */}
            {!isSellerRoute && user && (
              <>
                <Link href="/favorites">
                  <Button variant="ghost" size="sm" className="relative">
                    <Heart className="w-5 h-5" />
                  </Button>
                </Link>

                <Link href="/cart">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </>
            )}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name} />
                      <AvatarFallback>{user.full_name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {user.type === "email" ? "📧 Email" : "📱 Telegram"}
                        </Badge>
                        {user.is_verified_seller && (
                          <Badge variant="outline" className="text-xs">
                            <Store className="h-3 w-3 mr-1" />
                            Sotuvchi
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Profil</span>
                    </Link>
                  </DropdownMenuItem>

                  {!isSellerRoute && (
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="flex items-center">
                        <Package className="mr-2 h-4 w-4" />
                        <span>Buyurtmalar</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {user.is_admin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin-panel" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Chiqish</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button size="sm">
                  <LogIn className="w-4 h-4 mr-1" />
                  Kirish
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-4">
                  {/* Mobile Search */}
                  {!isSellerRoute && (
                    <form onSubmit={handleSearch} className="md:hidden">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          type="search"
                          placeholder="Qidirish..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </form>
                  )}

                  {/* Mode Switch - Mobile */}
                  {user?.is_verified_seller && (
                    <div className="border-b pb-4">
                      {!isSellerRoute ? (
                        <Button
                          variant="outline"
                          onClick={switchToSeller}
                          className="w-full justify-start bg-transparent"
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          Sotuvchilikka o'tish
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={switchToCustomer}
                          className="w-full justify-start bg-transparent"
                        >
                          <Home className="w-4 h-4 mr-2" />
                          Mijozga o'tish
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Mobile Navigation */}
                  {!isSellerRoute && (
                    <nav className="flex flex-col space-y-2">
                      {navigationItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            pathname === item.href ? "bg-blue-100 text-blue-600" : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </nav>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
