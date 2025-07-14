import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Helper function to get the Supabase access token from the Authorization header
async function getAccessToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return null
  }
  // Ensure the header format is "Bearer <token>"
  if (!authHeader.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.replace("Bearer ", "")
  return token
}

// Helper function to verify the user's token and check if they are an admin
async function verifyAdmin(token: string | null): Promise<{ user: any; userData: any } | null> {
  if (!token) {
    return null // No token provided
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("Supabase Auth Error:", authError?.message)
      return null // Invalid token or authentication error
    }

    // Fetch user data from 'users' table to check admin role
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("is_admin") // Only select the is_admin field
      .eq("id", user.id)
      .single()

    if (dbError || !userData) {
      console.error("Database Error fetching user role:", dbError?.message)
      return null // User not found in 'users' table or DB error
    }

    if (!userData.is_admin) {
      return null // User is not an admin
    }

    return { user, userData } // Token is valid and user is admin
  } catch (error) {
    console.error("Error during admin verification:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getAccessToken(request)
    const adminCheck = await verifyAdmin(token)

    if (!adminCheck) {
      // Return a 401 Unauthorized response if token is missing, invalid, or user is not admin
      return NextResponse.json(
        { error: "Authorization token is missing, invalid, or user is not an admin." },
        { status: 401 }
      )
    }

    // Fetch applications from all relevant tables
    const [sellerAppsResult, productAppsResult, complaintsResult] = await Promise.all([
      // Seller applications: select all fields and join with users table
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

      // Product applications: select all fields and join with users table
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

      // Complaints: select all fields, join with users and orders, and also order products
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

    // Combine all fetched applications and add a 'type' identifier
    const applications = [
      ...(sellerAppsResult.data || []).map((app: any) => ({
        ...app,
        type: "seller",
        // Ensure user data is correctly mapped if it exists
        users: app.users || null,
      })),
      ...(productAppsResult.data || []).map((app: any) => ({
        ...app,
        type: "product",
        users: app.users || null,
      })),
      ...(complaintsResult.data || []).map((app: any) => ({
        ...app,
        type: "complaint",
        // Provide default values for status and admin_response if they are null
        status: app.status || "pending",
        admin_response: app.admin_response || null,
        users: app.users || null,
        orders: app.orders || null,
      })),
    ]

    // Sort the combined applications by 'created_at' in descending order
    applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      applications,
    })
  } catch (error) {
    console.error("GET /api/applications Error:", error)
    // Return a 500 Internal Server Error for any unexpected exceptions
    return NextResponse.json({ error: "An internal server error occurred while fetching applications." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getAccessToken(request)
    const adminCheck = await verifyAdmin(token)

    if (!adminCheck) {
      // Return a 401 Unauthorized response if token is missing, invalid, or user is not admin
      return NextResponse.json(
        { error: "Authorization token is missing, invalid, or user is not an admin." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, type, action, notes } = body

    // Validate required parameters
    if (!id || !type || !action) {
      return NextResponse.json({ error: "ID, type, and action are required." }, { status: 400 })
    }

    let tableName = ""
    const updateData: any = {
      updated_at: new Date().toISOString(), // Update the updated_at timestamp
      reviewed_at: new Date().toISOString(), // Mark as reviewed
    }

    // Determine the table and update status/notes based on the application type and action
    switch (type) {
      case "seller":
        tableName = "seller_applications"
        updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action // Set status
        updateData.admin_notes = notes // Use 'notes' for admin notes
        break
      case "product":
        tableName = "product_applications"
        updateData.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : action // Set status
        updateData.admin_notes = notes // Use 'notes' for admin notes
        break
      case "complaint":
        tableName = "complaints"
        // For complaints, 'resolve' and 'reject' are common actions
        updateData.status = action === "resolve" ? "resolved" : action === "reject" ? "rejected" : action // Set status
        updateData.admin_response = notes // Use 'notes' for admin response
        break
      default:
        // If the type is not recognized, return a 400 Bad Request error
        return NextResponse.json({ error: "Invalid application type provided." }, { status: 400 })
    }

    // Perform the update operation in the database
    const { data, error } = await supabase.from(tableName).update(updateData).eq("id", id).select().single()

    if (error) {
      console.error(`Error updating ${type} application with ID ${id}:`, error)
      throw error // Throw the error to be caught by the outer catch block
    }

    // Special handling for approving seller applications
    if (type === "seller" && (action === "approve" || action === "approve_verified")) {
      // Update the user's status to indicate they are a seller and verified
      await supabase
        .from("users")
        .update({
          is_seller: true,
          is_verified_seller: true, // Explicitly set to true for both approve actions
        })
        .eq("id", data.user_id) // Link to the user who submitted the application
        .then(({ error: userUpdateError }) => {
          if (userUpdateError) {
            console.error(`Error updating user status for seller application ${id}:`, userUpdateError)
            // Optionally, you could revert the application status or log more details
          }
        })
    }

    // Return a success response with the updated application data and a message
    return NextResponse.json({
      success: true,
      application: data,
      message: `Application (${type}) successfully ${action}.`,
    })
  } catch (error) {
    console.error("PUT /api/applications Error:", error)
    // Return a 500 Internal Server Error for any unexpected exceptions during the update process
    return NextResponse.json({ error: "An internal server error occurred while updating the application." }, { status: 500 })
  }
}
