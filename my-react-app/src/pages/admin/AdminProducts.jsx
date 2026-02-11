// src/pages/admin/AdminProducts.jsx
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../services/supabaseClient"

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading products:", error)
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    }

    fetchProducts()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return

    setDeletingId(id)

    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select()

    console.log("Delete result:", { data, error })

    if (error) {
      console.error("Error deleting product:", error)
      alert("Failed to delete product.")
    } else if (!data || data.length === 0) {
      alert("No product was deleted. Check RLS policies and the id value.")
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }

    setDeletingId(null)
  }

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h2 className="page-title">Products</h2>
          <p className="page-subtitle">
            Manage SPEEGO electric bike models: prices, stock, and descriptions.
          </p>
        </div>

        <Link to="/admin/products/new" className="btn btn-primary">
          + Add product
        </Link>
      </div>

      {loading ? (
        <p className="page-subtitle">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="page-subtitle">No products yet. Add one to get started.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price (₱)</th>
                <th>Stock</th>
                <th>Created</th>
                <th style={{ width: "130px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.price?.toLocaleString?.() ?? p.price}</td>
                  <td>{p.stock ?? "-"}</td>
                  <td>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="admin-action-link"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="admin-action-delete"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
