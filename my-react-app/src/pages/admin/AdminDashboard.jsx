import { useEffect, useState } from "react"
import { supabase } from "../../services/supabaseClient"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

function formatPeso(amount) {
  if (amount == null) return "PHP 0"
  return "PHP " + Number(amount).toLocaleString()
}

function formatDateTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString()
}

function getYearMonthKey(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const mm = m < 10 ? `0${m}` : `${m}`
  return `${y}-${mm}`
}

function getYearMonthLabel(date) {
  return date.toLocaleString("default", { month: "short", year: "numeric" })
}

function getYearKey(date) {
  return String(date.getFullYear())
}

function getYearLabel(date) {
  return String(date.getFullYear())
}

function getWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  const ww = weekNo < 10 ? `0${weekNo}` : `${weekNo}`
  return `${d.getUTCFullYear()}-W${ww}`
}

function getWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `Week ${weekNo}, ${d.getUTCFullYear()}`
}

function buildChartData(orders, mode) {
  const buckets = new Map()

  orders.forEach((order) => {
    if (!order.created_at) return
    const d = new Date(order.created_at)
    if (Number.isNaN(d.getTime())) return

    let key
    let label

    switch (mode) {
      case "week":
        key = getWeekKey(d)
        label = getWeekLabel(d)
        break
      case "year":
        key = getYearKey(d)
        label = getYearLabel(d)
        break
      case "month":
      default:
        key = getYearMonthKey(d)
        label = getYearMonthLabel(d)
        break
    }

    if (!buckets.has(key)) {
      buckets.set(key, { key, label, orders: 0, sales: 0 })
    }
    const bucket = buckets.get(key)
    bucket.orders += 1
    bucket.sales += Number(order.total_amount || 0)
  })

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key))
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 shadow-[0_8px_20px_rgba(0,0,0,0.22)]",
        highlight
          ? "border-red-400/25 bg-red-500/10"
          : "border-white/10 bg-zinc-950/85",
      ].join(" ")}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null

  const ordersPoint = payload.find((p) => p.dataKey === "orders")
  const salesPoint = payload.find((p) => p.dataKey === "sales")

  return (
    <div
      style={{
        background: "#09090b",
        border: "1px solid rgba(248,113,113,0.55)",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        minWidth: 170,
      }}
    >
      <div style={{ color: "#fca5a5", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {ordersPoint && (
        <div style={{ color: "#f87171", fontSize: 13, marginBottom: 4 }}>
          Orders: <span style={{ color: "#fee2e2", fontWeight: 700 }}>{ordersPoint.value}</span>
        </div>
      )}
      {salesPoint && (
        <div style={{ color: "#f87171", fontSize: 13 }}>
          Sales:{" "}
          <span style={{ color: "#fee2e2", fontWeight: 700 }}>
            {formatPeso(salesPoint.value)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalSales: 0,
  })
  const [allOrders, setAllOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [chartMode, setChartMode] = useState("month")
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        const { data: products, error: productsError } = await supabase.from("products").select("id")
        if (productsError) throw productsError

        const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id")
        if (profilesError) throw profilesError

        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("id,total_amount,created_at,status,customer_name")
          .order("created_at", { ascending: false })
        if (ordersError) throw ordersError

        const totalSales = (orders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

        setStats({
          totalProducts: (products || []).length,
          totalOrders: (orders || []).length,
          totalUsers: (profiles || []).length,
          totalSales,
        })
        setAllOrders(orders || [])
        setRecentOrders((orders || []).slice(0, 6))
        setChartData(buildChartData(orders || [], chartMode))
      } catch (err) {
        console.error("Error loading dashboard:", err)
        setErrorMsg(err.message || "Failed to load dashboard.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  useEffect(() => {
    setChartData(buildChartData(allOrders, chartMode))
  }, [chartMode, allOrders])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
          Admin Dashboard
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Dashboard</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          High-level overview of SPEEGO inventory, orders, customers, and sales.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          Loading dashboard...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total products" value={stats.totalProducts} />
            <StatCard label="Total orders" value={stats.totalOrders} />
            <StatCard label="Total customers" value={stats.totalUsers} />
            <StatCard label="Total sales" value={formatPeso(stats.totalSales)} highlight />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-white">Orders and sales trend</h3>
                <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
                  {["week", "month", "year"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setChartMode(mode)}
                      className={[
                        "rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                        chartMode === mode
                          ? "bg-red-600 text-white"
                          : "text-black hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length === 0 ? (
                <p className="text-sm text-zinc-300">
                  No orders yet. Place some test orders to see the chart.
                </p>
              ) : (
                <div className="h-[300px] rounded-2xl border border-white/10 bg-black/30 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "#a1a1aa", fontSize: 11 }}
                        tickFormatter={(v) => `PHP ${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ color: "#e4e4e7" }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="orders"
                        name="Orders"
                        dot={false}
                        stroke="#f87171"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="sales"
                        name="Sales (PHP)"
                        stroke="#fff"
                        strokeDasharray="5 3"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Recent orders</h3>
                <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  Latest {recentOrders.length}
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <p className="text-sm text-zinc-300">
                  No orders yet. Once customers start checking out, they will appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const d = new Date(order.created_at)
                    const monthLabel = d.toLocaleString("default", {
                      month: "short",
                      year: "numeric",
                    })
                    const status = order.status || "pending"
                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-white/10 bg-black/30 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {order.customer_name || "Guest"}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {formatDateTime(order.created_at)} | {monthLabel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {formatPeso(order.total_amount)}
                            </p>
                            <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] capitalize text-zinc-200">
                              {status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
