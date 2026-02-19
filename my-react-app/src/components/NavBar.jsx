import { Link, useNavigate } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { supabase } from "../services/supabaseClient"
import { useEffect, useState } from "react"
import logo from "../Pictures/ChatGPT-Image-SpeeGo-Logo.png"

export default function NavBar() {
  const { cart } = useCart()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)

  useEffect(() => {
    // initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // listen for changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const handleLogin = () => {
    navigate("/login")
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
          {session && (
            <>
            <Link to="/my-orders">My Orders</Link>
            <Link to="/profile">Profile</Link>
            </>
          )}
        </nav>

        <Link to="/cart" className="nav-cart">
          Cart <span>{cart.length}</span>
        </Link>

        {!session ? (
          <button type="button" className="btn btn-primary" onClick={handleLogin}>
            Sign in / Login
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  )
}
