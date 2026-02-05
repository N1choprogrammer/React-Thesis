import { NavLink, Routes, Route } from "react-router-dom"
import AdminProducts from "./AdminProducts"
import AdminProductForm from "./AdminProductForm"
import AdminOrders from "./AdminOrders"
import AdminMessages from "./AdminMessages"

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-title">Admin Panel</h2>
        <p className="admin-subtitle">
          Manage products, orders, and customer messages.
        </p>

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

          <NavLink
            to="/admin/messages"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            Messages
          </NavLink>
        </nav>
      </aside>

      <section>
        <Routes>
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm mode="create" />} />
          <Route path="products/:id/edit" element={<AdminProductForm mode="edit" />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="*" element={<AdminProducts />} />
        </Routes>
      </section>
    </div>
  )
}
