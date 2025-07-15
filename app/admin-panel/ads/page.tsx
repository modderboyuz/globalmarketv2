"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Eye, BarChart3, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Ad {
  id: string
  title: string
  description: string
  image_url: string
  link_url: string
  is_active: boolean
  click_count: number
  created_at: string
  expires_at: string | null
}

export default function AdsManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    is_active: true,
    expires_at: "",
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push("/login")
        return
      }

      const { data: userData, error } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

      if (error || !userData?.is_admin) {
        toast.error("Admin huquqi yo'q")
        router.push("/")
        return
      }

      setUser(userData)
      await fetchAds()
    } catch (error) {
      console.error("Admin access check error:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase.from("ads").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setAds(data || [])
    } catch (error) {
      console.error("Error fetching ads:", error)
      toast.error("Reklamalarni olishda xatolik")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingAd) {
        // Update existing ad
        const { error } = await supabase
          .from("ads")
          .update({
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url,
            link_url: formData.link_url,
            is_active: formData.is_active,
            expires_at: formData.expires_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAd.id)

        if (error) throw error
        toast.success("Reklama yangilandi!")
      } else {
        // Create new ad
        const { error } = await supabase.from("ads").insert({
          title: formData.title,
          description: formData.description,
          image_url: formData.image_url,
          link_url: formData.link_url,
          is_active: formData.is_active,
          expires_at: formData.expires_at || null,
        })

        if (error) throw error
        toast.success("Reklama qo'shildi!")
      }

      setShowDialog(false)
      setEditingAd(null)
      setFormData({
        title: "",
        description: "",
        image_url: "",
        link_url: "",
        is_active: true,
        expires_at: "",
      })
      await fetchAds()
    } catch (error) {
      console.error("Error saving ad:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad)
    setFormData({
      title: ad.title,
      description: ad.description || "",
      image_url: ad.image_url,
      link_url: ad.link_url,
      is_active: ad.is_active,
      expires_at: ad.expires_at ? ad.expires_at.split("T")[0] : "",
    })
    setShowDialog(true)
  }

  const handleDelete = async (adId: string) => {
    if (!confirm("Reklamani o'chirishni tasdiqlaysizmi?")) return

    try {
      const { error } = await supabase.from("ads").delete().eq("id", adId)

      if (error) throw error
      toast.success("Reklama o'chirildi!")
      await fetchAds()
    } catch (error) {
      console.error("Error deleting ad:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const toggleAdStatus = async (adId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("ads").update({ is_active: !currentStatus }).eq("id", adId)

      if (error) throw error
      toast.success(`Reklama ${!currentStatus ? "faollashtirildi" : "o'chirildi"}!`)
      await fetchAds()
    } catch (error) {
      console.error("Error toggling ad status:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="card-beautiful">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Reklamalar boshqaruvi</h2>
          <p className="text-gray-600">Sayt reklamalarini boshqaring</p>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Yangi reklama
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAd ? "Reklamani tahrirlash" : "Yangi reklama qo'shish"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Sarlavha *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Reklama sarlavhasi"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link_url">Havola *</Label>
                  <Input
                    id="link_url"
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Tavsif</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Reklama tavsifi"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Rasm URL *</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                />
                <p className="text-xs text-gray-500">Tavsiya etilgan o'lcham: 800x200px</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Tugash sanasi</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Faol</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false)
                    setEditingAd(null)
                    setFormData({
                      title: "",
                      description: "",
                      image_url: "",
                      link_url: "",
                      is_active: true,
                      expires_at: "",
                    })
                  }}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingAd ? "Yangilash" : "Qo'shish"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{ads.length}</div>
            <div className="text-sm text-gray-600">Jami reklamalar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <Eye className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{ads.filter((ad) => ad.is_active).length}</div>
            <div className="text-sm text-gray-600">Faol reklamalar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <ExternalLink className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{ads.reduce((sum, ad) => sum + ad.click_count, 0)}</div>
            <div className="text-sm text-gray-600">Jami bosishlar</div>
          </CardContent>
        </Card>
        <Card className="card-beautiful">
          <CardContent className="p-4 text-center">
            <ExternalLink className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {ads.filter((ad) => ad.expires_at && new Date(ad.expires_at) < new Date()).length}
            </div>
            <div className="text-sm text-gray-600">Muddati tugagan</div>
          </CardContent>
        </Card>
      </div>

      {/* Ads List */}
      <div className="space-y-4">
        {ads.length === 0 ? (
          <Card className="card-beautiful">
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Reklamalar yo'q</h3>
              <p className="text-gray-600 mb-4">Birinchi reklamangizni qo'shing</p>
            </CardContent>
          </Card>
        ) : (
          ads.map((ad) => (
            <Card key={ad.id} className="card-beautiful">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Ad Preview */}
                  <div className="w-32 h-16 relative rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image src={ad.image_url || "/placeholder.svg"} alt={ad.title} fill className="object-cover" />
                  </div>

                  {/* Ad Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{ad.title}</h3>
                        {ad.description && <p className="text-gray-600 text-sm">{ad.description}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={ad.is_active ? "default" : "secondary"}>
                          {ad.is_active ? "Faol" : "Nofaol"}
                        </Badge>
                        {ad.expires_at && new Date(ad.expires_at) < new Date() && (
                          <Badge variant="destructive">Muddati tugagan</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{ad.click_count} marta bosilgan</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-4 w-4" />
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate max-w-xs"
                        >
                          {ad.link_url}
                        </a>
                      </div>
                      <span>Yaratilgan: {formatDate(ad.created_at)}</span>
                      {ad.expires_at && <span>Tugaydi: {formatDate(ad.expires_at)}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(ad)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Tahrirlash
                      </Button>

                      <Button
                        size="sm"
                        variant={ad.is_active ? "secondary" : "default"}
                        onClick={() => toggleAdStatus(ad.id, ad.is_active)}
                      >
                        {ad.is_active ? "O'chirish" : "Faollashtirish"}
                      </Button>

                      <Button size="sm" variant="destructive" onClick={() => handleDelete(ad.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        O'chirish
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
