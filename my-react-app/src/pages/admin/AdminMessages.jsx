// src/pages/admin/AdminMessages.jsx
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
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h2 className="page-title">Customer messages</h2>
          <p className="page-subtitle">
            These are messages submitted through the Contact page. Only administrators can view them.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="page-subtitle">Loading messages…</p>
      ) : messages.length === 0 ? (
        <p className="page-subtitle">No messages yet.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Received</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.created_at)}</td>
                  <td>{m.name}</td>
                  <td>
                    <div>{m.phone}</div>
                    {m.email && <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>{m.email}</div>}
                  </td>
                  <td style={{ maxWidth: "380px" }}>
                    <div className="admin-message-text">
                      {m.message}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
