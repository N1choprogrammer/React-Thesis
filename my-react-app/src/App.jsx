import { BrowserRouter, Routes, Route } from "react-router-dom"
import NavBar from "./components/NavBar"
import Home from "./pages/Home"
import Shop from "./pages/Shop"
import Cart from "./pages/Cart"
import About from "./pages/About"
import Contact from "./pages/Contact"
import AdminRoute from "./components/AdminRoute"
import Login from "./pages/Login"
import AdminLayout from "./pages/admin/AdminLayout"
import AdminOrders from "./pages/admin/AdminOrders"


function App() {
  return (
    <div className="app-shell">
      <BrowserRouter>
        <NavBar />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<AdminRoute><AdminLayout /></AdminRoute>} />
          </Routes>
        </main>

        <footer className="footer">
          © {new Date().getFullYear()} SPEEGO Electric Bike Shop. All rights reserved.
        </footer>
      </BrowserRouter>
    </div>
  )
}

export default App
