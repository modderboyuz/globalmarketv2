"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth callback error:", error)
          router.push("/login?error=auth_error")
          return
        }

        if (data.session?.user) {
          const user = data.session.user

          // Check if user exists in public.users table
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("id", user.id)
            .single()

          if (userError && userError.code === "PGRST116") {
            // User doesn't exist in public.users, create them
            const { error: createError } = await supabase.from("users").insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || "",
              phone: user.user_metadata?.phone || "",
              address: "",
              type: "google",
              is_seller: false,
              is_verified_seller: false,
              is_admin: false,
              created_at: new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
            })

            if (createError) {
              console.error("Error creating user:", createError)
            }
          }

          router.push("/")
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("Unexpected error:", error)
        router.push("/login?error=unexpected_error")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Tizimga kirilmoqda...</p>
      </div>
    </div>
  )
}
