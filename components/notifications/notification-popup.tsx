"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle, AlertCircle, Package, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  order_id?: string
  created_at: string
}

export function NotificationPopup() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        const unreadNotifications = data.notifications?.filter((n: Notification) => !n.is_read) || []
        setNotifications(unreadNotifications)

        // Show popup for newest unread notification
        if (unreadNotifications.length > 0 && !currentNotification) {
          setCurrentNotification(unreadNotifications[0])
          setShowDialog(true)
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId }),
      })

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const handleNotificationAction = async (action: "continue" | "dismiss") => {
    if (!currentNotification) return

    setLoading(true)

    try {
      await markAsRead(currentNotification.id)

      if (action === "continue") {
        if (
          currentNotification.type === "order_confirmed" ||
          currentNotification.type === "order_completed" ||
          currentNotification.type === "order_cancelled"
        ) {
          router.push("/orders")
        } else if (currentNotification.order_id) {
          router.push(`/orders?highlight=${currentNotification.order_id}`)
        }
      }

      setShowDialog(false)
      setCurrentNotification(null)
    } catch (error) {
      console.error("Failed to handle notification:", error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order":
      case "order_confirmed":
        return <Package className="h-5 w-5 text-blue-500" />
      case "order_completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "order_cancelled":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "client_arrived":
        return <ShoppingCart className="h-5 w-5 text-orange-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "order":
      case "order_confirmed":
        return "bg-blue-50 border-blue-200"
      case "order_completed":
        return "bg-green-50 border-green-200"
      case "order_cancelled":
        return "bg-red-50 border-red-200"
      case "client_arrived":
        return "bg-orange-50 border-orange-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  return (
    <>
      {/* Notification Badge */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <Badge variant="destructive" className="animate-pulse">
            {notifications.length} yangi xabar
          </Badge>
        </div>
      )}

      {/* Notification Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentNotification && getNotificationIcon(currentNotification.type)}
              {currentNotification?.title}
            </DialogTitle>
            <DialogDescription>{currentNotification?.message}</DialogDescription>
          </DialogHeader>

          {currentNotification && (
            <Card className={`${getNotificationColor(currentNotification.type)} border-2`}>
              <CardContent className="pt-4">
                <div className="text-sm text-gray-600">
                  {new Date(currentNotification.created_at).toLocaleString("uz-UZ")}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => handleNotificationAction("dismiss")} disabled={loading}>
              Yopish
            </Button>
            <Button onClick={() => handleNotificationAction("continue")} disabled={loading}>
              {loading ? "Yuklanmoqda..." : "Davom etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
