"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface Book {
  id: string
  title: string
  author?: string
  price?: number
  imageUrl?: string
  badge?: string
  className?: string
}

export default function BookCard({
  id,
  title,
  author,
  price,
  imageUrl = "/placeholder.svg?height=300&width=220",
  badge,
  className,
}: Book) {
  return (
    <Link href={`/book/${id}`} passHref className="block">
      <Card className={cn("overflow-hidden transition-shadow hover:shadow-lg", className)}>
        <div className="relative w-full h-[300px] bg-muted">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, 220px"
            className="object-cover"
            priority={false}
          />
          {badge && <Badge className="absolute left-2 top-2 backdrop-blur-sm bg-background/70">{badge}</Badge>}
        </div>

        <CardContent className="p-3 space-y-1">
          <h3 className="text-sm font-medium leading-snug line-clamp-2">{title}</h3>
          {author && <p className="text-xs text-muted-foreground">{author}</p>}
        </CardContent>

        {price !== undefined && (
          <CardFooter className="p-3 pt-0">
            <p className="text-sm font-semibold">
              {price.toLocaleString("uz-UZ", { style: "currency", currency: "UZS" })}
            </p>
          </CardFooter>
        )}
      </Card>
    </Link>
  )
}
