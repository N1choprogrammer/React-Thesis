function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w))
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "i",
  "you",
  "do",
  "does",
  "to",
  "of",
  "for",
  "and",
  "or",
  "me",
  "my",
  "your",
  "we",
  "it",
  "in",
  "on",
  "at",
  "can",
  "what",
  "how",
  "when",
  "where",
  "about"
])

function scorePattern(messageText, messageTokens, pattern) {
  const patternText = normalize(pattern)
  const patternTokens = tokenize(pattern)
  if (!patternText) return 0

  let score = 0

  if (messageText === patternText) score += 10
  if (messageText.includes(patternText)) score += 6

  if (patternTokens.length > 0) {
    const tokenSet = new Set(messageTokens)
    const matched = patternTokens.filter((t) => tokenSet.has(t)).length
    score += (matched / patternTokens.length) * 5
  }

  return score
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getSpeegoBotReply(message, intentsPayload) {
  const intents = intentsPayload?.intents || []
  const messageText = normalize(message)
  const messageTokens = tokenize(message)

  if (!messageText) {
    return "Please type your question so I can help."
  }

  let bestIntent = null
  let bestScore = 0

  for (const intent of intents) {
    const patterns = Array.isArray(intent?.patterns) ? intent.patterns : []
    for (const pattern of patterns) {
      const score = scorePattern(messageText, messageTokens, pattern)
      if (score > bestScore) {
        bestScore = score
        bestIntent = intent
      }
    }
  }

  const minScore = 2.2
  if (bestIntent && bestScore >= minScore) {
    return (
      pickRandom(bestIntent.responses) ||
      "I understood your question, but I don't have a response configured yet."
    )
  }

  const fallback = intents.find((i) => i.tag === "fallback")
  return (
    pickRandom(fallback?.responses) ||
    "Sorry, I don't understand yet. Please ask about products, stock, pricing, or orders."
  )
}
