import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const format = searchParams.get("format") || "json"

    let data: any[] = []
    let filename = "export"

    switch (type) {
      case "users":
        const { data: users } = await supabase.from("users").select("*").order("created_at", { ascending: false })
        data = users || []
        filename = "users"
        break

      case "orders":
        const { data: orders } = await supabase
          .from("orders")
          .select(`
            *,
            products (name, price),
            users (full_name, email)
          `)
          .order("created_at", { ascending: false })
        data = orders || []
        filename = "orders"
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
        data = products || []
        filename = "products"
        break

      default:
        return NextResponse.json({ error: "Noto'g'ri export turi" }, { status: 400 })
    }

    if (format === "csv") {
      // Convert to CSV
      if (data.length === 0) {
        return new NextResponse("", {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
          },
        })
      }

      const headers = Object.keys(data[0]).join(",")
      const rows = data
        .map((row) =>
          Object.values(row)
            .map((value) => (typeof value === "object" ? JSON.stringify(value) : String(value)))
            .join(","),
        )
        .join("\n")

      const csv = `${headers}\n${rows}`

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({ data, filename })
  } catch (error) {
    console.error("Export Error:", error)
    return NextResponse.json({ error: "Export qilishda xatolik" }, { status: 500 })
  }
}
