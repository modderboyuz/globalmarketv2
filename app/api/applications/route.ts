import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Get seller applications
    const { data: sellerApps, error: sellerError } = await supabase
      .from("seller_applications")
      .select(`
        id,
        business_name,
        business_type,
        business_description,
        status,
        admin_notes,
        created_at,
        updated_at,
        reviewed_at,
        user_id,
        users:user_id (
          id,
          full_name,
          email,
          phone,
          company_name,
          is_verified_seller,
          is_admin,
          created_at,
          last_sign_in_at
        )
      `)
      .order("created_at", { ascending: false })

    if (sellerError) {
      console.error("Error fetching seller applications:", sellerError)
    }

    // Get contact messages
    const { data: contactMsgs, error: contactError } = await supabase
      .from("contact_messages")
      .select(`
        id,
        name,
        email,
        phone,
        subject,
        message,
        status,
        admin_response,
        created_at,
        updated_at,
        user_id,
        full_name,
        message_type,
        book_request_title,
        book_request_author,
        users:user_id (
          id,
          full_name,
          email,
          phone,
          company_name,
          is_verified_seller,
          is_admin,
          created_at,
          last_sign_in_at
        )
      `)
      .order("created_at", { ascending: false })

    if (contactError) {
      console.error("Error fetching contact messages:", contactError)
    }

    // Combine and format applications
    const applications = []

    // Add seller applications
    if (sellerApps) {
      for (const app of sellerApps) {
        applications.push({
          id: app.id,
          type: "seller",
          status: app.status,
          created_at: app.created_at,
          updated_at: app.updated_at,
          reviewed_at: app.reviewed_at,
          admin_notes: app.admin_notes,
          user_id: app.user_id,
          users: app.users,
          company_name: app.business_name,
          business_type: app.business_type,
          description: app.business_description,
        })
      }
    }

    // Add contact messages
    if (contactMsgs) {
      for (const msg of contactMsgs) {
        applications.push({
          id: msg.id,
          type: "contact",
          status: msg.status,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          admin_response: msg.admin_response,
          user_id: msg.user_id,
          users: msg.users,
          name: msg.name,
          email: msg.email,
          phone: msg.phone,
          subject: msg.subject,
          message: msg.message,
          full_name: msg.full_name,
          message_type: msg.message_type,
          book_request_title: msg.book_request_title,
          book_request_author: msg.book_request_author,
        })
      }
    }

    // Sort by created_at
    applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      applications,
    })
  } catch (error) {
    console.error("Applications API error:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, type, action, notes } = body

    // Check if user is admin
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    let message = ""

    if (type === "seller") {
      // Handle seller application actions
      switch (action) {
        case "approve":
          updateData.status = "approved"
          updateData.admin_notes = notes
          updateData.reviewed_at = new Date().toISOString()
          updateData.reviewed_by = user.id
          message = "Sotuvchi arizasi tasdiqlandi"
          break
        case "approve_verified":
          updateData.status = "approved_verified"
          updateData.admin_notes = notes
          updateData.reviewed_at = new Date().toISOString()
          updateData.reviewed_by = user.id
          message = "Sotuvchi arizasi tasdiqlandi va verified qilindi"
          break
        case "reject":
          updateData.status = "rejected"
          updateData.admin_notes = notes
          updateData.reviewed_at = new Date().toISOString()
          updateData.reviewed_by = user.id
          message = "Sotuvchi arizasi rad etildi"
          break
        default:
          return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
      }

      const { error } = await supabase.from("seller_applications").update(updateData).eq("id", id)

      if (error) {
        throw error
      }

      // If approved, update user status
      if (action === "approve" || action === "approve_verified") {
        const { data: application } = await supabase.from("seller_applications").select("user_id").eq("id", id).single()

        if (application?.user_id) {
          await supabase
            .from("users")
            .update({
              is_seller: true,
              is_verified_seller: action === "approve_verified",
            })
            .eq("id", application.user_id)
        }
      }
    } else if (type === "contact") {
      // Handle contact message actions
      switch (action) {
        case "respond":
          updateData.status = "responded"
          updateData.admin_response = notes
          message = "Murojaatga javob berildi"
          break
        case "resolve":
          updateData.status = "resolved"
          updateData.admin_response = notes
          message = "Murojaat hal qilindi"
          break
        case "reject":
          updateData.status = "rejected"
          updateData.admin_response = notes
          message = "Murojaat rad etildi"
          break
        default:
          return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
      }

      const { error } = await supabase.from("contact_messages").update(updateData).eq("id", id)

      if (error) {
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error("Applications PUT error:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
