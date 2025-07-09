"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, Phone, MapPin } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ProfileData {
  full_name: string
  phone: string
  address: string
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    // Check if user just signed in and needs to complete profile
    const checkUserProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (currentUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("full_name, phone, address")
          .eq("id", currentUser.id)
          .single()

        if (!userData || !userData.full_name || !userData.phone || !userData.address) {
          setUser(currentUser)
          setShowProfileForm(true)
          setProfileData({
            full_name: userData?.full_name || currentUser.user_metadata?.full_name || "",
            phone: userData?.phone || currentUser.user_metadata?.phone || "",
            address: userData?.address || "",
          })
        } else {
          onClose()
          router.refresh()
        }
      }
    }

    if (isOpen) {
      checkUserProfile()
    }
  }, [isOpen, onClose, router])

  const handleGoogleAuth = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profileData.full_name.trim() || !profileData.phone.trim() || !profileData.address.trim()) {
      toast.error("Barcha maydonlar majburiy!")
      return
    }

    if (!user) return

    setLoading(true)

    try {
      // Update or create user profile
      const { error: upsertError } = await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: profileData.full_name.trim(),
        phone: profileData.phone.trim(),
        address: profileData.address.trim(),
        type: "email",
        created_at: new Date().toISOString(),
      })

      if (upsertError) throw upsertError

      // Update auth user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.full_name.trim(),
          phone: profileData.phone.trim(),
          address: profileData.address.trim(),
        },
      })

      if (updateError) throw updateError

      toast.success("Profil muvaffaqiyatli yaratildi!")
      setShowProfileForm(false)
      onClose()
      router.refresh()
    } catch (error: any) {
      console.error("Profile update error:", error)
      toast.error(error.message || "Profil yangilashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  if (showProfileForm) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold gradient-text">Profilingizni to'ldiring</DialogTitle>
            <p className="text-center text-gray-600">Davom etish uchun quyidagi ma'lumotlarni to'ldiring</p>
          </DialogHeader>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">To'liq ism *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  placeholder="Ism Familiya"
                  className="pl-10"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqam *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+998 90 123 45 67"
                  className="pl-10"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Manzil *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="address"
                  placeholder="Shahar, tuman, ko'cha, uy raqami"
                  className="pl-10 min-h-[80px]"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full btn-primary" disabled={loading}>
              {loading ? "Saqlanmoqda..." : "Profilni saqlash"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold gradient-text">
            GlobalMarket ga xush kelibsiz
          </DialogTitle>
          <p className="text-center text-gray-600">Davom etish uchun Google hisobingiz bilan kiring</p>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full bg-transparent h-12"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
            {loading ? "Yuklanmoqda..." : "Google orqali kirish"}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Kirish orqali siz bizning{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              Foydalanish shartlari
            </a>{" "}
            va{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Maxfiylik siyosati
            </a>
            ga rozilik bildirasiz
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
