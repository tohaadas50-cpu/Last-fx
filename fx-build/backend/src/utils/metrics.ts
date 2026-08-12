/**
 * TextFX v5 — In-memory metrics collector (Phase 3 observability)
 *
 * Tracks per-route latency percentiles, error rates, and provider mode.
 * Token counts are estimated from response size until the Phase 3.5
 * LLM Gateway is wired and returns real usage objects.
 *
 * All state is process-local; resets on restart.
 */

interface RouteStats {
  count:           number
  errors:          number
  totalMs:         number
  latencies:       number[]   // circular buffer — last MAX_LATENCIES entries
  lastHit:         string
  providers:       Record<string, number>
  estimatedTokens: number
}

const BOOT_TS       = Date.now()
const MAX_LATENCIES = 200

const routeStats   = new Map<string, RouteStats>()
let   totalRequests = 0
let   totalErrors   = 0

function getOrCreate(route: string): RouteStats {
  if (!routeStats.has(route)) {
    routeStats.set(route, {
      count:           0,
      errors:          0,
      totalMs:         0,
      latencies:       [],
      lastHit:         new Date().toISOString(),
      providers:       {},
      estimatedTokens: 0,
    })
  }
  return routeStats.get(route)!
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

/**
 * Record a completed request.
 * @param route           Express req.path
 * @param ms              Wall-clock duration in milliseconds
 * @param status          HTTP response status code
 * @param provider        Optional AI provider label ('OpenAI' | 'VertexAI' | 'Mock')
 * @param estimatedTokens Optional rough token estimate (chars / 4)
 */
export function recordRequest(
  route:            string,
  ms:               number,
  status:           number,
  provider?:        string,
  estimatedTokens?: number,
): void {
  totalRequests++
  if (status >= 400) totalErrors++

  const s = getOrCreate(route)
  s.count++
  if (status >= 400) s.errors++
  s.totalMs += ms
  s.lastHit  = new Date().toISOString()

  if (s.latencies.length >= MAX_LATENCIES) s.latencies.shift()
  s.latencies.push(ms)

  if (provider) s.providers[provider] = (s.providers[provider] ?? 0) + 1
  if (estimatedTokens) s.estimatedTokens += estimatedTokens
}

/**
 * Return a snapshot of all collected metrics.
 * Safe to call at any frequency — read-only, no mutations.
 */
export function getMetrics(): object {
  const providerMode =
    process.env.OPENROUTER_API_KEY     ? 'OpenRouter'   :
    process.env.OPENAI_API_KEY         ? 'OpenAI'       :
    process.env.GOOGLE_CLOUD_PROJECT   ? 'VertexAI'     : 'Mock'

  const routes: Record<string, object> = {}
  for (const [route, s] of routeStats) {
    const sorted = [...s.latencies].sort((a, b) => a - b)
    routes[route] = {
      requests:        s.count,
      errors:          s.errors,
      errorRate:       s.count ? +(s.errors / s.count * 100).toFixed(1) : 0,
      avgMs:           s.count ? Math.round(s.totalMs / s.count)        : 0,
      p50Ms:           percentile(sorted, 50),
      p95Ms:           percentile(sorted, 95),
      p99Ms:           percentile(sorted, 99),
      lastHit:         s.lastHit,
      providers:       s.providers,
      estimatedTokens: s.estimatedTokens,
    }
  }

  return {
    uptime: {
      ms:    Date.now() - BOOT_TS,
      since: new Date(BOOT_TS).toISOString(),
    },
    totals: {
      requests:  totalRequests,
      errors:    totalErrors,
      errorRate: totalRequests ? +(totalErrors / totalRequests * 100).toFixed(1) : 0,
    },
    providerMode,
    routes,
  }
}

/** Reset all counters — intended for test environments only. */
export function resetMetrics(): void {
  routeStats.clear()
  totalRequests = 0
  totalErrors   = 0
}
