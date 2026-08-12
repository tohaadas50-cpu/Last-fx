/**
 * TextFX v5 — LLM Gateway (Phase 3.5 + OpenRouter)
 * ─────────────────────────────────────────────────────
 * Single entrypoint for ALL AI provider calls.
 *
 * Features:
 *  - Singleton OpenRouter + OpenAI + VertexAI clients (initialized once, reused)
 *  - Priority provider list: OpenRouter → OpenAI → VertexAI → Mock
 *  - Automatic fallback on provider failure
 *  - Retry with exponential backoff (up to 2 retries per provider)
 *  - 30 s timeout per attempt
 *  - Provider health tracking (mark unhealthy after 3 consecutive failures; recover after 60 s)
 *  - Request-level cache (SHA-256 keyed, 5 min TTL, max 500 entries)
 *  - In-flight request deduplication (same key → shared promise)
 *  - Concurrency limiter (max 10 parallel LLM calls, queued)
 *  - Token accounting (real usage from providers + fallback estimate)
 *  - Estimated cost per request (USD)
 *  - getGatewayStats() for integration with /api/metrics
 *
 * Drop-in compatible with existing `context.provider.generateCreativeText()` calls.
 */

import crypto  from 'crypto'
import OpenAI  from 'openai'
import { VertexAI } from '@google-cloud/vertexai'

// ─── Unified types ────────────────────────────────────────────────────────────

export interface GatewayResponse {
  text:              string
  provider:          string   // 'OpenAI' | 'VertexAI' | 'Mock'
  model:             string
  latencyMs:         number
  usage: {
    promptTokens:     number
    completionTokens: number
    totalTokens:      number
  }
  cacheHit:          boolean
  retries:           number
  fallbackUsed:      boolean
  estimatedCostUsd:  number
}

// ─── Provider health tracker ──────────────────────────────────────────────────

interface ProviderHealth {
  consecutiveFailures: number
  unhealthyUntil:      number   // epoch ms; 0 = healthy
  totalCalls:          number
  totalFailures:       number
  totalRetries:        number
  totalTimeouts:       number
  totalTokens:         number
  totalCostUsd:        number
  fallbackCount:       number
}

const HEALTH_FAILURE_THRESHOLD = 3         // consecutive failures before marking unhealthy
const HEALTH_RECOVERY_MS       = 60_000    // 1 minute cooldown

const health = new Map<string, ProviderHealth>()

function getHealth(name: string): ProviderHealth {
  if (!health.has(name)) {
    health.set(name, {
      consecutiveFailures: 0, unhealthyUntil: 0,
      totalCalls: 0, totalFailures: 0, totalRetries: 0,
      totalTimeouts: 0, totalTokens: 0, totalCostUsd: 0, fallbackCount: 0,
    })
  }
  return health.get(name)!
}

function markSuccess(name: string): void {
  const h = getHealth(name)
  h.consecutiveFailures = 0
  h.unhealthyUntil      = 0
}

function markFailure(name: string, isTimeout = false): void {
  const h = getHealth(name)
  h.totalFailures++
  if (isTimeout) h.totalTimeouts++
  h.consecutiveFailures++
  if (h.consecutiveFailures >= HEALTH_FAILURE_THRESHOLD) {
    h.unhealthyUntil = Date.now() + HEALTH_RECOVERY_MS
  }
}

function isHealthy(name: string): boolean {
  const h = getHealth(name)
  if (h.unhealthyUntil === 0) return true
  if (Date.now() >= h.unhealthyUntil) {
    // Recovery: reset and try again
    h.consecutiveFailures = 0
    h.unhealthyUntil      = 0
    return true
  }
  return false
}

// ─── Singleton clients ────────────────────────────────────────────────────────

let _openaiClient: OpenAI | null = null
function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }
  return _openaiClient
}

let _openrouterClient: OpenAI | null = null
function getOpenRouterClient(): OpenAI {
  if (!_openrouterClient) {
    _openrouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: 'https://openrouter.io/api/v1',
      defaultHeaders: {
        'X-Title': 'TextFX',
      },
    })
  }
  return _openrouterClient
}

interface VertexClientBundle { ai: VertexAI; model: string }
let _vertexBundle: VertexClientBundle | null = null
function getVertexBundle(): VertexClientBundle {
  if (!_vertexBundle) {
    const project  = process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID!
    const location = process.env.VERTEX_LOCATION || 'us-central1'
    const model    = process.env.VERTEX_MODEL || 'gemini-pro'
    _vertexBundle  = { ai: new VertexAI({ project, location }), model }
  }
  return _vertexBundle
}

