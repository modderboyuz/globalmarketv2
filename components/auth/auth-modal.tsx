"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (error) throw error
        toast.success("Muvaffaqiyatli kirildi!")
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              address: formData.address,
            },
          },
        })
        if (error) throw error
        toast.success("Ro'yxatdan o'tish muvaffaqiyatli! Email orqali tasdiqlang.")
      }
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || "Google orqali kirish xatoligi")
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Email manzilini kiriting")
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email)
      if (error) throw error
      toast.success("Parolni tiklash uchun email yuborildi")
      setShowForgotPassword(false)
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold gradient-text">
            {showForgotPassword ? "Parolni tiklash" : isLogin ? "Hisobingizga kiring" : "Ro'yxatdan o'ting"}
          </DialogTitle>
        </DialogHeader>

        {showForgotPassword ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email manzil</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleForgotPassword} className="w-full btn-primary">
              Parolni tiklash
            </Button>
            <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="w-full">
              Orqaga qaytish
            </Button>
          </div>
        ) : (
          <>
            {/* iOS Style Toggle */}
            <div className="flex bg-muted rounded-lg p-1 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  isLogin ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Kirish
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  !isLogin ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ro'yxat
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">To'liq ism</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="Ism Familiya"
                        className="pl-10"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon raqam</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+998 90 123 45 67"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Manzil</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        placeholder="Shahar, tuman, ko'cha"
                        className="pl-10"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email manzil</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Parol</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Parolni unutdingizmi?
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full btn-primary" disabled={loading}>
                {loading ? "Kuting..." : isLogin ? "Kirish" : "Ro'yxatdan o'tish"}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="space-y-3">
              <Button variant="outline" className="w-full bg-transparent" onClick={handleGoogleAuth}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google orqali
              </Button>

              <Button variant="outline" className="w-full bg-transparent">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 3.605-2.068 4.777-1.172 1.172-2.92 1.899-4.777 2.068C9.33 15.135 8.2 14.906 7.4 14.106c-.8-.8-1.029-1.93-.899-3.323.169-1.858.896-3.605 2.068-4.777C9.741 4.834 11.489 4.107 13.347 3.938c1.393-.13 2.523.099 3.323.899.8.8 1.029 1.93.898 3.323z" />
                </svg>
                Modderid orqali
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
