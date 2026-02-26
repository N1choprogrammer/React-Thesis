function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function levenshtein(a, b) {
  const s = normalize(a)
  const t = normalize(b)
  const dp = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0))

  for (let i = 0; i <= s.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= t.length; j += 1) dp[0][j] = j

  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }

  return dp[s.length][t.length]
}

function similarity(a, b) {
  const aa = normalize(a)
  const bb = normalize(b)
  if (!aa || !bb) return 0
  const distance = levenshtein(aa, bb)
  const maxLen = Math.max(aa.length, bb.length)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}

function productCode(product) {
  if (product?.short_id) return product.short_id
  if (!product?.id) return "SPG-UNKNOWN"
  return `SPG-${String(product.id).replace(/-/g, "").slice(0, 10).toUpperCase()}`
}

function formatPrice(price) {
  return `PHP ${Number(price || 0).toLocaleString()}`
}

function totalVariantStock(product) {
  const variants = Array.isArray(product?.product_color_stock) ? product.product_color_stock : []
  if (variants.length > 0) {
    return variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
  }
  return Number(product?.stock || 0)
}

function findBestProductMatch(message, products) {
  const msg = normalize(message)
  if (!msg) return null

  let best = null
  let bestScore = 0

  for (const product of products || []) {
    const name = normalize(product.name)
    if (!name) continue

    let score = 0
    if (msg.includes(name)) score += 10

    const nameTokens = name.split(" ").filter((t) => t.length > 2)
    const matchedTokens = nameTokens.filter((t) => msg.includes(t)).length
    if (nameTokens.length > 0) {
      score += (matchedTokens / nameTokens.length) * 6
    }

    const sim = similarity(msg, name)
    score += sim * 5

    for (const token of nameTokens) {
      if (token.length < 4) continue
      const msgWords = msg.split(" ")
      const fuzzyTokenHit = msgWords.some((w) => similarity(w, token) >= 0.78)
      if (fuzzyTokenHit) score += 1.5
    }

    if (score > bestScore) {
      bestScore = score
      best = product
    }
  }

  return bestScore >= 2 ? best : null
}

export function findProductMatch(message, products) {
  return findBestProductMatch(message, products)
}

function hasAny(message, phrases) {
  const msg = normalize(message)
  return phrases.some((p) => msg.includes(normalize(p)))
}

function extractBudget(message) {
  const raw = String(message || "").toLowerCase().replace(/,/g, "")
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(k|kphp|php|pesos?)?/)
  if (!match) return null
  let value = Number(match[1])
  if (!Number.isFinite(value)) return null
  const unit = match[2] || ""
  if (unit.startsWith("k")) value *= 1000
  if (value < 1000 && raw.includes("k")) value *= 1000
  return Math.round(value)
}

function getUseCase(message) {
  const msg = normalize(message)
  if (hasAny(msg, ["delivery", "business", "cargo", "pang negosyo", "work"])) return "utility"
  if (hasAny(msg, ["family", "passenger", "kids", "4 wheel", "four wheel"])) return "family"
  if (hasAny(msg, ["student", "school", "commute", "commuting", "city"])) return "commute"
  return null
}

function sortRecommendations(products, { budget, useCase }) {
  const scored = products.map((p) => {
    let score = 0
    const price = Number(p.price || 0)
    const stock = totalVariantStock(p)
    const name = normalize(p.name)

    if (stock > 0) score += 4
    if (budget != null) {
      if (price <= budget) score += 6
      score += Math.max(0, 4 - Math.abs(price - budget) / Math.max(1, budget) * 4)
    }

    if (useCase === "family" && (name.includes("4 wheel") || name.includes("4wheel"))) score += 4
    if (useCase === "utility" && (name.includes("3 wheel") || name.includes("solar"))) score += 3
    if (useCase === "commute" && !name.includes("4 wheel")) score += 2

    return { product: p, score }
  })

  return scored.sort((a, b) => b.score - a.score).map((x) => x.product)
}

function inferWheelType(product) {
  const name = normalize(product?.name || "")
  if (name.includes("4 wheel") || name.includes("4wheel")) return "4-wheel"
  if (name.includes("3 wheel") || name.includes("3wheel")) return "3-wheel"
  if (
    name.includes("ecosada") ||
    name.includes("eco sports") ||
    name.includes("eco trip") ||
    name.includes("q5")
  ) {
    return "3-wheel"
  }
  return "other"
}

function wheelTypeLabel(product) {
  const type = inferWheelType(product)
  if (type === "4-wheel") return "same 4-wheel type"
  if (type === "3-wheel") return "same 3-wheel type"
  return "similar category"
}

