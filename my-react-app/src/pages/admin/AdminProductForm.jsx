import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../services/supabaseClient"

export default function AdminProductForm({ mode }) {
  const isEdit = mode === "edit"
  const { id } = useParams()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [colors, setColors] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [existingGalleryUrls, setExistingGalleryUrls] = useState([])

  useEffect(() => {
    if (!isEdit) return
    const loadProduct = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error loading product:", error)
        alert("Failed to load product.")
        return
      }

      setName(data.name || "")
      setPrice(data.price || "")
      setStock(data.stock || "")
      setColors(data.colors?.join(", ") || "")
      setDescription(data.description || "")
      setExistingGalleryUrls(data.gallery_urls || [])
    }
    loadProduct()
  }, [id, isEdit])

    const handleSubmit = async (e) => {
  e.preventDefault()
  setSaving(true)

  try {
    // 1) Upload gallery images (if any)
    let galleryUrls = existingGalleryUrls

    if (galleryFiles.length > 0) {
      const uploadPromises = galleryFiles.map((file) => {
        const fileName = `gallery/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}-${file.name}`

        return supabase.storage
          .from("product-images")
          .upload(fileName, file, { upsert: true })
      })

      const uploadResults = await Promise.all(uploadPromises)

      const newPaths = []
      for (const result of uploadResults) {
        const { data: uploadData, error: uploadError } = result
        if (uploadError) {
          console.error("Gallery upload error:", uploadError)
          alert("One of the gallery images failed to upload.")
          setSaving(false)
          return
        }
        newPaths.push(uploadData.path)
      }

      galleryUrls = [...existingGalleryUrls, ...newPaths]
    }

    // 2) Build payload
    const payload = {
      name,
      price: Number(price),
      stock: Number(stock),
      colors: colors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      description,
      image_url: null,     // still simple for now
      gallery_urls: galleryUrls,
    }

    console.log("Saving product payload:", payload)

    let error

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from("products")
        .insert(payload)
      error = insertError
    }

    if (error) {
      console.error("Error saving product:", error)
      alert(`Failed to save product: ${error.message || "Unknown error"}`)
      return
    }

    navigate("/admin/products")
  } catch (err) {
    console.error("Unexpected error in handleSubmit:", err)
    alert("Something went wrong while saving. Check the console for details.")
  } finally {
    setSaving(false)
  }
}



  return (
    <div className="admin-form">
      <h2 className="page-title">
        {isEdit ? "Edit product" : "Add new product"}
      </h2>
      <p className="page-subtitle">
        {isEdit
          ? "Update the product details below."
          : "Fill in the details of the new e-bike model."}
      </p>

      <form onSubmit={handleSubmit} className="admin-form-grid">
        <div className="form-field">
          <label>Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Price (₱)</label>
          <input
            required
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Stock</label>
          <input
            required
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Colors (comma-separated)</label>
          <input
            placeholder="Red, Black, White"
            value={colors}
            onChange={(e) => setColors(e.target.value)}
          />
        </div>

        <div className="form-field form-field-full">
          <label>Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

            <div className="form-field form-field-full">
  <label>Additional images (gallery)</label>

  {existingGalleryUrls.length > 0 && (
    <p className="page-subtitle">
      Currently stored images: {existingGalleryUrls.length}
    </p>
  )}

  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => setGalleryFiles(Array.from(e.target.files))}
  />
</div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/admin/products")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </div>
  )
}
