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
    model: process.env.OPENAI_MODEL || 'gpt-4',
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
    // Fallback to mock if using development key
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
 * Stream creative text for real-time response
 */
export async function streamCreativeText(
  prompt: string,
  systemPrompt: string,
  config: OpenAIConfig,
  onChunk?: (chunk: string) => void
): Promise<string> {
  try {
    // TODO: Implement streaming with OpenAI
    const response = generateMockOpenAIResponse(prompt, systemPrompt)

    if (onChunk) {
      // Simulate streaming
      const words = response.split(' ')
      for (const word of words) {
        onChunk(word + ' ')
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    return response
  } catch (error) {
    console.error('Error streaming from OpenAI:', error)
    throw error
  }
}

/**
 * Generate multiple creative variations in parallel
 */
export async function generateCreativeVariations(
  prompt: string,
  systemPrompt: string,
  config: OpenAIConfig,
  count: number = 3
): Promise<OpenAIResponse[]> {
  const variations: OpenAIResponse[] = []

  for (let i = 0; i < count; i++) {
    const variation = await generateCreativeText(
      `${prompt}\n\nGenerate variation ${i + 1} of ${count}. Make it distinct and unique.`,
      systemPrompt,
      config
    )
    variations.push(variation)
  }

  return variations
}

/**
 * Mock response generator (replace with real API calls)
 */
function generateMockOpenAIResponse(prompt: string, systemPrompt: string): string {
  // Extract key elements from prompt
  const briefMatch = prompt.match(/Product:(.+?)(?:Challenge:|$)/i)
  const challengeMatch = prompt.match(/Challenge:(.+?)(?:Goal:|$)/i)

  const product = briefMatch ? briefMatch[1].trim() : 'the product'
  const challenge = challengeMatch ? challengeMatch[1].trim() : 'the core challenge'

  // Generate contextual mock response
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

/**
 * Configuration guide for setting up OpenAI
 */
export function getOpenAISetupGuide(): string {
  return `
## OpenAI Setup Guide

### 1. Get OpenAI API Key
- Go to platform.openai.com
- Sign up or log in
- Navigate to API keys section
- Create a new secret key

### 2. Set Environment Variables
\`\`\`bash
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo
export OPENAI_TEMPERATURE=0.8
export OPENAI_MAX_TOKENS=2000
\`\`\`

### 3. Install OpenAI SDK
\`\`\`bash
npm install openai
\`\`\`

### 4. Test Connection
\`\`\`bash
curl -X POST http://localhost:4000/api/insight \\
  -H "Content-Type: application/json" \\
  -d '{"brief":"Your product brief here"}'
\`\`\`

### Pricing Notes
- GPT-4: More expensive but superior for creative work
- GPT-3.5-turbo: Faster, cheaper, still good for lateral thinking
- Tokens: 1000 tokens ≈ 750 words

### Mock Mode
If API key isn't configured, the system runs in mock mode for testing.
`
}

/**
 * Example implementation for real OpenAI API call
 * Uncomment and modify when ready to integrate
 */
/*
import OpenAI from 'openai';

export async function generateWithRealOpenAI(
  prompt: string,
  systemPrompt: string,
  config: OpenAIConfig
): Promise<OpenAIResponse> {
  const client = new OpenAI({
    apiKey: config.apiKey,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  });

  const text = response.choices[0]?.message?.content || '';

  return {
    text,
    model: config.model,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}

export async function streamWithRealOpenAI(
  prompt: string,
  systemPrompt: string,
  config: OpenAIConfig,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
  });

  const stream = client.chat.completions.stream({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  });

  let fullText = '';

  stream.on('text', (text) => {
    fullText += text;
    if (onChunk) {
      onChunk(text);
    }
  });

  await stream.finalMessage();
  return fullText;
}
*/
