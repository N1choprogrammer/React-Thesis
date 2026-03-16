/**
 * Google Apps Script Web App endpoint for SPEEGO order notifications.
 *
 * Deploy:
 * 1) script.google.com -> New project
 * 2) Paste this file
 * 3) Set WEBHOOK_SECRET below
 * 4) Deploy -> New deployment -> Web app
 *    Execute as: Me
 *    Who has access: Anyone
 * 5) Copy Web App URL to Supabase secret GMAIL_WEBHOOK_URL
 */

const WEBHOOK_SECRET = "CHANGE_THIS_SECRET"

function doPost(e) {
  try {
    const secret = e?.parameter?.secret || ""
    const body = JSON.parse(e.postData.contents || "{}")
    const incomingSecret = String(body.secret || secret || "").trim()

    if (!incomingSecret || incomingSecret !== WEBHOOK_SECRET) {
      return _json(401, { error: "Unauthorized" })
    }

    const toRaw = String(body.to || "").trim()
    const recipients = toRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const subject = String(body.subject || "").trim()
    const html = String(body.html || "").trim()
    const text = String(body.text || "").trim()

    if (recipients.length === 0 || !subject || (!html && !text)) {
      return _json(400, { error: "Missing required fields" })
    }

    const options = {
      htmlBody: html || undefined,
      name: "SPEEGO",
    }

    // "noReply" often fails on personal Gmail accounts.
    // Keep delivery compatible with both personal and Workspace accounts.
    recipients.forEach((recipient) => {
      GmailApp.sendEmail(recipient, subject, text || " ", options)
    })

    return _json(200, { ok: true, id: Utilities.getUuid() })
  } catch (err) {
    return _json(500, {
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : ""),
    })
  }
}

function _json(status, payload) {
  const normalized = Object.assign({ ok: status >= 200 && status < 300 }, payload || {})
  return ContentService.createTextOutput(JSON.stringify(normalized))
    .setMimeType(ContentService.MimeType.JSON)
}
