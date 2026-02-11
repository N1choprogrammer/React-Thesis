import { useEffect, useState } from "react"
import { supabase } from "../services/supabaseClient"
import { useCart } from "../context/CartContext"

export default function Shop() {
  const [products, setProducts] = useState([])
  const { addToCart } = useCart()
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [recentlyAddedId, setRecentlyAddedId] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from("products").select("*")
      if (error) {
        console.error("Error fetching products:", error)
      } else {
        setProducts(data || [])
      }
    }
    fetchProducts()
  }, [])

const handleAdded = (product, color) => {
  setRecentlyAddedId(product.id)

  // brief highlight on the card
  setTimeout(() => setRecentlyAddedId(null), 300)

  // toast message
  const message = color
    ? `Added to cart: ${product.name} (${color})`
    : `Added to cart: ${product.name}`

  setToastMessage(message)

  // hide toast after 2 seconds
  setTimeout(() => {
    setToastMessage(null)
  }, 2000)
}

  return (
    <div>
      <h2 className="page-title">Shop e-bikes</h2>
      <p className="page-subtitle">
        Browse our SPEEGO electric bike lineup. Click a color photo to choose your variant, set
        quantity, and add to cart.
      </p>

      {products.length === 0 ? (
        <p className="page-subtitle">
          No products available yet. Add some from the admin panel.
        </p>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              addToCart={addToCart}
              onAdded={handleAdded}
              isRecentlyAdded={recentlyAddedId === p.id}
              onOpenQuickView={() => setQuickViewProduct(p)}
            />
          ))}
        </div>
      )}

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          addToCart={addToCart}
          onAdded={handleAdded}
        />
      )}
      {toastMessage && (
        <div className="toast toast-added">
      {toastMessage}
  </div>
)}

    </div>
  )
}

// helper to build consistent image list
function getImagePaths(product) {
  const gallery = product.gallery_urls || []
  const baseImage = product.image_url ? [product.image_url] : []
  return baseImage.length > 0
    ? [...baseImage, ...gallery.filter((p) => p !== product.image_url)]
    : gallery
}

// get color based on active image index
function getSelectedColor(product, activeImageIndex) {
  if (!product.colors || product.colors.length === 0) return ""
  const colors = product.colors

  // If we have the same number of images and colors, map 1:1
  const imagePaths = getImagePaths(product)
  if (colors.length === imagePaths.length && colors[activeImageIndex]) {
    return colors[activeImageIndex]
  }

  // Fallback: just use first color
  return colors[0]
}

function ProductCard({ product, addToCart, onAdded, isRecentlyAdded, onOpenQuickView }) {
  const [qty, setQty] = useState(1)

  const imagePaths = getImagePaths(product)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const activeImagePath = imagePaths[activeImageIndex]
  const activeImageUrl = activeImagePath
    ? supabase.storage.from("product-images").getPublicUrl(activeImagePath).data.publicUrl
    : null

  // Stock logic
  const stock = typeof product.stock === "number" ? product.stock : null
  const inStock = stock === null ? true : stock > 0
  const lowStock = stock !== null && stock > 0 && stock <= 3

  const selectedColor = getSelectedColor(product, activeImageIndex)

const handleAdd = () => {
  if (product.colors?.length && !selectedColor) {
    alert("This product is not configured correctly: no color for this image.")
    return
  }
  if (qty < 1) {
    alert("Quantity must be at least 1")
    return
  }

  let finalQty = qty

  if (stock !== null && finalQty > stock) {
    finalQty = stock
    setQty(stock)
    alert(`Only ${stock} unit(s) available for ${product.name}. Quantity has been adjusted.`)
  }

  if (!inStock) {
    alert("This product is currently out of stock.")
    return
  }

  addToCart(product, selectedColor, qty, activeImagePath)
  onAdded?.(product, selectedColor)
}


  const handleQtyChange = (e) => {
    let value = Number(e.target.value)
    if (Number.isNaN(value) || value < 1) value = 1
    if (stock !== null && value > stock) value = stock
    setQty(value)
  }

  const cardClass =
    "product-card" + (isRecentlyAdded ? " product-card-added" : "")

  return (
    <article className={cardClass}>
      <div
        className="product-image"
        onClick={onOpenQuickView}
        style={{ cursor: "pointer" }}
      >
        {activeImageUrl ? (
          <img src={activeImageUrl} alt={product.name} />
        ) : (
          <div className="product-image-fallback">
            <span>No image</span>
          </div>
        )}
      </div>

      {imagePaths.length > 1 && (
        <div className="product-gallery-thumbs">
          {imagePaths.slice(0, 5).map((path, idx) => {
            const thumbUrl = supabase.storage
              .from("product-images")
              .getPublicUrl(path).data.publicUrl

            const thumbColor =
              product.colors && product.colors.length === imagePaths.length
                ? product.colors[idx]
                : null

            return (
              <button
                key={idx}
                type="button"
                className={
                  "product-gallery-thumb" +
                  (idx === activeImageIndex ? " active" : "")
                }
                onClick={() => setActiveImageIndex(idx)}
                title={thumbColor || product.name}
              >
                <img
                  src={thumbUrl}
                  alt={`${product.name} ${idx + 1}`}
                />
              </button>
            )
          })}
        </div>
      )}

      <div className="product-header">
        <div className="product-name">{product.name}</div>
        <div className="product-price">₱{product.price}</div>
      </div>

      <div className="product-meta">
        {product.description?.slice(0, 90)}
        {product.description && product.description.length > 90 ? "..." : ""}
      </div>

      <div className="product-meta">
        {stock === null ? (
          <span className="badge badge-stock">Available</span>
        ) : stock > 0 ? (
          <>
            <span className="badge badge-stock">In stock: {stock}</span>
            {lowStock && (
              <span className="badge badge-low">Low stock</span>
            )}
          </>
        ) : (
          <span className="badge badge-out">Out of stock</span>
        )}

        {product.colors && product.colors.length > 0 && (
          <span className="product-colors">
            · Selected color:{" "}
            <strong>{selectedColor || product.colors[0]}</strong>
          </span>
        )}
      </div>

      <div className="product-controls">
        <div className="product-controls-row">
          <input
  className="product-qty-input"
  type="number"
  min="1"
  value={qty}
  onChange={(e) => {
    let value = Number(e.target.value)
    if (Number.isNaN(value) || value < 1) value = 1
    if (stock !== null && value > stock) value = stock
    setQty(value)
  }}
/>

          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!inStock}
          >
            {inStock ? "Add to cart" : "Unavailable"}
          </button>
        </div>
      </div>
    </article>
  )
}

