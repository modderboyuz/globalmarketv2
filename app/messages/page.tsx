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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Package,
  Clock,
  XCircle,
  Phone,
  MessageCircle,
  Plus,
  Search,
  Mail,
  AtSign,
  UserPlus,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Conversation {
  id: string
  type: string
  title: string
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
    username: string
  }
  seller: {
    id: string
    full_name: string
    company_name: string
    phone: string
    username: string
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
  reply_to: string
  created_at: string
  sender: {
    full_name: string
  }
  reply_message?: {
    message: string
    sender: {
      full_name: string
    }
  }
}

interface AdminMessage {
  id: string
  type: string
  title: string
  content: string
  data: any
  status: string
  priority: string
  admin_response: string
  created_by: string
  created_at: string
  users: {
    full_name: string
    email: string
    phone: string
    username: string
  }
}

export default function MessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [selectedAdminMessage, setSelectedAdminMessage] = useState<AdminMessage | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [adminResponse, setAdminResponse] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [activeTab, setActiveTab] = useState("conversations")
  const [showCreateChat, setShowCreateChat] = useState(false)
  const [searchType, setSearchType] = useState<"phone" | "email" | "username">("phone")
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedMessageType, setSelectedMessageType] = useState<string>("all")
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
            table: "admin_messages",
          },
          () => {
            if (user.is_admin) {
              fetchAdminMessages()
            }
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

      const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single()
      setUser(userData)

      await Promise.all([fetchConversations(currentUser.id), userData?.is_admin && fetchAdminMessages()])
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
            phone,
            username
          ),
          seller:users!conversations_seller_id_fkey (
            id,
            full_name,
            company_name,
            phone,
            username,
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

  const fetchAdminMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_messages")
        .select(`
          *,
          users:created_by (
            full_name,
            email,
            phone,
            username
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAdminMessages(data || [])
    } catch (error) {
      console.error("Error fetching admin messages:", error)
      toast.error("Admin xabarlarni olishda xatolik")
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
          ),
          reply_message:messages!messages_reply_to_fkey (
            message,
            sender:users (
              full_name
            )
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
      const messageData: any = {
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        message: newMessage.trim(),
        message_type: "text",
      }

      if (replyingTo) {
        messageData.reply_to = replyingTo.id
      }

      const { error } = await supabase.from("messages").insert(messageData)

      if (error) throw error

      setNewMessage("")
      setReplyingTo(null)
      await fetchMessages(selectedConversation.id)
      await fetchConversations(user.id)
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Xabar yuborishda xatolik")
    } finally {
      setSending(false)
    }
  }

  const sendAdminResponse = async (messageId: string) => {
    if (!adminResponse.trim()) return

    try {
      const { error } = await supabase
        .from("admin_messages")
        .update({
          admin_response: adminResponse.trim(),
          status: "completed",
          handled_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId)

      if (error) throw error

      toast.success("Javob yuborildi")
      setAdminResponse("")
      setSelectedAdminMessage(null)
      await fetchAdminMessages()
    } catch (error) {
      console.error("Error sending admin response:", error)
      toast.error("Javob yuborishda xatolik")
    }
  }

  const searchUsers = async () => {
    if (!searchValue.trim()) return

    try {
      let query = supabase.from("users").select("id, full_name, username, phone, email, company_name")

      switch (searchType) {
        case "phone":
          query = query.ilike("phone", `%${searchValue}%`)
          break
        case "email":
          query = query.ilike("email", `%${searchValue}%`)
          break
        case "username":
          query = query.ilike("username", `%${searchValue}%`)
          break
      }

      const { data, error } = await query.limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error("Error searching users:", error)
      toast.error("Qidirishda xatolik")
    }
  }

  const createConversation = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          type: "direct",
          buyer_id: user.id,
          seller_id: otherUserId,
          status: "active",
        })
        .select()
        .single()

      if (error) throw error

      toast.success("Suhbat yaratildi")
      setShowCreateChat(false)
      setSearchValue("")
      setSearchResults([])
      await fetchConversations(user.id)
      setSelectedConversation(data)
    } catch (error) {
      console.error("Error creating conversation:", error)
      toast.error("Suhbat yaratishda xatolik")
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

  const getMessageTypeText = (type: string) => {
    const types: Record<string, string> = {
      system_message: "Tizim xabari",
      contact: "Murojaat",
      sell_request: "Sotish so'rovi",
    }
    return types[type] || "Xabar"
  }

  const getMessageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      system_message: "bg-blue-100 text-blue-800",
      contact: "bg-green-100 text-green-800",
      sell_request: "bg-purple-100 text-purple-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  const filteredAdminMessages =
    selectedMessageType === "all" ? adminMessages : adminMessages.filter((msg) => msg.type === selectedMessageType)

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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conversations" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Suhbatlar ({conversations.length})
              </TabsTrigger>
              {user?.is_admin && (
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Admin xabarlar ({adminMessages.filter((m) => m.status === "pending").length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Conversations Tab */}
            <TabsContent value="conversations" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
                {/* Conversations List */}
                <div className="lg:col-span-1">
                  <Card className="card-beautiful h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Suhbatlar</CardTitle>
                      <Dialog open={showCreateChat} onOpenChange={setShowCreateChat}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="rounded-full">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Yangi suhbat yaratish</DialogTitle>
                            <DialogDescription>Foydalanuvchini qidiring va suhbat boshlang</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <Button
                                variant={searchType === "phone" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSearchType("phone")}
                              >
                                <Phone className="h-4 w-4 mr-1" />
                                Telefon
                              </Button>
                              <Button
                                variant={searchType === "email" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSearchType("email")}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Email
                              </Button>
                              <Button
                                variant={searchType === "username" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSearchType("username")}
                              >
                                <AtSign className="h-4 w-4 mr-1" />
                                Username
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder={`${searchType === "phone" ? "Telefon raqam" : searchType === "email" ? "Email manzil" : "Username"} kiriting...`}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                              />
                              <Button onClick={searchUsers}>
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                            {searchResults.length > 0 && (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {searchResults.map((result) => (
                                  <div
                                    key={result.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                  >
                                    <div>
                                      <p className="font-medium">{result.full_name}</p>
                                      <p className="text-sm text-gray-500">@{result.username}</p>
                                      {result.company_name && (
                                        <p className="text-sm text-blue-600">{result.company_name}</p>
                                      )}
                                    </div>
                                    <Button size="sm" onClick={() => createConversation(result.id)}>
                                      <UserPlus className="h-4 w-4 mr-1" />
                                      Qo'shish
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {conversations.length === 0 ? (
                          <div className="text-center py-8 px-4">
                            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Hali suhbatlar yo'q</p>
                            <p className="text-sm text-gray-500 mt-2">Yangi suhbat yaratish uchun + tugmasini bosing</p>
                          </div>
                        ) : (
                          conversations.map((conversation) => {
                            const otherUser =
                              conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer
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

                                    {conversation.products && (
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
                                    )}

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
                      <CardHeader className="border-b border-gray-200 flex-shrink-0">
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
                            {selectedConversation.products && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Package className="h-3 w-3" />
                                <span className="truncate">{selectedConversation.products.name}</span>
                              </div>
                            )}
                          </div>

                          {/* Contact buttons */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                window.open(
                                  `tel:${
                                    selectedConversation.buyer_id === user?.id
                                      ? selectedConversation.seller.phone
                                      : selectedConversation.buyer.phone
                                  }`,
                                )
                              }
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => {
                          const isOwn = message.sender_id === user?.id
                          return (
                            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
                                {message.reply_to && message.reply_message && (
                                  <div className="mb-2 p-2 bg-gray-100 rounded-lg text-sm">
                                    <p className="text-gray-600 text-xs">
                                      Javob: {message.reply_message.sender.full_name}
                                    </p>
                                    <p className="text-gray-800">{message.reply_message.message}</p>
                                  </div>
                                )}
                                <div
                                  className={`px-4 py-2 rounded-2xl cursor-pointer ${
                                    isOwn
                                      ? "bg-blue-600 text-white rounded-br-md"
                                      : "bg-gray-200 text-gray-800 rounded-bl-md"
                                  }`}
                                  onDoubleClick={() => setReplyingTo(message)}
                                >
                                  <p className="text-sm">{message.message}</p>
                                </div>
                                <div
                                  className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
                                >
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Reply indicator */}
                      {replyingTo && (
                        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
                          <div className="text-sm">
                            <p className="text-blue-600 font-medium">Javob: {replyingTo.sender.full_name}</p>
                            <p className="text-gray-600 truncate">{replyingTo.message}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Message Input */}
                      <div className="border-t border-gray-200 p-4 flex-shrink-0">
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
            </TabsContent>

            {/* Admin Messages Tab */}
            {user?.is_admin && (
              <TabsContent value="admin" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
                  {/* Admin Messages List */}
                  <div className="lg:col-span-1">
                    <Card className="card-beautiful h-full">
                      <CardHeader>
                        <CardTitle>Admin Xabarlar</CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={selectedMessageType === "all" ? "default" : "outline"}
                            onClick={() => setSelectedMessageType("all")}
                          >
                            Barchasi
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedMessageType === "system_message" ? "default" : "outline"}
                            onClick={() => setSelectedMessageType("system_message")}
                          >
                            Tizim
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedMessageType === "contact" ? "default" : "outline"}
                            onClick={() => setSelectedMessageType("contact")}
                          >
                            Murojaat
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedMessageType === "sell_request" ? "default" : "outline"}
                            onClick={() => setSelectedMessageType("sell_request")}
                          >
                            Sotish
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                          {filteredAdminMessages.length === 0 ? (
                            <div className="text-center py-8 px-4">
                              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600">Xabarlar yo'q</p>
                            </div>
                          ) : (
                            filteredAdminMessages.map((message) => {
                              const isSelected = selectedAdminMessage?.id === message.id

                              return (
                                <div
                                  key={message.id}
                                  onClick={() => setSelectedAdminMessage(message)}
                                  className={`p-4 cursor-pointer transition-colors duration-200 border-b border-gray-100 hover:bg-gray-50 ${
                                    isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                                  }`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Badge className={getMessageTypeColor(message.type)}>
                                        {getMessageTypeText(message.type)}
                                      </Badge>
                                      <Badge
                                        variant={
                                          message.status === "pending"
                                            ? "destructive"
                                            : message.status === "completed"
                                              ? "default"
                                              : "secondary"
                                        }
                                      >
                                        {message.status === "pending"
                                          ? "Kutilmoqda"
                                          : message.status === "completed"
                                            ? "Bajarilgan"
                                            : "Jarayonda"}
                                      </Badge>
                                    </div>
                                    <h4 className="font-semibold text-sm">{message.title}</h4>
                                    <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                                    <div className="text-xs text-gray-500">
                                      {message.users?.full_name} • {formatTime(message.created_at)}
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

                  {/* Admin Message Detail */}
                  <div className="lg:col-span-2">
                    {selectedAdminMessage ? (
                      <Card className="card-beautiful h-full flex flex-col">
                        <CardHeader className="border-b border-gray-200 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{selectedAdminMessage.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getMessageTypeColor(selectedAdminMessage.type)}>
                                  {getMessageTypeText(selectedAdminMessage.type)}
                                </Badge>
                                <span className="text-sm text-gray-500">{selectedAdminMessage.users?.full_name}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="lg:hidden"
                              onClick={() => setSelectedAdminMessage(null)}
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {/* Message Content */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-800">{selectedAdminMessage.content}</p>
                          </div>

                          {/* Message Data */}
                          {selectedAdminMessage.data && Object.keys(selectedAdminMessage.data).length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                              <h4 className="font-semibold text-blue-800 mb-2">Qo'shimcha ma'lumotlar:</h4>
                              <div className="space-y-2 text-sm">
                                {selectedAdminMessage.type === "contact" && (
                                  <>
                                    {selectedAdminMessage.data.name && (
                                      <p>
                                        <strong>Ism:</strong> {selectedAdminMessage.data.name}
                                      </p>
                                    )}
                                    {selectedAdminMessage.data.phone && (
                                      <div className="flex items-center gap-2">
                                        <strong>Telefon:</strong> {selectedAdminMessage.data.phone}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(`tel:${selectedAdminMessage.data.phone}`)}
                                        >
                                          <Phone className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                )}
                                {selectedAdminMessage.type === "sell_request" && (
                                  <>
                                    {selectedAdminMessage.data.product_name && (
                                      <p>
                                        <strong>Mahsulot:</strong> {selectedAdminMessage.data.product_name}
                                      </p>
                                    )}
                                    {selectedAdminMessage.data.price && (
                                      <p>
                                        <strong>Narx:</strong> {formatPrice(selectedAdminMessage.data.price)}
                                      </p>
                                    )}
                                    {selectedAdminMessage.data.location && (
                                      <p>
                                        <strong>Joylashuv:</strong> {selectedAdminMessage.data.location}
                                      </p>
                                    )}
                                    {selectedAdminMessage.data.contact_phone && (
                                      <div className="flex items-center gap-2">
                                        <strong>Telefon:</strong> {selectedAdminMessage.data.contact_phone}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(`tel:${selectedAdminMessage.data.contact_phone}`)}
                                        >
                                          <Phone className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                )}
                                {selectedAdminMessage.type === "system_message" &&
                                  selectedAdminMessage.data.user_id && (
                                    <p>
                                      <strong>Foydalanuvchi ID:</strong> {selectedAdminMessage.data.user_id}
                                    </p>
                                  )}
                              </div>
                            </div>
                          )}

                          {/* Admin Response */}
                          {selectedAdminMessage.admin_response && (
                            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                              <h4 className="font-semibold text-green-800 mb-2">Admin javobi:</h4>
                              <p className="text-green-700">{selectedAdminMessage.admin_response}</p>
                            </div>
                          )}
                        </div>

                        {/* Response Input */}
                        {selectedAdminMessage.status === "pending" && (
                          <div className="border-t border-gray-200 p-4 flex-shrink-0">
                            <div className="space-y-3">
                              <Input
                                value={adminResponse}
                                onChange={(e) => setAdminResponse(e.target.value)}
                                placeholder="Javobingizni yozing..."
                                className="rounded-2xl"
                              />
                              <Button
                                onClick={() => sendAdminResponse(selectedAdminMessage.id)}
                                disabled={!adminResponse.trim()}
                                className="w-full rounded-2xl"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Javob yuborish
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    ) : (
                      <Card className="card-beautiful h-full flex items-center justify-center">
                        <div className="text-center">
                          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">Xabarni tanlang</h3>
                          <p className="text-gray-600">Javob berish uchun chap tarafdan xabarni tanlang</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
