"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, MessageSquare, Send, ThumbsUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Comment {
  id: string
  comment: string
  rating: number
  created_at: string
  users: {
    full_name: string
    avatar_url: string
  }
}

interface ProductCommentsProps {
  productId: string
  averageRating: number
  commentCount: number
}

export function ProductComments({ productId, averageRating, commentCount }: ProductCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [newRating, setNewRating] = useState(5)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkUser()
    fetchComments()
  }, [productId])

  const checkUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      setUser(currentUser)
    } catch (error) {
      console.error("Error checking user:", error)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("product_comments")
        .select(`
          id,
          comment,
          rating,
          created_at,
          users (
            full_name,
            avatar_url
          )
        `)
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("Izoh qoldirish uchun tizimga kiring")
      return
    }

    if (!newComment.trim()) {
      toast.error("Izoh matnini kiriting")
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase.from("product_comments").insert({
        product_id: productId,
        user_id: user.id,
        comment: newComment.trim(),
        rating: newRating,
        is_approved: true,
      })

      if (error) throw error

      toast.success("Izoh muvaffaqiyatli qo'shildi!")
      setNewComment("")
      setNewRating(5)
      await fetchComments()
    } catch (error: any) {
      console.error("Error submitting comment:", error)
      toast.error("Izoh qo'shishda xatolik yuz berdi")
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRatingChange?.(star)}
            className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
            disabled={!interactive}
          >
            <Star
              className={`h-4 w-4 ${
                star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card className="card-beautiful">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Izohlar va baholar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{averageRating.toFixed(1)}</div>
              {renderStars(Math.round(averageRating))}
              <div className="text-sm text-gray-600 mt-1">{commentCount} ta izoh</div>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = comments.filter((c) => c.rating === star).length
                const percentage = commentCount > 0 ? (count / commentCount) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 mb-1">
                    <span className="text-sm w-8">{star}</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Comment Form */}
      {user && (
        <Card className="card-beautiful">
          <CardHeader>
            <CardTitle>Izoh qoldiring</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitComment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Baho bering</label>
                {renderStars(newRating, true, setNewRating)}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Izohingiz</label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Mahsulot haqida fikringizni yozing..."
                  className="min-h-[100px] rounded-2xl"
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Yuborilmoqda...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Izoh yuborish
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="card-beautiful">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/6" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <Card className="card-beautiful">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Hali izohlar yo'q</h3>
              <p className="text-gray-600">Bu mahsulot uchun birinchi izoh qoldiring!</p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="card-beautiful">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={comment.users.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>{comment.users.full_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{comment.users.full_name || "Foydalanuvchi"}</h4>
                        <div className="flex items-center gap-2">
                          {renderStars(comment.rating)}
                          <span className="text-sm text-gray-600">{formatDate(comment.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 leading-relaxed">{comment.comment}</p>

                    <div className="flex items-center gap-4 mt-4">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Foydali
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
