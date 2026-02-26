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

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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
            Contact Speego
          </div>
          <h1 className={["mt-3 text-3xl font-bold tracking-tight sm:text-4xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
            Contact SPEEGO
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
              <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
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
          </div>
        </section>
      </div>
    </div>
  )
}
