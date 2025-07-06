import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GlobalMarket - G'uzor tumani onlayn do'koni",
  description: "G'uzor tumanidagi eng yaxshi onlayn do'kon. Kitoblar, maktab va ofis buyumlari",
  keywords: "kitob, maktab buyumlari, ofis buyumlari, g'uzor, qashqadaryo, o'zbekiston",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <body className={inter.className}>
        <Header />
        <main className="pb-20 md:pb-0">{children}</main>
        <MobileNav />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
