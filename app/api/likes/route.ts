import { createClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { product_id } = body

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call the database function to handle like toggle
    const { data, error } = await supabase.rpc("handle_like_toggle", {
      product_id_param: product_id,
      user_id_param: user.id,
    })

    if (error) {
      console.error("Error toggling like:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in likes API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id")
    const user_id = searchParams.get("user_id")

    if (product_id && user_id) {
      // Check if user liked specific product
      const { data, error } = await supabase
        .from("likes")
        .select("id")
        .eq("product_id", product_id)
        .eq("user_id", user_id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error checking like:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ liked: !!data })
    }

    if (user_id) {
      // Get all liked products for user
      const { data, error } = await supabase
        .from("likes")
        .select(`
          id,
          created_at,
          product:products(
            id,
            name,
            title,
            price,
            images,
            seller:users(full_name)
          )
        `)
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching user likes:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ likes: data })
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  } catch (error) {
    console.error("Error in likes GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
