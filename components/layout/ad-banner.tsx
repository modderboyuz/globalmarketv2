"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Ad {
  id: string
  title: string
  description: string
  image_url: string
  link_url: string
  click_count: number
}

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([])
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAds()
  }, [])

  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length)
      }, 5000) // Change ad every 5 seconds

      return () => clearInterval(interval)
    }
  }, [ads.length])

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAds(data || [])
    } catch (error) {
      console.error("Error fetching ads:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdClick = async (adId: string, linkUrl: string) => {
    try {
      // Increment click count
      await supabase.from("ads").update({ click_count: supabase.sql`click_count + 1` }).eq("id", adId)

      // Open link
      window.open(linkUrl, "_blank")
    } catch (error) {
      console.error("Error tracking ad click:", error)
    }
  }

  const nextAd = () => {
    setCurrentAdIndex((prev) => (prev + 1) % ads.length)
  }

  const prevAd = () => {
    setCurrentAdIndex((prev) => (prev - 1 + ads.length) % ads.length)
  }

  if (loading || ads.length === 0) {
    return null
  }

  const currentAd = ads[currentAdIndex]

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100">
      <div className="relative h-32 md:h-40">
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">{currentAd.title}</h3>
                {currentAd.description && (
                  <p className="text-sm md:text-base text-gray-600 mb-3 line-clamp-2">{currentAd.description}</p>
                )}
                <Button
                  onClick={() => handleAdClick(currentAd.id, currentAd.link_url)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ko'rish
                </Button>
              </div>

              <div className="hidden md:block w-32 h-24 relative rounded-xl overflow-hidden bg-white shadow-lg">
                <Image
                  src={currentAd.image_url || "/placeholder.svg?height=100&width=150"}
                  alt={currentAd.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {ads.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full shadow-md"
              onClick={prevAd}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full shadow-md"
              onClick={nextAd}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Dots indicator */}
        {ads.length > 1 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {ads.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentAdIndex ? "bg-blue-600" : "bg-white/60"
                }`}
                onClick={() => setCurrentAdIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
