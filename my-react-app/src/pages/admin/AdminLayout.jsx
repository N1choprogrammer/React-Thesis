import { NavLink, Outlet } from "react-router-dom"

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-title">Admin Panel</h2>
        <p className="admin-subtitle">Manage products and orders</p>

        <nav className="admin-nav">
          <NavLink
            to="/admin/products"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            Products
          </NavLink>

          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            Orders
          </NavLink>
        </nav>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  )
}
