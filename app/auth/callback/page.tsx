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
          router.push("/?error=auth_failed")
          return
        }

        if (data.session?.user) {
          // Check if user profile is complete
          const { data: userData } = await supabase
            .from("users")
            .select("full_name, phone, address")
            .eq("id", data.session.user.id)
            .single()

          if (!userData || !userData.full_name || !userData.phone || !userData.address) {
            // Profile incomplete, redirect to home with auth modal
            router.push("/?auth=profile_required")
          } else {
            // Profile complete, redirect to home
            router.push("/")
          }
        } else {
          router.push("/")
        }
      } catch (error) {
        console.error("Auth callback error:", error)
        router.push("/?error=auth_failed")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Kirish jarayoni...</p>
      </div>
    </div>
  )
}
