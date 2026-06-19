/**
 * TextFX v5 — Hardened Production Backend (fx-server)
 * ─────────────────────────────────────────────────────
 * CLI:  node dist/index.js --port=<n> --cert=<cert.pem> --key=<key.pem>
 * Binds ONLY to 127.0.0.1.  No OpenAI keys in repo — reads via keytar.
 * Packaged by pkg  →  release/backend/fx-server.exe
 */

import https  from 'https'
import http   from 'http'
import fs     from 'fs'
import path   from 'path'
import crypto from 'crypto'
import { spawn, ChildProcess } from 'child_process'

import express, { Request, Response, NextFunction } from 'express'
import cors      from 'cors'
import rateLimit from 'express-rate-limit'
import { generateInsight }  from './modules/insight-generator'
import { mapConcept }       from './modules/concept-mapper'
import { writeScript }      from './modules/script-writer'
import { getLateralThinkingSystemPrompt } from './modules/lateral-thinking-agent'
import * as vertexProvider  from './providers/googleVertexProvider'
import * as openaiProvider  from './providers/openaiProvider'
import agentRoutes from './agent/agent-route'
import saasRoutes  from './saas/saas-route'

// ─── keytar (native — included as pkg asset) ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let keytar: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  keytar = require('keytar')
} catch {
  /* keytar not available on this OS — /llm will return 401 */
}

