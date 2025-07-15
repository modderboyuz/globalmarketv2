"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  Package,
  Users,
  FileText,
  ShoppingCart,
  Menu,
  X,
  Shield,
  Bell,
  LogOut,
  Store,
  UserCheck,
  Megaphone,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AdminUser {
  id: string
  full_name: string
  email: string
  is_admin: boolean
  avatar_url?: string
}

const sidebarItems = [
  {
    title: "Bosh sahifa",
    href: "/admin-panel",
    icon: Home,
  },
  {
    title: "Mahsulotlar",
    icon: Package,
    children: [
      {
        title: "GlobalMarket mahsulotlari",
        href: "/admin-panel/products/globalmarket",
        icon: Package,
      },
      {
        title: "Boshqa sotuvchilar",
        href: "/admin-panel/products/others",
        icon: Store,
      },
    ],
  },
  {
    title: "Buyurtmalar",
    icon: ShoppingCart,
    children: [
      {
        title: "GlobalMarket buyurtmalari",
        href: "/admin-panel/orders/globalmarket",
        icon: ShoppingCart,
      },
      {
        title: "Boshqa sotuvchilarga",
        href: "/admin-panel/orders/others",
        icon: Store,
      },
    ],
  },
  {
    title: "Foydalanuvchilar",
    icon: Users,
    children: [
      {
        title: "Barchasini boshqarish",
        href: "/admin-panel/users",
        icon: Users,
      },
      {
        title: "Sotuvchilarni boshqarish",
        href: "/admin-panel/users/sellers",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "Arizalar",
    href: "/admin-panel/applications",
    icon: FileText,
  },
  {
    title: "Reklamalar",
    href: "/admin-panel/ads",
    icon: Megaphone,
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
  const [expandedItems, setExpandedItems] = useState<string[]>([])
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
        .select("id, full_name, email, is_admin, avatar_url")
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
        supabase.from("seller_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-3 w-3 text-white" />
            </div>
            <h1 className="font-bold text-lg">Admin Panel</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {stats.pendingApplications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs">
                {stats.pendingApplications}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-7 w-7 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name} />
                  <AvatarFallback className="text-xs">
                    {user.full_name?.charAt(0) || user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">{user.full_name}</p>
                  <p className="w-[200px] truncate text-xs text-muted-foreground">{user.email}</p>
                  <Badge variant="destructive" className="text-xs w-fit">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Bosh sahifaga qaytish</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Chiqish</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Top Bar */}
      <div className="hidden lg:block bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-bold text-xl">Admin Panel</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {stats.pendingApplications > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {stats.pendingApplications}
                </Badge>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name} />
                    <AvatarFallback className="text-xs">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="w-[200px] truncate text-xs text-muted-foreground">{user.email}</p>
                    <Badge variant="destructive" className="text-xs w-fit">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Bosh sahifaga qaytish</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Chiqish</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${typeof window !== "undefined" && window.innerWidth < 1024 ? "mt-[57px]" : ""}`}
        >
          <div className="flex flex-col h-full pt-4">
            {/* Close button for mobile */}
            <div className="flex justify-end px-4 lg:hidden mb-4">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {sidebarItems.map((item) => {
                const isExpanded = expandedItems.includes(item.title)
                const hasChildren = item.children && item.children.length > 0

                if (hasChildren) {
                  return (
                    <div key={item.title}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left text-sm"
                        onClick={() => toggleExpanded(item.title)}
                      >
                        <item.icon className="h-4 w-4 mr-3" />
                        <span className="flex-1">{item.title}</span>
                        <span className={`transform transition-transform text-xs ${isExpanded ? "rotate-90" : ""}`}>
                          ▶
                        </span>
                      </Button>
                      {isExpanded && (
                        <div className="ml-6 space-y-1 mt-1">
                          {item.children.map((child) => {
                            const isActive = pathname === child.href
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                <child.icon className="h-3 w-3" />
                                <span>{child.title}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

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
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.title === "Arizalar" && stats.pendingApplications > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {stats.pendingApplications}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
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
