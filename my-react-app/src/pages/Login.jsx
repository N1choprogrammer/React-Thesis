// src/pages/Login.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"

const GOOGLE_ENABLED = false  // flip when ready
const FACEBOOK_ENABLED = false // flip when ready

export default function Login() {
  const [mode, setMode] = useState("login") // "login" | "signup"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const navigate = useNavigate()

  const resetMessages = () => {
    setError("")
    setSuccess("")
  }

  // helper: redirect based on role
  const redirectByRole = async (userId) => {
    if (!userId) {
      navigate("/", { replace: true })
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("Error loading profile for redirect:", profileError)
      navigate("/", { replace: true })
      return
    }

    if (profile?.role === "admin") {
      navigate("/admin/products", { replace: true })
    } else {
      navigate("/", { replace: true })
    }
  }

  // auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      await redirectByRole(session.user.id)
    }

    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

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

        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          console.error("Sign-up error:", error)
          setError(error.message)
          setLoading(false)
          return
        }

        setSuccess("Account created successfully. You can now log in.")
        setMode("login")
        setPassword("")
        setConfirmPassword("")
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.error("Login error:", error)
          setError(error.message)
          setLoading(false)
          return
        }

        const userId = data?.session?.user?.id
        await redirectByRole(userId)
      }
    } catch (err) {
      console.error("Auth error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Google login
  const handleGoogleLogin = async () => {
    if (!GOOGLE_ENABLED) return

    resetMessages()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (error) {
        console.error("Google login error:", error)
        setError(error.message)
        setLoading(false)
      }
    } catch (err) {
      console.error("Google login error:", err)
      setError("Something went wrong with Google sign-in.")
      setLoading(false)
    }
  }

  // Facebook login
  const handleFacebookLogin = async () => {
    if (!FACEBOOK_ENABLED) return

    resetMessages()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (error) {
        console.error("Facebook login error:", error)
        setError(error.message)
        setLoading(false)
      }
    } catch (err) {
      console.error("Facebook login error:", err)
      setError("Something went wrong with Facebook sign-in.")
      setLoading(false)
    }
  }

  // Forgot password
  const handlePasswordReset = async () => {
    resetMessages()

    if (!email) {
      setError("Please type your email above so we know where to send the reset link.")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login",
      })

      if (error) {
        console.error("Reset password error:", error)
        setError(error.message)
      } else {
        setSuccess("If that email is registered, a reset link has been sent.")
      }
    } catch (err) {
      console.error("Reset password error:", err)
      setError("Something went wrong while sending the reset email.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className={`auth-card auth-card-${mode}`}>
        {/* Brand header */}
        <div className="auth-brand">
          <img src={logo} alt="SPEEGO Logo" className="auth-logo-image" />
          <div>
            <h1 className="auth-title">SPEEGO</h1>
            <p className="auth-subtitle">Electric Bike Shop Portal</p>
          </div>
        </div>

        {/* Login / Signup toggle */}
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

        <p className="auth-description">
          {mode === "login"
            ? "Access the SPEEGO shop and manage your orders."
            : "Create a SPEEGO account to place and track your orders."}
        </p>

        {/* Status messages */}
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {success && <div className="auth-alert auth-alert-success">{success}</div>}

        {/* Social login buttons */}
        <div className="auth-social">
          <button
            type="button"
            className="auth-provider-btn"
            onClick={handleGoogleLogin}
            disabled={!GOOGLE_ENABLED || loading}
            title={!GOOGLE_ENABLED ? "Coming soon" : ""}
          >
            <span className="auth-provider-icon">G</span>
            <span>
              {GOOGLE_ENABLED
                ? "Continue with Google"
                : "Google sign-in (coming soon)"}
            </span>
          </button>

          <button
            type="button"
            className="auth-provider-btn auth-provider-btn-facebook"
            onClick={handleFacebookLogin}
            disabled={!FACEBOOK_ENABLED || loading}
            title={!FACEBOOK_ENABLED ? "Coming soon" : ""}
          >
            <span className="auth-provider-icon auth-provider-icon-facebook">
              f
            </span>
            <span>
              {FACEBOOK_ENABLED
                ? "Continue with Facebook"
                : "Facebook sign-in (coming soon)"}
            </span>
          </button>
        </div>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        {/* Email / password form */}
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
            <div className="auth-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "login" ? "Enter your password" : "Create a password"
                }
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Forgot password (only in login mode) */}
          {mode === "login" && (
            <div className="auth-forgot-row">
              <button
                type="button"
                className="auth-link-btn"
                onClick={handlePasswordReset}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="auth-password-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
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
