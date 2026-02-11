import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { supabase } from "../services/supabaseClient"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"

export default function NavBar() {
  const { cart } = useCart()
  const [bump, setBump] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // 🔔 Bump animation when cart length changes
  useEffect(() => {
    if (cart.length === 0) return

    setBump(true)
    const timer = setTimeout(() => setBump(false), 300)

    return () => clearTimeout(timer)
  }, [cart.length])

  const cartClassName = "nav-cart" + (bump ? " nav-cart-bump" : "")

  return (
    <header className="navbar">
      <div className="nav-inner">
        <div className="nav-logo">
          <img src={logo} alt="Speego" height="36" />
        </div>

        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>

          {/* My Orders styled separately in CSS */}
          <Link to="/my-orders" className="nav-link-myorders">
            My Orders
          </Link>
        </nav>

        <Link to="/cart" className={cartClassName}>
          Cart <span>{cart.length}</span>
        </Link>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  )
}
