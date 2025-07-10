"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bell, X, CheckCircle, AlertCircle, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchNotifications()

      // Set up real-time subscription
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
            setNotifications((prev) => [newNotification, ...prev])

            // Show popup for important notifications
            if (["order_agreed", "product_delivered", "new_order"].includes(newNotification.type)) {
              setSelectedNotification(newNotification)
              setShowPopup(true)
            }
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
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
        .limit(10)

      if (error) throw error

      setNotifications(data || [])

      // Show popup for the latest unread important notification
      const importantNotification = data?.find(
        (n) => ["order_agreed", "product_delivered"].includes(n.type) && !n.is_read,
      )

      if (importantNotification) {
        setSelectedNotification(importantNotification)
        setShowPopup(true)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleNotificationAction = async (notification: Notification) => {
    await markAsRead(notification.id)
    setShowPopup(false)
    setSelectedNotification(null)

    // Navigate based on notification type
    switch (notification.type) {
      case "order_agreed":
      case "product_delivered":
      case "product_not_delivered":
        router.push("/orders")
        break
      case "new_order":
        router.push("/seller-panel/orders")
        break
      default:
        break
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_agreed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "product_delivered":
        return <Package className="h-5 w-5 text-blue-600" />
      case "product_not_delivered":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "new_order":
        return <Bell className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "order_agreed":
        return "border-green-200 bg-green-50"
      case "product_delivered":
        return "border-blue-200 bg-blue-50"
      case "product_not_delivered":
        return "border-red-200 bg-red-50"
      case "new_order":
        return "border-purple-200 bg-purple-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  return (
    <>
      {/* Notification Bell Icon */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="icon"
            className="relative bg-white shadow-lg border-2 border-blue-200 hover:border-blue-300"
            onClick={() => setShowPopup(true)}
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                {notifications.length}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Notification Popup */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildirishnomalar
            </DialogTitle>
            <DialogDescription>
              {selectedNotification ? "Yangi bildirishnoma" : `${notifications.length} ta o'qilmagan bildirishnoma`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedNotification ? (
              <Card className={`border-2 ${getNotificationColor(selectedNotification.type)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(selectedNotification.type)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{selectedNotification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedNotification.message}</p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleNotificationAction(selectedNotification)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Davom etish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            markAsRead(selectedNotification.id)
                            setShowPopup(false)
                            setSelectedNotification(null)
                          }}
                        >
                          Yopish
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card key={notification.id} className={`border ${getNotificationColor(notification.type)}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => markAsRead(notification.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {!selectedNotification && notifications.length === 0 && (
            <div className="text-center py-8">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Bildirishnomalar yo'q</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
