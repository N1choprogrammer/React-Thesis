import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../services/supabaseClient"

function createEmptyVariant() {
  return {
    id: null,
    color: "",
    stock: "0",
    imagePath: null,
    newImageFile: null,
  }
}

function getLegacyImagePaths(product) {
  const gallery = Array.isArray(product?.gallery_urls) ? product.gallery_urls.filter(Boolean) : []
  const base = product?.image_url ? [product.image_url] : []
  return base.length > 0 ? [...base, ...gallery.filter((p) => p !== product.image_url)] : gallery
}

export default function AdminProductForm({ mode }) {
  const isEdit = mode === "edit"
  const { id } = useParams()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const [variants, setVariants] = useState([createEmptyVariant()])
  const [pendingStorageDeletes, setPendingStorageDeletes] = useState([])
  const [removedVariantIds, setRemovedVariantIds] = useState([])
  const [saving, setSaving] = useState(false)

  const totalStock = useMemo(
    () =>
      variants.reduce((sum, v) => {
        const n = Number(v.stock)
        return sum + (Number.isFinite(n) && n >= 0 ? n : 0)
      }, 0),
    [variants]
  )

  const getPublicImageUrl = (path) =>
    path ? supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl : ""

  useEffect(() => {
    if (!isEdit) return

    const loadProduct = async () => {
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
        .eq("id", id)
        .single()

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
          .eq("id", id)
          .single()

        data = fallback.data
        error = fallback.error
      }

      if (error) {
        console.error("Error loading product:", error)
        alert("Failed to load product.")
        return
      }

      setName(data.name || "")
      setPrice(data.price ?? "")
      setDescription(data.description || "")
      setPendingStorageDeletes([])
      setRemovedVariantIds([])

      const existingVariants = Array.isArray(data.product_color_stock) ? data.product_color_stock : []

      if (existingVariants.length > 0) {
        setVariants(
          existingVariants.map((v) => ({
            id: v.id ?? null,
            color: v.color || "",
            stock: String(v.stock ?? 0),
            imagePath: v.image_path || null,
            newImageFile: null,
          }))
        )
        return
      }

      const colors = Array.isArray(data.colors) ? data.colors : []
      const imagePaths = getLegacyImagePaths(data)

      const fallbackRows =
        (colors.length > 0 ? colors : ["Default"]).map((color, index) => ({
          id: null,
          color,
          stock: String(index === 0 ? data.stock ?? 0 : 0),
          imagePath: imagePaths[index] || imagePaths[0] || null,
          newImageFile: null,
        })) || [createEmptyVariant()]

      setVariants(fallbackRows.length > 0 ? fallbackRows : [createEmptyVariant()])
    }

    loadProduct()
  }, [id, isEdit])

  const updateVariant = (index, patch) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  const addVariantRow = () => {
    setVariants((prev) => [...prev, createEmptyVariant()])
  }

  const removeVariantRow = (index) => {
    setVariants((prev) => {
      if (prev.length === 1) {
        alert("At least one variant row is required.")
        return prev
      }

      const row = prev[index]
      if (row?.id) {
        setRemovedVariantIds((ids) => (ids.includes(row.id) ? ids : [...ids, row.id]))
      }
      if (row?.imagePath) {
        setPendingStorageDeletes((paths) => (paths.includes(row.imagePath) ? paths : [...paths, row.imagePath]))
      }

      return prev.filter((_, i) => i !== index)
    })
  }

  const handleReplaceImage = (index, file) => {
    if (!file) return

    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, newImageFile: file } : v)))
  }

  const handleRemoveCurrentImage = (index) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v

        if (v.imagePath) {
          setPendingStorageDeletes((paths) => (paths.includes(v.imagePath) ? paths : [...paths, v.imagePath]))
        }

        return { ...v, imagePath: null, newImageFile: null }
      })
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const uploadedPaths = []
    const storageDeletesToRun = [...pendingStorageDeletes]
    let shouldRollbackUploads = true
    let productRecordSaved = false

    try {
      const cleanName = name.trim()
      const numericPrice = Number(price)

      if (!cleanName) {
        alert("Product name is required.")
        return
      }

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        alert("Price must be 0 or higher.")
        return
      }

      const normalizedVariants = []
      const seenColors = new Set()

      for (let i = 0; i < variants.length; i += 1) {
        const row = variants[i]
        const color = String(row.color || "").trim()
        const stockValue = Number(row.stock)

        if (!color) {
          alert(`Variant #${i + 1}: color is required.`)
          return
        }

        if (!Number.isInteger(stockValue) || stockValue < 0) {
          alert(`Variant #${i + 1}: stock must be a whole number 0 or higher.`)
          return
        }

        const colorKey = color.toLowerCase()
        if (seenColors.has(colorKey)) {
          alert(`Duplicate color found: ${color}. Each variant color must be unique.`)
          return
        }
        seenColors.add(colorKey)

        normalizedVariants.push({
          id: row.id ?? null,
          color,
          stock: stockValue,
          imagePath: row.imagePath || null,
          newImageFile: row.newImageFile || null,
        })
      }

      for (let i = 0; i < normalizedVariants.length; i += 1) {
        const row = normalizedVariants[i]

        if (row.newImageFile) {
          const safeName = row.newImageFile.name.replace(/\s+/g, "-")
          const fileName = `variants/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, row.newImageFile, { upsert: false })

          if (uploadError) {
            console.error("Variant image upload error:", uploadError)
            alert(`Failed to upload image for ${row.color}.`)
            return
          }

          if (row.imagePath && !storageDeletesToRun.includes(row.imagePath)) {
            storageDeletesToRun.push(row.imagePath)
          }

          row.imagePath = uploadData.path
          uploadedPaths.push(uploadData.path)
        }

        if (!row.imagePath) {
          alert(`Variant "${row.color}" must have an image.`)
          return
        }
      }

      const finalColors = normalizedVariants.map((v) => v.color)
      const finalGallery = normalizedVariants.map((v) => v.imagePath).filter(Boolean)
      const finalStock = normalizedVariants.reduce((sum, v) => sum + v.stock, 0)

      const productPayload = {
        name: cleanName,
        price: numericPrice,
        stock: finalStock,
        colors: finalColors,
        description,
        image_url: finalGallery[0] || null,
        gallery_urls: finalGallery,
      }

      let productId = id

      if (isEdit) {
        const { error: updateError } = await supabase.from("products").update(productPayload).eq("id", id)
        if (updateError) {
          console.error("Product update error:", updateError)
          alert(`Failed to save product: ${updateError.message || "Unknown error"}`)
          return
        }
        productRecordSaved = true
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("products")
          .insert(productPayload)
          .select("id")
          .single()

        if (insertError) {
          console.error("Product insert error:", insertError)
          alert(`Failed to create product: ${insertError.message || "Unknown error"}`)
          return
        }

        productId = inserted.id
        productRecordSaved = true
      }

      if (removedVariantIds.length > 0) {
        const { error: deleteRemovedError } = await supabase
          .from("product_color_stock")
          .delete()
          .in("id", removedVariantIds)
          .eq("product_id", productId)

        if (deleteRemovedError) {
          console.error("Removed variant delete error:", deleteRemovedError)
          alert(`Product saved, but failed to delete removed variants: ${deleteRemovedError.message}`)
          return
        }
      }

      for (const variantRow of normalizedVariants.filter((v) => v.id)) {
        const { error: updateVariantError } = await supabase
          .from("product_color_stock")
          .update({
            color: variantRow.color,
            stock: variantRow.stock,
            image_path: variantRow.imagePath,
          })
          .eq("id", variantRow.id)
          .eq("product_id", productId)

        if (updateVariantError) {
          console.error("Variant update error:", updateVariantError)
          alert(`Product saved, but failed to update a variant: ${updateVariantError.message}`)
          return
        }
      }

      const newVariantRows = normalizedVariants
        .filter((v) => !v.id)
        .map((v) => ({
          product_id: productId,
          color: v.color,
          stock: v.stock,
          image_path: v.imagePath,
        }))

      if (newVariantRows.length > 0) {
        const { error: insertVariantsError } = await supabase.from("product_color_stock").insert(newVariantRows)
        if (insertVariantsError) {
          console.error("Variant insert error:", insertVariantsError)
          alert(`Product saved, but failed to save variants: ${insertVariantsError.message}`)
          return
        }
      }

      if (storageDeletesToRun.length > 0) {
        const { error: storageDeleteError } = await supabase.storage
          .from("product-images")
          .remove([...new Set(storageDeletesToRun)])

        if (storageDeleteError) {
          console.error("Variant image delete warning:", storageDeleteError)
          alert("Saved product, but some old images could not be deleted from storage.")
        }
      }

      shouldRollbackUploads = false
      navigate("/admin/products")
    } catch (err) {
      console.error("Unexpected error in handleSubmit:", err)
      alert("Something went wrong while saving. Check the console for details.")
    } finally {
      if (shouldRollbackUploads && !productRecordSaved && uploadedPaths.length > 0) {
        const { error: rollbackError } = await supabase.storage.from("product-images").remove(uploadedPaths)
        if (rollbackError) {
          console.error("Upload rollback warning:", rollbackError)
        }
      }
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60"
  const labelClass = "mb-2 block text-sm font-medium text-zinc-200"

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
          {isEdit ? "Edit product" : "New product"}
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {isEdit ? "Edit product" : "Add new product"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Manage the product details, then add one row per color variant with its own stock and photo.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className={labelClass}>Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="SPEEGO Model Name"
            />
          </div>

          <div>
            <label className={labelClass}>Price (PHP)</label>
            <input
              required
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Total stock (computed)</label>
            <input type="number" value={totalStock} readOnly className={inputClass} />
          </div>

          <div className="lg:col-span-3">
            <label className={labelClass}>Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-y`}
              placeholder="Describe the bike, key features, and selling points..."
            />
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Color variants</h3>
              <p className="mt-1 text-sm text-zinc-400">Each variant needs a color, stock, and photo.</p>
            </div>
            <button
              type="button"
              onClick={addVariantRow}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:opacity-60"
            >
              + Add color
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {variants.map((variant, index) => {
              const previewUrl = variant.imagePath ? getPublicImageUrl(variant.imagePath) : ""

              return (
                <div
                  key={`${variant.id ?? "new"}-${index}`}
                  className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[140px_minmax(0,1fr)]">
                    <div>
                      <div className="flex h-[120px] w-full max-w-[120px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={variant.color || `Variant ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-zinc-400">No image</span>
                        )}
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-4">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px]">
                        <div>
                          <label className={labelClass}>Color</label>
                          <input
                            value={variant.color}
                            onChange={(e) => updateVariant(index, { color: e.target.value })}
                            placeholder="Red"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Stock</label>
                          <input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={(e) => updateVariant(index, { stock: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="flex justify-start lg:justify-end">
                        <button
                          type="button"
                          onClick={() => removeVariantRow(index)}
                          disabled={saving}
                          className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60 sm:w-auto"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReplaceImage(index, e.target.files?.[0] || null)}
                            disabled={saving}
                            className="block w-full text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20 sm:w-auto"
                          />

                          {(variant.imagePath || variant.newImageFile) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCurrentImage(index)}
                              disabled={saving}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10 disabled:opacity-60"
                            >
                              Delete photo
                            </button>
                          )}

                          <span className="break-all text-xs text-zinc-400">
                            {variant.newImageFile
                              ? `Selected: ${variant.newImageFile.name}`
                              : variant.imagePath
                              ? "Using saved photo"
                              : "No photo selected"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            disabled={saving}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-red-500 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </div>
  )
}
