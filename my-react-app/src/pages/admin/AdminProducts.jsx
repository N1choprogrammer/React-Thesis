import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../services/supabaseClient"

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [category, setCategory] = useState("All")
  const [statusFilter, setStatusFilter] = useState("active")
  const [variantStockDrafts, setVariantStockDrafts] = useState({})
  const [savingVariantId, setSavingVariantId] = useState(null)

  const buildVariantDrafts = (rows) => {
    const drafts = {}
    for (const product of rows || []) {
      for (const variant of product.product_color_stock || []) {
        drafts[variant.id] = String(variant.stock ?? 0)
      }
    }
    return drafts
  }

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
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
        .order("created_at", { ascending: false })

      data = primary.data
      error = primary.error

      if (error && String(error.message || "").toLowerCase().includes("image_path")) {
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
          .order("created_at", { ascending: false })
        data = fallback.data
        error = fallback.error
      }

      if (error) {
        console.error("Error loading products:", error)
      } else {
        setProducts(data || [])
        setVariantStockDrafts(buildVariantDrafts(data || []))
      }

      setLoading(false)
    }

    fetchProducts()
  }, [])

  const handleVariantStockChange = (variantId, value) => {
    setVariantStockDrafts((prev) => ({ ...prev, [variantId]: value }))
  }

  const handleSaveVariantStock = async (productId, variantId) => {
    const rawValue = variantStockDrafts[variantId]
    const nextStock = Number(rawValue)

    if (!Number.isInteger(nextStock) || nextStock < 0) {
      alert("Stock must be a whole number 0 or higher.")
      return
    }

    setSavingVariantId(variantId)

    const { error } = await supabase.from("product_color_stock").update({ stock: nextStock }).eq("id", variantId)
    if (error) {
      console.error("Error updating variant stock:", error)
      alert(`Failed to update color stock: ${error.message || "Unknown error"}`)
      setSavingVariantId(null)
      return
    }

    let nextTotalForProduct = null

    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product

        const nextVariants = (product.product_color_stock || []).map((variant) =>
          variant.id === variantId ? { ...variant, stock: nextStock } : variant
        )

        nextTotalForProduct = nextVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)

        return {
          ...product,
          stock: nextTotalForProduct,
          product_color_stock: nextVariants,
        }
      })
    )

    if (typeof nextTotalForProduct === "number") {
      const { error: productStockError } = await supabase
        .from("products")
        .update({ stock: nextTotalForProduct })
        .eq("id", productId)

      if (productStockError) {
        console.error("Warning: variant updated but failed to sync product stock:", productStockError)
      }
    }

    setSavingVariantId(null)
  }

  const getVariantImagePath = (product, variant, variantIndex) => {
    if (variant?.image_path) return variant.image_path

    const gallery = Array.isArray(product.gallery_urls) ? product.gallery_urls.filter(Boolean) : []
    const baseImage = product.image_url ? [product.image_url] : []
    const imagePaths =
      baseImage.length > 0
        ? [...baseImage, ...gallery.filter((path) => path !== product.image_url)]
        : gallery

    return imagePaths[variantIndex] || imagePaths[0] || null
  }

  const getPublicImageUrl = (path) => {
    if (!path) return null
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Set this product to inactive? It will be hidden from the shop and active list.")) {
      return
    }

    setDeletingId(id)
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id)

    if (error) {
      console.error("Error setting product inactive:", error)
      alert(`Failed to set product inactive: ${error.message || "Unknown error"}`)
      setDeletingId(null)
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: false } : p)))

    setDeletingId(null)
  }

  const handleRestore = async (id) => {
    setDeletingId(id)

    const { error } = await supabase.from("products").update({ is_active: true }).eq("id", id)

    if (error) {
      console.error("Error restoring product:", error)
      alert(`Failed to restore product: ${error.message || "Unknown error"}`)
      setDeletingId(null)
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: true } : p)))

    setDeletingId(null)
  }

  const isProductActive = (product) => product.is_active !== false

  const getWheelType = (product) => {
    if (product.name === "SpeeGo 4 Wheel Solar") return "4 Wheels"
    return "3 Wheels"
  }

  const getShortId = (product) => {
    if (product.short_id) return product.short_id
    if (product.id && typeof product.id === "string") return product.id.slice(0, 6).toUpperCase()
    if (product.id && typeof product.id === "number") return product.id.toString().padStart(6, "0")
    return "------"
  }

  const getTotalStock = (product) => {
    const variants = product.product_color_stock || []
    if (variants.length > 0) {
      return variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    }
    return product.stock ?? 0
  }

  const filteredProducts = products.filter((p) => {
    const categoryMatch = category === "All" ? true : getWheelType(p) === category
    const statusMatch =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? isProductActive(p)
        : !isProductActive(p)
    return categoryMatch && statusMatch
  })

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
              Inventory
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Products</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Manage SPEEGO electric bike models, pricing, stock variants, and product images.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Category
              </label>
              <select
                className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="All">All</option>
                <option value="3 Wheels">3 Wheels</option>
                <option value="4 Wheels">4 Wheels</option>
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Status
              </label>
              <select
                className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
            </div>

            <Link
              to="/admin/products/new"
              className="inline-flex items-center justify-center rounded-xl border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              + Add product
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 text-sm text-zinc-300">
          No products match this filter.
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredProducts.map((p) => {
            const variants = p.product_color_stock || []
            const totalStock = getTotalStock(p)

            return (
              <article
                key={p.id}
                className="rounded-2xl border border-white/10 bg-zinc-950/85 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)] sm:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                        {getShortId(p)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                        {getWheelType(p)}
                      </span>
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          isProductActive(p)
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : "border-zinc-400/20 bg-zinc-500/10 text-zinc-200",
                        ].join(" ")}
                      >
                        {isProductActive(p) ? "Active" : "Inactive"}
                      </span>
                      <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200">
                        Total stock: {totalStock}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                      <p className="mt-1 text-sm text-zinc-300">
                        Price: <span className="font-semibold text-white">PHP {p.price?.toLocaleString?.() ?? p.price}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Created: {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/admin/products/${p.id}/edit`}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                    >
                      Edit
                    </Link>
                    {isProductActive(p) ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === p.id ? "Updating..." : "Set inactive"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRestore(p.id)}
                        disabled={deletingId === p.id}
                        className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === p.id ? "Updating..." : "Restore"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  {variants.length > 0 ? (
                    <div className="grid gap-3">
                      {variants.map((variant, variantIndex) => {
                        const imagePath = getVariantImagePath(p, variant, variantIndex)
                        const imageUrl = getPublicImageUrl(imagePath)
                        const isSaving = savingVariantId === variant.id

                        return (
                          <div
                            key={variant.id}
                            className="grid gap-3 rounded-xl border border-white/10 bg-zinc-950/70 p-3 sm:grid-cols-[auto_1fr_auto_auto]"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={variant.color || p.name}
                                className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] text-zinc-400">
                                No img
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {variant.color || "No color label"}
                              </p>
                              <p className="text-xs text-zinc-400">Variant stock</p>
                            </div>

                            <input
                              type="number"
                              min="0"
                              value={variantStockDrafts[variant.id] ?? String(variant.stock ?? 0)}
                              onChange={(e) => handleVariantStockChange(variant.id, e.target.value)}
                              className="h-10 w-24 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20"
                            />

                            <button
                              type="button"
                              onClick={() => handleSaveVariantStock(p.id, variant.id)}
                              disabled={isSaving}
                              className="h-10 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">No color variants yet. Edit this product to add variants.</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
