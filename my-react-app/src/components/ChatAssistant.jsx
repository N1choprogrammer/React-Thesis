// src/components/ChatAssistant.jsx
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import intents from "../chatbot/intents.json"
import { getSpeegoBotReply } from "../chatbot/engine"
import { useCart } from "../context/CartContext"
import {
  getCrossSellPriceReply,
  findProductMatch,
  getProductAwareReply,
  getRecommendationReply,
  getSimilarProductReply,
} from "../chatbot/productResponder"
import { getOrderStatusReply } from "../chatbot/orderResponder"
import { supabase } from "../services/supabaseClient"
import { requireCustomerProfile } from "../utils/requireCustomerProfile"

const EXTRA_MONTH_INTEREST_RATE = 0.0125
const MIN_CUSTOM_PAYMENT_MONTHS = 13
const MAX_CUSTOM_PAYMENT_MONTHS = 36

const sendMessageToOpenAI = async (
  message,
  products = [],
  conversationHistory = [],
  onChunk = null
) => {
  const startTime = performance.now()
  let firstTokenTime = null

  console.log("🤖 AI response started")

  const contactInfo = {
  shopName: "SPEEGO Talavera",
  location:
    "Maharlika Highway Brgy. Andal Alino, Talavera, Nueva Ecija, Philippines",
  phone: "0919-949-1986",
  email: "ianneclauren969@gmail.com",
  operatingHours: "Monday - Saturday, 9:00 AM - 5:00 PM",
  googleMaps: {
    available: true,
    label: "Open in Google Maps",
    url: "https://www.google.com/maps/search/?api=1&query=SpeeGo%20E-bikes%20Talavera%20Nueva%20Ecija",
  },
}

  const productContext = products.map((product) => {
    const downPayment = getDownPayment(product.price)
    const monthlyPayment = getMonthlyPayment(product.price, 6)

    return {
      id: product.id,
      short_id: product.short_id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      colors: product.product_color_stock || [],

      payment: {
        downPayment,
        months: 6,
        monthlyPayment,
      },
    }
  })

  console.log("AI Product Context:", productContext)
  console.log("Q5 Payment:", productContext.find((p) => p.name === "SPEEGO Q5")?.payment)

  const response = await fetch("https://react-thesis.onrender.com/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      products: productContext,
      contactInfo,
      conversationHistory,
    }),
  })

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`)
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this response.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let fullReply = ""
  let buffer = ""

  while (true) {
  const { value, done } = await reader.read()

  if (done) {
    break
  }

  buffer += decoder.decode(value, {
    stream: true,
  })

  const events = buffer.split("\n\n")

  buffer = events.pop() || ""

  for (const event of events) {
    if (!event.startsWith("data: ")) {
      continue
    }

    const json = event.slice(6)

    try {
      const parsed = JSON.parse(json)

      if (parsed.type === "text") {

  if (firstTokenTime === null) {
    firstTokenTime = performance.now()

    console.log(
      `⚡ First AI response received in ${(
        (firstTokenTime - startTime) /
        1000
      ).toFixed(2)} seconds`
    )
  }

  fullReply += parsed.text

  if (onChunk) {
    onChunk(fullReply)
  }
}

      if (parsed.type === "done") {
        break
      }
    } catch (error) {
      console.error("Failed to parse streaming event:", error)
    }
  }
}

const endTime = performance.now()

console.log(
  `✅ AI response completed in ${(
    (endTime - startTime) /
    1000
  ).toFixed(2)} seconds`
)

console.log(
  `📊 AI response length: ${fullReply.length} characters`
)

return fullReply
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function formatPeso(amount) {
  return `PHP ${Math.round(Number(amount || 0)).toLocaleString()}`
}

function getAvailableColors(product) {
  const variants = Array.isArray(product?.product_color_stock) ? product.product_color_stock : []
  return variants
    .map((variant) => ({
      color: String(variant?.color || "").trim(),
      stock: Number(variant?.stock || 0),
    }))
    .filter((variant) => Boolean(variant.color) && variant.stock > 0)
    .map((variant) => variant.color)
}

function getProductLink(product, color = null) {
  if (!product?.id) return null

  const params = new URLSearchParams({ product: String(product.id) })
  if (color) params.set("color", color)
  return `/shop?${params.toString()}`
}

function getProductLinks(product, color = null) {
  const href = getProductLink(product, color)
  if (!href) return []

  return [{ label: color ? `View ${product.name} in ${color}` : `View ${product.name}`, href }]
}

function getColorAliases(color) {
  const normalized = normalizeText(color)
  const aliasMap = {
    black: ["black", "dark"],
    white: ["white", "ivory"],
    blue: ["blue", "navy"],
    red: ["red", "maroon"],
    green: ["green", "lime"],
    yellow: ["yellow", "gold"],
    silver: ["silver", "gray", "grey"],
    gray: ["gray", "grey", "silver"],
    grey: ["grey", "gray", "silver"],
  }

  return Array.from(new Set([normalized, ...(aliasMap[normalized] || [])]))
}

const KNOWN_COLOR_ALIASES = [
  { color: "Black", aliases: ["black", "dark"] },
  { color: "White", aliases: ["white", "ivory"] },
  { color: "Blue", aliases: ["blue", "navy"] },
  { color: "Red", aliases: ["red", "maroon"] },
  { color: "Green", aliases: ["green", "lime"] },
  { color: "Yellow", aliases: ["yellow", "gold"] },
  { color: "Silver", aliases: ["silver", "gray", "grey"] },
  { color: "Gray", aliases: ["gray", "grey", "silver"] },
  { color: "Beige", aliases: ["beige", "cream"] },
  { color: "Aqua", aliases: ["aqua", "cyan"] },
]

function getRequestedColor(message) {
  const msg = normalizeText(message)
  const match = KNOWN_COLOR_ALIASES.find((entry) => entry.aliases.some((alias) => msg.includes(alias)))
  return match?.color || null
}

function getColorVariant(product, color) {
  const variants = Array.isArray(product?.product_color_stock) ? product.product_color_stock : []
  if (!variants.length || !color) return null

  const targetAliases = getColorAliases(color)
  return (
    variants.find((variant) => {
      const variantColor = normalizeText(variant?.color || "")
      return targetAliases.some((alias) => alias === variantColor || variantColor.includes(alias))
    }) || null
  )
}

function getColorPreference(message, product) {
  const msg = normalizeText(message)
  const variants = Array.isArray(product?.product_color_stock) ? product.product_color_stock : []
  const productColors = variants
    .map((variant) => String(variant?.color || "").trim())
    .filter(Boolean)

  if (!productColors.length) return null

  const exactMatch = productColors.find((color) => msg.includes(normalizeText(color)))
  if (exactMatch) return exactMatch

  for (const color of productColors) {
    const aliases = getColorAliases(color)
    if (aliases.some((alias) => msg.includes(alias))) return color
  }

  return getRequestedColor(message)
}

function getTotalStock(product) {
  const variants = Array.isArray(product?.product_color_stock) ? product.product_color_stock : []
  if (variants.length > 0) {
    return variants.reduce((sum, variant) => sum + Number(variant?.stock || 0), 0)
  }
  return Number(product?.stock || 0)
}

function getOrderIntent(message) {
  const msg = normalizeText(message)

  return (
    msg.includes("order ebike through speego ai") ||
    msg.includes("order an ebike through speego ai") ||
    msg.includes("order through speego ai") ||
    msg.includes("buy through speego ai") ||
    msg.includes("speego ai order") ||
    msg.includes("want to buy") ||
    msg.includes("i want to order") ||
    msg.includes("want to order") ||
    msg.includes("add to cart") ||
    msg.includes("add it to cart") ||
    msg.includes("add this to cart") ||
    msg.includes("add it to my cart") ||
    msg.includes("add this to my cart") ||
    msg.includes("put it in my cart") ||
    msg.includes("add this item to my cart") ||
    msg.includes("order one") ||
    msg.includes("order it") ||
    msg.includes("i want one") ||
    msg.includes("buy one") ||
    msg.includes("buy it") ||
    msg.includes("place an order") ||
    msg.includes("place order")
  )
}
function isCartConfirmation(message) {
  const msg = normalizeText(message)
  return (
    // Direct confirmations
    msg === "yes" ||
    msg === "yes please" ||
    msg === "yeah" ||
    msg === "yep" ||
    msg === "yup" ||
    msg === "sure" ||
    msg === "sure thing" ||
    msg === "okay" ||
    msg === "ok" ||
    msg === "alright" ||
    msg === "go ahead" ||

    // Add-to-cart requests
    msg.includes("add to cart") ||
    msg.includes("add it to cart") ||
    msg.includes("add this to cart") ||
    msg.includes("put it in my cart") ||
    msg.includes("put this in my cart") ||
    msg.includes("place it in my cart") ||
    
    "add to cart",
    "add it to cart",
    "add this to cart",
    "add that to cart",
    "put it in my cart",
    "put this in my cart",
    "put that in my cart",
    "add it",
    "add this",
    "add that",
    "i want it",
    "i'll take it",
    "ill take it",
    "yes add it",

    // Ordering confirmations
    msg.includes("i'll take it") ||
    msg.includes("ill take it") ||
    msg.includes("i want it") ||
    msg.includes("i'll take one") ||
    msg.includes("ill take one") ||
    msg.includes("i want one") ||
    msg.includes("i'll buy it") ||
    msg.includes("ill buy it") ||
    msg.includes("i want to buy it") ||
    msg.includes("i want to order it") ||
    msg.includes("let's order") ||
    msg.includes("lets order") ||
    msg.includes("go ahead and order") ||
    msg.includes("go ahead and add it") ||

    // Cart/order navigation
    msg.includes("proceed to cart") ||
    msg.includes("proceed with the order") ||
    msg.includes("order this") ||
    msg.includes("buy this") ||
    msg.includes("buy it") ||
    msg.includes("add this")
  )
}

function isInitialOrderPrompt(message) {
  const msg = normalizeText(message).replace(/-/g, " ").replace(/\s+/g, " ").trim()
  return (
    msg === "i want to order an e bike" ||
    msg === "i want to order an ebike" ||
    msg === "i want to buy an e bike" ||
    msg === "i want to buy an ebike" ||
    msg === "order an e bike through speego ai" ||
    msg === "order an ebike through speego ai" ||
    msg === "buy an e bike through speego ai" ||
    msg === "buy an ebike through speego ai" ||
    msg === "order an e bike" ||
    msg === "order an ebike" ||
    msg === "buy an e bike" ||
    msg === "buy an ebike" ||
    /^(i\s+)?(want to|would like to)?\s*(order|buy)( an?)?( e bike| ebike| electric bike)( through speego ai)?$/.test(msg) ||
    /^(order|buy)( an)?( e bike| ebike)?( through speego ai)?$/.test(msg)
  )
}

function getDownPayment(price) {
  return Math.ceil(Number(price || 0) * 0.2)
}
function getCurrentProduct(
  catalogProducts,
  aiOrderSession,
  matchedProduct,
  lastProductContextId
) {
  if (matchedProduct) {
    return matchedProduct
  }

  if (aiOrderSession?.productId) {
    const orderProduct = catalogProducts.find(
      (p) => p.id === aiOrderSession.productId
    )

    if (orderProduct) {
      return orderProduct
    }
  }

  if (lastProductContextId) {
    return catalogProducts.find(
      (p) => p.id === lastProductContextId
    )
  }

  return null
}

function getBudgetHint(message) {
  const msg = normalizeText(message)

  const directMatch = msg.match(/(?:budget|under|below|up to|around|about|less than|for|price|php)\s*(\d{2,6})(?:\s*(k|kphp|php))?/)
  if (directMatch) {
    let value = Number(directMatch[1])
    if (!Number.isFinite(value)) return null
    if (directMatch[2] === "k" || directMatch[2] === "kphp") value *= 1000
    return value
  }

  const sentenceMatch = msg.match(/budget\s+is\s*(\d{2,6})(?:\s*(k|kphp|php))?/)
  if (sentenceMatch) {
    let value = Number(sentenceMatch[1])
    if (!Number.isFinite(value)) return null
    if (sentenceMatch[2] === "k" || sentenceMatch[2] === "kphp") value *= 1000
    return value
  }

  return null
}

function inferWheelType(product) {
  const name = normalizeText(product?.name || "")
  if (name.includes("4 wheel") || name.includes("4wheel") || name.includes("four wheel")) return "4-wheel"
  if (name.includes("3 wheel") || name.includes("3wheel") || name.includes("three wheel")) return "3-wheel"
  if (name.includes("ecosada") || name.includes("eco sports") || name.includes("q5")) return "3-wheel"
  return null
}

function isProductPreferenceMessage(message) {
  const msg = normalizeText(message)
  return /(?:^|\s)(i\s+like|i\s+love|i\s+prefer|like|love|prefer|want something like|something like|similar to)/.test(msg)
}

function isSimilarPreferenceMessage(message) {
  const msg = normalizeText(message)
  return /\b(want something like|something like|similar to|alternative|instead|same as|like .* but|like .* cheaper|like .* lower price)\b/.test(msg)
}

function getSimilarPreferenceProducts(products, message, baseProduct) {
  const list = Array.isArray(products) ? products : []
  const msg = normalizeText(message)
  if (!baseProduct || !msg || !isSimilarPreferenceMessage(message)) return []

  const baseName = normalizeText(baseProduct?.name || "")
  const baseWheel = inferWheelType(baseProduct)
  const keywords = []

  if (baseName.includes("ecosada") || baseName.includes("sada")) {
    keywords.push("ecosada", "eco", "sada")
  }
  if (baseName.includes("q5")) keywords.push("q5")
  if (baseName.includes("eco")) keywords.push("eco")

  return list
    .filter((product) => product?.id !== baseProduct?.id)
    .filter((product) => {
      const name = normalizeText(product?.name || "")
      const wheelType = inferWheelType(product)
      const isSameWheel = !baseWheel || wheelType === baseWheel
      const matchesKeyword = keywords.some((keyword) => name.includes(keyword))
      const isCategoryMatch = baseWheel === "3-wheel" && wheelType === "3-wheel" && (name.includes("eco") || name.includes("q5") || name.includes("sada"))
      return isSameWheel && (matchesKeyword || isCategoryMatch)
    })
    .sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0))
    .slice(0, 3)
}

function getRecommendedProducts(products, message) {
  const list = Array.isArray(products) ? products : []
  if (list.length === 0) return []

  const signals = getPreferenceSignals(message)
  const budget = getBudgetHint(message)

  if (budget != null) {
    const scored = list
      .map((product) => {
        const price = Number(product?.price || 0)
        const difference = Math.abs(price - budget)
        const isUnderBudget = price <= budget
        let score = 0
        console.log("🤖 RECOMMENDATION SCORE")
        console.log("Product:", product.name)
        console.log("Score:", score)
        console.log("--------------------------------")
        if (isUnderBudget) score += 20
        score += Math.max(0, 12 - difference / 1000)

        if (signals.wantsThreeWheel || signals.wantsFourWheel) {
          const wheelType = inferWheelType(product)
          if (signals.wantsThreeWheel && wheelType === "3-wheel") score += 6
          if (signals.wantsFourWheel && wheelType === "4-wheel") score += 6
        }

        if (signals.mentionsType) {
          const name = normalizeText(product?.name || "")
          if ((signals.wantsBusiness || signals.wantsFamily) && isFourWheelSolarProduct(product)) score += 12
          if ((signals.wantsErrands || signals.wantsDelivery || signals.wantsCommuting) && inferWheelType(product) === "3-wheel") score += 8
          if (signals.wantsCommuting && (name.includes("eco sports") || name.includes("ecosada"))) score += 4
          if (signals.wantsErrands && (name.includes("ecosada") || name.includes("eco sports"))) score += 4
          if (signals.wantsDelivery && name.includes("q5")) score += 3
          if (name.includes("cargo") || name.includes("utility") || name.includes("family")) score += 2
          if (name.includes("solar")) score += 2
        }

        return { product, score }
      })
      .sort((a, b) => b.score - a.score)

    const topMatch = scored[0]
    const secondMatch = scored[1]

    if (!topMatch) return []

    const premiumOption = list
      .filter((product) => Number(product?.price || 0) > budget)
      .sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0))[0]

    const recommended = [topMatch.product]
    if (secondMatch?.product && secondMatch.product.id !== topMatch.product.id) {
      recommended.push(secondMatch.product)
    }
    if (premiumOption && !recommended.some((product) => product.id === premiumOption.id)) {
      recommended.push(premiumOption)
    }

    return recommended.slice(0, 3)
  }

  return list
    .map((product) => {
      const price = Number(product?.price || 0)
      const wheelType = inferWheelType(product)
      let score = 0

      if (signals.wantsThreeWheel && wheelType === "3-wheel") score += 8
      if (signals.wantsFourWheel && wheelType === "4-wheel") score += 8
      if (signals.mentionsType) {
        const name = normalizeText(product?.name || "")
        if ((signals.wantsBusiness || signals.wantsFamily) && isFourWheelSolarProduct(product)) score += 16
        if ((signals.wantsErrands || signals.wantsDelivery || signals.wantsCommuting) && wheelType === "3-wheel") score += 10
        if (signals.wantsCommuting && (name.includes("eco sports") || name.includes("ecosada"))) score += 4
        if (signals.wantsErrands && (name.includes("ecosada") || name.includes("eco sports"))) score += 5
        if (signals.wantsDelivery && name.includes("q5")) score += 3
        if (name.includes("solar")) score += 2
        if (name.includes("cargo") || name.includes("utility") || name.includes("family")) score += 2
      }
      if (price > 0 && !signals.mentionsBudget) score += 1

      return { product, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.product)
}

function getPreferenceSignals(message) {
  const msg = normalizeText(message)
  const signals = {
    wantsThreeWheel: msg.includes("3 wheel") || msg.includes("three wheel") || msg.includes("3 wheels") || msg.includes("three wheels"),
    wantsFourWheel: msg.includes("4 wheel") || msg.includes("four wheel") || msg.includes("4 wheels") || msg.includes("four wheels"),
    mentionsBudget: /\b(budget|price range|under|around|cheap|affordable|expensive)\b/.test(msg),
    wantsBusiness: /\b(business|small business|store|shop|commercial)\b/.test(msg),
    wantsFamily: /\b(family|parents|kids|children)\b/.test(msg),
    wantsErrands: /\b(errand|errands|grocery|groceries|market)\b/.test(msg),
    wantsDelivery: /\b(delivery|deliver|cargo)\b/.test(msg),
    wantsCommuting: /\b(commute|commuting|daily|city|work|school)\b/.test(msg),
    mentionsType: /\b(city|commute|commuting|cargo|family|utility|mountain|road|offroad|solar|sport|touring|delivery|business|errand|errands|grocery|groceries|market)\b/.test(msg),
  }

  return signals
}

function getMonthlyPayment(price, months = 6) {
  const downPayment = getDownPayment(price)
  const balance = Math.max(0, Number(price || 0) - downPayment)
  return balance > 0 ? balance / months : 0
}

function getPaymentPlanDetails(price, months = 6) {
  const safeMonths = Number.isFinite(Number(months)) ? Math.max(1, Math.round(Number(months))) : 6
  const downPayment = getDownPayment(price)
  const balance = Math.max(0, Number(price || 0) - downPayment)
  const extraMonths = Math.max(0, safeMonths - 6)
  const interestRate = extraMonths > 0 ? extraMonths * EXTRA_MONTH_INTEREST_RATE : 0
  const addedInterest = balance * interestRate
  const totalWithInterest = balance + addedInterest
  const monthlyPayment = totalWithInterest > 0 ? totalWithInterest / safeMonths : 0

  return {
    months: safeMonths,
    downPayment,
    balance,
    interestRate,
    addedInterest,
    totalWithInterest,
    monthlyPayment,
  }
}

function getRequestedPaymentMonths(message) {
  const msg = normalizeText(message)
  if (/\b(1 year|one year|12 months|twelve months|12 month)\b/.test(msg)) return 12
  if (/\b(9 months|nine months|9 month|nine month)\b/.test(msg)) return 9
  if (/\b(6 months|six months|6 month|six month)\b/.test(msg)) return 6

function getCurrentProduct(
  catalogProducts,
  aiOrderSession,
  matchedProduct
) {
  if (matchedProduct) return matchedProduct

  if (aiOrderSession?.productId) {
    return catalogProducts.find(
      (p) => p.id === aiOrderSession.productId
    )
  }

  return null
}

  const match = msg.match(/\b(?:pay for|payment plan for|plan for|for|over|in)\s*(\d{1,2})\s*(?:months?|mos?)\b/)
  if (!match) return null

  const months = Number(match[1])
  return Number.isFinite(months) ? months : null
}

function productSummary(product) {
  return `${product.name} - ${formatPeso(product.price)}`
}

function findProductByNameHint(products, pattern) {
  return (products || []).find((product) => pattern.test(normalizeText(product?.name || ""))) || null
}

function getOpenRecommendationProducts(products) {
  const list = Array.isArray(products) ? products : []
  const familyOrBusiness = list.find(isFourWheelSolarProduct)
  const budget = getCheapestProducts(list, 1)[0]
  const commuting = findProductByNameHint(list, /eco sports/) || list.find((product) => inferWheelType(product) === "3-wheel")
  const delivery = findProductByNameHint(list, /q5/) || list.find((product) => inferWheelType(product) === "3-wheel" && product?.id !== commuting?.id)

  return [familyOrBusiness, budget, commuting, delivery]
    .filter(Boolean)
    .filter((product, index, allProducts) => allProducts.findIndex((entry) => entry.id === product.id) === index)
}

function asksOpenEndedRecommendation(message) {
  const msg = normalizeText(message)
  return (
    /^(any\s+)?(other\s+|another\s+|more\s+)?recommendations?$/.test(msg) ||
    /^(can you\s+)?(recommend|suggest)( one| something)?$/.test(msg) ||
    /^(please\s+)?(recommend|suggest)( me)?( an?| some)?\s*(e bike|ebike|electric bike|bike)?$/.test(msg) ||
    /\b(any other recommendation|another recommendation|other recommendation|more recommendation)\b/.test(msg)
  )
}

function asksForAnotherRecommendation(message) {
  const msg = normalizeText(message)
  return /\b(any other|another|other recommendation|more recommendation|else)\b/.test(msg)
}

function getOpenEndedRecommendationReply(products, matchedProduct = null, message = "") {
  const list = Array.isArray(products) ? products : []
  const availableProducts = list.filter((product) => getTotalStock(product) > 0)
  const sourceProducts = availableProducts.length ? availableProducts : list
  if (!sourceProducts.length) return null

  if (matchedProduct && asksForAnotherRecommendation(message)) {
    const alternatives = sourceProducts
      .filter((product) => product.id !== matchedProduct.id)
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      .slice(0, 3)

    if (alternatives.length) {
      return {
        from: "bot",
        text: `Sure. Other options you can compare are: ${alternatives.map(productSummary).join(" | ")}. EcoSada is the budget-friendly choice, ECO SPORTS V2 works well for daily commuting, SPEEGO Q5 is a stronger 3-wheel option, and SpeeGo 4 Wheel Solar fits family or business use best.`,
      }
    }
  }

  const startingPoints = getOpenRecommendationProducts(sourceProducts)
  const fallback = sourceProducts.slice(0, 4)
  const options = startingPoints.length ? startingPoints : fallback

  return {
    from: "bot",
    text: `Sure. Good starting points are: ${options.map(productSummary).join(" | ")}. For family or business use, start with SpeeGo 4 Wheel Solar. For budget or errands, EcoSada V2 is a good pick. For commuting, ECO SPORTS V2 is practical. What will you use it for, or what budget are you working with?`,
  }
}

function _getProductFeatures(product, limit = 4) {
  const description = String(product?.description || "").trim()
  if (!description) return []

  return description
    .split(/\r?\n|[;•]/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => line.length > 2)
    .slice(0, limit)
}

function getCleanProductFeatures(product, limit = 4) {
  const description = String(product?.description || "").trim()
  if (!description) return []

  const lines = description
    .split(/\r?\n|[;•]/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => line.length > 2)
  const topFeaturesIndex = lines.findIndex((line) => normalizeText(line).includes("top features"))
  const featureLines = topFeaturesIndex >= 0 ? lines.slice(topFeaturesIndex + 1) : lines

  return featureLines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => !normalizeText(line).includes("top features"))
    .map((line) => (line.length > 95 ? `${line.slice(0, 92).trim()}...` : line))
    .slice(0, limit)
}

function getProductDescriptionSummary(product) {
  const description = String(product?.description || "").trim()
  const features = getCleanProductFeatures(product, 5)
  if (!description && features.length === 0) return "No description is listed for this model yet."

  const intro = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !normalizeText(line).includes("top features"))

  return [
    intro ? intro.replace(/\s+/g, " ").slice(0, 180) : null,
    features.length ? `Key features: ${features.join(" | ")}` : null,
  ].filter(Boolean).join(" ")
}

function getAvailableProductListText(products) {
  const list = Array.isArray(products) ? products : []
  return list.length ? list.map(productSummary).join(" | ") : "EcoSada V2, ECO SPORTS V2, SPEEGO Q5, and SpeeGo 4 Wheel Solar"
}

function getCheapestProducts(products, count = 3) {
  return [...(products || [])]
    .filter((product) => Number(product?.price || 0) > 0)
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    .slice(0, count)
}

function getProductsByWheel(products, wheelType) {
  return (products || []).filter((product) => inferWheelType(product) === wheelType)
}

function isFourWheelSolarProduct(product) {
  const name = normalizeText(product?.name || "")
  return (
    (name.includes("4 wheel") || name.includes("4wheel") || name.includes("four wheel") || name.includes("4 wheels") || name.includes("four wheels")) &&
    name.includes("solar")
  )
}

function mentionsFourWheelSolar(message) {
  const msg = normalizeText(message)
  return (
    msg.includes("speego 4 wheel solar") ||
    msg.includes("speego 4 wheels solar") ||
    msg.includes("4 wheel solar") ||
    msg.includes("4 wheels solar") ||
    msg.includes("4wheel solar") ||
    msg.includes("four wheel solar") ||
    msg.includes("four wheels solar")
  )
}

function getProductAliases(product) {
  const name = normalizeText(product?.name || "")
  const aliases = [name]

  if (name.includes("q5")) aliases.push("q5", "speego q5")
  if (isFourWheelSolarProduct(product)) {
    aliases.push("speego 4 wheel solar", "speego 4 wheels solar", "4 wheel solar", "4 wheels solar", "4wheel solar", "four wheel solar", "four wheels solar")
  }
  if (name.includes("eco sports")) aliases.push("eco sports", "ecosports")
  if (name.includes("ecosada") || name.includes("sada")) aliases.push("ecosada", "eco sada", "sada")
  if (name.includes("eco trip")) aliases.push("eco trip", "ecotrip")

  return Array.from(new Set(aliases.filter(Boolean))).sort((a, b) => b.length - a.length)
}

function findMentionedProducts(message, products) {
  const msg = normalizeText(message)
  const list = Array.isArray(products) ? products : []

  return list
    .map((product) => {
      const alias = getProductAliases(product).find((entry) => msg.includes(entry))
      return alias ? { product, index: msg.indexOf(alias) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.product)
}

function findCommonProductMatch(message, products) {
  const msg = normalizeText(message)
  const list = Array.isArray(products) ? products : []

  if (mentionsFourWheelSolar(msg)) {
    return list.find(isFourWheelSolarProduct) || null
  }

  if (/\b(q5|speego q5)\b/.test(msg)) {
    return list.find((product) => normalizeText(product?.name || "").includes("q5")) || null
  }

  if (msg.includes("eco sports") || msg.includes("ecosports")) {
    return list.find((product) => normalizeText(product?.name || "").includes("eco sports")) || null
  }

  if (msg.includes("eco sada") || msg.includes("ecosada") || msg.includes("sada")) {
    return list.find((product) => {
      const name = normalizeText(product?.name || "")
      return name.includes("ecosada") || name.includes("sada")
    }) || null
  }

  if (msg.includes("eco trip") || msg.includes("ecotrip")) {
    return list.find((product) => normalizeText(product?.name || "").includes("eco trip")) || null
  }

  return null
}

function asksAboutPayment(message) {
  return /\b(payment|pay|gcash|bank transfer|installment|monthly|month|down payment|plan|interest|hulugan)\b/.test(message)
}

function asksGeneralPaymentQuestion(message) {
  return /\b(gcash|bank transfer|accept|using bank|pay using|interest free|1 year|one year|9 months|nine months|12 months|twelve months|payment plan)\b/.test(message) ||
    getRequestedPaymentMonths(message) != null
}

function asksAboutAvailability(message) {
  return /\b(available|availability|stock|in stock|models|list|what.*bikes|electric bikes|e bikes|ebikes|3wheel|4wheel)\b/.test(message)
}

function asksForRecommendation(message) {
  return /\b(recommend|best|suggest|good for|for family|for delivery|for commuting|small business|cheapest|cheap|affordable|budget)\b/.test(message)
}

function asksForCheaperSimilar(message) {
  return /\b(similar|like|alternative|instead)\b/.test(message) && /\b(cheap|cheaper|affordable|lower price|less expensive)\b/.test(message)
}

function asksForSimilarProduct(message) {
  return /\b(similar|alternative|instead|same as|something like|like .* but|like .* cheaper|like .* lower price)\b/.test(message)
}

function asksToCompareProducts(message) {
  return /\b(compare|comparison|versus|vs|difference|different)\b/.test(message)
}

function asksForProductDescription(message) {
  return /\b(description|describe|features|feature|specs|specification|details)\b/.test(message)
}

function getRecommendationReason(message) {
  const msg = normalizeText(message)
  if (/\b(family|parents|kids|children)\b/.test(msg)) return "because the 4-wheel setup is more comfortable and stable for family use"
  if (/\b(business|small business|store|shop|commercial)\b/.test(msg)) return "because the 4-wheel setup is a stronger fit for business use"
  if (/\b(errand|errands|grocery|groceries|market)\b/.test(msg)) return "because the 3-wheel models are easier to use for errands"
  if (/\b(delivery|deliver|cargo)\b/.test(msg)) return "because the 3-wheel models are practical for delivery work"
  if (/\b(commute|commuting|daily|city|work|school)\b/.test(msg)) return "because it is a practical choice for daily commuting"
  return "based on what you asked for"
}

function asksAboutOrderProcess(message) {
  return /\b(what happens after|after i place|after placing|how does ordering work|order process|after order)\b/.test(message)
}

function asksAboutQuantity(message) {
  return /\b(two units|2 units|multiple units|more than one|order two|buy two|quantity)\b/.test(message)
}

function asksToCheckoutOrAdd(message) {
  return /\b(checkout|check out|add to cart|add .*cart|order|buy|purchase)\b/.test(message)
}

function isInformationalQuestion(message) {
  return (
    /^(what|which|do|does|can|is|are|any|how|has|where)\b/.test(message) ||
    asksAboutPayment(message) ||
    asksAboutAvailability(message) ||
    asksForRecommendation(message) ||
    asksAboutOrderProcess(message) ||
    asksAboutQuantity(message) ||
    asksForProductDescription(message) ||
    /\b(color|colors|available color|other colors)\b/.test(message)
  )
}

function asksImpossibleCapability(message) {
  return /\b(fly|flying|airborne|airplane|swim|underwater|100\s*(km|kph|kmh)|100km|100kph|100kmh|100\s*km\/h)\b/.test(message)
}

function asksProductDetails(message) {
  return /\b(color|colors|available color|stock|available|down payment|monthly|price|how much|info|information|description|describe|details|detail|show|spec|specs|specification|feature|features|product)\b/.test(message)
}

function mentionsProductName(message, product) {
  const msg = normalizeText(message)
  const name = normalizeText(product?.name || "")
  if (!msg || !name) return false
  if (msg.includes(name)) return true
  if (isFourWheelSolarProduct(product) && mentionsFourWheelSolar(msg)) return true
  return false
}

function getCommonQuestionReply(message, products, matchedProduct) {
  const msg = normalizeText(message)
  const list = Array.isArray(products) ? products : []
  const availableProducts = list.filter((product) => getTotalStock(product) > 0)
  const cheapestProducts = getCheapestProducts(availableProducts.length ? availableProducts : list)

  if (asksImpossibleCapability(msg)) {
    const visibleProducts = (availableProducts.length ? availableProducts : list).slice(0, 6)
    const capability = /\b(fly|flying|airborne|airplane)\b/.test(msg)
      ? "fly"
      : /\b(swim|underwater)\b/.test(msg)
        ? "go underwater"
        : "run at 100 km/h"

    return {
      from: "bot",
      text: `No, our e-bikes cannot ${capability}. They are made for normal road use. What we do have available are: ${getAvailableProductListText(visibleProducts)}.`,
    }
  }

  if (asksAboutOrderProcess(msg)) {
    return {
      from: "bot",
      text: "After you place an order, our manager reviews your payment proof, confirms the order, and updates the order status. You can track it anytime from My Orders.",
    }
  }

  if (asksAboutQuantity(msg)) {
    return {
      from: "bot",
      text: "Yes, you can order more than one unit if enough stock is available. Add the item to your cart, then adjust the quantity in the cart before checkout.",
    }
  }

  if (asksAboutPayment(msg)) {
    const requestedPaymentMonths = getRequestedPaymentMonths(msg)

    if (matchedProduct && requestedPaymentMonths) {
      const plan = getPaymentPlanDetails(matchedProduct.price, requestedPaymentMonths)
      const hasAddedInterest = plan.addedInterest > 0
      const customNote =
        requestedPaymentMonths > 12
          ? ` Custom plans are available from ${MIN_CUSTOM_PAYMENT_MONTHS} to ${MAX_CUSTOM_PAYMENT_MONTHS} months.`
          : ""

      return {
        from: "bot",
        text: `Yes, ${requestedPaymentMonths} months is okay for ${matchedProduct.name}.${customNote} Price is ${formatPeso(matchedProduct.price)}. Minimum down payment is ${formatPeso(plan.downPayment)}. ${hasAddedInterest ? `Added interest is ${formatPeso(plan.addedInterest)} for this plan.` : "The 6-month promo plan is interest-free."} Estimated ${requestedPaymentMonths}-month payment after down payment is ${formatPeso(plan.monthlyPayment)} per month. We accept GCash and bank transfer proof of payment.`,
      }
    }

    if (asksGeneralPaymentQuestion(msg)) {
      if (/\b(6 months|six months|6 month|six month|interest free)\b/.test(msg)) {
        return {
          from: "bot",
          text: "Yes. The 6-month payment plan is interest-free for the current promo. You only need the 20% minimum down payment first, then the remaining balance is divided across 6 months.",
        }
      }

      if (/\b(1 year|one year|12 months|twelve months)\b/.test(msg)) {
        return {
          from: "bot",
          text: "The 1-year payment plan is available, but it has added interest. The minimum down payment is still 20% of the order total, then the remaining balance is divided across 12 months.",
        }
      }

      if (/\b(9 months|nine months|9 month|nine month)\b/.test(msg)) {
        return {
          from: "bot",
          text: "The 9-month payment plan is available, but it includes added interest. The minimum down payment is 20%, then the remaining balance is divided across 9 months.",
        }
      }

      if (requestedPaymentMonths && requestedPaymentMonths > 12) {
        return {
          from: "bot",
          text: `Yes, a ${requestedPaymentMonths}-month custom payment plan is available as long as it is between ${MIN_CUSTOM_PAYMENT_MONTHS} and ${MAX_CUSTOM_PAYMENT_MONTHS} months. It includes added interest, and the minimum down payment is 20% of the order total. Tell me the model you want and I can estimate the monthly payment.`,
        }
      }

      if (/\b(gcash|bank transfer|pay using|using bank|accept)\b/.test(msg)) {
        return {
          from: "bot",
          text: "Yes, we accept GCash and bank transfer. After checkout, upload your proof of payment so our manager can verify it.",
        }
      }

      return {
        from: "bot",
        text: "Yes, we accept GCash and bank transfer. The 6-month plan is interest-free for the current promo, while the 9-month and 1-year plans include added interest. Minimum down payment is 20% of the order total.",
      }
    }

    if (matchedProduct) {
      return {
        from: "bot",
        text: `${matchedProduct.name} is ${formatPeso(matchedProduct.price)}. Minimum down payment is ${formatPeso(getDownPayment(matchedProduct.price))}. Estimated 6-month payment after down payment is ${formatPeso(getMonthlyPayment(matchedProduct.price))} per month. We accept GCash and bank transfer proof of payment.`,
      }
    }

    return {
      from: "bot",
      text: "We accept GCash and bank transfer. Minimum down payment is 20% of the order total. The 6-month plan is interest-free for the current promo; 9 months and 1 year include added interest.",
    }
  }

  if (msg.includes("order status") || msg.includes("where is my order") || msg.includes("my order")) {
    return null
  }

  if (asksToCompareProducts(msg)) {
    const comparedProducts = findMentionedProducts(msg, availableProducts.length ? availableProducts : list).slice(0, 2)

    if (comparedProducts.length >= 2) {
      const [firstProduct, secondProduct] = comparedProducts
      const cheaperProduct = Number(firstProduct.price || 0) <= Number(secondProduct.price || 0) ? firstProduct : secondProduct
      const higherPricedProduct = cheaperProduct.id === firstProduct.id ? secondProduct : firstProduct
      const firstFeatures = getCleanProductFeatures(firstProduct, 2)
      const secondFeatures = getCleanProductFeatures(secondProduct, 2)
      const firstColors = getAvailableColors(firstProduct)
      const secondColors = getAvailableColors(secondProduct)

      return {
        from: "bot",
        text: `${firstProduct.name} is ${formatPeso(firstProduct.price)} with ${firstColors.length ? firstColors.join(", ") : "listed"} colors. ${firstFeatures.length ? `Its highlights are ${firstFeatures.join(" and ")}.` : ""} ${secondProduct.name} is ${formatPeso(secondProduct.price)} with ${secondColors.length ? secondColors.join(", ") : "listed"} colors. ${secondFeatures.length ? `Its highlights are ${secondFeatures.join(" and ")}.` : ""} Overall, ${cheaperProduct.name} is better if budget matters. ${higherPricedProduct.name} costs ${formatPeso(Math.abs(Number(higherPricedProduct.price || 0) - Number(cheaperProduct.price || 0)))} more, so choose it if those extra features or its design fit you better.`,
        links: comparedProducts.flatMap((product) => getProductLinks(product)),
      }
    }
  }

  if (asksForCheaperSimilar(msg) && matchedProduct) {
    const cheaperOptions = (availableProducts.length ? availableProducts : list)
      .filter((product) => product.id !== matchedProduct.id && Number(product?.price || 0) < Number(matchedProduct.price || 0))
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      .slice(0, 3)

    if (cheaperOptions.length) {
      return {
        from: "bot",
        text: `Yes. If you want something cheaper than ${matchedProduct.name}, you can check: ${cheaperOptions.map(productSummary).join(" | ")}. Tell me which one you like and I can check the colors for you.`,
      }
    }
  }

  if (asksForSimilarProduct(msg) && matchedProduct) {
    const similarProducts = getSimilarPreferenceProducts(availableProducts.length ? availableProducts : list, msg, matchedProduct)

    if (similarProducts.length) {
      return {
        from: "bot",
        text: `Sure. Similar options to ${matchedProduct.name} are: ${similarProducts.map(productSummary).join(" | ")}. Tell me which one you want to compare and I can check colors and payment details.`,
        links: getProductLinks(similarProducts[0]),
      }
    }
  }

  if (asksOpenEndedRecommendation(msg)) {
    return getOpenEndedRecommendationReply(availableProducts.length ? availableProducts : list, matchedProduct, msg)
  }

  if (asksForRecommendation(msg) && matchedProduct && !mentionsProductName(msg, matchedProduct)) {
    const cheaperOptions = (availableProducts.length ? availableProducts : list)
      .filter((product) => product.id !== matchedProduct.id && Number(product?.price || 0) < Number(matchedProduct.price || 0))
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))

    if (cheaperOptions.length) {
      const bestOption = cheaperOptions[0]
      const secondOption = cheaperOptions[1]
      return {
        from: "bot",
        text: `For a cheaper option than ${matchedProduct.name}, I would recommend ${bestOption.name}. It is ${formatPeso(bestOption.price)}, so it is easier on the budget.${secondOption ? ` You can also compare it with ${secondOption.name} at ${formatPeso(secondOption.price)}.` : ""}`,
        links: getProductLinks(bestOption),
      }
    }
  }

  if (matchedProduct && asksForProductDescription(msg)) {
    return {
      from: "bot",
      text: `${matchedProduct.name}: ${getProductDescriptionSummary(matchedProduct)}`,
      links: getProductLinks(matchedProduct),
    }
  }

  if (matchedProduct && (getRequestedColor(msg) || asksProductDetails(msg) || mentionsProductName(msg, matchedProduct))) {
    const colors = getAvailableColors(matchedProduct)
    const stock = getTotalStock(matchedProduct)
    const requestedColor = getRequestedColor(msg)
    const requestedColorVariant = requestedColor ? getColorVariant(matchedProduct, requestedColor) : null

    if (requestedColor && (!requestedColorVariant || Number(requestedColorVariant?.stock || 0) <= 0)) {
      return {
        from: "bot",
        text: `The chosen color for ${matchedProduct.name} is not available. Please choose among the colors provided: ${colors.join(", ")}.`,
      }
    }

    const naturalIntro = /^is\b/.test(msg) || /\bavailable\b/.test(msg)
      ? `Yes, ${matchedProduct.name} is available.`
      : `${matchedProduct.name} is ${stock > 0 ? "available" : "currently out of stock"}.`

    return {
      from: "bot",
      text: `${naturalIntro} Price is ${formatPeso(matchedProduct.price)}, with colors ${colors.length ? colors.join(", ") : "not listed right now"}. Down payment starts at ${formatPeso(getDownPayment(matchedProduct.price))}, and the estimated 6-month payment is ${formatPeso(getMonthlyPayment(matchedProduct.price))} per month.`,
      links: getProductLinks(matchedProduct, requestedColorVariant?.color || null),
    }
  }

  if (msg.includes("cheapest") || msg.includes("cheap") || msg.includes("affordable")) {
    if (!cheapestProducts.length) return null
    const otherAffordable = cheapestProducts.slice(1).map(productSummary).join(" | ")
    return {
      from: "bot",
      text: `The cheapest available option is ${cheapestProducts[0].name} at ${formatPeso(cheapestProducts[0].price)}.${otherAffordable ? ` Other affordable choices are ${otherAffordable}.` : ""}`,
    }
  }

  if (!matchedProduct && (msg.includes("3 wheel") || msg.includes("three wheel") || msg.includes("3wheel"))) {
    const threeWheel = getProductsByWheel(availableProducts.length ? availableProducts : list, "3-wheel")
    return {
      from: "bot",
      text: threeWheel.length
        ? `For 3-wheel e-bikes, we have: ${threeWheel.map(productSummary).join(" | ")}.`
        : "I could not find available 3-wheel models right now.",
    }
  }

  if (!matchedProduct && (msg.includes("4 wheel") || msg.includes("four wheel") || msg.includes("4wheel"))) {
    const fourWheel = getProductsByWheel(availableProducts.length ? availableProducts : list, "4-wheel")
    return {
      from: "bot",
      text: fourWheel.length
        ? `For 4-wheel e-bikes, we have: ${fourWheel.map(productSummary).join(" | ")}.`
        : "I could not find available 4-wheel models right now.",
    }
  }

  if (asksForRecommendation(msg)) {
    const signals = getPreferenceSignals(msg)
    if (!signals.mentionsType && !signals.mentionsBudget && !signals.wantsThreeWheel && !signals.wantsFourWheel) {
      return getOpenEndedRecommendationReply(availableProducts.length ? availableProducts : list, null, msg)
    }

    const recommendations = getRecommendedProducts(list, message)
    if (recommendations.length > 0) {
      const top = recommendations[0]
      const comparisons = recommendations.slice(1).map(productSummary).join(" | ")
      const reason = getRecommendationReason(msg)
      return {
        from: "bot",
        text: `I would start with ${top.name} ${reason}. It is ${formatPeso(top.price)}.${comparisons ? ` You can also compare it with ${comparisons}.` : ""}`,
        links: getProductLinks(top),
      }
    }
  }

  if (asksAboutAvailability(msg)) {
    const visibleProducts = (availableProducts.length ? availableProducts : list).slice(0, 6)
    if (!visibleProducts.length) return null
    return {
      from: "bot",
      text: `Available e-bike models include: ${visibleProducts.map(productSummary).join(" | ")}${list.length > visibleProducts.length ? " | and more in the Shop page." : "."}`,
    }
  }

  return null
}

function getRequestedItemsFromMessage(message, products) {
  const msg = normalizeText(message)
  if (!asksToCheckoutOrAdd(msg)) return []

  const list = Array.isArray(products) ? products : []
  const mentions = []

  for (const product of list) {
    const name = normalizeText(product?.name || "")
    const aliases = []

    if (name.includes("q5")) aliases.push("q5", "speego q5")
    if (isFourWheelSolarProduct(product)) {
      aliases.push(
        "speego 4 wheel solar",
        "speego 4 wheels solar",
        "4 wheel solar",
        "4 wheels solar",
        "4wheel solar",
        "four wheel solar",
        "four wheels solar"
      )
    }
    if (name.includes("eco sports")) aliases.push("eco sports", "ecosports")
    if (name.includes("ecosada") || name.includes("sada")) aliases.push("ecosada", "eco sada", "sada")
    if (name.includes("eco trip")) aliases.push("eco trip", "ecotrip")
    aliases.push(name)

    const matchedAlias = aliases
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .find((alias) => msg.includes(alias))
    if (!matchedAlias) continue

    const aliasIndex = msg.indexOf(matchedAlias)
    mentions.push({ product, alias: matchedAlias, index: aliasIndex })
  }

  return mentions
    .sort((a, b) => a.index - b.index)
    .map((mention, index, sortedMentions) => {
      const nextMention = sortedMentions[index + 1]
      const segmentEnd = nextMention ? nextMention.index : msg.length
      const segment = msg.slice(mention.index, segmentEnd)
      const color = getRequestedColor(segment)

      return { product: mention.product, color }
    })
}

export default function ChatAssistant() {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: `Hello! I'm SpeeGo AI. I'll help you find the perfect e-bike.
To get started, tell me a bit about what you're looking for – for example:
- Your budget range (e.g. ₱39k, ₱68k)
- What you'll use it for (commuting, family, delivery)
- Or if you already have a specific model in mind.

