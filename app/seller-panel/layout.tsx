"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Package,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  User,
  ArrowLeft,
  ShoppingCart,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface SellerLayoutProps {
  children: React.ReactNode
}

export default function SellerPanelLayout({ children }: SellerLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    checkSellerAuth()
  }, [])

  const checkSellerAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (!userData?.is_verified_seller) {
        toast.error("Sotuvchi hisobiga kirish uchun tasdiqlangan sotuvchi bo'lishingiz kerak")
        router.push("/become-seller")
        return
      }

      setUser(userData)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      toast.error("Chiqishda xatolik yuz berdi")
    }
  }

  const switchToCustomer = () => {
    router.push("/")
  }

  const sidebarItems = [
    {
      name: "Bosh sahifa",
      href: "/seller-panel/dashboard",
      icon: Home,
    },
    {
      name: "Mahsulotlar",
      href: "/seller-panel/products",
      icon: Package,
    },
    {
      name: "Yangi mahsulot",
      href: "/seller-panel/add-product",
      icon: Plus,
    },
    {
      name: "Buyurtmalar",
      href: "/seller-panel/orders",
      icon: ShoppingCart,
    },
    {
      name: "Mijozlar",
      href: "/seller-panel/customers",
      icon: Users,
    },
    {
      name: "Analitika",
      href: "/seller-panel/analytics",
      icon: BarChart3,
    },
    {
      name: "Sozlamalar",
      href: "/seller-panel/settings",
      icon: Settings,
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Sotuvchi paneli</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={switchToCustomer} className="text-blue-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Mijozga o'tish
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Sotuvchi</h2>
                    <p className="text-xs text-gray-500">Panel</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.company_name || user?.full_name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Sotuvchi
                    </Badge>
                    {user?.is_verified_seller && (
                      <Badge variant="default" className="text-xs bg-green-500">
                        Tasdiqlangan
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={switchToCustomer}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Mijozga o'tish
              </Button>
              <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Chiqish
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          {/* Desktop Header */}
          <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user?.company_name || user?.full_name} - Sotuvchi paneli
                </h1>
                <p className="text-gray-600">Biznesingizni boshqaring va rivojlantiring</p>
              </div>
              <Button
                variant="outline"
                onClick={switchToCustomer}
                className="text-blue-600 border-blue-200 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Mijozga o'tish
              </Button>
            </div>
          </div>

          {/* Page Content */}
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
