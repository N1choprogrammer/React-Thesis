import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "../services/supabaseClient"

const CartContext = createContext(null)

async function getUserOrNull() {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user || null
}

async function getOrCreateActiveCartId(userId) {
  const { data: existing, error: selErr } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (selErr) throw selErr
  if (existing?.id) return existing.id

  const { data: created, error: insErr } = await supabase
    .from("carts")
    .insert({ user_id: userId, status: "active" })
    .select("id")
    .single()

  if (insErr) throw insErr
  return created.id
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [cartId, setCartId] = useState(null)
  const [loadingCart, setLoadingCart] = useState(true)

  const loadCart = async () => {
    setLoadingCart(true)
    try {
      const user = await getUserOrNull()
      if (!user) {
        setCart([])
        setCartId(null)
        setLoadingCart(false)
        return
      }

      const activeCartId = await getOrCreateActiveCartId(user.id)
      setCartId(activeCartId)

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          cart_id,
          product_id,
          quantity,
          color,
          image_path,
          price_snapshot,
          products:products ( name, price, stock )
        `)
        .eq("cart_id", activeCartId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((row) => ({
        id: row.id, // cart_item id
        productId: row.product_id,
        name: row.products?.name,
        price: row.price_snapshot ?? row.products?.price ?? 0,
        stock: row.products?.stock,
        quantity: row.quantity,
        color: row.color ?? null,
        imagePath: row.image_path ?? null,
      }))

      setCart(mapped)
    } catch (e) {
      console.error("Load cart error:", e)
      setCart([])
    } finally {
      setLoadingCart(false)
    }
  }

  useEffect(() => {
    loadCart()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadCart()
    })

    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addToCart = async (product, color, qty = 1, imagePath = null) => {
    const user = await getUserOrNull()
    if (!user) return { ok: false, reason: "not_logged_in" }

    const activeCartId = cartId || (await getOrCreateActiveCartId(user.id))
    setCartId(activeCartId)

    const productId = product.id
    const safeQty = Math.max(1, Number(qty) || 1)

    // check if this variant already exists
    const { data: existing, error: findErr } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", activeCartId)
      .eq("product_id", productId)
      .eq("color", color ?? null)
      .eq("image_path", imagePath ?? null)
      .maybeSingle()

    if (findErr) {
      console.error("Find cart item error:", findErr)
      return { ok: false, reason: "db_error" }
    }

    if (existing?.id) {
      const newQty = (existing.quantity || 1) + safeQty
      const { error: updErr } = await supabase
        .from("cart_items")
        .update({ quantity: newQty })
        .eq("id", existing.id)

      if (updErr) {
        console.error("Update cart item error:", updErr)
        return { ok: false, reason: "db_error" }
      }
    } else {
      const { error: insErr } = await supabase.from("cart_items").insert({
        cart_id: activeCartId,
        product_id: productId,
        quantity: safeQty,
        color: color ?? null,
        image_path: imagePath ?? null,
        price_snapshot: product.price ?? 0,
      })

      if (insErr) {
        console.error("Insert cart item error:", insErr)
        return { ok: false, reason: "db_error" }
      }
    }

    await loadCart()
    return { ok: true }
  }

  const removeFromCart = async (cartItemId) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId)
    if (error) console.error("Remove cart item error:", error)
    await loadCart()
  }

  const updateQuantity = async (cartItemId, qty) => {
    const safeQty = Math.max(1, Number(qty) || 1)
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: safeQty })
      .eq("id", cartItemId)

    if (error) console.error("Update quantity error:", error)
    await loadCart()
  }

  const clearCart = async () => {
    if (!cartId) {
      setCart([])
      return
    }
    const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartId)
    if (error) console.error("Clear cart error:", error)
    await loadCart()
  }

  const value = useMemo(
    () => ({
      cart,
      loadingCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [cart, loadingCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside CartProvider")
  return ctx
}
