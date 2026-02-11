import { useEffect, useState, Fragment } from "react"
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

      // 1️⃣ Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (ordersError) {
        console.error("Error loading orders:", ordersError)
        setErrorMsg("Failed to load orders.")
        setLoading(false)
        return
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      // 2️⃣ Fetch all order_items for those orders
      const orderIds = ordersData.map((o) => o.id)

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)

      if (itemsError) {
        console.error("Error loading order items:", itemsError)
        setErrorMsg("Failed to load order items.")
        // even if items fail, still show orders
        setOrders(ordersData.map((o) => ({ ...o, order_items: [] })))
        setLoading(false)
        return
      }

      // 3️⃣ Merge items into orders
      const ordersWithItems = ordersData.map((order) => ({
        ...order,
        order_items: itemsData.filter((it) => it.order_id === order.id),
      }))

      setOrders(ordersWithItems)
      setLoading(false)
    }

    fetchOrders()
  }, [])

  const handleToggleExpand = (orderId) => {
    setExpandedOrderId((current) => (current === orderId ? null : orderId))
  }

const handleStatusChange = async (orderId, newStatus) => {
  setSavingStatusId(orderId)

  // Find current order so we know the previous status
  const currentOrder = orders.find((o) => o.id === orderId)
  const previousStatus = currentOrder?.status

  // 1) Update the order status
  const { error: statusError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)

  if (statusError) {
    console.error("Error updating order status:", statusError)
    alert("Failed to update order status.")
    setSavingStatusId(null)
    return
  }

  // 2) If we changed TO "cancelled" (from something else), restore stock
  if (previousStatus !== "cancelled" && newStatus === "cancelled") {
    const { error: stockError } = await supabase.rpc("increase_stock_for_order", {
      order_uuid: orderId,
    })

    if (stockError) {
      console.error("Error restoring stock for cancelled order:", stockError)
      alert("Order cancelled, but failed to restore stock. Check logs.")
    }
  }

  // 3) Update local state so UI reflects the change
  setOrders((prev) =>
    prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
  )

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

                const itemSummary =
                  items.length === 0
                    ? "No items"
                    : items
                        .map((it) => `${it.product_name} x${it.quantity}`)
                        .slice(0, 3)
                        .join(", ") + (items.length > 3 ? "…" : "")

                const isSaving = savingStatusId === order.id

                return (
                  <Fragment key={order.id}>
                    <tr>
                      <td>{formatDateTime(order.created_at)}</td>
                      <td>{order.customer_name}</td>
                      <td>
                        <div>{order.customer_phone}</div>
                        {order.customer_email && (
                          <div className="admin-text-muted">
                            {order.customer_email}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill status-${order.status || "pending"}`}>
                          {(order.status || "pending").replace(/_/g, " ")}
                        </span>

                        </td>

                      <td>₱{Number(order.total_amount || 0).toLocaleString()}</td>
                      <td className="admin-text-muted">{itemSummary}</td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-action-link"
                            onClick={() => handleToggleExpand(order.id)}
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                          <select
  className="admin-status-select"
  value={order.status || "pending"}
  onChange={(e) =>
    handleStatusChange(order.id, e.target.value)
  }
  disabled={isSaving}
>
  <option value="pending">pending</option>
  <option value="confirmed">confirmed</option>
  <option value="processing">processing</option>
  <option value="ready_for_pickup">ready_for_pickup</option>
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
                                          ₱{Number(it.price || 0).toLocaleString()}
                                        </td>
                                        <td>
                                          ₱{lineTotal.toLocaleString()}
                                        </td>
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
