function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function hasAny(message, phrases) {
  const msg = normalize(message)
  return phrases.some((p) => msg.includes(normalize(p)))
}

function formatPeso(amount) {
  return `PHP ${Number(amount || 0).toLocaleString()}`
}

function formatDateTime(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString()
}

function formatStatus(status) {
  return String(status || "pending").replace(/_/g, " ")
}

function extractOrderIdHint(message) {
  const raw = String(message || "")
  const uuidLike = raw.match(/[a-f0-9]{8}-[a-f0-9-]{10,}/i)
  if (uuidLike) return uuidLike[0]

  const codeLike = raw.match(/spg-[a-z0-9]{4,}/i)
  if (codeLike) return codeLike[0]

  return null
}

export async function getOrderStatusReply(message, supabase) {
  const asksOrderStatus = hasAny(message, [
    "order status",
    "my order",
    "my orders",
    "where is my order",
    "track order",
    "status of my order",
    "latest order",
    "last order",
    "recent order"
  ])

  if (!asksOrderStatus) return null

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("SpeeGo AI order responder auth error:", userError)
    return "I couldn't check your account session right now. Please try again."
  }

  if (!user) {
    return "Please log in first so I can check your order status."
  }

  let orders = []
  const byUser = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at, customer_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (!byUser.error) {
    orders = byUser.data || []
  } else {
    console.error("SpeeGo AI order responder user_id query error:", byUser.error)
  }

  if (orders.length === 0 && user.email) {
    const byEmail = await supabase
      .from("orders")
      .select("id, status, total_amount, created_at, customer_name")
      .eq("customer_email", user.email)
      .order("created_at", { ascending: false })
      .limit(10)

    if (byEmail.error) {
      console.error("SpeeGo AI order responder email query error:", byEmail.error)
      return "I couldn't load your orders right now. Please check the My Orders page."
    }
    orders = byEmail.data || []
  }

  if (orders.length === 0) {
    return "I couldn't find any orders for your account yet. You can place one from the Shop page."
  }

  const idHint = extractOrderIdHint(message)
  let target = orders[0]

  if (idHint) {
    const match = orders.find((o) => String(o.id).toLowerCase().includes(idHint.toLowerCase()))
    if (match) target = match
  }

  return `Your latest matching order is ${target.id} and is currently "${formatStatus(
    target.status
  )}". Total: ${formatPeso(target.total_amount)}. Date: ${formatDateTime(
    target.created_at
  )}. You can view full details in My Orders.`
}
