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

type ProviderSuccessResult = {
  ok: true
  provider: string
  providerMessageId?: string
}

type ProviderErrorResult = {
  ok: false
  provider: string
  errorText: string
}

type ProviderResult = ProviderSuccessResult | ProviderErrorResult

type GmailWebhookPayload = {
  ok?: boolean
  id?: string
  messageId?: string
  error?: string
}

function formatPeso(value: number | null | undefined) {
  return `PHP ${Number(value || 0).toLocaleString()}`
}

function buildEmailContent(params: {
  status: string
  customerName: string
  orderId: string
  totalAmount: number
  siteUrl: string
  supportEmail: string
}) {
  const { status, customerName, orderId, totalAmount, siteUrl, supportEmail } = params
  const statusLabel = status === "confirmed" ? "confirmed" : "cancelled"
  const subject =
    status === "confirmed"
      ? "Your SPEEGO order has been confirmed"
      : "Update on your SPEEGO order"

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
      <h2 style="margin-bottom: 8px;">SPEEGO Order Update</h2>
      <p style="margin: 0 0 16px;">Hi ${customerName || "Customer"},</p>
      <p style="margin: 0 0 12px;">
        Your order <strong>${orderId}</strong> has been <strong>${statusLabel}</strong>.
      </p>
      <p style="margin: 0 0 12px;">Order total: <strong>${formatPeso(totalAmount)}</strong></p>
      ${
        status === "confirmed"
          ? `<p style="margin: 0 0 20px;">We are now preparing your order. You can track updates in your account.</p>`
          : `<p style="margin: 0 0 20px;">If you have questions about this cancellation, please reply to this email or contact the SPEEGO team.</p>`
      }
      <p style="margin: 0 0 20px; color: #52525b;">For questions or concerns, you can reply directly to this email or contact us at <strong>${supportEmail}</strong>.</p>
      <a href="${siteUrl}/my-orders" style="display:inline-block; background:#dc2626; color:white; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:600;">
        View My Orders
      </a>
    </div>
  `

  const text =
    status === "confirmed"
      ? `Hi ${customerName || "Customer"}, your SPEEGO order ${orderId} is confirmed. Total: ${formatPeso(totalAmount)}. Track updates: ${siteUrl}/my-orders. For questions, reply to this email or contact ${supportEmail}.`
      : `Hi ${customerName || "Customer"}, your SPEEGO order ${orderId} is cancelled. Total: ${formatPeso(totalAmount)}. View details: ${siteUrl}/my-orders. For questions, reply to this email or contact ${supportEmail}.`

  return { subject, html, text }
}

async function logNotification(params: {
  adminClient: ReturnType<typeof createClient>
  orderId: string
  status: string
  recipientEmail: string
  success: boolean
  provider: string
  providerMessageId?: string
  errorText?: string
}) {
  const {
    adminClient,
    orderId,
    status,
    recipientEmail,
    success,
    provider,
    providerMessageId,
    errorText,
  } = params

  const { error } = await adminClient.from("order_notifications").insert({
    order_id: orderId,
    status,
    recipient_email: recipientEmail,
    provider,
    provider_message_id: providerMessageId || null,
    success,
    error_text: errorText || null,
  })

  if (error) {
    console.error("Failed to write order_notifications log:", error)
  }
}

async function sendWithResend(params: {
  resendApiKey: string
  fromEmail: string
  toEmail: string
  subject: string
  html: string
  text: string
}) {
  const { resendApiKey, fromEmail, toEmail, subject, html, text } = params

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  })

  if (!resendResponse.ok) {
    const errText = await resendResponse.text()
    return { ok: false, errorText: errText, provider: "resend" } satisfies ProviderErrorResult
  }

  const payload = (await resendResponse.json().catch(() => ({}))) as { id?: string }
  return {
    ok: true,
    providerMessageId: String(payload?.id || ""),
    provider: "resend",
  } satisfies ProviderSuccessResult
}

async function sendWithGmailWebhook(params: {
  webhookUrl: string
  webhookSecret?: string
  fromEmail?: string
  toEmail: string
  subject: string
  html: string
  text: string
}) {
  const { webhookUrl, webhookSecret, fromEmail, toEmail, subject, html, text } = params

  const url = webhookSecret
    ? `${webhookUrl}${webhookUrl.includes("?") ? "&" : "?"}secret=${encodeURIComponent(webhookSecret)}`
    : webhookUrl

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
    },
    body: JSON.stringify({
      from: fromEmail || "",
      to: toEmail,
      subject,
      html,
      text,
      ...(webhookSecret ? { secret: webhookSecret } : {}),
    }),
  })

  const payload = (await response.json().catch(() => null)) as GmailWebhookPayload | null

  if (!response.ok) {
    const errText =
      payload && typeof payload === "object"
        ? JSON.stringify(payload)
        : await response.text().catch(() => "Unknown webhook error")
    return { ok: false, errorText: errText, provider: "gmail" } satisfies ProviderErrorResult
  }

  if (!payload || payload.ok !== true) {
    return {
      ok: false,
      errorText:
        payload && typeof payload === "object"
          ? JSON.stringify(payload)
          : "Gmail webhook did not return ok=true",
      provider: "gmail",
    } satisfies ProviderErrorResult
  }

  return {
    ok: true,
    providerMessageId: String(payload?.id || payload?.messageId || ""),
    provider: "gmail",
  } satisfies ProviderSuccessResult
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const emailProvider = String(Deno.env.get("EMAIL_PROVIDER") || "gmail").toLowerCase()
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    const gmailWebhookUrl = Deno.env.get("GMAIL_WEBHOOK_URL")
    const gmailWebhookSecret = Deno.env.get("GMAIL_WEBHOOK_SECRET")
    const fromEmail = Deno.env.get("NOTIFY_FROM_EMAIL")
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173"

    if (!supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({ error: "Supabase env not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!fromEmail && emailProvider === "resend") {
      return new Response(JSON.stringify({ error: "Missing NOTIFY_FROM_EMAIL secret." }), {
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

    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileErr || profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = (await req.json()) as { order_id?: string; status?: string }
    const orderId = String(body?.order_id || "").trim()
    const status = String(body?.status || "").trim().toLowerCase()

    if (!orderId || !["confirmed", "cancelled"].includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .select("id, customer_name, customer_email, total_amount")
      .eq("id", orderId)
      .single()

    if (orderErr || !order?.customer_email) {
      return new Response(JSON.stringify({ error: "Order not found or missing customer email." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { subject, html, text } = buildEmailContent({
      status,
      customerName: order.customer_name || "Customer",
      orderId: order.id,
      totalAmount: Number(order.total_amount || 0),
      siteUrl,
      supportEmail: fromEmail || "SPEEGO support",
    })

    let providerResult: ProviderResult

    if (emailProvider === "resend") {
      if (!resendApiKey || !fromEmail) {
        providerResult = {
          ok: false,
          provider: "resend",
          errorText: "Missing RESEND_API_KEY or NOTIFY_FROM_EMAIL secret.",
        }
      } else {
        providerResult = await sendWithResend({
          resendApiKey,
          fromEmail,
          toEmail: order.customer_email,
          subject,
          html,
          text,
        })
      }
    } else {
      if (!gmailWebhookUrl) {
        providerResult = {
          ok: false,
          provider: "gmail",
          errorText: "Missing GMAIL_WEBHOOK_URL secret.",
        }
      } else {
        providerResult = await sendWithGmailWebhook({
          webhookUrl: gmailWebhookUrl,
          webhookSecret: gmailWebhookSecret || undefined,
          fromEmail: fromEmail || undefined,
          toEmail: order.customer_email,
          subject,
          html,
          text,
        })
      }
    }

    if (!providerResult.ok) {
      await logNotification({
        adminClient,
        orderId: order.id,
        status,
        recipientEmail: order.customer_email,
        provider: providerResult.provider,
        success: false,
        errorText: providerResult.errorText,
      })

      return new Response(
        JSON.stringify({
          error: "Email provider rejected the request.",
          provider: providerResult.provider,
          provider_response: providerResult.errorText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    await logNotification({
      adminClient,
      orderId: order.id,
      status,
      recipientEmail: order.customer_email,
      provider: providerResult.provider,
      success: true,
      providerMessageId: providerResult.providerMessageId || "",
    })

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
