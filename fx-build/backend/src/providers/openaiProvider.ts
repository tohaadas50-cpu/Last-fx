import OpenAI from 'openai';

interface OpenAIConfig {
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

export interface OpenAIResponse {
  text: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Initialize OpenAI client
 */
export function initializeOpenAI(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.8'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10)
  }
}

/**
 * Generate creative text using OpenAI
 */
export async function generateCreativeText(
  prompt: string,
  systemPrompt: string,
  config: OpenAIConfig
): Promise<OpenAIResponse> {
  try {
    if (!config.apiKey || config.apiKey.includes('mock')) {
      return {
        text: generateMockOpenAIResponse(prompt, systemPrompt),
        model: 'mock-model'
      }
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
    })

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    })

    return {
      text: response.choices[0]?.message?.content || '',
      model: config.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      }
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    return {
      text: generateMockOpenAIResponse(prompt, systemPrompt),
      model: 'error-fallback'
    }
  }
}

/**
 * Mock response generator
 */
function generateMockOpenAIResponse(prompt: string, systemPrompt: string): string {
  const briefMatch = prompt.match(/Product:(.+?)(?:Challenge:|$)/i)
  const challengeMatch = prompt.match(/Challenge:(.+?)(?:Goal:|$)/i)

  const product = briefMatch ? briefMatch[1].trim() : 'the product'
  const challenge = challengeMatch ? challengeMatch[1].trim() : 'the core challenge'

  if (prompt.toLowerCase().includes('insight') || prompt.toLowerCase().includes('lateral')) {
    return `💡 BREAKTHROUGH INSIGHT

The fundamental truth: ${challenge} isn't a problem to solve—it's an opportunity to reframe.

**5 Lateral Thinking Angles:**

1. **PROVOCATION**: What if the opposite were true? Instead of fighting inertia, what if we celebrated it?

2. **ANALOGIES**: This is like a coffee ritual (intentional pause), a luxury item (status), and a fitness achievement (progress).

3. **RANDOM STIMULUS**: The word "compass" connects perfectly—guiding toward wellness, always pointing true north.

4. **OPPOSITE THINKING**: 
   - Extreme: Users obsessed, always carrying it
   - Current: Users forget, see it as boring
   - Sweet Spot: Voluntary yet irresistible

5. **CONSTRAINT REVERSAL**: Instead of "people forget," the truth is "people already want this—they just need permission."

**The Synthesis**: Reposition ${product} from a utilitarian solution to a ritual anchor for self-respect.`
  }

  if (prompt.toLowerCase().includes('concept')) {
    return `✨ STRATEGIC CONCEPT FRAMEWORK

**Positioning**: ${product} is not a tool. It's a daily ritual that transforms how you see yourself.

**Title**: The Permission Principle

**Core Idea**:
Most people want to care for themselves but feel guilty about the time it takes.
This product is the permission slip—the invitation to pause and choose yourself.

**Emotional Journey**:
- Recognition: "I deserve this moment"
- Surrender: "I'm pausing, and it's okay"
- Arrival: "I'm the kind of person who honors myself"

**Brand Paradox**: Mandatory wellness that feels like personal choice.

**Visual Strategy**: Intimate, intentional, unrushed. Show the person, not the product.`
  }

  if (prompt.toLowerCase().includes('script')) {
    return `🎬 EMOTIONAL SCREENPLAY (30 seconds)

OPEN ON:
A hand. A moment. The world pauses.

BEAT 1: RECOGNITION
They notice. Not with intellect—with their body.
Something is calling.

VO (gentle, intimate):
"You know what you need."

BEAT 2: SURRENDER
Time shifts. The camera softens.
They enter the ritual. The world becomes secondary.
Internal transformation in silence.

BEAT 3: ARRIVAL
They set it down. Back to life.
But they've changed.

VO (knowing, present):
"This isn't about the product. It's about who you become by choosing yourself."

SUPER: "[BRAND NAME]"

FADE TO BLACK.

**Technical Notes**:
- Color: Warm, intimate grading
- Sound: Minimalist, breathy
- Pacing: Slow, intentional
- Message: Aspiration, not obligation`
  }

  return `Creative response generated for ${product}. This response integrates lateral thinking principles to provide original, ownable creative that breaks through category clutter.`
}