What's most important to you?`,
    },
  ])
    const [sending, setSending] = useState(false)
    const [catalogProducts, setCatalogProducts] = useState([])
    const [typingFrame, setTypingFrame] = useState(0)
    const [lastProductContextId, setLastProductContextId] = useState(null)
    const lastProductContextIdRef = useRef(null)
    const [aiOrderSession, setAiOrderSession] = useState({
      step: "idle",
      productId: null,
      color: null,
      cartRequested: false,
    })

    useEffect(() => {
      const loadCatalog = async () => {
        let data = null
        let error = null

        const primary = await supabase
  .from("products")
  .select(`
    id,
    short_id,
    name,
    description,
    price,
    stock,
    is_active,
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

        if (error && String(error.message || "").toLowerCase().includes("is_active")) {
          const fallback = await supabase
  .from("products")
  .select(`
    id,
    short_id,
    name,
    description,
    price,
    stock,
    product_color_stock (
      id,
      color,
      stock,
      image_path
    )
  `)
          data = fallback.data
          error = fallback.error
        }

        if (error) {
          console.error("SpeeGo AI catalog load error:", error)
          return
        }

        setCatalogProducts(
    (data || [])
      .filter((p) => p?.is_active !== false)
      .map((product) => {
        const colorStock = Array.isArray(product.product_color_stock)
          ? product.product_color_stock
          : []

        const totalColorStock = colorStock.reduce(
          (total, color) => total + Number(color.stock || 0),
          0
        )

        return {
          ...product,
          stock: totalColorStock,
        }
      })
  )
      }

      loadCatalog()
    }, [])

    useEffect(() => {
      const handleProductContext = (event) => {
        const productId = event?.detail?.id || null
        if (productId) {
          lastProductContextIdRef.current = productId
          setLastProductContextId(productId)
        }
      }

      window.addEventListener("speego:product-context", handleProductContext)
      return () => window.removeEventListener("speego:product-context", handleProductContext)
    }, [])

    useEffect(() => {
      if (!sending) {
        return
      }

      const intervalId = setInterval(() => {
        setTypingFrame((prev) => (prev + 1) % 4)
      }, 420)

      return () => clearInterval(intervalId)
    }, [sending])

    const handleToggle = () => {
      setOpen((prev) => !prev)
    }

const addSelectedProductToCart = async (
  productIdOverride = null,
  colorOverride = null
) => {
  const currentProductId =
  productIdOverride ?? aiOrderSession?.productId

const currentColor =
  colorOverride ?? aiOrderSession?.color

const product = catalogProducts.find(
  (entry) => entry.id === currentProductId
)

if (!product) {
  return {
    ok: false,
    reply: {
      from: "bot",
      text: "I couldn’t find the selected bike. Tell me the model again and I’ll try once more.",
    },
  }
}

let variantId = null
let variantImagePath = null

if (currentColor) {
  const variant = getColorVariant(product, currentColor)

  if (!variant) {
    return {
      ok: false,
      reply: {
        from: "bot",
        text: `${currentColor} is not available for ${product.name}.`,
      },
    }
  }

  variantId = variant.id ?? null
  variantImagePath = variant.image_path ?? null

  console.log("🛒 AI VARIANT:", {
    productId: product.id,
    color: currentColor,
    variantId,
    imagePath: variantImagePath,
  })
}

const color = currentColor || null

const result = await addToCart(
  product,
  color,
  1,
  variantImagePath,
  variantId
)

  console.log("🛒 AI ADD TO CART RESULT:", result)

  if (result?.ok) {
  console.log("🧹 RESETTING AI ORDER SESSION AFTER CART ADD:", {
    productId: product.id,
    productName: product.name,
    color: currentColor,
  })

  setAiOrderSession({
    step: "idle",
    productId: null,
    color: null,
    cartRequested: false,
  })

  setLastProductContextId(null)
  lastProductContextIdRef.current = null

  navigate("/cart")

  return {
    ok: true,
    reply: {
      from: "bot",
      text: `${product.name}${currentColor ? ` in ${currentColor}` : ""} was added to your cart.`,
      links: [{ label: "View cart", href: "/cart" }],
    },
  }
}
  return {
    ok: false,
    reply: {
      from: "bot",
      text: "I couldn’t add that item to your cart right now. Please try again from the shop page.",
    },
  }
}


    const addRequestedItemsToCart = async (requestedItems) => {
      const items = Array.isArray(requestedItems) ? requestedItems : []
      if (items.length === 0) return null

      const missingColor = items.find((item) => {
        const availableColors = getAvailableColors(item.product)
        return availableColors.length > 0 && !item.color
      })

      if (missingColor) {
        return {
          from: "bot",
          text: `Please choose a color for ${missingColor.product.name}. Available colors: ${getAvailableColors(missingColor.product).join(", ")}.`,
          links: getProductLinks(missingColor.product),
        }
      }

      const unavailableColor = items.find((item) => {
        if (!item.color) return false
        const colorVariant = getColorVariant(item.product, item.color)
        return !colorVariant || Number(colorVariant?.stock || 0) <= 0
      })

      if (unavailableColor) {
        return {
          from: "bot",
          text: `The chosen color for ${unavailableColor.product.name} is not available. Please choose among the colors provided: ${getAvailableColors(unavailableColor.product).join(", ")}.`,
          links: getProductLinks(unavailableColor.product),
        }
      }

      const gate = await requireCustomerProfile()
      if (!gate.ok) {
        return {
          from: "bot",
          text: "Please complete your profile first so I can proceed to checkout.",
          links: [{ label: "Go to profile", href: "/profile" }],
        }
      }

const added = []

for (const item of items) {
  const color = item.color || null

  const colorVariant = color
    ? getColorVariant(item.product, color)
    : null

  const variantId = colorVariant?.id ?? null
  const imagePath = colorVariant?.image_path ?? null

  console.log("🛒 REQUESTED ITEM ADD:", {
    productId: item.product.id,
    productName: item.product.name,
    color,
    variantId,
    imagePath,
  })

  const result = await addToCart(
    item.product,
    color,
    1,
    imagePath,
    variantId
  )

  console.log("🛒 REQUESTED ITEM RESULT:", result)

  if (!result?.ok) {
    return {
      from: "bot",
      text: `I couldn't add ${item.product.name} to your cart right now. Please try again from the shop page.`,
    }
  }

  added.push(
    `${item.product.name}${color ? ` in ${color}` : ""}`
  )
}

      navigate("/cart")
      return {
        from: "bot",
        text: `${added.join(" and ")} ${added.length === 1 ? "was" : "were"} added to your cart.`,
        links: [{ label: "View cart", href: "/cart" }],
      }
    }

    const handleAddToCartFromBot = async (productIdOverride = null, colorOverride = null) => {
      setMessage("")
      setSending(true)
      const response = await addSelectedProductToCart(productIdOverride, colorOverride)
      setMessages((prev) => [...prev, response.reply])
      setSending(false)
    } 


      const handleSendMessage = async (rawMessage, options = {}) => {
        const { skipUserMessage = false } = options
        const userMsg = String(rawMessage || "").trim()
        if (!userMsg) return

        if (!skipUserMessage) {
          setMessages((prev) => [...prev, { from: "user", text: userMsg }])
        }
        setMessage("")
        setSending(true)

        try {
          const normalizedUserMsg = normalizeText(userMsg)
          const conversationHistory = messages.map((msg) => ({
            role: msg.from === "bot" ? "assistant" : "user",
            content: msg.text,
          }))
          const cartRequest =
        isCartConfirmation(userMsg) ||
        normalizedUserMsg.includes("add to cart") ||
        normalizedUserMsg.includes("add it to cart") ||
        normalizedUserMsg.includes("add that to cart") ||
        normalizedUserMsg.includes("add this to cart") ||
        normalizedUserMsg.includes("put it in my cart") ||
        normalizedUserMsg.includes("put that in my cart") ||
        normalizedUserMsg.includes("put this in my cart") ||
        normalizedUserMsg.includes("add it to my cart") ||
        normalizedUserMsg.includes("add that to my cart") ||
        normalizedUserMsg.includes("add this to my cart")
          console.log("🛒 CART DEBUG:", {
    userMsg,
    normalizedUserMsg,
    cartRequest,
    orderFlowStep: aiOrderSession?.step,
    productId: aiOrderSession?.productId,
    color: aiOrderSession?.color,
  })

  if (cartRequest) {
    console.log("🛒 CART HANDLER REACHED")
    const productId =
          aiOrderSession?.productId ||
          lastProductContextIdRef.current ||
          lastProductContextId

        const color = aiOrderSession?.color || null

        console.log("🛒 CART SELECTION:", {
          productId,
          color,
        })

        if (!productId) {
          setMessages((prev) => [
            ...prev,
            {
              from: "bot",
              text: "Please choose an e-bike first before adding it to your cart.",
            },
          ])

          setSending(false)
          return
        }

        const product = catalogProducts.find(
          (entry) => entry.id === productId
        )

        if (!product) {
          setMessages((prev) => [
            ...prev,
            {
              from: "bot",
              text: "I couldn't find that e-bike anymore. Please select the model again.",
            },
          ])

          setSending(false)
          return
        }

        const availableColors = getAvailableColors(product)

        // Product requires a color but customer hasn't selected one
        if (availableColors.length > 0 && !color) {
          console.log("🛒 COLOR REQUIRED:", availableColors)

          setAiOrderSession((prev) => ({
            ...prev,
            step: "awaiting_color",
            productId: product.id,
            color: null,
            cartRequested: true,
          }))

          setMessages((prev) => [
            ...prev,
            {
              from: "bot",
              text: `Sure! Which color would you like for ${product.name}? Available colors: ${availableColors.join(", ")}.`,
              links: getProductLinks(product),
            },
          ])

          setSending(false)
          return
        }

        // ============================================
        // ACTUALLY ADD TO CART
        // ============================================

        console.log("🛒 ADDING TO CART:", {
          productId: product.id,
          color,
        })

        const response = await addSelectedProductToCart(
          product.id,
          color
        )

        console.log("🛒 ADD TO CART RESPONSE:", response)

        setMessages((prev) => [
          ...prev,
          response.reply,
        ])

        setAiOrderSession({
          step: "idle",
        productId: null,
        color: null,
        cartRequested: false,
      })

      setSending(false)
      return
}

        const orderFlowActive = aiOrderSession.step !== "idle"
        const currentFlowProduct = aiOrderSession?.productId
  ? catalogProducts.find(
      (entry) => entry.id === aiOrderSession.productId
    )
  : null

const requestedFlowColor = currentFlowProduct
  ? getColorPreference(userMsg, currentFlowProduct)
  : null

const isColorMessage = Boolean(requestedFlowColor)

console.log("🎨 EARLY COLOR CHECK:", {
  userMsg,
  orderFlowStep: aiOrderSession?.step,
  product: currentFlowProduct?.name,
  requestedFlowColor,
  isColorMessage,
})
        const initialOrderPrompt = isInitialOrderPrompt(userMsg)
        const commonProductMatch = findCommonProductMatch(userMsg, catalogProducts)
        const directProductMatch = initialOrderPrompt ? null : commonProductMatch || findProductMatch(userMsg, catalogProducts)
        
        if (aiOrderSession?.step === "awaiting_color") { 
          const product = catalogProducts.find(
             (entry) => entry.id === aiOrderSession.productId ) 
             console.log("🎨 COLOR FLOW:", { 
              userMsg, 
              productId: aiOrderSession.productId, 
              productName: product?.name, 
              session: aiOrderSession, 
            }) 
            if (!product) { 
              setAiOrderSession({ 
                step: "idle", 
                productId: null, 
                color: null, 
                cartRequested: false, 
              }) 
              setMessages((prev) => [ 
                ...prev, 
                { 
                  from: "bot", 
                  text: "I lost the selected bike. Please tell me the model again.", },
                 ]) 
                 setSending(false) 
                 return 
                } 
                const availableColors = getAvailableColors(product) 
                const requestedColor = getColorPreference(userMsg, product) 

                console.log("🎨 COLOR DETECTION:", { 
                  userMsg, 
                  product: product.name, 
                  requestedColor, 
                  availableColors, 
                }) 
                if (requestedColor) { 
                  const colorVariant = getColorVariant(product, requestedColor) 
                  const requestedColorStock = Number(colorVariant?.stock || 0) 
                  
                  if (colorVariant && requestedColorStock > 0) { 
                    setAiOrderSession({ 
                      step: "ready", 
                      productId: product.id, 
                      color: requestedColor, 
                      cartRequested: false, 
                    }) 
                    console.log("✅ COLOR SAVED:", { 
                      productId: product.id, 
                      productName: product.name, 
                      color: requestedColor, 
                      stock: requestedColorStock, 
                    }) 
                    const downPayment = getDownPayment(product.price) 
                    const monthlyPayment = getMonthlyPayment(product.price) 
                    setMessages((prev) => [ 
                      ...prev, 
                      { from: "bot", 
text: `${product.name} in ${requestedColor} is available, with ${requestedColorStock} unit${ requestedColorStock === 1 ? "" : "s"
} currently in stock. 
Price: ${formatPeso(product.price)} 
Down payment: ${formatPeso(downPayment)} 
Estimated 6-month payment: ${formatPeso(monthlyPayment)} per month 
Would you like me to add it to your cart?`, 
                        links: getProductLinks(product, requestedColor), 
                        actions: [ 
                          { 
                            label: "Add to cart", 
                            onClick: () => 
                              handleAddToCartFromBot( 
                                product.id, 
                                requestedColor 
                              ), 
                          }, 
                        ], 
                      }, 
                    ])
                     setSending(false) 
                    return 
                  } setMessages((prev) => [ 
                    ...prev, 
                    { from: "bot", 
                      text: `${requestedColor} is currently out of stock for ${product.name}. Available colors: ${availableColors.join( 
                        ", " 
                      )}.`,
                      links: getProductLinks(product), 
                    }, 
                  ]) 
                  setSending(false) 
                  return 
                }  setMessages((prev) => [ 
                  ...prev, 
                  { from: "bot", 
                    text: `Please choose a color for ${product.name}. Available colors: ${availableColors.join(
                       ", " 
                      )}.`, 
                      links: getProductLinks(product), 
                    }, 
                  ]) 
                  setSending(false) 
                  return 
                }

        const contextProduct = catalogProducts.find(
          (entry) => entry.id === aiOrderSession.productId || entry.id === lastProductContextId
        )
      const matchedProduct =
        directProductMatch ||
        (isInformationalQuestion(normalizedUserMsg) ? contextProduct : null)

      if (matchedProduct) {
        lastProductContextIdRef.current = matchedProduct.id
        setLastProductContextId(matchedProduct.id)
      }

      const orderStatusReply = await getOrderStatusReply(userMsg, supabase)
      const requestedItems = getRequestedItemsFromMessage(userMsg, catalogProducts)
      const requestedMonths = getRequestedPaymentMonths(userMsg)
      function getCurrentProduct(
  catalogProducts,
  aiOrderSession,
  matchedProduct,
  lastProductContextId
) {
  // 1. Product explicitly identified in the current message
  if (matchedProduct) {
    return matchedProduct
  }

  // 2. Most recently established product in the conversation
  if (lastProductContextId) {
    const contextProduct = catalogProducts.find(
      (product) => product.id === lastProductContextId
    )

    if (contextProduct) {
      return contextProduct
    }
  }

  // 3. Product currently selected in the order flow
  if (aiOrderSession?.productId) {
    const sessionProduct = catalogProducts.find(
      (product) => product.id === aiOrderSession.productId
    )

    if (sessionProduct) {
      return sessionProduct
    }
  }

  return null
}
      function isPaymentQuestion(message) {
      const msg = normalizeText(message)

        return /down payment|monthly payment|per month|payment plan|installment|finance|financing|months|month/i.test(msg)
      }
      if (orderStatusReply) {
        const normalizedOrderReply =
          typeof orderStatusReply === "string"
            ? { from: "bot", text: orderStatusReply }
            : { from: "bot", ...(orderStatusReply || {}) }

        setMessages((prev) => [...prev, normalizedOrderReply])
        setSending(false)
        return
      }

      if (requestedItems.length > 0) {
        const requestedItemsReply = await addRequestedItemsToCart(requestedItems)
        const singleRequestedItem = requestedItems.length === 1 ? requestedItems[0] : null
        const shouldAwaitColor =
          singleRequestedItem &&
          getAvailableColors(singleRequestedItem.product).length > 0 &&
          (!singleRequestedItem.color || !getColorVariant(singleRequestedItem.product, singleRequestedItem.color))

        setAiOrderSession(
          shouldAwaitColor
            ? {
                step: "awaiting_color",
                productId: singleRequestedItem.product.id,
                color: null,
                cartRequested: true,
              }
            : {
                step: "idle",
                productId: null,
                color: null,
                cartRequested: false,
              }
        )
        setMessages((prev) => [...prev, requestedItemsReply])
        setSending(false)
        return
      }
      const currentProduct = getCurrentProduct(
  catalogProducts,
  aiOrderSession,
  matchedProduct,
  lastProductContextIdRef.current || lastProductContextId
)

if (
  isPaymentQuestion(userMsg) &&
  currentProduct
) {
  const months = requestedMonths || 6

  const payment = getPaymentPlanDetails(
    currentProduct.price,
    months
  )

  let reply = `For the **${currentProduct.name} (${formatPeso(currentProduct.price)})**:

- Down payment: **${formatPeso(payment.downPayment)}**
- Remaining balance: **${formatPeso(payment.balance)}**
- **Estimated ${months}-month payment: ${formatPeso(payment.monthlyPayment)}/month**`

  if (payment.addedInterest > 0) {
    reply += `
- Estimated added interest: **${formatPeso(payment.addedInterest)}**`
  }

  reply += `

*This is an estimate based on the current payment calculation.*`

  setMessages((prev) => [
    ...prev,
    {
      from: "bot",
      text: reply,
    },
  ])

  setSending(false)
  return
}
if (cartRequest) {
  const productId =
    aiOrderSession?.productId ||
    matchedProduct?.id ||
    lastProductContextIdRef.current ||
    lastProductContextId

  if (!productId) {
    setMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text: "Please choose an e-bike first before adding it to your cart.",
      },
    ])

    setSending(false)
    return
  }

  const product = catalogProducts.find(
    (entry) => entry.id === productId
  )

  if (!product) {
    setMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text: "I couldn't find that e-bike anymore. Please select the model again.",
      },
    ])

    setSending(false)
    return
  }

  const color = aiOrderSession?.color || null
  const availableColors = getAvailableColors(product)

  if (availableColors.length > 0 && !color) {
    setAiOrderSession((prev) => ({
      ...prev,
      step: "awaiting_color",
      productId: product.id,
      color: null,
      cartRequested: true,
    }))

    setMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text: `Sure! Which color would you like for ${product.name}? Available colors: ${availableColors.join(", ")}.`,
        links: getProductLinks(product),
      },
    ])

    setSending(false)
    return
  }

  const response = await addSelectedProductToCart(
    product.id,
    color
  )

  setMessages((prev) => [
    ...prev,
    response.reply,
  ])

  setAiOrderSession({
    step: "idle",
    productId: null,
    color: null,
    cartRequested: false,
  })

  setSending(false)
  return
}
const shouldUseGenerativeAI =
  !cartRequest &&
  !initialOrderPrompt &&
  !orderFlowActive &&
  !getOrderIntent(userMsg) &&
  !directProductMatch

