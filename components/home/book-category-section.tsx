import type { Book } from "@/types"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import BookCard from "../book-card"

interface BookCategorySectionProps {
  category: string
}

async function getBooksByCategory(category: string): Promise<Book[]> {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase.from("books").select("*").eq("category", category)

  if (error) {
    console.error("Error fetching books:", error)
    return []
  }

  return data || []
}

export function BookCategorySection({ category }: BookCategorySectionProps) {
  const getBooks = getBooksByCategory(category)

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4 capitalize">{category}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* @ts-expect-error Server Component */}
        <BookCard getBooks={getBooks} />
      </div>
    </section>
  )
}

export default BookCategorySection
