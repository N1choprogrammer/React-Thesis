import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function formatPeso(value: number | null | undefined) {
  return `PHP ${Number(value || 0).toLocaleString()}`
}

function parseAdminEmails(raw: string | undefined) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

async function sendWithResend(params: {
  resendApiKey: string
  fromEmail: string
  toEmails: string[]
  subject: string
  html: string
  text: string
}) {
  const { resendApiKey, fromEmail, toEmails, subject, html, text } = params
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: toEmails,
      subject,
      html,
      text,
    }),
  })

  if (!res.ok) {
    return {
      ok: false as const,
      provider: "resend",
      errorText: await res.text(),
    }
  }

  const payload = await res.json().catch(() => ({}))
  return {
    ok: true as const,
    provider: "resend",
    providerMessageId: String(payload?.id || ""),
  }
}

async function sendWithGmailWebhook(params: {
  webhookUrl: string
  webhookSecret?: string
  fromEmail?: string
  toEmails: string[]
  subject: string
  html: string
  text: string
}) {
  const { webhookUrl, webhookSecret, fromEmail, toEmails, subject, html, text } = params

  const url = webhookSecret
    ? `${webhookUrl}${webhookUrl.includes("?") ? "&" : "?"}secret=${encodeURIComponent(webhookSecret)}`
    : webhookUrl

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
    },
    body: JSON.stringify({
      from: fromEmail || "",
      to: toEmails.join(","),
      subject,
      html,
      text,
      ...(webhookSecret ? { secret: webhookSecret } : {}),
    }),
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload || payload.ok !== true) {
    return {
      ok: false as const,
      provider: "gmail",
      errorText:
        payload && typeof payload === "object"
          ? JSON.stringify(payload)
          : "Gmail webhook did not return ok=true",
    }
  }

  return {
    ok: true as const,
    provider: "gmail",
    providerMessageId: String(payload?.id || payload?.messageId || ""),
  }
}

async function logAdminNotification(params: {
  adminClient: ReturnType<typeof createClient>
  orderId: string
  recipientEmail: string
  success: boolean
  provider: string
  providerMessageId?: string
  errorText?: string
}) {
  const { adminClient, orderId, recipientEmail, success, provider, providerMessageId, errorText } = params
  const { error } = await adminClient.from("order_notifications").insert({
    order_id: orderId,
    status: "new_order",
    recipient_email: recipientEmail,
    provider,
    provider_message_id: providerMessageId || null,
    success,
    error_text: errorText || null,
  })
  if (error) {
    console.error("Failed to log admin new-order notification:", error)
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const emailProvider = String(Deno.env.get("EMAIL_PROVIDER") || "gmail").toLowerCase()
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173"

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    const gmailWebhookUrl = Deno.env.get("GMAIL_WEBHOOK_URL")
    const gmailWebhookSecret = Deno.env.get("GMAIL_WEBHOOK_SECRET")
    const fromEmail = Deno.env.get("NOTIFY_FROM_EMAIL")
    const adminNotifyEmails = parseAdminEmails(Deno.env.get("ADMIN_NOTIFY_EMAILS"))

    if (!supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({ error: "Supabase env not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (adminNotifyEmails.length === 0) {
      return new Response(JSON.stringify({ error: "Missing ADMIN_NOTIFY_EMAILS secret." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const authHeader = req.headers.get("Authorization") || ""
    const jwt = authHeader.replace("Bearer ", "").trim()
    const adminClient = createClient(supabaseUrl, serviceRole)
    const {
      data: { user },
      error: userErr,
    } = await adminClient.auth.getUser(jwt)

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const orderId = String(body?.order_id || "").trim()
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .select("id, customer_name, customer_email, customer_phone, address, total_amount, created_at")
      .eq("id", orderId)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Allow if caller is admin OR owner of the order.
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    const isAdmin = profile?.role === "admin"
    const isOwner = String(order.customer_email || "").toLowerCase() === String(user.email || "").toLowerCase()
    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: items } = await adminClient
      .from("order_items")
      .select("product_name, color, quantity, price")
      .eq("order_id", orderId)

    const lineItems = (items || [])
      .map((it) => `${it.product_name} (${it.color || "N/A"}) x${it.quantity} - ${formatPeso((it.price || 0) * (it.quantity || 0))}`)
      .join("<br/>")

    const subject = `New SPEEGO order received: ${order.id}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b;">
        <h2 style="margin-bottom: 8px;">New Order Alert</h2>
        <p style="margin: 0 0 10px;"><strong>Order ID:</strong> ${order.id}</p>
        <p style="margin: 0 0 10px;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <p style="margin: 0 0 10px;"><strong>Customer:</strong> ${order.customer_name || "Guest"}</p>
        <p style="margin: 0 0 10px;"><strong>Email:</strong> ${order.customer_email || "-"}</p>
        <p style="margin: 0 0 10px;"><strong>Phone:</strong> ${order.customer_phone || "-"}</p>
        <p style="margin: 0 0 10px;"><strong>Address:</strong> ${order.address || "-"}</p>
        <p style="margin: 0 0 10px;"><strong>Total:</strong> ${formatPeso(order.total_amount)}</p>
        <hr style="margin: 16px 0;" />
        <p style="margin: 0 0 10px;"><strong>Items:</strong></p>
        <p style="margin: 0 0 18px;">${lineItems || "No items listed."}</p>
        <a href="${siteUrl}/admin/orders" style="display:inline-block; background:#dc2626; color:white; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:600;">
          Open Admin Orders
        </a>
      </div>
    `
    const text = `New order ${order.id}\nCustomer: ${order.customer_name}\nTotal: ${formatPeso(order.total_amount)}\nOpen: ${siteUrl}/admin/orders`

    let providerResult:
      | { ok: true; provider: string; providerMessageId?: string }
      | { ok: false; provider: string; errorText: string }

    if (emailProvider === "resend") {
      if (!resendApiKey || !fromEmail) {
        providerResult = { ok: false, provider: "resend", errorText: "Missing RESEND_API_KEY or NOTIFY_FROM_EMAIL." }
      } else {
        providerResult = await sendWithResend({
          resendApiKey,
          fromEmail,
          toEmails: adminNotifyEmails,
          subject,
          html,
          text,
        })
      }
    } else {
      if (!gmailWebhookUrl) {
        providerResult = { ok: false, provider: "gmail", errorText: "Missing GMAIL_WEBHOOK_URL." }
      } else {
        providerResult = await sendWithGmailWebhook({
          webhookUrl: gmailWebhookUrl,
          webhookSecret: gmailWebhookSecret || undefined,
          fromEmail: fromEmail || undefined,
          toEmails: adminNotifyEmails,
          subject,
          html,
          text,
        })
      }
    }

    if (!providerResult.ok) {
      for (const email of adminNotifyEmails) {
        await logAdminNotification({
          adminClient,
          orderId: order.id,
          recipientEmail: email,
          success: false,
          provider: providerResult.provider,
          errorText: providerResult.errorText,
        })
      }
      return new Response(JSON.stringify({ error: providerResult.errorText, provider: providerResult.provider }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    for (const email of adminNotifyEmails) {
      await logAdminNotification({
        adminClient,
        orderId: order.id,
        recipientEmail: email,
        success: true,
        provider: providerResult.provider,
        providerMessageId: providerResult.providerMessageId || "",
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
