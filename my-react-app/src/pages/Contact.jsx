import { useState } from "react"
import { supabase } from "../services/supabaseClient"
import { useTheme } from "../context/ThemeContext"

export default function Contact() {
  const { isDark } = useTheme()
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [liveChatForm, setLiveChatForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  })
  const [liveChatSent, setLiveChatSent] = useState(false)
  const [liveChatError, setLiveChatError] = useState("")
  const [liveChatThread, setLiveChatThread] = useState(null)
  const [threadStatus, setThreadStatus] = useState("idle")

  const statusText = {
    idle: "No active live chat thread yet.",
    waiting_admin: "Your message is waiting for an admin reply.",
    waiting_customer: "The admin replied. Please check for the latest update and respond if needed.",
    closed: "This live chat has been closed.",
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLiveChatChange = (e) => {
    const { name, value } = e.target
    setLiveChatForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { error } = await supabase.from("contact_messages").insert([
      {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        message: form.message,
      },
    ])

    if (error) {
      console.error("Error submitting message:", error)
      alert("Failed to send message. Please try again.")
      return
    }

    setSubmitted(true)
  }

  useEffect(() => {
    const savedThreadId = localStorage.getItem("speego_live_chat_thread_id")
    if (!savedThreadId) return

    const fetchSavedThread = async () => {
      const { data, error } = await supabase
        .from("admin_chat_threads")
        .select("*")
        .eq("id", savedThreadId)
        .maybeSingle()

      if (!error && data) {
        setLiveChatThread(data)
        setThreadStatus(data.status || "waiting_admin")
        setLiveChatSent(true)
      }
    }

    fetchSavedThread()
  }, [])

  useEffect(() => {
    if (!liveChatThread?.id) return undefined

    const channel = supabase.channel(`customer-thread-${liveChatThread.id}`)

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "admin_chat_threads", filter: `id=eq.${liveChatThread.id}` },
      (payload) => {
        const nextThread = payload.new
        setLiveChatThread(nextThread)
        setThreadStatus(nextThread.status || "waiting_admin")
      },
    )

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "admin_chat_messages", filter: `thread_id=eq.${liveChatThread.id}` },
      async () => {
        const { data } = await supabase
          .from("admin_chat_threads")
          .select("*")
          .eq("id", liveChatThread.id)
          .maybeSingle()

        if (data) {
          setLiveChatThread(data)
          setThreadStatus(data.status || "waiting_admin")
        }
      },
    )

    const subscription = channel.subscribe()
    return () => subscription?.unsubscribe?.()
  }, [liveChatThread?.id])

  const handleLiveChatSubmit = async (e) => {
    e.preventDefault()
    setLiveChatError("")

    if (!liveChatForm.name || !liveChatForm.phone || !liveChatForm.message) {
      setLiveChatError("Please add your name, contact number, and a short message.")
      return
    }

    const threadPayload = {
      customer_name: liveChatForm.name,
      phone: liveChatForm.phone,
      email: liveChatForm.email || null,
      status: "waiting_admin",
      updated_at: new Date().toISOString(),
    }

    const { data: thread, error: threadError } = await supabase
      .from("admin_chat_threads")
      .insert([threadPayload])
      .select()
      .single()

    if (threadError) {
      console.error("Error creating live chat thread:", threadError)
      setLiveChatError("Live chat is temporarily unavailable. Please use the message form below.")
      return
    }

    const { error: messageError } = await supabase
      .from("admin_chat_messages")
      .insert([
        {
          thread_id: thread.id,
          sender: "customer",
          sender_name: liveChatForm.name,
          content: liveChatForm.message,
        },
      ])

    if (messageError) {
      console.error("Error sending live chat message:", messageError)
      setLiveChatError("Your live chat request was created, but the first message did not send. Please try again.")
      return
    }

    localStorage.setItem("speego_live_chat_thread_id", thread.id)
    setLiveChatThread(thread)
    setThreadStatus("waiting_admin")
    setLiveChatSent(true)
    setLiveChatForm({ name: "", phone: "", email: "", message: "" })
  }

  const inputClass = [
    "w-full rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-zinc-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20",
    isDark
      ? "border border-white/10 bg-black/40 text-white"
      : "border border-black/10 bg-white text-zinc-900",
  ].join(" ")

  return (
    <div
      className={[
        "relative min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6 lg:px-8",
        isDark ? "bg-black text-white" : "bg-transparent text-zinc-900",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={[
            "absolute inset-0",
            isDark
              ? "bg-[radial-gradient(circle_at_10%_8%,rgba(239,68,68,0.10),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(255,255,255,0.04),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.2),rgba(0,0,0,0.92))]"
              : "bg-[radial-gradient(circle_at_10%_8%,rgba(239,68,68,0.08),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(17,24,39,0.04),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]",
          ].join(" ")}
        />
        <div
          className={[
            "absolute inset-0 [background-size:24px_24px]",
            isDark
              ? "opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]"
              : "opacity-[0.05] [background-image:linear-gradient(rgba(17,24,39,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.10)_1px,transparent_1px)]",
          ].join(" ")}
        />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6">
        <section
          className={[
            "rounded-3xl p-5 sm:p-6 lg:p-8",
            isDark
              ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
          ].join(" ")}
        >
          <div className={[
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
            isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600",
          ].join(" ")}>
            Contact Speego Talavera
          </div>
          <h1 className={["mt-3 text-3xl font-bold tracking-tight sm:text-4xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
            Contact SPEEGO Talavera
          </h1>
          <p className={["mt-3 max-w-4xl text-sm leading-7 sm:text-base", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            Got questions about our electric bikes, pricing, or system features? You can reach us
            using the details below or send a message through the form.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={["rounded-3xl p-5 sm:p-6", isDark ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]" : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]"].join(" ")}>
            <h2 className={["text-xl font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Shop information</h2>

            <div className={["mt-5 space-y-5 text-sm leading-7", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Location</p>
                <p className="mt-1">
                  Maharlika Highway Brgy. Andal Alino, Talavera, Nueva Ecija, Philippines.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Contact number</p>
                <p className={["mt-1 font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>0919-949-1986</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Email</p>
                <p className={["mt-1 break-all font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>ianneclauren969@gmail.com</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Operating hours</p>
                <p className="mt-1">Monday - Saturday, 9:00 AM - 5:00 PM</p>
              </div>
            </div>

            <div className={["mt-6 rounded-2xl p-4 text-sm leading-7", isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-zinc-50 text-zinc-600"].join(" ")}>
              For official transactions, our team will coordinate directly after you place an order
              through the website. For general inquiries, feel free to use the contact details
              above or send us a message using the form.
            </div>
          </div>

          <div className={["rounded-3xl p-5 sm:p-6", isDark ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]" : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]"].join(" ")}>
            <h2 className={["text-xl font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Send us a message</h2>

            {submitted ? (
              <div className={["mt-4 rounded-2xl border p-4 text-sm", isDark ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-emerald-300 bg-emerald-50 text-emerald-800"].join(" ")}>
                Thank you for reaching out. Your message has been recorded for demo purposes. In a
                live system, this would be sent to the SPEEGO team.
              </div>
            ) : (
              <p className={["mt-3 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Fill out the form and we will get back to you as soon as possible.
              </p>
            )}

            {!submitted && (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Juan Dela Cruz"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                    Contact number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="09XX-XXX-XXXX"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                    Email (optional)
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className={["block text-sm font-medium", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-auto"
                >
                  Send message
                </button>
              </form>
            )}

            <div className={[
              "mt-6 rounded-2xl border p-4",
              isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-zinc-50",
            ].join(" ")}>
              <h3 className={["text-base font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                Need a quicker reply?
              </h3>
              <p className={[
                "mt-2 text-sm leading-6",
                isDark ? "text-zinc-300" : "text-zinc-600",
              ].join(" ")}>
                Start a live admin chat for quick questions while we stay connected in real time.
              </p>

              {liveChatSent ? (
                <div className={[
                  "mt-4 rounded-xl border p-3 text-sm",
                  isDark ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-emerald-300 bg-emerald-50 text-emerald-800",
                ].join(" ")}>
                  {statusText[threadStatus] || statusText.waiting_admin}
                </div>
              ) : (
                <form onSubmit={handleLiveChatSubmit} className="mt-4 space-y-3">
                  <input
                    name="name"
                    value={liveChatForm.name}
                    onChange={handleLiveChatChange}
                    placeholder="Full name"
                    className={inputClass}
                  />
                  <input
                    name="phone"
                    value={liveChatForm.phone}
                    onChange={handleLiveChatChange}
                    placeholder="Contact number"
                    className={inputClass}
                  />
                  <input
                    name="email"
                    type="email"
                    value={liveChatForm.email}
                    onChange={handleLiveChatChange}
                    placeholder="Email (optional)"
                    className={inputClass}
                  />
                  <textarea
                    name="message"
                    rows={3}
                    value={liveChatForm.message}
                    onChange={handleLiveChatChange}
                    placeholder="Write your quick question here..."
                    className={`${inputClass} resize-y`}
                  />

                  {liveChatError && (
                    <div className={[
                      "rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200",
                    ].join(" ")}>{liveChatError}</div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-auto"
                  >
                    Start live chat
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className={[
          "overflow-hidden rounded-3xl p-5 sm:p-6",
          isDark
            ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]",
        ].join(" ")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Store map
              </p>
              <h2 className={["mt-2 text-xl font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                Visit SPEEGO E-bikes
              </h2>
              <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Use the map below to find our physical store in Talavera, Nueva Ecija.
              </p>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=SpeeGo%20E-bikes%20Talavera%20Nueva%20Ecija"
              target="_blank"
              rel="noreferrer"
              className={[
                "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                isDark
                  ? "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                  : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
              ].join(" ")}
            >
              Open in Google Maps
            </a>
          </div>

          <div className={["mt-5 overflow-hidden rounded-2xl", isDark ? "border border-white/10 bg-black" : "border border-black/10 bg-zinc-100"].join(" ")}>
            <iframe
              title="SpeeGo E-bikes Google Maps location"
              src="https://www.google.com/maps/embed?pb=!1m16!1m11!1m3!1d3!2d120.9199321!3d15.5949315!2m2!1f0!2f90!3m2!1i1024!2i768!4f75!3m3!1m2!1s0x33972b000d4db9bb%3A0x74ee2789de334735!2sSpeeGo%20E-bikes!4v1786438981182"
              className="h-[320px] w-full sm:h-[420px]"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
