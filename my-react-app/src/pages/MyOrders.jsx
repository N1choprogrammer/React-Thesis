// src/pages/MyOrders.jsx
import { useEffect, useState, Fragment } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabaseClient"

function formatDateTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString()
}

function formatPeso(amount) {
  if (amount == null) return "₱0"
  return "₱" + Number(amount).toLocaleString()
}

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Get current user
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
        // Not logged in
        setErrorMsg("You need to log in to view your orders.")
        setLoading(false)
        return
      }

      // 2) Get orders for this user's email
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

      // 3) Load order items for those orders
      const orderIds = ordersData.map((o) => o.id)

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)

      if (itemsError) {
        console.error("Error loading order items:", itemsError)
        // Show orders even if items fail
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
    <div className="my-orders-page">
      <h2 className="page-title">My orders</h2>
      <p className="page-subtitle">
        View the orders you’ve placed on SPEEGO and track their status.
      </p>

      {errorMsg && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: "0.75rem" }}>
          {errorMsg}
          {errorMsg.includes("log in") && (
            <div style={{ marginTop: "0.4rem" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/login")}
              >
                Go to login
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="page-subtitle">Loading your orders…</p>
      ) : !errorMsg && orders.length === 0 ? (
        <p className="page-subtitle">
          You don’t have any orders yet. Visit the shop page to place your first order.
        </p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Status</th>
                <th>Total</th>
                <th>Items</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id
                const items = order.order_items || []

                const itemsSummary =
                  items.length === 0
                    ? "No items"
                    : items
                        .map((it) => `${it.product_name} x${it.quantity}`)
                        .slice(0, 3)
                        .join(", ") + (items.length > 3 ? "…" : "")

                const status = order.status || "pending"

                return (
                  <Fragment key={order.id}>
                    <tr>
                      <td>{formatDateTime(order.created_at)}</td>
                      <td className="admin-text-muted">{order.id}</td>
                      <td>
                        <span className={`status-pill status-${status}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td>{formatPeso(order.total_amount)}</td>
                      <td className="admin-text-muted">{itemsSummary}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-action-link"
                          onClick={() => handleToggleExpand(order.id)}
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="admin-order-details-row">
                        <td colSpan={6}>
                          <div className="my-orders-details">
                            <div className="my-orders-details-left">
                              <h4>Order details</h4>
                              <p>
                                <strong>Name:</strong> {order.customer_name}
                              </p>
                              {order.customer_phone && (
                                <p>
                                  <strong>Phone:</strong> {order.customer_phone}
                                </p>
                              )}
                              {order.customer_email && (
                                <p>
                                  <strong>Email:</strong> {order.customer_email}
                                </p>
                              )}
                              {order.address && (
                                <p>
                                  <strong>Address:</strong> {order.address}
                                </p>
                              )}
                              {order.notes && (
                                <p>
                                  <strong>Notes:</strong> {order.notes}
                                </p>
                              )}
                            </div>

                            <div className="my-orders-details-right">
                              <h4>Items</h4>
                              {items.length === 0 ? (
                                <p className="page-subtitle">
                                  No items recorded for this order.
                                </p>
                              ) : (
                                <div className="order-items-table-wrapper">
                                  <table className="admin-table order-items-table">
                                    <thead>
                                      <tr>
                                        <th>Product</th>
                                        <th>Color</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Line total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((it) => {
                                        const lineTotal =
                                          (it.price || 0) * (it.quantity || 0)
                                        return (
                                          <tr key={it.id}>
                                            <td>{it.product_name}</td>
                                            <td>{it.color || "—"}</td>
                                            <td>{it.quantity}</td>
                                            <td>
                                              {formatPeso(it.price || 0)}
                                            </td>
                                            <td>
                                              {formatPeso(lineTotal)}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
