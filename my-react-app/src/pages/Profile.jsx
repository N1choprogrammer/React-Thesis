import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"
import { useTheme } from "../context/ThemeContext"

export default function Profile() {
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [userEmail, setUserEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)

  const validatePassword = (password) => {
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

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setErrorMsg(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error(userError)
        setErrorMsg("Failed to check your session.")
        setLoading(false)
        return
      }

      if (!user) {
        navigate("/login", { replace: true })
        return
      }

      setUserEmail(user.email || "")

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, address")
        .eq("id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Load profile error:", error)
        setErrorMsg("Failed to load profile.")
        setLoading(false)
        return
      }

      if (data) {
        setFullName(data.full_name || "")
        setPhone(data.phone || "")
        setAddress(data.address || "")
      }

      setLoading(false)
    }

    loadProfile()
  }, [navigate])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setErrorMsg("You need to be logged in.")
      setSaving(false)
      return
    }

    const payload = {
      id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
    }

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" })

    if (error) {
      console.error("Save profile error:", error)
      const duplicateName =
        String(error.message || "").includes("duplicate_profile_name") ||
        String(error.message || "").includes("Username already exists") ||
        String(error.details || "").includes("Username already exists") ||
        String(error.details || "").includes("similar customer name")
      setErrorMsg(
        duplicateName
          ? "Username already exists."
          : error.message || "Failed to save profile."
      )
      setSaving(false)
      return
    }

    setSuccessMsg("Profile saved successfully.")
    setSaving(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setErrorMsg(passwordError)
      setSaving(false)
      return
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match.")
      setSaving(false)
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setErrorMsg("You need to be logged in.")
      setSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      console.error("Change password error:", error)
      setErrorMsg(error.message || "Failed to change password.")
      setSaving(false)
      return
    }

    setNewPassword("")
    setConfirmNewPassword("")
    setSuccessMsg("Password changed successfully.")
    setSaving(false)
  }

  const inputClass =
    [
      "w-full rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-zinc-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed",
      isDark
        ? "border border-white/10 bg-black/40 text-white disabled:bg-white/5 disabled:text-zinc-400"
        : "border border-black/10 bg-white text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500",
    ].join(" ")

  if (loading) {
    return (
      <div className={["min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6 lg:px-8", isDark ? "bg-black text-white" : "bg-transparent text-zinc-900"].join(" ")}>
        <div className={["mx-auto max-w-4xl rounded-2xl p-5 text-sm", isDark ? "border border-white/10 bg-zinc-950/85 text-zinc-300" : "border border-black/10 bg-white/90 text-zinc-600"].join(" ")}>
          Loading profile...
        </div>
      </div>
    )
  }

  return (
    <div className={["relative min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6 lg:px-8", isDark ? "bg-black text-white" : "bg-transparent text-zinc-900"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className={["absolute inset-0", isDark ? "bg-[radial-gradient(circle_at_12%_10%,rgba(239,68,68,0.10),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(255,255,255,0.04),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.2),rgba(0,0,0,0.92))]" : "bg-[radial-gradient(circle_at_12%_10%,rgba(239,68,68,0.08),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(17,24,39,0.04),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]"].join(" ")} />
        <div className={["absolute inset-0 [background-size:24px_24px]", isDark ? "opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]" : "opacity-[0.05] [background-image:linear-gradient(rgba(17,24,39,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.10)_1px,transparent_1px)]"].join(" ")} />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div className={["mb-6 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6", isDark ? "border border-white/10 bg-zinc-950/85" : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]"].join(" ")}>
          <div
            className={[
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
              isDark
                ? "border-red-400/20 bg-red-500/10 text-red-200"
                : "border-red-300 bg-red-50 text-red-700",
            ].join(" ")}
          >
            Account Settings
          </div>
          <h2 className={["mt-3 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>My Profile</h2>
          <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            Save your details so checkout can automatically fill your information.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {successMsg}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className={[
            "space-y-5 rounded-3xl p-5 sm:p-6",
            isDark
              ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
          ].join(" ")}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={["mb-2 block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>Email</label>
              <input type="email" value={userEmail} disabled className={inputClass} />
              <p className={["mt-2 text-xs", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                Email comes from your account and can&apos;t be edited here.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={["mb-2 block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                required
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={["mb-2 block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>Phone number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XX-XXX-XXXX"
                required
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={["mb-2 block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>Address</label>
              <textarea
                rows={4}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no., street, barangay, city, province"
                required
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>

          <div className={["flex items-center justify-between gap-3 pt-4", isDark ? "border-t border-white/10" : "border-t border-black/10"].join(" ")}>
            <p className={["text-xs", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>Your checkout form will reuse these details.</p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-red-500 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>

        <form
          onSubmit={handlePasswordChange}
          className={[
            "mt-6 space-y-5 rounded-3xl p-5 sm:p-6",
            isDark
              ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
          ].join(" ")}
        >
          <div>
            <h3 className={["text-lg font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Change password</h3>
            <p className={["mt-1 text-sm", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
              Update your password directly from your account.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="profile-new-password" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                New password
              </label>
              <div className="flex gap-2">
                <input
                  id="profile-new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((value) => !value)}
                  className={["shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition", isDark ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10" : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10"].join(" ")}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-confirm-password" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                Confirm new password
              </label>
              <div className="flex gap-2">
                <input
                  id="profile-confirm-password"
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword((value) => !value)}
                  className={["shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition", isDark ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10" : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10"].join(" ")}
                >
                  {showConfirmNewPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <div className={["flex flex-wrap items-center justify-between gap-3 pt-4", isDark ? "border-t border-white/10" : "border-t border-black/10"].join(" ")}>
            <p className={["text-xs", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
              Use at least 8 characters with one lowercase letter and one number.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-red-500 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Updating..." : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
