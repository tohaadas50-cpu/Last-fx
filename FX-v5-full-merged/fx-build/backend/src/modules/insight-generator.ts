import {
  synthesizeLateralThinking,
  LateralThinkingContext,
  LateralThinkingOutput
} from './lateral-thinking-agent'
import { retrieveKnowledge, getKnowledgeInjectPrompt } from './knowledge-base'
import * as openaiProvider from '../providers/openaiProvider'
import * as vertexProvider from '../providers/googleVertexProvider'

/**
 * Insight Generator with Advanced Lateral Thinking
 * Uses: Provocation, Analogies, Random Stimulus, Opposite Thinking, Constraint Reversal
 */

interface InsightOutput {
  mainInsight: string
  lateralThinkingBreakdown: LateralThinkingOutput
  constraints: string[]
  opportunities: string[]
  metaphoricFraming: string
  emotionalTruth: string
  creativeMethod: string
}

export async function generateInsight(
  brief: string,
  archetype?: string,
  brandVoice?: LateralThinkingContext['brandVoice'],
  language: 'en' | 'ar' = 'en'
): Promise<InsightOutput> {
  try {
    // Parse brief into structured context
    const context = parseBrief(brief)

    // RAG: Retrieve knowledge from library
    const knowledgeSnippets = await retrieveKnowledge(brief + ' ' + context.domain)
    const knowledgePrompt = getKnowledgeInjectPrompt(knowledgeSnippets)

    // Inject knowledge and personality into context
    const contextWithKnowledge = { ...context, knowledgePrompt, archetype, brandVoice, language }

    // Run all 5 lateral thinking techniques
    // Choose Provider
    let provider: any = null;
    let providerConfig: any = null;
    let useRealAI = false;

    if (process.env.OPENAI_API_KEY) {
      provider = openaiProvider;
      providerConfig = openaiProvider.initializeOpenAI();
      useRealAI = true;
    } else if (process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID) {
      provider = vertexProvider;
      providerConfig = vertexProvider.initializeVertexAI();
      useRealAI = true;
    }

    const lateralOutput = await synthesizeLateralThinking({
      ...contextWithKnowledge,
      useRealAI,
      provider,
      providerConfig
    })

    // Extract key insights
    const mainInsight = extractMainInsight(lateralOutput)
    const constraints = extractConstraints(context)
    const opportunities = extractOpportunities(lateralOutput)
    const metaphoricFraming = extractMetaphor(lateralOutput)
    const emotionalTruth = extractEmotionalTruth(lateralOutput)

    return {
      mainInsight,
      lateralThinkingBreakdown: lateralOutput,
      constraints,
      opportunities,
      metaphoricFraming,
      emotionalTruth,
      creativeMethod:
        'Provocation + Analogies + Random Stimulus + Opposite Thinking + Constraint Reversal'
    }
  } catch (e) {
    console.error('Error in generateInsight:', e)
    throw e
  }
}

function parseBrief(brief: string): LateralThinkingContext {
  // Simple extraction; in production, use NLP
  return {
    domain: extractField(brief, 'product|category') || 'innovation',
    problem: extractField(brief, 'problem|challenge|need') || brief.substring(0, 100),
    target: extractField(brief, 'target|audience|user|people') || 'end user',
    emotionalContext: extractField(brief, 'feel|emotion|tension|paradox') || 'balance'
  }
}

function extractField(text: string, keywords: string): string | undefined {
  const regex = new RegExp(`${keywords}[:\\s]+([^.]+)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : undefined
}

function extractMainInsight(output: LateralThinkingOutput): string {
  // Synthesize the main insight from all techniques
  const lines = output.synthesizedInsight.split('\n').filter((l) => l.trim())
  const breakthrough = output.creativeBreakthrough.split('\n').filter((l) => l.trim())
  return breakthrough[1] || output.synthesizedInsight
}

function extractConstraints(context: LateralThinkingContext): string[] {
  // Constraint reversal is now handled by the active AI technique
  return [context.problem] // Return the main problem as the constraint
}

function extractOpportunities(output: LateralThinkingOutput): string[] {
  // Gather opportunities from all techniques
  const opportunities: string[] = [
    output.provocation.opportunity,
    output.analogies?.[0]?.metaphor || 'ritual transformation',
    output.randomStimulus?.unexpectedAngle || 'unique perspective',
    output.oppositeThinking?.desirableMiddle?.split('\n')[0] || 'balanced approach'
  ]
  return opportunities.filter((o) => o && o.length > 0)
}

function extractMetaphor(output: LateralThinkingOutput): string {
  // Use the strongest metaphor from analogies and random stimulus
  const strongestAnalogy = output.analogies?.[0]?.metaphor
  const randomMetaphor = output.randomStimulus?.visualMetaphor
  return strongestAnalogy || randomMetaphor || 'transformation'
}

function extractEmotionalTruth(output: LateralThinkingOutput): string {
  // Extract emotional truth from the paradox
  const paradoxText = output.oppositeThinking?.paradox || ''
  const lines = paradoxText.split('\n').filter((l) => l.trim())
  return lines[1] || 'Emotional truth emerging from paradox'
}
