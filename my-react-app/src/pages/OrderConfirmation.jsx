// src/pages/OrderConfirmation.jsx
import { useEffect, useState } from "react"
import { useParams, useLocation, Link } from "react-router-dom"
import { supabase } from "../services/supabaseClient"

function formatPeso(amount) {
  if (amount == null) return "₱0"
  return "₱" + Number(amount).toLocaleString()
}

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const location = useLocation()

  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!!orderId && !location.state?.order)
  const [error, setError] = useState(null)

  useEffect(() => {
    // If there is no orderId in the URL, we don't fetch anything.
    if (!orderId) {
      setLoading(false)
      return
    }

    // If we already got the order via navigation state, skip fetch.
    if (location.state?.order) {
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single()

      if (error) {
        console.error("Error loading order:", error)
        setError("We couldn't load your order details. You can check it on the My Orders page.")
      } else {
        setOrder(data)
      }

      setLoading(false)
    }

    fetchOrder()
  }, [orderId, location.state])

  return (
    <div className="order-confirm-page">
      <h2 className="page-title">Thank you for your order!</h2>
      <p className="page-subtitle">
        Your order has been received and is currently <strong>pending</strong>.
        We will contact you soon to confirm the details.
      </p>

      {/* If URL has an id, show reference */}
      {orderId && (
        <p className="order-confirm-ref">
          Order reference: <code>{orderId}</code>
        </p>
      )}

      {/* If we have order + items, show a small summary */}
      {loading && (
        <p className="page-subtitle">Loading your order details…</p>
      )}

      {error && (
        <div className="cart-alert cart-alert-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {order && (
        <div className="order-confirm-card">
          <div className="order-confirm-section">
            <h3>Order summary</h3>
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
          </div>

          {order.order_items && order.order_items.length > 0 && (
            <div className="order-confirm-section">
              <h3>Items</h3>
              <ul className="order-confirm-items">
                {order.order_items.map((item) => {
                  const lineTotal =
                    (item.price || 0) * (item.quantity || 0)
                  return (
                    <li key={item.id}>
                      <div>
                        <strong>{item.product_name}</strong>{" "}
                        {item.color && (
                          <span className="order-confirm-color">
                            ({item.color})
                          </span>
                        )}
                      </div>
                      <div className="order-confirm-item-meta">
                        <span>Qty: {item.quantity}</span>
                        <span>{formatPeso(lineTotal)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="order-confirm-total">
                Total: <strong>{formatPeso(order.total_amount)}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      <p className="order-confirm-note">
        You can also review this order anytime on the{" "}
        <Link to="/my-orders">My Orders</Link> page.
      </p>

      <div className="order-confirm-actions">
        <Link to="/shop" className="btn btn-primary">
          Back to shop
        </Link>
      </div>
    </div>
  )
}
