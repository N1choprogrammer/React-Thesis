// src/components/ChatAssistant.jsx
import { useState, useEffect, useRef } from "react"

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I’m the SPEEGO assistant. How can I help you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // auto-scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return

    // add user message
    setMessages((prev) => [...prev, { from: "user", text: trimmed }])
    setInput("")
    setLoading(true)

    try {
      // 🔗 Call your Python backend here
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      })

      if (!res.ok) {
        throw new Error("Network response was not ok")
      }

      const data = await res.json()
      const reply = data.reply || "Sorry, I couldn’t understand that."

      setMessages((prev) => [
        ...prev,
        { from: "bot", text: reply },
      ])
    } catch (err) {
      console.error("Chat error:", err)
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text:
            "Sorry, something went wrong talking to the AI. Please try again in a moment.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-assistant-wrapper">
      {/* Floating panel */}
      {isOpen && (
        <div className="chat-assistant-panel">
          <div className="chat-assistant-header">
            <div>
              <div className="chat-assistant-title">SPEEGO Assistant</div>
              <div className="chat-assistant-subtitle">
                Ask about bikes, orders, or general info.
              </div>
            </div>
            <button
              type="button"
              className="chat-assistant-close"
              onClick={handleToggle}
            >
              ✕
            </button>
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
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-assistant-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={
                loading ? "Waiting for reply..." : "Type your question…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}

      {/* Sticky button */}
      <button
        type="button"
        className="chat-assistant-toggle"
        onClick={handleToggle}
      >
        💬 SpeeGO AI
      </button>
    </div>
  )
}
