import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"
import { useLocation } from "react-router-dom"

export default function Profile() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [userEmail, setUserEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const location = useLocation()

    const returnTo = location.state?.returnTo
    if (returnTo) {
    navigate(returnTo, { replace: true })
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
        // If not logged in, send them to login
        navigate("/login", { replace: true })
        return
      }

      setUserEmail(user.email || "")

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, address")
        .eq("id", user.id)
        .single()

      // If profile row doesn't exist (rare), we'll create it on save via upsert
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

    // Upsert ensures the row is created if missing
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })

    if (error) {
      console.error("Save profile error:", error)
      setErrorMsg(error.message || "Failed to save profile.")
      setSaving(false)
      return
    }

    setSuccessMsg("✅ Profile saved successfully!")
    setSaving(false)
  }

  if (loading) {
    return <p className="page-subtitle">Loading profile…</p>
  }

  return (
    <div className="profile-page">
      <h2 className="page-title">My Profile</h2>
      <p className="page-subtitle">
        Save your details so checkout can automatically fill your information.
      </p>

      {errorMsg && (
        <div className="cart-alert cart-alert-error">
          <p>⚠️ {errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="cart-alert cart-alert-success">
          <p>{successMsg}</p>
        </div>
      )}

      <form className="checkout-form" onSubmit={handleSave}>
        <div className="checkout-field">
          <label>Email</label>
          <input type="email" value={userEmail} disabled />
          <small style={{ color: "var(--text-muted)" }}>
            Email comes from your account and can’t be edited here.
          </small>
        </div>

        <div className="checkout-field">
          <label>Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Dela Cruz"
            required
          />
        </div>

        <div className="checkout-field">
          <label>Phone number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XX-XXX-XXXX"
            required
          />
        </div>

        <div className="checkout-field">
          <label>Address</label>
          <textarea
            rows={4}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="House no., street, barangay, city, province"
            required
          />
        </div>

        <button className="btn btn-primary cart-checkout-btn" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  )
}
