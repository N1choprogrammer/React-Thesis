import { createContext, useContext, useState } from "react"

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

const addToCart = (product, color, quantity, imagePath) => {
  setCart((prev) => {
    const cartId = `${product.id}-${color || "default"}`
    const existing = prev.find((item) => item.id === cartId)

    const productStock = typeof product.stock === "number" ? product.stock : null

    // If we don't know the stock, behave as before
    if (productStock == null) {
      if (existing) {
        return prev.map((item) =>
          item.id === cartId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      return [
        ...prev,
        {
          id: cartId,
          productId: product.id,
          name: product.name,
          price: product.price,
          color: color || "",
          quantity,
          imagePath: imagePath || null,
          stock: product.stock ?? null,
        },
      ]
    }

    // If we DO know the stock, clamp to it
    const currentQty = existing ? existing.quantity : 0
    const desiredQty = currentQty + quantity

    if (desiredQty > productStock) {
      const allowedToAdd = Math.max(productStock - currentQty, 0)
      if (allowedToAdd <= 0) {
        alert(`No more stock available for ${product.name}.`)
        return prev
      }

      alert(
        `Only ${productStock} unit(s) of ${product.name} available. Added ${allowedToAdd} instead of ${quantity}.`
      )

      // Apply only allowed quantity
      if (existing) {
        return prev.map((item) =>
          item.id === cartId
            ? { ...item, quantity: item.quantity + allowedToAdd }
            : item
        )
      }

      return [
        ...prev,
        {
          id: cartId,
          productId: product.id,
          name: product.name,
          price: product.price,
          color: color || "",
          quantity: allowedToAdd,
          imagePath: imagePath || null,
          stock: product.stock ?? null,
        },
      ]
    }

    // Normal case: desiredQty is within stock
    if (existing) {
      return prev.map((item) =>
        item.id === cartId
          ? { ...item, quantity: desiredQty }
          : item
      )
    }

    return [
      ...prev,
      {
        id: cartId,
        productId: product.id,
        name: product.name,
        price: product.price,
        color: color || "",
        quantity,
        imagePath: imagePath || null,
        stock: product.stock ?? null,
      },
    ]
  })
}


  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id, quantity) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}
