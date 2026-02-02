import { Link } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { supabase } from "../services/supabaseClient"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"

export default function NavBar() {
  const { cart } = useCart()

  const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = "/login"
}
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
        </nav>

        <Link to="/cart" className="nav-cart">
          Cart <span>{cart.length}</span>
        </Link>

        <button type="button" className="btn btn-ghost" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  )
}
