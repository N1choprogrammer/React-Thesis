// src/components/ChatAssistant.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import intents from "../chatbot/intents.json"
import { getSpeegoBotReply } from "../chatbot/engine"
import {
  getCrossSellPriceReply,
  findProductMatch,
  getProductAwareReply,
  getRecommendationReply,
  getSimilarProductReply,
} from "../chatbot/productResponder"
import { getOrderStatusReply } from "../chatbot/orderResponder"
import { supabase } from "../services/supabaseClient"

const QUICK_QUESTIONS = [
  "Where is your shop located?",
  "What electric bikes are available?",
  "What is my order status?",
]

export default function ChatAssistant() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I'm SpeeGo AI. Ask me anything about our e-bikes, pricing, and availability.",
    },
  ])
  const [sending, setSending] = useState(false)
  const [catalogProducts, setCatalogProducts] = useState([])
  const [typingFrame, setTypingFrame] = useState(0)
  const [lastProductContextId, setLastProductContextId] = useState(null)
  const [showQuickQuestions, setShowQuickQuestions] = useState(true)

  useEffect(() => {
    const loadCatalog = async () => {
      let data = null
      let error = null

      const primary = await supabase
        .from("products")
        .select(`
          id,
          short_id,
          name,
          price,
          stock,
          is_active,
          product_color_stock (
            color,
            stock
          )
        `)
        .eq("is_active", true)

      data = primary.data
      error = primary.error

      if (error && String(error.message || "").toLowerCase().includes("is_active")) {
        const fallback = await supabase
          .from("products")
          .select(`
            id,
            short_id,
            name,
            price,
            stock,
            product_color_stock (
              color,
              stock
            )
          `)
        data = fallback.data
        error = fallback.error
      }

      if (error) {
        console.error("SpeeGo AI catalog load error:", error)
        return
      }

      setCatalogProducts((data || []).filter((p) => p?.is_active !== false))
    }

    loadCatalog()
  }, [])

  useEffect(() => {
    const handleProductContext = (event) => {
      const productId = event?.detail?.id || null
      if (productId) {
        setLastProductContextId(productId)
      }
    }

    window.addEventListener("speego:product-context", handleProductContext)
    return () => window.removeEventListener("speego:product-context", handleProductContext)
  }, [])

  useEffect(() => {
    if (!sending) {
      setTypingFrame(0)
      return
    }

    const intervalId = setInterval(() => {
      setTypingFrame((prev) => (prev + 1) % 4)
    }, 420)

    return () => clearInterval(intervalId)
  }, [sending])

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleSendMessage = async (rawMessage) => {
    const userMsg = String(rawMessage || "").trim()
    if (!userMsg) return

    setMessages((prev) => [...prev, { from: "user", text: userMsg }])
    setMessage("")
    setSending(true)

    try {
      const matchedProduct = findProductMatch(userMsg, catalogProducts)
      const contextProductIdForReply = matchedProduct?.id || lastProductContextId
      if (matchedProduct?.id) {
        setLastProductContextId(matchedProduct.id)
      }

      const orderReply = await getOrderStatusReply(userMsg, supabase)
      const similarReply =
        orderReply ? null : getSimilarProductReply(userMsg, catalogProducts, contextProductIdForReply)
      const crossSellReply =
        orderReply || similarReply
          ? null
          : getCrossSellPriceReply(userMsg, catalogProducts, contextProductIdForReply)
      const recommendationReply =
        orderReply || similarReply || crossSellReply
          ? null
          : getRecommendationReply(userMsg, catalogProducts)
      const productReply =
        orderReply || similarReply || crossSellReply || recommendationReply
          ? null
          : getProductAwareReply(userMsg, catalogProducts)

      const botReply =
        orderReply ||
        similarReply ||
        crossSellReply ||
        recommendationReply ||
        productReply ||
        getSpeegoBotReply(userMsg, intents)

      const thinkingDelayMs = 1600 + Math.floor(Math.random() * 1600)
      await new Promise((resolve) => setTimeout(resolve, thinkingDelayMs))

      const normalizedBotReply =
        typeof botReply === "string" ? { from: "bot", text: botReply } : { from: "bot", ...botReply }

      setMessages((prev) => [...prev, normalizedBotReply])
      setSending(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    await handleSendMessage(message)
  }

  const renderMessageText = (msg) => {
    const text = String(msg?.text || "")
    const links = Array.isArray(msg?.links) ? msg.links : []

    if (msg?.from !== "bot" || links.length === 0) {
      return text
    }

    const parts = []
    let cursor = 0

    for (const link of links) {
      const label = String(link?.label || "")
      const href = String(link?.href || "")
      if (!label || !href) continue

      const index = text.indexOf(label, cursor)
      if (index === -1) continue

      if (index > cursor) {
        parts.push(text.slice(cursor, index))
      }

      parts.push(
        <a
          key={`${href}-${index}`}
          href={href}
          onClick={(e) => {
            e.preventDefault()
            navigate(href)
          }}
          style={{
            color: "var(--chat-link)",
            textDecoration: "underline",
            textDecorationColor: "var(--chat-link-underline)",
            fontWeight: 700,
          }}
        >
          {label}
        </a>
      )

      cursor = index + label.length
    }

    if (parts.length === 0) return text
    if (cursor < text.length) {
      parts.push(text.slice(cursor))
    }

    return parts
  }

  return (
    <div className={`chat-assistant ${open ? "chat-open" : ""}`}>
      <button type="button" className="chat-assistant-toggle" onClick={handleToggle}>
        {open ? "Close SpeeGo AI" : "SpeeGo AI"}
      </button>

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
                  "chat-message " + (m.from === "user" ? "chat-message-user" : "chat-message-bot")
                }
              >
                <div className="chat-message-bubble">{renderMessageText(m)}</div>
              </div>
            ))}
            {sending && (
              <div className="chat-message chat-message-bot">
                <div className="chat-message-bubble chat-typing">
                  SpeeGo AI is typing{".".repeat(typingFrame + 1)}
                </div>
              </div>
            )}
          </div>

          {showQuickQuestions && (
            <div style={{ padding: "0 0.9rem 0.6rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  marginBottom: "0.45rem",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--chat-muted-strong)",
                  }}
                >
                  Quick Questions
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickQuestions(false)}
                  aria-label="Close quick questions"
                  style={{
                    border: "1px solid var(--chat-chip-border)",
                    background: "var(--chat-chip-bg)",
                    color: "var(--chat-chip-text)",
                    borderRadius: "999px",
                    width: "24px",
                    height: "24px",
                    fontSize: "12px",
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  X
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    disabled={sending}
                    style={{
                      border: "1px solid var(--chat-chip-border)",
                      background: "var(--chat-chip-bg)",
                      color: "var(--chat-chip-text)",
                      borderRadius: "999px",
                      padding: "0.38rem 0.7rem",
                      fontSize: "12px",
                      cursor: sending ? "default" : "pointer",
                      opacity: sending ? 0.6 : 1,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="chat-assistant-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about SpeeGo e-bikes..."
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
