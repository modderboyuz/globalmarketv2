"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  id?: string
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "90 123 45 67",
  className,
  required,
  id,
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState("")

  useEffect(() => {
    // Format the initial value
    if (value) {
      const formatted = formatPhoneNumber(value)
      setDisplayValue(formatted)
    }
  }, [value])

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "")

    // Remove leading 998 if present
    const withoutCountryCode = digits.startsWith("998") ? digits.slice(3) : digits

    // Format as XX XXX XX XX
    let formatted = withoutCountryCode
    if (formatted.length >= 2) {
      formatted = formatted.slice(0, 2) + " " + formatted.slice(2)
    }
    if (formatted.length >= 6) {
      formatted = formatted.slice(0, 6) + " " + formatted.slice(6)
    }
    if (formatted.length >= 9) {
      formatted = formatted.slice(0, 9) + " " + formatted.slice(9, 11)
    }

    return formatted
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value

    // Remove the +998 prefix for processing
    const withoutPrefix = input.replace("+998 ", "")

    // Format the number
    const formatted = formatPhoneNumber(withoutPrefix)

    // Limit to 11 characters (XX XXX XX XX)
    if (formatted.replace(/\s/g, "").length <= 9) {
      setDisplayValue(formatted)

      // Send back the full number with country code
      const fullNumber = "+998" + formatted.replace(/\s/g, "")
      onChange(fullNumber)
    }
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">+998</div>
      <Input
        id={id}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("pl-16 phone-input", className)}
        required={required}
      />
    </div>
  )
}
