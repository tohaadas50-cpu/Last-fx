/**
 * Lateral Thinking Agent v4 — Live Context Debate
 *
 * What changed vs v3:
 *   - Strategy Master now cites a REAL headline in their Trend Round
 *   - Debate prompt passes liveContext.strategicAngle verbatim
 *   - trendConnection in output includes the live event reference
 *   - ✨ NEW (v4.1): Constraint Reversal added as 5th technique (active AI function)
 */

import { generateVisualPrompt, VisualPrompt, ConceptInput } from './visual-prompt-generator'
import { TrendBundle, buildTrendInjectionBlock } from './trend-service'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface LateralThinkingContext {
  domain: string
  problem: string
  target: string
  emotionalContext?: string
  language?: 'en' | 'ar'
  useRealAI?: boolean
  knowledgePrompt?: string
  archetype?: string
  brandVoice?: {
    formalLevel: number
    metaphorLevel: number
    intensity: number
  }
  provider?: any
  providerConfig?: any
  currentTrends?: TrendBundle
}

export interface ProvocationResult {
  provocation: string; reversal: string; opportunity: string; creativeInsight: string
}
export interface AnalogyResult {
  sourceField: string; sharedPrinciple: string; application: string; metaphor: string
}
export interface RandomStimulusResult {
  randomWord: string; forcedConnection: string; visualMetaphor: string; unexpectedAngle: string
}
export interface OppositeThinkingResult {
  extremePositive: string; extremeNegative: string; desirableMiddle: string; paradox: string
}
export interface ConstraintReversalResult {
  constraint: string; reversal: string; opportunity: string; insight: string
}

export interface AgentVoice {
  agent: 'Creative Rebel' | 'Strategy Master' | 'Picky Client'
  stance: string
  sharpCritique: string
  contribution: string
  trendAngle?: string
  liveEventCite?: string   // ← NEW: "بما إن النهاردة حصل..."
}

export interface AgentDebateResult {
  voices: AgentVoice[]
  conflictPoint: string
  resolution: string
  debateSummary: string
  trendConnection: string
  liveEventUsed?: string   // ← NEW: which headline was woven in
  finalMasterpiece: {
    headline: string
    tagline: string
    coreIdea: string
    emotionalTruth: string
    creativeDevice: string
    visualNotes: string
  }
}

