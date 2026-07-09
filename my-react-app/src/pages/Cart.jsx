import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { supabase } from "../services/supabaseClient"
import { requireCustomerProfile } from "../utils/requireCustomerProfile"
import { useTheme } from "../context/ThemeContext"

const GCASH_ACCOUNT_NAME =
  import.meta.env.VITE_GCASH_ACCOUNT_NAME || "SPEEGO E-BIKES"
const GCASH_ACCOUNT_NUMBER =
  import.meta.env.VITE_GCASH_ACCOUNT_NUMBER || "09XX XXX XXXX"
const BANK_ACCOUNT_NAME =
  import.meta.env.VITE_BANK_ACCOUNT_NAME || "SPEEGO E-BIKES"
const BANK_ACCOUNT_NUMBER =
  import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "0000-0000-0000"
const BANK_NAME = import.meta.env.VITE_BANK_NAME || "BDO"
const EXTRA_MONTH_INTEREST_RATE = 0.0125
const MAX_PAYMENT_PROOF_BYTES = 10 * 1024 * 1024
const PAYMENT_PLAN_OPTIONS = [
  { value: "6_months", label: "6 months", months: 6, note: "Promo: no interest" },
  { value: "9_months", label: "9 months", months: 9, note: "Interest added for 3 extra months" },
  { value: "12_months", label: "1 year", months: 12, note: "Interest added for 6 extra months" },
]

function peso(value) {
  return `PHP ${Number(value || 0).toLocaleString()}`
}

function isValidPaymentProofFile(file) {
  if (!file) return true
  return file.type === "application/pdf" || file.type.startsWith("image/")
}

