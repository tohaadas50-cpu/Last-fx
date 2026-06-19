import { randomUUID } from 'node:crypto'
import * as openaiProvider from '../providers/openaiProvider'
import * as vertexProvider from '../providers/googleVertexProvider'
import { generateInsight } from '../modules/insight-generator'
import { mapConcept } from '../modules/concept-mapper'
import { writeScript } from '../modules/script-writer'
import { getLateralThinkingSystemPrompt, type LateralThinkingContext } from '../modules/lateral-thinking-agent'
import { recordUsage } from '../saas/saas-state'
import type {
  AgentExecutionPlan,
  AgentEvaluation,
  AgentMode,
  AgentRunRecord,
  AgentRunRequest,
  AgentRunResponse,
  AgentStatusResponse,
  AgentTraceItem,
  AgentPhase,
} from './types'

interface RuntimeSelection {
  mode: AgentMode
  provider: any
  providerConfig: unknown
}

const runStore = new Map<string, AgentRunRecord>()
const auditTrail: AgentTraceItem[] = []

function now() {
  return new Date().toISOString()
}

function clampText(value: string, fallback: string) {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean || fallback
}

function selectRuntime(): RuntimeSelection {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasVertex = !!(process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID)

  if (hasOpenAI) {
    return {
      mode: 'OpenAI',
      provider: openaiProvider as any,
      providerConfig: openaiProvider.initializeOpenAI(),
    }
  }

  if (hasVertex) {
    return {
      mode: 'VertexAI',
      provider: vertexProvider as any,
      providerConfig: vertexProvider.initializeVertexAI(),
    }
  }

  return { mode: 'Mock', provider: null, providerConfig: null }
}

function pushAudit(runId: string, phase: AgentPhase, message: string, meta: Record<string, unknown> = {}) {
  const item: AgentTraceItem = { phase, message, ts: now(), meta: Object.keys(meta).length ? meta : undefined }
  auditTrail.push(item)
  const record = runStore.get(runId)
  if (record) {
    record.trace.push(item)
    record.updatedAt = item.ts
    record.status = phase
    runStore.set(runId, record)
  }
  return item
}

function safeParseJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return JSON.parse(text)
  } catch {
    return null
  }
}

function normalizeGoal(goal: string): string {
  return clampText(goal, 'Design a breakthrough TextFX execution loop')
}

function buildBrief(goal: string, brief?: string): string {
  const cleanGoal = normalizeGoal(goal)
  if (brief && brief.trim()) return clampText(brief, cleanGoal)
  return [
    `Goal: ${cleanGoal}`,
    'Task: Create an executive-grade creative product.',
    'Deliverables: insight, concept, script, and an execution plan.',
  ].join('\n')
}

