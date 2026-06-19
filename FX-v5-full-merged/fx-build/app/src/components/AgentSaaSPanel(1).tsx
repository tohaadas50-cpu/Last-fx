import React, { useEffect, useMemo, useState } from 'react'

interface AgentRunResponse {
  runId: string
  goal: string
  brief: string
  status: 'queued' | 'planning' | 'insight' | 'concept' | 'script' | 'evaluating' | 'done' | 'failed'
  plan?: {
    summary: string
    steps: string[]
    acceptanceCriteria: string[]
    risks: string[]
    estimatedMinutes: number
    mode: 'OpenAI' | 'VertexAI' | 'Mock'
  }
  evaluation?: {
    score: number
    verdict: 'ready' | 'needs-review' | 'blocked'
    strengths: string[]
    weaknesses: string[]
    nextActions: string[]
  }
  runtime: {
    mode: 'OpenAI' | 'VertexAI' | 'Mock'
    tenantId?: string
    timestamp: string
  }
  trace: Array<{
    phase: string
    message: string
    ts: string
  }>
  error?: string
}

interface SaaSPlan {
  id: 'starter' | 'pro' | 'studio'
  name: string
  priceMonthlyUsd: number
  description: string
  limits: {
    seats: number
    projects: number
    agentRunsPerMonth: number
    aiCallsPerMonth: number
  }
  features: string[]
  recommended?: boolean
}

interface SaaSStatus {
  billingReady: boolean
  authReady: boolean
  persistence: string
  ready: boolean
  tenantCount: number
  tenants: Array<{
    tenantId: string
    companyName: string
    workspaceSlug: string
    planId: string
    createdAt: string
  }>
  plans: SaaSPlan[]
}

interface AgentStatus {
  ok: boolean
  mode: 'OpenAI' | 'VertexAI' | 'Mock'
  readyForSaaS: boolean
  capabilities: string[]
  counts: {
    totalRuns: number
    activeRuns: number
    auditEvents: number
  }
  recentRuns: Array<{
    runId: string
    goal: string
    status: string
    mode: 'OpenAI' | 'VertexAI' | 'Mock'
    score?: number
    verdict?: 'ready' | 'needs-review' | 'blocked'
    updatedAt: string
  }>
  recentAudit: Array<{
    phase: string
    message: string
    ts: string
  }>
}

function jsonFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

