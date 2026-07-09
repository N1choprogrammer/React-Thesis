// src/components/ChatAssistant.jsx
import { useEffect, useState } from "react"
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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function formatPeso(amount) {
  return `PHP ${Number(amount || 0).toLocaleString()}`
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
    msg.includes("i want to order") ||
    msg.includes("want to order") ||
    msg.includes("order one") ||
    msg.includes("order it") ||
    msg.includes("i want one") ||
    msg.includes("buy one") ||
    msg.includes("buy it") ||
    msg.includes("place an order") ||
    msg.includes("place order")
  )
}

function isInitialOrderPrompt(message) {
  const msg = normalizeText(message)
  return (
    msg === "order an e bike through speego ai" ||
    msg === "order an ebike through speego ai" ||
    msg === "buy an e bike through speego ai" ||
    msg === "buy an ebike through speego ai" ||
    msg === "order an e bike" ||
    msg === "order an ebike" ||
    msg === "buy an e bike" ||
    msg === "buy an ebike" ||
    /^(order|buy)( an)?( e bike| ebike)?( through speego ai)?$/.test(msg)
  )
}

function getDownPayment(price) {
  return Math.ceil(Number(price || 0) * 0.2)
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
  return null
}

function isProductPreferenceMessage(message) {
  const msg = normalizeText(message)
  return /(?:^|\s)(i\s+like|i\s+love|i\s+prefer|like|love|prefer|want something like|something like|similar to)/.test(msg)
}

function getSimilarPreferenceProducts(products, message, baseProduct) {
  const list = Array.isArray(products) ? products : []
  const msg = normalizeText(message)
  if (!baseProduct || !msg || !isProductPreferenceMessage(message)) return []

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

        if (isUnderBudget) score += 20
        score += Math.max(0, 12 - difference / 1000)

        if (signals.wantsThreeWheel || signals.wantsFourWheel) {
          const wheelType = inferWheelType(product)
          if (signals.wantsThreeWheel && wheelType === "3-wheel") score += 6
          if (signals.wantsFourWheel && wheelType === "4-wheel") score += 6
        }

        if (signals.mentionsType) {
          const name = normalizeText(product?.name || "")
          if (name.includes("cargo") || name.includes("utility") || name.includes("family")) score += 2
          if (name.includes("commute") || name.includes("city") || name.includes("road")) score += 2
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
        if (name.includes("solar")) score += 2
        if (name.includes("cargo") || name.includes("utility") || name.includes("family")) score += 2
        if (name.includes("commute") || name.includes("city") || name.includes("road")) score += 2
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
    mentionsType: /\b(city|commute|cargo|family|utility|mountain|road|offroad|solar|sport|touring|delivery)\b/.test(msg),
  }

  return signals
}

function getMonthlyPayment(price, months = 6) {
  const downPayment = getDownPayment(price)
  const balance = Math.max(0, Number(price || 0) - downPayment)
  return balance > 0 ? balance / months : 0
}

