import { useEffect, useState } from "react"
import { supabase } from "../../services/supabaseClient"

export default function AdminMessages({ onLiveChatCountChange }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("live-chat")
  const [chatThreads, setChatThreads] = useState([])
  const [chatThreadsLoading, setChatThreadsLoading] = useState(true)
  const [selectedThreadId, setSelectedThreadId] = useState("")
  const [chatMessages, setChatMessages] = useState([])
  const [chatReply, setChatReply] = useState("")
  const [chatSending, setChatSending] = useState(false)

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

  const loadChatThreads = async () => {
    setChatThreadsLoading(true)

    const { data, error } = await supabase
      .from("admin_chat_threads")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error loading admin chat threads:", error)
      setChatThreads([])
    } else {
      setChatThreads(data || [])
      if (!selectedThreadId && (data || []).length > 0) {
        setSelectedThreadId(data[0].id)
      }
    }

    setChatThreadsLoading(false)
  }

  const loadThreadMessages = async (threadId) => {
    if (!threadId) {
      setChatMessages([])
      return
    }

    const { data, error } = await supabase
      .from("admin_chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error loading admin chat messages:", error)
      setChatMessages([])
      return
    }

    setChatMessages(data || [])
  }

  useEffect(() => {
    loadChatThreads()
  }, [])

  useEffect(() => {
    if (typeof onLiveChatCountChange === "function") {
      const unreadCount = chatThreads.filter((thread) =>
        (thread.status || "waiting_admin") === "waiting_admin",
      ).length

      onLiveChatCountChange(unreadCount)
    }
  }, [chatThreads, onLiveChatCountChange])

  useEffect(() => {
    if (!selectedThreadId) {
      setChatMessages([])
      return
    }

    loadThreadMessages(selectedThreadId)
  }, [selectedThreadId])

  useEffect(() => {
    if (!supabase || typeof supabase.channel !== "function") {
      return undefined
    }

    const channel = supabase.channel("admin-live-chat")

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "admin_chat_threads" },
      async () => {
        await loadChatThreads()
      },
    )

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "admin_chat_messages" },
      async (payload) => {
        const threadId = payload?.new?.thread_id || payload?.old?.thread_id

        if (threadId && threadId === selectedThreadId) {
          await loadThreadMessages(threadId)
        }

        await loadChatThreads()
      },
    )

    const subscription = channel.subscribe()

    return () => {
      subscription?.unsubscribe?.()
      if (typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedThreadId])

  const sendChatReply = async () => {
    if (!selectedThreadId || !chatReply.trim()) {
      return
    }

    setChatSending(true)

    const { error } = await supabase.from("admin_chat_messages").insert([
      {
        thread_id: selectedThreadId,
        sender: "admin",
        sender_name: "Admin",
        content: chatReply.trim(),
      },
    ])

    if (!error) {
      await supabase
        .from("admin_chat_threads")
        .update({
          updated_at: new Date().toISOString(),
          status: "waiting_customer",
        })
        .eq("id", selectedThreadId)

      setChatReply("")
      await loadThreadMessages(selectedThreadId)
      await loadChatThreads()
    } else {
      console.error("Error sending admin reply:", error)
    }

    setChatSending(false)
  }

  const deleteChatMessage = async (messageId) => {
    if (!messageId) return

    const { error } = await supabase
      .from("admin_chat_messages")
      .delete()
      .eq("id", messageId)

    if (error) {
      console.error("Error deleting admin chat message:", error)
      return
    }

    if (selectedThreadId) {
      await loadThreadMessages(selectedThreadId)
      await loadChatThreads()
    }
  }

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
          Keep the original contact form and add a live admin chat experience alongside it.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("live-chat")}
            className={[
              "rounded-xl border px-4 py-2 text-sm font-semibold transition",
              "border-red-400/40 bg-red-500/10 text-red-100",
            ].join(" ")}
          >
            Live chat
          </button>
        </div>
      </div>

      {activeTab === "inbox" ? (
        loading ? (
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
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
            <h3 className="text-lg font-semibold text-white">Active chats</h3>

            {chatThreadsLoading ? (
              <p className="mt-4 text-sm text-zinc-300">Loading live chat threads...</p>
            ) : chatThreads.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-300">No live chat sessions yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {chatThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={[
                      "w-full rounded-xl border p-3 text-left transition",
                      selectedThreadId === thread.id
                        ? "border-red-400/40 bg-red-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">{thread.customer_name || "Customer"}</span>
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-200">
                        {thread.status || "waiting_admin"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">{thread.phone || "No phone"}</p>
                    <p className="mt-1 text-xs text-zinc-400">{formatDateTime(thread.updated_at)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
            {!selectedThreadId ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-zinc-300">
                Select a customer thread to continue the live conversation.
              </div>
            ) : (
              <>
                {(() => {
                  const currentThread = chatThreads.find((thread) => thread.id === selectedThreadId)
                  return currentThread ? (
                    <div className="mb-4 border-b border-white/10 pb-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{currentThread.customer_name || "Customer"}</h3>
                          <p className="text-sm text-zinc-400">
                            {currentThread.phone || "No phone"} · {currentThread.email || "No email"}
                          </p>
                        </div>
                        <span className="inline-flex w-fit rounded-full border border-red-300/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-100">
                          {currentThread.status || "waiting_admin"}
                        </span>
                      </div>
                    </div>
                  ) : null
                })()}

                <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-zinc-300">No messages in this conversation yet.</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={[
                          "group relative max-w-[85%] rounded-2xl border px-3 py-2 text-sm leading-6",
                          msg.sender === "admin"
                            ? "ml-auto border-red-400/30 bg-red-500/10 text-red-50"
                            : "border-white/10 bg-white/5 text-zinc-100",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => deleteChatMessage(msg.id)}
                          className="absolute -right-2 -top-2 hidden rounded-full border border-red-400/40 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-500/10 group-hover:inline-flex"
                          aria-label="Delete message"
                        >
                          Delete
                        </button>
                        <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                          {msg.sender === "admin" ? "Admin" : msg.sender_name || "Customer"}
                        </div>
                        <div>{msg.content}</div>
                        <div className="mt-1 text-right text-[10px] text-zinc-400">
                          {formatDateTime(msg.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={chatReply}
                    onChange={(event) => setChatReply(event.target.value)}
                    rows={3}
                    placeholder="Type your reply to the customer..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={sendChatReply}
                    disabled={chatSending || !chatReply.trim()}
                    className="rounded-xl border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {chatSending ? "Sending..." : "Send reply"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
