import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import * as XLSX from "xlsx"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const userId = searchParams.get("userId")

    if (!type) {
      return NextResponse.json({ error: "Export type talab qilinadi" }, { status: 400 })
    }

    // Check if user is admin
    if (userId) {
      const { data: user } = await supabase.from("users").select("is_admin").eq("id", userId).single()
      if (!user?.is_admin) {
        return NextResponse.json({ error: "Admin huquqi talab qilinadi" }, { status: 403 })
      }
    }

    let data: any[] = []
    let filename = ""

    switch (type) {
      case "orders":
        const { data: orders } = await supabase
          .from("orders")
          .select(`
            id,
            full_name,
            phone,
            address,
            quantity,
            total_amount,
            status,
            created_at,
            products (name, price)
          `)
          .order("created_at", { ascending: false })

        data =
          orders?.map((order) => ({
            "Buyurtma ID": order.id.slice(-8),
            "Mijoz ismi": order.full_name,
            Telefon: order.phone,
            Manzil: order.address,
            Mahsulot: order.products?.name,
            Miqdor: order.quantity,
            "Jami summa": order.total_amount,
            Holat: order.status,
            Sana: new Date(order.created_at).toLocaleDateString(),
          })) || []
        filename = "buyurtmalar"
        break

      case "users":
        const { data: users } = await supabase.from("users").select("*").order("created_at", { ascending: false })

        data =
          users?.map((user) => ({
            ID: user.id.slice(-8),
            Ism: user.full_name,
            Email: user.email,
            Telefon: user.phone,
            Kompaniya: user.company_name,
            Sotuvchi: user.is_verified_seller ? "Ha" : "Yo'q",
            Admin: user.is_admin ? "Ha" : "Yo'q",
            "Ro'yxatdan o'tgan sana": new Date(user.created_at).toLocaleDateString(),
          })) || []
        filename = "foydalanuvchilar"
        break

      case "products":
        const { data: products } = await supabase
          .from("products")
          .select(`
            *,
            categories (name_uz),
            users (full_name, company_name)
          `)
          .order("created_at", { ascending: false })

        data =
          products?.map((product) => ({
            ID: product.id.slice(-8),
            Nomi: product.name,
            Narx: product.price,
            Kategoriya: product.categories?.name_uz,
            Sotuvchi: product.users?.company_name || product.users?.full_name,
            "Ombordagi soni": product.stock_quantity,
            "Sotilgan soni": product.order_count,
            "Ko'rishlar": product.view_count,
            Reyting: product.average_rating,
            Holat: product.is_active ? "Faol" : "Nofaol",
            Tasdiqlangan: product.is_approved ? "Ha" : "Yo'q",
            "Yaratilgan sana": new Date(product.created_at).toLocaleDateString(),
          })) || []
        filename = "mahsulotlar"
        break

      default:
        return NextResponse.json({ error: "Noto'g'ri export type" }, { status: 400 })
    }

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, "Ma'lumotlar")

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" })

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Export Error:", error)
    return NextResponse.json({ error: "Export qilishda xatolik" }, { status: 500 })
  }
}
