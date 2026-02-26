import { useEffect, useState } from "react"
import { supabase } from "../../services/supabaseClient"

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading contact messages:", error)
      } else {
        setMessages(data || [])
      }

      setLoading(false)
    }

    fetchMessages()
  }, [])

  const formatDateTime = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
          Inbox
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Customer messages
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Messages submitted through the Contact page. Only administrators can view them.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          No messages yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {messages.map((m) => (
            <article
              key={m.id}
              className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-white">{m.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400">{formatDateTime(m.created_at)}</p>
                </div>
                <div className="text-sm text-zinc-300 sm:text-right">
                  <p>{m.phone}</p>
                  {m.email && <p className="break-all text-zinc-400">{m.email}</p>}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-zinc-200 whitespace-pre-wrap">
                {m.message}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
