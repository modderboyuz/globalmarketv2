import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id")

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID majburiy",
        },
        { status: 400 },
      )
    }

    // Get authorization header (optional for GET)
    const authHeader = request.headers.get("authorization")
    let user_id = null

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token)

        if (!authError && user) {
          user_id = user.id
        }
      } catch (authError) {
        console.error("Auth error:", authError)
      }
    }

    // Get total likes count
    const { count: likesCount, error: countError } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product_id)

    if (countError) {
      console.error("Error counting likes:", countError)
      return NextResponse.json(
        {
          success: false,
          error: "Yoqtirishlarni sanashda xatolik",
        },
        { status: 500 },
      )
    }

    // Check if current user liked this product
    let liked = false
    if (user_id) {
      const { data: userLike, error: likeError } = await supabase
        .from("likes")
        .select("id")
        .eq("product_id", product_id)
        .eq("user_id", user_id)
        .single()

      if (!likeError && userLike) {
        liked = true
      }
    }

    return NextResponse.json({
      success: true,
      liked,
      likes_count: likesCount || 0,
    })
  } catch (error) {
    console.error("Likes GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id } = body

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID majburiy",
        },
        { status: 400 },
      )
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Tizimga kiring",
        },
        { status: 401 },
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Noto'g'ri token",
        },
        { status: 401 },
      )
    }

    // Check if user already liked this product
    const { data: existingLike, error: checkError } = await supabase
      .from("likes")
      .select("id")
      .eq("product_id", product_id)
      .eq("user_id", user.id)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing like:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "Yoqtirishni tekshirishda xatolik",
        },
        { status: 500 },
      )
    }

    let liked = false
    let message = ""

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabase.from("likes").delete().eq("id", existingLike.id)

      if (deleteError) {
        console.error("Error removing like:", deleteError)
        return NextResponse.json(
          {
            success: false,
            error: "Yoqtirishni olib tashlashda xatolik",
          },
          { status: 500 },
        )
      }

      liked = false
      message = "Yoqtirish olib tashlandi"
    } else {
      // Like - add new like
      const { error: insertError } = await supabase.from("likes").insert({
        product_id,
        user_id: user.id,
      })

      if (insertError) {
        console.error("Error adding like:", insertError)
        return NextResponse.json(
          {
            success: false,
            error: "Yoqtirishni qo'shishda xatolik",
          },
          { status: 500 },
        )
      }

      liked = true
      message = "Mahsulot yoqtirildi"
    }

    return NextResponse.json({
      success: true,
      liked,
      message,
    })
  } catch (error) {
    console.error("Likes POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}
