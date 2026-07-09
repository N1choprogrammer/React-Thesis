import { useEffect } from "react"
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom"
import NavBar from "./components/NavBar"
import Home from "./pages/Home"
import Shop from "./pages/Shop"
import Cart from "./pages/Cart"
import About from "./pages/About"
import Contact from "./pages/Contact"
import AdminRoute from "./components/AdminRoute"
import Login from "./pages/Login"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import AdminLayout from "./pages/admin/AdminLayout"
import OrderConfirmation from "./pages/OrderConfirmation"
import ChatAssistant from "./components/ChatAssistant"
import MyOrders from "./pages/MyOrders"
import Profile from "./pages/Profile"
import { useTheme } from "./context/ThemeContext"
import { supabase } from "./services/supabaseClient"

function hasPasswordRecoveryParams() {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))

  return (
    searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery"
  )
}

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark } = useTheme()

  useEffect(() => {
    if (hasPasswordRecoveryParams() && location.pathname !== "/reset-password") {
      navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true })
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && location.pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [location.pathname, navigate])

  // hide customer navbar/chat on auth and admin routes
  const authPaths = ["/login", "/forgot-password", "/reset-password"]
  const hideNav = authPaths.includes(location.pathname) || location.pathname.startsWith("/admin")

  return (
    <div
      className={
        isDark
          ? "min-h-screen transition-colors duration-300"
          : "min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 text-zinc-900 transition-colors duration-300"
      }
    >
      {!hideNav && <NavBar />}

      <main className="main-content">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/profile" element={<Profile />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Customer order confirmation */}
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

          {/* Admin (protected) */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
       {/* SpeeGO AI assistant - visible on all pages except login */}
      {!hideNav && <ChatAssistant />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}

export default App