console.log(
  "🤖 GENERATIVE DECISION:",
  JSON.stringify(
    {
      userMsg,
      cartRequest,
      initialOrderPrompt,
      orderFlowActive,
      orderIntent: getOrderIntent(userMsg),
      directProductMatch: directProductMatch
        ? {
            id: directProductMatch.id,
            name: directProductMatch.name,
          }
        : null,
      shouldUseGenerativeAI,
    },
    null,
    2
  )
)

if (shouldUseGenerativeAI) {
  try {
    console.log("🚨 OPENAI CALL #1")
    const aiReply = await sendMessageToOpenAI(
      userMsg,
      catalogProducts,
      conversationHistory,
      (streamedText) => {
        setMessages((prev) => {
          const updated = [...prev]
          const lastMessage = updated[updated.length - 1]

          if (lastMessage?.from === "bot" && lastMessage?.streaming) {
            updated[updated.length - 1] = {
              ...lastMessage,
              text: streamedText,
            }
          } else {
            updated.push({
              from: "bot",
              text: streamedText,
              streaming: true,
            })
          }

          return updated
        })
      }
    )

    setSending(false)
    return
  } catch (error) {
    console.error("OpenAI generative response failed:", error)
  }
}
const startsProductSelection =
  !!directProductMatch &&
  !cartRequest &&
  !orderFlowActive

