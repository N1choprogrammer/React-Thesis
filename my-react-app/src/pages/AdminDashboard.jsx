import { Routes, Route, Link } from "react-router-dom"
import Products from "./admin/Products"
import AddProduct from "./admin/AddProduct"
import EditProduct from "./admin/EditProduct"

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <nav>
        <Link to="/admin/products">Products</Link> | 
        <Link to="/admin/add-product">Add Product</Link>
      </nav>
      <Routes>
        <Route path="products" element={<Products />} />
        <Route path="add-product" element={<AddProduct />} />
        <Route path="edit-product/:id" element={<EditProduct />} />
      </Routes>
    </div>
  )
}
