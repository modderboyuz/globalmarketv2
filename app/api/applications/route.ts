import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user with token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Fetch all application types
    const [sellerApps, productApps, contactMessages] = await Promise.all([
      supabase
        .from("seller_applications")
        .select(`*, users(full_name, email, phone, username)`)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_applications")
        .select(`*, users(full_name, email, phone, username)`)
        .order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ])

    // Combine all applications with type field
    const allApplications = [
      ...(sellerApps.data || []).map((app) => ({ ...app, type: "seller" })),
      ...(productApps.data || []).map((app) => ({ ...app, type: "product" })),
      ...(contactMessages.data || []).map((app) => ({ ...app, type: "contact" })),
    ]

    // Filter by type and status if provided
    let filteredApplications = allApplications

    if (type && type !== "all") {
      filteredApplications = filteredApplications.filter((app) => app.type === type)
    }

    if (status && status !== "all") {
      filteredApplications = filteredApplications.filter((app) => app.status === status)
    }

    // Sort by created_at
    filteredApplications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      applications: filteredApplications,
    })
  } catch (error) {
    console.error("Applications API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, type, action, notes } = body

    if (!id || !type || !action) {
      return NextResponse.json({ error: "ID, type va action talab qilinadi" }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user with token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    let tableName = ""
    const updateData: any = {
      reviewed_at: new Date().toISOString(),
      admin_notes: notes || null,
    }

    // Determine table and status based on type and action
    switch (type) {
      case "seller":
        tableName = "seller_applications"
        break
      case "product":
        tableName = "product_applications"
        break
      case "contact":
        tableName = "contact_messages"
        updateData.admin_response = notes || null
        break
      default:
        return NextResponse.json({ error: "Noto'g'ri ariza turi" }, { status: 400 })
    }

    // Set status based on action
    switch (action) {
      case "approve":
        updateData.status = "approved"
        break
      case "approve_verified":
        updateData.status = "approved"
        break
      case "reject":
        updateData.status = "rejected"
        break
      default:
        return NextResponse.json({ error: "Noto'g'ri harakat" }, { status: 400 })
    }

    // Update the application
    const { data: updatedApp, error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // If it's a seller application and approved, update user status
    if (type === "seller" && (action === "approve" || action === "approve_verified")) {
      const userUpdateData: any = {
        is_seller: true,
        updated_at: new Date().toISOString(),
      }

      // If approve_verified, also set is_verified_seller
      if (action === "approve_verified") {
        userUpdateData.is_verified_seller = true
      }

      await supabase.from("users").update(userUpdateData).eq("id", updatedApp.user_id)
    }

    // If it's a product application and approved, create the product
    if (type === "product" && action === "approve" && updatedApp.product_data) {
      const productData = {
        ...updatedApp.product_data,
        seller_id: updatedApp.user_id,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await supabase.from("products").insert(productData)
    }

    let message = ""
    switch (action) {
      case "approve":
        message = "Ariza tasdiqlandi"
        break
      case "approve_verified":
        message = "Ariza tasdiqlandi va foydalanuvchi verified qilindi"
        break
      case "reject":
        message = "Ariza rad etildi"
        break
    }

    return NextResponse.json({
      success: true,
      message,
      application: updatedApp,
    })
  } catch (error) {
    console.error("Application update API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