export default function AgentSaaSPanel({ apiBase }: { apiBase: string }) {
  const [goal, setGoal] = useState('Build the next TextFX iteration loop for SaaS launch.')
  const [tenantId, setTenantId] = useState<string>('')
  const [tenantName, setTenantName] = useState('TextFX Studio')
  const [planId, setPlanId] = useState<'starter' | 'pro' | 'studio'>('pro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentResult, setAgentResult] = useState<AgentRunResponse | null>(null)
  const [saasStatus, setSaasStatus] = useState<SaaSStatus | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)

  const currentPlan = useMemo(() => {
    return saasStatus?.plans.find(p => p.id === planId) || null
  }, [saasStatus, planId])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [saasRes, agentRes] = await Promise.all([
          jsonFetch(`${apiBase}/api/saas/status`),
          jsonFetch(`${apiBase}/api/agent/status`),
        ])
        if (!saasRes.ok) throw new Error(`HTTP ${saasRes.status}`)
        if (!agentRes.ok) throw new Error(`HTTP ${agentRes.status}`)
        const [saasData, agentData] = await Promise.all([saasRes.json(), agentRes.json()])
        if (alive) {
          setSaasStatus(saasData)
          setAgentStatus(agentData)
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load status')
      }
    })()
    return () => { alive = false }
  }, [apiBase])

  async function refreshStatus() {
    try {
      const [saasRes, agentRes] = await Promise.all([
        jsonFetch(`${apiBase}/api/saas/status`),
        jsonFetch(`${apiBase}/api/agent/status`),
      ])
      if (saasRes.ok) setSaasStatus(await saasRes.json())
      if (agentRes.ok) setAgentStatus(await agentRes.json())
    } catch {
      // silent refresh path
    }
  }

  async function handleRegisterTenant() {
    setBusy(true)
    setError(null)
    try {
      const res = await jsonFetch(`${apiBase}/api/saas/register`, {
        method: 'POST',
        body: JSON.stringify({ companyName: tenantName, planId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTenantId(data.tenant.tenantId)
      await refreshStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tenant registration failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleRunAgent() {
    setBusy(true)
    setError(null)
    try {
      const res = await jsonFetch(`${apiBase}/api/agent/run`, {
        method: 'POST',
        body: JSON.stringify({
          goal,
          tenantId: tenantId || undefined,
          language: 'en',
          archetype: 'The Creator',
          brandVoice: { formalLevel: 6, metaphorLevel: 6, intensity: 5 },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAgentResult(data)
      await refreshStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="stage" aria-labelledby="agent-saas-title">
      <div className="stage-header">
        <h2 className="stage-title" id="agent-saas-title">Agent + SaaS Control Room</h2>
      </div>

      <div className="pane">
        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="two-col">
          <div className="technique">
            <h3 className="technique-label">Agent</h3>
            <textarea
              className="textarea"
              rows={4}
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="State the mission for the agent..."
            />
            <div className="btn-row btn-col">
              <button className="btn btn-primary btn-full" onClick={handleRunAgent} disabled={busy || !goal.trim()}>
                {busy ? 'Running...' : 'Run Agent'}
              </button>
            </div>
          </div>

          <div className="technique">
            <h3 className="technique-label">SaaS</h3>
            <input
              className="textarea"
              style={{ minHeight: 44, marginBottom: 12 }}
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              placeholder="Company / workspace name"
            />
            <div className="btn-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setPlanId('starter')} aria-pressed={planId === 'starter'}>Starter</button>
              <button className="btn btn-secondary" onClick={() => setPlanId('pro')} aria-pressed={planId === 'pro'}>Pro</button>
              <button className="btn btn-secondary" onClick={() => setPlanId('studio')} aria-pressed={planId === 'studio'}>Studio</button>
            </div>
            <div className="btn-row btn-col" style={{ marginTop: 12 }}>
              <button className="btn btn-primary btn-full" onClick={handleRegisterTenant} disabled={busy || !tenantName.trim()}>
                {busy ? 'Provisioning...' : 'Provision Tenant'}
              </button>
            </div>
            {currentPlan && (
              <p className="technique-text" style={{ marginTop: 12 }}>
                {currentPlan.name} — ${currentPlan.priceMonthlyUsd}/mo · {currentPlan.description}
              </p>
            )}
          </div>
        </div>

        {agentResult && (
          <div style={{ marginTop: 24 }}>
            <h3 className="technique-label">Agent Output</h3>
            <p className="technique-text"><strong>Run:</strong> {agentResult.runId} · <strong>Mode:</strong> {agentResult.runtime.mode} · <strong>Status:</strong> {agentResult.status}</p>
            <p className="technique-text"><strong>Score:</strong> {agentResult.evaluation?.score ?? '—'} · <strong>Verdict:</strong> {agentResult.evaluation?.verdict ?? '—'}</p>
            <p className="technique-text"><strong>Summary:</strong> {agentResult.plan?.summary ?? 'No plan'}</p>
            <div className="two-col">
              <div className="technique">
                <h4 className="technique-label">Plan</h4>
                <ul className="technique-list">
                  {agentResult.plan?.steps?.map((step, i) => <li key={i}>{step}</li>)}
                </ul>
              </div>
              <div className="technique">
                <h4 className="technique-label">Evaluation</h4>
                <ul className="technique-list">
                  {agentResult.evaluation?.strengths?.map((item, i) => <li key={`s-${i}`}>{item}</li>)}
                  {agentResult.evaluation?.weaknesses?.map((item, i) => <li key={`w-${i}`}>{item}</li>)}
                </ul>
              </div>
            </div>
            <div className="technique" style={{ marginTop: 16 }}>
              <h4 className="technique-label">Trace</h4>
              <ul className="technique-list">
                {agentResult.trace.map((step, i) => <li key={`t-${i}`}>{step.phase}: {step.message}</li>)}
              </ul>
            </div>
            <div className="technique" style={{ marginTop: 16 }}>
              <h4 className="technique-label">Next Actions</h4>
              <ul className="technique-list">
                {agentResult.evaluation?.nextActions?.map((item, i) => <li key={`n-${i}`}>{item}</li>)}
              </ul>
            </div>
            <div className="technique" style={{ marginTop: 16 }}>
              <h4 className="technique-label">Tenant</h4>
              <p className="technique-text">{tenantId || 'No tenant provisioned yet'}</p>
            </div>
          </div>
        )}

        {agentStatus && (
          <div style={{ marginTop: 24 }}>
            <h3 className="technique-label">Agent Health</h3>
            <p className="technique-text">
              Mode: {agentStatus.mode} · Ready: {agentStatus.readyForSaaS ? 'yes' : 'no'} · Runs: {agentStatus.counts.totalRuns} · Active: {agentStatus.counts.activeRuns}
            </p>
            <div className="archive-grid">
              {agentStatus.recentRuns.map(run => (
                <div key={run.runId} className="archive-card" style={{ textAlign: 'left' }}>
                  <span className="arc-arch">{run.status}</span>
                  <span className="arc-brief">{run.goal.slice(0, 44)}…</span>
                  <span className="technique-text">{run.mode} · Score: {run.score ?? '—'}</span>
                  <span className="technique-text">{run.verdict ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {saasStatus && (
          <div style={{ marginTop: 24 }}>
            <h3 className="technique-label">SaaS Readiness</h3>
            <p className="technique-text">
              Billing: {saasStatus.billingReady ? 'ready' : 'scaffolded'} ·
              Auth: {saasStatus.authReady ? 'ready' : 'scaffolded'} ·
              Persistence: {saasStatus.persistence}
            </p>
            <div className="archive-grid">
              {saasStatus.plans.map(plan => (
                <div key={plan.id} className="archive-card" style={{ textAlign: 'left' }}>
                  <span className="arc-arch">{plan.name}</span>
                  <span className="arc-brief">${plan.priceMonthlyUsd}/mo</span>
                  <span className="technique-text">{plan.description}</span>
                  <span className="technique-text">Seats: {plan.limits.seats} · Projects: {plan.limits.projects}</span>
                  <span className="technique-text">Runs: {plan.limits.agentRunsPerMonth} · Calls: {plan.limits.aiCallsPerMonth}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
