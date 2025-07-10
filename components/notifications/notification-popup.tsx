"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface NotificationPopupProps {
  /**
   * Current authenticated user id.
   */
  userId: string
}

/**
 * Subscribes to the `notifications` table for INSERT events for the given user
 * and displays the payload in a toast.  Unsubscribes automatically when the
 * component unmounts.
 */
export default function NotificationPopup({ userId }: NotificationPopupProps) {
  useEffect(() => {
    if (!userId) return

    // Helper – render a toast
    const showToast = (title: string, message?: string) => {
      toast.custom(
        () => (
          <div className="rounded-lg bg-white shadow-lg ring-1 ring-gray-200 p-4 max-w-sm">
            <p className="font-semibold">{title}</p>
            {message && <p className="text-sm text-gray-600 mt-1">{message}</p>}
          </div>
        ),
        { duration: 8000 },
      )
    }

    // Fetch last 5 unread notifications on first load
    void (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5)

      data?.forEach((n) => showToast(n.title, n.message))
    })()

    // Subscribe to real-time inserts for this user
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as { title: string; message?: string }
          showToast(n.title, n.message)
        },
      )
      .subscribe()

    // Cleanup
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  // Invisible component
  return null
}
