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
    const { searchParams } = new URL(request.url)
    const exportFormat = searchParams.get("export")

    const token = await getAccessToken(request)
    const adminCheck = await verifyAdmin(token)

    if (!adminCheck) {
      // Return a 401 Unauthorized response if token is missing, invalid, or user is not admin
      return NextResponse.json(
        { error: "Authorization token is missing, invalid, or user is not an admin." },
        { status: 401 },
      )
    }

    // Fetch applications from all relevant tables
    const [sellerAppsResult, productAppsResult, complaintsResult, contactMessagesResult] = await Promise.all([
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

      // Contact messages: select all fields
      supabase
        .from("contact_messages")
        .select(`
          *
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
      ...(contactMessagesResult.data || []).map((app: any) => ({
        ...app,
        type: "contact",
        status: app.status || "pending",
        users: null, // Contact messages don't have user relations
      })),
    ]

    // Sort the combined applications by 'created_at' in descending order
    applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // If export is requested, generate CSV file
    if (exportFormat === "csv") {
      const csvContent = [
        ["ID", "Tur", "Holat", "Ariza beruvchi", "Email", "Telefon", "Sana", "Kompaniya/Mavzu", "Admin Eslatmasi"].join(
          ",",
        ),
        ...applications.map((app) =>
          [
            app.id.slice(-8),
            app.type === "seller"
              ? "Sotuvchi"
              : app.type === "product"
                ? "Mahsulot"
                : app.type === "complaint"
                  ? "Shikoyat"
                  : "Murojaat",
            app.status === "pending"
              ? "Kutilmoqda"
              : app.status === "approved" || app.status === "approved_verified"
                ? "Tasdiqlangan"
                : app.status === "resolved"
                  ? "Hal qilingan"
                  : "Rad etilgan",
            app.users?.full_name || app.name || "Noma'lum",
            app.users?.email || app.email || "Noma'lum",
            app.users?.phone || app.phone || "Noma'lum",
            new Date(app.created_at).toLocaleDateString(),
            app.type === "seller" ? app.company_name || "" : app.type === "contact" ? app.subject || "" : "",
            app.admin_notes || app.admin_response || "",
          ].join(","),
        ),
      ].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8;",
          "Content-Disposition": `attachment; filename=arizalar-${new Date().toISOString().split("T")[0]}.csv`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      applications,
    })
  } catch (error) {
    console.error("GET /api/applications Error:", error)
    // Return a 500 Internal Server Error for any unexpected exceptions
    return NextResponse.json(
      { error: "An internal server error occurred while fetching applications." },
      { status: 500 },
    )
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
        { status: 401 },
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
      case "contact":
        tableName = "contact_messages"
        updateData.status = action === "respond" ? "responded" : action === "reject" ? "rejected" : action
        updateData.admin_response = notes
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

    // Special handling for approving product applications
    if (type === "product" && action === "approve") {
      // Get the product application data
      const { data: productApp, error: productAppError } = await supabase
        .from("product_applications")
        .select("*")
        .eq("id", id)
        .single()

      if (!productAppError && productApp && productApp.product_data) {
        // Insert into products table
        const productToInsert = {
          name: productApp.product_data.name,
          brand: productApp.product_data.brand || null,
          price: productApp.product_data.price,
          description: productApp.product_data.description || null,
          image_url: productApp.product_data.image_url || null,
          seller_id: productApp.user_id,
          category_id: productApp.product_data.category_id || null,
          has_delivery: productApp.product_data.has_delivery || false,
          product_type: productApp.product_data.product_type || "physical",
          delivery_price: productApp.product_data.delivery_price || 0,
          stock_quantity: productApp.product_data.stock_quantity || 0,
          is_approved: true, // Set as approved
          is_active: true,
        }

        const { error: productInsertError } = await supabase.from("products").insert([productToInsert])

        if (productInsertError) {
          console.error("Error inserting product:", productInsertError)
        }
      }
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
    return NextResponse.json(
      { error: "An internal server error occurred while updating the application." },
      { status: 500 },
    )
  }
}
