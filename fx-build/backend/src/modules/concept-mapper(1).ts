import { LateralThinkingContext, getLateralThinkingSystemPrompt } from './lateral-thinking-agent'

/**
 * Concept Mapper with Advanced Lateral Thinking
 */

interface ConceptOutput {
  title: string
  tagline: string
  coreIdea: string
  visualNotes: string
  creativeDevice: string
  emotionalArc: string
  targetParadox: string
  lateralThinkingTechniques: string[]
}

function parseAIJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

export async function mapConcept(insight: any, context?: LateralThinkingContext): Promise<ConceptOutput> {
  // Extract insights from the lateral thinking breakdown
  let insightText = insight?.mainInsight || insight?.insight || (typeof insight === 'string' ? insight : 'creative insight')

  if (context?.useRealAI && context.provider) {
    const prompt = `Insight: ${insightText}
    
    Task: Transform this insight into a strategic creative concept.
    Return JSON: { 
      "title": "...", 
      "tagline": "...", 
      "coreIdea": "...", 
      "visualNotes": "...", 
      "creativeDevice": "...", 
      "emotionalArc": "...", 
      "targetParadox": "..." 
    }`

    try {
      const response = await context.provider.generateCreativeText(
        prompt,
        getLateralThinkingSystemPrompt(context) + "\n\nSpecific Task: You are now mapping the insight to a concrete creative concept. Focus on strategy and visual metaphor.",
        context.providerConfig
      );
      const parsed = parseAIJson(response.text);
      if (parsed && parsed.title) {
        return {
          ...parsed,
          lateralThinkingTechniques: ['Cognitive Shift', 'Emotional Subversion', 'Metaphor strategy']
        };
      }
    } catch (e) {
      console.warn('Concept AI mapping failed, falling back to template.');
    }
  }

  // Fallback to Template (Existing Logic)
  const analogies = insight?.lateralThinkingBreakdown?.analogies || []
  const analogy = analogies[0] || { metaphor: 'transformation', sourceField: 'ritual' }
  const randomWord = insight?.lateralThinkingBreakdown?.randomStimulus?.randomWord || 'momentum'

  return {
    title: buildTitle(insightText, analogy),
    tagline: buildTagline(insightText, randomWord),
    coreIdea: buildCoreIdea(insightText, analogy, 'choice vs obligation'),
    visualNotes: 'Aesthetic: warm, intimate, intentional.',
    creativeDevice: analogy.metaphor,
    emotionalArc: 'From obligation → inspiration → identity',
    targetParadox: 'Make the easy choice the irresistible choice',
    lateralThinkingTechniques: ['Template Mapping']
  }
}

// Keep helper functions for template fallback
function buildTitle(insight: string, analogy: any): string {
  const words = insight.split(' ').filter(w => w.length > 4)
  const keyword = words[Math.floor(Math.random() * words.length)] || 'Vision'

  const conceptMap: { [key: string]: string } = {
    ritual: 'The Sacred Pause',
    celebration: 'The Daily Victory',
    identity: 'Becoming Who You Are',
    transformation: 'The Metamorphosis',
    connection: 'The Human Thread'
  }

  for (const [key, title] of Object.entries(conceptMap)) {
    if (insight.toLowerCase().includes(key) || analogy?.sourceField?.toLowerCase().includes(key)) return title
  }

  return `The ${keyword} Protocol`
}

function buildTagline(insight: string, randomWord: string): string {
  const templates = [
    `Where ${randomWord} meets intentionality.`,
    `The science of ${randomWord}.`,
    `Unexpectedly ${randomWord}.`,
    `A new frequency of ${randomWord}.`
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

function buildCoreIdea(insight: string, analogy: any, paradox: string): string {
  return `We reposition the product from a utilitarian tool to a symbolic ${analogy.metaphor}.\n\nBy framing it as a ${analogy.sourceField}, we unlock a deeper emotional truth: ${insight}`
}
