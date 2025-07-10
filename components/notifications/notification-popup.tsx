"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, X, CheckCircle, Package, ShoppingCart, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  data: any
  is_read: boolean
  created_at: string
}

interface NotificationPopupProps {
  userId: string
}

export default function NotificationPopup({ userId }: NotificationPopupProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (userId) {
      fetchNotifications()
      subscribeToNotifications()
    }
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.length || 0)

      // Show popup if there are unread notifications
      if (data && data.length > 0) {
        setShowPopup(true)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev.slice(0, 4)])
          setUnreadCount((prev) => prev + 1)
          setShowPopup(true)

          // Show toast notification
          toast(newNotification.title, {
            description: newNotification.message,
            action: {
              label: "Ko'rish",
              onClick: () => handleNotificationClick(newNotification),
            },
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false)

      setNotifications([])
      setUnreadCount(0)
      setShowPopup(false)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)

    // Navigate based on notification type
    switch (notification.type) {
      case "new_order":
        router.push("/seller-panel/orders")
        break
      case "order_agreed":
      case "product_delivered":
      case "product_not_delivered":
        router.push("/orders")
        break
      case "client_arrived":
      case "client_not_arrived":
        router.push("/seller-panel/orders")
        break
      default:
        break
    }

    setShowPopup(false)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return <ShoppingCart className="h-4 w-4 text-blue-600" />
      case "order_agreed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "product_delivered":
        return <Package className="h-4 w-4 text-green-600" />
      case "product_not_delivered":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "client_arrived":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case "client_not_arrived":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  if (!showPopup || notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-sm">
      <Card className="shadow-lg border-2 border-blue-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Yangi xabarlar</h3>
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPopup(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.created_at).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={markAllAsRead} className="flex-1">
              Barchasini o'qilgan deb belgilash
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/orders")}>
              Buyurtmalar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
