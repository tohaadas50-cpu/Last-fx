import type { LateralThinkingContext } from '../modules/lateral-thinking-agent'

export type AgentMode = 'OpenAI' | 'VertexAI' | 'Mock'
export type AgentPhase = 'queued' | 'planning' | 'insight' | 'concept' | 'script' | 'evaluating' | 'done' | 'failed'

export interface AgentRunRequest {
  goal: string
  brief?: string
  archetype?: string
  language?: 'en' | 'ar'
  brandVoice?: LateralThinkingContext['brandVoice']
  tenantId?: string
}

export interface AgentExecutionPlan {
  summary: string
  steps: string[]
  acceptanceCriteria: string[]
  risks: string[]
  estimatedMinutes: number
  mode: AgentMode
}

export interface AgentEvaluation {
  score: number
  verdict: 'ready' | 'needs-review' | 'blocked'
  strengths: string[]
  weaknesses: string[]
  nextActions: string[]
}

export interface AgentTraceItem {
  phase: AgentPhase
  message: string
  ts: string
  meta?: Record<string, unknown>
}

export interface AgentRunRecord {
  runId: string
  goal: string
  brief: string
  tenantId?: string
  mode: AgentMode
  status: AgentPhase
  createdAt: string
  updatedAt: string
  trace: AgentTraceItem[]
  runtime: {
    mode: AgentMode
    tenantId?: string
    timestamp: string
  }
  plan?: AgentExecutionPlan
  insight?: Awaited<ReturnType<typeof import('../modules/insight-generator').generateInsight>>
  concept?: Awaited<ReturnType<typeof import('../modules/concept-mapper').mapConcept>>
  script?: Awaited<ReturnType<typeof import('../modules/script-writer').writeScript>>
  evaluation?: AgentEvaluation
  error?: string
}

export interface AgentRunResponse extends AgentRunRecord {}

export interface AgentStatusResponse {
  ok: boolean
  mode: AgentMode
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
    status: AgentPhase
    mode: AgentMode
    score?: number
    verdict?: AgentEvaluation['verdict']
    updatedAt: string
  }>
  recentAudit: AgentTraceItem[]
}
