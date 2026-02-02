import { useEffect, useState } from "react"
import { supabase } from "../services/supabaseClient"
import { Navigate, Outlet } from "react-router-dom"


export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData?.session?.user

      if (!user) {
        setAllowed(false)
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Profile fetch error:", error)
        setAllowed(false)
      } else {
        setAllowed(profile?.role === "admin")
      }

      setLoading(false)
    }

    check()
  }, [])

  if (loading) return <p>Loading...</p>

  if (!allowed) return <Navigate to="/login" replace />

  return children
}

