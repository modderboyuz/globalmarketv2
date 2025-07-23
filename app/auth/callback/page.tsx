"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth callback error:", error)
          toast.error("Kirish jarayonida xatolik yuz berdi")
          router.push("/login")
          return
        }

        if (data.session?.user) {
          const user = data.session.user

          // Check if user exists in our users table
          const { data: existingUser, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single()

          if (userError && userError.code !== "PGRST116") {
            console.error("Error checking user:", userError)
          }

          // If user doesn't exist, create them
          if (!existingUser) {
            const { error: insertError } = await supabase.from("users").insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
              phone: "+998958657500", // Default phone number
              address: "",
              type: "google",
              username: null,
              is_admin: false,
              is_verified_seller: false,
              created_at: new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
            })

            if (insertError) {
              console.error("Error creating user:", insertError)
              // Don't block login if user creation fails
            }
          } else {
            // Update last sign in time
            await supabase.from("users").update({ last_sign_in_at: new Date().toISOString() }).eq("id", user.id)
          }

          toast.success("Muvaffaqiyatli kirildi!")
          router.push("/")
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("Auth callback error:", error)
        toast.error("Kirish jarayonida xatolik yuz berdi")
        router.push("/login")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Kirish jarayoni...</p>
      </div>
    </div>
  )
}
