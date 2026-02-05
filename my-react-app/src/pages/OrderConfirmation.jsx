import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../services/supabaseClient"

export default function OrderConfirmation() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true)
      setError(null)

      // 1) Load the order itself
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single()

      if (orderError) {
        console.error("Error loading order:", orderError)
        setError("We couldn't find this order. Please contact the shop.")
        setLoading(false)
        return
      }

      // 2) Load the order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)

      if (itemsError) {
        console.error("Error loading order items:", itemsError)
        setError("Order found, but failed to load items.")
        setLoading(false)
        return
      }

      setOrder(orderData)
      setItems(itemsData || [])
      setLoading(false)
    }

    fetchOrder()
  }, [id])

  const formatDateTime = (iso) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleString()
  }

  const total = order ? Number(order.total_amount || 0) : 0

  return (
    <div className="order-confirmation">
      {loading ? (
        <p className="page-subtitle">Loading your order details...</p>
      ) : error ? (
        <div className="cart-alert cart-alert-error">
          <p>⚠️ {error}</p>
          <Link to="/shop" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>
            Back to shop
          </Link>
        </div>
      ) : (
        <>
          <div className="order-confirmation-header">
            <div className="order-confirmation-icon">✅</div>
            <div>
              <h2 className="page-title">Thank you for your order!</h2>
              <p className="page-subtitle">
                Your SPEEGO e-bike order has been received. Our team will contact you to confirm
                the details.
              </p>
            </div>
          </div>

          <div className="order-confirmation-grid">
            {/* Order summary card */}
            <section className="order-card">
              <h3 className="order-card-title">Order summary</h3>
              <div className="order-summary-row">
                <span>Order reference</span>
                <code className="order-ref">{order.id}</code>
              </div>
              <div className="order-summary-row">
                <span>Date &amp; time</span>
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              <div className="order-summary-row">
                <span>Status</span>
                <span className={`status-pill status-${order.status || "pending"}`}>
                  {order.status || "pending"}
                </span>
              </div>
              <div className="order-summary-row order-summary-total">
                <span>Order total</span>
                <span>₱{total.toLocaleString()}</span>
              </div>
            </section>

            {/* Customer details card */}
            <section className="order-card">
              <h3 className="order-card-title">Customer details</h3>
              <div className="order-summary-row">
                <span>Name</span>
                <span>{order.customer_name}</span>
              </div>
              <div className="order-summary-row">
                <span>Contact number</span>
                <span>{order.customer_phone}</span>
              </div>
              {order.customer_email && (
                <div className="order-summary-row">
                  <span>Email</span>
                  <span>{order.customer_email}</span>
                </div>
              )}
            </section>
          </div>

          {/* Items table */}
          <section className="order-card order-items-card">
            <h3 className="order-card-title">Items in this order</h3>
            {items.length === 0 ? (
              <p className="page-subtitle">No items recorded for this order.</p>
            ) : (
              <div className="admin-table-wrapper">
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
          </section>

          <div className="order-confirmation-actions">
            <Link to="/shop" className="btn btn-primary">
              Continue shopping
            </Link>
            <Link to="/about" className="btn btn-outline">
              Learn more about SPEEGO
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
