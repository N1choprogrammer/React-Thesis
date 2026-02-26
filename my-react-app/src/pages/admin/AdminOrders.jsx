import { Fragment, useEffect, useState } from "react"
import { supabase } from "../../services/supabaseClient"

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

function getStatusClasses(status) {
  switch (status) {
    case "completed":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    case "cancelled":
      return "border-zinc-400/30 bg-zinc-500/10 text-zinc-200"
    case "processing":
      return "border-blue-400/30 bg-blue-500/10 text-blue-200"
    case "confirmed":
    case "ready_for_pickup":
      return "border-purple-400/30 bg-purple-500/10 text-purple-200"
    default:
      return "border-amber-400/30 bg-amber-500/10 text-amber-200"
  }
}

function formatDateTime(isoString) {
  if (!isoString) return ""
  const d = new Date(isoString)
  return d.toLocaleString()
}

function formatPeso(value) {
  return `PHP ${Number(value || 0).toLocaleString()}`
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [savingStatusId, setSavingStatusId] = useState(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("")
  const [dayFilter, setDayFilter] = useState("")

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("Error loading orders:", ordersError)
        setErrorMsg("Failed to load orders.")
        setLoading(false)
        return
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const orderIds = ordersData.map((o) => o.id)

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)

      if (itemsError) {
        console.error("Error loading order items:", itemsError)
        setErrorMsg("Failed to load order items.")
        setOrders(ordersData.map((o) => ({ ...o, order_items: [] })))
        setLoading(false)
        return
      }

      const ordersWithItems = ordersData.map((order) => ({
        ...order,
        order_items: itemsData.filter((it) => it.order_id === order.id),
      }))

      setOrders(ordersWithItems)
      setLoading(false)
    }

    fetchOrders()
  }, [])

  const handleToggleExpand = (orderId) => {
    setExpandedOrderId((current) => (current === orderId ? null : orderId))
  }

  const handleStatusChange = async (orderId, newStatus) => {
    setSavingStatusId(orderId)

    const currentOrder = orders.find((o) => o.id === orderId)
    const previousStatus = currentOrder?.status

    const { error: statusError } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId)

    if (statusError) {
      console.error("Error updating order status:", statusError)
      alert("Failed to update order status.")
      setSavingStatusId(null)
      return
    }

    if (previousStatus !== "cancelled" && newStatus === "cancelled") {
      const { error: stockError } = await supabase.rpc("increase_stock_for_order", {
        order_uuid: orderId,
      })

      if (stockError) {
        console.error("Error restoring stock for cancelled order:", stockError)
        alert("Order cancelled, but failed to restore stock. Check logs.")
      }
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
    setSavingStatusId(null)
  }

  const filteredOrders =
    orders.filter((o) => {
      const search = customerSearch.trim().toLowerCase()
      const customerName = String(o.customer_name || "").toLowerCase()
      const searchMatch = search ? customerName.includes(search) : true

      const statusMatch =
        statusFilter === "all" ? true : (o.status || "pending") === statusFilter

      const createdAt = o.created_at ? new Date(o.created_at) : null
      const validDate = createdAt && !Number.isNaN(createdAt.getTime())

      const localDateValue = validDate
        ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(
            createdAt.getDate()
          ).padStart(2, "0")}`
        : ""
      const localMonthValue = localDateValue ? localDateValue.slice(0, 7) : ""

      const monthMatch = monthFilter ? localMonthValue === monthFilter : true
      const dayMatch = dayFilter ? localDateValue === dayFilter : true

      return searchMatch && statusMatch && monthMatch && dayMatch
    })

  const clearDateFilters = () => {
    setMonthFilter("")
    setDayFilter("")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
          Order Management
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Orders</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          View customer orders placed from the SPEEGO shop and update their status.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Search customer name
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Type customer name..."
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
              />
              {customerSearch && (
                <button
                  type="button"
                  onClick={() => setCustomerSearch("")}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Filter by status
          </span>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-zinc-800/60 p-2">
            <button
              type="button"
              className={[
                "rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                statusFilter === "all"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-700/70 text-zinc-200 hover:bg-zinc-600/80",
              ].join(" ")}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={[
                  "rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  statusFilter === opt.value
                    ? "bg-red-600 text-white"
                    : "bg-zinc-700/70 text-zinc-200 hover:bg-zinc-600/80",
                ].join(" ")}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 lg:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Filter by month
              </label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                View orders by day
              </label>
              <input
                type="date"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearDateFilters}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 lg:w-auto"
              >
                Clear dates
              </button>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          No orders match the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id
            const items = order.order_items || []
            const isSaving = savingStatusId === order.id
            const statusValue = order.status || "pending"
            const itemSummary =
              items.length === 0
                ? "No items"
                : items
                    .map((it) => `${it.product_name} x${it.quantity}`)
                    .slice(0, 3)
                    .join(", ") + (items.length > 3 ? "..." : "")

            return (
              <Fragment key={order.id}>
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/85 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
                  <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.2fr_1fr_1.1fr]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                            statusValue
                          )}`}
                        >
                          {statusValue.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-zinc-400">{formatDateTime(order.created_at)}</span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {order.customer_name || "Guest"}
                      </p>
                      <div className="text-sm text-zinc-300">
                        <p>{order.customer_phone || "-"}</p>
                        {order.customer_email && <p className="break-all text-zinc-400">{order.customer_email}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Total</p>
                        <p className="mt-1 text-base font-semibold text-white">
                          {formatPeso(order.total_amount)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Items</p>
                        <p className="mt-1 text-sm text-zinc-200">{itemSummary}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                          Update status
                        </label>
                        <select
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60"
                          value={statusValue}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={isSaving}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(order.id)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                      >
                        {isExpanded ? "Hide details" : "View details"}
                      </button>
                      {isSaving && <p className="text-xs text-zinc-400">Saving status...</p>}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 sm:p-5">
                      {items.length === 0 ? (
                        <p className="text-sm text-zinc-300">No items recorded for this order.</p>
                      ) : (
                        <div className="space-y-3">
                          {items.map((it) => {
                            const lineTotal = (it.price || 0) * (it.quantity || 0)
                            return (
                              <div
                                key={it.id}
                                className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_auto]"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-white">{it.product_name}</p>
                                  <p className="mt-1 text-xs text-zinc-400">
                                    Color: {it.color || "-"} | Qty: {it.quantity}
                                  </p>
                                </div>
                                <div className="text-left text-xs text-zinc-400 sm:text-right">
                                  <p>{formatPeso(it.price || 0)} each</p>
                                  <p className="mt-1 text-sm font-semibold text-white">
                                    {formatPeso(lineTotal)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