function buildFallbackInsight(goal: string, brief: string, language: 'en' | 'ar' = 'en') {
  const isArabic = language === 'ar'
  return {
    mainInsight: isArabic
      ? `إعادة صياغة ${goal} كطقس واضح بدل مهمة تقنية.`
      : `Reframe ${goal} as a repeatable ritual instead of a technical task.`,
    lateralThinkingBreakdown: {
      provocation: {
        provocation: isArabic ? 'ماذا لو كانت المشكلة ميزة؟' : 'What if the problem is actually the advantage?',
        reversal: isArabic ? 'الوضوح يولد من القيود' : 'Clarity is born from constraints',
        opportunity: isArabic ? 'افتح بابًا أبسط للنتيجة' : 'Open a simpler path to the outcome',
        creativeInsight: isArabic ? 'افصل الضوضاء عن الجوهر' : 'Separate signal from noise',
      },
      analogies: [
        {
          sourceField: isArabic ? 'طقوس يومية' : 'daily ritual',
          sharedPrinciple: isArabic ? 'التكرار مع النية' : 'repetition with intent',
          application: isArabic ? 'اجعل التشغيل سلسًا' : 'make execution frictionless',
          metaphor: isArabic ? 'كأنها قهوة صباحية ثابتة' : 'like a dependable morning coffee',
        },
      ],
      randomStimulus: {
        randomWord: 'compass',
        forcedConnection: isArabic ? 'اتجاه واضح' : 'clear direction',
        visualMetaphor: isArabic ? 'بوصلة' : 'compass',
        unexpectedAngle: isArabic ? 'استعمل البساطة كقوة' : 'use simplicity as leverage',
      },
      oppositeThinking: {
        extremePositive: isArabic ? 'مثالية مفرطة' : 'Over-polished perfection',
        extremeNegative: isArabic ? 'فوضى كاملة' : 'Complete chaos',
        desirableMiddle: isArabic ? 'تنفيذ واثق وبسيط' : 'Confident simple execution',
        paradox: isArabic
          ? 'السرعة الحقيقية تأتي من تقليل الاحتكاك'
          : 'Real speed comes from removing friction',
      },
      constraintReversal: {
        constraint: brief,
        reversal: isArabic ? 'حوّل القيد إلى دليل تشغيل' : 'Turn the constraint into an operating manual',
        opportunity: isArabic ? 'اعمل مسارًا واحدًا واضحًا' : 'Build one clear path',
        insight: isArabic ? 'التركيز يسبق التوسّع' : 'Focus before scale',
      },
      synthesizedInsight: isArabic ? 'البصيرة المجمعة' : 'Synthesized insight',
      creativeBreakthrough: isArabic ? 'نقلة مبدئية' : 'Initial breakthrough',
      agentDebate: {
        voices: [],
        conflictPoint: isArabic ? 'قابلية التنفيذ' : 'Execution feasibility',
        resolution: isArabic ? 'ابدأ بالنواة' : 'Start with the core',
        debateSummary: isArabic ? 'حل وسط ذكي' : 'Smart middle ground',
        trendConnection: isArabic ? 'اتجاه عملي' : 'Practical direction',
        finalMasterpiece: {
          headline: isArabic ? 'النسخة العملية' : 'The operational version',
          tagline: isArabic ? 'بساطة تنفذ بسرعة' : 'Simple enough to ship fast',
          coreIdea: isArabic ? 'مشروع يعمل بدون كسر' : 'A product that works without brittle edges',
          emotionalTruth: isArabic ? 'الوضوح يطمن' : 'Clarity is confidence',
          creativeDevice: isArabic ? 'تقليل الاحتكاك' : 'friction removal',
          visualNotes: isArabic ? 'واجهة نظيفة' : 'clean interface',
        },
      },
      visualPrompt: {
        midjourneyPrompt: isArabic
          ? 'مشهد بسيط وواضح، إضاءة محايدة، عدسة 85mm، تدرجات نظيفة --ar 16:9 --v 6.1'
          : 'Simple, sharp scene, neutral lighting, 85mm lens, clean gradients --ar 16:9 --v 6.1',
        negativePrompt: 'text, watermark, logo, blurry, low quality, stock photo look',
        styleKeywords: ['clean', 'minimal', 'cinematic'],
        colorPalette: ['#111111', '#F5F5F5', '#8A8A8A', '#D0D0D0'],
        mood: isArabic ? 'واضح ومركّز' : 'clear and focused',
        aspectRatio: '16:9',
        version: '--v 6.1',
      },
    },
    constraints: [brief],
    opportunities: [isArabic ? 'مسار واضح' : 'clear path'],
    metaphoricFraming: isArabic ? 'بوصلة' : 'compass',
    emotionalTruth: isArabic ? 'الوضوح يطمئن' : 'clarity reassures',
    creativeMethod: 'Fallback synthesis',
  }
}

function buildFallbackConcept(insight: any, goal: string) {
  const head = insight?.mainInsight || goal
  return {
    title: 'The Adaptive Loop',
    tagline: `A safer path to ${goal}`,
    coreIdea: `${head}\n\nThe product becomes a repeatable workflow that reduces friction and keeps the creative core intact.`,
    visualNotes: 'Minimal, high-contrast, product-first composition.',
    creativeDevice: 'friction removal',
    emotionalArc: 'uncertainty → clarity → confidence',
    targetParadox: 'power through simplicity',
    lateralThinkingTechniques: ['Fallback strategy'],
  }
}

