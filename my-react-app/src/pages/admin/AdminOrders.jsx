import { useEffect, useState } from "react"
import { supabase } from "../../services/supabaseClient"

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [savingStatusId, setSavingStatusId] = useState(null)

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          customer_name,
          customer_phone,
          customer_email,
          status,
          total_amount,
          order_items (
            id,
            product_name,
            quantity,
            price,
            color
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading orders:", error)
        setErrorMsg("Failed to load orders. Please check the console.")
      } else {
        setOrders(data || [])
      }
      setLoading(false)
    }

    fetchOrders()
  }, [])

  const handleToggleExpand = (orderId) => {
    setExpandedOrderId((current) => (current === orderId ? null : orderId))
  }

  const handleStatusChange = async (orderId, newStatus) => {
    setSavingStatusId(orderId)
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)

    if (error) {
      console.error("Error updating order status:", error)
      alert("Failed to update order status.")
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    }
    setSavingStatusId(null)
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return ""
    const d = new Date(isoString)
    return d.toLocaleString()
  }

  return (
    <div className="admin-orders">
      <div className="admin-header-row">
        <div>
          <h2 className="page-title">Orders</h2>
          <p className="page-subtitle">
            View customer orders placed from the SPEEGO shop and update their status.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="admin-alert admin-alert-error">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="page-subtitle">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="page-subtitle">No orders have been placed yet.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Total</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id
                const items = order.order_items || []
                return (
                  <FragmentRow
                    key={order.id}
                    order={order}
                    items={items}
                    isExpanded={isExpanded}
                    onToggleExpand={handleToggleExpand}
                    onStatusChange={handleStatusChange}
                    savingStatusId={savingStatusId}
                    formatDateTime={formatDateTime}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FragmentRow({
  order,
  items,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  savingStatusId,
  formatDateTime,
}) {
  const isSaving = savingStatusId === order.id

  const handleStatusChange = (e) => {
    const newStatus = e.target.value
    onStatusChange(order.id, newStatus)
  }

  const itemSummary =
    items.length === 0
      ? "No items"
      : items
          .map((it) => `${it.product_name} x${it.quantity}`)
          .slice(0, 3)
          .join(", ") + (items.length > 3 ? "…" : "")

  return (
    <>
      <tr>
        <td>{formatDateTime(order.created_at)}</td>
        <td>{order.customer_name}</td>
        <td>
          <div>{order.customer_phone}</div>
          {order.customer_email && (
            <div className="admin-text-muted">{order.customer_email}</div>
          )}
        </td>
        <td>
          <span className={`status-pill status-${order.status}`}>
            {order.status}
          </span>
        </td>
        <td>₱{Number(order.total_amount || 0).toLocaleString()}</td>
        <td className="admin-text-muted">{itemSummary}</td>
        <td>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-action-link"
              onClick={() => onToggleExpand(order.id)}
            >
              {isExpanded ? "Hide details" : "View details"}
            </button>
            <select
              className="admin-status-select"
              value={order.status}
              onChange={handleStatusChange}
              disabled={isSaving}
            >
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="admin-order-details-row">
          <td colSpan={7}>
            {items.length === 0 ? (
              <p className="page-subtitle">No items recorded for this order.</p>
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
                      const lineTotal = (it.price || 0) * (it.quantity || 0)
                      return (
                        <tr key={it.id}>
                          <td>{it.product_name}</td>
                          <td>{it.color || "—"}</td>
                          <td>{it.quantity}</td>
                          <td>₱{Number(it.price || 0).toLocaleString()}</td>
                          <td>₱{lineTotal.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
