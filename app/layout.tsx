import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import Header from "@/components/layout/header"
import MobileNav from "@/components/layout/mobile-nav"
import { ThemeProvider } from "@/components/theme-provider"
import "@/app/globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GlobalMarket",
  description: "Modern e-commerce marketplace",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-white dark:bg-gray-950")}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          <main className="container pb-20 pt-6">{children}</main>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  )
}
