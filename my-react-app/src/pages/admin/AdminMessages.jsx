import { useEffect, useState } from "react"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../services/supabaseClient"

export default function AdminMessages({ onLiveChatCountChange }) {
  const { isDark } = useTheme()
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

  const deleteChatThread = async (threadId) => {
    if (!threadId) return

    const { error: messageError } = await supabase
      .from("admin_chat_messages")
      .delete()
      .eq("thread_id", threadId)

    if (messageError) {
      console.error("Error deleting admin chat thread messages:", messageError)
      return
    }

    const { error: threadError } = await supabase
      .from("admin_chat_threads")
      .delete()
      .eq("id", threadId)

    if (threadError) {
      console.error("Error deleting admin chat thread:", threadError)
      return
    }

    if (selectedThreadId === threadId) {
      setSelectedThreadId("")
      setChatMessages([])
    }

    await loadChatThreads()
  }

  const formatDateTime = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className={[
        "rounded-3xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6",
        isDark ? "border-white/10 bg-zinc-950/85" : "border-black/10 bg-white/90",
      ].join(" ")}>
        <div className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
          isDark ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-red-300 bg-red-50 text-red-700",
        ].join(" ")}>
          Inbox
        </div>
        <h2 className={[
          "mt-3 text-2xl font-bold tracking-tight sm:text-3xl",
          isDark ? "text-white" : "text-zinc-900",
        ].join(" ")}>
          Customer messages
        </h2>
        <p className={[
          "mt-2 text-sm leading-6",
          isDark ? "text-zinc-300" : "text-zinc-600",
        ].join(" ")}>
          Keep the original contact form and add a live admin chat experience alongside it.
        </p>
      </div>

      <div className={[
        "rounded-2xl border p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]",
        isDark ? "border-white/10 bg-zinc-950/85" : "border-black/10 bg-white/90",
      ].join(" ")}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("live-chat")}
            className={[
              "rounded-xl border px-4 py-2 text-sm font-semibold transition",
              isDark
                ? "border-red-400/40 bg-red-500/10 text-red-100"
                : "border-red-300 bg-red-50 text-red-700",
            ].join(" ")}
          >
            Live chat
          </button>
        </div>
      </div>

      {activeTab === "inbox" ? (
        loading ? (
          <div className={[
            "rounded-2xl border p-5 text-sm",
            isDark ? "border-white/10 bg-zinc-950/85 text-zinc-300" : "border-black/10 bg-white/90 text-zinc-600",
          ].join(" ")}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className={[
            "rounded-2xl border p-5 text-sm",
            isDark ? "border-white/10 bg-zinc-950/85 text-zinc-300" : "border-black/10 bg-white/90 text-zinc-600",
          ].join(" ")}>
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
          <div className={[
            "rounded-2xl border p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)]",
            isDark ? "border-white/10 bg-zinc-950/85" : "border-black/10 bg-white/90",
          ].join(" ")}>
            <h3 className={[
              "text-lg font-semibold",
              isDark ? "text-white" : "text-zinc-900",
            ].join(" ")}>Active chats</h3>

            {chatThreadsLoading ? (
              <p className={[
                "mt-4 text-sm",
                isDark ? "text-zinc-300" : "text-zinc-600",
              ].join(" ")}>Loading live chat threads...</p>
            ) : chatThreads.length === 0 ? (
              <p className={[
                "mt-4 text-sm",
                isDark ? "text-zinc-300" : "text-zinc-600",
              ].join(" ")}>No live chat sessions yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {chatThreads.map((thread) => {
                  const isWaitingReply = (thread.status || "waiting_admin") === "waiting_admin"

                  return (
                    <div
                      key={thread.id}
                      className={[
                        "relative w-full rounded-xl border p-3 text-left transition",
                        isWaitingReply
                          ? isDark
                            ? "border-red-500/40 bg-[#2a1718] shadow-[0_0_0_1px_rgba(248,113,113,0.12)]"
                            : "border-red-200 bg-red-50 shadow-[0_0_0_1px_rgba(239,68,68,0.10)]"
                          : isDark
                            ? "border-white/10 bg-[#17181d] hover:bg-[#1d1f26]"
                            : "border-black/10 bg-zinc-100 hover:bg-zinc-200",
                        selectedThreadId === thread.id ? "ring-1 ring-red-400/60" : "",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedThreadId(thread.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={[
                            "font-semibold",
                            isDark ? "text-white" : "text-zinc-900",
                          ].join(" ")}>{thread.customer_name || "Customer"}</span>
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold",
                              isWaitingReply
                                ? isDark
                                  ? "border-red-400/30 bg-red-500/15 text-red-100"
                                  : "border-red-300 bg-red-100 text-red-700"
                                : isDark
                                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                  : "border-emerald-300 bg-emerald-100 text-emerald-700",
                            ].join(" ")}
                          >
                            {thread.status || "waiting_admin"}
                          </span>
                        </div>
                        <p className={[
                          "mt-2 text-xs",
                          isDark ? "text-zinc-300" : "text-zinc-600",
                        ].join(" ")}>{thread.phone || "No phone"}</p>
                        <p className={[
                          "mt-1 text-xs",
                          isDark ? "text-zinc-400" : "text-zinc-500",
                        ].join(" ")}>{formatDateTime(thread.updated_at)}</p>
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void deleteChatThread(thread.id)
                        }}
                        className={[
                          "absolute right-2 top-2 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition hover:bg-red-500/10",
                          isDark
                            ? "border-red-400/30 bg-[#2b1215] text-red-100"
                            : "border-red-200 bg-red-50 text-red-700",
                        ].join(" ")}
                        aria-label="Delete thread"
                      >
                        Delete
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className={[
            "rounded-2xl border p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)]",
            isDark ? "border-white/10 bg-[#0d0d10]" : "border-black/10 bg-white/90",
          ].join(" ")}>
            {!selectedThreadId ? (
              <div className={[
                "flex h-full min-h-[320px] items-center justify-center text-sm",
                isDark ? "text-zinc-300" : "text-zinc-600",
              ].join(" ")}>
                Select a customer thread to continue the live conversation.
              </div>
            ) : (
              <>
                {(() => {
                  const currentThread = chatThreads.find((thread) => thread.id === selectedThreadId)
                  return currentThread ? (
                    <div className={[
                      "mb-4 border-b pb-4",
                      isDark ? "border-white/10" : "border-black/10",
                    ].join(" ")}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className={[
                            "text-xl font-semibold",
                            isDark ? "text-white" : "text-zinc-900",
                          ].join(" ")}>{currentThread.customer_name || "Customer"}</h3>
                          <p className={[
                            "text-sm",
                            isDark ? "text-zinc-400" : "text-zinc-600",
                          ].join(" ")}>
                            {currentThread.phone || "No phone"} · {currentThread.email || "No email"}
                          </p>
                        </div>
                        <span className={[
                          "inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                          isDark
                            ? "border-red-300/30 bg-red-500/10 text-red-100"
                            : "border-red-300 bg-red-100 text-red-700",
                        ].join(" ")}>
                          {currentThread.status || "waiting_admin"}
                        </span>
                      </div>
                    </div>
                  ) : null
                })()}

                <div className={[
                  "space-y-3 rounded-xl border p-3",
                  isDark ? "border-white/10 bg-[#121317]" : "border-black/10 bg-zinc-100",
                ].join(" ")}>
                  {chatMessages.length === 0 ? (
                    <p className={[
                      "text-sm",
                      isDark ? "text-zinc-300" : "text-zinc-600",
                    ].join(" ")}>No messages in this conversation yet.</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={[
                          "group relative max-w-[85%] rounded-2xl border px-3 py-2 text-sm leading-6",
                          msg.sender === "admin"
                            ? isDark
                              ? "ml-auto border-red-400/30 bg-[#2a1719] text-red-50"
                              : "ml-auto border-red-200 bg-red-50 text-red-800"
                            : isDark
                              ? "border-white/10 bg-[#1b1d22] text-zinc-100"
                              : "border-black/10 bg-white text-zinc-800",
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
                        <div className={[
                          "mb-1 text-[10px] uppercase tracking-[0.12em]",
                          isDark ? "text-zinc-400" : "text-zinc-500",
                        ].join(" ")}>
                          {msg.sender === "admin" ? "Admin" : msg.sender_name || "Customer"}
                        </div>
                        <div>{msg.content}</div>
                        <div className={[
                          "mt-1 text-right text-[10px]",
                          isDark ? "text-zinc-400" : "text-zinc-500",
                        ].join(" ")}>
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
                    className={[
                      "w-full resize-none rounded-xl border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20",
                      isDark
                        ? "border-white/10 bg-[#0f1014] text-white placeholder:text-zinc-500 focus:border-red-400/60"
                        : "border-black/10 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-red-300",
                    ].join(" ")}
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
