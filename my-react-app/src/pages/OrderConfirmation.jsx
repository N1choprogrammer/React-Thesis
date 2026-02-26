import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { supabase } from "../services/supabaseClient"
import { useTheme } from "../context/ThemeContext"

function formatPeso(amount) {
  if (amount == null) return "PHP 0"
  return "PHP " + Number(amount).toLocaleString()
}

function formatDateTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString()
}

function formatProductCodeFromId(rawId, fallbackShortId) {
  if (fallbackShortId) return fallbackShortId
  if (!rawId) return "SPG-UNKNOWN"
  return `SPG-${String(rawId).replace(/-/g, "").slice(0, 10).toUpperCase()}`
}

function ReceiptCard({ order, isDark }) {
  const items = order?.order_items || []

  return (
    <div className={["rounded-3xl p-5 sm:p-6", isDark ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]" : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]"].join(" ")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
            Receipt
          </div>
          <h3 className={["mt-3 text-xl font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Order Receipt</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Order reference: <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{order.id}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className={[
            "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
            isDark
              ? "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
              : "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50",
          ].join(" ")}
        >
          Print receipt
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className={["rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
          <h4 className={["mb-3 text-sm font-semibold uppercase tracking-[0.14em]", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            Customer Details
          </h4>
          <div className={["space-y-2 text-sm", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            <p>
              <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Name:</span> {order.customer_name || "-"}
            </p>
            {order.customer_phone && (
              <p>
                <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Phone:</span> {order.customer_phone}
              </p>
            )}
            {order.customer_email && (
              <p>
                <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Email:</span> {order.customer_email}
              </p>
            )}
            {order.address && (
              <p>
                <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Address:</span> {order.address}
              </p>
            )}
            <p>
              <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Status:</span>{" "}
              <span className="capitalize">{String(order.status || "pending").replace(/_/g, " ")}</span>
            </p>
            {order.created_at && (
              <p>
                <span className={["font-medium", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Date:</span> {formatDateTime(order.created_at)}
              </p>
            )}
          </div>
        </section>

        <section className={["rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white"].join(" ")}>
          <h4 className={["mb-3 text-sm font-semibold uppercase tracking-[0.14em]", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>Items</h4>
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">No items recorded for this order.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const lineTotal = (item.price || 0) * (item.quantity || 0)
                return (
                  <div
                    key={item.id}
                    className={["rounded-xl p-3", isDark ? "border border-white/10 bg-black/30" : "border border-black/10 bg-zinc-50"].join(" ")}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className={["text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{item.product_name}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          ID: {formatProductCodeFromId(item.product_id, item.product_short_id)} | Color:{" "}
                          {item.color || "-"} | Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-left text-xs text-zinc-500 sm:text-right">
                        <p>{formatPeso(item.price || 0)} each</p>
                        <p className={["mt-1 text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{formatPeso(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className={["mt-4 pt-3", isDark ? "border-t border-white/10" : "border-t border-black/10"].join(" ")}>
            <div className={["flex items-center justify-between text-base font-bold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
              <span>Total</span>
              <span>{formatPeso(order.total_amount)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function OrderConfirmation() {
  const { isDark } = useTheme()
  const { orderId } = useParams()
  const location = useLocation()
  const stateOrder = location.state?.order || null
  const stateOrderHasItems = Array.isArray(stateOrder?.order_items)

  const [order, setOrder] = useState(stateOrder)
  const [loading, setLoading] = useState(!!orderId && !stateOrderHasItems)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    if (stateOrderHasItems) {
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single()

      if (fetchError) {
        console.error("Error loading order:", fetchError)
        setError("We couldn't load your order details. You can check it on the My Orders page.")
      } else {
        setOrder(data)
      }

      setLoading(false)
    }

    fetchOrder()
  }, [orderId, stateOrderHasItems])

  return (
    <div className={["relative min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6 lg:px-8", isDark ? "bg-black text-white" : "bg-transparent text-zinc-900"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className={["absolute inset-0", isDark ? "bg-[radial-gradient(circle_at_12%_10%,rgba(239,68,68,0.10),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(255,255,255,0.04),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.2),rgba(0,0,0,0.92))]" : "bg-[radial-gradient(circle_at_12%_10%,rgba(239,68,68,0.08),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(17,24,39,0.04),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]"].join(" ")} />
        <div className={["absolute inset-0 [background-size:24px_24px]", isDark ? "opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]" : "opacity-[0.05] [background-image:linear-gradient(rgba(17,24,39,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.10)_1px,transparent_1px)]"].join(" ")} />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-6">
        <section className={["rounded-3xl p-5 sm:p-6", isDark ? "border border-white/10 bg-zinc-950/85 shadow-[0_20px_60px_rgba(0,0,0,0.45)]" : "border border-black/10 bg-white/90 shadow-[0_14px_40px_rgba(17,24,39,0.10)]"].join(" ")}>
          <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Order placed
          </div>
          <h2 className={["mt-3 text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
            Thank you for your order
          </h2>
          <p className={["mt-2 text-sm leading-6", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
            Your order has been received and is currently{" "}
            <span className="font-semibold text-zinc-100">pending</span>. We will contact you soon
            to confirm the details.
          </p>
          {orderId && (
            <p className="mt-3 text-sm text-zinc-500">
              Order reference: <code className={["rounded px-2 py-1", isDark ? "bg-white/5 text-zinc-200" : "bg-zinc-100 text-zinc-900 border border-black/10"].join(" ")}>{orderId}</code>
            </p>
          )}
        </section>

        {loading && (
          <div className={["rounded-2xl p-5 text-sm", isDark ? "border border-white/10 bg-zinc-950/85 text-zinc-300" : "border border-black/10 bg-white/90 text-zinc-600"].join(" ")}>
            Loading your order details...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {order && <ReceiptCard order={order} isDark={isDark} />}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/my-orders"
            className={[
              "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
              isDark
                ? "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                : "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50",
            ].join(" ")}
          >
            View My Orders
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center rounded-xl border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Back to shop
          </Link>
        </div>
      </div>
    </div>
  )
}
