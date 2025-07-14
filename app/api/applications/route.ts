import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Helper function to get the Supabase access token
async function getAccessToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return null
  }
  const token = authHeader.replace("Bearer ", "")
  return token
}

// Helper function to verify the user and admin status
async function verifyAdmin(token: string): Promise<{ user: any; userData: any } | null> {
  if (!token) {
    return null
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return null
  }

  const { data: userData } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

  if (!userData?.is_admin) {
    return null
  }
  return { user, userData }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getAccessToken(request)
    const adminCheck = await verifyAdmin(token!)

    if (!adminCheck) {
      return NextResponse.json({ error: "No authorization header or invalid token or admin access required" }, { status: 401 })
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
        // Ensure status and admin_response exist and default if not
        status: app.status || "pending",
        admin_response: app.admin_response || null,
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
    const token = await getAccessToken(request)
    const adminCheck = await verifyAdmin(token!)

    if (!adminCheck) {
      return NextResponse.json({ error: "No authorization header or invalid token or admin access required" }, { status: 401 })
    }

    const body = await request.json()
    const { id, type, action, notes } = body

    if (!id || !type || !action) {
      return NextResponse.json({ error: "ID, type va action majburiy" }, { status: 400 })
    }

    let tableName = ""
    const updateData: any = {
      updated_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    }

    // Determine table and update data based on type
    switch (type) {
      case "seller":
        tableName = "seller_applications"
        updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action
        updateData.admin_notes = notes
        break
      case "product":
        tableName = "product_applications"
        updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action
        updateData.admin_notes = notes
        break
      case "complaint":
        tableName = "complaints"
        updateData.status = action === "resolve" ? "resolved" : action === "reject" ? "rejected" : action
        updateData.admin_response = notes // Using notes for admin response
        break
      default:
        return NextResponse.json({ error: "Noto'g'ri application type" }, { status: 400 })
    }

    // Update the application
    const { data, error } = await supabase.from(tableName).update(updateData).eq("id", id).select().single()

    if (error) {
      console.error(`Error updating ${type} application with ID ${id}:`, error);
      throw error;
    }

    // If approving seller application, update user status
    if (type === "seller" && action === "approve") {
      await supabase
        .from("users")
        .update({
          is_seller: true,
          is_verified_seller: true, // Assuming 'approve' means verified
        })
        .eq("id", data.user_id)
        .then(({ error: userUpdateError }) => {
          if (userUpdateError) {
            console.error(`Error updating user status for seller application ${id}:`, userUpdateError);
            // Potentially throw an error or log it if user update fails
          }
        });
    }
    // Handling a potential "approve_verified" action if needed differently
    if (type === "seller" && action === "approve_verified") {
      await supabase
        .from("users")
        .update({
          is_seller: true,
          is_verified_seller: true, // Explicitly setting verified
        })
        .eq("id", data.user_id)
        .then(({ error: userUpdateError }) => {
          if (userUpdateError) {
            console.error(`Error updating user status for seller application ${id} (verified):`, userUpdateError);
          }
        });
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
