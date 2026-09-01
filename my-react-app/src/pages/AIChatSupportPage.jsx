import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"
import { getLiveChatThreadStorageKey } from "../utils/requireCustomerProfile"

export default function AIChatSupportPage() {
  const navigate = useNavigate()
  const [threadId, setThreadId] = useState("")
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState("waiting_admin")
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const loadMessages = async (id) => {
    if (!id) {
      setMessages([])
      return
    }

    const { data, error: loadError } = await supabase
      .from("admin_chat_messages")
      .select("*")
      .eq("thread_id", id)
      .order("created_at", { ascending: true })

    if (loadError) {
      console.error("Error loading AI live chat messages:", loadError)
      setMessages([])
      return
    }

    setMessages(data || [])
  }

  useEffect(() => {
    const loadThreadFromCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const storageKey = getLiveChatThreadStorageKey(user?.id || null)
      const savedThreadId = localStorage.getItem(storageKey) || ""
      setThreadId(savedThreadId)

      if (!savedThreadId) {
        navigate("/")
        return
      }

      const { data, error: threadError } = await supabase
        .from("admin_chat_threads")
        .select("*")
        .eq("id", savedThreadId)
        .maybeSingle()

      if (threadError) {
        console.error("Error loading AI live chat thread:", threadError)
      }

      if (data) {
        setStatus(data.status || "waiting_admin")
      }

      await loadMessages(savedThreadId)
    }

    void loadThreadFromCurrentUser()
  }, [navigate])

  useEffect(() => {
    if (!threadId) return undefined

    const channel = supabase.channel(`speego-ai-live-chat-page-${threadId}`)

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "admin_chat_messages", filter: `thread_id=eq.${threadId}` },
      async () => {
        await loadMessages(threadId)
      },
    )

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "admin_chat_threads", filter: `id=eq.${threadId}` },
      async (payload) => {
        const nextStatus = payload.new?.status || "waiting_admin"
        setStatus(nextStatus)
      },
    )

    const subscription = channel.subscribe()
    return () => subscription?.unsubscribe?.()
  }, [threadId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!threadId || !reply.trim()) return

    setSending(true)
    setError("")

    const { error: insertError } = await supabase.from("admin_chat_messages").insert([
      {
        thread_id: threadId,
        sender: "customer",
        sender_name: "Customer",
        content: reply.trim(),
      },
    ])

    if (insertError) {
      console.error("Error sending AI live chat reply:", insertError)
      setError("Unable to send your message right now. Please try again.")
      setSending(false)
      return
    }

    const { error: statusError } = await supabase
      .from("admin_chat_threads")
      .update({
        status: "waiting_admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)

    if (statusError) {
      console.error("Error reopening AI live chat thread:", statusError)
    } else {
      setStatus("waiting_admin")
    }

    setReply("")
    setSending(false)
  }

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <div
        style={{
          background: "rgba(13, 18, 28, 0.9)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(80,34,28,0.85))",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontSize: 12,
          }}
        >
          Live chat with admin
        </div>

        <div style={{ padding: "1rem 1.25rem 0.5rem", color: "#fff" }}>
          <div style={{ marginBottom: 12, opacity: 0.8, fontSize: 13 }}>Status: {status}</div>
          <div
            style={{
              minHeight: 260,
              maxHeight: 440,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingRight: 6,
            }}
          >
            {messages.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.7)" }}>The admin hasn’t replied yet. We’ll send the next update here.</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      background: msg.sender === "customer" ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.06)",
                      border: msg.sender === "customer" ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 14,
                      padding: "0.6rem 0.8rem",
                    }}
                  >
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.75 }}>
                      {msg.sender === "customer" ? "You" : "Admin"}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{msg.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1rem 1.25rem 1.25rem" }}>
          {error && (
            <div style={{ marginBottom: 10, color: "#fca5a5", fontSize: 13 }}>{error}</div>
          )}

          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={4}
            placeholder="Write your message to the admin..."
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.02)",
              color: "#fff",
              padding: "0.8rem 0.9rem",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: 999,
                padding: "0.7rem 1rem",
                cursor: "pointer",
              }}
            >
              Back to AI
            </button>

            <button
              type="submit"
              disabled={sending || !reply.trim()}
              style={{
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                border: "none",
                color: "#fff",
                borderRadius: 999,
                padding: "0.8rem 1.25rem",
                fontWeight: 700,
                cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
                opacity: sending || !reply.trim() ? 0.6 : 1,
              }}
            >
              {sending ? "Sending..." : "Send to admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