// ─── CLI arg parser ───────────────────────────────────────────────────────────
function getArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`
  const match  = process.argv.find(a => a.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}
const PORT      = parseInt(getArg('port', '4002')!, 10)
const CERT_PATH = getArg('cert')
const KEY_PATH  = getArg('key')

// ─── Structured logger (PII-redacting) ───────────────────────────────────────
const LOG_DIR = path.join(process.env.APPDATA || process.env.HOME || '.', 'fx-logs')
try { fs.mkdirSync(LOG_DIR, { recursive: true }) } catch { /* ignore */ }
const LOG_FILE = path.join(LOG_DIR, 'fx-server.log')

function hashStr(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)
}

const PII_KEYS = ['prompt', 'input', 'text', 'content', 'message', 'key', 'token', 'secret', 'password']

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (PII_KEYS.some(p => k.toLowerCase().includes(p)) && typeof v === 'string') {
        return [k, `[REDACTED:${hashStr(v)}]`]
      }
      return [k, v]
    })
  )
}

function log(level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}) {
  const entry = JSON.stringify({ level, ts: new Date().toISOString(), msg, ...redact(meta) })
  console[level](entry)
  try { fs.appendFileSync(LOG_FILE, entry + '\n') } catch { /* non-fatal */ }
}

// ─── Child process registry ───────────────────────────────────────────────────
interface AgentEntry { proc: ChildProcess; timer: NodeJS.Timeout }
const agents = new Map<string, AgentEntry>()

function spawnAgent(id: string): void {
  // Runs node --version as a placeholder; replace with real agent entrypoint
  const proc = spawn(process.execPath, ['--version'], {
    stdio: 'pipe',
    windowsHide: true,
  })
  const timer = setTimeout(() => {
    log('warn', 'agent timeout', { id })
    proc.kill('SIGKILL')
    agents.delete(id)
  }, 120_000)
  proc.on('close', code => {
    clearTimeout(timer)
    agents.delete(id)
    log('info', 'agent closed', { id, code })
  })
  agents.set(id, { proc, timer })
}

// ─── Sanitizer + Policy ───────────────────────────────────────────────────────
const DENY_RE = [
  /ignore previous instructions/i,
  /system:\s*you are/i,
  /\bprompt injection\b/i,
  /<script[\s>]/i,
  /javascript:/i,
]

function sanitize(s: string): { ok: boolean; reason?: string } {
  if (!s || typeof s !== 'string') return { ok: false, reason: 'empty input' }
  if (s.length > 8_000)            return { ok: false, reason: 'input too long' }
  for (const re of DENY_RE) {
    if (re.test(s)) return { ok: false, reason: 'sanitizer: injection pattern detected' }
  }
  return { ok: true }
}

const POLICY_BLOCK = ['bomb', 'weapon', 'malware', 'exploit', 'ransomware', 'ddos']
function policyCheck(s: string): { allowed: boolean; reason?: string } {
  const lower = s.toLowerCase()
  for (const w of POLICY_BLOCK) {
    if (lower.includes(w)) return { allowed: false, reason: `blocked term: ${w}` }
  }
  return { allowed: true }
}

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: false }))   // no cross-origin; Electron uses IPC bridge
app.use(express.json({ limit: '512kb' }))

const llmLimiter = rateLimit({
  windowMs:        60_000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'rate limit exceeded — max 60 req/min' },
})

app.use((req: Request, res: Response, next: NextFunction) => {
  const t0 = Date.now()
  res.on('finish', () =>
    log('info', 'req', { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - t0 })
  )
  next()
})

// ── GET /healthz ──────────────────────────────────────────────────────────────
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true, ts: new Date().toISOString() }))

// ── POST /agent/run ───────────────────────────────────────────────────────────
app.post('/agent/run', (req: Request, res: Response) => {
  const id = crypto.randomUUID()
  try {
    spawnAgent(id)
    log('info', 'agent spawned', { id })
    res.json({ ok: true, id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', 'agent spawn failed', { msg })
    res.status(500).json({ ok: false, error: msg })
  }
})

// ── POST /llm ─────────────────────────────────────────────────────────────────
app.post('/llm', llmLimiter, async (req: Request, res: Response) => {
  const { input } = req.body as { input?: string }

  const san = sanitize(input ?? '')
  if (!san.ok) {
    log('warn', 'sanitizer rejected', { reason: san.reason, hash: hashStr(input ?? '') })
    return void res.status(400).json({ error: san.reason })
  }

  const pol = policyCheck(input!)
  if (!pol.allowed) {
    log('warn', 'policy blocked', { reason: pol.reason, hash: hashStr(input!) })
    return void res.status(403).json({ error: `Policy blocked: ${pol.reason}` })
  }

  if (!keytar) return void res.status(401).json({ error: 'Keytar unavailable — cannot read API key.' })

  const apiKey: string | null = await keytar.getPassword('fx-openai', 'default').catch(() => null)
  if (!apiKey) {
    return void res.status(401).json({ error: 'OpenAI API key not set. Configure it in app Settings → API Key.' })
  }

  log('info', 'llm call', { hash: hashStr(input!), policy: 'pass' })
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body:    JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: input }], max_tokens: 1024 }),
    })
    if (!resp.ok) {
      const txt = await resp.text()
      log('error', 'openai http error', { status: resp.status })
      return void res.status(502).json({ error: `OpenAI returned ${resp.status}`, detail: txt.slice(0, 200) })
    }
    const data = await resp.json() as { choices?: { message?: { content?: string } }[] }
    const result = data.choices?.[0]?.message?.content ?? ''
    log('info', 'llm ok', { outHash: hashStr(result) })
    res.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', 'llm fetch error', { msg })
    res.status(500).json({ error: msg })
  }
})

// ── Existing pipeline routes (preserved) ─────────────────────────────────────
const isProd = (process.env.NODE_ENV || 'production') === 'production'

function buildCtx(extra: Record<string, unknown> = {}) {
  const hasOAI = !!process.env.OPENAI_API_KEY
  const hasVtx = !!process.env.GOOGLE_CLOUD_PROJECT
  return {
    useRealAI:      hasOAI || hasVtx,
    provider:       hasOAI ? openaiProvider : hasVtx ? vertexProvider : null,
    providerConfig: hasOAI ? openaiProvider.initializeOpenAI() : hasVtx ? vertexProvider.initializeVertexAI() : null,
    ...extra,
  }
}

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))
app.get('/api/system-prompt', (_req, res) => res.json({ systemPrompt: getLateralThinkingSystemPrompt() }))

app.post('/api/insight', async (req, res) => {
  const { brief, archetype, brandVoice, language } = req.body || {}
  if (!brief) return void res.status(400).json({ error: 'brief required' })
  try { res.json(await generateInsight(brief, archetype, brandVoice, language)) }
  catch (e: unknown) { res.status(500).json({ error: String(e) }) }
})

app.post('/api/concept', async (req, res) => {
  const { insight, archetype, brandVoice, language } = req.body || {}
  if (!insight) return void res.status(400).json({ error: 'insight required' })
  try { res.json(await mapConcept(insight, buildCtx({ archetype, brandVoice, language }))) }
  catch (e: unknown) { res.status(500).json({ error: String(e) }) }
})

app.post('/api/script', async (req, res) => {
  const { concept, archetype, brandVoice, language } = req.body || {}
  if (!concept) return void res.status(400).json({ error: 'concept required' })
  try { res.json(await writeScript(concept, buildCtx({ archetype, brandVoice, language }))) }
  catch (e: unknown) { res.status(500).json({ error: String(e) }) }
})

app.post('/api/full-pipeline', async (req, res) => {
  const { brief, archetype, brandVoice, language } = req.body || {}
  if (!brief) return void res.status(400).json({ error: 'brief required' })
  try {
    const ctx     = buildCtx({ archetype, brandVoice, language })
    const insight = await generateInsight(brief, archetype, brandVoice, language)
    const concept = await mapConcept(insight, ctx)
    const script  = await writeScript(concept, ctx)
    res.json({ brief, insight, concept, script, pipelineStatus: 'complete' })
  } catch (e: unknown) { res.status(500).json({ error: String(e) }) }
})

// ── Agent + SaaS routes ──────────────────────────────────────────────────────
app.use('/api/agent', agentRoutes)
app.use('/api/saas',  saasRoutes)

// ── POST /api/set-key  (write OpenAI key to keytar — called by ApiKeySetup UI) ─
app.post('/api/set-key', async (req: Request, res: Response) => {
  const { service, account, value } = req.body as { service?: string; account?: string; value?: string }
  if (service !== 'fx-openai' || account !== 'default') {
    return void res.status(400).json({ error: 'Invalid service/account. Only fx-openai/default is permitted.' })
  }
  if (!value || typeof value !== 'string' || !value.startsWith('sk-')) {
    return void res.status(400).json({ error: 'Invalid API key format.' })
  }
  if (!keytar) return void res.status(503).json({ error: 'Keytar not available on this platform.' })
  try {
    await keytar.setPassword('fx-openai', 'default', value)
    log('info', 'api key stored via keytar', { account: 'default' })
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', 'keytar setPassword failed', { msg })
    res.status(500).json({ error: 'Failed to store key: ' + msg })
  }
})

// ── DELETE /api/set-key  (remove key from keytar) ────────────────────────────
app.delete('/api/set-key', async (_req: Request, res: Response) => {
  if (!keytar) return void res.status(503).json({ error: 'Keytar not available.' })
  try {
    await keytar.deletePassword('fx-openai', 'default')
    log('info', 'api key removed from keytar')
    res.json({ ok: true })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ── GET /api/key-status  (check if key is configured — never returns the key) ─
app.get('/api/key-status', async (_req: Request, res: Response) => {
  if (!keytar) return void res.json({ configured: false, reason: 'keytar unavailable' })
  const key = await keytar.getPassword('fx-openai', 'default').catch(() => null)
  res.json({ configured: !!key })
})

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log('error', 'unhandled', { msg: err.message })
  res.status(500).json({ error: 'Internal server error' })
})

// Suppress unused warning
void isProd

// ─── Server bind (127.0.0.1 ONLY) ────────────────────────────────────────────
let server: https.Server | http.Server

if (CERT_PATH && KEY_PATH && fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
  server = https.createServer({ cert: fs.readFileSync(CERT_PATH), key: fs.readFileSync(KEY_PATH) }, app)
  server.listen(PORT, '127.0.0.1', () =>
    log('info', 'HTTPS ready', { port: PORT, bind: '127.0.0.1' })
  )
} else {
  server = http.createServer(app)
  server.listen(PORT, '127.0.0.1', () =>
    log('warn', 'HTTP only — pass --cert/--key for HTTPS', { port: PORT })
  )
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  log('info', `${signal} — shutting down`)
  for (const [id, { proc, timer }] of agents) {
    clearTimeout(timer)
    try { proc.kill('SIGKILL') } catch { /* ignore */ }
    log('info', 'killed agent', { id })
  }
  agents.clear()
  server.close(() => { log('info', 'clean exit'); process.exit(0) })
  setTimeout(() => process.exit(1), 10_000)
}
process.on('SIGTERM',           () => shutdown('SIGTERM'))
process.on('SIGINT',            () => shutdown('SIGINT'))
process.on('uncaughtException', (e) => { log('error', 'uncaught', { msg: e.message }); shutdown('uncaughtException') })
