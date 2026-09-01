import { useEffect, useState } from "react"
import { NavLink, Route, Routes, useNavigate } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import AdminDashboard from "./AdminDashboard"
import AdminMessages from "./AdminMessages"
import AdminNotifications from "./AdminNotifications"
import AdminOrders from "./AdminOrders"
import AdminProductForm from "./AdminProductForm"
import AdminProducts from "./AdminProducts"
import { supabase } from "../../services/supabaseClient"

function AdminNavLink({ to, children, onClick, badgeCount = 0, isDark = true }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition",
          isActive
            ? isDark
              ? "border border-red-400/30 bg-red-500/10 text-red-200"
              : "border border-red-300 bg-red-50 text-red-700"
            : isDark
              ? "border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
              : "border border-transparent text-zinc-700 hover:border-black/10 hover:bg-black/[0.03] hover:text-zinc-900",
        ].join(" ")
      }
    >
      <span>{children}</span>
      {badgeCount > 0 && (
        <span className={[
          "inline-flex min-w-6 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-bold",
          isDark
            ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-200"
            : "border-emerald-300 bg-emerald-100 text-emerald-700",
        ].join(" ")}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </NavLink>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [newOrderNotice, setNewOrderNotice] = useState(null)
  const [unseenNewOrderCount, setUnseenNewOrderCount] = useState(0)
  const [unreadLiveChatCount, setUnreadLiveChatCount] = useState(0)

  const markOrdersAsSeen = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const adminId = session?.user?.id || "unknown-admin"
    const lastSeenKey = `admin_last_seen_order_at:${adminId}`

    localStorage.setItem(lastSeenKey, String(Date.now()))
    setUnseenNewOrderCount(0)
    setNewOrderNotice(null)
  }

  useEffect(() => {
    const checkNewOrdersSinceLastOpen = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const adminId = session?.user?.id || "unknown-admin"
      const lastSeenKey = `admin_last_seen_order_at:${adminId}`

      const { data: latestOrder, error } = await supabase
        .from("orders")
        .select("id, customer_name, total_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !latestOrder?.created_at) {
        return
      }

      const latestAt = new Date(latestOrder.created_at).getTime()
      const storedAt = Number(localStorage.getItem(lastSeenKey) || 0)

      if (!storedAt) {
        localStorage.setItem(lastSeenKey, String(latestAt))
        return
      }

      const lastSeenIso = new Date(storedAt).toISOString()
      const { count, error: countError } = await supabase
        .from("order_notifications")
        .select("id", { count: "exact", head: true })
        .eq("status", "new_order")
        .gt("created_at", lastSeenIso)

      if (!countError) {
        setUnseenNewOrderCount(count || 0)
      }

      if (latestAt > storedAt) {
        setNewOrderNotice({
          id: latestOrder.id,
          customerName: latestOrder.customer_name || "Guest",
          totalAmount: latestOrder.total_amount || 0,
          createdAt: latestOrder.created_at,
        })
        localStorage.setItem(lastSeenKey, String(latestAt))
      }
    }

    checkNewOrdersSinceLastOpen()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className={[
      "min-h-screen",
      isDark ? "bg-black text-white" : "bg-[#f5f5f7] text-zinc-900",
    ].join(" ")}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className={[
          "absolute inset-0",
          isDark
            ? "bg-[radial-gradient(circle_at_10%_8%,rgba(239,68,68,0.10),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(255,255,255,0.04),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.2),rgba(0,0,0,0.94))]"
            : "bg-[radial-gradient(circle_at_10%_8%,rgba(239,68,68,0.08),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(17,24,39,0.04),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.95))]",
        ].join(" ")}/>
        <div className={[
          "absolute inset-0 opacity-[0.09] [background-size:24px_24px]",
          isDark
            ? "[background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]"
            : "[background-image:linear-gradient(rgba(17,24,39,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.10)_1px,transparent_1px)]",
        ].join(" ")}/>
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className={[
          "h-fit rounded-3xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] lg:sticky lg:top-4",
          isDark ? "border-white/10 bg-zinc-950/85" : "border-black/10 bg-white/90",
        ].join(" ")}>
          <div className="flex items-center justify-between gap-3">
            <div className={[
              "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
              isDark ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-red-300 bg-red-50 text-red-700",
            ].join(" ")}>
              Admin Console
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={[
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                isDark
                  ? "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                  : "border-black/10 bg-black/[0.03] text-zinc-700 hover:bg-black/[0.05]",
              ].join(" ")}
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>
          <h2 className={[
            "mt-3 text-2xl font-bold tracking-tight",
            isDark ? "text-white" : "text-zinc-900",
          ].join(" ")}>Admin Panel</h2>
          <p className={[
            "mt-2 text-sm leading-6",
            isDark ? "text-zinc-300" : "text-zinc-600",
          ].join(" ")}>
            Manage products, orders, customer messages, and performance from one place.
          </p>

          <nav className="mt-5 grid gap-2">
            <AdminNavLink to="/admin/dashboard" isDark={isDark}>Dashboard</AdminNavLink>
            <AdminNavLink to="/admin/products" isDark={isDark}>Products</AdminNavLink>
            <AdminNavLink to="/admin/orders" onClick={markOrdersAsSeen} isDark={isDark}>Orders</AdminNavLink>
            <AdminNavLink
              to="/admin/notifications"
              onClick={markOrdersAsSeen}
              badgeCount={unseenNewOrderCount}
              isDark={isDark}
            >
              Notifications
            </AdminNavLink>
            <AdminNavLink to="/admin/messages" badgeCount={unreadLiveChatCount} isDark={isDark}>Messages</AdminNavLink>
          </nav>

          <div className={[
            "mt-5 border-t pt-5",
            isDark ? "border-white/10" : "border-black/10",
          ].join(" ")}>
            <button
              type="button"
              onClick={handleLogout}
              className={[
                "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition",
                isDark
                  ? "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                  : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
              ].join(" ")}
            >
              Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0">
          {newOrderNotice && (
            <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">New order received</p>
                  <p className="mt-1 text-emerald-200/90">
                    Order {newOrderNotice.id} from {newOrderNotice.customerName} (
                    PHP {Number(newOrderNotice.totalAmount || 0).toLocaleString()})
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/orders")}
                    className="rounded-xl border border-emerald-300/30 bg-emerald-500/20 px-3 py-2 font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                  >
                    View order
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOrderNotice(null)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-semibold text-zinc-100 transition hover:bg-white/10"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products/new" element={<AdminProductForm mode="create" />} />
            <Route path="products/:id/edit" element={<AdminProductForm mode="edit" />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route
              path="messages"
              element={<AdminMessages onLiveChatCountChange={setUnreadLiveChatCount} />}
            />
            <Route path="*" element={<AdminDashboard />} />
          </Routes>
        </section>
      </div>
    </div>
  )
}
