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

      let data = null
      let error = null

      const selectAttempts = [
        `
          id,
          cart_id,
          product_id,
          variant_id,
          quantity,
          color,
          image_path,
          price_snapshot,
          products:products ( name, price, stock )
        `,
        `
          id,
          cart_id,
          product_id,
          quantity,
          color,
          image_path,
          price_snapshot,
          products:products ( name, price, stock )
        `,
        `
          id,
          cart_id,
          product_id,
          quantity,
          color,
          price_snapshot,
          products:products ( name, price, stock )
        `,
        `
          id,
          cart_id,
          product_id,
          quantity,
          color,
          products:products ( name, price, stock )
        `,
      ]

      for (const selectText of selectAttempts) {
        const res = await supabase
          .from("cart_items")
          .select(selectText)
          .eq("cart_id", activeCartId)
          .order("created_at", { ascending: false })

        data = res.data
        error = res.error
        if (!error) break
      }

      if (error) throw error

      const rows = data || []
      const variantIds = [...new Set(rows.map((row) => row.variant_id).filter(Boolean))]
      const productIds = [...new Set(rows.map((row) => row.product_id).filter(Boolean))]
      let variantMap = new Map()
      let variantByProductColor = new Map()

      if (variantIds.length > 0 || productIds.length > 0) {
        const { data: variantsData, error: variantsError } = await supabase
          .from("product_color_stock")
          .select("id, product_id, color, stock, image_path")
          .in(variantIds.length > 0 ? "id" : "product_id", variantIds.length > 0 ? variantIds : productIds)

        if (variantsError) {
          console.error("Load cart variants error:", variantsError)
        } else {
          const variants = variantsData || []

          // If we queried by variant ids but also need legacy color matching, fetch all variants for product ids too.
          let allVariants = variants
          if (productIds.length > 0 && variantIds.length > 0) {
            const { data: productVariantsData, error: productVariantsError } = await supabase
              .from("product_color_stock")
              .select("id, product_id, color, stock, image_path")
              .in("product_id", productIds)

            if (productVariantsError) {
              console.error("Load product variants for cart fallback error:", productVariantsError)
            } else {
              const merged = [...variants, ...(productVariantsData || [])]
              const dedup = new Map(merged.map((v) => [v.id, v]))
              allVariants = Array.from(dedup.values())
            }
          }

          variantMap = new Map(allVariants.map((v) => [v.id, v]))
          variantByProductColor = new Map(
            allVariants
              .filter((v) => v.product_id && v.color)
              .map((v) => [`${v.product_id}::${String(v.color).trim().toLowerCase()}`, v])
          )
        }
      }

      const mapped = rows.map((row) => {
        const variant =
          (row.variant_id ? variantMap.get(row.variant_id) : null) ||
          (row.product_id && row.color
            ? variantByProductColor.get(`${row.product_id}::${String(row.color).trim().toLowerCase()}`)
            : null)

        return {
          id: row.id, // cart_item id
          productId: row.product_id,
          variantId: row.variant_id ?? null,
          name: row.products?.name,
          price: row.price_snapshot ?? row.products?.price ?? 0,
          stock: typeof variant?.stock === "number" ? variant.stock : row.products?.stock,
          quantity: row.quantity,
          color: variant?.color ?? row.color ?? null,
          imagePath: variant?.image_path ?? row.image_path ?? null,
        }
      })

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

  const addToCart = async (product, color, qty = 1, imagePath = null, variantId = null) => {
    const user = await getUserOrNull()
    if (!user) return { ok: false, reason: "not_logged_in" }

    const activeCartId = cartId || (await getOrCreateActiveCartId(user.id))
    setCartId(activeCartId)

    const productId = product.id
    const safeQty = Math.max(1, Number(qty) || 1)

    // check if this variant already exists
    let existing = null
    let findErr = null
    let existingWasLegacyMatch = false

    if (variantId) {
      const byVariant = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", activeCartId)
        .eq("product_id", productId)
        .eq("variant_id", variantId)
        .maybeSingle()

      existing = byVariant.data
      findErr = byVariant.error

      if (findErr && String(findErr.message || "").toLowerCase().includes("variant_id")) {
        const legacyFallback = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", activeCartId)
          .eq("product_id", productId)
          .eq("color", color ?? null)
          .eq("image_path", imagePath ?? null)
          .maybeSingle()

        existing = legacyFallback.data
        findErr = legacyFallback.error
        existingWasLegacyMatch = !!legacyFallback.data
      } else if (!findErr && !existing) {
        // Migration compatibility: merge old rows that were saved before variant_id existed.
        const legacyMatch = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", activeCartId)
          .eq("product_id", productId)
          .eq("color", color ?? null)
          .eq("image_path", imagePath ?? null)
          .maybeSingle()

        if (!legacyMatch.error && legacyMatch.data) {
          existing = legacyMatch.data
          existingWasLegacyMatch = true
        }
      }
    } else {
      const legacy = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", activeCartId)
        .eq("product_id", productId)
        .eq("color", color ?? null)
        .eq("image_path", imagePath ?? null)
        .maybeSingle()

      existing = legacy.data
      findErr = legacy.error
    }

    if (findErr) {
      console.error("Find cart item error:", findErr)
      return { ok: false, reason: "db_error" }
    }

    const stockLimit = Number.isFinite(Number(product?.stock))
      ? Number(product.stock)
      : null
    const existingQty = Number(existing?.quantity || 0)
    if (stockLimit !== null && existingQty + safeQty > stockLimit) {
      return {
        ok: false,
        reason: "insufficient_stock",
        available: Math.max(stockLimit - existingQty, 0),
        stock: stockLimit,
      }
    }

    if (existing?.id) {
      const newQty = (existing.quantity || 1) + safeQty
      let updErr = null

      if (variantId && existingWasLegacyMatch) {
        const updateRes = await supabase
          .from("cart_items")
          .update({ quantity: newQty, variant_id: variantId })
          .eq("id", existing.id)

        updErr = updateRes.error

        if (updErr && String(updErr.message || "").toLowerCase().includes("variant_id")) {
          const fallbackUpdate = await supabase
            .from("cart_items")
            .update({ quantity: newQty })
            .eq("id", existing.id)
          updErr = fallbackUpdate.error
        }
      } else {
        const updateRes = await supabase
          .from("cart_items")
          .update({ quantity: newQty })
          .eq("id", existing.id)
        updErr = updateRes.error
      }

      if (updErr) {
        console.error("Update cart item error:", updErr)
        return { ok: false, reason: "db_error" }
      }
    } else {
      let insErr = null
      if (variantId) {
        const insertRes = await supabase.from("cart_items").insert({
          cart_id: activeCartId,
          product_id: productId,
          variant_id: variantId,
          quantity: safeQty,
          color: color ?? null,
          image_path: imagePath ?? null,
          price_snapshot: product.price ?? 0,
        })
        insErr = insertRes.error

        if (insErr && String(insErr.message || "").toLowerCase().includes("variant_id")) {
          const fallbackInsert = await supabase.from("cart_items").insert({
            cart_id: activeCartId,
            product_id: productId,
            quantity: safeQty,
            color: color ?? null,
            image_path: imagePath ?? null,
            price_snapshot: product.price ?? 0,
          })
          insErr = fallbackInsert.error
        }
      } else {
        const insertRes = await supabase.from("cart_items").insert({
          cart_id: activeCartId,
          product_id: productId,
          quantity: safeQty,
          color: color ?? null,
          image_path: imagePath ?? null,
          price_snapshot: product.price ?? 0,
        })
        insErr = insertRes.error
      }

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