function buildFallbackScript(concept: any) {
  const title = String(concept?.title || 'The Adaptive Loop').toUpperCase()
  const tagline = String(concept?.tagline || 'Simple enough to ship fast')
  return {
    script: `OPEN ON: a chaotic workflow that suddenly slows down.\n\nBEAT 1: RECOGNITION\nThe operator sees the friction.\n\nBEAT 2: SHIFT\nA simpler path appears. Less noise. More control.\n\nBEAT 3: ARRIVAL\nThe system runs clean.\n\nVO:\n${tagline}\n\nLOGO: ${title}`,
    beats: [
      'The system is too noisy to trust.',
      'One clean path replaces the clutter.',
      'Confidence returns when the workflow stops fighting back.',
    ],
    cameraLanguage: 'clean, controlled, product-forward shots',
    narrativeStrategy: 'Show the before/after without over-explaining.',
    emotionalTurning: 'friction → relief → trust',
    lateralThinkingTechniques: ['Fallback scripting'],
  }
}

function createExecutionPlan(
  goal: string,
  brief: string,
  runtime: RuntimeSelection,
  context: LateralThinkingContext
): Promise<AgentExecutionPlan> {
  if (runtime.mode !== 'Mock' && runtime.provider) {
    return runtime.provider.generateCreativeText(
      `Goal: ${goal}
Brief: ${brief}

Return JSON only:
{
  "summary": "one-line plan summary",
  "steps": ["step 1", "step 2", "step 3", "step 4"],
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "risks": ["risk 1", "risk 2"],
  "estimatedMinutes": 30
}`,
      getLateralThinkingSystemPrompt(context) + '\n\nSpecific Task: Create a sharp execution plan for an AI agent. Return valid JSON only.',
      runtime.providerConfig as never
    ).then((response: { text: string }) => {
      const parsed = safeParseJson(response.text)
      if (parsed?.summary && Array.isArray(parsed.steps)) {
        return {
          summary: String(parsed.summary),
          steps: parsed.steps.map((s: unknown) => String(s)).filter(Boolean).slice(0, 6),
          acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria)
            ? parsed.acceptanceCriteria.map((s: unknown) => String(s)).filter(Boolean).slice(0, 6)
            : ['Insight is generated', 'Concept is generated', 'Script is generated'],
          risks: Array.isArray(parsed.risks)
            ? parsed.risks.map((s: unknown) => String(s)).filter(Boolean).slice(0, 6)
            : ['Provider fallback may trigger'],
          estimatedMinutes: Number(parsed.estimatedMinutes || 30),
          mode: runtime.mode,
        }
      }
      throw new Error('invalid plan payload')
    }).catch((error: unknown) => {
      console.warn('[Agent] plan generation fell back:', error instanceof Error ? error.message : String(error))
      return {
        summary: `Execute ${goal} through the TextFX creative pipeline.`,
        steps: [
          'Normalize the brief and detect the brand tone.',
          'Generate lateral-thinking insight.',
          'Convert insight into concept and script.',
          'Evaluate the output and identify the next improvement loop.',
        ],
        acceptanceCriteria: [
          'Insight contains a clear breakthrough',
          'Concept has a named idea and tagline',
          'Script has a 3-beat emotional arc',
        ],
        risks: [
          'Ambiguous goal wording',
          'Provider unavailable, mock fallback engaged',
        ],
        estimatedMinutes: 20,
        mode: runtime.mode,
      }
    })
  }

  return Promise.resolve({
    summary: `Execute ${goal} through the TextFX creative pipeline.`,
    steps: [
      'Normalize the brief and detect the brand tone.',
      'Generate lateral-thinking insight.',
      'Convert insight into concept and script.',
      'Evaluate the output and identify the next improvement loop.',
    ],
    acceptanceCriteria: [
      'Insight contains a clear breakthrough',
      'Concept has a named idea and tagline',
      'Script has a 3-beat emotional arc',
    ],
    risks: [
      'Ambiguous goal wording',
      'Provider unavailable, mock fallback engaged',
    ],
    estimatedMinutes: 20,
    mode: runtime.mode,
  })
}

