import { supabase } from "../services/supabaseClient"
// src/pages/Contact.jsx
import { useState } from "react"

export default function Contact() {
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

  const { error } = await supabase
    .from("contact_messages")
    .insert([
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


  return (
    <div className="contact-page">
      <section className="contact-header">
        <h1 className="page-title">Contact SPEEGO</h1>
        <p className="page-subtitle">
          Got questions about our electric bikes, pricing, or system features? You can reach us
          using the details below or send a message through the form.
        </p>
      </section>

      <section className="contact-grid">
        {/* Contact info card */}
        <div className="contact-card">
          <h2>Shop information</h2>
          <p>
            <strong>Location:</strong>
            <br />
            Maharlika Highway Brgy. Andal Aliño, Talavera, Nueva Ecija, Philippines.
            <br />
          </p>

          <p>
            <strong>Contact number:</strong>
            <br />
            0919-949-1986
          </p>

          <p>
            <strong>Email:</strong>
            <br />  
            ianneclauren969@gmail.com
          </p>

          <p>
            <strong>Operating hours:</strong>
            <br />
            Monday – Saturday, 9:00 AM – 5:00 PM
          </p>

          <div className="contact-note">
            <p>
              For official transactions, our team will coordinate directly after you place an order
              through the website. For general inquiries, feel free to reach out through any of the 
              contact details above or send us a message using the form. We look forward to hearing 
              from you!
            </p>
          </div>
        </div>

        {/* Contact form card */}
        <div className="contact-card">
          <h2>Send us a message</h2>

          {submitted ? (
            <div className="cart-alert cart-alert-success">
              <p>
                ✅ Thank you for reaching out! Your message has been recorded for demo purposes.
                In a live system, this would be sent to the SPEEGO team.
              </p>
            </div>
          ) : (
            <p className="contact-form-subtitle">
              Fill out the form and we will get back to you as soon as possible.
            </p>
          )}

          {!submitted && (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                />
              </div>

              <div className="contact-field">
                <label htmlFor="phone">Contact number</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="09XX-XXX-XXXX"
                />
              </div>

              <div className="contact-field">
                <label htmlFor="email">Email (optional)</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
              </div>

              <div className="contact-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  value={form.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Send message
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
