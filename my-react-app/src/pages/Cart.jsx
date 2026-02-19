import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { supabase } from "../services/supabaseClient"
import { requireCustomerProfile } from "../utils/requireCustomerProfile"


export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart()
  const navigate = useNavigate()


  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderSuccessId, setOrderSuccessId] = useState(null)
  const [orderError, setOrderError] = useState(null)

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0),
    [cart]
  )

const handleQtyChange = (item, newQty) => {
  let qty = Number(newQty)
  if (Number.isNaN(qty) || qty < 1) {
    qty = 1
  }

  if (typeof item.stock === "number" && qty > item.stock) {
    qty = item.stock
    alert(`Maximum available stock for ${item.name} is ${item.stock}.`)
  }

  updateQuantity(item.id, qty)
}

  const handleRemove = (item) => {
    removeFromCart(item.id)
  } 

  const handleClear = () => {
    if (cart.length === 0) return
    if (window.confirm("Remove all items from your cart?")) {
      clearCart()
    }
  }

const handleCheckoutClick = async () => {
  if (cart.length === 0) return

  setOrderSuccessId(null)
  setOrderError(null)

  // ✅ Enforce login + profile BEFORE showing checkout
  const gate = await requireCustomerProfile()

  if (!gate.ok) {
    navigate(gate.redirectTo, { state: { returnTo: "/cart" } })
    return
  }

  // ✅ Autofill from profile + auth email
  setCustomerName(gate.profile?.fullName || gate.profile?.name || "")
  setCustomerPhone(gate.profile?.phone || "")
  setCustomerAddress(gate.profile?.address || "")
  setCustomerEmail(gate.user?.email || "")

  setShowCheckout(true)
}

