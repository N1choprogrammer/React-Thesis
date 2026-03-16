import { useEffect, useState } from "react"
import { supabase } from "../services/supabaseClient"
import { useCart } from "../context/CartContext"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

export default function Shop() {
  const { isDark } = useTheme()
  const [products, setProducts] = useState([])
  const { addToCart } = useCart()
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (!quickViewProduct) return
    window.dispatchEvent(
      new CustomEvent("speego:product-context", {
        detail: {
          id: quickViewProduct.id,
          name: quickViewProduct.name,
          short_id: quickViewProduct.short_id,
        },
      })
    )
  }, [quickViewProduct])
  const [recentlyAddedId, setRecentlyAddedId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const fetchProducts = async () => {
      let data = null
      let error = null

      const primary = await supabase
        .from("products")
        .select(`
          *,
          product_color_stock (
            id,
            color,
            stock,
            image_path
          )
        `)
        .eq("is_active", true)

      data = primary.data
      error = primary.error

      const lowerError = String(error?.message || "").toLowerCase()

      if (error && lowerError.includes("image_path")) {
        console.warn("image_path column not found yet. Falling back to legacy product query.")
        const fallback = await supabase
          .from("products")
          .select(`
            *,
            product_color_stock (
              id,
              color,
              stock
            )
          `)
          .eq("is_active", true)
        data = fallback.data
        error = fallback.error
      }

      if (error && String(error.message || "").toLowerCase().includes("is_active")) {
        console.warn("is_active column not found yet. Falling back to legacy product query without status filter.")
        const fallbackNoStatus = await supabase
          .from("products")
          .select(`
            *,
            product_color_stock (
              id,
              color,
              stock,
              image_path
            )
          `)
        data = fallbackNoStatus.data
        error = fallbackNoStatus.error
      }

      if (error && String(error.message || "").toLowerCase().includes("image_path")) {
        console.warn("Legacy schema fallback: querying products without image_path and without status filter.")
        const fallbackLegacy = await supabase
          .from("products")
          .select(`
            *,
            product_color_stock (
              id,
              color,
              stock
            )
          `)
        data = fallbackLegacy.data
        error = fallbackLegacy.error
      }

      if (error) {
        console.error("Error fetching products:", error)
      } else {
        setProducts((data || []).filter((p) => p?.is_active !== false))
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    const targetProduct = searchParams.get("product")
    if (!targetProduct || products.length === 0) return

    const match = products.find(
      (p) => String(p.id) === targetProduct || String(p.short_id || "").toLowerCase() === targetProduct.toLowerCase()
    )

    if (match) {
      setQuickViewProduct(match)
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete("product")
      setSearchParams(nextParams, { replace: true })
    }
  }, [products, searchParams, setSearchParams])

  const showToast = (message, type = "success", timeoutMs = 3200) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), timeoutMs)
  }

  const handleAdded = (product, color, qty = 1) => {
    setRecentlyAddedId(product.id)
    setTimeout(() => setRecentlyAddedId(null), 350)

    const message = color
      ? `Added to cart: ${product.name} (${color}) x${qty}`
      : `Added to cart: ${product.name} x${qty}`

    showToast(message, "success")
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-0 top-6 h-40 w-40 rounded-full bg-red-600/10 blur-3xl" />
        <div className={["absolute right-10 top-20 h-52 w-52 rounded-full blur-3xl", isDark ? "bg-white/5" : "bg-black/5"].join(" ")} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <section className={[
          "mb-6 overflow-hidden rounded-3xl p-6 sm:p-8",
          isDark
            ? "border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 shadow-[0_25px_60px_rgba(0,0,0,0.35)]"
            : "border border-black/10 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 shadow-[0_16px_45px_rgba(17,24,39,0.08)]",
        ].join(" ")}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", isDark ? "border border-white/10 bg-white/5 text-zinc-300" : "border border-black/10 bg-black/[0.03] text-zinc-600"].join(" ")}>
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                SPEEGO Shop
              </div>
              <h2 className={["mt-4 text-3xl font-black tracking-tight sm:text-4xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>
                Choose your e-bike, color, and quantity
              </h2>
              <p className={["mt-3 text-sm leading-7 sm:text-base", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
                Browse our SPEEGO electric bike lineup. Click a color photo to choose your variant,
                set quantity, and add to cart.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Variants", "Per-color stock"],
                ["Checkout", "6 months interest-free"],
                ["Support", "SPEEGO E-bikes"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className={[
                    "rounded-xl px-4 py-3 text-left",
                    isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-white",
                  ].join(" ")}
                >
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {label}
                  </div>
                  <div className={["mt-1 text-sm font-semibold", isDark ? "text-zinc-100" : "text-zinc-900"].join(" ")}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {products.length === 0 ? (
          <div className={["rounded-2xl p-8 text-center", isDark ? "border border-white/10 bg-zinc-950/70" : "border border-black/10 bg-white/90"].join(" ")}>
            <p className={["text-sm", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
              No products available yet. Add some from the admin panel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToCart={addToCart}
                onAdded={handleAdded}
                onNotify={showToast}
                isRecentlyAdded={recentlyAddedId === product.id}
                onOpenQuickView={() => setQuickViewProduct(product)}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          addToCart={addToCart}
          onAdded={handleAdded}
          onNotify={showToast}
          isDark={isDark}
        />
      )}

      {toast && (
        <div className={[
          "fixed left-1/2 top-5 z-[90] w-[min(94vw,640px)] -translate-x-1/2 rounded-2xl border px-5 py-4 text-base font-semibold backdrop-blur",
          toast.type === "error"
            ? (isDark
                ? "border-red-400/40 bg-red-950/95 text-red-100 shadow-[0_24px_70px_rgba(127,29,29,0.55)]"
                : "border-red-300 bg-red-50/95 text-red-800 shadow-[0_16px_50px_rgba(127,29,29,0.18)]")
            : (isDark
                ? "border-emerald-400/40 bg-emerald-950/95 text-emerald-100 shadow-[0_24px_70px_rgba(6,78,59,0.45)]"
                : "border-emerald-300 bg-emerald-50/95 text-emerald-800 shadow-[0_16px_50px_rgba(6,78,59,0.18)]"),
        ].join(" ")}>
          <div className="flex items-center gap-3">
            <span className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm",
              toast.type === "error"
                ? (isDark ? "border-red-300/40 bg-red-500/15 text-red-200" : "border-red-300 bg-red-100 text-red-700")
                : (isDark ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200" : "border-emerald-300 bg-emerald-100 text-emerald-700"),
            ].join(" ")}>
              {toast.type === "error" ? "!" : "+"}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function getPublicImageUrl(path) {
  if (!path) return null
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl
}

function formatPrice(value) {
  return `PHP ${Number(value || 0).toLocaleString()}`
}

function getProductCode(product) {
  if (product?.short_id) return product.short_id
  const rawId = product?.id
  if (!rawId) return "SPG-UNKNOWN"
  return `SPG-${String(rawId).replace(/-/g, "").slice(0, 10).toUpperCase()}`
}

function getImagePaths(product) {
  const variantImages = Array.isArray(product.product_color_stock)
    ? product.product_color_stock.map((v) => v?.image_path).filter(Boolean)
    : []

  if (variantImages.length > 0) return variantImages

  const gallery = product.gallery_urls || []
  const baseImage = product.image_url ? [product.image_url] : []
  return baseImage.length > 0
    ? [...baseImage, ...gallery.filter((p) => p !== product.image_url)]
    : gallery
}

function getSelectedColor(product, activeImageIndex) {
  if (!product.colors || product.colors.length === 0) return ""
  const colors = product.colors
  const imagePaths = getImagePaths(product)
  if (colors.length === imagePaths.length && colors[activeImageIndex]) return colors[activeImageIndex]
  return colors[0]
}

function getVariantStock(product, selectedColor) {
  if (!product.product_color_stock || !selectedColor) return null

  const variant = product.product_color_stock.find(
    (v) => v.color && v.color.toLowerCase() === selectedColor.toLowerCase()
  )

  return variant ? variant.stock : null
}

function getSelectedVariant(product, activeImageIndex) {
  if (!Array.isArray(product.product_color_stock) || product.product_color_stock.length === 0) {
    return null
  }
  return product.product_color_stock[activeImageIndex] || product.product_color_stock[0] || null
}

function StockBadge({ stock, selectedColor, isDark }) {
  const lowStock = stock !== null && stock > 0 && stock <= 3

  if (stock === null) {
    return (
      <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
        Available
      </span>
    )
  }

  if (stock <= 0) {
    return (
      <span className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
        Out of stock
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={["inline-flex rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold", isDark ? "text-sky-200" : "text-sky-700"].join(" ")}>
        In stock ({selectedColor || "variant"}): {stock}
      </span>
      {lowStock && (
        <span className={["inline-flex rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold", isDark ? "text-amber-200" : "text-amber-700"].join(" ")}>
          Low stock
        </span>
      )}
    </div>
  )
}

function ProductCard({ product, addToCart, onAdded, onNotify, isRecentlyAdded, onOpenQuickView, isDark }) {
  const [qty, setQty] = useState(1)
  const navigate = useNavigate()
  const imagePaths = getImagePaths(product)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const activeImagePath = imagePaths[activeImageIndex]
  const activeImageUrl = getPublicImageUrl(activeImagePath)
  const selectedVariant = getSelectedVariant(product, activeImageIndex)
  const selectedColor = selectedVariant?.color || getSelectedColor(product, activeImageIndex)

  const variantStock =
    typeof selectedVariant?.stock === "number"
      ? selectedVariant.stock
      : getVariantStock(product, selectedColor)

  const stock =
    typeof variantStock === "number"
      ? variantStock
      : typeof product.stock === "number"
      ? product.stock
      : null

  const inStock = stock === null ? true : stock > 0

  const handleAdd = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      navigate("/login", { state: { returnTo: "/shop" } })
      return
    }

    if (!inStock) {
      onNotify?.(
        `No more stock for ${product.name}${selectedColor ? ` (${selectedColor})` : ""}.`,
        "error"
      )
      return
    }

    let finalQty = qty
    if (stock !== null && finalQty > stock) {
      onNotify?.(
        `No more stock for ${product.name}${selectedColor ? ` (${selectedColor})` : ""}. Only ${stock} unit(s) left.`,
        "error"
      )
      return
    }

    const productForCart = { ...product, stock }
    const res = await addToCart(
      productForCart,
      selectedColor,
      finalQty,
      activeImagePath,
      selectedVariant?.id ?? null
    )

    if (!res.ok) {
      if (res.reason === "insufficient_stock") {
        const available = Number.isFinite(res.available) ? res.available : stock
        onNotify?.(
          `No more stock for ${product.name}${selectedColor ? ` (${selectedColor})` : ""}. Available: ${available}.`,
          "error"
        )
        return
      }
      onNotify?.("Failed to add to cart. Please try again.", "error")
      return
    }

    onAdded?.(product, selectedColor, finalQty)
  }

  const handleQtyChange = (e) => {
    let value = Number(e.target.value)
    if (Number.isNaN(value) || value < 1) value = 1
    setQty(value)
  }

  return (
    <article
      className={[
        "group overflow-hidden rounded-2xl border bg-gradient-to-b p-4 shadow-[0_20px_45px_rgba(0,0,0,0.28)] transition duration-200",
        isRecentlyAdded
          ? (isDark
              ? "border-red-400/50 from-red-500/10 to-zinc-950 ring-1 ring-red-400/30"
              : "border-red-300/70 from-red-50 to-white ring-1 ring-red-300/40")
          : (isDark
              ? "border-white/10 from-zinc-950 to-black hover:-translate-y-1 hover:border-white/20"
              : "border-black/10 from-white to-zinc-100 hover:-translate-y-1 hover:border-black/20"),
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpenQuickView}
        className={[
          "relative block w-full overflow-hidden rounded-xl text-left",
          isDark ? "border border-white/10 bg-zinc-900" : "border border-black/10 bg-white",
        ].join(" ")}
      >
        <div className="aspect-[4/3]">
          {activeImageUrl ? (
            <img
              src={activeImageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className={["flex h-full items-center justify-center text-sm", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
              No image
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
      </button>

      {imagePaths.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {imagePaths.slice(0, 5).map((path, idx) => {
            const thumbUrl = getPublicImageUrl(path)
            const thumbColor =
              getSelectedVariant(product, idx)?.color ||
              (product.colors && product.colors.length === imagePaths.length
                ? product.colors[idx]
                : null)

            return (
              <button
                key={`${path}-${idx}`}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                title={thumbColor || product.name}
                className={[
                  "h-12 w-12 overflow-hidden rounded-lg border transition",
                  idx === activeImageIndex
                    ? "border-red-400 ring-1 ring-red-400/30"
                    : isDark ? "border-white/10 bg-zinc-900 hover:border-white/20" : "border-black/10 bg-white hover:border-black/20",
                ].join(" ")}
              >
                {thumbUrl ? (
                  <img src={thumbUrl} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover" />
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className={["text-lg font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{product.name}</h3>
          <p className="mt-1 text-sm font-semibold text-red-300">{formatPrice(product.price)}</p>
        </div>
        <button
          type="button"
          onClick={onOpenQuickView}
          className={[
            "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            isDark
              ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
              : "border border-black/10 bg-black/5 text-zinc-800 hover:bg-black/10",
          ].join(" ")}
        >
          Quick view
        </button>
      </div>

      <p className={["mt-3 min-h-[44px] text-sm leading-6", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
        {product.description?.slice(0, 90)}
        {product.description && product.description.length > 90 ? "..." : ""}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <StockBadge stock={stock} selectedColor={selectedColor} isDark={isDark} />
        <div className={["text-xs", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
          ID: <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{getProductCode(product)}</span>
          {" | "}
          Color: <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{selectedColor || "-"}</span>
        </div>
        {product.colors && product.colors.length > 0 && (
          <div className={["text-xs", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
            Selected color: <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{selectedColor || product.colors[0]}</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[88px_1fr] gap-2">
        <input
          className={[
            "h-11 rounded-xl px-3 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-red-400/50",
            isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
          ].join(" ")}
          type="number"
          min="1"
          value={qty}
          onChange={handleQtyChange}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          className={[
            "h-11 rounded-xl border px-4 text-sm font-semibold transition",
            inStock
              ? "border-red-500 bg-red-600 text-white hover:bg-red-500"
              : isDark
                ? "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500"
                : "cursor-not-allowed border-black/10 bg-black/5 text-zinc-500",
          ].join(" ")}
        >
          {inStock ? "Add to cart" : "Unavailable"}
        </button>
      </div>
    </article>
  )
}

function QuickViewModal({ product, onClose, addToCart, onAdded, onNotify, isDark }) {
  const imagePaths = getImagePaths(product)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  const activeImagePath = imagePaths[activeImageIndex]
  const activeImageUrl = getPublicImageUrl(activeImagePath)
  const selectedVariant = getSelectedVariant(product, activeImageIndex)
  const selectedColor = selectedVariant?.color || getSelectedColor(product, activeImageIndex)
  const variantStock =
    typeof selectedVariant?.stock === "number"
      ? selectedVariant.stock
      : getVariantStock(product, selectedColor)
  const stock =
    typeof variantStock === "number"
      ? variantStock
      : typeof product.stock === "number"
      ? product.stock
      : null

  const inStock = stock === null ? true : stock > 0

  const handleQtyChange = (e) => {
    let value = Number(e.target.value)
    if (Number.isNaN(value) || value < 1) value = 1
    setQty(value)
  }

  const handleAddFromModal = async () => {
    if (product.colors?.length && !selectedColor) {
      alert("This product is not configured correctly: no color for this image.")
      return
    }
    if (qty < 1) {
      alert("Quantity must be at least 1")
      return
    }
    if (!inStock) {
      onNotify?.(
        `No more stock for ${product.name}${selectedColor ? ` (${selectedColor})` : ""}.`,
        "error"
      )
      return
    }

    let finalQty = qty
    if (stock !== null && finalQty > stock) {
      onNotify?.(
        `No more stock for ${product.name}${selectedColor ? ` (${selectedColor})` : ""}. Only ${stock} unit(s) left.`,
        "error"
      )
      return
    }

    const productForCart = { ...product, stock }
    setAdding(true)
    try {
      const res = await addToCart(
        productForCart,
        selectedColor,
        finalQty,
        activeImagePath,
        selectedVariant?.id ?? null
      )
      if (!res?.ok) {
        if (res.reason === "insufficient_stock") {
          const available = Number.isFinite(res.available) ? res.available : stock
          onNotify?.(
            `No more stock for ${product.name}${selectedColor ? ` (${selectedColor})` : ""}. Available: ${available}.`,
            "error"
          )
          return
        }
        onNotify?.("Failed to add to cart. Please try again.", "error")
        return
      }
      onAdded?.(product, selectedColor, finalQty)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className={["fixed inset-0 z-[80] p-3 backdrop-blur-sm sm:p-6", isDark ? "bg-black/75" : "bg-zinc-900/35"].join(" ")} onClick={onClose}>
      <div
        className={[
          "mx-auto max-h-[96vh] w-full max-w-6xl overflow-hidden rounded-3xl",
          isDark
            ? "border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
            : "border border-black/10 bg-white shadow-[0_20px_60px_rgba(17,24,39,0.14)]",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={["flex items-center justify-between px-4 py-3 sm:px-6", isDark ? "border-b border-white/10" : "border-b border-black/10"].join(" ")}>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Quick View
          </div>
          <button
            type="button"
            onClick={onClose}
            className={[
              "inline-flex h-9 w-9 items-center justify-center rounded-full transition",
              isDark
                ? "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                : "border border-black/10 bg-black/5 text-zinc-700 hover:bg-black/10",
            ].join(" ")}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="grid max-h-[calc(96vh-58px)] gap-0 overflow-y-auto lg:grid-cols-[1fr_1fr]">
          <div className={["p-4 lg:p-6", isDark ? "border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10" : "border-b border-black/10 lg:border-b-0 lg:border-r lg:border-black/10"].join(" ")}>
            <div className={["overflow-hidden rounded-2xl", isDark ? "border border-white/10 bg-black" : "border border-black/10 bg-white"].join(" ")}>
              <div className="aspect-square sm:aspect-[4/3]">
                {activeImageUrl ? (
                  <img src={activeImageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className={["flex h-full items-center justify-center text-sm", isDark ? "text-zinc-400" : "text-zinc-500"].join(" ")}>
                    No image
                  </div>
                )}
              </div>
            </div>

            {imagePaths.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {imagePaths.slice(0, 6).map((path, idx) => {
                  const thumbUrl = getPublicImageUrl(path)
                  const thumbColor =
                    getSelectedVariant(product, idx)?.color ||
                    (product.colors && product.colors.length === imagePaths.length
                      ? product.colors[idx]
                      : null)

                  return (
                    <button
                      key={`${path}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      title={thumbColor || product.name}
                      className={[
                        "h-14 w-14 overflow-hidden rounded-lg border transition",
                        idx === activeImageIndex
                          ? "border-red-400 ring-1 ring-red-400/30"
                          : isDark ? "border-white/10 bg-zinc-900 hover:border-white/20" : "border-black/10 bg-white hover:border-black/20",
                      ].join(" ")}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`${product.name} ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6">
            <h3 className={["text-2xl font-bold tracking-tight sm:text-3xl", isDark ? "text-white" : "text-zinc-900"].join(" ")}>{product.name}</h3>
            <p className="mt-2 text-lg font-semibold text-red-300">{formatPrice(product.price)}</p>
            <p className={["mt-4 text-sm leading-7", isDark ? "text-zinc-300" : "text-zinc-600"].join(" ")}>
              {product.description || "No description provided."}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <StockBadge stock={stock} selectedColor={selectedColor} isDark={isDark} />
              <div className={["text-sm", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
                ID: <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{getProductCode(product)}</span>
                {" | "}
                Color: <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>{selectedColor || "-"}</span>
              </div>
              {product.colors && product.colors.length > 0 && (
                <div className={["text-sm", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
                  Selected color:{" "}
                  <span className={["font-semibold", isDark ? "text-zinc-200" : "text-zinc-900"].join(" ")}>
                    {selectedColor || product.colors[0]}
                  </span>
                </div>
              )}
            </div>

            <div className={["mt-6 rounded-2xl p-4", isDark ? "border border-white/10 bg-white/5" : "border border-black/10 bg-zinc-50"].join(" ")}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Quantity
              </label>
              <div className="grid grid-cols-[96px_1fr] gap-2">
                <input
                  className={[
                    "h-11 rounded-xl px-3 text-sm outline-none focus:border-red-400/50",
                    isDark ? "border border-white/10 bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900",
                  ].join(" ")}
                  type="number"
                  min="1"
                  value={qty}
                  onChange={handleQtyChange}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddFromModal()
                  }}
                  disabled={!inStock || adding}
                  className={[
                    "h-11 rounded-xl border px-4 text-sm font-semibold transition",
                    inStock && !adding
                      ? "border-red-500 bg-red-600 text-white hover:bg-red-500"
                      : isDark
                        ? "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500"
                        : "cursor-not-allowed border-black/10 bg-black/5 text-zinc-500",
                  ].join(" ")}
                >
                  {adding ? "Adding..." : inStock ? "Add to cart" : "Unavailable"}
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs leading-6 text-zinc-500">
              Pick your preferred color by clicking the photos, then choose quantity and add to
              your cart.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
