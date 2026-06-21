import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"
import { useTheme } from "../context/ThemeContext"
import { supabase } from "../services/supabaseClient"

export default function ForgotPassword() {
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email || "")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const panelClass = [
    "relative mx-auto w-full max-w-md overflow-hidden rounded-3xl p-5 sm:p-7",
    isDark
      ? "border border-white/10 bg-zinc-950/85 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      : "border border-black/10 bg-white/90 text-zinc-900 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
  ].join(" ")
  const inputClass = [
    "w-full rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-zinc-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20",
    isDark ? "border border-white/10 bg-black/40 text-white" : "border border-black/10 bg-white text-zinc-900",
  ].join(" ")
  const authActionClass =
    "inline-flex w-full items-center justify-center rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!email) {
      setError("Please enter your email address.")
      return
    }

    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        console.error("Reset password error:", resetError)
        setError(resetError.message)
        return
      }

      setSuccess("Check your email for the secure reset link. It opens the new password screen.")
    } catch (err) {
      console.error("Reset password error:", err)
      setError("Something went wrong while sending the reset link.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={[
        "relative flex min-h-[calc(100vh-7rem)] items-center px-4 py-8 sm:px-6 lg:px-8",
        isDark ? "bg-black" : "bg-zinc-50",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={[
            "absolute inset-0",
            isDark
              ? "bg-[radial-gradient(circle_at_15%_20%,rgba(239,68,68,0.14),transparent_45%),linear-gradient(to_bottom,rgba(24,24,27,0.35),rgba(0,0,0,0.9))]"
              : "bg-[radial-gradient(circle_at_15%_20%,rgba(239,68,68,0.09),transparent_45%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]",
          ].join(" ")}
        />
      </div>

      <section className={panelClass}>
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <img
              src={logo}
              alt="SPEEGO Logo"
              className={[
                "h-12 w-12 rounded-xl object-cover",
                isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-zinc-100",
              ].join(" ")}
            />
            <div>
              <h1 className={["text-xl font-black tracking-[0.14em]", isDark ? "text-white" : "text-zinc-900"].join(" ")}>SPEEGO</h1>
              <p className={["text-[11px] uppercase tracking-[0.18em]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>Password reset</p>
            </div>
          </div>

          <h2 className={["text-2xl font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Forgot your password?</h2>
          <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            Enter your account email and we will send a secure verification link to reset your password.
          </p>

          {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}
          {success && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</div>}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="forgot-email" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={loading} className={authActionClass}>
              {loading ? "Sending reset link..." : "Send verification email"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={["border-0 bg-transparent p-0 text-sm font-semibold transition", isDark ? "text-red-300 hover:text-red-200" : "text-red-700 hover:text-red-600"].join(" ")}
            >
              Back to login
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={["rounded-xl px-4 py-2 text-sm font-semibold transition", isDark ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10" : "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50"].join(" ")}
            >
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