const handlePlaceOrder = async (e) => {
  e.preventDefault()
  if (cart.length === 0) return

  setPlacingOrder(true)
  setOrderError(null)
  setOrderSuccessId(null)

  try {
    // Enforce login/profile again (security)
    const gate = await requireCustomerProfile()
    if (!gate.ok) {
      navigate(gate.redirectTo, { state: { returnTo: "/cart" } })
      return
    }

    // Auto-fill (optional, just for UI)
    setCustomerName(gate.profile.fullName || "")
    setCustomerPhone(gate.profile.phone || "")
    setCustomerEmail(gate.user.email || "")
    setCustomerAddress(gate.profile.address || "") // keep if you want UI, but don't send to orders table

    // Check local stock
    const outOfStockItems = cart.filter(
      (item) => typeof item.stock === "number" && item.quantity > item.stock
    )
    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map(
        (i) => `${i.name} (stock: ${i.stock}, requested: ${i.quantity})`
      )
      setOrderError(`Not enough stock for: ${names.join(", ")}.`)
      return
    }

    const emailToSave = gate.user?.email || null

    // ✅ define orderPayload (NO address)
    const orderPayload = {
  user_id: gate.user.id,
  customer_name: gate.profile.fullName,
  customer_phone: gate.profile.phone,
  customer_email: emailToSave,
  address: gate.profile.address,   // ✅ add this back
  total_amount: total,
  status: "pending",
}

    // 1) Insert order
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single()

    if (orderErr) {
      console.log("ORDER INSERT ERROR:", orderErr)
      setOrderError(orderErr.message || "Failed to create order.")
      return
    }

    // 2) Insert items
    const itemsPayload = cart.map((item) => ({
      order_id: orderData.id,
      product_id: item.productId ?? item.product_id, // must be the products.id
      product_name: item.name,
      price: item.price || 0,
      quantity: item.quantity || 1,
      color: item.color || null,
      image_path: item.imagePath || null,
    }))

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(itemsPayload)

    if (itemsErr) {
      console.log("ITEMS INSERT ERROR:", itemsErr)
      setOrderError(itemsErr.message || "Order created but items failed.")
      return
    }

    // 3) Decrease stock
const { error: stockErr } = await supabase.rpc(
  "decrease_stock_for_order",
  { order_uuid: orderData.id }
)

if (stockErr) {
  console.error("Stock update error:", stockErr)
} 
    await supabase
  .from("carts")
  .delete({ status: "checked_out" })
  .eq("user_id", gate.user.id)
  .eq("status", "active")

    // 4) Done
    clearCart()
    setShowCheckout(false)

    navigate(`/order-confirmation/${orderData.id}`, {
      state: { order: orderData },
    })
  } catch (err) {
    console.error("Unexpected checkout error:", err)
    setOrderError(err?.message || "Something went wrong.")
  } finally {
    setPlacingOrder(false) // ✅ guarantees it never gets stuck
  }
}


  return (
    <div className="cart-layout">
      <div className="cart-main">
        <h2 className="page-title">Shopping cart</h2>
        <p className="page-subtitle">
          Review your selected SPEEGO e-bikes. You can adjust quantity or remove items before
          checkout.
        </p>

        {orderSuccessId && (
          <div className="cart-alert cart-alert-success">
            <p>
              ✅ Your order was placed successfully!<br />
              <span className="cart-alert-small">
                Order reference: <code>{orderSuccessId}</code>
              </span>
            </p>
          </div>
        )}

        {orderError && (
          <div className="cart-alert cart-alert-error">
            <p>⚠️ {orderError}</p>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is currently empty.</p>
            <Link to="/shop" className="btn btn-primary">
              Browse e-bikes
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-header-row">
              <span>{cart.length} item(s) in your cart</span>
              <button className="btn-ghost" type="button" onClick={handleClear}>
                Clear cart
              </button>
            </div>

            <div className="cart-items">
              {cart.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onQtyChange={handleQtyChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="cart-summary">
        <h3>Order summary</h3>
        <div className="cart-summary-row">
          <span>Items</span>
          <span>
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="cart-summary-row">
          <span>Subtotal</span>
          <span>₱{total.toLocaleString()}</span>
        </div>

        <div className="cart-summary-divider" />

        <div className="cart-summary-row cart-summary-total">
          <span>Total</span>
          <span>₱{total.toLocaleString()}</span>
        </div>

        <p className="cart-summary-note">
          This checkout is for your thesis demo. The order details are saved in the database as
          <strong> orders </strong> and <strong> order_items </strong>.
        </p>

        {!showCheckout && (
          <button
            className="btn btn-primary cart-checkout-btn"
            type="button"
            disabled={cart.length === 0}
            onClick={handleCheckoutClick}
          >
            Proceed to checkout
          </button>
        )}

        {showCheckout && cart.length > 0 && (
          <form className="checkout-form" onSubmit={handlePlaceOrder}>
            <div className="checkout-field">
              <label>Full name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div className="checkout-field">
              <label>Contact number</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09XX-XXX-XXXX"
              />
            </div>

            <div className="checkout-field">
              <label>Email (optional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="checkout-field">
  <label>Address</label>
  <textarea
    rows={3}
    value={customerAddress}
    onChange={(e) => setCustomerAddress(e.target.value)}
    placeholder="Your address"
  />
</div>

            <button
              className="btn btn-primary cart-checkout-btn"
              type="submit"
              disabled={placingOrder}
            >
              {placingOrder ? "Placing order..." : "Place order"}
            </button>

            <button
              className="btn-ghost checkout-cancel-btn"
              type="button"
              onClick={() => setShowCheckout(false)}
            >
              Cancel
            </button>
          </form>
        )}

        <Link to="/shop" className="cart-summary-link">
          ← Continue shopping
        </Link>
      </div>
    </div>
  )
}

function CartItem({ item, onQtyChange, onRemove }) {
  let imageUrl = null

  if (item.imagePath) {
    imageUrl = supabase.storage.from("product-images").getPublicUrl(item.imagePath).data.publicUrl
  }

  const lineTotal = (item.price || 0) * (item.quantity || 0)

  return (
    <div className="cart-item-card">
      <div className="cart-item-left">
        <div className="cart-item-image">
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} />
          ) : (
            <div className="cart-item-image-fallback">
              <span>{item.name?.charAt(0) || "?"}</span>
            </div>
          )}
        </div>

        <div className="cart-item-info">
          <div className="cart-item-name-row">
            <div className="cart-item-name">{item.name}</div>
            <div className="cart-item-price">
              ₱{(item.price || 0).toLocaleString()}
            </div>
          </div>

          <div className="cart-item-meta">
            {item.color && (
              <span className="cart-item-color">
                Color: <strong>{item.color}</strong>
              </span>
            )}
            {typeof item.stock === "number" && (
              <span className="cart-item-stock">
                · Stock remaining: {item.stock}
              </span>
            )}
          </div>

          <div className="cart-item-controls">
            <div className="cart-qty-group">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => onQtyChange(item, e.target.value)}
              />
            </div>

            <button
              className="cart-remove-btn"
              type="button"
              onClick={() => onRemove(item)}
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div className="cart-item-total">
        <span>₱{lineTotal.toLocaleString()}</span>
      </div>
    </div>
  )
}