const isExistingConversationProductMention =
  !!directProductMatch &&
  orderFlowActive &&
  !cartRequest

        console.log("🛒 PRODUCT SELECTION:", 
          { userMsg, 
            startsProductSelection, 
            directProductMatch: directProductMatch 
            ? { 
              id: directProductMatch.id, 
              name: directProductMatch.name, 
            } : 
            null, 
          })
const isExistingFlowGenerativeMessage =
  orderFlowActive &&
  !cartRequest &&
  !isColorMessage


          if (startsProductSelection) { 
            const product = directProductMatch
            lastProductContextIdRef.current = product.id 
            setLastProductContextId(product.id)

            setAiOrderSession({ 
              step: "awaiting_color", 
              productId: product.id, 
              color: null, 
              cartRequested: false, 
            })

            console.log("💾 SAVING PRODUCT FOR COLOR:", 
              { productId: product.id, 
                productName: product.name, 
                step: "awaiting_color", 
              })

              try { 
                console.log("🚨 OPENAI PRODUCT RESPONSE") 
                await sendMessageToOpenAI( 
                  userMsg, 
                  catalogProducts, 
                  conversationHistory, 
                  (streamedText) => { 
                    setMessages((prev) => { 
                      const updated = [
                        ...prev] 
                        const lastMessage = updated[updated.length - 1]
                        if (lastMessage?.from === "bot" && lastMessage?.streaming) { 
                          updated[updated.length - 1] = { 
                            ...lastMessage, 
                            text: streamedText, 
                          }
                          } else { 
                            updated.push({ 
                              from: "bot", 
                              text: streamedText, 
                              streaming: true, 
                            }) 
                          } 
                          return updated 
                        }) 
                      } 
                    )

                    setSending(false) 
                    return 
                  } catch (error) { 
                    console.error( "OpenAI product response failed:", error )

                    const fallbackReply = getCommonQuestionReply( normalizedUserMsg, catalogProducts, product )

                    if (fallbackReply) { 
                      setMessages((prev) => [ 
                        ...prev, fallbackReply, 
                      ]) 
                    } 
                    setSending(false) 
                    return 
                  } 
                  }
      if (!initialOrderPrompt && (!getOrderIntent(userMsg) || isInformationalQuestion(normalizedUserMsg))) {
        const commonQuestionReply = getCommonQuestionReply(normalizedUserMsg, catalogProducts, matchedProduct)

        

        if (commonQuestionReply) {
          if (matchedProduct?.id) {
            setLastProductContextId(matchedProduct.id)
            setAiOrderSession({
              step: "awaiting_color",
              productId: matchedProduct.id,
              color: null,
              cartRequested: false,
            })
          } else if (isInformationalQuestion(normalizedUserMsg)) {
            setAiOrderSession({
              step: "idle",
              productId: null,
              color: null,
              cartRequested: false,
            })
          }
          setMessages((prev) => [...prev, commonQuestionReply])
          setSending(false)
          return
        }
        if (!directProductMatch && !matchedProduct) {
          try {
            console.log("🚨 OPENAI FALLBACK")
            await sendMessageToOpenAI(
              userMsg,
              catalogProducts,
              conversationHistory,
              (streamedText) => {
                setMessages((prev) => {
                  const updated = [...prev]
                  const lastMessage = updated[updated.length - 1]

                  if (lastMessage?.from === "bot" && lastMessage?.streaming) {
                    updated[updated.length - 1] = {
                      ...lastMessage,
                      text: streamedText,
                    }
                  } else {
                    updated.push({
                      from: "bot",
                      text: streamedText,
                      streaming: true,
                    })
                  }

                  return updated
                })
              }
            )
            setSending(false)
            return
          } catch (error) {
            console.error("OpenAI generative fallback failed:", error)
          }
        }
      }

      if (isExistingConversationProductMention) {
  console.log("🤖 EXISTING FLOW PRODUCT MENTION — USING OPENAI:", {
    userMsg,
    product: directProductMatch.name,
  })

  try {
    await sendMessageToOpenAI(
      userMsg,
      catalogProducts,
      conversationHistory,
      (streamedText) => {
        setMessages((prev) => {
          const updated = [...prev]
          const lastMessage = updated[updated.length - 1]

          if (lastMessage?.from === "bot" && lastMessage?.streaming) {
            updated[updated.length - 1] = {
              ...lastMessage,
              text: streamedText,
            }
          } else {
            updated.push({
              from: "bot",
              text: streamedText,
              streaming: true,
            })
          }

          return updated
        })
      }
    )

    setSending(false)
    return
  } catch (error) {
    console.error(
      "OpenAI existing-flow product response failed:",
      error
    )
  }
}
if (isExistingFlowGenerativeMessage) {
  console.log("🚨 OPENAI EXISTING FLOW RESPONSE")

  try {
    await sendMessageToOpenAI(
      userMsg,
      catalogProducts,
      conversationHistory,
      (streamedText) => {
        setMessages((prev) => {
          const updated = [...prev]
          const lastMessage = updated[updated.length - 1]

          if (lastMessage?.from === "bot" && lastMessage?.streaming) {
            updated[updated.length - 1] = {
              ...lastMessage,
              text: streamedText,
            }
          } else {
            updated.push({
              from: "bot",
              text: streamedText,
              streaming: true,
            })
          }

          return updated
        })
      }
    )

    setSending(false)
    return
  } catch (error) {
    console.error("OpenAI existing flow response failed:", error)
  }
}

