"use client"

import type React from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Order {
  id: string
  full_name: string
  phone: string
  address: string
  status: string
  total_amount: number
  quantity: number
  created_at: string
  products: {
    name: string
    image_url: string
    product_type: string
  }
}

interface OrderCardProps {
  order: Order
  onStatusUpdate: (orderId: string, newStatus: string) => void
  formatPrice: (price: number) => string
  formatDate: (dateString: string) => string
  getStatusBadge: (status: string) => React.ReactNode
  getProductTypeIcon: (type: string) => string
}

export function OrderCard({
  order,
  onStatusUpdate,
  formatPrice,
  formatDate,
  getStatusBadge,
  getProductTypeIcon,
}: OrderCardProps) {
  return (
    <Card className="card-beautiful">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Product Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={order.products?.image_url || "/placeholder.svg?height=80&width=80"}
                alt={order.products?.name || "Mahsulot"}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getProductTypeIcon(order.products?.product_type || "other")}</span>
                <h3 className="font-semibold text-lg truncate">{order.products?.name || "Noma'lum mahsulot"}</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Buyurtma ID: {order.id.slice(0, 8)}...</p>
                <p>Sana: {formatDate(order.created_at)}</p>
                <p>Miqdor: {order.quantity} dona</p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex-1">
            <h4 className="font-semibold mb-2">Mijoz ma'lumotlari</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Ism:</strong> {order.full_name}
              </p>
              <p>
                <strong>Telefon:</strong> {order.phone}
              </p>
              <p>
                <strong>Manzil:</strong> {order.address}
              </p>
            </div>
          </div>

          {/* Order Status & Actions */}
          <div className="flex flex-col gap-4 min-w-[200px]">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">{formatPrice(order.total_amount)}</div>
              <div className="mb-3">{getStatusBadge(order.status)}</div>
            </div>

            {/* Status Update Buttons */}
            <div className="flex flex-col gap-2">
              {order.status === "pending" && (
                <>
                  <Button size="sm" className="btn-primary" onClick={() => onStatusUpdate(order.id, "processing")}>
                    Qabul qilish
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onStatusUpdate(order.id, "cancelled")}>
                    Bekor qilish
                  </Button>
                </>
              )}

              {order.status === "processing" && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onStatusUpdate(order.id, "completed")}
                >
                  Yakunlash
                </Button>
              )}

              {order.status === "completed" && (
                <Badge variant="default" className="bg-green-100 text-green-800 justify-center">
                  Yakunlangan
                </Badge>
              )}

              {order.status === "cancelled" && (
                <Badge variant="destructive" className="justify-center">
                  Bekor qilingan
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
