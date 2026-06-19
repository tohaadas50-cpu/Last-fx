import { LateralThinkingContext, getLateralThinkingSystemPrompt } from './lateral-thinking-agent'

/**
 * Script Writer with Advanced Lateral Thinking
 */

interface ScriptOutput {
  script: string
  beats: string[]
  cameraLanguage: string
  narrativeStrategy: string
  emotionalTurning: string
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

export async function writeScript(concept: any, context?: LateralThinkingContext): Promise<ScriptOutput> {
  let conceptTitle = concept?.title || 'Creative Concept'
  let tagline = concept?.tagline || 'The moment counts'
  let coreIdea = concept?.coreIdea || 'Core strategy'

  if (context?.useRealAI && context.provider) {
    const prompt = `Concept: ${conceptTitle}
    Tagline: ${tagline}
    Core Idea: ${coreIdea}
    
    Task: Write a 30-second emotional screenplay.
    Structure: Beat 1 (Recognition), Beat 2 (Surrender), Beat 3 (Arrival).
    Return JSON: { 
      "script": "...", 
      "beats": ["...", "...", "..."], 
      "cameraLanguage": "...", 
      "narrativeStrategy": "...", 
      "emotionalTurning": "..." 
    }`

    try {
      const response = await context.provider.generateCreativeText(
        prompt,
        getLateralThinkingSystemPrompt(context) + "\n\nSpecific Task: You are now writing a cinematic script. Focus on emotion, pacing, and visual storytelling.",
        context.providerConfig
      );
      const parsed = parseAIJson(response.text);
      if (parsed && parsed.script) {
        return {
          ...parsed,
          lateralThinkingTechniques: ['3-Beat emotional arc', 'Narrative subversion']
        };
      }
    } catch (e) {
      console.warn('Script AI writing failed, falling back to template.');
    }
  }

  // Fallback to Template
  const title = conceptTitle.toUpperCase()

  return {
    script: `SCENE 1: THE DISCOVERY\n\nWe open on a world of noise. Tension. The pace is unbearable.\n\nThen, we see it. ${conceptTitle}. A silent anchor in the chaos.\n\nBEAT 1: RECOGNITION\nThe protagonist stops. The camera lingering on the detail that others miss.\n\nBEAT 2: THE SHIFT\nA deep breath. A decision made in silence. The visual tone shifts from cold to warm gold.\n\nBEAT 3: ARRIVAL\nFinal frame: Absolute clarity.\n\nNARRATOR (V.O.)\n${tagline}\n\nLOGO: ${title}`,
    beats: [
      'The world stops for a second.',
      'A choice is made between the loud and the true.',
      'Clarity settles in like a light fog lifting.'
    ],
    cameraLanguage: 'Cinematic wide shots transitioning to intimate, textural macros.',
    narrativeStrategy: 'Visual silence as a premium differentiator.',
    emotionalTurning: 'Chaos → Connection → Clarity',
    lateralThinkingTechniques: ['Template Scripting']
  }
}
