"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, Info, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Products", icon: Package },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Phone },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      id="mobile-nav"
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t bg-white dark:bg-gray-900 md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
            pathname === href ? "text-gray-900 dark:text-gray-50" : "text-gray-500 dark:text-gray-400",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
