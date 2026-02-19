import { supabase } from "../services/supabaseClient"

/**
 * Ensures user is logged in and has a completed profile.
 * Returns:
 *  { ok: true, user, profile }
 *  { ok: false, redirectTo, reason }
 */
export async function requireCustomerProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { ok: false, redirectTo: "/login", reason: "session_error" }
  }

  if (!user) {
    return { ok: false, redirectTo: "/login", reason: "not_logged_in" }
  }

  // Load profile row
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, address")
    .eq("id", user.id)
    .single()

  // If profile doesn't exist, treat as incomplete
  if (profileError && profileError.code !== "PGRST116") {
    console.error("Profile lookup error:", profileError)
    return { ok: false, redirectTo: "/profile", reason: "profile_error" }
  }

  const fullName = (profile?.full_name || "").trim()
  const phone = (profile?.phone || "").trim()
  const address = (profile?.address || "").trim()

  const complete = fullName && phone && address

  if (!complete) {
    return { ok: false, redirectTo: "/profile", reason: "profile_incomplete" }
  }

  return { ok: true, user, profile: { fullName, phone, address } }
}