function productSummary(product) {
  return `${product.name} - ${formatPeso(product.price)}`
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

function findCommonProductMatch(message, products) {
  const msg = normalizeText(message)
  const list = Array.isArray(products) ? products : []

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

function asksAboutAvailability(message) {
  return /\b(available|availability|stock|in stock|models|list|what.*bikes|electric bikes|e bikes|ebikes|3wheel|4wheel)\b/.test(message)
}

function asksForRecommendation(message) {
  return /\b(recommend|best|suggest|good for|for family|for delivery|for commuting|small business|cheapest|cheap|affordable|budget)\b/.test(message)
}

function asksAboutOrderProcess(message) {
  return /\b(what happens after|after i place|after placing|how does ordering work|order process|after order)\b/.test(message)
}

function asksAboutQuantity(message) {
  return /\b(two units|2 units|multiple units|more than one|order two|buy two|quantity)\b/.test(message)
}

function isInformationalQuestion(message) {
  return (
    /^(what|which|do|does|can|is|are|any|how|has|where)\b/.test(message) ||
    asksAboutPayment(message) ||
    asksAboutAvailability(message) ||
    asksForRecommendation(message) ||
    asksAboutOrderProcess(message) ||
    asksAboutQuantity(message) ||
    /\b(color|colors|available color|other colors)\b/.test(message)
  )
}

function getCommonQuestionReply(message, products, matchedProduct) {
  const msg = normalizeText(message)
  const list = Array.isArray(products) ? products : []
  const availableProducts = list.filter((product) => getTotalStock(product) > 0)
  const cheapestProducts = getCheapestProducts(availableProducts.length ? availableProducts : list)

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

  if (matchedProduct && (getRequestedColor(msg) || /\b(color|colors|available color|stock|available|down payment|monthly|price|how much)\b/.test(msg))) {
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

    return {
      from: "bot",
      text: `${matchedProduct.name} is ${stock > 0 ? "available" : "currently out of stock"}. Price: ${formatPeso(matchedProduct.price)}. ${colors.length ? `Available colors: ${colors.join(", ")}.` : "No color variants are listed right now."} Down payment: ${formatPeso(getDownPayment(matchedProduct.price))}. Estimated 6-month payment: ${formatPeso(getMonthlyPayment(matchedProduct.price))} per month.`,
    }
  }

  if (msg.includes("cheapest") || msg.includes("cheap") || msg.includes("affordable")) {
    if (!cheapestProducts.length) return null
    return {
      from: "bot",
      text: `The most affordable options are: ${cheapestProducts.map(productSummary).join(" | ")}. Tell me which model you like and I can check colors and payment details.`,
    }
  }

  if (msg.includes("3 wheel") || msg.includes("three wheel") || msg.includes("3wheel")) {
    const threeWheel = getProductsByWheel(availableProducts.length ? availableProducts : list, "3-wheel")
    return {
      from: "bot",
      text: threeWheel.length
        ? `For 3-wheel e-bikes, we have: ${threeWheel.map(productSummary).join(" | ")}.`
        : "I could not find available 3-wheel models right now.",
    }
  }

  if (msg.includes("4 wheel") || msg.includes("four wheel") || msg.includes("4wheel")) {
    const fourWheel = getProductsByWheel(availableProducts.length ? availableProducts : list, "4-wheel")
    return {
      from: "bot",
      text: fourWheel.length
        ? `For 4-wheel e-bikes, we have: ${fourWheel.map(productSummary).join(" | ")}.`
        : "I could not find available 4-wheel models right now.",
    }
  }

  if (asksForRecommendation(msg)) {
    const recommendations = getRecommendedProducts(list, message)
    if (recommendations.length > 0) {
      return {
        from: "bot",
        text: `I recommend: ${recommendations.map(productSummary).join(" | ")}. Tell me your preferred model or color and I can help you continue.`,
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
  const [aiOrderSession, setAiOrderSession] = useState({
    step: "idle",
    productId: null,
    color: null,
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
          price,
          stock,
          is_active,
          product_color_stock (
            color,
            stock
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
            price,
            stock,
            product_color_stock (
              color,
              stock
            )
          `)
        data = fallback.data
        error = fallback.error
      }

      if (error) {
        console.error("SpeeGo AI catalog load error:", error)
        return
      }

      setCatalogProducts((data || []).filter((p) => p?.is_active !== false))
    }

    loadCatalog()
  }, [])

  useEffect(() => {
    const handleProductContext = (event) => {
      const productId = event?.detail?.id || null
      if (productId) {
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

  const addSelectedProductToCart = async (productIdOverride = null, colorOverride = null) => {
    const currentProductId = productIdOverride ?? aiOrderSession?.productId
    const currentColor = colorOverride ?? aiOrderSession?.color
    const product = catalogProducts.find((entry) => entry.id === currentProductId)

    if (!product) {
      return {
        ok: false,
        reply: {
          from: "bot",
          text: "I couldn’t find the selected bike. Tell me the model again and I’ll try once more.",
        },
      }
    }

    const gate = await requireCustomerProfile()
    if (!gate.ok) {
      return {
        ok: false,
        reply: {
          from: "bot",
          text: "Please complete your profile first so I can proceed to checkout.",
          links: [{ label: "Go to profile", href: "/profile" }],
        },
      }
    }

    const result = await addToCart(product, currentColor, 1)
    if (result?.ok) {
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
      const orderFlowActive = aiOrderSession.step !== "idle"
      const initialOrderPrompt = isInitialOrderPrompt(userMsg)
      const commonProductMatch = findCommonProductMatch(userMsg, catalogProducts)
      const matchedProduct = initialOrderPrompt ? null : commonProductMatch || findProductMatch(userMsg, catalogProducts)
      const orderStatusReply = await getOrderStatusReply(userMsg, supabase)

      if (orderStatusReply) {
        const normalizedOrderReply =
          typeof orderStatusReply === "string"
            ? { from: "bot", text: orderStatusReply }
            : { from: "bot", ...(orderStatusReply || {}) }

        await new Promise((resolve) => setTimeout(resolve, 700))
        setMessages((prev) => [...prev, normalizedOrderReply])
        setSending(false)
        return
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
            })
          } else if (isInformationalQuestion(normalizedUserMsg)) {
            setAiOrderSession({
              step: "idle",
              productId: null,
              color: null,
            })
          }
          await new Promise((resolve) => setTimeout(resolve, 700))
          setMessages((prev) => [...prev, commonQuestionReply])
          setSending(false)
          return
        }
      }

      const startsOrderFlow = initialOrderPrompt || getOrderIntent(userMsg) || orderFlowActive || Boolean(matchedProduct)

      if (startsOrderFlow || initialOrderPrompt) {
        const nextSession = { ...aiOrderSession }
        let botReply = null
        const incomingProductMatch = initialOrderPrompt ? null : commonProductMatch || findProductMatch(userMsg, catalogProducts)

        if (initialOrderPrompt) {
          nextSession.step = "awaiting_product"
          nextSession.productId = null
          nextSession.color = null
          botReply = {
            from: "bot",
            text: "I’d be happy to help you shop for an e-bike. Tell me what you want, your budget, or how you’ll use it, and I’ll guide you to the best fit.",
          }
        } else if (incomingProductMatch?.id && incomingProductMatch.id !== nextSession.productId) {
          nextSession.step = "awaiting_color"
          nextSession.productId = incomingProductMatch.id
          nextSession.color = null
          const availableColors = getAvailableColors(incomingProductMatch)
          const stock = getTotalStock(incomingProductMatch)
          const downPayment = getDownPayment(incomingProductMatch.price)
          const monthlyPayment = getMonthlyPayment(incomingProductMatch.price)
          botReply = {
            from: "bot",
            text: `${incomingProductMatch.name} is ${stock > 0 ? "available" : "currently out of stock"}. ${availableColors.length > 0 ? `Available colors: ${availableColors.join(", ")}.` : "No color variants are listed right now."} Down payment: ${formatPeso(downPayment)}. Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}.`,
          }
        } else if (isProductPreferenceMessage(userMsg) && incomingProductMatch?.id) {
          const similarPreferenceProducts = getSimilarPreferenceProducts(catalogProducts, userMsg, incomingProductMatch)
          if (similarPreferenceProducts.length > 0) {
            nextSession.step = "awaiting_product"
            nextSession.productId = null
            nextSession.color = null
            const firstOption = similarPreferenceProducts[0]
            const secondOption = similarPreferenceProducts[1]
            const monthlyIncrease = Math.max(0, getMonthlyPayment(firstOption.price) - getMonthlyPayment(incomingProductMatch.price))
            const firstOptionColors = getAvailableColors(firstOption)
            const firstOptionDownPayment = getDownPayment(firstOption.price)
            const extraLine = secondOption
              ? `\n\n${secondOption.name} is another strong alternative if you want a slightly different setup.`
              : ""

            botReply = {
              from: "bot",
              text: `${incomingProductMatch.name} is available. Down payment: ${formatPeso(getDownPayment(incomingProductMatch.price))}. Estimated monthly payment for a 6-month plan: ${formatPeso(getMonthlyPayment(incomingProductMatch.price))}.\n\nWe also have ${firstOption.name} available with ${firstOptionColors.length > 0 ? `colors ${firstOptionColors.join(", ")}` : "available color options"}. Its down payment is ${formatPeso(firstOptionDownPayment)}, and you would only need to add about ${formatPeso(monthlyIncrease)} to your monthly payment compared with ${incomingProductMatch.name}.${extraLine}`,
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
            const availableColors = getAvailableColors(matchedProduct)
            const stock = getTotalStock(matchedProduct)
            const downPayment = getDownPayment(matchedProduct.price)
            const monthlyPayment = getMonthlyPayment(matchedProduct.price)
            botReply = {
              from: "bot",
              text: `${matchedProduct.name} is ${stock > 0 ? "available" : "currently out of stock"}. ${availableColors.length > 0 ? `Available colors: ${availableColors.join(", ")}.` : "No color variants are listed right now."} Down payment: ${formatPeso(downPayment)}. Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}. Tell me the color you want, or I can recommend one if it is not available.`,
            }
          }
        } else if (nextSession.step === "awaiting_color") {
          const product = catalogProducts.find((entry) => entry.id === nextSession.productId)
          const preferenceSignals = getPreferenceSignals(userMsg)

          if (!product) {
            nextSession.step = "awaiting_product"
            nextSession.productId = null
            nextSession.color = null
            botReply = {
              from: "bot",
              text: "I lost the selected bike. Tell me the model you want again, and I’ll continue from there.",
            }
          } else {
            const requestedColor = getColorPreference(userMsg, product)
            const availableColors = getAvailableColors(product)
            const stock = getTotalStock(product)
            const colorVariant = getColorVariant(product, requestedColor)
            const requestedColorIsAvailable = Boolean(requestedColor && colorVariant && Number(colorVariant?.stock || 0) > 0)
            const requestedColorStock = colorVariant ? Number(colorVariant?.stock || 0) : 0

            if (preferenceSignals.mentionsBudget || preferenceSignals.mentionsType || preferenceSignals.wantsThreeWheel || preferenceSignals.wantsFourWheel) {
              nextSession.step = "awaiting_product"
              nextSession.productId = null
              nextSession.color = null
              botReply = {
                from: "bot",
                text: "I can help narrow it down. What type of electric bike do you prefer, or what is your budget?",
              }
            } else if (!availableColors.length) {
              nextSession.step = "ready"
              nextSession.color = null
              const downPayment = getDownPayment(product.price)
              const monthlyPayment = getMonthlyPayment(product.price)
              botReply = {
                from: "bot",
                text: `${product.name} is ${stock > 0 ? "available" : "currently out of stock"}. Down payment: ${formatPeso(downPayment)}. Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}. You can add this item to your cart when you are ready.`,
                actions: [{ label: "Add to cart", onClick: () => handleAddToCartFromBot(product.id, nextSession.color) }],
              }
            } else if (requestedColorIsAvailable) {
              nextSession.step = "ready"
              nextSession.color = requestedColor
              const downPayment = getDownPayment(product.price)
              const monthlyPayment = getMonthlyPayment(product.price)
              botReply = {
                from: "bot",
                text: `${product.name} in ${requestedColor} is available. ${requestedColorStock > 0 ? `${requestedColor} has ${requestedColorStock} left in stock.` : `${requestedColor} is out of stock.`} Down payment: ${formatPeso(downPayment)}. Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}. You can add this item to your cart when you are ready.`,
                actions: [{ label: "Add to cart", onClick: () => handleAddToCartFromBot(product.id, requestedColor) }],
              }
            } else if (requestedColor) {
              nextSession.step = "awaiting_color"
              nextSession.color = null
              botReply = {
                from: "bot",
                text: `The chosen color for ${product.name} is not available. Please choose among the colors provided: ${availableColors.join(", ")}.`,
              }
            } else {
              nextSession.step = "awaiting_color"
              nextSession.color = null
              const downPayment = getDownPayment(product.price)
              const monthlyPayment = getMonthlyPayment(product.price)
              botReply = {
                from: "bot",
                text: `${product.name} is ${stock > 0 ? "available" : "currently out of stock"}. Available colors: ${availableColors.join(", ")}. Down payment: ${formatPeso(downPayment)}. Estimated monthly payment for a 6-month plan: ${formatPeso(monthlyPayment)}. Please tell me which color you want before I add it to your cart.`,
              }
            }
          }
        } else if (nextSession.step === "ready") {
          if (/proceed to cart|add to cart|add it|add this|order this|buy this|yes add|yes order/i.test(userMsg)) {
            const response = await addSelectedProductToCart(nextSession.productId, nextSession.color)
            botReply = response.reply
          } else {
            nextSession.step = "idle"
            nextSession.productId = null
            nextSession.color = null
            botReply = {
              from: "bot",
              text: "Sure. Ask me about models, colors, payment, stock, or recommendations, and I’ll help from there.",
            }
          }
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

      if (budgetRecommendations.length > 0) {
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
    const text = String(msg?.text || "")
    const links = Array.isArray(msg?.links) ? msg.links : []
    const actions = Array.isArray(msg?.actions) ? msg.actions : []

    if (msg?.from !== "bot" || (links.length === 0 && actions.length === 0)) {
      return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
    }

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
