// src/components/AdminRoute.jsx
import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      // 1) Check session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setAllowed(false)
        setLoading(false)
        return
      }

      // 2) Check profile.role === 'admin'
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (error) {
        console.error("Error loading profile in AdminRoute:", error)
        setAllowed(false)
        setLoading(false)
        return
      }

      setAllowed(profile?.role === "admin")
      setLoading(false)
    }

    checkAdmin()
  }, [])

  if (loading) {
    return <div style={{ padding: "1rem" }}>Checking admin access…</div>
  }

  if (!allowed) {
    return <Navigate to="/login" replace />
  }

  return children
}
