"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  MessageCircle,
  User,
  MapPin,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Conversation {
  id: string
  product_id: string
  buyer_id: string
  seller_id: string
  status: string
  created_at: string
  updated_at: string
  products: {
    id: string
    name: string
    image_url: string
    price: number
  }
  buyer: {
    id: string
    full_name: string
    phone: string
  }
  seller: {
    id: string
    full_name: string
    company_name: string
    phone: string
    is_verified_seller: boolean
  }
  last_message?: {
    message: string
    created_at: string
    sender_id: string
  }
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  message_type: string
  metadata: any
  is_read: boolean
  created_at: string
  sender: {
    full_name: string
  }
}

interface OrderNotification {
  id: string
  order_id: string
  seller_id: string
  buyer_id: string
  status: string
  seller_response: string
  created_at: string
  orders: {
    id: string
    full_name: string
    phone: string
    address: string
    quantity: number
    total_amount: number
  }
}

export default function MessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [orderNotifications, setOrderNotifications] = useState<OrderNotification[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      markMessagesAsRead(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (user) {
      // Set up real-time subscription
      const channel = supabase
        .channel("messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            if (selectedConversation?.id === payload.new.conversation_id) {
              fetchMessages(selectedConversation.id)
            }
            fetchConversations(user.id)
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "order_notifications",
          },
          () => {
            fetchOrderNotifications(user.id)
            fetchConversations(user.id)
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, selectedConversation])

  const checkAuth = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      setUser(currentUser)
      await Promise.all([fetchConversations(currentUser.id), fetchOrderNotifications(currentUser.id)])
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          products (
            id,
            name,
            image_url,
            price
          ),
          buyer:users!conversations_buyer_id_fkey (
            id,
            full_name,
            phone
          ),
          seller:users!conversations_seller_id_fkey (
            id,
            full_name,
            company_name,
            phone,
            is_verified_seller
          )
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("updated_at", { ascending: false })

      if (error) throw error

      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("message, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          return {
            ...conv,
            last_message: lastMessage,
          }
        }),
      )

      setConversations(conversationsWithLastMessage)
    } catch (error) {
      console.error("Error fetching conversations:", error)
      toast.error("Suhbatlarni olishda xatolik")
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:users (
            full_name
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast.error("Xabarlarni olishda xatolik")
    }
  }

  const fetchOrderNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("order_notifications")
        .select(`
          *,
          orders (
            id,
            full_name,
            phone,
            address,
            quantity,
            total_amount
          )
        `)
        .eq("seller_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrderNotifications(data || [])
    } catch (error) {
      console.error("Error fetching order notifications:", error)
    }
  }

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return

    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !user) return

    setSending(true)

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        message: newMessage.trim(),
        message_type: "text",
      })

      if (error) throw error

      setNewMessage("")
      await fetchMessages(selectedConversation.id)
      await fetchConversations(user.id)
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Xabar yuborishda xatolik")
    } finally {
      setSending(false)
    }
  }

  const handleOrderResponse = async (notificationId: string, status: "approved" | "rejected", response?: string) => {
    try {
      const { error } = await supabase
        .from("order_notifications")
        .update({
          status,
          seller_response: response || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", notificationId)

      if (error) throw error

      toast.success(status === "approved" ? "Buyurtma tasdiqlandi!" : "Buyurtma rad etildi!")
      await fetchOrderNotifications(user.id)
    } catch (error) {
      console.error("Error handling order response:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price) + " so'm"
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text">Xabarlar</h1>
                <p className="text-gray-600 text-lg">Mijozlar va sotuvchilar bilan muloqot</p>
              </div>
            </div>
          </div>

          {/* Order Notifications for Sellers */}
          {orderNotifications.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Yangi buyurtmalar</h2>
              <div className="space-y-4">
                {orderNotifications.map((notification) => (
                  <Card key={notification.id} className="card-beautiful border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              <Package className="h-3 w-3 mr-1" />
                              Yangi buyurtma
                            </Badge>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Kutilmoqda
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span>
                                <strong>Mijoz:</strong> {notification.orders.full_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span>
                                <strong>Telefon:</strong> {notification.orders.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span>
                                <strong>Manzil:</strong> {notification.orders.address}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-500" />
                              <span>
                                <strong>Miqdor:</strong> {notification.orders.quantity} dona
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-600">
                                {formatPrice(notification.orders.total_amount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleOrderResponse(notification.id, "approved")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Rozi bo'lish
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOrderResponse(notification.id, "rejected", "Mahsulot mavjud emas")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rad etish
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
            {/* Conversations List */}
            <div className="lg:col-span-1">
              <Card className="card-beautiful h-full">
                <CardHeader>
                  <CardTitle>Suhbatlar ({conversations.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {conversations.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Hali suhbatlar yo'q</p>
                        <p className="text-sm text-gray-500 mt-2">Mahsulot sotib olganingizda suhbat boshlanadi</p>
                      </div>
                    ) : (
                      conversations.map((conversation) => {
                        const otherUser = conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer
                        const isSelected = selectedConversation?.id === conversation.id

                        return (
                          <div
                            key={conversation.id}
                            onClick={() => setSelectedConversation(conversation)}
                            className={`p-4 cursor-pointer transition-colors duration-200 border-b border-gray-100 hover:bg-gray-50 ${
                              isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src="/placeholder-user.jpg" />
                                <AvatarFallback>
                                  {otherUser.full_name?.charAt(0) || otherUser.company_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium text-sm truncate">
                                    {otherUser.company_name || otherUser.full_name}
                                  </h4>
                                  {conversation.last_message && (
                                    <span className="text-xs text-gray-500">
                                      {formatTime(conversation.last_message.created_at)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 relative rounded-lg overflow-hidden bg-gray-100">
                                    <Image
                                      src={conversation.products.image_url || "/placeholder.svg"}
                                      alt={conversation.products.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-600 truncate">{conversation.products.name}</p>
                                    <p className="text-xs text-blue-600 font-medium">
                                      {formatPrice(conversation.products.price)}
                                    </p>
                                  </div>
                                </div>

                                {conversation.last_message && (
                                  <p className="text-sm text-gray-600 truncate">
                                    {conversation.last_message.sender_id === user?.id ? "Siz: " : ""}
                                    {conversation.last_message.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {selectedConversation ? (
                <Card className="card-beautiful h-full flex flex-col">
                  {/* Chat Header */}
                  <CardHeader className="border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>

                      <Avatar className="w-10 h-10">
                        <AvatarImage src="/placeholder-user.jpg" />
                        <AvatarFallback>
                          {(selectedConversation.buyer_id === user?.id
                            ? selectedConversation.seller
                            : selectedConversation.buyer
                          ).full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {selectedConversation.buyer_id === user?.id
                            ? selectedConversation.seller.company_name || selectedConversation.seller.full_name
                            : selectedConversation.buyer.full_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Package className="h-3 w-3" />
                          <span className="truncate">{selectedConversation.products.name}</span>
                        </div>
                      </div>

                      {/* Contact buttons for approved orders */}
                      {selectedConversation.buyer_id !== user?.id && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${selectedConversation.buyer.phone}`)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`sms:${selectedConversation.buyer.phone}`)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user?.id
                      return (
                        <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? "bg-blue-600 text-white rounded-br-md"
                                  : "bg-gray-200 text-gray-800 rounded-bl-md"
                              }`}
                            >
                              <p className="text-sm">{message.message}</p>
                              {message.metadata && message.message_type === "order_notification" && (
                                <div className="mt-2 text-xs opacity-75">
                                  <p>Miqdor: {message.metadata.quantity}</p>
                                  <p>Summa: {formatPrice(message.metadata.total_amount)}</p>
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 p-4">
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Xabar yozing..."
                        className="flex-1 rounded-2xl"
                        disabled={sending}
                      />
                      <Button type="submit" disabled={sending || !newMessage.trim()} className="rounded-2xl px-6">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </Card>
              ) : (
                <Card className="card-beautiful h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Suhbatni tanlang</h3>
                    <p className="text-gray-600">Xabar almashuv uchun chap tarafdan suhbatni tanlang</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
