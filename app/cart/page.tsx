"use client"

interface CartItem {
  id: string
  product_id: string
  quantity: number
  products: {
    id: string
    name: string
    price: number
    image_url: string
    stock_quantity: number
    has_delivery: boolean
    delivery_price: number
    has_warranty: boolean
    warranty_period: string
    has_return: boolean
    return_period: string
