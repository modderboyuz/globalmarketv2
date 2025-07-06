import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, userId, quantity = 1 } = body

    if (!productId || !userId) {
      return NextResponse.json({ error: "Product ID va User ID talab qilinadi" }, { status: 400 })
    }

    // Ensure user exists in users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single()

    if (userCheckError || !existingUser) {
      // Create user record if it doesn't exist
      const { data: authUser } = await supabase.auth.getUser()
      if (authUser.user && authUser.user.id === userId) {
        const { error: createUserError } = await supabase.from("users").insert({
          id: userId,
          email: authUser.user.email,
          full_name: authUser.user.user_metadata?.full_name || "",
          phone: authUser.user.user_metadata?.phone || "",
          address: authUser.user.user_metadata?.address || "",
        })

        if (createUserError) {
          console.error("Error creating user:", createUserError)
          return NextResponse.json({ error: "Foydalanuvchi yaratishda xatolik" }, { status: 500 })
        }
      }
    }

    // Check if item already exists in cart
    const { data: existingItem, error: checkError } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError
    }

    if (existingItem) {
      // Update quantity
      const { data, error } = await supabase
        .from("cart")
        .update({
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, cartItem: data })
    } else {
      // Add new item
      const { data, error } = await supabase
        .from("cart")
        .insert({
          user_id: userId,
          product_id: productId,
          quantity: quantity,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, cartItem: data })
    }
  } catch (error) {
    console.error("Cart API Error:", error)
    return NextResponse.json({ error: "Savatga qo'shishda xatolik" }, { status: 500 })
  }
}