// ─── Cost estimation ──────────────────────────────────────────────────────────
// Very rough USD/token estimates — updated for common models

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'claude-3-5-sonnet':   { input: 0.003,   output: 0.015   },
  'claude-3-opus':       { input: 0.015,   output: 0.075   },
  'claude-3-sonnet':     { input: 0.003,   output: 0.015   },
  'claude-3-haiku':      { input: 0.00025, output: 0.00125 },
  'gpt-4o':              { input: 0.005,   output: 0.015   },
  'gpt-4o-mini':         { input: 0.00015, output: 0.0006  },
  'gpt-4-turbo':         { input: 0.01,    output: 0.03    },
  'gpt-3.5-turbo':       { input: 0.0005,  output: 0.0015  },
  'gemini-pro':          { input: 0.00025, output: 0.0005  },
  'gemini-1.5-pro':      { input: 0.00125, output: 0.005   },
  'gemini-1.0-pro':      { input: 0.00025, output: 0.0005  },
  'mock-model':          { input: 0,       output: 0       },
  'default':             { input: 0.001,   output: 0.002   },
}

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_PER_1K[model] ?? COST_PER_1K['default']
  return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output
}

function estimateTokens(text: string): number {
  // ~4 chars per token; fast and allocation-free
  return Math.ceil(text.length / 4)
}

// ─── Request cache ────────────────────────────────────────────────────────────

interface CacheEntry {
  response:  GatewayResponse
  expiresAt: number
}

const CACHE_TTL_MS  = 5 * 60 * 1000   // 5 minutes
const CACHE_MAX     = 500

const responseCache = new Map<string, CacheEntry>()

function cacheKey(prompt: string, systemPrompt: string): string {
  return crypto.createHash('sha256')
    .update(systemPrompt).update('\x00').update(prompt)
    .digest('hex')
}

function cacheGet(key: string): GatewayResponse | null {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { responseCache.delete(key); return null }
  return entry.response
}

function cacheSet(key: string, response: GatewayResponse): void {
  // Evict oldest entry if at capacity (simple FIFO eviction)
  if (responseCache.size >= CACHE_MAX) {
    const oldest = responseCache.keys().next().value
    if (oldest) responseCache.delete(oldest)
  }
  responseCache.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── In-flight deduplication ──────────────────────────────────────────────────

const inflight = new Map<string, Promise<GatewayResponse>>()

// ─── Concurrency limiter ──────────────────────────────────────────────────────

const MAX_CONCURRENT = 10
let   activeCalls    = 0
const queue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  return new Promise(resolve => {
    if (activeCalls < MAX_CONCURRENT) {
      activeCalls++
      resolve()
    } else {
      queue.push(resolve)
    }
  })
}

function releaseSlot(): void {
  activeCalls--
  const next = queue.shift()
  if (next) { activeCalls++; next() }
}

// ─── Gateway stats (for /api/metrics) ────────────────────────────────────────

let gatewayTotalCalls   = 0
let gatewayCacheHits    = 0
let gatewayDedupHits    = 0
let gatewayQueuedCalls  = 0

export function getGatewayStats(): object {
  const providers: Record<string, object> = {}
  for (const [name, h] of health) {
    providers[name] = {
      healthy:             h.unhealthyUntil === 0 || Date.now() >= h.unhealthyUntil,
      consecutiveFailures: h.consecutiveFailures,
      totalCalls:          h.totalCalls,
      totalFailures:       h.totalFailures,
      totalRetries:        h.totalRetries,
      totalTimeouts:       h.totalTimeouts,
      totalTokens:         h.totalTokens,
      estimatedCostUsd:    +h.totalCostUsd.toFixed(6),
      fallbackCount:       h.fallbackCount,
    }
  }
  return {
    totalCalls:         gatewayTotalCalls,
    cacheHits:          gatewayCacheHits,
    cacheHitRate:       gatewayTotalCalls
      ? +(gatewayCacheHits / gatewayTotalCalls * 100).toFixed(1) : 0,
    dedupHits:          gatewayDedupHits,
    queuedCalls:        gatewayQueuedCalls,
    activeConcurrent:   activeCalls,
    cacheSize:          responseCache.size,
    inflight:           inflight.size,
    providers,
  }
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`LLM timeout after ${ms}ms`)), ms)
    promise.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

// ─── Individual provider calls (no retry logic here) ─────────────────────────

