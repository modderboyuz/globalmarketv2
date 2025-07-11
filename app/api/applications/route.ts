import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get("id")
    const typeFilter = searchParams.get("type") || "all"
    const statusFilter = searchParams.get("status") || "all"

    if (applicationId) {
      const query = supabase
        .from("applications")
        .select(`
          *,
          users!applications_user_id_fkey (full_name, email, phone, username),
          orders!applications_order_id_fkey (
            id,
            products!orders_product_id_fkey (name)
          )
        `)
        .eq("id", applicationId)
        .single()

      const { data: application, error } = await query

      if (error || !application) {
        console.error("Application fetch error:", error)
        return NextResponse.json({ error: "Ariza topilmadi" }, { status: 404 })
      }

      return NextResponse.json({ success: true, application })
    }

    let query = supabase
      .from("applications")
      .select(`
        *,
        users!applications_user_id_fkey (full_name, email, phone, username),
        orders!applications_order_id_fkey (
          id,
          products!orders_product_id_fkey (name)
        )
      `)
      .order("created_at", { ascending: false })

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter)
    }
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    const { data: applications, error } = await query

    if (error) {
      console.error("Applications list fetch error:", error)
      return NextResponse.json({ error: "Arizalarni olishda xatolik" }, { status: 500 })
    }

    return NextResponse.json({ success: true, applications: applications || [] })
  } catch (error) {
    console.error("Applications GET error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, type, action, notes } = body

    if (!id || !type || !action) {
      return NextResponse.json({ error: "ID, tur va action talab qilinadi" }, { status: 400 })
    }

    const { data: application, error: fetchError } = await supabase
      .from("applications")
      .select("*, users!applications_user_id_fkey(id)")
      .eq("id", id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: "Ariza topilmadi" }, { status: 404 })
    }

    const updateData: any = {
      status: application.status,
      admin_notes: notes || null,
      updated_at: new Date().toISOString(),
    }

    let userUpdateData: any = null
    let notificationTitle = ""
    let notificationMessage = ""
    let notificationType = ""
    const notificationUserId = application.user_id

    switch (action) {
      case "approve":
        updateData.status = "approved"
        if (type === "seller") {
          userUpdateData = { is_verified_seller: true }
          notificationTitle = "Sotuvchilik arizangiz tasdiqlandi"
          notificationMessage = "Tabriklaymiz! Siz endi tasdiqlangan sotuvchisiz."
          notificationType = "seller_approved"
        } else if (type === "product") {
          await supabase.from("products").update({ is_approved: true }).eq("id", application.product_data.id)
          notificationTitle = "Mahsulot arizangiz tasdiqlandi"
          notificationMessage = `${application.product_data.name} mahsulotingiz tasdiqlandi va bozorda ko'rinadi.`
          notificationType = "product_approved"
        }
        break

      case "approve_verified":
        if (type !== "seller") {
          return NextResponse.json({ error: "Bu amal faqat sotuvchilik arizalari uchun" }, { status: 400 })
        }
        updateData.status = "approved"
        userUpdateData = { is_verified_seller: true }
        notificationTitle = "Sotuvchilik arizangiz to'liq tasdiqlandi"
        notificationMessage = "Tabriklaymiz! Siz endi to'liq tasdiqlangan sotuvchisiz va barcha imkoniyatlarga egasiz."
        notificationType = "seller_verified_approved"
        break

      case "reject":
        updateData.status = "rejected"
        notificationTitle = "Arizangiz rad etildi"
        notificationMessage = `Arizangiz rad etildi. Sabab: ${notes || "Belgilanmagan"}`
        notificationType = "application_rejected"
        break

      case "respond":
        updateData.status = "responded"
        updateData.admin_response = notes
        notificationTitle = "Murojaatingizga javob berildi"
        notificationMessage = `Murojaatingizga javob berildi. Javob: ${notes || "Belgilanmagan"}`
        notificationType = "contact_responded"
        break

      default:
        return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 })
    }

    const { error: updateAppError } = await supabase.from("applications").update(updateData).eq("id", id)

    if (updateAppError) {
      console.error("Application update error:", updateAppError)
      return NextResponse.json({ error: "Arizani yangilashda xatolik" }, { status: 500 })
    }

    if (userUpdateData && application.user_id) {
      const { error: updateUserError } = await supabase
        .from("users")
        .update(userUpdateData)
        .eq("id", application.user_id)

      if (updateUserError) {
        console.error("User role update error:", updateUserError)
      }
    }

    if (notificationUserId) {
      await supabase.rpc("create_notification", {
        p_user_id: notificationUserId,
        p_title: notificationTitle,
        p_message: notificationMessage,
        p_type: notificationType,
        p_data: { application_id: id, type: type },
      })
    }

    return NextResponse.json({ success: true, message: "Ariza muvaffaqiyatli yangilandi" })
  } catch (error) {
    console.error("Applications PUT error:", error)
    return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 })
  }
}
