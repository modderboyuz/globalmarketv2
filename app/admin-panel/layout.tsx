"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Home,
  Package,
  Users,
  FileText,
  Settings,
  BarChart3,
  ShoppingCart,
  Menu,
  X,
  Shield,
  Bell,
  Search,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AdminUser {
  id: string
  full_name: string
  email: string
  is_admin: boolean
}

const sidebarItems = [
  {
    title: "Bosh sahifa",
    href: "/admin-panel",
    icon: Home,
  },
  {
    title: "Mahsulotlar",
    href: "/admin-panel/products-management",
    icon: Package,
  },
  {
    title: "Buyurtmalar",
    href: "/admin-panel/orders",
    icon: ShoppingCart,
  },
  {
    title: "Foydalanuvchilar",
    href: "/admin-panel/users",
    icon: Users,
  },
  {
    title: "Arizalar",
    href: "/admin-panel/applications",
    icon: FileText,
  },
  {
    title: "Statistika",
    href: "/admin-panel/analytics",
    icon: BarChart3,
  },
  {
    title: "Sozlamalar",
    href: "/admin-panel/settings",
    icon: Settings,
  },
]

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState({
    pendingApplications: 0,
    newMessages: 0,
    newOrders: 0,
  })

  useEffect(() => {
    checkAdminAccess()
    fetchStats()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("id, full_name, email, is_admin")
        .eq("id", currentUser.id)
        .single()

      if (error || !userData?.is_admin) {
        toast.error("Admin huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
    } catch (error) {
      console.error("Admin access check error:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [applicationsResult, ordersResult] = await Promise.all([
        supabase.from("sell_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ])

      setStats({
        pendingApplications: applicationsResult.count || 0,
        newMessages: 0,
        newOrders: ordersResult.count || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Admin Panel</h2>
                    <p className="text-sm text-gray-500">GlobalMarket</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{user.full_name?.charAt(0) || user.email?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.full_name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                    {item.title === "Arizalar" && stats.pendingApplications > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {stats.pendingApplications}
                      </Badge>
                    )}
                    {item.title === "Buyurtmalar" && stats.newOrders > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {stats.newOrders}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>

            <Separator />

            {/* Footer */}
            <div className="p-4">
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  <Home className="h-4 w-4 mr-2" />
                  Bosh sahifaga qaytish
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <Suspense fallback={<div>Loading...</div>}>
            <div className="p-4 lg:p-8">{children}</div>
          </Suspense>
        </div>
      </div>
    </div>
  )
}
