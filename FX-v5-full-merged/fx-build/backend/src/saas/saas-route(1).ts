import express, { Request, Response } from 'express'
import { createTenant, getSaaSStatus, getTenant, getUsage, listPlans } from './saas-state'

const router = express.Router()

router.get('/status', (_req: Request, res: Response) => {
  res.json(getSaaSStatus())
})

router.get('/plans', (_req: Request, res: Response) => {
  res.json({ plans: listPlans() })
})

router.post('/register', (req: Request, res: Response) => {
  const companyName = typeof req.body?.companyName === 'string' ? req.body.companyName.trim() : ''
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : 'starter'

  if (!companyName) {
    return void res.status(400).json({ error: 'companyName is required' })
  }

  try {
    const tenant = createTenant({ companyName, planId: planId as any })
    res.status(201).json({
      tenant,
      usage: getUsage(tenant.tenantId),
      plans: listPlans(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create tenant'
    res.status(500).json({ error: message })
  }
})

router.get('/usage/:tenantId', (req: Request, res: Response) => {
  const tenantId = req.params.tenantId
  const tenant = getTenant(tenantId)

  if (!tenant) {
    return void res.status(404).json({ error: 'tenant not found' })
  }

  res.json({
    tenant,
    usage: getUsage(tenantId),
  })
})

export default router
