import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"
import { supabase } from "../services/supabaseClient"
import { useTheme } from "../context/ThemeContext"

const GOOGLE_ENABLED = true // for google login button

function validateSignupPassword(password) {
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

export default function Login() {
  const { isDark, toggleTheme } = useTheme()
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
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  const handleBack = () => {
    const returnTo = location.state?.returnTo
    if (returnTo) {
      navigate(returnTo)
    } else {
      navigate("/")
    }
  }

  const resetMessages = () => {
    setError("")
    setSuccess("")
  }

  // helper: redirect based on role + returnTo
  const redirectAfterLogin = async (userId) => {
    const returnTo = location.state?.returnTo || searchParams.get("next")

    if (!userId) {
      navigate(returnTo || "/", { replace: true })
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    // If profile lookup fails, fallback to returnTo/home
    if (profileError) {
      console.error("Error loading profile for redirect:", profileError)
      navigate(returnTo || "/", { replace: true })
      return
    }

    // Admins go to admin (ignore returnTo)
    if (profile?.role === "admin") {
      navigate("/admin/products", { replace: true })
      return
    }

    // Customers return to the page that required login (e.g. /cart)
    navigate(returnTo || "/", { replace: true })
  }

  // auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return
      if (!session.user?.email_confirmed_at) return
      await redirectAfterLogin(session.user.id)
    }

    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        return
      }

      if (mode === "signup") {
        const passwordValidationError = validateSignupPassword(password)
        if (passwordValidationError) {
          setError(passwordValidationError)
          return
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.")
          return
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?next=/profile`,
          },
        })

        if (signUpError) {
          console.error("Sign-up error:", signUpError)
          setError(signUpError.message)
          return
        }

        setSuccess("Account created. Check your email and click the verification link before logging in.")
        setMode("login")
        setPassword("")
        setConfirmPassword("")
        return
      }

      // login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        console.error("Login error:", loginError)
        setError(loginError.message)
        return
      }

      if (!data?.user?.email_confirmed_at) {
        await supabase.auth.signOut()
        setError("Please verify your email address first. Check your inbox for the confirmation link.")
        return
      }

      const userId = data?.session?.user?.id
      await redirectAfterLogin(userId)
    } catch (err) {
      console.error("Auth error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Google login (disabled for now)
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
      }
    } catch (err) {
      console.error("Google login error:", err)
      setError("Something went wrong with Google sign-in.")
    } finally {
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

  const panelClass =
    [
      "relative overflow-hidden rounded-3xl p-5 sm:p-7",
      isDark
        ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
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
    "inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"

  return (
    <div
      className={[
        "relative min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6 lg:px-8",
        isDark ? "bg-black text-white" : "bg-zinc-50 text-zinc-900",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={[
            "absolute inset-0",
            isDark
              ? "bg-[radial-gradient(circle_at_15%_20%,rgba(239,68,68,0.14),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.05),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.35),rgba(0,0,0,0.9))]"
              : "bg-[radial-gradient(circle_at_15%_20%,rgba(239,68,68,0.09),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(17,24,39,0.04),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]",
          ].join(" ")}
        />
        <div
          className={[
            "absolute inset-0 [background-size:22px_22px]",
            isDark
              ? "opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]"
              : "opacity-[0.05] [background-image:linear-gradient(rgba(17,24,39,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.10)_1px,transparent_1px)]",
          ].join(" ")}
        />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBack}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
              isDark
                ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white"
                : "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50 hover:text-zinc-900",
            ].join(" ")}
          >
            <span aria-hidden="true">&lt;</span>
            <span>Back to website</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={[
              "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition",
              isDark
                ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                : "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50",
            ].join(" ")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className={`${panelClass} hidden lg:block`}>
            <div className="pointer-events-none absolute -left-12 top-10 h-36 w-36 rounded-full bg-red-500/10 blur-3xl" />
            <div className={["pointer-events-none absolute right-6 top-6 h-20 w-20 rounded-full blur-2xl", isDark ? "bg-white/5" : "bg-black/5"].join(" ")} />

            <div className="relative">
              <div className={["mb-5 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600 "].join(" ")}>
                Speego Access
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={logo}
                  alt="SPEEGO Logo"
                  className={[
                    "h-16 w-16 rounded-2xl object-cover",
                    isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-zinc-100",
                  ].join(" ")}
                />
                <div>
                  <h1 className={["text-3xl font-black tracking-[0.16em]", isDark ? "text-white" : "text-zinc-900"].join(" ")}>SPEEGO</h1>
                  <p className={["text-sm uppercase tracking-[0.18em]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                    Electric Bike Shop Portal
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <h2 className={["text-3xl font-semibold leading-tight", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                  {mode === "login"
                    ? "Welcome back. Pick up where you left off."
                    : "Create your account and unlock faster checkout."}
                </h2>
                <p className={["max-w-md text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                  {mode === "login"
                    ? "Access your orders, manage profile details, and continue shopping with your saved preferences."
                    : "Sign up to place orders, track delivery status, and manage your account from one place."}
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className={["rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Secure Access</p>
                  <p className={["mt-2 text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900"].join(" ")}>
                    Email verification required before first login.
                  </p>
                </div>
                <div className={["rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Order Tracking</p>
                  <p className={["mt-2 text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900"].join(" ")}>
                    Manage purchases and view updates from your profile.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={panelClass}>
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
            <div className="pointer-events-none absolute -right-8 top-2 h-28 w-28 rounded-full bg-red-500/10 blur-3xl" />

            <div className="relative">
              <div className="mb-5 flex items-center gap-3 lg:hidden">
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
                  <p className={["text-[11px] uppercase tracking-[0.18em]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                    Electric Bike Shop Portal
                  </p>
                </div>
              </div>

              <div className={["grid grid-cols-2 rounded-2xl p-1", isDark ? "border border-white/10 bg-black/40" : "border border-black/10 bg-zinc-100"].join(" ")}>
                  <button
                    type="button"
                    onClick={() => handleModeChange("login")}
                    className={[
                      "rounded-xl border-0 bg-transparent px-4 py-2.5 text-sm font-semibold transition",
                      mode === "login"
                        ? "bg-red-600 text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)]"
                        : isDark ? "text-zinc-300 hover:bg-white/5 hover:text-white" : "text-zinc-700 hover:bg-white hover:text-zinc-900",
                  ].join(" ")}
                >
                  Log in
                </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("signup")}
                    className={[
                      "rounded-xl border-0 bg-transparent px-4 py-2.5 text-sm font-semibold transition",
                      mode === "signup"
                        ? "bg-red-600 text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)]"
                        : isDark ? "text-zinc-300 hover:bg-white/5 hover:text-white" : "text-zinc-700 hover:bg-white hover:text-zinc-900",
                  ].join(" ")}
                >
                  Sign up
                </button>
              </div>

              <p className={["mt-4 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                {mode === "login"
                  ? "Access the SPEEGO shop and manage your orders."
                  : "Create a SPEEGO account to place and track your orders."}
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {success}
                </div>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={!GOOGLE_ENABLED || loading}
                  title={!GOOGLE_ENABLED ? "Coming soon" : ""}
                  className={`${authActionClass} w-full ${isDark ? "border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10" : "border-black/10 bg-white text-zinc-900 hover:bg-zinc-50"}`}
                >
                  <span className={`mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isDark ? "border border-white/10 bg-black/40 text-white" : "border border-black/10 bg-zinc-100 text-zinc-900"}`}>
                    G
                  </span>
                  <span>
                    {GOOGLE_ENABLED ? "Continue with Google" : "Google sign-in (coming soon)"}
                  </span>
                </button>
              </div>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-zinc-500">
                <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-black/10"}`} />
                <span>or continue with email</span>
                <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-black/10"}`} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                    Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "login" ? "Enter your password" : "Create a password"}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className={`${smallBtnClass} shrink-0`}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className={["text-xs", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                      Use at least 8 characters with at least one lowercase letter and one number.
                    </p>
                  )}
                </div>

                {mode === "login" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={loading}
                      className={["border-0 bg-transparent p-0 text-sm font-medium transition disabled:opacity-60", isDark ? "text-red-300 hover:text-red-200" : "text-red-700 hover:text-red-600"].join(" ")}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                      Confirm password
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className={`${smallBtnClass} shrink-0`}
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`${authActionClass} w-full border-red-500 bg-red-600 text-white hover:bg-red-500`}
                >
                  {loading
                    ? mode === "login"
                      ? "Logging in..."
                      : "Creating account..."
                    : mode === "login"
                    ? "Log in"
                    : "Sign up"}
                </button>
              </form>

              <div className={["mt-5 rounded-xl px-4 py-3 text-sm", isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-zinc-50 text-zinc-700"].join(" ")}>
                {mode === "login" ? (
                  <p>
                    New to SPEEGO?{" "}
                    <button
                      type="button"
                      onClick={() => handleModeChange("signup")}
                      className={["border-0 bg-transparent p-0 font-semibold transition", isDark ? "text-red-300 hover:text-red-200" : "text-red-700 hover:text-red-600"].join(" ")}
                    >
                      Create an account
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => handleModeChange("login")}
                      className={["border-0 bg-transparent p-0 font-semibold transition", isDark ? "text-red-300 hover:text-red-200" : "text-red-700 hover:text-red-600"].join(" ")}
                    >
                      Log in here
                    </button>
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
