import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    // After login, check role and route accordingly
    const user = data.user
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    setLoading(false)

    if (profile?.role === "admin") navigate("/admin/products")
    else navigate("/")
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2 className="page-title">Login</h2>
      <p className="page-subtitle">Admin accounts can access the dashboard.</p>

      <form onSubmit={handleLogin} className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="form-field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="form-field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div className="form-actions" style={{ justifyContent: "flex-start" }}>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  )
}
