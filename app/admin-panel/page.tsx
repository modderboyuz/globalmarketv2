"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Download, Users, Package, ShoppingCart, FileText, Eye, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

interface Stats {
  total_users: number
  total_products: number
  total_orders: number
  total_applications: number
}

interface Application {
  id: string
  user_id: string
  business_name: string
  business_type: string
  description: string
  status: string
  created_at: string
  users: {
    full_name: string
    email: string
    phone: string
  }
}

interface Complaint {
  id: string
  complaint_text: string
  status: string
  admin_response: string | null
  created_at: string
  orders: {
    id: string
    products: {
      title: string
    }
  }
  users: {
    full_name: string
    email: string
  }
}

export default function AdminPanelPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [responseText, setResponseText] = useState("")

  useEffect(() => {
    fetchStats()
    fetchApplications()
    fetchComplaints()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats", {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/admin/applications")
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComplaints = async () => {
    try {
      const response = await fetch("/api/complaints")
      if (response.ok) {
        const data = await response.json()
        setComplaints(data.complaints || [])
      }
    } catch (error) {
      console.error("Failed to fetch complaints:", error)
    }
  }

  const handleApplicationAction = async (applicationId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, action }),
      })

      if (response.ok) {
        toast.success(`Ariza ${action === "approve" ? "tasdiqlandi" : "rad etildi"}`)
        fetchApplications()
        fetchStats()
        setSelectedApplication(null)
      } else {
        toast.error("Xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Application action error:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleComplaintResponse = async () => {
    if (!selectedComplaint || !responseText.trim()) return

    try {
      const response = await fetch("/api/admin/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          admin_response: responseText,
          status: "resolved",
        }),
      })

      if (response.ok) {
        toast.success("Javob yuborildi")
        fetchComplaints()
        setSelectedComplaint(null)
        setResponseText("")
      } else {
        toast.error("Xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Complaint response error:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const handleExport = async (type: string) => {
    try {
      const response = await fetch(`/api/export?type=${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Fayl yuklab olindi")
      } else {
        toast.error("Export xatoligi")
      }
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Export xatoligi")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Yuklanmoqda...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleExport("orders")} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Buyurtmalar
          </Button>
          <Button onClick={() => handleExport("products")} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Mahsulotlar
          </Button>
          <Button onClick={() => handleExport("users")} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Foydalanuvchilar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Foydalanuvchilar</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mahsulotlar</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_products}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buyurtmalar</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arizalar</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_applications}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Sotuvchi Arizalari</TabsTrigger>
          <TabsTrigger value="complaints">Shikoyatlar</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sotuvchi Arizalari</CardTitle>
              <CardDescription>Yangi sotuvchi bo'lish uchun kelib tushgan arizalar</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Arizalar topilmadi</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ism</TableHead>
                      <TableHead>Biznes nomi</TableHead>
                      <TableHead>Turi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead>Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>{application.users.full_name}</TableCell>
                        <TableCell>{application.business_name}</TableCell>
                        <TableCell>{application.business_type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              application.status === "pending"
                                ? "secondary"
                                : application.status === "approved"
                                  ? "default"
                                  : "destructive"
                            }
                          >
                            {application.status === "pending"
                              ? "Kutilmoqda"
                              : application.status === "approved"
                                ? "Tasdiqlangan"
                                : "Rad etilgan"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(application.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                        <TableCell>
                          <Button onClick={() => setSelectedApplication(application)} size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ko'rish
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shikoyatlar</CardTitle>
              <CardDescription>Foydalanuvchilardan kelib tushgan shikoyatlar</CardDescription>
            </CardHeader>
            <CardContent>
              {complaints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Shikoyatlar topilmadi</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead>Mahsulot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead>Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell>{complaint.users.full_name}</TableCell>
                        <TableCell>{complaint.orders.products.title}</TableCell>
                        <TableCell>
                          <Badge variant={complaint.status === "pending" ? "secondary" : "default"}>
                            {complaint.status === "pending" ? "Kutilmoqda" : "Hal qilingan"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(complaint.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                        <TableCell>
                          <Button onClick={() => setSelectedComplaint(complaint)} size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ko'rish
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sotuvchi Arizasi</DialogTitle>
            <DialogDescription>{selectedApplication?.users.full_name} tomonidan yuborilgan ariza</DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Ism:</strong> {selectedApplication.users.full_name}
                </div>
                <div>
                  <strong>Email:</strong> {selectedApplication.users.email}
                </div>
                <div>
                  <strong>Telefon:</strong> {selectedApplication.users.phone}
                </div>
                <div>
                  <strong>Biznes nomi:</strong> {selectedApplication.business_name}
                </div>
                <div>
                  <strong>Biznes turi:</strong> {selectedApplication.business_type}
                </div>
                <div>
                  <strong>Status:</strong>
                  <Badge
                    className="ml-2"
                    variant={
                      selectedApplication.status === "pending"
                        ? "secondary"
                        : selectedApplication.status === "approved"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {selectedApplication.status === "pending"
                      ? "Kutilmoqda"
                      : selectedApplication.status === "approved"
                        ? "Tasdiqlangan"
                        : "Rad etilgan"}
                  </Badge>
                </div>
              </div>

              <div>
                <strong>Tavsif:</strong>
                <p className="mt-2 p-3 bg-gray-50 rounded-lg">{selectedApplication.description}</p>
              </div>
            </div>
          )}

          {selectedApplication?.status === "pending" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => handleApplicationAction(selectedApplication.id, "reject")}>
                <XCircle className="h-4 w-4 mr-1" />
                Rad etish
              </Button>
              <Button onClick={() => handleApplicationAction(selectedApplication.id, "approve")}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Tasdiqlash
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Complaint Detail Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shikoyat</DialogTitle>
            <DialogDescription>{selectedComplaint?.users.full_name} tomonidan yuborilgan shikoyat</DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Foydalanuvchi:</strong> {selectedComplaint.users.full_name}
                </div>
                <div>
                  <strong>Email:</strong> {selectedComplaint.users.email}
                </div>
                <div>
                  <strong>Mahsulot:</strong> {selectedComplaint.orders.products.title}
                </div>
                <div>
                  <strong>Status:</strong>
                  <Badge className="ml-2" variant={selectedComplaint.status === "pending" ? "secondary" : "default"}>
                    {selectedComplaint.status === "pending" ? "Kutilmoqda" : "Hal qilingan"}
                  </Badge>
                </div>
              </div>

              <div>
                <strong>Shikoyat matni:</strong>
                <p className="mt-2 p-3 bg-gray-50 rounded-lg">{selectedComplaint.complaint_text}</p>
              </div>

              {selectedComplaint.admin_response && (
                <div>
                  <strong>Admin javobi:</strong>
                  <p className="mt-2 p-3 bg-blue-50 rounded-lg">{selectedComplaint.admin_response}</p>
                </div>
              )}

              {selectedComplaint.status === "pending" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Admin javobi</label>
                  <Textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Shikoyatga javob yozing..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {selectedComplaint?.status === "pending" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                Bekor qilish
              </Button>
              <Button onClick={handleComplaintResponse} disabled={!responseText.trim()}>
                Javob yuborish
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
