import express, { Request, Response } from 'express'
import { getAgentRun, getAgentStatus, listAgentAudit, listAgentRuns, runAgent } from './agent-service'
import type { AgentRunRequest } from './types'

const router = express.Router()

router.get('/status', (_req: Request, res: Response) => {
  res.json(getAgentStatus())
})

router.get('/runs', (_req: Request, res: Response) => {
  res.json({ runs: listAgentRuns() })
})

router.get('/runs/:runId', (req: Request, res: Response) => {
  const run = getAgentRun(req.params.runId)
  if (!run) {
    return void res.status(404).json({ error: 'run not found' })
  }
  res.json({ run })
})

router.get('/audit', (req: Request, res: Response) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)))
  res.json({ audit: listAgentAudit(limit) })
})

router.post('/run', async (req: Request, res: Response) => {
  const body = (req.body || {}) as AgentRunRequest
  const goal = typeof body.goal === 'string' ? body.goal.trim() : ''

  if (!goal) {
    return void res.status(400).json({ error: 'goal is required' })
  }

  try {
    const tenantId =
      (typeof body.tenantId === 'string' && body.tenantId.trim()) ||
      (typeof req.header('x-tenant-id') === 'string' && req.header('x-tenant-id')!.trim()) ||
      undefined

    const result = await runAgent({
      ...body,
      goal,
      tenantId,
    })

    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent failed'
    res.status(500).json({ error: message })
  }
})

export default router
