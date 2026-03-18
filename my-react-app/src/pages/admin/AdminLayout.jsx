import { useEffect, useState } from "react"
import { NavLink, Route, Routes, useNavigate } from "react-router-dom"
import AdminDashboard from "./AdminDashboard"
import AdminMessages from "./AdminMessages"
import AdminNotifications from "./AdminNotifications"
import AdminOrders from "./AdminOrders"
import AdminProductForm from "./AdminProductForm"
import AdminProducts from "./AdminProducts"
import { supabase } from "../../services/supabaseClient"

function AdminNavLink({ to, children, onClick, badgeCount = 0 }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition",
          isActive
            ? "border border-red-400/30 bg-red-500/10 text-red-200"
            : "border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
        ].join(" ")
      }
    >
      <span>{children}</span>
      {badgeCount > 0 && (
        <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </NavLink>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const [newOrderNotice, setNewOrderNotice] = useState(null)
  const [unseenNewOrderCount, setUnseenNewOrderCount] = useState(0)

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
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(239,68,68,0.10),transparent_45%),radial-gradient(circle_at_88%_0%,rgba(255,255,255,0.04),transparent_35%),linear-gradient(to_bottom,rgba(24,24,27,0.2),rgba(0,0,0,0.94))]" />
        <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="h-fit rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] lg:sticky lg:top-4">
          <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-200">
            Admin Console
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Admin Panel</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Manage products, orders, customer messages, and performance from one place.
          </p>

          <nav className="mt-5 grid gap-2">
            <AdminNavLink to="/admin/dashboard">Dashboard</AdminNavLink>
            <AdminNavLink to="/admin/products">Products</AdminNavLink>
            <AdminNavLink to="/admin/orders" onClick={markOrdersAsSeen}>Orders</AdminNavLink>
            <AdminNavLink
              to="/admin/notifications"
              onClick={markOrdersAsSeen}
              badgeCount={unseenNewOrderCount}
            >
              Notifications
            </AdminNavLink>
            <AdminNavLink to="/admin/messages">Messages</AdminNavLink>
          </nav>

          <div className="mt-5 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
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
            <Route path="messages" element={<AdminMessages />} />
            <Route path="*" element={<AdminDashboard />} />
          </Routes>
        </section>
      </div>
    </div>
  )
}
