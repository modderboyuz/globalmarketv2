import { createClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "seller"
    const status = searchParams.get("status")

    let query = supabase
      .from("seller_applications")
      .select(`
        *,
        user:users(full_name, email, phone)
      `)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching applications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ applications: data })
  } catch (error) {
    console.error("Error in applications API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { business_name, business_type, business_address, business_phone, business_description, documents } = body

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user already has a pending application
    const { data: existingApp } = await supabase
      .from("seller_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single()

    if (existingApp) {
      return NextResponse.json(
        {
          error: "Sizda allaqachon kutilayotgan ariza mavjud",
        },
        { status: 400 },
      )
    }

    // Create new application
    const { data, error } = await supabase
      .from("seller_applications")
      .insert({
        user_id: user.id,
        business_name,
        business_type,
        business_address,
        business_phone,
        business_description,
        documents: documents || [],
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating application:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Ariza muvaffaqiyatli yuborildi",
      application: data,
    })
  } catch (error) {
    console.error("Error in applications POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { id, status, admin_notes } = body

    // Get current user and check if admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Update application
    const { data, error } = await supabase
      .from("seller_applications")
      .update({
        status,
        admin_notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        user:users(full_name, email, phone)
      `)
      .single()

    if (error) {
      console.error("Error updating application:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If approved, update user to be seller
    if (status === "approved") {
      await supabase
        .from("users")
        .update({
          is_seller: true,
          is_verified_seller: true,
        })
        .eq("id", data.user_id)
    }

    return NextResponse.json({
      message: "Ariza holati yangilandi",
      application: data,
    })
  } catch (error) {
    console.error("Error in applications PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
