// src/pages/Login.jsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"

export default function AuthPage() {
  const [mode, setMode] = useState("login") // "login" | "signup"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const resetMessages = () => {
    setError("")
    setSuccess("")
  }

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return
    resetMessages()
    setMode(nextMode)
    setPassword("")
    setConfirmPassword("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    resetMessages()
    setLoading(true)

    try {
      if (!email || !password) {
        setError("Please enter your email and password.")
        setLoading(false)
        return
      }

      if (mode === "signup") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.")
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.")
          setLoading(false)
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          console.error("Sign-up error:", error)
          setError(error.message)
          setLoading(false)
          return
        }

        // In many setups, Supabase may require email confirmation.
        // For this thesis project, we'll just show a success message and switch to login mode.
        setSuccess("Account created successfully. You can now log in.")
        setMode("login")
        setPassword("")
        setConfirmPassword("")
      } else {
        // LOGIN MODE
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.error("Login error:", error)
          setError(error.message)
          setLoading(false)
          return
        }

        // On successful login, redirect to home or admin/products depending on your preference
        navigate("/")
      }
    } catch (err) {
      console.error("Auth error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo / Brand */}
        <div className="auth-brand">
          <div className="auth-logo-circle">
            <img src={logo} alt="Speego" height="36" />
          </div>
          <div>
            <h1 className="auth-title">SPEEGO</h1>
            <p className="auth-subtitle">Electric Bike Shop Portal</p>
          </div>
        </div>

        {/* Toggle: Login | Sign up */}
        <div className="auth-toggle">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => handleModeChange("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => handleModeChange("signup")}
          >
            Sign up
          </button>
        </div>

        {/* Description text */}
        <p className="auth-description">
          {mode === "login"
            ? "Access the SPEEGO shop and manage your orders."
            : "Create a SPEEGO account to place and track your orders."}
        </p>

        {/* Status messages */}
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {success && <div className="auth-alert auth-alert-success">{success}</div>}

        {/* FORM */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "login" ? "Enter your password" : "Create a password"}
            />
          </div>

          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading
              ? mode === "login"
                ? "Logging in…"
                : "Creating account…"
              : mode === "login"
              ? "Log in"
              : "Sign up"}
          </button>
        </form>

        {/* Bottom hint */}
        <div className="auth-footer-switch">
          {mode === "login" ? (
            <p>
              New to SPEEGO?{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => handleModeChange("signup")}
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => handleModeChange("login")}
              >
                Log in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
