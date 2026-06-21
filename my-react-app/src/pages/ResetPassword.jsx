import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"
import { useTheme } from "../context/ThemeContext"
import { supabase } from "../services/supabaseClient"

function validateResetPassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters."
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter."
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number."
  }
  return ""
}

export default function ResetPassword() {
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasActiveSession, setHasActiveSession] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return
      setHasActiveSession(Boolean(session))
      setCheckingSession(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      setHasActiveSession(Boolean(session))
      setCheckingSession(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

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
  const smallBtnClass = [
    "rounded-lg px-3 py-1.5 text-xs font-medium transition",
    isDark
      ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
      : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
  ].join(" ")
  const authActionClass =
    "inline-flex w-full items-center justify-center rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    const passwordValidationError = validateResetPassword(password)
    if (passwordValidationError) {
      setError(passwordValidationError)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        console.error("Update password error:", updateError)
        setError(updateError.message)
        return
      }

      setSuccess("Password updated. You can now log in with your new password.")
      setPassword("")
      setConfirmPassword("")
      await supabase.auth.signOut()
    } catch (err) {
      console.error("Update password error:", err)
      setError("Something went wrong while updating your password.")
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
              <p className={["text-[11px] uppercase tracking-[0.18em]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>New password</p>
            </div>
          </div>

          <h2 className={["text-2xl font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Create a new password</h2>
          <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            Change your password directly while you are logged in to your SPEEGO account.
          </p>

          {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}
          {success && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</div>}
          {!checkingSession && !hasActiveSession && !success && (
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Please log in first, then return here to change your password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                New password
              </label>
              <div className="flex gap-2">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  className={inputClass}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className={`${smallBtnClass} shrink-0`}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className={["text-xs", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                Use at least 8 characters with at least one lowercase letter and one number.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-new-password" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                Confirm new password
              </label>
              <div className="flex gap-2">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  className={inputClass}
                />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className={`${smallBtnClass} shrink-0`}>
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || checkingSession || !hasActiveSession} className={authActionClass}>
              {loading ? "Updating password..." : "Update password"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(success || !hasActiveSession ? "/login" : "/profile")}
              className={["border-0 bg-transparent p-0 text-sm font-semibold transition", isDark ? "text-red-300 hover:text-red-200" : "text-red-700 hover:text-red-600"].join(" ")}
            >
              {success || !hasActiveSession ? "Back to login" : "Back to profile"}
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
