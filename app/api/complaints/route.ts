import { createSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase.from("users").select("type").eq("id", user.id).single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let query = supabase.from("complaints").select(`
        *,
        orders (
          id,
          products (
            title
          )
        ),
        users (
          full_name,
          email
        )
      `)

    if (userData.type !== "admin") {
      // Regular users can only see their own complaints
      query = query.eq("user_id", user.id)
    }

    const { data: complaints, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Complaints fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 })
    }

    return NextResponse.json({ complaints })
  } catch (error) {
    console.error("Complaints API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { order_id, complaint_text } = await request.json()

    if (!order_id || !complaint_text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Create complaint
    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .insert({
        order_id,
        user_id: user.id,
        complaint_text,
        status: "pending",
      })
      .select()
      .single()

    if (complaintError) {
      console.error("Complaint creation error:", complaintError)
      return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 })
    }

    return NextResponse.json({ success: true, complaint })
  } catch (error) {
    console.error("Complaint creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
