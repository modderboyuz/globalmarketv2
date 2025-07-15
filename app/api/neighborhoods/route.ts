import { NextResponse } from "next/server"

const neighborhoods = [
  "Amir Temur",
  "Beruniy",
  "Chilonzor",
  "Bektemir",
  "Mirzo Ulug'bek",
  "Mirobod",
  "Olmazor",
  "Sergeli",
  "Shayxontohur",
  "Uchtepa",
  "Yakkasaroy",
  "Yunusobod",
  "Yashnobod",
  "Yangihayot",
  "Qibray",
  "Zangiota",
  "Toshkent tumani",
  "Oqqo'rg'on",
  "Bo'stonliq",
  "Parkent",
  "Piskent",
  "Quyichirchiq",
  "O'rtachirchiq",
  "Yuqorichirchiq",
  "Angren",
  "Bekobod",
  "Olmaliq",
  "Chirchiq",
  "Yangiyul",
  "Guliston",
  "Sirdaryo",
  "Boyovut",
  "Mirzaobod",
  "Oqoltin",
  "Sardoba",
  "Xovos",
  "Samarqand",
  "Bukhoro",
  "Xiva",
  "Urganch",
  "Nukus",
  "Termiz",
  "Qarshi",
  "Navoiy",
  "Jizzax",
  "Guliston",
  "Andijon",
  "Farg'ona",
  "Namangan",
  "Qo'qon",
  "Margilan",
]

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      neighborhoods: neighborhoods.sort(),
    })
  } catch (error) {
    console.error("Neighborhoods GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server xatoligi",
      },
      { status: 500 },
    )
  }
}
