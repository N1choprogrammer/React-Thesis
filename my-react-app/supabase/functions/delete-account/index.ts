declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

// @ts-ignore Edge Function runtime uses Deno remote imports.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Account deletion is not configured on the server." }, 500)
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim()
    if (!token) {
      return jsonResponse({ error: "You need to be logged in to delete your account." }, 401)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return jsonResponse({ error: "Your session is no longer valid. Please log in again." }, 401)
    }

    let { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", user.id)

      if (!profileDeleteError) {
        const retryResult = await supabaseAdmin.auth.admin.deleteUser(user.id)
        deleteUserError = retryResult.error
      }
    }

    if (deleteUserError) {
      console.error("Delete auth user error:", deleteUserError)
      return jsonResponse({ error: "Failed to delete your login account." }, 500)
    }

    const { error: profileCleanupError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id)

    if (profileCleanupError) {
      console.warn("Profile cleanup after account deletion failed:", profileCleanupError)
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error("Delete account error:", error)
    return jsonResponse({ error: "Sorry, we were unable to delete your account." }, 500)
  }
})
