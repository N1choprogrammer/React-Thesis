// src/components/ChatAssistant.jsx
import { useState } from "react"

export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I’m SpeeGo AI. Ask me anything about our e-bikes, pricing, and availability.",
    },
  ])
  const [sending, setSending] = useState(false)

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    const userMsg = message.trim()

    setMessages((prev) => [...prev, { from: "user", text: userMsg }])
    setMessage("")
    setSending(true)

    try {
      // TODO: Replace this with your real API call to app.py later
      // For now we just echo a placeholder response
      const fakeReply =
        "This is a placeholder response from SpeeGo AI. Later, this will be connected to your Python chatbot backend."

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: fakeReply },
        ])
        setSending(false)
      }, 600)
    } catch (err) {
      console.error("AI error:", err)
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Sorry, something went wrong while processing your question.",
        },
      ])
      setSending(false)
    }
  }

  return (
    <div className={`chat-assistant ${open ? "chat-open" : ""}`}>
      {/* Floating button */}
      <button
        type="button"
        className="chat-assistant-toggle"
        onClick={handleToggle}
      >
        {open ? "Close SpeeGo AI" : "SpeeGo AI"}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-assistant-panel">
          <div className="chat-assistant-header">
            <div>
              <div className="chat-assistant-title">SpeeGo AI Assistant</div>
              <div className="chat-assistant-subtitle">
                Ask about models, specs, or how ordering works.
              </div>
            </div>
          </div>

          <div className="chat-assistant-messages">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  "chat-message " +
                  (m.from === "user" ? "chat-message-user" : "chat-message-bot")
                }
              >
                <div className="chat-message-bubble">{m.text}</div>
              </div>
            ))}
            {sending && (
              <div className="chat-message chat-message-bot">
                <div className="chat-message-bubble chat-typing">
                  Typing…
                </div>
              </div>
            )}
          </div>

          <form className="chat-assistant-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about SpeeGo e-bikes…"
            />
            <button type="submit" disabled={sending || !message.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
