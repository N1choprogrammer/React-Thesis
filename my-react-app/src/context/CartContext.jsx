import { createContext, useContext, useState } from "react"

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  // product: full product object from Supabase
  // color: selected color (string or "")
  // quantity: number
  // imagePath: storage path of the selected image (string or null)
  const addToCart = (product, color, quantity, imagePath) => {
    setCart((prev) => {
      const cartId = `${product.id}-${color || "default"}`
      const existing = prev.find((item) => item.id === cartId)

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
          id: cartId,               // cart item id
          productId: product.id,    // original product id
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