function buildEvaluation(args: {
  goal: string
  brief: string
  plan: AgentExecutionPlan
  insight: Awaited<ReturnType<typeof generateInsight>>
  concept: Awaited<ReturnType<typeof mapConcept>>
  script: Awaited<ReturnType<typeof writeScript>>
}): AgentEvaluation {
  const strengths: string[] = []
  const weaknesses: string[] = []
  let score = 0

  if (args.goal.trim()) {
    score += 10
    strengths.push('Goal is explicit.')
  } else {
    weaknesses.push('Goal is too vague.')
  }

  if (args.plan.steps.length >= 3) {
    score += 20
    strengths.push('Plan has a clear execution chain.')
  } else {
    weaknesses.push('Plan needs more operational detail.')
  }

  if (args.insight?.mainInsight) {
    score += 20
    strengths.push('Insight produced a concrete breakthrough.')
  } else {
    weaknesses.push('Insight is weak or missing.')
  }

  if (args.concept?.title && args.concept?.tagline) {
    score += 20
    strengths.push('Concept is productized.')
  } else {
    weaknesses.push('Concept needs stronger packaging.')
  }

  if (args.script?.script && Array.isArray(args.script.beats) && args.script.beats.length >= 3) {
    score += 20
    strengths.push('Script has an emotional spine.')
  } else {
    weaknesses.push('Script should be tightened into a 3-beat arc.')
  }

  if (args.brief.length > 120) {
    score += 10
    strengths.push('Brief is rich enough for the model to work with.')
  } else {
    weaknesses.push('Brief is too short for high-confidence output.')
  }

  const verdict: AgentEvaluation['verdict'] =
    score >= 75 ? 'ready' : score >= 50 ? 'needs-review' : 'blocked'

  const nextActions: string[] = []
  if (verdict !== 'ready') nextActions.push('Refine the brief and rerun.')
  if (!args.concept?.title) nextActions.push('Regenerate concept with a stronger constraint.')
  if (!args.script?.script) nextActions.push('Re-run script generation with the approved concept.')
  if (args.plan.risks.length > 0) nextActions.push(`Mitigate: ${args.plan.risks[0]}`)

  return {
    score: Math.min(score, 100),
    verdict,
    strengths,
    weaknesses,
    nextActions: nextActions.slice(0, 6),
  }
}

