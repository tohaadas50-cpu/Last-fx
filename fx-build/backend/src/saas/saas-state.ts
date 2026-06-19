import { randomUUID } from 'node:crypto'

export type PlanId = 'starter' | 'pro' | 'studio'

export interface SaaSPlan {
  id: PlanId
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

export interface TenantRecord {
  tenantId: string
  companyName: string
  workspaceSlug: string
  planId: PlanId
  apiKey: string
  createdAt: string
}

export interface UsageRecord {
  agentRuns: number
  aiCallsEstimate: number
  lastRunAt?: string
  notes: string[]
}

export interface UsageEvent {
  kind: 'agent-run' | 'manual'
  units: number
  detail?: string
}

const PLANS: SaaSPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthlyUsd: 0,
    description: 'For internal testing and demos.',
    limits: { seats: 1, projects: 2, agentRunsPerMonth: 20, aiCallsPerMonth: 200 },
    features: ['Agent workbench', 'Basic creative pipeline', 'Local-only storage'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthlyUsd: 29,
    description: 'For solo operators and small teams.',
    limits: { seats: 5, projects: 20, agentRunsPerMonth: 500, aiCallsPerMonth: 5000 },
    features: ['Multi-project workspace', 'Usage tracking', 'Priority agent routing'],
    recommended: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    priceMonthlyUsd: 99,
    description: 'For teams shipping at scale.',
    limits: { seats: 20, projects: 200, agentRunsPerMonth: 5000, aiCallsPerMonth: 50000 },
    features: ['Workspace-level governance', 'API access', 'SaaS-ready telemetry'],
  },
]

const tenants = new Map<string, TenantRecord>()
const usage = new Map<string, UsageRecord>()

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace'
}

function assertPlanId(planId: string): PlanId {
  const allowed: PlanId[] = ['starter', 'pro', 'studio']
  return (allowed.includes(planId as PlanId) ? planId : 'starter') as PlanId
}

export function listPlans(): SaaSPlan[] {
  return PLANS.map(plan => ({ ...plan, features: [...plan.features] }))
}

export function createTenant(input: { companyName: string; planId?: PlanId }): TenantRecord {
  const companyName = input.companyName.trim()
  const planId = assertPlanId(input.planId || 'starter')
  const tenantId = randomUUID()
  const apiKey = `fx_${randomUUID().replace(/-/g, '')}`
  const workspaceSlug = slugify(companyName)

  const tenant: TenantRecord = {
    tenantId,
    companyName,
    workspaceSlug,
    planId,
    apiKey,
    createdAt: new Date().toISOString(),
  }

  tenants.set(tenantId, tenant)
  usage.set(tenantId, {
    agentRuns: 0,
    aiCallsEstimate: 0,
    notes: ['Tenant provisioned'],
  })

  return tenant
}

export function getTenant(tenantId: string): TenantRecord | undefined {
  return tenants.get(tenantId)
}

export function listTenants(): TenantRecord[] {
  return Array.from(tenants.values())
}

export function recordUsage(tenantId: string, event: UsageEvent): UsageRecord | null {
  const tenant = tenants.get(tenantId)
  if (!tenant) return null

  const current = usage.get(tenantId) || { agentRuns: 0, aiCallsEstimate: 0, notes: [] }
  const next: UsageRecord = {
    agentRuns: current.agentRuns + (event.kind === 'agent-run' ? event.units : 0),
    aiCallsEstimate: current.aiCallsEstimate + Math.max(event.units * 12, 0),
    lastRunAt: event.kind === 'agent-run' ? new Date().toISOString() : current.lastRunAt,
    notes: [...current.notes, event.detail || `${event.kind}:${event.units}`].slice(-12),
  }
  usage.set(tenantId, next)
  return next
}

export function getUsage(tenantId: string): UsageRecord | null {
  const record = usage.get(tenantId)
  return record ? { ...record, notes: [...record.notes] } : null
}

export function getSaaSStatus() {
  return {
    billingReady: false,
    authReady: false,
    persistence: 'in-memory-demo',
    plans: listPlans(),
    tenantCount: tenants.size,
    tenants: listTenants().map(t => ({
      tenantId: t.tenantId,
      companyName: t.companyName,
      workspaceSlug: t.workspaceSlug,
      planId: t.planId,
      createdAt: t.createdAt,
    })),
    ready: true,
  }
}