async function callOpenAI(prompt: string, systemPrompt: string): Promise<GatewayResponse> {
  const client    = getOpenAIClient()
  const model     = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const temp      = parseFloat(process.env.OPENAI_TEMPERATURE || '0.8')
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS   || '2000', 10)
  const t0        = Date.now()

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: prompt },
    ],
    temperature: temp,
    max_tokens:  maxTokens,
  })

  const promptTokens     = resp.usage?.prompt_tokens     ?? estimateTokens(systemPrompt + prompt)
  const completionTokens = resp.usage?.completion_tokens ?? estimateTokens(resp.choices[0]?.message?.content ?? '')
  const totalTokens      = resp.usage?.total_tokens      ?? (promptTokens + completionTokens)
  const costUsd          = estimateCost(model, promptTokens, completionTokens)

  return {
    text:             resp.choices[0]?.message?.content ?? '',
    provider:         'OpenAI',
    model,
    latencyMs:        Date.now() - t0,
    usage:            { promptTokens, completionTokens, totalTokens },
    cacheHit:         false,
    retries:          0,
    fallbackUsed:     false,
    estimatedCostUsd: costUsd,
  }
}

async function callOpenRouter(prompt: string, systemPrompt: string): Promise<GatewayResponse> {
  const client    = getOpenRouterClient()
  const model     = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
  const temp      = parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.8')
  const maxTokens = parseInt(process.env.OPENROUTER_MAX_TOKENS   || '2000', 10)
  const t0        = Date.now()

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: prompt },
    ],
    temperature: temp,
    max_tokens:  maxTokens,
  })

  const promptTokens     = resp.usage?.prompt_tokens     ?? estimateTokens(systemPrompt + prompt)
  const completionTokens = resp.usage?.completion_tokens ?? estimateTokens(resp.choices[0]?.message?.content ?? '')
  const totalTokens      = resp.usage?.total_tokens      ?? (promptTokens + completionTokens)
  const costUsd          = estimateCost(model, promptTokens, completionTokens)

  return {
    text:             resp.choices[0]?.message?.content ?? '',
    provider:         'OpenRouter',
    model,
    latencyMs:        Date.now() - t0,
    usage:            { promptTokens, completionTokens, totalTokens },
    cacheHit:         false,
    retries:          0,
    fallbackUsed:     false,
    estimatedCostUsd: costUsd,
  }
}


async function callVertexAI(prompt: string, systemPrompt: string): Promise<GatewayResponse> {
  const { ai, model } = getVertexBundle()
  const t0 = Date.now()

  const genModel = ai.getGenerativeModel({ model })
  const chat     = genModel.startChat({
    history: [
      { role: 'user',  parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Understood. I will act as the Creative Director with the specified brand personality.' }] },
    ],
  })

  const result   = await chat.sendMessage(prompt)
  const response = await result.response
  const text     = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  const promptTokens     = response.usageMetadata?.promptTokenCount     ?? estimateTokens(systemPrompt + prompt)
  const completionTokens = response.usageMetadata?.candidatesTokenCount ?? estimateTokens(text)
  const totalTokens      = promptTokens + completionTokens
  const costUsd          = estimateCost(model, promptTokens, completionTokens)

  return {
    text,
    provider:         'VertexAI',
    model,
    latencyMs:        Date.now() - t0,
    usage:            { promptTokens, completionTokens, totalTokens },
    cacheHit:         false,
    retries:          0,
    fallbackUsed:     false,
    estimatedCostUsd: costUsd,
  }
}

function callMock(prompt: string, _systemPrompt: string): GatewayResponse {
  const t0 = Date.now()

  let text: string
  const lc = prompt.toLowerCase()
  if (lc.includes('insight') || lc.includes('lateral')) {
    text = `From provocation: the deeper human need beneath the surface of the stated problem.\n\nThe breakthrough: reposition from a utilitarian solution to a ritual anchor for self-respect.`
  } else if (lc.includes('concept')) {
    text = `{"title":"The Permission Principle","tagline":"Where intention meets irresistibility.","coreIdea":"We reposition the product from a utilitarian tool to a symbolic ritual.","visualNotes":"Warm, intimate, intentional aesthetic.","creativeDevice":"Ritual transformation","emotionalArc":"Obligation → Inspiration → Identity","targetParadox":"Make the easy choice the irresistible choice"}`
  } else if (lc.includes('script') || lc.includes('beat')) {
    text = `{"script":"SCENE 1: We open on silence. Then clarity.","beats":["Recognition","Surrender","Arrival"],"cameraLanguage":"Intimate macros to wide establishing shots.","narrativeStrategy":"Visual silence as premium differentiator.","emotionalTurning":"Chaos → Connection → Clarity"}`
  } else {
    text = `[MOCK] Processed through lateral thinking gateway.`
  }

  const promptTokens     = estimateTokens(_systemPrompt + prompt)
  const completionTokens = estimateTokens(text)

  return {
    text,
    provider:         'Mock',
    model:            'mock-model',
    latencyMs:        Date.now() - t0,
    usage:            { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
    cacheHit:         false,
    retries:          0,
    fallbackUsed:     false,
    estimatedCostUsd: 0,
  }
}

// ─── Provider priority list ───────────────────────────────────────────────────

type ProviderName = 'OpenRouter' | 'OpenAI' | 'VertexAI' | 'Mock'

function resolveProviders(): ProviderName[] {
  const list: ProviderName[] = []
  if (process.env.OPENROUTER_API_KEY) list.push('OpenRouter')
  if (process.env.OPENAI_API_KEY) list.push('OpenAI')
  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID) list.push('VertexAI')
  list.push('Mock')   // always available as final fallback
  return list
}

// ─── Core gateway call (with retry + fallback) ────────────────────────────────

const RETRY_DELAYS = [500, 1000]   // ms between retry attempts
const CALL_TIMEOUT = 30_000         // 30 s per attempt

async function executeWithRetry(
  name: ProviderName,
  prompt: string,
  systemPrompt: string,
): Promise<GatewayResponse> {
  const h = getHealth(name)
  let lastErr: Error | null = null
  let retriesUsed = 0

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1]
      await new Promise(r => setTimeout(r, delay))
      retriesUsed++
      h.totalRetries++
    }

    try {
      let resp: GatewayResponse
      if (name === 'OpenRouter')   resp = await withTimeout(callOpenRouter(prompt, systemPrompt), CALL_TIMEOUT)
      else if (name === 'OpenAI')   resp = await withTimeout(callOpenAI(prompt, systemPrompt),   CALL_TIMEOUT)
      else if (name === 'VertexAI') resp = await withTimeout(callVertexAI(prompt, systemPrompt), CALL_TIMEOUT)
      else                          resp = callMock(prompt, systemPrompt)

      resp.retries = retriesUsed
      markSuccess(name)
      return resp
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.startsWith('LLM timeout')
      markFailure(name, isTimeout)
      lastErr = err instanceof Error ? err : new Error(String(err))

      if (!isHealthy(name)) break   // unhealthy — stop retrying this provider
    }
  }

  throw lastErr ?? new Error(`Provider ${name} failed`)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Primary gateway call. Returns a full GatewayResponse with observability data.
 */
