"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        router.push("/")
      }
    }
    checkUser()
  }, [router])

  const handleGoogleLogin = async () => {
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
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl pulse-glow">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">GlobalMarket ga kirish</CardTitle>
            <p className="text-gray-600">Google hisobingiz bilan tizimga kiring</p>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full bg-transparent h-12 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300"
                onClick={handleGoogleLogin}
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
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  "Google orqali kirish"
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Kirish orqali siz bizning{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Foydalanish shartlari
                </Link>{" "}
                va{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Maxfiylik siyosati
                </Link>
                ga rozilik bildirasiz
              </p>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-gray-100">
              <div className="text-center text-sm text-gray-500">
                <p>Hisobingiz yo'qmi?</p>
                <p className="mt-2">Google orqali kirish avtomatik ravishda hisob yaratadi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
