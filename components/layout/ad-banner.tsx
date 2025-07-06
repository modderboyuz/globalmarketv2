"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { X } from "lucide-react"

interface Ad {
  id: string
  title: string
  description: string
  image_url: string
  ad_link: string
  click_count: number
}

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([])
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

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
    }
  }

  const handleAdClick = async (ad: Ad) => {
    try {
      // Increment click count
      await supabase
        .from("ads")
        .update({ click_count: ad.click_count + 1 })
        .eq("id", ad.id)

      // Open link
      window.open(ad.ad_link, "_blank")
    } catch (error) {
      console.error("Error tracking ad click:", error)
      // Still open the link even if tracking fails
      window.open(ad.ad_link, "_blank")
    }
  }

  if (!isVisible || ads.length === 0) {
    return null
  }

  const currentAd = ads[currentAdIndex]

  return (
    <div className="hidden lg:block w-full mb-8">
      <Card className="relative overflow-hidden cursor-pointer group" onClick={() => handleAdClick(currentAd)}>
        <div className="relative w-full h-[200px] md:h-[250px]">
          <Image
            src={currentAd.image_url || "/placeholder.svg"}
            alt={currentAd.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />

          {/* Ad Content Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-6">
              <h3 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg">{currentAd.title}</h3>
              {currentAd.description && (
                <p className="text-lg md:text-xl drop-shadow-lg opacity-90">{currentAd.description}</p>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsVisible(false)
            }}
            className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Ad Indicator */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded">Reklama</div>

          {/* Pagination Dots */}
          {ads.length > 1 && (
            <div className="absolute bottom-4 right-4 flex space-x-2">
              {ads.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentAdIndex(index)
                  }}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    index === currentAdIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
