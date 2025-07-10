"use client"

import { useEffect, useState, type Dispatch, type SetStateAction } from "react"

export type Theme = "light" | "dark"

type UseThemeReturn = {
  theme: Theme
  setTheme: Dispatch<SetStateAction<Theme>>
}

/**
 * Minimal client-side theme hook.
 *
 * Persists selection in localStorage and toggles the `dark` class
 * on the <html> element so Tailwind’s dark‐mode utilities work.
 */
export function useTheme(): UseThemeReturn {
  const getInitial = (): Theme => {
    if (typeof window === "undefined") return "light"
    const stored = window.localStorage.getItem("theme") as Theme | null
    if (stored) return stored
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }

  const [theme, setTheme] = useState<Theme>(getInitial)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem("theme", theme)
  }, [theme])

  return { theme, setTheme }
}
