import { supabase } from "../services/supabaseClient"

export async function getCustomerProfileSnapshot() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { ok: false, user: null, profile: { fullName: "Customer", phone: "Not provided", email: null, address: "" } }
  }

  if (!user) {
    return { ok: false, user: null, profile: { fullName: "Customer", phone: "Not provided", email: null, address: "" } }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, address")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("Profile lookup error:", profileError)
  }

  const fullName = (profile?.full_name || "").trim() || "Customer"
  const phone = (profile?.phone || "").trim() || "Not provided"
  const address = (profile?.address || "").trim()

  return {
    ok: true,
    user,
    profile: {
      fullName,
      phone,
      email: user.email || null,
      address,
    },
  }
}

/**
 * Ensures user is logged in and has a completed profile.
 * Returns:
 *  { ok: true, user, profile }
 *  { ok: false, redirectTo, reason }
 */
export async function requireCustomerProfile() {
  const snapshot = await getCustomerProfileSnapshot()

  if (!snapshot.ok || !snapshot.user) {
    return { ok: false, redirectTo: "/login", reason: "not_logged_in" }
  }

  const fullName = (snapshot.profile?.fullName || "").trim()
  const phone = (snapshot.profile?.phone || "").trim()
  const address = (snapshot.profile?.address || "").trim()

  const complete = fullName && phone && address

  if (!complete) {
    return { ok: false, redirectTo: "/profile", reason: "profile_incomplete" }
  }

  return {
    ok: true,
    user: snapshot.user,
    profile: {
      fullName,
      phone,
      address,
      email: snapshot.profile?.email || snapshot.user.email || null,
    },
  }
}
