import { createContext, useContext, useEffect, useMemo, useState } from "react"

const THEME_KEY = "speego-theme"
const ThemeContext = createContext(null)

function applyThemeToDocument(theme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.setAttribute("data-theme", theme)
  root.classList.toggle("dark", theme === "dark")
  root.classList.toggle("light", theme === "light")
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark"
    const saved = window.localStorage.getItem(THEME_KEY)
    return saved === "light" ? "light" : "dark"
  })

  useEffect(() => {
    applyThemeToDocument(theme)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, theme)
    }
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme !== "light",
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider")
  }
  return ctx
}