function Field({ label, children, isDark }) {
  return (
    <label className="block">
      <span
        className={[
          "mb-2 block text-xs font-semibold uppercase tracking-[0.16em]",
          isDark ? "text-zinc-400" : "text-zinc-500",
        ].join(" ")}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

export default function Cart() {
  const { isDark } = useTheme()
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart()
  const navigate = useNavigate()

  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("gcash")
  const [paymentPlan, setPaymentPlan] = useState("6_months")
  const [downPayment, setDownPayment] = useState("")
  const [proofFile, setProofFile] = useState(null)
  const [proofPreviewName, setProofPreviewName] = useState("")
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderSuccessId, setOrderSuccessId] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [cartNotice, setCartNotice] = useState(null)
  const showCartError = (message) => {
    setOrderError(message)
    setTimeout(() => {
      setOrderError((current) => (current === message ? null : current))
    }, 3200)
  }
  const showCartNotice = (message) => {
    setCartNotice(message)
    setTimeout(() => {
      setCartNotice((current) => (current === message ? null : current))
    }, 3200)
  }

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0),
    [cart]
  )
  const parsedDownPayment = Number(String(downPayment || "").replace(/,/g, ""))
  const validDownPayment = Number.isFinite(parsedDownPayment) && parsedDownPayment > 0
  const minimumDownPayment = Math.ceil(total * 0.2)
  const paymentPlanDetails = useMemo(() => {
    const selectedPlan = PAYMENT_PLAN_OPTIONS.find((plan) => plan.value === paymentPlan) || PAYMENT_PLAN_OPTIONS[0]
    const extraMonths = Math.max(0, selectedPlan.months - 6)
    const interestRate = extraMonths > 0 ? extraMonths * EXTRA_MONTH_INTEREST_RATE : 0
    const effectiveDownPayment = validDownPayment ? parsedDownPayment : 0
    const remainingBalance = Math.max(0, total - effectiveDownPayment)
    const addedInterest = remainingBalance * interestRate
    const totalWithInterest = remainingBalance + addedInterest
    const monthlyPayment = remainingBalance > 0 ? totalWithInterest / selectedPlan.months : 0

    return {
      ...selectedPlan,
      interestRate,
      effectiveDownPayment,
      remainingBalance,
      addedInterest,
      totalWithInterest,
      monthlyPayment,
    }
  }, [paymentPlan, parsedDownPayment, total, validDownPayment])

  const handlePaymentMethodChange = (nextMethod) => {
    setPaymentMethod(nextMethod)
    if (nextMethod !== "gcash") {
      setDownPayment("")
      setProofFile(null)
      setProofPreviewName("")
    }
  }

  const handleQtyChange = (item, newQty) => {
    let qty = Number(newQty)
    if (Number.isNaN(qty) || qty < 1) qty = 1

    if (typeof item.stock === "number" && qty > item.stock) {
      qty = item.stock
      showCartError(`No more stock for ${item.name}${item.color ? ` (${item.color})` : ""}. Available: ${item.stock}.`)
    }

    updateQuantity(item.id, qty)
  }

  const handleRemove = (item) => {
    removeFromCart(item.id)
  }

  const handleClear = () => {
    if (cart.length === 0) return
    clearCart()
    showCartNotice("Cart has been cleared.")
  }

  const handlePaymentPlanChange = (nextPlan) => {
    if (nextPlan === paymentPlan) return
    setPaymentPlan(nextPlan)
  }

  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0] || null

    if (!file) {
      setProofFile(null)
      setProofPreviewName("")
      return
    }

    if (!isValidPaymentProofFile(file)) {
      e.target.value = ""
      setProofFile(null)
      setProofPreviewName("")
      setOrderError("Please upload an image or PDF proof of payment.")
      return
    }

    if (file.size > MAX_PAYMENT_PROOF_BYTES) {
      e.target.value = ""
      setProofFile(null)
      setProofPreviewName("")
      setOrderError("Proof of payment must be 10 MB or smaller.")
      return
    }

    setOrderError(null)
    setProofFile(file)
    setProofPreviewName(file.name || "Selected proof")
  }

  const handleCheckoutClick = async () => {
    if (cart.length === 0) return

    setOrderSuccessId(null)
    setOrderError(null)

    const gate = await requireCustomerProfile()
    if (!gate.ok) {
      navigate(gate.redirectTo, { state: { returnTo: "/cart" } })
      return
    }

    setCustomerName(gate.profile?.fullName || gate.profile?.name || "")
    setCustomerPhone(gate.profile?.phone || "")
    setCustomerAddress(gate.profile?.address || "")
    setCustomerEmail(gate.user?.email || "")
    setPaymentMethod("gcash")
    setDownPayment("")
    setProofFile(null)
    setProofPreviewName("")
    setShowCheckout(true)
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (cart.length === 0) return

    setPlacingOrder(true)
    setOrderError(null)
    setOrderSuccessId(null)

    try {
      const gate = await requireCustomerProfile()
      if (!gate.ok) {
        navigate(gate.redirectTo, { state: { returnTo: "/cart" } })
        return
      }

      setCustomerName(gate.profile.fullName || "")
      setCustomerPhone(gate.profile.phone || "")
      setCustomerEmail(gate.user.email || "")
      setCustomerAddress(gate.profile.address || "")

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
      const normalizedPaymentMethod = paymentMethod === "bank_transfer" ? "bank_transfer" : "gcash"
      const requiresPaymentProof = normalizedPaymentMethod === "gcash" || normalizedPaymentMethod === "bank_transfer"

      if (requiresPaymentProof && !proofFile) {
        setOrderError("Please upload a proof of payment before placing your order.")
        return
      }

      if (requiresPaymentProof) {
        if (!validDownPayment) {
          setOrderError(
            normalizedPaymentMethod === "bank_transfer"
              ? "Please enter a valid bank transfer down payment amount."
              : "Please enter a valid GCash down payment amount."
          )
          return
        }
        if (parsedDownPayment < minimumDownPayment) {
          setOrderError(
            `${normalizedPaymentMethod === "bank_transfer" ? "Bank transfer" : "GCash"} down payment must be at least 20% of the order total (${peso(minimumDownPayment)}).`
          )
          return
        }
        if (parsedDownPayment > total) {
          setOrderError("Down payment cannot be higher than the total amount.")
          return
        }
      }

      let paymentProofPath = null
      if (requiresPaymentProof && proofFile) {
        if (!isValidPaymentProofFile(proofFile)) {
          setOrderError("Please upload an image or PDF proof of payment.")
          return
        }

        if (proofFile.size > MAX_PAYMENT_PROOF_BYTES) {
          setOrderError("Proof of payment must be 10 MB or smaller.")
          return
        }

        const safeName = `${Date.now()}-${String(proofFile.name || "proof").replace(/[^a-zA-Z0-9._-]/g, "_")}`
        const proofPath = `${gate.user.id}/${safeName}`
        const upload = await supabase.storage.from("payment-proofs").upload(proofPath, proofFile, {
          contentType: proofFile.type || "application/octet-stream",
          upsert: false,
        })
        if (upload.error) {
          setOrderError(
            upload.error.message ||
              "Failed to upload proof of payment. Please try again or contact support."
          )
          return
        }
        paymentProofPath = proofPath
      }

      const paymentPlanNote = paymentPlanDetails
        ? `Payment plan: ${paymentPlanDetails.label} (${paymentPlanDetails.months} months). Monthly installment: ${peso(paymentPlanDetails.monthlyPayment)}. Added interest: ${peso(paymentPlanDetails.addedInterest)}.`
        : "Payment plan: full payment."

      const orderPayload = {
        user_id: gate.user.id,
        customer_name: gate.profile.fullName,
        customer_phone: gate.profile.phone,
        customer_email: emailToSave,
        address: gate.profile.address,
        total_amount: total,
        status: "pending",
        payment_method: normalizedPaymentMethod,
        down_payment_amount: parsedDownPayment,
        payment_proof_path: paymentProofPath,
        payment_notes:
          normalizedPaymentMethod === "bank_transfer"
            ? `${paymentPlanNote} Customer selected bank transfer. Minimum required down payment: ${peso(minimumDownPayment)}. Manager will verify the proof of payment.`
            : `${paymentPlanNote} Customer selected GCash down payment. Minimum required: ${peso(minimumDownPayment)}.`,
      }

      let { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single()

      if (orderErr) {
        const msg = String(orderErr.message || "").toLowerCase()
        const columnIssues = ["payment_method", "down_payment_amount", "payment_proof_path", "payment_notes"]
        const hasMissingPaymentColumn = columnIssues.some((col) => msg.includes(col))

        if (hasMissingPaymentColumn) {
          const legacyPayload = {
            user_id: gate.user.id,
            customer_name: gate.profile.fullName,
            customer_phone: gate.profile.phone,
            customer_email: emailToSave,
            address: gate.profile.address,
            total_amount: total,
            status: "pending",
            notes:
              normalizedPaymentMethod === "gcash"
                ? `Payment method: GCash (down payment ${peso(parsedDownPayment)}). Proof uploaded: ${paymentProofPath || "yes"}`
                : "Payment method: Bank Transfer. Manager will contact customer.",
          }

          let fallback = await supabase.from("orders").insert(legacyPayload).select().single()
          orderData = fallback.data
          orderErr = fallback.error

          if (orderErr && String(orderErr.message || "").toLowerCase().includes("notes")) {
            const plainPayload = {
              user_id: gate.user.id,
              customer_name: gate.profile.fullName,
              customer_phone: gate.profile.phone,
              customer_email: emailToSave,
              address: gate.profile.address,
              total_amount: total,
              status: "pending",
            }

            fallback = await supabase.from("orders").insert(plainPayload).select().single()
            orderData = fallback.data
            orderErr = fallback.error
          }
        }
      }

      if (orderErr) {
        console.log("ORDER INSERT ERROR:", orderErr)
        setOrderError(orderErr.message || "Failed to create order.")
        return
      }

      const itemsPayload = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.productId ?? item.product_id,
        variant_id: item.variantId ?? null,
        product_name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
        color: item.color || null,
        image_path: item.imagePath || null,
      }))

      let { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload)

      if (itemsErr && String(itemsErr.message || "").toLowerCase().includes("variant_id")) {
        const legacyItemsPayload = itemsPayload.map((item) => {
          const legacyItem = { ...item }
          delete legacyItem.variant_id
          return legacyItem
        })
        const fallbackInsert = await supabase.from("order_items").insert(legacyItemsPayload)
        itemsErr = fallbackInsert.error
      }

      if (itemsErr) {
        console.log("ITEMS INSERT ERROR:", itemsErr)
        setOrderError(itemsErr.message || "Order created but items failed.")
        return
      }

      const { error: stockErr } = await supabase.rpc("decrease_stock_for_order", {
        order_uuid: orderData.id,
      })

      if (stockErr) {
        console.error("Stock update error:", stockErr)
      }

      // Notify admin emails about a newly created order (best-effort).
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()
      const accessToken = currentSession?.access_token
      if (accessToken) {
        const { error: adminNotifyErr } = await supabase.functions.invoke("notify-admin-new-order", {
          body: { order_id: orderData.id },
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (adminNotifyErr) {
          console.error("Admin new-order notification error:", adminNotifyErr)
        }
      }

      await supabase
        .from("carts")
        .delete({ status: "checked_out" })
        .eq("user_id", gate.user.id)
        .eq("status", "active")

      clearCart()
      setShowCheckout(false)
      setProofFile(null)
      setProofPreviewName("")
      setDownPayment("")

      navigate(`/order-confirmation/${orderData.id}`, {
        state: { order: orderData },
      })
    } catch (err) {
      console.error("Unexpected checkout error:", err)
      setOrderError(err?.message || "Something went wrong.")
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-10 top-10 h-36 w-36 rounded-full bg-red-600/10 blur-3xl" />
        <div className={["absolute right-12 top-24 h-48 w-48 rounded-full blur-3xl", isDark ? "bg-white/5" : "bg-black/5"].join(" ")} />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-6 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[1.18fr_0.82fr] lg:px-8">
        <div className="space-y-5">
          <section className={[
            "rounded-3xl p-6 sm:p-8",
            isDark
              ? "border border-white/10 bg-gradient-to-br from-zinc-950 to-black shadow-[0_25px_60px_rgba(0,0,0,0.32)]"
              : "border border-black/10 bg-gradient-to-br from-white to-zinc-100 shadow-[0_16px_45px_rgba(17,24,39,0.08)]",
          ].join(" ")}>
            <div className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600"].join(" ")}>
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Cart
            </div>
            <h2 className={["mt-4 text-3xl font-black tracking-tight sm:text-4xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
              Shopping cart
            </h2>
            <p className={["mt-3 text-sm leading-7 sm:text-base", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
              Review your selected SPEEGO e-bikes. You can adjust quantity or remove items before
              checkout.
            </p>
          </section>

          {orderSuccessId && (
            <div className={["rounded-2xl border p-4 text-sm", isDark ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-emerald-300 bg-emerald-50 text-emerald-800"].join(" ")}>
              <p className="font-semibold">Order placed successfully.</p>
              <p className={["mt-1", isDark ? "text-emerald-200/90" : "text-emerald-700"].join(" ")}>
                Order reference: {" "}
                <code className={["rounded px-1.5 py-0.5", isDark ? "bg-black/30 text-emerald-100" : "bg-white text-emerald-700 border border-emerald-300/30"].join(" ")}>{orderSuccessId}</code>
              </p>
            </div>
          )}

          {orderError && (
            <div className={["rounded-2xl border p-4 text-sm", isDark ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-red-300 bg-red-50 text-red-700"].join(" ")}>
              {orderError}
            </div>
          )}

          {cartNotice && (
            <div className={["rounded-2xl border p-4 text-sm", isDark ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-emerald-300 bg-emerald-50 text-emerald-800"].join(" ")}>
              {cartNotice}
            </div>
          )}

          {cart.length === 0 ? (
            <div className={["rounded-2xl p-8 text-center", isDark ? "border border-white/10 bg-zinc-950/70" : "border border-black/10 bg-white/90"].join(" ")}>
              <p className={["text-sm", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>Your cart is currently empty.</p>
              <Link
                to="/shop"
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Browse e-bikes
              </Link>
            </div>
          ) : (
            <section className={["rounded-2xl p-4 sm:p-5", isDark ? "border border-white/10 bg-zinc-950/75" : "border border-black/10 bg-white/90"].join(" ")}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className={["text-sm font-semibold", isDark ? "text-zinc-200" : "text-zinc-800"].join(" ")}>
                  {cart.length} item{cart.length === 1 ? "" : "s"} in your cart
                </div>
                <button
                  className={[
                    "rounded-lg px-3 py-2 text-sm font-semibold transition",
                    isDark
                      ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
                  ].join(" ")}
                  type="button"
                  onClick={handleClear}
                >
                  Clear cart
                </button>
              </div>

              <div className="space-y-4">
                {cart.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onQtyChange={handleQtyChange}
                    onRemove={handleRemove}
                    isDark={isDark}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-32">
          <section className={[
            "rounded-2xl p-5 sm:p-6",
            isDark
              ? "border border-white/10 bg-gradient-to-b from-zinc-950 to-black shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
              : "border border-black/10 bg-gradient-to-b from-white to-zinc-100 shadow-[0_14px_36px_rgba(17,24,39,0.08)]",
          ].join(" ")}>
            <h3 className={["text-lg font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Order summary</h3>

            <div className="mt-4 space-y-3 text-sm">
              <div className={["flex items-center justify-between", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                <span>Items</span>
                <span>
                  {cart.length} {cart.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className={["flex items-center justify-between", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                <span>Subtotal</span>
                <span>{peso(total)}</span>
              </div>
              <div className={["pt-3", isDark ? "border-t border-white/10" : "border-t border-black/10"].join(" ")}>
                <div className={["flex items-center justify-between text-base font-bold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                  <span>Total</span>
                  <span>{peso(total)}</span>
                </div>
              </div>
            </div>
            {!showCheckout && (
              <button
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-zinc-500"
                type="button"
                disabled={cart.length === 0}
                onClick={handleCheckoutClick}
              >
                Proceed to checkout
              </button>
            )}

            {showCheckout && cart.length > 0 && (
              <form className="mt-5 space-y-4" onSubmit={handlePlaceOrder}>
                <Field label="Full name" isDark={isDark}>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className={[
                      "h-11 w-full rounded-xl px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-red-400/50",
                      isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
                    ].join(" ")}
                  />
                </Field>

                <Field label="Contact number" isDark={isDark}>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="09XX-XXX-XXXX"
                    className={[
                      "h-11 w-full rounded-xl px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-red-400/50",
                      isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
                    ].join(" ")}
                  />
                </Field>

                <Field label="Email (optional)" isDark={isDark}>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={[
                      "h-11 w-full rounded-xl px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-red-400/50",
                      isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
                    ].join(" ")}
                  />
                </Field>

                <Field label="Address" isDark={isDark}>
                  <textarea
                    rows={3}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Your address"
                    className={[
                      "w-full rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-zinc-500 focus:border-red-400/50",
                      isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
                    ].join(" ")}
                  />
                </Field>

                <Field label="Payment method" isDark={isDark}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className={[
                      "flex cursor-pointer items-start gap-3 rounded-xl p-3 text-sm",
                      isDark ? "border border-white/10 bg-white/5 text-zinc-200" : "border border-black/10 bg-white text-zinc-800",
                    ].join(" ")}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="gcash"
                        checked={paymentMethod === "gcash"}
                        onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        className="mt-0.5 accent-red-500"
                      />
                      <span>
                        <span className={["block font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>GCash (Down payment)</span>
                        <span className={["mt-1 block text-xs leading-5", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                          Customer can send a down payment now and upload proof of payment.
                        </span>
                      </span>
                    </label>

                    <label className={[
                      "flex cursor-pointer items-start gap-3 rounded-xl p-3 text-sm",
                      isDark ? "border border-white/10 bg-white/5 text-zinc-200" : "border border-black/10 bg-white text-zinc-800",
                    ].join(" ")}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="bank_transfer"
                        checked={paymentMethod === "bank_transfer"}
                        onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        className="mt-0.5 accent-red-500"
                      />
                      <span>
                        <span className={["block font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>Bank Transfer</span>
                        <span className={["mt-1 block text-xs leading-5", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                          Manager will contact the customer to provide bank transfer details.
                        </span>
                      </span>
                    </label>
                  </div>
                </Field>

                <Field label="Payment plan" isDark={isDark}>
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      {PAYMENT_PLAN_OPTIONS.map((plan) => {
                        const isSelected = paymentPlan === plan.value
                        return (
                          <label
                            key={plan.value}
                            className={[
                              "flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 text-sm transition",
                              isDark
                                ? "border-white/10 bg-white/5 text-zinc-200"
                                : "border-black/10 bg-white text-zinc-800",
                              isSelected && (isDark ? "border-red-400/40 bg-red-500/10" : "border-red-200 bg-red-50"),
                            ].join(" ")}
                          >
                            <span className="flex-1">
                              <span className={"block font-semibold"}>{plan.label}</span>
                              <span className={"mt-1 block text-xs leading-5"}>{plan.note}</span>
                            </span>
                            <input
                              type="radio"
                              name="payment_plan"
                              value={plan.value}
                              checked={isSelected}
                              onChange={(e) => handlePaymentPlanChange(e.target.value)}
                              className="mt-1 accent-red-500"
                            />
                          </label>
                        )
                      })}
                    </div>

                    
                  </div>
                </Field>
                  <div
                      aria-label="Selected payment plan summary"
                        onClick={(e) => e.stopPropagation()}
                      className={[
                        "pointer-events-none cursor-default select-text rounded-xl border p-3 text-sm",
                        isDark
                        ? "border-white/10 bg-zinc-900/80 text-zinc-200"
                        : "border-black/10 bg-zinc-50 text-zinc-700",
                        ].join(" ")}
                        > 
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">Selected plan</span>
                        <span className={"font-semibold text-red-600"}>{paymentPlanDetails.label}</span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-4">
                        <div>
                          <p className={"text-[11px] uppercase tracking-[0.16em] text-zinc-500"}>Remaining balance</p>
                          <p className={"mt-1 font-semibold"}>{peso(paymentPlanDetails.remainingBalance)}</p>
                        </div>
                        <div>
                          <p className={"text-[11px] uppercase tracking-[0.16em] text-zinc-500"}>Monthly payment</p>
                          <p className={"mt-1 font-semibold"}>{peso(paymentPlanDetails.monthlyPayment)}</p>
                        </div>
                        <div>
                          <p className={"text-[11px] uppercase tracking-[0.16em] text-zinc-500"}>Added interest</p>
                          <p className={"mt-1 font-semibold"}>{peso(paymentPlanDetails.addedInterest)}</p>
                        </div>
                        <div>
                          <p className={"text-[11px] uppercase tracking-[0.16em] text-zinc-500"}>Total with interest</p>
                          <p className={"mt-1 font-semibold"}>{peso(paymentPlanDetails.totalWithInterest)}</p>
                        </div>
                      </div>
                      <p className={"mt-2 text-xs leading-5"}>
                        {paymentPlanDetails.addedInterest > 0
                          ? `${paymentPlanDetails.label} adds ${peso(paymentPlanDetails.addedInterest)} across ${paymentPlanDetails.months} monthly payments after your down payment.`
                          : `${paymentPlanDetails.label} is interest-free for this promotion after your down payment.`}
                      </p>
                    </div>
                    
                {(paymentMethod === "gcash" || paymentMethod === "bank_transfer") && (
                  <>
                    <Field label={paymentMethod === "gcash" ? "GCash payment details" : "Bank transfer payment details"} isDark={isDark}>
                      <div
                        className={[
                          "rounded-xl px-4 py-3 text-sm",
                          isDark
                            ? "border border-white/10 bg-zinc-900 text-zinc-200"
                            : "border border-black/10 bg-white text-zinc-800",
                        ].join(" ")}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          {paymentMethod === "gcash" ? (
                            <>
                              <div>
                                <p className={["text-[11px] font-semibold uppercase tracking-[0.16em]", isDark ? "text-zinc-500" : "text-zinc-500"].join(" ")}>
                                  GCash Number
                                </p>
                                <p className={["mt-1 text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                                  {GCASH_ACCOUNT_NUMBER}
                                </p>
                              </div>
                              <div>
                                <p className={["text-[11px] font-semibold uppercase tracking-[0.16em]", isDark ? "text-zinc-500" : "text-zinc-500"].join(" ")}>
                                  Account Name
                                </p>
                                <p className={["mt-1 text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                                  {GCASH_ACCOUNT_NAME}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p className={["text-[11px] font-semibold uppercase tracking-[0.16em]", isDark ? "text-zinc-500" : "text-zinc-500"].join(" ")}>
                                  Bank
                                </p>
                                <p className={["mt-1 text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                                  {BANK_NAME}
                                </p>
                              </div>
                              <div>
                                <p className={["text-[11px] font-semibold uppercase tracking-[0.16em]", isDark ? "text-zinc-500" : "text-zinc-500"].join(" ")}>
                                  Account No.
                                </p>
                                <p className={["mt-1 text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                                  {BANK_ACCOUNT_NUMBER}
                                </p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className={["text-[11px] font-semibold uppercase tracking-[0.16em]", isDark ? "text-zinc-500" : "text-zinc-500"].join(" ")}>
                                  Account Name
                                </p>
                                <p className={["mt-1 text-sm font-semibold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                                  {BANK_ACCOUNT_NAME}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Field>

                    <Field label={paymentMethod === "gcash" ? "GCash down payment amount" : "Bank transfer down payment amount"} isDark={isDark}>
                      <div className="space-y-2">
                        <input
                          type="number"
                          min={Math.max(1, minimumDownPayment)}
                          max={Math.max(1, total)}
                          required={paymentMethod === "gcash" || paymentMethod === "bank_transfer"}
                          value={downPayment}
                          onChange={(e) => setDownPayment(e.target.value)}
                          placeholder={`Minimum ${minimumDownPayment}`}
                          className={[
                            "h-11 w-full rounded-xl px-3 text-sm outline-none placeholder:text-zinc-500 focus:border-red-400/50",
                            isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
                          ].join(" ")}
                        />
                        <p className={["text-xs leading-5", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                          Minimum required down payment:{" "}
                          <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>
                            {peso(minimumDownPayment)}
                          </span>{" "}
                          (20% of {peso(total)}).
                        </p>
                      </div>
                    </Field>

                    <Field label="Proof of payment" isDark={isDark}>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          required
                          onChange={handleProofFileChange}
                          className={[
                            "block w-full rounded-xl px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-red-500",
                            isDark ? "border border-white/10 bg-zinc-900 text-zinc-200" : "border border-black/10 bg-white text-zinc-800",
                          ].join(" ")}
                        />
                        <p className={["text-xs leading-5", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                          Upload a screenshot, photo, or PDF of the {paymentMethod === "gcash" ? "GCash" : "bank transfer"} payment receipt.
                        </p>
                        {proofPreviewName && (
                          <p className={["text-xs", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                            Selected file: <span className={["font-semibold", isDark ? "text-zinc-100" : "text-zinc-900"].join(" ")}>{proofPreviewName}</span>
                          </p>
                        )}
                      </div>
                    </Field>
                  </>
                )}

                <button
                  className="inline-flex w-full items-center justify-center rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={placingOrder}
                >
                  {placingOrder ? "Placing order..." : "Place order"}
                </button>

                <button
                  className={[
                    "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                    isDark
                      ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                      : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
                  ].join(" ")}
                  type="button"
                  onClick={() => setShowCheckout(false)}
                >
                  Cancel
                </button>
              </form>
            )}

            <Link
              to="/shop"
              className={["mt-4 inline-flex items-center gap-2 text-sm font-semibold transition", isDark ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"].join(" ")}
            >
              <span aria-hidden="true">{"<-"}</span>
              Continue shopping
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

function CartItem({ item, onQtyChange, onRemove, isDark }) {
  const imageUrl = item.imagePath
    ? supabase.storage.from("product-images").getPublicUrl(item.imagePath).data.publicUrl
    : null

  const lineTotal = (item.price || 0) * (item.quantity || 0)

  return (
    <div className={[
      "rounded-2xl p-4",
      isDark
        ? "border border-white/10 bg-gradient-to-b from-zinc-950 to-black shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
        : "border border-black/10 bg-gradient-to-b from-white to-zinc-100 shadow-[0_10px_24px_rgba(17,24,39,0.06)]",
    ].join(" ")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className={["h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28", isDark ? "border border-white/10 bg-zinc-900" : "border border-black/10 bg-white"].join(" ")}>
            {imageUrl ? (
              <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-zinc-500">
                {item.name?.charAt(0) || "?"}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className={["truncate text-base font-bold", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{item.name}</div>
                <div className="text-sm font-semibold text-red-300">{peso(item.price || 0)}</div>
              </div>
              <div className={["text-sm font-bold sm:pl-4", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{peso(lineTotal)}</div>
            </div>

            <div className={["mt-2 flex flex-wrap items-center gap-2 text-xs", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
              {item.color && (
                <span className={["inline-flex items-center rounded-full px-2.5 py-1", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-black/5"].join(" ")}>
                  Color: <span className={["ml-1 font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{item.color}</span>
                </span>
              )}
              {typeof item.stock === "number" && (
                <span className={["inline-flex items-center rounded-full px-2.5 py-1", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-black/5"].join(" ")}>
                  Stock remaining{item.color ? ` (${item.color})` : ""}:{" "}
                  <span className={["ml-1 font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{item.stock}</span>
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className={["mb-1 block text-xs font-semibold uppercase tracking-[0.16em]", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                  Qty
                </label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onQtyChange(item, e.target.value)}
                  className={[
                    "h-10 w-24 rounded-xl px-3 text-sm outline-none focus:border-red-400/50",
                    isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
                  ].join(" ")}
                />
              </div>

              <button
                className={[
                  "inline-flex items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-red-500/15",
                  isDark ? "text-red-200" : "text-red-700",
                ].join(" ")}
                type="button"
                onClick={() => onRemove(item)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