function buildSimilarityReasons(baseProduct, candidate) {
  const reasons = []
  const basePrice = Number(baseProduct?.price || 0)
  const candidatePrice = Number(candidate?.price || 0)
  const baseType = inferWheelType(baseProduct)
  const candidateType = inferWheelType(candidate)
  const stock = totalVariantStock(candidate)

  if (baseType !== "other" && baseType === candidateType) {
    reasons.push(wheelTypeLabel(candidate))
  }

  if (basePrice > 0 && candidatePrice > 0) {
    const diff = Math.abs(candidatePrice - basePrice)
    const diffRatio = diff / basePrice
    if (diffRatio <= 0.12) {
      reasons.push("very close price range")
    } else if (diffRatio <= 0.25) {
      reasons.push("close price range")
    }
  }

  if (stock > 0) {
    reasons.push("currently in stock")
  }

  if (reasons.length === 0) {
    reasons.push("closest match based on your current model")
  }

  return reasons.slice(0, 3)
}

function sortSimilarProducts(baseProduct, products) {
  const basePrice = Number(baseProduct?.price || 0)
  const baseType = inferWheelType(baseProduct)

  const scored = (products || [])
    .filter((p) => p?.id && p.id !== baseProduct.id)
    .map((p) => {
      const price = Number(p.price || 0)
      const stock = totalVariantStock(p)
      const type = inferWheelType(p)
      let score = 0

      if (stock > 0) score += 4
      if (type === baseType) score += 5

      if (basePrice > 0 && price > 0) {
        const diffRatio = Math.abs(price - basePrice) / basePrice
        score += Math.max(0, 6 - diffRatio * 10)
      }

      const commonNameTokens = normalize(baseProduct.name)
        .split(" ")
        .filter((t) => t.length > 2)
        .filter((t) => normalize(p.name).includes(t)).length
      score += commonNameTokens * 0.8

      return { product: p, score }
    })

  return scored.sort((a, b) => b.score - a.score).map((x) => x.product)
}

function buildPriceStepPitch(baseProduct, candidate) {
  const basePrice = Number(baseProduct?.price || 0)
  const nextPrice = Number(candidate?.price || 0)
  const diff = nextPrice - basePrice

  if (!Number.isFinite(basePrice) || !Number.isFinite(nextPrice)) {
    return `${candidate.name} (${productCode(candidate)}) is priced at ${formatPrice(candidate.price)}.`
  }

  if (diff < 0) {
    return `${candidate.name} (${productCode(candidate)}) is a better-value option at ${formatPrice(
      nextPrice
    )} (${formatPrice(Math.abs(diff))} less).`
  }

  if (diff === 0) {
    return `${candidate.name} (${productCode(candidate)}) is also priced at ${formatPrice(
      nextPrice
    )}, so you can compare features and stock availability.`
  }

  return `${candidate.name} (${productCode(candidate)}) is ${formatPrice(
    nextPrice
  )} and only ${formatPrice(diff)} more if you want to step up to another model.`
}

function sortByPriceDistanceSameType(baseProduct, products) {
  const baseType = inferWheelType(baseProduct)
  const basePrice = Number(baseProduct?.price || 0)

  return (products || [])
    .filter((p) => p?.id && p.id !== baseProduct.id)
    .filter((p) => inferWheelType(p) === baseType)
    .sort((a, b) => {
      const aInStock = totalVariantStock(a) > 0 ? 1 : 0
      const bInStock = totalVariantStock(b) > 0 ? 1 : 0
      if (aInStock !== bInStock) return bInStock - aInStock

      const aDist = Math.abs(Number(a.price || 0) - basePrice)
      const bDist = Math.abs(Number(b.price || 0) - basePrice)
      return aDist - bDist
    })
}

export function getCrossSellPriceReply(message, products, contextProductId = null) {
  const list = Array.isArray(products) ? products : []
  if (list.length < 2) return null

  const asksPrice = hasAny(message, ["price", "cost", "how much", "pricing"])
  if (!asksPrice) return null

  const explicitProduct = findBestProductMatch(message, list)
  const baseProduct =
    explicitProduct || (contextProductId ? list.find((p) => p.id === contextProductId) : null)

  if (!baseProduct) return null

  const baseType = inferWheelType(baseProduct)
  if (baseType !== "3-wheel") return null

  const alternatives = sortByPriceDistanceSameType(baseProduct, list).slice(0, 3)
  if (alternatives.length === 0) return null

  const lines = alternatives.map((p) => buildPriceStepPitch(baseProduct, p))

  return {
    text: `${baseProduct.name} (${productCode(baseProduct)}) is priced at ${formatPrice(
      baseProduct.price
    )}. Since you're checking a 3-wheel model, here are other 3-wheel options you may want to compare: ${lines.join(
      " "
    )}`,
    links: alternatives.map((p) => ({
      label: p.name,
      href: `/shop?product=${encodeURIComponent(p.id)}`,
      productId: p.id,
    })),
  }
}

