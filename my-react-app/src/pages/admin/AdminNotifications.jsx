import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../services/supabaseClient"

function formatDateTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString()
}

function shortOrderId(orderId) {
  if (!orderId) return "-"
  return `${String(orderId).slice(0, 8)}...`
}

export default function AdminNotifications() {
  const [rows, setRows] = useState([])
  const [orderItemsByOrderId, setOrderItemsByOrderId] = useState({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [resultFilter, setResultFilter] = useState("all")

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      setErrorMsg("")

      const { data, error } = await supabase
        .from("order_notifications")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading order notifications:", error)
        setErrorMsg(error.message || "Failed to load notifications.")
        setRows([])
        setOrderItemsByOrderId({})
      } else {
        const notifications = data || []
        setRows(notifications)

        const orderIds = [...new Set(notifications.map((n) => n.order_id).filter(Boolean))]
        if (orderIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from("order_items")
            .select("order_id, product_name, color, quantity")
            .in("order_id", orderIds)

          if (itemsError) {
            console.error("Error loading order items for notifications:", itemsError)
            setOrderItemsByOrderId({})
          } else {
            const grouped = (itemsData || []).reduce((acc, item) => {
              const key = item.order_id
              if (!acc[key]) acc[key] = []
              acc[key].push(item)
              return acc
            }, {})
            setOrderItemsByOrderId(grouped)
          }
        } else {
          setOrderItemsByOrderId({})
        }
      }

      setLoading(false)
    }

    fetchNotifications()
  }, [])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase()
      const matchesSearch = q
        ? String(row.order_id || "").toLowerCase().includes(q) ||
          String(row.recipient_email || "").toLowerCase().includes(q)
        : true

      const matchesStatus =
        statusFilter === "all" ? true : String(row.status || "").toLowerCase() === statusFilter

      const rowResult = row.success ? "success" : "failed"
      const matchesResult = resultFilter === "all" ? true : rowResult === resultFilter

      return matchesSearch && matchesStatus && matchesResult
    })
  }, [rows, search, statusFilter, resultFilter])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
          Notifications
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Order notification logs</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Email delivery history for order status updates (confirmed/cancelled).
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID or recipient email..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
          >
            <option value="all">All status</option>
            <option value="new_order">New order</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
          >
            <option value="all">All results</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          Loading notification logs...
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          No notification logs found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/85 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-black/30">
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-zinc-400">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Result</th>
                <th className="px-4 py-3 font-semibold">Items (Product / Color)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-zinc-200">
              {filteredRows.map((row) => {
                const items = orderItemsByOrderId[row.order_id] || []
                return (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3 text-zinc-300">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-zinc-300" title={row.order_id || ""}>
                      {shortOrderId(row.order_id)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold capitalize text-zinc-200">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{row.recipient_email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        row.success
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-400/30 bg-amber-500/10 text-amber-200",
                      ].join(" ")}
                    >
                      {row.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {items.length === 0 ? (
                      <span className="text-zinc-500">-</span>
                    ) : (
                      <div className="space-y-1">
                        {items.map((it, idx) => (
                          <div key={`${row.id}-${idx}`} className="text-xs">
                            <span className="font-semibold text-zinc-200">{it.product_name || "Unknown product"}</span>{" "}
                            <span className="text-zinc-400">({it.color || "No color"}) x{it.quantity || 1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