export async function callLLM(
  prompt:       string,
  systemPrompt: string,
): Promise<GatewayResponse> {
  gatewayTotalCalls++

  const key = cacheKey(prompt, systemPrompt)

  // ── Cache check ──
  const cached = cacheGet(key)
  if (cached) {
    gatewayCacheHits++
    return { ...cached, cacheHit: true }
  }

  // ── In-flight dedup ──
  if (inflight.has(key)) {
    gatewayDedupHits++
    return inflight.get(key)!
  }

  // ── Concurrency limit ──
  if (activeCalls >= MAX_CONCURRENT) {
    gatewayQueuedCalls++
  }
  await acquireSlot()

  const callPromise = (async (): Promise<GatewayResponse> => {
    const providers  = resolveProviders()
    let   firstError: Error | null = null
    let   fallback   = false

    for (const name of providers) {
      if (!isHealthy(name)) continue

      const h = getHealth(name)
      h.totalCalls++

      try {
        const resp = await executeWithRetry(name, prompt, systemPrompt)
        resp.fallbackUsed = fallback

        // ── Token + cost accounting ──
        h.totalTokens += resp.usage.totalTokens
        h.totalCostUsd += resp.estimatedCostUsd

        // ── Cache the result ──
        cacheSet(key, resp)

        return resp
      } catch (err) {
        if (!firstError) firstError = err instanceof Error ? err : new Error(String(err))
        fallback = true   // next provider is a fallback
        const nextH = providers[providers.indexOf(name) + 1]
        if (nextH) getHealth(nextH).fallbackCount++
        // continue to next provider
      }
    }

    // All providers failed — should not happen because Mock never throws
    throw firstError ?? new Error('All providers failed')
  })()

  inflight.set(key, callPromise)

  try {
    const result = await callPromise
    return result
  } finally {
    inflight.delete(key)
    releaseSlot()
  }
}

// ─── Drop-in provider-compatible interface ────────────────────────────────────
/**
 * Compatible with the existing `context.provider.generateCreativeText(prompt, systemPrompt, _config)`
 * signature used throughout the codebase.  Pass `gateway` as `context.provider`.
 */
export const gateway = {
  generateCreativeText: async (
    prompt:       string,
    systemPrompt: string,
    _config?:     unknown,
  ): Promise<{ text: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> => {
    const resp = await callLLM(prompt, systemPrompt)
    return { text: resp.text, model: resp.model, usage: resp.usage }
  },
}

// ─── Current active provider label (for startup logs / metrics) ───────────────
export function getActiveProviderLabel(): string {
  if (process.env.OPENROUTER_API_KEY)                                            return 'OpenRouter'
  if (process.env.OPENAI_API_KEY)                                                return 'OpenAI'
  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID)        return 'VertexAI'
  return 'Mock'
}
