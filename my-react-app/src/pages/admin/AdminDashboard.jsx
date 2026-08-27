import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../services/supabaseClient"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const SALES_INCLUDED_STATUSES = new Set(["confirmed", "processing", "ready_for_pickup", "completed"])

function formatPeso(amount) {
  return `PHP ${Number(amount || 0).toLocaleString()}`
}

function formatDateTime(iso) {
  return iso ? new Date(iso).toLocaleString() : ""
}

function getPeriod(date, mode) {
  if (mode === "year") return { key: String(date.getFullYear()), label: String(date.getFullYear()) }
  if (mode === "week") {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = utcDate.getUTCDay() || 7
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
    const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7)
    const year = utcDate.getUTCFullYear()
    return { key: `${year}-W${String(week).padStart(2, "0")}`, label: `Week ${week}, ${year}` }
  }
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    label: date.toLocaleString("default", { month: "short", year: "numeric" }),
  }
}

function buildChartData(orders, mode) {
  const buckets = new Map()
  orders.forEach((order) => {
    if (!SALES_INCLUDED_STATUSES.has(String(order.status || "").toLowerCase()) || !order.created_at) return
    const date = new Date(order.created_at)
    if (Number.isNaN(date.getTime())) return
    const period = getPeriod(date, mode)
    if (!buckets.has(period.key)) buckets.set(period.key, { ...period, orders: 0, sales: 0 })
    const bucket = buckets.get(period.key)
    bucket.orders += 1
    bucket.sales += Number(order.total_amount || 0)
  })
  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key))
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div className={["rounded-2xl border p-4 shadow-[0_8px_20px_rgba(0,0,0,0.22)]", highlight ? "border-red-400/25 bg-red-500/10" : "border-white/10 bg-zinc-950/85"].join(" ")}>
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-red-400/50 bg-zinc-950 px-3 py-2 shadow-xl">
      <p className="mb-1 font-bold text-red-200">{label}</p>
      {payload.map((point) => (
        <p key={point.dataKey} className="text-xs" style={{ color: point.color }}>
          {point.name}: <span className="font-bold text-red-50">{point.dataKey === "sales" ? formatPeso(point.value) : point.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalUsers: 0, totalSales: 0 })
  const [allOrders, setAllOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [chartMode, setChartMode] = useState("month")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const [{ data: products, error: productsError }, { data: profiles, error: profilesError }, { data: orders, error: ordersError }] = await Promise.all([
          supabase.from("products").select("id"),
          supabase.from("profiles").select("id"),
          supabase.from("orders").select("id,total_amount,created_at,status,customer_name").order("created_at", { ascending: false }),
        ])
        if (productsError) throw productsError
        if (profilesError) throw profilesError
        if (ordersError) throw ordersError
        const allLoadedOrders = orders || []
        const includedOrders = allLoadedOrders.filter((order) => SALES_INCLUDED_STATUSES.has(String(order.status || "").toLowerCase()))
        setStats({
          totalProducts: (products || []).length,
          totalOrders: includedOrders.length,
          totalUsers: (profiles || []).length,
          totalSales: includedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        })
        setAllOrders(allLoadedOrders)
        setRecentOrders(allLoadedOrders.slice(0, 2))
      } catch (error) {
        console.error("Error loading dashboard:", error)
        setErrorMsg(error.message || "Failed to load dashboard.")
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  const chartOrders = chartMode === "month"
    ? allOrders.filter((order) => order.created_at?.slice(0, 7) === selectedMonth)
    : allOrders
  const chartData = buildChartData(chartOrders, chartMode)
  const completedOrders = allOrders.filter((order) => String(order.status || "").toLowerCase() === "completed").length
  const averageOrderValue = stats.totalOrders ? stats.totalSales / stats.totalOrders : 0
  const completionRate = stats.totalOrders ? (completedOrders / stats.totalOrders) * 100 : 0
  const salesMax = Math.max(...chartData.map((item) => item.sales), 0)

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">Admin Dashboard</div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Dashboard</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">High-level overview of SPEEGO inventory, orders, customers, and sales.</p>
      </div>
      {errorMsg && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{errorMsg}</div>}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Total products" value={stats.totalProducts} />
            <StatCard label="Total orders" value={stats.totalOrders} />
            <StatCard label="Total customers" value={stats.totalUsers} />
            <StatCard label="Total sales" value={formatPeso(stats.totalSales)} highlight />
            <StatCard label="Average order" value={formatPeso(averageOrderValue)} />
            <StatCard label="Completion rate" value={`${completionRate.toFixed(0)}%`} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
                    {["week", "month", "year"].map((mode) => <button key={mode} type="button" onClick={() => setChartMode(mode)} className={["rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition", chartMode === mode ? "bg-red-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"].join(" ")}>{mode}</button>)}
                  </div>
                  {chartMode === "month" && <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white outline-none focus:border-red-400/60" />}
                </div>
              </div>
              {chartData.length === 0 ? <p className="text-sm text-zinc-300">No orders yet. Place some test orders to see the chart.</p> : (
                <div className="h-[300px] rounded-2xl border border-white/10 bg-black/30 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="label" interval={0} minTickGap={0} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                      <YAxis yAxisId="orders" tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
                      <YAxis yAxisId="sales" orientation="right" domain={[0, Math.max(salesMax * 1.15, 1)]} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={(value) => `PHP ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ color: "#e4e4e7" }} />
                      <Bar yAxisId="orders" dataKey="orders" name="Orders" fill="#f87171" radius={[5, 5, 0, 0]} />
                      <Bar yAxisId="sales" dataKey="sales" name="Sales (PHP)" fill="#fef3c7" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <section className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold text-white">Recent orders</h3><span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Latest {recentOrders.length}</span></div>
              {recentOrders.length === 0 ? <p className="text-sm text-zinc-300">No orders yet. Once customers start checking out, they will appear here.</p> : <div className="space-y-3">{recentOrders.map((order) => <div key={order.id} className="rounded-2xl border border-white/10 bg-black/30 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{order.customer_name || "Guest"}</p><p className="mt-1 text-xs text-zinc-400">{formatDateTime(order.created_at)}</p></div><div className="text-right"><p className="text-sm font-semibold text-white">{formatPeso(order.total_amount)}</p><span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] capitalize text-zinc-200">{(order.status || "pending").replace(/_/g, " ")}</span></div></div></div>)}</div>}
              {recentOrders.length > 0 && <div className="mt-4 border-t border-white/10 pt-4"><Link to="/admin/orders" className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">See more</Link></div>}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