function QuickViewModal({ product, onClose, addToCart, onAdded }) {
  const imagePaths = getImagePaths(product)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [qty, setQty] = useState(1)

  const activeImagePath = imagePaths[activeImageIndex]
  const activeImageUrl = activeImagePath
    ? supabase.storage.from("product-images").getPublicUrl(activeImagePath).data.publicUrl
    : null

  const stock = typeof product.stock === "number" ? product.stock : null
  const inStock = stock === null ? true : stock > 0
  const selectedColor = getSelectedColor(product, activeImageIndex)

  const handleAddFromModal = () => {
  if (product.colors?.length && !selectedColor) {
    alert("This product is not configured correctly: no color for this image.")
    return
  }
  if (qty < 1) {
    alert("Quantity must be at least 1")
    return
  }

  let finalQty = qty

  if (stock !== null && finalQty > stock) {
    finalQty = stock
    setQty(stock)
    alert(`Only ${stock} unit(s) available for ${product.name}. Quantity has been adjusted.`)
  }

  if (!inStock) {
    alert("This product is currently out of stock.")
    return
  }

  addToCart(product, selectedColor, qty, activeImagePath)
  onAdded?.(product, selectedColor)
// onClose()  // keep commented if you want the modal to stay open
}

  const handleQtyChange = (e) => {
    let value = Number(e.target.value)
    if (Number.isNaN(value) || value < 1) value = 1
    if (stock !== null && value > stock) value = stock
    setQty(value)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="modal-grid">
          {/* LEFT: big main image */}
          <div className="modal-image-col">
            <div className="product-image modal-image">
              {activeImageUrl ? (
                <img src={activeImageUrl} alt={product.name} />
              ) : (
                <div className="product-image-fallback">
                  <span>No image</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: description, thumbs, controls */}
          <div className="modal-info-col">
            <h3 className="modal-title">{product.name}</h3>
            <p className="modal-price">₱{product.price}</p>

            <p className="modal-description">
              {product.description || "No description provided."}
            </p>

            <div className="modal-meta-row">
              {stock === null ? (
                <span className="badge badge-stock">Available</span>
              ) : stock > 0 ? (
                <span className="badge badge-stock">In stock: {stock}</span>
              ) : (
                <span className="badge badge-out">Out of stock</span>
              )}
              {product.colors && product.colors.length > 0 && (
                <span className="product-colors">
                  · Selected color:{" "}
                  <strong>{selectedColor || product.colors[0]}</strong>
                </span>
              )}
            </div>

            {imagePaths.length > 1 && (
              <div className="product-gallery-thumbs modal-gallery-thumbs">
                {imagePaths.slice(0, 6).map((path, idx) => {
                  const thumbUrl = supabase.storage
                    .from("product-images")
                    .getPublicUrl(path).data.publicUrl

                  const thumbColor =
                    product.colors && product.colors.length === imagePaths.length
                      ? product.colors[idx]
                      : null

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={
                        "product-gallery-thumb" +
                        (idx === activeImageIndex ? " active" : "")
                      }
                      onClick={() => setActiveImageIndex(idx)}
                      title={thumbColor || product.name}
                    >
                      <img
                        src={thumbUrl}
                        alt={`${product.name} ${idx + 1}`}
                      />
                    </button>
                  )
                })}
                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    className="product-qty-input"
                    type="number"
                    min="1"
                    value={qty}
                    onChange={handleQtyChange}
                  />
                </div>
              </div>
            )}

            <div className="modal-controls">
              <div className="modal-controls-row">
                <button
                  className="btn btn-primary"
                  onClick={handleAddFromModal}
                  disabled={!inStock}
                >
                  {inStock ? "Add to cart" : "Unavailable"}
                </button>
              </div>
            </div>

            <p className="modal-note">
              Pick your preferred color by clicking on the photos, then choose quantity and add to
              your cart.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
