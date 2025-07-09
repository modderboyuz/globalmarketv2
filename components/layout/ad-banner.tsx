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
      await supabase.rpc("increment_ad_clicks", { ad_id: adId })

      // Open link
      if (linkUrl && linkUrl !== "#") {
        window.open(linkUrl, "_blank")
      }
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
    return (
      <Card className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 h-48 md:h-64 lg:h-80">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-32 mx-auto"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mx-auto"></div>
          </div>
        </div>
      </Card>
    )
  }

  const currentAd = ads[currentAdIndex]

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 shadow-xl">
      <div className="relative h-48 md:h-64 lg:h-80">
        {/* Background Image */}
        {currentAd.image_url && currentAd.image_url !== "/placeholder.svg" && (
          <div className="absolute inset-0">
            <Image
              src={currentAd.image_url || "/placeholder.svg"}
              alt={currentAd.title}
              fill
              className="object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          </div>
        )}

        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Content */}
              <div className="text-center lg:text-left">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 leading-tight">
                  {currentAd.title}
                </h2>
                {currentAd.description && (
                  <p className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed max-w-2xl">
                    {currentAd.description}
                  </p>
                )}
                <Button
                  onClick={() => handleAdClick(currentAd.id, currentAd.link_url)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  size="lg"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Ko'rish
                </Button>
              </div>

              {/* Image */}
              <div className="hidden lg:block">
                <div className="relative w-full h-48 lg:h-64 rounded-2xl overflow-hidden bg-white shadow-2xl">
                  <Image
                    src={currentAd.image_url || "/placeholder.svg?height=300&width=500"}
                    alt={currentAd.title}
                    fill
                    className="object-cover"
                  />
                </div>
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
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full shadow-lg backdrop-blur-sm"
              onClick={prevAd}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full shadow-lg backdrop-blur-sm"
              onClick={nextAd}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Dots indicator */}
        {ads.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
            {ads.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentAdIndex ? "bg-white shadow-lg scale-125" : "bg-white/60 hover:bg-white/80"
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