export interface LateralThinkingOutput {
  provocation: ProvocationResult
  analogies: AnalogyResult[]
  randomStimulus: RandomStimulusResult
  oppositeThinking: OppositeThinkingResult
  constraintReversal: ConstraintReversalResult
  synthesizedInsight: string
  creativeBreakthrough: string
  agentDebate: AgentDebateResult
  visualPrompt: VisualPrompt
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────

function safeParseJson(text: string): any {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : JSON.parse(text)
  } catch { return null }
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

export function getLateralThinkingSystemPrompt(context?: LateralThinkingContext): string {
  const language  = context?.language  || 'en'
  const archetype = context?.archetype || 'The Everyman'
  const voice     = context?.brandVoice || { formalLevel: 5, metaphorLevel: 5, intensity: 5 }

  const trendBlock = context?.currentTrends
    ? buildTrendInjectionBlock(context.currentTrends, language) : ''

  // knowledgePrompt carries the reworkDirective from the Orchestrator on iteration 2+
  // Prepended to system prompt so EVERY technique + debate sees the fix directive
  const reworkBlock = context?.knowledgePrompt ? `\n${context.knowledgePrompt}` : ''

  if (language === 'ar') {
    return `أنت مدير إبداعي عالمي متخصص في التفكير الجانبي.
دورك: قلب الطاولة على الافتراضات التقليدية.

[BRAND PERSONALITY]
- النمط: ${archetype}
- النبرة: ${voice.formalLevel > 7 ? 'رسمي' : voice.formalLevel < 3 ? 'عامي' : 'متوازن'}
- الاستعارة: ${voice.metaphorLevel > 7 ? 'شاعري' : 'مباشر'}
- الحدة: ${voice.intensity > 7 ? 'حادة' : voice.intensity < 3 ? 'هادئة' : 'متوازنة'}
${trendBlock}${reworkBlock}
أعد JSON فقط — بدون شرح.`
  }

  return `You are a Creative Director trained in lateral thinking.
Think SIDEWAYS, not forward.
Archetype: ${archetype} | Formal: ${voice.formalLevel}/10 | Metaphor: ${voice.metaphorLevel}/10
${trendBlock}${reworkBlock}
Return JSON only.`
}

// ─────────────────────────────────────────────
// TECHNIQUES  (4 original + NEW 5th: Constraint Reversal)
// ─────────────────────────────────────────────

export async function generateProvocation(c: LateralThinkingContext): Promise<ProvocationResult> {
  const { domain, problem = 'the core challenge', target, language = 'en' } = c
  if (c.useRealAI && c.provider) {
    const trendNote = c.currentTrends ? `\nTrend context: ${c.currentTrends.primary.keywordEn}` : ''
    try {
      const r = await c.provider.generateCreativeText(
        `Technique: PROVOCATION. Domain: ${domain}. Problem: ${problem}. Target: ${target}.${trendNote}
Return JSON: { "provocation":"...", "reversal":"...", "opportunity":"...", "creativeInsight":"..." }`,
        getLateralThinkingSystemPrompt(c), c.providerConfig)
      const p = safeParseJson(r.text); if (p?.provocation) return p
    } catch { console.warn('[Provocation] fallback') }
  }
  return {
    provocation:    language === 'ar' ? `ماذا لو كان ${problem} عكس ما نتوقع؟` : `PO: What if ${problem} were the OPPOSITE?`,
    reversal:       language === 'ar' ? `تقبّل التناقض: ${reverseProblem(problem)}` : `Embrace the paradox: ${reverseProblem(problem)}`,
    opportunity:    findOpportunity(problem, target),
    creativeInsight: language === 'ar' ? `الاحتياج الحقيقي: ${findOpportunity(problem, target)}` : `Real need: ${findOpportunity(problem, target)}`,
  }
}

export async function generateAnalogies(c: LateralThinkingContext): Promise<AnalogyResult[]> {
  if (c.useRealAI && c.provider) {
    try {
      const r = await c.provider.generateCreativeText(
        `Technique: ANALOGIES. Domain: ${c.domain}. Problem: ${c.problem}. Target: ${c.target}.
Return JSON: { "analogies": [{ "sourceField":"...", "sharedPrinciple":"...", "application":"...", "metaphor":"..." }] }`,
        getLateralThinkingSystemPrompt(c), c.providerConfig)
      const p = safeParseJson(r.text); if (p?.analogies) return p.analogies
    } catch { console.warn('[Analogies] fallback') }
  }
  return c.language === 'ar'
    ? [{ sourceField: 'طقوس يومية', sharedPrinciple: 'وقفة ونية', application: 'يصبح طقساً', metaphor: 'التجربة كتأمل صباحي' }]
    : [{ sourceField: 'Daily Ritual', sharedPrinciple: 'A pause of intention', application: 'Product becomes ritual', metaphor: 'Experience as morning meditation' }]
}

export async function generateRandomStimulus(c: LateralThinkingContext): Promise<RandomStimulusResult> {
  const words = ['carousel','lighthouse','echo','threshold','breath','pulse','tide','mirror','compass','spark']
  const randomWord = words[Math.floor(Math.random() * words.length)]
  if (c.useRealAI && c.provider) {
    try {
      const r = await c.provider.generateCreativeText(
        `Technique: RANDOM STIMULUS. Word: ${randomWord}. Brief: ${c.domain} / ${c.problem}.
Return JSON: { "randomWord":"${randomWord}", "forcedConnection":"...", "visualMetaphor":"...", "unexpectedAngle":"..." }`,
        getLateralThinkingSystemPrompt(c), c.providerConfig)
      const p = safeParseJson(r.text); if (p?.forcedConnection) return p
    } catch { console.warn('[RandomStimulus] fallback') }
  }
  return { randomWord, forcedConnection: `Like a ${randomWord} in chaos`, visualMetaphor: `A ${randomWord}`, unexpectedAngle: `What if the brand behaved like a ${randomWord}?` }
}

export async function generateOppositeThinking(c: LateralThinkingContext): Promise<OppositeThinkingResult> {
  if (c.useRealAI && c.provider) {
    try {
      const r = await c.provider.generateCreativeText(
        `Technique: OPPOSITE THINKING. Brief: ${c.problem}. Target: ${c.target}.
Return JSON: { "extremePositive":"...", "extremeNegative":"...", "desirableMiddle":"...", "paradox":"..." }`,
        getLateralThinkingSystemPrompt(c), c.providerConfig)
      const p = safeParseJson(r.text); if (p?.desirableMiddle) return p
    } catch { console.warn('[OppositeThinking] fallback') }
  }
  return {
    extremePositive: c.language === 'ar' ? 'إيجابية مفرطة' : 'Over-engineered perfection',
    extremeNegative: c.language === 'ar' ? 'إهمال تام' : 'Complete indifference',
    desirableMiddle: c.language === 'ar' ? 'الاختيار الواعي' : 'Conscious choice',
    paradox:         c.language === 'ar' ? 'الحرية الحقيقية هي الالتزام الذي تختاره' : 'True freedom is the commitment you choose',
  }
}

/**
 * 🆕 5th Technique: CONSTRAINT REVERSAL
 * Takes a problem constraint and reverses it to uncover hidden opportunities.
 * Turns static constraint mappings into dynamic AI-powered insight.
 */
export async function generateConstraintReversal(c: LateralThinkingContext): Promise<ConstraintReversalResult> {
  const { problem, target, language = 'en', domain } = c

  if (c.useRealAI && c.provider) {
    const trendNote = c.currentTrends ? `\nTrend context: ${c.currentTrends.primary.keywordEn}` : ''
    try {
      const r = await c.provider.generateCreativeText(
        `Technique: CONSTRAINT REVERSAL. Domain: ${domain}. Problem/Constraint: ${problem}. Target: ${target}.${trendNote}
What if the constraint itself became the SOLUTION?
Return JSON: { "constraint":"...", "reversal":"...", "opportunity":"...", "insight":"..." }`,
        getLateralThinkingSystemPrompt(c), c.providerConfig)
      const p = safeParseJson(r.text)
      if (p?.reversal && p?.insight) return p
    } catch { console.warn('[ConstraintReversal] fallback') }
  }

  // Fallback: simple reversal logic
  return {
    constraint: language === 'ar' ? `التحدي: ${problem}` : `Constraint: ${problem}`,
    reversal: language === 'ar'
      ? `ماذا لو كان "${problem}" ليس مشكلة بل هو الحل بنفسه؟`
      : `What if "${problem}" is not the problem — it's the very solution?`,
    opportunity: language === 'ar'
      ? `الفرصة: جعل التحدي ميزة تنافسية`
      : `Opportunity: Turn the constraint into competitive advantage`,
    insight: language === 'ar'
      ? `القيود تحدد الإبداع — اجعل الحد نقطة قوة`
      : `Constraints define creativity — make limitation a strength`,
  }
}

// ─────────────────────────────────────────────
// AGENT DEBATE  — v4: Strategy Master cites real headline
// ─────────────────────────────────────────────

const DEBATE_SYSTEM = `أنت نظام ذكاء اصطناعي إبداعي متعدد الشخصيات.
تقمّص 3 شخصيات في نقاش داخلي حول الأفكار الإبداعية المقدمة.

🔴 المتمرد الإبداعي — جريء، يكسر القواعد، عامية مصرية راقية
🔵 سيد الاستراتيجية — بارد التفكير، يستشهد بأحداث حقيقية ومؤشرات سوقية
🟡 العميل الصعب — صوت السوق، "طب ده هيبيع؟"

قاعدة الـ Strategy Master: يجب أن يستشهد بالحدث الحقيقي المذكور (إن وُجد) ويقول بالضبط "بما إن النهاردة حصل..." أو "لأن اليوم الناس شاغلة بالها بـ..."
أعد JSON فقط.`

async function runAgentDebate(
  raw: Omit<LateralThinkingOutput, 'agentDebate' | 'visualPrompt'>,
  ctx: LateralThinkingContext
): Promise<AgentDebateResult> {

  if (!ctx.useRealAI || !ctx.provider) return buildFallbackDebate(raw, ctx)

  const trend = ctx.currentTrends
  const live  = trend?.liveContext

  // ── Build the Strategy Master's mandatory line ──
  const strategyMasterMandate = live
    ? ctx.language === 'ar'
      ? `سيد الاستراتيجية يجب أن يقول في جولته: "بما إن النهاردة حصل: '${live.topHeadline}' (${live.source}) — ${live.strategicAngle} ده بيخلي توقيت الكامبين ده ضربة معلم."`
      : `Strategy Master MUST say in their turn: "Considering that today: '${live.topHeadline}' (${live.source}) — ${live.strategicAngle} This makes the timing of this campaign perfect."`
    : trend
    ? ctx.language === 'ar'
      ? `سيد الاستراتيجية يجب أن يربط الفكرة بالتريند "${trend.primary.keyword}": ${trend.primary.currentEventSummary || trend.creativeOpportunity}`
      : `Strategy Master MUST connect to trend "${trend.primary.keywordEn}": ${trend.creativeOpportunity}`
    : ''

  const prompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 البريف والمجال
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
المجال: ${ctx.domain}
المشكلة: ${ctx.problem}
الجمهور: ${ctx.target}
${trend ? `\n[التريند الحالي] ${trend.injectionSummary}` : ''}
${live ? `[الخبر الحقيقي اليوم] "${live.topHeadline}" — ${live.source}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 مخرجات التفكير الجانبي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[استفزاز] ${raw.provocation.creativeInsight}
[فرصة]    ${raw.provocation.opportunity}
[استعارة] ${raw.analogies[0]?.metaphor || '—'}
[عشوائي — "${raw.randomStimulus.randomWord}"] ${raw.randomStimulus.unexpectedAngle}
[تناقض]   ${raw.oppositeThinking.paradox}
[وسط]     ${raw.oppositeThinking.desirableMiddle}
[عكس القيد] ${raw.constraintReversal.reversal}
[اختراق]  ${raw.creativeBreakthrough}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 تعليمات النقاش الداخلي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${strategyMasterMandate}

أعد هذا JSON بالضبط:
{
  "voices": [
    {
      "agent": "Creative Rebel",
      "stance": "موقفه في جملتين",
      "sharpCritique": "أقوى نقطة إبداعية",
      "contribution": "إضافته للفكرة النهائية"
    },
    {
      "agent": "Strategy Master",
      "stance": "موقفه — يجب أن يبدأ بـ 'بما إن النهاردة...' إن وُجد خبر حقيقي",
      "sharpCritique": "السؤال الاستراتيجي الأصعب",
      "contribution": "إضافته للفكرة النهائية",
      "trendAngle": "كيف ربط التريند أو الخبر بالفكرة",
      "liveEventCite": "${live ? live.topHeadline : ''}"
    },
    {
      "agent": "Picky Client",
      "stance": "موقفه في جملتين",
      "sharpCritique": "أقوى اعتراض",
      "contribution": "إضافته للفكرة النهائية"
    }
  ],
  "conflictPoint": "نقطة الخلاف الرئيسية",
  "resolution": "كيف تم الحل",
  "debateSummary": "ملخص النقاش في 3 جمل بالعامية المصرية",
  "trendConnection": "كيف تم دمج التريند أو الخبر في الفكرة النهائية",
  "liveEventUsed": "${live?.topHeadline || ''}",
  "finalMasterpiece": {
    "headline": "الـ headline النهائي — مرتبط باللحظة الحالية",
    "tagline": "الـ tagline — قصير وحاد",
    "coreIdea": "الفكرة في جملتين",
    "emotionalTruth": "الحقيقة العاطفية العميقة",
    "creativeDevice": "الأداة الإبداعية",
    "visualNotes": "المشهد البصري"
  }
}`

  try {
    const r = await ctx.provider.generateCreativeText(prompt, DEBATE_SYSTEM, ctx.providerConfig)
    const parsed = safeParseJson(r.text)
    if (parsed?.finalMasterpiece && parsed?.voices) return parsed as AgentDebateResult
    console.warn('[AgentDebate] Bad JSON shape, fallback.')
  } catch (err) {
    console.warn('[AgentDebate] AI failed:', (err as any).message)
  }

  return buildFallbackDebate(raw, ctx)
}

// ─────────────────────────────────────────────
// FALLBACK DEBATE
// ─────────────────────────────────────────────

function buildFallbackDebate(
  raw: Omit<LateralThinkingOutput, 'agentDebate' | 'visualPrompt'>,
  ctx: LateralThinkingContext
): AgentDebateResult {
  const metaphor = raw.analogies[0]?.metaphor || 'transformation'
  const paradox  = raw.oppositeThinking.paradox
  const trend    = ctx.currentTrends
  const live     = trend?.liveContext

  // Strategy Master's live event line
  const liveEventCite = live
    ? ctx.language === 'ar'
      ? `بما إن النهاردة حصل: "${live.topHeadline}" (${live.source}) — ده بيعني إن توقيت الكامبين ده مش ممكن يكون أحسن من كده.`
      : `Considering that today: "${live.topHeadline}" (${live.source}) — the timing for this campaign couldn't be better.`
    : trend
    ? ctx.language === 'ar'
      ? `الناس دلوقتي شاغلة بالها بـ "${trend.primary.keyword}" — الفكرة دي بتتقاطع مباشرة مع ${trend.primary.emotionalCharge}.`
      : `People right now are focused on "${trend.primary.keywordEn}" — this idea directly intersects with ${trend.primary.emotionalCharge}.`
    : 'ربط الفكرة باللحظة الحالية يضاعف الـ relevance.'

  const trendConnection = live
    ? ctx.language === 'ar'
      ? `الفكرة تستند إلى حدث حقيقي من اليوم: "${live.topHeadline}" — وتحوله من مجرد خبر إلى سياق عاطفي للكامبين.`
      : `The idea is anchored in today's real event: "${live.topHeadline}" — turning news into campaign emotional context.`
    : `ربط الفكرة بـ "${trend?.primary.keyword || 'اللحظة الحالية'}" عبر ${metaphor}.`

  return {
    voices: [
      {
        agent: 'Creative Rebel',
        stance: 'الفكرة فيها جوهر — بس لازم نكسر الـ safe zone ونروح للزاوية اللي هتخوّف الكل.',
        sharpCritique: `الاستعارة "${metaphor}" دي سلاح — استخدمها كـ mechanic للحملة كلها.`,
        contribution: 'بنى على الـ metaphor كموقف، مش بس كصورة.',
      },
      {
        agent: 'Strategy Master',
        stance: liveEventCite,
        sharpCritique: 'هل الجمهور هيفهم التناقض ده ويتفاعل معاه؟ وفين الـ measurable hook؟',
        contribution: 'أضاف توقيت مثالي مبني على حدث حقيقي ومؤشر قياس واضح.',
        trendAngle: trendConnection,
        liveEventCite: live?.topHeadline,
      },
      {
        agent: 'Picky Client',
        stance: 'بحب الفكرة — بس الناس بتحب اللي تتعرف عليه. أول 3 ثواني لازم تمسك.',
        sharpCritique: 'محتاج الـ hook يكون أسرع وأوضح للشريحة المستهدفة.',
        contribution: 'ضغط على السرعة والوضوح في الـ entry point.',
      },
    ],
    conflictPoint: 'التوازن بين الجرأة الإبداعية والوضوح العاطفي السريع.',
    resolution: 'نبدأ بالوضوح في 3 ثواني، ثم نضرب بالجرأة كامتداد عضوي.',
    debateSummary: `المتمرد أراد الجرأة الكاملة، الاستراتيجي استشهد بـ "${live?.topHeadline?.slice(0, 40) || trend?.primary.keyword || 'الحدث الحالي'}" وقال إن التوقيت مثالي، والعميل أصرّ على الوضوح. الحل: ${metaphor} كـ entry point والتناقض "${paradox}" كـ payoff.`,
    trendConnection,
    liveEventUsed: live?.topHeadline,
    finalMasterpiece: {
      headline: live
        ? ctx.language === 'ar' ? `في اللحظة دي بالظبط — ${ctx.problem.slice(0, 25)}` : `Right at this moment — ${ctx.problem.slice(0, 25)}`
        : ctx.language === 'ar' ? `مش ${ctx.problem.slice(0, 25)} — ده اختيار` : `Not ${ctx.problem.slice(0, 25)} — it's a choice`,
      tagline: metaphor.charAt(0).toUpperCase() + metaphor.slice(1),
      coreIdea: `${trendConnection} نُعيد تأطير ${ctx.problem} كقرار إنساني واعٍ.`,
      emotionalTruth: paradox,
      creativeDevice: live ? 'Newsjacking + Reframe' : 'Reframe — تحويل الـ problem إلى choice',
      visualNotes: `${ctx.domain} في لحظة صمت، ${trend?.primary.lightingMood || 'إضاءة دافئة'}، كادر حميمي — تلمّح لـ "${live?.topHeadline?.slice(0, 30) || trend?.primary.keyword || ''}" بطريقة بصرية غير مباشرة.`,
    },
  }
}

// ─────────────────────────────────────────────
// SYNTHESIZE — Now with all 5 techniques
// ─────────────────────────────────────────────

export async function synthesizeLateralThinking(
  ctx: LateralThinkingContext
): Promise<LateralThinkingOutput> {

  const [provocation, analogies, randomStimulus, oppositeThinking, constraintReversal] = await Promise.all([
    generateProvocation(ctx),
    generateAnalogies(ctx),
    generateRandomStimulus(ctx),
    generateOppositeThinking(ctx),
    generateConstraintReversal(ctx),
  ])

  const synthesizedInsight = [
    `From provocation: ${provocation.opportunity}`,
    `From analogies: Like a ${analogies[0]?.metaphor || 'ritual'}.`,
    `From random ("${randomStimulus.randomWord}"): ${randomStimulus.unexpectedAngle}`,
    `From opposite: ${oppositeThinking.desirableMiddle.split('\n')[0]}`,
    `From constraint reversal: ${constraintReversal.insight}`,
  ].join('\n\n')

  const creativeBreakthrough = ctx.language === 'ar'
    ? '🎯 نحتضم التناقض: اجعل النسيان مستحيلاً بجعل التذكر لا يُقاوم.'
    : '🎯 Embrace the paradox: make forgetting impossible by making remembering irresistible.'

  const raw = { provocation, analogies, randomStimulus, oppositeThinking, constraintReversal, synthesizedInsight, creativeBreakthrough }

  const agentDebate = await runAgentDebate(raw, ctx)

  const mp = agentDebate.finalMasterpiece
  const visualPrompt = await generateVisualPrompt(
    { title: mp.headline, tagline: mp.tagline, coreIdea: mp.coreIdea, visualNotes: mp.visualNotes, emotionalArc: mp.emotionalTruth },
    ctx
  )

  return { ...raw, agentDebate, visualPrompt }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function reverseProblem(p: string): string {
  const m: Record<string, string> = {
    forget: 'people need permission, not reminders', boring: 'sacred ritual',
    utilitarian: 'luxury experience', challenge: 'dormant opportunity',
    ينسى: 'يحتاجون تحفيزاً', ممل: 'طقس مقدس', صعب: 'فرصة كامنة',
  }
  for (const [k, v] of Object.entries(m)) { if (p.toLowerCase().includes(k)) return v }
  return `the opposite of "${p}"`
}

function findOpportunity(problem: string, target: string): string {
  const m: Record<string, string> = {
    forget: 'making action feel inevitable', sacred: 'turning practice into self-care',
    luxury: 'positioning as premium self-gift', ينسى: 'جعل العادة بديهية', ممل: 'تحويلها لعناية ذاتية',
  }
  const c = (problem + ' ' + target).toLowerCase()
  for (const [k, v] of Object.entries(m)) { if (c.includes(k)) return v }
  return 'the deeper human need beneath the surface problem'
}
