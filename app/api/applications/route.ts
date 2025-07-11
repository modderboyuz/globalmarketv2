import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const id = searchParams.get("id")

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    if (id && type) {
      // Get specific application
      let query
      let tableName = ""

      switch (type) {
        case "seller":
          tableName = "seller_applications"
          query = supabase
            .from("seller_applications")
            .select(`*, users(full_name, email, phone, username)`)
            .eq("id", id)
            .single()
          break
        case "product":
          tableName = "product_applications"
          query = supabase
            .from("product_applications")
            .select(`*, users(full_name, email, phone, username)`)
            .eq("id", id)
            .single()
          break
        case "contact":
          tableName = "contact_messages"
          query = supabase.from("contact_messages").select("*").eq("id", id).single()
          break
        default:
          return NextResponse.json({ error: "Invalid application type" }, { status: 400 })
      }

      const { data, error } = await query

      if (error) {
        console.error(`Error fetching ${type} application:`, error)
        return NextResponse.json({ error: "Application not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, application: data })
    }

    // Get all applications or filtered by type/status
    const applications = []

    // Fetch seller applications
    if (!type || type === "seller") {
      let sellerQuery = supabase
        .from("seller_applications")
        .select(`*, users(full_name, email, phone, username)`)
        .order("created_at", { ascending: false })

      if (status) {
        sellerQuery = sellerQuery.eq("status", status)
      }

      const { data: sellerApps } = await sellerQuery
      if (sellerApps) {
        applications.push(...sellerApps.map((app) => ({ ...app, type: "seller" })))
      }
    }

    // Fetch product applications
    if (!type || type === "product") {
      let productQuery = supabase
        .from("product_applications")
        .select(`*, users(full_name, email, phone, username)`)
        .order("created_at", { ascending: false })

      if (status) {
        productQuery = productQuery.eq("status", status)
      }

      const { data: productApps } = await productQuery
      if (productApps) {
        applications.push(...productApps.map((app) => ({ ...app, type: "product" })))
      }
    }

    // Fetch contact messages
    if (!type || type === "contact") {
      let contactQuery = supabase.from("contact_messages").select("*").order("created_at", { ascending: false })

      if (status) {
        contactQuery = contactQuery.eq("status", status)
      }

      const { data: contactMsgs } = await contactQuery
      if (contactMsgs) {
        applications.push(...contactMsgs.map((msg) => ({ ...msg, type: "contact" })))
      }
    }

    // Sort by created_at
    applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ success: true, applications })
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
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const updateData: any = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (notes) {
      updateData.admin_notes = notes
    }

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
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Update the application
    let updateResult
    switch (type) {
      case "seller":
        updateResult = await supabase.from("seller_applications").update(updateData).eq("id", id).select().single()
        break
      case "product":
        updateResult = await supabase.from("product_applications").update(updateData).eq("id", id).select().single()
        break
      case "contact":
        updateData.responded_by = user.id
        updateData.responded_at = new Date().toISOString()
        updateData.admin_response = notes || ""
        updateData.status = "responded"
        updateResult = await supabase.from("contact_messages").update(updateData).eq("id", id).select().single()
        break
      default:
        return NextResponse.json({ error: "Invalid application type" }, { status: 400 })
    }

    if (updateResult.error) {
      throw updateResult.error
    }

    // Handle post-approval actions
    if (action === "approve" || action === "approve_verified") {
      if (type === "seller") {
        // Get the application to find user_id
        const { data: application } = await supabase.from("seller_applications").select("user_id").eq("id", id).single()

        if (application) {
          // Update user to be a seller
          const userUpdateData: any = {
            is_seller: true,
            updated_at: new Date().toISOString(),
          }

          if (action === "approve_verified") {
            userUpdateData.is_verified_seller = true
          }

          await supabase.from("users").update(userUpdateData).eq("id", application.user_id)
        }
      } else if (type === "product") {
        // Get the application to create the product
        const { data: application } = await supabase
          .from("product_applications")
          .select("user_id, product_data")
          .eq("id", id)
          .single()

        if (application && application.product_data) {
          // Create the product
          const productData = {
            ...application.product_data,
            seller_id: application.user_id,
            is_approved: true,
            is_active: true,
            created_at: new Date().toISOString(),
          }

          await supabase.from("products").insert(productData)
        }
      }
    }

    return NextResponse.json({ success: true, message: "Application updated successfully" })
  } catch (error) {
    console.error("Application update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
