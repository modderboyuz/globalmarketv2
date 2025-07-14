import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
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

    // Fetch all applications from different tables
    const [sellerAppsResult, productAppsResult, complaintsResult] = await Promise.all([
      // Seller applications
      supabase
        .from("seller_applications")
        .select(`
          *,
          users (
            full_name,
            email,
            phone,
            username
          )
        `)
        .order("created_at", { ascending: false }),

      // Product applications
      supabase
        .from("product_applications")
        .select(`
          *,
          users (
            full_name,
            email,
            phone,
            username
          )
        `)
        .order("created_at", { ascending: false }),

      // Complaints
      supabase
        .from("complaints")
        .select(`
          *,
          users (
            full_name,
            email,
            phone,
            username
          ),
          orders (
            id,
            products (
              name
            )
          )
        `)
        .order("created_at", { ascending: false }),
    ])

    // Combine all applications with type identifier
    const applications = [
      ...(sellerAppsResult.data || []).map((app) => ({
        ...app,
        type: "seller",
      })),
      ...(productAppsResult.data || []).map((app) => ({
        ...app,
        type: "product",
      })),
      ...(complaintsResult.data || []).map((app) => ({
        ...app,
        type: "complaint",
        status: app.status || "pending",
      })),
    ]

    // Sort by created_at
    applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      applications,
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
      return NextResponse.json({ error: "ID, type va action majburiy" }, { status: 400 })
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
      updated_at: new Date().toISOString(),
      admin_notes: notes,
      reviewed_at: new Date().toISOString(),
    }

    // Determine table and update data based on type
    switch (type) {
      case "seller":
        tableName = "seller_applications"
        updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action
        break
      case "product":
        tableName = "product_applications"
        updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action
        break
      case "complaint":
        tableName = "complaints"
        updateData.status = action === "resolve" ? "resolved" : action === "reject" ? "rejected" : action
        updateData.admin_response = notes
        break
      default:
        return NextResponse.json({ error: "Noto'g'ri application type" }, { status: 400 })
    }

    // Update the application
    const { data, error } = await supabase.from(tableName).update(updateData).eq("id", id).select().single()

    if (error) {
      throw error
    }

    // If approving seller application, update user status
    if (type === "seller" && action === "approve") {
      await supabase
        .from("users")
        .update({
          is_seller: true,
          is_verified_seller: true,
        })
        .eq("id", data.user_id)
    }

    // If approving seller application with verified status
    if (type === "seller" && action === "approve_verified") {
      await supabase
        .from("users")
        .update({
          is_seller: true,
          is_verified_seller: true,
        })
        .eq("id", data.user_id)
    }

    return NextResponse.json({
      success: true,
      application: data,
      message: "Ariza muvaffaqiyatli yangilandi",
    })
  } catch (error) {
    console.error("Application update API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
