import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../services/supabaseClient"

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("products").select("*")

    if (error) {
      console.error("Error loading products:", error)
      alert("Failed to load products. Check console for details.")
      setProducts([])
    } else {
      setProducts(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleDelete = async (id) => {
  const ok = window.confirm("Are you sure you want to delete this product?")
  if (!ok) return

  console.log("Attempting to delete product with id:", id, "typeof:", typeof id)

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select() // return deleted rows

  console.log("Delete result:", { data, error })

  if (error) {
    console.error("Error deleting product:", error)
    alert(`Failed to delete product: ${error.message || "Unknown error"}`)
    return
  }

  if (!data || data.length === 0) {
    alert("No product was deleted. Check RLS policies and the id value.")
    return
  }

  setProducts((prev) => prev.filter((p) => p.id !== id))
}



  return (
    <div>
      <div className="admin-header-row">
        <div>
          <h2 className="page-title">Products</h2>
          <p className="page-subtitle">View, edit, or remove e-bikes from the catalog.</p>
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">
          + Add product
        </Link>
      </div>

      {loading ? (
        <p className="page-subtitle">Loading...</p>
      ) : products.length === 0 ? (
        <p className="page-subtitle">No products yet. Add one using the button above.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price (₱)</th>
                <th>Stock</th>
                <th>Colors</th>
                <th style={{ width: "160px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.price}</td>
                  <td>{p.stock}</td>
                  <td>{p.colors?.join(", ")}</td>
                  <td>
                    <div className="admin-actions">
                      <Link to={`/admin/products/${p.id}`} className="admin-action-link">
                        Edit
                      </Link>
                      <button
                        type="button"               // ⬅ IMPORTANT
                        className="admin-action-delete"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
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