export function listAgentRuns(): AgentRunRecord[] {
  return Array.from(runStore.values())
    .map(run => ({ ...run, trace: [...run.trace] }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getAgentRun(runId: string): AgentRunRecord | undefined {
  const record = runStore.get(runId)
  return record ? { ...record, trace: [...record.trace] } : undefined
}

export function listAgentAudit(limit = 20): AgentTraceItem[] {
  return auditTrail.slice(-Math.max(1, limit)).map(item => ({ ...item, meta: item.meta ? { ...item.meta } : undefined }))
}

export async function runAgent(input: AgentRunRequest): Promise<AgentRunResponse> {
  const runtime = selectRuntime()
  const goal = normalizeGoal(input.goal)
  const brief = buildBrief(goal, input.brief)
  const runId = randomUUID()
  const startedAt = now()

  const record: AgentRunRecord = {
    runId,
    goal,
    brief,
    tenantId: input.tenantId,
    mode: runtime.mode,
    status: 'queued',
    createdAt: startedAt,
    updatedAt: startedAt,
    trace: [],
    runtime: {
      mode: runtime.mode,
      tenantId: input.tenantId,
      timestamp: startedAt,
    },
  }
  runStore.set(runId, record)
  pushAudit(runId, 'queued', 'Agent run queued', { goal, tenantId: input.tenantId || null, mode: runtime.mode })

  const context: LateralThinkingContext = {
    domain: 'innovation',
    problem: brief,
    target: goal,
    language: input.language || 'en',
    archetype: input.archetype || 'The Creator',
    brandVoice: input.brandVoice || { formalLevel: 5, metaphorLevel: 6, intensity: 5 },
    useRealAI: runtime.mode !== 'Mock',
    provider: runtime.provider,
    providerConfig: runtime.providerConfig as never,
  }

  pushAudit(runId, 'planning', 'Execution plan generation started')
  const plan = await createExecutionPlan(goal, brief, runtime, context)
  record.plan = plan
  record.mode = plan.mode
  record.runtime.mode = plan.mode
  record.updatedAt = now()
  runStore.set(runId, record)
  pushAudit(runId, 'planning', 'Execution plan ready', { steps: plan.steps.length, mode: plan.mode })

  pushAudit(runId, 'insight', 'Insight generation started')
  let insight
  try {
    insight = await generateInsight(brief, input.archetype, input.brandVoice, input.language || 'en')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushAudit(runId, 'insight', 'Insight generation failed; fallback engaged', { message })
    insight = buildFallbackInsight(goal, brief, input.language || 'en') as Awaited<ReturnType<typeof generateInsight>>
  }
  record.insight = insight
  record.runtime.timestamp = now()
  record.updatedAt = now()
  runStore.set(runId, record)
  pushAudit(runId, 'insight', 'Insight ready', { mainInsight: insight?.mainInsight || null })

  pushAudit(runId, 'concept', 'Concept mapping started')
  let concept
  try {
    concept = await mapConcept(insight, context)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushAudit(runId, 'concept', 'Concept mapping failed; fallback engaged', { message })
    concept = buildFallbackConcept(insight, goal) as Awaited<ReturnType<typeof mapConcept>>
  }
  record.concept = concept
  record.runtime.timestamp = now()
  record.updatedAt = now()
  runStore.set(runId, record)
  pushAudit(runId, 'concept', 'Concept ready', { title: concept?.title || null })

  pushAudit(runId, 'script', 'Script generation started')
  let script
  try {
    script = await writeScript(concept, context)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushAudit(runId, 'script', 'Script generation failed; fallback engaged', { message })
    script = buildFallbackScript(concept) as Awaited<ReturnType<typeof writeScript>>
  }
  record.script = script
  record.runtime.timestamp = now()
  record.updatedAt = now()
  runStore.set(runId, record)
  pushAudit(runId, 'script', 'Script ready', { beats: script?.beats?.length || 0 })

  pushAudit(runId, 'evaluating', 'Evaluation started')
  const evaluation = buildEvaluation({ goal, brief, plan, insight, concept, script })
  record.evaluation = evaluation
  record.runtime.timestamp = now()
  record.status = 'done'
  record.updatedAt = now()
  runStore.set(runId, record)
  pushAudit(runId, 'done', 'Agent run completed', { score: evaluation.score, verdict: evaluation.verdict })

  if (input.tenantId) {
    recordUsage(input.tenantId, {
      kind: 'agent-run',
      units: 1,
      detail: `mode=${runtime.mode}; verdict=${evaluation.verdict}`,
    })
  }

  return {
    ...record,
    trace: [...record.trace],
  }
}

export function getAgentStatus(): AgentStatusResponse {
  const runtime = selectRuntime()
  const runs = listAgentRuns()
  const activeRuns = runs.filter(run => run.status !== 'done' && run.status !== 'failed').length

  return {
    ok: true,
    mode: runtime.mode,
    readyForSaaS: true,
    capabilities: ['plan', 'insight', 'concept', 'script', 'evaluation', 'audit', 'runs'],
    counts: {
      totalRuns: runs.length,
      activeRuns,
      auditEvents: auditTrail.length,
    },
    recentRuns: runs.slice(0, 8).map(run => ({
      runId: run.runId,
      goal: run.goal,
      status: run.status,
      mode: run.mode,
      score: run.evaluation?.score,
      verdict: run.evaluation?.verdict,
      updatedAt: run.updatedAt,
    })),
    recentAudit: listAgentAudit(12),
  }
}
