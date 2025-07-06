"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, ArrowLeft, BookOpen, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      toast.success("Muvaffaqiyatli kirildi!")
      router.push("/")
    } catch (error: any) {
      toast.error(error.message || "Kirish jarayonida xatolik")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-6 hover:bg-white/20 text-gray-700 border-2 border-transparent hover:border-gray-300 rounded-2xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Bosh sahifaga qaytish
        </Button>

        <Card className="card-beautiful">
          <CardHeader className="text-center pb-6">
            <div className="floating-animation mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl pulse-glow">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">Hisobingizga kiring</CardTitle>
            <p className="text-gray-600">GlobalMarket'ga xush kelibsiz</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email manzil
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className="input-beautiful pl-12"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Parol
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Parolingizni kiriting"
                    className="input-beautiful pl-12 pr-12"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8 hover:bg-gray-100 rounded-xl"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Parolni unutdingizmi?
                </Link>
              </div>

              <Button type="submit" className="w-full btn-primary text-lg py-4" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kirish...
                  </>
                ) : (
                  "Kirish"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Hisobingiz yo'qmi?{" "}
                <Link
                  href="/register"
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                  Ro'yxatdan o'ting
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-gray-100">
              <div className="text-center text-sm text-gray-500">
                <p>Kirish orqali siz bizning</p>
                <div className="flex justify-center gap-2 mt-1">
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Foydalanish shartlari
                  </Link>
                  <span>va</span>
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Maxfiylik siyosati
                  </Link>
                </div>
                <p>ga rozilik bildirasiz</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
