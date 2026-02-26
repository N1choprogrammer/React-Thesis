import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import NavBar from "./components/NavBar"
import Home from "./pages/Home"
import Shop from "./pages/Shop"
import Cart from "./pages/Cart"
import About from "./pages/About"
import Contact from "./pages/Contact"
import AdminRoute from "./components/AdminRoute"
import Login from "./pages/Login"
import AdminLayout from "./pages/admin/AdminLayout"
import OrderConfirmation from "./pages/OrderConfirmation"
import ChatAssistant from "./components/ChatAssistant"
import MyOrders from "./pages/MyOrders"
import Profile from "./pages/Profile"
import { useTheme } from "./context/ThemeContext"

function Layout() {
  const location = useLocation()
  const { isDark } = useTheme()

  // hide customer navbar/chat on login and admin routes
  const hideNav = location.pathname === "/login" || location.pathname.startsWith("/admin")

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