export function getSimilarProductReply(message, products, contextProductId = null) {
  const list = Array.isArray(products) ? products : []
  if (list.length < 2) return null

  const asksSimilar = hasAny(message, [
    "similar",
    "alternative",
    "another option",
    "other option",
    "same as",
    "like this",
    "something similar"
  ])

  if (!asksSimilar) return null

  const explicitProduct = findBestProductMatch(message, list)
  const baseProduct =
    explicitProduct || (contextProductId ? list.find((p) => p.id === contextProductId) : null)

  if (!baseProduct) {
    return "I can recommend a similar bike, but I need the model name first. Tell me which SPEEGO bike you're checking, and I'll suggest the closest alternative."
  }

  const similar = sortSimilarProducts(baseProduct, list).slice(0, 2)
  if (similar.length === 0) {
    return `I couldn't find a close alternative to ${baseProduct.name} right now. You can ask me for recommendations based on your budget instead.`
  }

  const suggestions = similar.map((p) => {
    const stock = totalVariantStock(p)
    const reasons = buildSimilarityReasons(baseProduct, p).join(", ")
    return `${p.name} (${productCode(p)}) - PHP ${Number(p.price || 0).toLocaleString()}${
      stock > 0 ? `, stock: ${stock}` : ", currently out of stock"
    } (${reasons})`
  })

  return `If you are looking at ${baseProduct.name} (${productCode(
    baseProduct
  )}), a similar option you can also consider is: ${suggestions.join(" | ")}`
}

export function getRecommendationReply(message, products) {
  const list = Array.isArray(products) ? products : []
  if (list.length === 0) return null

  const asksRecommend = hasAny(message, [
    "recommend",
    "suggest",
    "best bike",
    "which bike",
    "which model",
    "what bike should"
  ])
  if (!asksRecommend) return null

  const budget = extractBudget(message)
  const useCase = getUseCase(message)
  const ranked = sortRecommendations(list, { budget, useCase }).slice(0, 3)
  if (ranked.length === 0) return null

  const introBits = []
  if (budget != null) introBits.push(`budget around PHP ${budget.toLocaleString()}`)
  if (useCase) introBits.push(`${useCase} use`)

  const intro = introBits.length
    ? `Based on your ${introBits.join(" and ")}, here are my suggestions:`
    : "Here are my SPEEGO suggestions:"

  const lines = ranked.map((p) => {
    const stock = totalVariantStock(p)
    return `${p.name} (${productCode(p)}) - PHP ${Number(p.price || 0).toLocaleString()}${stock > 0 ? `, stock: ${stock}` : ", currently out of stock"}`
  })

  return `${intro} ${lines.join(" | ")}`
}

export function getProductAwareReply(message, products) {
  const list = Array.isArray(products) ? products : []
  if (list.length === 0) return null

  const asksPrice = hasAny(message, ["price", "cost", "how much", "pricing"])
  const asksStock = hasAny(message, ["stock", "available", "availability", "in stock", "remaining"])
  const asksColor = hasAny(message, ["color", "colours", "colors", "variant"])
  const asksList = hasAny(message, ["what bikes", "what models", "available models", "show products", "show bikes"])

  if (asksList && !asksPrice && !asksStock) {
    const names = list.slice(0, 6).map((p) => `${p.name} (${productCode(p)})`)
    return `Available SPEEGO models: ${names.join(", ")}${list.length > 6 ? ", and more in Shop." : "."}`
  }

  const product = findBestProductMatch(message, list)
  if (!product) return null

  const code = productCode(product)
  const variants = Array.isArray(product.product_color_stock) ? product.product_color_stock : []
  const totalStock = totalVariantStock(product)

  if (asksPrice && asksStock) {
    return `${product.name} (${code}) costs ${formatPrice(product.price)} and currently has ${totalStock} total stock${
      variants.length ? ` across colors` : ""
    }.`
  }

  if (asksPrice) {
    return `${product.name} (${code}) is priced at ${formatPrice(product.price)}.`
  }

  if (asksStock || asksColor) {
    if (variants.length > 0) {
      const perColor = variants
        .map((v) => `${v.color || "Variant"}: ${Number(v.stock || 0)}`)
        .join(", ")
      return `${product.name} (${code}) stock by color: ${perColor}. Total available: ${totalStock}.`
    }
    return `${product.name} (${code}) currently has ${totalStock} stock available.`
  }

  return null
}
