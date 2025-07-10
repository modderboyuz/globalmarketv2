import { createSupabaseClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase.from("users").select("type").eq("id", user.id).single()

    if (userError || !userData || userData.type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "orders"

    let data: any[] = []
    let filename = "export.xlsx"

    switch (type) {
      case "orders":
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select(`
            id,
            quantity,
            total_price,
            status,
            address,
            created_at,
            products (title, price),
            users (full_name, email, phone)
          `)
          .order("created_at", { ascending: false })

        if (ordersError) throw ordersError

        data =
          orders?.map((order) => ({
            "Buyurtma ID": order.id,
            Mahsulot: order.products?.title,
            Mijoz: order.users?.full_name,
            Email: order.users?.email,
            Telefon: order.users?.phone,
            Miqdor: order.quantity,
            Narx: order.total_price,
            Status: order.status,
            Manzil: order.address,
            Sana: new Date(order.created_at).toLocaleDateString("uz-UZ"),
          })) || []
        filename = "buyurtmalar.xlsx"
        break

      case "products":
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select(`
            id,
            title,
            price,
            stock_quantity,
            sold_quantity,
            status,
            created_at,
            users (full_name, company_name)
          `)
          .order("created_at", { ascending: false })

        if (productsError) throw productsError

        data =
          products?.map((product) => ({
            "Mahsulot ID": product.id,
            Nomi: product.title,
            Narx: product.price,
            "Ombordagi soni": product.stock_quantity,
            "Sotilgan soni": product.sold_quantity,
            Status: product.status,
            Sotuvchi: product.users?.full_name,
            Kompaniya: product.users?.company_name,
            Sana: new Date(product.created_at).toLocaleDateString("uz-UZ"),
          })) || []
        filename = "mahsulotlar.xlsx"
        break

      case "users":
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })

        if (usersError) throw usersError

        data =
          users?.map((user) => ({
            "Foydalanuvchi ID": user.id,
            "To'liq ism": user.full_name,
            Email: user.email,
            Telefon: user.phone,
            Turi: user.type,
            Kompaniya: user.company_name,
            Manzil: user.address,
            Sana: new Date(user.created_at).toLocaleDateString("uz-UZ"),
          })) || []
        filename = "foydalanuvchilar.xlsx"
        break

      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ma'lumotlar")

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
