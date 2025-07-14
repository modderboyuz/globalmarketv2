"use client" // Assuming this is a client component, though the API code is server-side.

import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase" // Assuming supabase client is correctly configured

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      product_id,
      full_name,
      phone,
      address,
      quantity,
      with_delivery = false,
      neighborhood,
      street,
      house_number,
    } = body

    // Basic validation for required fields
    if (!product_id || !full_name || !phone || !address || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Barcha maydonlar to'g'ri to'ldirilishi kerak (mahsulot ID, ism, telefon, manzil, miqdor)." }, { status: 400 })
    }

    // Get current user if logged in
    const authHeader = request.headers.get("authorization")
    let user_id = null

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token)
        if (authError) {
          console.error("Supabase Auth Error:", authError.message)
          // Decide if anonymous users should be allowed to order
          // If not, return unauthorized error:
          // return NextResponse.json({ error: "Authorization failed" }, { status: 401 });
        }
        user_id = user?.id || null
      } catch (authError) {
        console.error("Supabase Auth Exception:", authError)
        // If auth check fails, treat as anonymous or return error
      }
    }

    // Get product details from Supabase
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, stock_quantity, has_delivery, delivery_price") // Select only necessary fields
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      console.error("Product fetch error:", productError?.message)
      return NextResponse.json({ error: "Mahsulot topilmadi yoki server xatoligi." }, { status: 404 })
    }

    // Check stock availability
    if (product.stock_quantity === undefined || product.stock_quantity < quantity) {
      return NextResponse.json({ error: `Yetarli mahsulot mavjud emas. Ombor: ${product.stock_quantity || 0}, So'ralgan: ${quantity}` }, { status: 400 })
    }

    // Calculate total amount and delivery price
    let total_amount = product.price * quantity
    let delivery_price = 0

    if (with_delivery && product.has_delivery) {
      delivery_price = product.delivery_price || 0
      total_amount += delivery_price
    }

    // Construct delivery address string
    const deliveryAddress = with_delivery
      ? `${neighborhood || ""}, ${street || ""}, ${house_number || ""}`.trim().replace(/^,|,$/g, '').replace(/, ,/g, ', ').trim()
      : null

    // Create order record in Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        product_id,
        user_id,
        full_name,
        phone,
        address: address, // Assuming 'address' is the primary address field
        delivery_address: deliveryAddress,
        delivery_phone: phone, // Usually same as customer phone
        quantity,
        total_amount,
        status: "pending", // Initial status
        order_type: user_id ? "website" : "anonymous",
        // Generate a temporary ID for anonymous users to track orders if needed
        anon_temp_id: !user_id ? `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null,
      })
      .select("id, product_id, user_id, full_name, phone, address, delivery_address, delivery_phone, quantity, total_amount, status, order_type, anon_temp_id, created_at") // Select relevant fields
      .single()

    if (orderError) {
      console.error("Order creation error:", orderError.message)
      return NextResponse.json({ error: "Buyurtma yaratishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring." }, { status: 500 })
    }

    // Update product stock quantity
    const { error: stockError } = await supabase
      .from("products")
      .update({
        stock_quantity: Math.max(0, (product.stock_quantity || 0) - quantity), // Ensure stock doesn't go below zero
        updated_at: new Date().toISOString(),
      })
      .eq("id", product_id)

    if (stockError) {
      console.error("Stock update error:", stockError.message)
      // It's important to handle this error. If stock update fails, the order might be inconsistent.
      // Consider adding a cleanup mechanism or logging this error for manual review.
      toast.error("Mahsulot ombori yangilanishida xatolik yuz berdi!")
    }

    // Return success response
    return NextResponse.json({
      success: true,
      order_id: order.id,
      total_price: total_amount,
      delivery_price: with_delivery ? delivery_price : 0,
      message: "Buyurtma muvaffaqiyatli qabul qilindi!",
    })
  } catch (error) {
    console.error("POST /api/orders Error:", error)
    // Catch any unexpected errors
    return NextResponse.json({ error: "Serverda kutilmagan xatolik yuz berdi." }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id_param = searchParams.get("user_id")
    const status_param = searchParams.get("status")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // Get authorization header for user verification
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header is required." }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    let current_user_id = null // To store the ID of the currently logged-in user

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token)

      if (authError || !user) {
        console.error("Supabase Auth Error in GET /api/orders:", authError?.message)
        return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 })
      }
      current_user_id = user.id
    } catch (authError) {
      console.error("Supabase Auth Exception in GET /api/orders:", authError)
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 })
    }

    // Build the Supabase query based on parameters
    let query = supabase
      .from("orders")
      .select(
        `
        id, product_id, user_id, full_name, phone, address, delivery_address, delivery_phone, quantity, total_amount, status, order_type, anon_temp_id, created_at, updated_at,
        products (
          id,
          name,
          price,
          image_url,
          seller_id,
          has_delivery,
          delivery_price
        )
      `,
        { count: "exact" }, // Enable count for pagination
      )

    // Filter by user_id if provided, otherwise use the current user's ID
    if (user_id_param) {
      // If an explicit user_id is provided, filter by it
      query = query.eq("user_id", user_id_param)
    } else if (current_user_id) {
      // If no user_id param and user is logged in, show their orders
      query = query.eq("user_id", current_user_id)
    } else {
      // If no user_id param and user is not logged in (anonymous order),
      // we might need a different filter if anon_temp_id is used for filtering.
      // For now, assuming it defaults to showing orders for the current user if logged in.
      // If you want to fetch *all* orders (e.g., for an admin), you'd need admin check here.
      // For simplicity, if no user_id and not logged in, we'll show empty or handle as needed.
      // Let's assume for now only logged-in users or specific user_id are queried.
      // If anonymous orders need fetching, you'd filter by anon_temp_id.
    }

    // Apply status filter if provided
    if (status_param) {
      query = query.eq("status", status_param)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    const from = offset
    const to = offset + limit - 1

    query = query.order("created_at", { ascending: false }) // Order by creation date
    query = query.range(from, to) // Apply the range for pagination

    const { data: orders, error, count } = await query

    if (error) {
      console.error("Supabase fetch orders error:", error.message)
      throw error
    }

    // Return the orders and pagination details
    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0, // Total number of orders matching the query
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/orders Error:", error)
    return NextResponse.json({ error: "Serverda xatolik yuz berdi." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, action, notes, pickupAddress, userId } = body // userId might be relevant for admin actions

    // Validate essential parameters
    if (!orderId || !action) {
      return NextResponse.json({ error: "Order ID va action majburiy." }, { status: 400 })
    }

    // Get authorization header and verify user
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header is required." }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    let user_id_from_token = null
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token)

      if (authError || !user) {
        console.error("Supabase Auth Error in PUT /api/orders:", authError?.message)
        return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 })
      }
      user_id_from_token = user.id
    } catch (authError) {
      console.error("Supabase Auth Exception in PUT /api/orders:", authError)
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 })
    }

    // Fetch the current order details to check ownership or admin status
    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single()

    if (orderError || !order) {
      console.error(`Order with ID ${orderId} not found or fetch error:`, orderError?.message)
      return NextResponse.json({ error: "Buyurtma topilmadi yoki server xatoligi." }, { status: 404 })
    }

    // --- Authorization Check ---
    // Allow the order owner OR an admin to update the order.
    // You might need to add an 'is_admin' check if only admins can perform certain actions.
    // For now, we assume the user calling this API has the necessary rights if they can authenticate.
    // If you need to restrict actions based on admin role, you'll need to fetch user roles here.
    // Example: Fetch user role and check `userData.is_admin`
    // if (!order.user_id === user_id_from_token && !isAdmin) { // pseudo-code
    //   return NextResponse.json({ error: "You are not authorized to perform this action." }, { status: 403 });
    // }

    // Prepare update data based on action
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Update specific fields based on the action
    switch (action) {
      case "agree": // Likely for seller to agree to order terms/pickup
        updateData.is_agree = true
        updateData.pickup_address = pickupAddress || order.address // Use provided or existing address
        updateData.seller_notes = notes // Notes from seller
        break
      case "reject": // Seller rejects the order
        updateData.is_agree = false
        updateData.status = "cancelled" // Change status to cancelled
        updateData.seller_notes = notes
        break
      case "client_went": // Seller marks that client has arrived (for pickup)
        updateData.is_client_went = true
        updateData.client_notes = notes // Notes from seller about client's visit
        break
      case "client_not_went": // Seller marks client did not come
        updateData.is_client_went = false
        updateData.client_notes = notes
        break
      case "product_given": // Seller confirms product has been handed over
        updateData.is_client_claimed = true
        updateData.status = "completed" // Mark order as completed
        updateData.seller_notes = notes
        break
      case "product_not_given": // Seller marks product was not handed over
        updateData.is_client_claimed = false
        updateData.seller_notes = notes
        break
      default:
        return NextResponse.json({ error: "Noto'g'ri action qadriyati." }, { status: 400 })
    }

    // Perform the update operation in Supabase
    const { data, error } = await supabase.from("orders").update(updateData).eq("id", orderId).select().single()

    if (error) {
      console.error(`Supabase update order error for ID ${orderId}:`, error.message)
      throw error
    }

    // Return success response
    return NextResponse.json({
      success: true,
      order: data,
      message: "Buyurtma holati muvaffaqiyatli yangilandi.",
    })
  } catch (error) {
    console.error("PUT /api/orders Error:", error)
    return NextResponse.json({ error: "Serverda xatolik yuz berdi." }, { status: 500 })
  }
}
