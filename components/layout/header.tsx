"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import {
  Search,
  ShoppingCart,
  User,
  LogOut,
  Package,
  Heart,
  Settings,
  Store,
  Plus,
  MessageSquare,
  Info,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { AuthModal } from "@/components/auth/auth-modal"
import { toast } from "sonner"

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [cartCount, setCartCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setUser(session?.user)
        if (session?.user) {
          fetchCartCount(session.user.id)
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

      setUser(currentUser)

      if (currentUser) {
        await fetchCartCount(currentUser.id)
      }
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setIsLoading(false)
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

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">GM</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gradient-text">GlobalMarket</h1>
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
                        <AvatarImage
                          src={user.user_metadata?.avatar_url || "/placeholder.svg"}
                          alt={user.user_metadata?.full_name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "Foydalanuvchi"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/become-seller")}>
                      <Store className="mr-2 h-4 w-4" />
                      <span>Sotuvchi bo'lish</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/sell-product")}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Mahsulot qo'shish</span>
                    </DropdownMenuItem>
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
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Sozlamalar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Chiqish</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="destructive" onClick={() => setShowAuthModal(true)} className="btn-primary rounded-2xl">
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Kirish</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
