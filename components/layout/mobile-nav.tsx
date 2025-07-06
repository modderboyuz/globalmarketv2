"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Home, Search, Package, ShoppingCart, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

export function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)

    if (currentUser) {
      fetchCartCount(currentUser.id)
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

  const navItems = [
    {
      icon: Home,
      label: "Bosh sahifa",
      path: "/",
      active: pathname === "/",
    },
    {
      icon: Search,
      label: "Qidirish",
      path: "/search",
      active: pathname === "/search",
    },
    {
      icon: Package,
      label: "Mahsulotlar",
      path: "/products",
      active: pathname === "/products" || pathname.startsWith("/category"),
    },
    {
      icon: ShoppingCart,
      label: "Savatcha",
      path: "/cart",
      active: pathname === "/cart",
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      icon: User,
      label: "Profil",
      path: user ? "/profile" : "/login",
      active: pathname === "/profile" || pathname === "/login",
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                item.active ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5 mb-1" />
                {item.badge && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
