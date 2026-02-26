import { NavLink, Route, Routes, useNavigate } from "react-router-dom"
import AdminDashboard from "./AdminDashboard"
import AdminMessages from "./AdminMessages"
import AdminOrders from "./AdminOrders"
import AdminProductForm from "./AdminProductForm"
import AdminProducts from "./AdminProducts"
import { supabase } from "../../services/supabaseClient"

function AdminNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-xl px-4 py-3 text-sm font-semibold transition",
          isActive
            ? "border border-red-400/30 bg-red-500/10 text-red-200"
            : "border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()

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
            <AdminNavLink to="/admin/orders">Orders</AdminNavLink>
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
          <Routes>
            <Route path="products" element={<AdminProducts />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products/new" element={<AdminProductForm mode="create" />} />
            <Route path="products/:id/edit" element={<AdminProductForm mode="edit" />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="*" element={<AdminProducts />} />
          </Routes>
        </section>
      </div>
    </div>
  )
}
