import { Fragment, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"
import { useTheme } from "../context/ThemeContext"

function formatDateTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString()
}

function formatPeso(amount) {
  if (amount == null) return "PHP 0"
  return "PHP " + Number(amount).toLocaleString()
}

function formatProductCodeFromId(rawId, fallbackShortId) {
  if (fallbackShortId) return fallbackShortId
  if (!rawId) return "SPG-UNKNOWN"
  return `SPG-${String(rawId).replace(/-/g, "").slice(0, 10).toUpperCase()}`
}

function ReceiptPreview({ order, isDark }) {
  const items = order.order_items || []

  return (
    <section className="rounded-2xl border border-red-400/20 bg-red-500/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className={["text-sm font-semibold uppercase tracking-[0.14em]", isDark ? "text-red-200" : "text-red-700"].join(" ")}>
          Receipt Preview
        </h4>
        <button
          type="button"
          onClick={() => window.print()}
          className={[
            "rounded-lg px-3 py-2 text-xs font-semibold transition",
            isDark
              ? "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
              : "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50",
          ].join(" ")}
        >
          Print receipt
        </button>
      </div>

      <div className={["mt-3 rounded-xl p-4", isDark ? "border border-white/10 bg-black/30" : "border border-black/10 bg-white"].join(" ")}>
        <div className={["flex flex-col gap-2 text-sm sm:flex-row sm:items-start sm:justify-between", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
          <div>
            <p>
              <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Order ID:</span> {order.id}
            </p>
            <p className="mt-1">
              <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Date:</span> {formatDateTime(order.created_at)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="capitalize">
              <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Status:</span>{" "}
              {(order.status || "pending").replace(/_/g, " ")}
            </p>
            <p className={["mt-1 font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
              Total: {formatPeso(order.total_amount)}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {items.map((it) => {
            const lineTotal = (it.price || 0) * (it.quantity || 0)
            return (
              <div
                key={it.id}
                className={[
                  "flex flex-col gap-1 rounded-lg p-3 text-sm sm:flex-row sm:items-center sm:justify-between",
                  isDark ? "border border-white/10 bg-zinc-950/70" : "border border-black/10 bg-zinc-50",
                ].join(" ")}
              >
                <div>
                  <p className={["font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{it.product_name}</p>
                  <p className={["text-xs", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                    ID: {formatProductCodeFromId(it.product_id, it.product_short_id)} | Color:{" "}
                    {it.color || "-"} | Qty: {it.quantity}
                  </p>
                </div>
                <div className={["text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{formatPeso(lineTotal)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function getStatusClasses(status, isDark) {
  if (isDark) {
    switch (status) {
      case "completed":
      case "delivered":
        return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      case "cancelled":
        return "border-zinc-400/30 bg-zinc-500/10 text-zinc-200"
      case "processing":
      case "shipped":
        return "border-blue-400/30 bg-blue-500/10 text-blue-200"
      default:
        return "border-amber-400/30 bg-amber-500/10 text-amber-200"
    }
  }

  switch (status) {
    case "completed":
    case "delivered":
      return "border-emerald-300 bg-emerald-50 text-emerald-800"
    case "cancelled":
      return "border-zinc-300 bg-zinc-100 text-zinc-800"
    case "processing":
    case "shipped":
      return "border-blue-300 bg-blue-50 text-blue-800"
    default:
      return "border-amber-300 bg-amber-50 text-amber-800"
  }
}

export default function MyOrders() {
  const { isDark } = useTheme()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      setErrorMsg(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("Error getting user:", userError)
        setErrorMsg("Failed to check your session.")
        setLoading(false)
        return
      }

      if (!user) {
        setErrorMsg("You need to log in to view your orders.")
        setLoading(false)
        return
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", user.email)
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("Error loading orders:", ordersError)
        setErrorMsg("Failed to load your orders.")
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

    loadOrders()
  }, [])

  const handleToggleExpand = (orderId) => {
    setExpandedOrderId((current) => (current === orderId ? null : orderId))
  }

  const getStatusLabel = (status) => {
    const s = status || "pending"
    return s.replace(/_/g, " ")
  }

  return (
    <div className={["relative min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6 lg:px-8", isDark ? "bg-black text-white" : "bg-transparent text-zinc-900"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className={["absolute inset-0", isDark ? "bg-[radial-gradient(circle_at_10%_10%,rgba(239,68,68,0.10),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.04),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.2),rgba(0,0,0,0.92))]" : "bg-[radial-gradient(circle_at_10%_10%,rgba(239,68,68,0.08),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(17,24,39,0.04),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]"].join(" ")} />
        <div className={["absolute inset-0 [background-size:24px_24px]", isDark ? "opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]" : "opacity-[0.05] [background-image:linear-gradient(rgba(17,24,39,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.10)_1px,transparent_1px)]"].join(" ")} />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className={["mb-6 rounded-3xl p-5 sm:p-6", isDark ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]" : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]"].join(" ")}>
          <div className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
            isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600 ",
          ].join(" ")}>
            Customer Orders
          </div>
          <h2 className={["mt-3 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>My Orders</h2>
          <p className={["mt-2 max-w-3xl text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            View the orders you placed on SPEEGO and track their status.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <p>{errorMsg}</p>
            {errorMsg.includes("log in") && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="rounded-xl border border-red-500 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                >
                  Go to login
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className={["rounded-2xl p-5 text-sm", isDark ? "border border-white/10 bg-zinc-950/85 text-zinc-300" : "border border-black/10 bg-white/90 text-zinc-600"].join(" ")}>
            Loading your orders...
          </div>
        ) : !errorMsg && orders.length === 0 ? (
          <div className={["rounded-2xl p-5 text-sm", isDark ? "border border-white/10 bg-zinc-950/85 text-zinc-300" : "border border-black/10 bg-white/90 text-zinc-600"].join(" ")}>
            You don&apos;t have any orders yet. Visit the shop page to place your first order.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id
              const items = order.order_items || []
              const status = order.status || "pending"

              const itemsSummary =
                items.length === 0
                  ? "No items"
                  : items
                      .map((it) => `${it.product_name} x${it.quantity}`)
                      .slice(0, 3)
                      .join(", ") + (items.length > 3 ? "..." : "")

              return (
                <Fragment key={order.id}>
                  <article className={["overflow-hidden rounded-2xl", isDark ? "border border-white/10 bg-zinc-950/85 shadow-[0_12px_32px_rgba(0,0,0,0.28)]" : "border border-black/10 bg-white/90 shadow-[0_10px_26px_rgba(17,24,39,0.08)]"].join(" ")}>
                    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(status, isDark)}`}
                          >
                            {getStatusLabel(status)}
                          </span>
                          <span className="text-xs text-zinc-500">{formatDateTime(order.created_at)}</span>
                        </div>
                        <div className={["text-sm", isDark ? "text-zinc-200" : "text-zinc-700"].join(" ")}>
                          <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Order ID:</span>{" "}
                          <span className="break-all text-zinc-500">{order.id}</span>
                        </div>
                        <div className={["text-sm", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                          <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Items:</span> {itemsSummary}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                        <div className={["rounded-xl p-3", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Total</p>
                          <p className={["mt-1 text-base font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                            {formatPeso(order.total_amount)}
                          </p>
                        </div>
                        <div className={["rounded-xl p-3", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Line items</p>
                          <p className={["mt-1 text-base font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{items.length}</p>
                        </div>
                      </div>

                      <div className="lg:justify-self-end">
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(order.id)}
                          className={[
                            "w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition lg:w-auto",
                            isDark
                              ? "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                              : "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50",
                          ].join(" ")}
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={["p-4 sm:p-5", isDark ? "border-t border-white/10" : "border-t border-black/10"].join(" ")}>
                        <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
                          <section className={["rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                            <h4 className={["mb-3 text-sm font-semibold uppercase tracking-[0.14em]", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                              Order Details
                            </h4>
                            <div className={["space-y-2 text-sm", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                              <p>
                                <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Name:</span> {order.customer_name}
                              </p>
                              {order.customer_phone && (
                                <p>
                                  <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Phone:</span>{" "}
                                  {order.customer_phone}
                                </p>
                              )}
                              {order.customer_email && (
                                <p>
                                  <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Email:</span>{" "}
                                  {order.customer_email}
                                </p>
                              )}
                              {order.address && (
                                <p>
                                  <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Address:</span> {order.address}
                                </p>
                              )}
                              {order.notes && (
                                <p>
                                  <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Notes:</span> {order.notes}
                                </p>
                              )}
                            </div>
                          </section>

                          <section className={["rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
                            <h4 className={["mb-3 text-sm font-semibold uppercase tracking-[0.14em]", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                              Items
                            </h4>

                            {items.length === 0 ? (
                              <p className="text-sm text-zinc-500">No items recorded for this order.</p>
                            ) : (
                              <div className="space-y-3">
                                {items.map((it) => {
                                  const lineTotal = (it.price || 0) * (it.quantity || 0)
                                  return (
                                    <div
                                      key={it.id}
                                      className={[
                                        "grid gap-3 rounded-xl p-3 sm:grid-cols-[1fr_auto]",
                                        isDark ? "border border-white/10 bg-black/30" : "border border-black/10 bg-zinc-50",
                                      ].join(" ")}
                                    >
                                      <div>
                                        <p className={["text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                                          {it.product_name}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                          ID: {formatProductCodeFromId(it.product_id, it.product_short_id)} | Color:{" "}
                                          {it.color || "-"} | Qty: {it.quantity}
                                        </p>
                                      </div>
                                      <div className="text-left text-xs text-zinc-500 sm:text-right">
                                        <p>{formatPeso(it.price || 0)} each</p>
                                        <p className={["mt-1 text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                                          {formatPeso(lineTotal)}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </section>
                        </div>

                        <div className="mt-4">
                          <ReceiptPreview order={order} isDark={isDark} />
                        </div>
                      </div>
                    )}
                  </article>
                </Fragment>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