const startsOrderFlow =
  !cartRequest &&
  (
    initialOrderPrompt ||
    getOrderIntent(userMsg) ||
    orderFlowActive
  )
  console.log(
  "🛒 ORDER FLOW DECISION:",
  JSON.stringify(
    {
      userMsg,
      startsOrderFlow,
      initialOrderPrompt,
      orderIntent: getOrderIntent(userMsg),
      orderFlowActive,
      directProductMatch: directProductMatch
        ? {
            id: directProductMatch.id,
            name: directProductMatch.name,
          }
        : null,
    },
    null,
    2
  )
)

      if (startsOrderFlow || initialOrderPrompt) {
        const nextSession = { ...aiOrderSession }
        let botReply = null
        const incomingProductMatch = initialOrderPrompt ? null : directProductMatch

        if (cartRequest) {
        nextSession.cartRequested = true
      }

        if (initialOrderPrompt) {
          nextSession.step = "awaiting_product"
          nextSession.productId = null
          nextSession.color = null
          nextSession.cartRequested = false
          botReply = {
            from: "bot",
            text: "I’d be happy to help you shop for an e-bike. Tell me what you want, your budget, or how you’ll use it, and I’ll guide you to the best fit.",
          }
        } else if (incomingProductMatch?.id && (incomingProductMatch.id !== nextSession.productId || !isSimilarPreferenceMessage(userMsg))) {
          nextSession.step = "awaiting_color"
          nextSession.productId = incomingProductMatch.id
          nextSession.color = null
          nextSession.cartRequested = false
          const availableColors = getAvailableColors(incomingProductMatch)
          const stock = getTotalStock(incomingProductMatch)
          const downPayment = getDownPayment(incomingProductMatch.price)
          const monthlyPayment = getMonthlyPayment(incomingProductMatch.price)
          botReply = {
            from: "bot",
            text: `${incomingProductMatch.name} is ${stock > 0 ? "available" : "currently out of stock"}. ${availableColors.length > 0 ? `Available colors: ${availableColors.join(", ")}.` : "No color variants are listed right now."} Down payment: ${formatPeso(downPayment)}. Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}.`,
            links: getProductLinks(incomingProductMatch),
          }
        } else if (isProductPreferenceMessage(userMsg) && incomingProductMatch?.id) {
          const similarPreferenceProducts = getSimilarPreferenceProducts(catalogProducts, userMsg, incomingProductMatch)
          if (similarPreferenceProducts.length > 0) {
            nextSession.step = "awaiting_product"
            nextSession.productId = null
            nextSession.color = null
            const firstOption = similarPreferenceProducts[0]
            const secondOption = similarPreferenceProducts[1]
            const firstOptionColors = getAvailableColors(firstOption)
            const firstOptionDownPayment = getDownPayment(firstOption.price)
            const firstOptionMonthlyPayment = getMonthlyPayment(firstOption.price)
            const otherOptions = [firstOption, secondOption].filter(Boolean)
            const optionsText = otherOptions
              .map((option) => {
                const colors = getAvailableColors(option)
                return `${option.name} - ${formatPeso(option.price)}${colors.length > 0 ? `, colors: ${colors.join(", ")}` : ""}, down payment: ${formatPeso(getDownPayment(option.price))}, estimated 6-month payment: ${formatPeso(getMonthlyPayment(option.price))}`
              })
              .join(" | ")

            botReply = {
              from: "bot",
              text: `Similar alternatives to ${incomingProductMatch.name}: ${optionsText || `${firstOption.name} with ${firstOptionColors.length > 0 ? `colors ${firstOptionColors.join(", ")}` : "available color options"}, down payment ${formatPeso(firstOptionDownPayment)}, estimated 6-month payment ${formatPeso(firstOptionMonthlyPayment)}`}.`,
            }
          } else {
            nextSession.step = "awaiting_product"
            nextSession.productId = null
            nextSession.color = null
            botReply = {
              from: "bot",
              text: `${incomingProductMatch.name} is available. Down payment: ${formatPeso(getDownPayment(incomingProductMatch.price))}. Estimated monthly payment for a 6-month plan: ${formatPeso(getMonthlyPayment(incomingProductMatch.price))}.`,
            }
          }
        } else if (getOrderIntent(userMsg) && aiOrderSession.step === "idle") {
          nextSession.step = "awaiting_product"
          nextSession.productId = null
          nextSession.color = null
          botReply = {
            from: "bot",
            text: "I’d be happy to help you shop for an e-bike. Tell me what you want, your budget, or how you’ll use it, and I’ll guide you to the best fit.",
          }
        } else if (nextSession.step === "awaiting_product") {
          const matchedProduct = incomingProductMatch
          const requestedMonths =
            getRequestedPaymentMonths(userMsg)

          const preferenceSignals = getPreferenceSignals(userMsg)
          const recommendations = getRecommendedProducts(catalogProducts, userMsg)

          if (!matchedProduct && !preferenceSignals.wantsThreeWheel && !preferenceSignals.wantsFourWheel && !preferenceSignals.mentionsBudget && !preferenceSignals.mentionsType) {
            botReply = {
              from: "bot",
              text: "I can help you choose one. Tell me what kind of ride you want, your budget, or whether you prefer a 3-wheel or 4-wheel option.",
            }
          } else if (!matchedProduct) {
            if (recommendations.length > 0) {
              const listText = recommendations.map((product) => `${product.name} — ${formatPeso(product.price)}`).join(" | ")
              botReply = {
                from: "bot",
                text: `I can help narrow it down. Based on your preference, I’d suggest: ${listText}. Tell me which one you like best, or share your preferred color and I’ll help you choose.`,
              }
            } else {
              botReply = {
                from: "bot",
                text: "I can help narrow it down. What type of electric bike do you prefer, or what is your budget for it?",
              }
            }
          } else {
            nextSession.step = "awaiting_color"
            nextSession.productId = matchedProduct.id
            nextSession.color = null
            nextSession.cartRequested = false
            const availableColors = getAvailableColors(matchedProduct)
            const stock = getTotalStock(matchedProduct)
            const downPayment = getDownPayment(matchedProduct.price)
            const monthlyPayment = getMonthlyPayment(matchedProduct.price)
            botReply = {
              from: "bot",
              text: `${matchedProduct.name} is ${stock > 0 ? "available" : "currently out of stock"}. ${availableColors.length > 0 ? `Available colors: ${availableColors.join(", ")}.` : "No color variants are listed right now."} Down payment: ${formatPeso(downPayment)}. Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}. Tell me the color you want, or I can recommend one if it is not available.`,
              links: getProductLinks(matchedProduct),
            }
          }
        } else if (
  (nextSession.step === "awaiting_color" || nextSession.step === "ready") &&
  isColorMessage
) {
            console.log("🟣 AWAITING COLOR BRANCH REACHED", {
    userMsg,
    sessionStep: nextSession.step,
    productId: nextSession.productId,
    cartRequested: nextSession.cartRequested,
    sessionColor: nextSession.color,
  })
  const product = catalogProducts.find(
    (entry) => entry.id === nextSession.productId
  )

  const preferenceSignals = getPreferenceSignals(userMsg)

  if (!product) {
    nextSession.step = "awaiting_product"
    nextSession.productId = null
    nextSession.color = null
    nextSession.cartRequested = false

    botReply = {
      from: "bot",
      text: "I lost the selected bike. Tell me the model you want again, and I’ll continue from there.",
    }
  } else {
    const requestedColor = getColorPreference(userMsg, product)
    const availableColors = getAvailableColors(product)
    console.log("🎨 COLOR DEBUG:", {
  userMsg,
  productId: product?.id,
  productName: product?.name,
  requestedColor,
  availableColors,
  currentSession: aiOrderSession,
})
if (nextSession.step === "ready" && !requestedColor) {
  console.log("🎨 READY STATE — NOT A COLOR, USING OPENAI:", {
    userMsg,
    product: product.name,
  })

  try {
    await sendMessageToOpenAI(
      userMsg,
      catalogProducts,
      conversationHistory,
      (streamedText) => {
        setMessages((prev) => {
          const updated = [...prev]
          const lastMessage = updated[updated.length - 1]

          if (lastMessage?.from === "bot" && lastMessage?.streaming) {
            updated[updated.length - 1] = {
              ...lastMessage,
              text: streamedText,
            }
          } else {
            updated.push({
              from: "bot",
              text: streamedText,
              streaming: true,
            })
          }

          return updated
        })
      }
    )

    setSending(false)
    return
  } catch (error) {
    console.error("OpenAI ready-state response failed:", error)
  }
}
// Customer is currently choosing a color,
// but this message is NOT a color.
// Let generative AI handle normal conversation instead.
if (!requestedColor) {
  console.log("🎨 NO COLOR DETECTED — USING GENERATIVE AI:", {
    userMsg,
    product: product.name,
  })

  try {
    console.log("🚨 OPENAI NON-COLOR RESPONSE")

    await sendMessageToOpenAI(
      userMsg,
      catalogProducts,
      conversationHistory,
      (streamedText) => {
        setMessages((prev) => {
          const updated = [...prev]
          const lastMessage = updated[updated.length - 1]

          if (lastMessage?.from === "bot" && lastMessage?.streaming) {
            updated[updated.length - 1] = {
              ...lastMessage,
              text: streamedText,
            }
          } else {
            updated.push({
              from: "bot",
              text: streamedText,
              streaming: true,
            })
          }

          return updated
        })
      }
    )

    setSending(false)
    return
  } catch (error) {
    console.error("OpenAI non-color response failed:", error)

    setSending(false)
    return
  } 
}

    const stock = getTotalStock(product)
    const colorVariant = getColorVariant(product, requestedColor)

    const requestedColorIsAvailable = Boolean(
      requestedColor &&
      colorVariant &&
      Number(colorVariant?.stock || 0) > 0
    )

    const requestedColorStock = colorVariant
      ? Number(colorVariant?.stock || 0)
      : 0

    // Customer changed their preferences
    if (
      preferenceSignals.mentionsBudget ||
      preferenceSignals.mentionsType ||
      preferenceSignals.wantsThreeWheel ||
      preferenceSignals.wantsFourWheel
    ) {
      nextSession.step = "awaiting_product"
      nextSession.productId = null
      nextSession.color = null
      nextSession.cartRequested = false

      botReply = {
        from: "bot",
        text: "I can help narrow it down. What type of electric bike do you prefer, or what is your budget?",
      }

    // Product has no colors
    } else if (!availableColors.length) {
      nextSession.color = null

      if (nextSession.cartRequested && stock > 0) {
        const response = await addSelectedProductToCart(
          product.id,
          requestedColor
        )

        botReply = response.reply

        nextSession.step = "idle"
        nextSession.productId = null
        nextSession.color = null
        nextSession.cartRequested = false
      } else {
        nextSession.step = "ready"

        const downPayment = getDownPayment(product.price)
        const monthlyPayment = getMonthlyPayment(product.price)

        botReply = {
          from: "bot",
          text: `${product.name} is ${
            stock > 0 ? "available" : "currently out of stock"
          }. Down payment: ${formatPeso(
            downPayment
          )}. Estimated monthly payment for a 6-month plan: ${formatPeso(
            monthlyPayment
          )}. You can add this item to your cart when you are ready.`,

          links: getProductLinks(product),

          actions: [
            {
              label: "Add to cart",
              onClick: () =>
                handleAddToCartFromBot(
                  product.id,
                  null
                ),
            },
          ],
        }
      }

    // Requested color exists and has stock
    } else if (requestedColorIsAvailable) {
      console.log("✅ COLOR AVAILABLE:", {
  requestedColor,
  requestedColorIsAvailable,
  requestedColorStock,
})
      nextSession.color = requestedColor
      console.log("🎨 COLOR SAVED TO SESSION:", {
  productId: nextSession.productId,
  color: nextSession.color,
  step: nextSession.step,
})
      const downPayment = getDownPayment(product.price)
      const monthlyPayment = getMonthlyPayment(product.price)

      console.log("🟢 COLOR DECISION", {
  requestedColor,
  requestedColorIsAvailable,
  requestedColorStock,
  cartRequested: nextSession.cartRequested,
  productId: product.id,
})

  botReply = {
    from: "bot",

    text: `${product.name} in ${requestedColor} is available. ${requestedColorStock} left in stock.

Down payment: ${formatPeso(downPayment)}.
Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}/month.

Would you like to add it to your cart?`,

    links: getProductLinks(
      product,
      requestedColor
    ),

    actions: [
      {
        label: "Add to cart",
        onClick: () =>
          handleAddToCartFromBot(
            product.id,
            requestedColor
          ),
            },
          ],
        }

    // Requested color doesn't exist / is out of stock
    } else if (requestedColor) {
      nextSession.step = "awaiting_color"
      nextSession.color = null

      botReply = {
        from: "bot",
        text: `The chosen color for ${product.name} is not available. Please choose among the colors provided: ${availableColors.join(
          ", "
        )}.`,
      }

    // No color understood
    } else {
      nextSession.step = "awaiting_color"
      nextSession.color = null

      const downPayment = getDownPayment(product.price)
      const monthlyPayment = getMonthlyPayment(product.price)

      botReply = {
        from: "bot",
        text: `${product.name} is ${
          stock > 0 ? "available" : "currently out of stock"
        }. Available colors: ${availableColors.join(
          ", "
        )}. Down payment: ${formatPeso(
          downPayment
        )}. Estimated monthly payment for a 6-month plan: ${formatPeso(
          monthlyPayment
        )}. Please tell me which color you want before I add it to your cart.`,

        links: getProductLinks(product),
      }
    }
  }
} else if (nextSession.step === "ready") {
  if (cartRequest) {
    const response = await addSelectedProductToCart(
      nextSession.productId,
      nextSession.color
    )

    botReply = response.reply

    nextSession.step = "idle"
    nextSession.productId = null
    nextSession.color = null
    nextSession.cartRequested = false
  } else {
    nextSession.step = "idle"
    nextSession.productId = null
    nextSession.color = null
    nextSession.cartRequested = false

    botReply = {
      from: "bot",
      text: "Sure. Ask me about models, colors, payment, stock, or recommendations, and I’ll help from there.",
    }
  }
}
        if (
  aiOrderSession?.step === "ready" &&
  currentFlowProduct &&
  requestedFlowColor
) {
  const colorVariant = getColorVariant(
    currentFlowProduct,
    requestedFlowColor
  )

  const stock = Number(colorVariant?.stock || 0)

  console.log("🎨 READY COLOR FLOW:", {
    product: currentFlowProduct.name,
    requestedColor: requestedFlowColor,
    stock,
  })

  if (!colorVariant || stock <= 0) {
    setMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text: `${requestedFlowColor} is currently out of stock for ${currentFlowProduct.name}. Available colors: ${getAvailableColors(currentFlowProduct).join(", ")}.`,
        links: getProductLinks(currentFlowProduct),
      },
    ])

    setSending(false)
    return
  }

  setAiOrderSession({
    step: "ready",
    productId: currentFlowProduct.id,
    color: requestedFlowColor,
    cartRequested: false,
  })

  const downPayment = getDownPayment(currentFlowProduct.price)
  const monthlyPayment = getMonthlyPayment(currentFlowProduct.price)

  setMessages((prev) => [
    ...prev,
    {
      from: "bot",
      text: `${currentFlowProduct.name} in ${requestedFlowColor} is available, with ${stock} unit${stock === 1 ? "" : "s"} currently in stock.

Price: ${formatPeso(currentFlowProduct.price)}
Down payment: ${formatPeso(downPayment)}
Estimated 6-month payment: ${formatPeso(monthlyPayment)} per month

Would you like me to add it to your cart?`,

      links: getProductLinks(
        currentFlowProduct,
        requestedFlowColor
      ),

      actions: [
        {
          label: "Add to cart",
          onClick: () =>
            handleAddToCartFromBot(
              currentFlowProduct.id,
              requestedFlowColor
            ),
        },
      ],
    },
  ])

  setSending(false)
  return
}
        if (!botReply) {
          const fallbackProduct = matchedProduct || catalogProducts.find((entry) => entry.id === nextSession.productId)
          botReply = {
            from: "bot",
            text: fallbackProduct
              ? `${fallbackProduct.name} is ready for ordering. Tell me a color, payment question, or say "add to cart" when you are ready.`
              : "I can help you order an e-bike. Tell me what kind of ride you want, like commuting, cargo, or family use, and I’ll help you narrow it down.",
          }
        }

        if (isInformationalQuestion(normalizedUserMsg) && botReply?.actions?.length) {
          botReply = {
            from: "bot",
            text: botReply.text
              ? String(botReply.text)
                  .replace(/\s*(if your profile is complete, )?click below to add it to your cart\.?/i, "")
                  .replace(/\s*you can add this item to your cart when you are ready\.?/i, "")
              : "I can help with that. Ask me about models, colors, payment, stock, or recommendations.",
          }
          nextSession.step = "idle"
          nextSession.productId = null
          nextSession.color = null
        }
        console.log("💾 SAVING AI ORDER SESSION:", nextSession)
        setAiOrderSession(nextSession)
        const thinkingDelayMs = 900 + Math.floor(Math.random() * 900)
        await new Promise((resolve) => setTimeout(resolve, thinkingDelayMs))
        setMessages((prev) => [...prev, botReply])
        setSending(false)
        return
      }

      const contextProductIdForReply = matchedProduct?.id || lastProductContextId
      if (matchedProduct?.id) {
        setLastProductContextId(matchedProduct.id)
      }
      
      const budgetHint = getBudgetHint(userMsg)
      const budgetRecommendations = budgetHint != null ? getRecommendedProducts(catalogProducts, userMsg) : []

      let botReply = null

      if (asksImpossibleCapability(normalizedUserMsg) || commonProductMatch?.id) {
        botReply = getCommonQuestionReply(normalizedUserMsg, catalogProducts, commonProductMatch || matchedProduct)
      }

      if (!botReply && budgetRecommendations.length > 0) {
        const listText = budgetRecommendations.map((product) => `${product.name} — ${formatPeso(product.price)}`).join(" | ")
        botReply = {
          from: "bot",
          text: `Based on your budget, I’d recommend: ${listText}. Tell me which one you like best, or share your preferred color and I’ll help you choose.`,
        }
      }

      if (!botReply) {
        botReply = getProductAwareReply(userMsg, catalogProducts)
      }

      if (!botReply) {
        botReply = getRecommendationReply(userMsg, catalogProducts)
      }

      if (!botReply) {
        botReply = getSimilarProductReply(userMsg, catalogProducts, contextProductIdForReply)
      }

      if (!botReply) {
        botReply = getCrossSellPriceReply(userMsg, catalogProducts, contextProductIdForReply)
      }

      if (!botReply) {
        botReply = getSpeegoBotReply(userMsg, intents)
      }

      const thinkingDelayMs = 1600 + Math.floor(Math.random() * 1600)
      await new Promise((resolve) => setTimeout(resolve, thinkingDelayMs))

      const normalizedBotReply =
        typeof botReply === "string"
          ? { from: "bot", text: botReply }
          : { from: "bot", ...(botReply || {}) }

      setMessages((prev) => [...prev, normalizedBotReply])
      setSending(false)
    } catch (err) {
      console.error("AI error:", err)
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Sorry, something went wrong while processing your question.",
        },
      ])
      setSending(false)
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    await handleSendMessage(message)
  }

  const renderMessageText = (msg) => {
    const text = String(msg?.text || "").replace(/^[ \t]+/gm, "")
    const links = Array.isArray(msg?.links) ? msg.links : []
    const actions = Array.isArray(msg?.actions) ? msg.actions : []
    const standaloneLinks = links.filter((link) => {
      const label = String(link?.label || "")
      return label && !text.includes(label)
    })

    if (msg?.from !== "bot" || (links.length === 0 && actions.length === 0)) {
      return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
    }

    const renderStandaloneLinks = () =>
      standaloneLinks.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {standaloneLinks.map((link) => (
            <button
              key={`${link.href}-${link.label}`}
              type="button"
              onClick={() => navigate(link.href)}
              style={{
                border: "1px solid var(--chat-chip-border)",
                background: "var(--chat-chip-bg)",
                color: "var(--chat-chip-text)",
                borderRadius: "999px",
                padding: "0.38rem 0.7rem",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      ) : null

    const parts = []
    let cursor = 0

    for (const link of links) {
      const label = String(link?.label || "")
      const href = String(link?.href || "")
      if (!label || !href) continue

      const index = text.indexOf(label, cursor)
      if (index === -1) continue

      if (index > cursor) {
        parts.push(text.slice(cursor, index))
      }

      parts.push(
        <a
          key={`${href}-${index}`}
          href={href}
          onClick={(e) => {
            e.preventDefault()
            navigate(href)
          }}
          style={{
            color: "var(--chat-link)",
            textDecoration: "underline",
            textDecorationColor: "var(--chat-link-underline)",
            fontWeight: 700,
          }}
        >
          {label}
        </a>
      )

      cursor = index + label.length
    }

    if (parts.length === 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
          {renderStandaloneLinks()}
          {actions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
              {actions.map((action) => (
                <button
                  key={action?.label || "chat-action"}
                  type="button"
                  onClick={() => action?.onClick?.()}
                  disabled={sending}
                  style={{
                    border: "1px solid var(--chat-chip-border)",
                    background: "var(--chat-chip-bg)",
                    color: "var(--chat-chip-text)",
                    borderRadius: "999px",
                    padding: "0.38rem 0.7rem",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {action?.label || "Continue"}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }
    if (cursor < text.length) {
      parts.push(text.slice(cursor))
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        <span style={{ whiteSpace: "pre-wrap" }}>{parts}</span>
        {renderStandaloneLinks()}
        {actions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {actions.map((action) => (
              <button
                key={action?.label || "chat-action"}
                type="button"
                onClick={() => action?.onClick?.()}
                disabled={sending}
                style={{
                  border: "1px solid var(--chat-chip-border)",
                  background: "var(--chat-chip-bg)",
                  color: "var(--chat-chip-text)",
                  borderRadius: "999px",
                  padding: "0.38rem 0.7rem",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {action?.label || "Continue"}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`chat-assistant ${open ? "chat-open" : ""}`}>
      <button type="button" className="chat-assistant-toggle" onClick={handleToggle}>
        {open ? "Close SpeeGo AI" : "SpeeGo AI"}
      </button>

      {open && (
        <div className="chat-assistant-panel">
          <div className="chat-assistant-header">
            <div>
              <div className="chat-assistant-title">SpeeGo AI Assistant</div>
              <div className="chat-assistant-subtitle">
                Ask about models, specs, or how ordering works.
              </div>
            </div>
          </div>

          <div className="chat-assistant-messages">
            {(messages || []).filter(Boolean).map((m, idx) => {
              const safeMessage = m && typeof m === "object" ? m : { from: "bot", text: String(m || "") }

              return (
                <div
                  key={idx}
                  className={
                    "chat-message " + (safeMessage.from === "user" ? "chat-message-user" : "chat-message-bot")
                  }
                >
                  <div className="chat-message-bubble">{renderMessageText(safeMessage)}</div>
                </div>
              )
            })}
            {sending && (
              <div className="chat-message chat-message-bot">
                <div className="chat-message-bubble chat-typing">
                  SpeeGo AI is typing{".".repeat(typingFrame + 1)}
                </div>
              </div>
            )}
          </div>

          <form className="chat-assistant-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about SpeeGo e-bikes..."
            />
            <button type="submit" disabled={sending || !message.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}