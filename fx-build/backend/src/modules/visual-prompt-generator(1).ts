/**
 * Visual Prompt Generator v4
 *
 * What changed vs v3:
 *   - buildTrendVisualInjection now returns newsVisualLayer
 *   - Fallback + AI prompts both inject news visual elements
 *   - palette resolver handles sports/politics/tech event overrides
 *   - trendInfluence field includes live headline source
 */

import { LateralThinkingContext } from './lateral-thinking-agent'
import { buildTrendVisualInjection } from './trend-service'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface VisualPrompt {
  midjourneyPrompt: string
  negativePrompt:   string
  styleKeywords:    string[]
  colorPalette:     string[]   // hex codes
  mood:             string
  aspectRatio:      '16:9' | '9:16' | '1:1' | '4:5'
  version:          string
  trendInfluence?:  string     // human-readable note on trend + news influence
}

export interface ConceptInput {
  title:         string
  tagline:       string
  coreIdea:      string
  visualNotes?:  string
  emotionalArc?: string
  targetParadox?: string
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
// ARCHETYPE → VISUAL STYLE
// ─────────────────────────────────────────────

const ARCHETYPE_STYLE: Record<string, string> = {
  'The Hero':      'dramatic lighting, epic wide angles, golden hour, high contrast',
  'The Creator':   'studio lighting, creative process, paint textures, artist hands',
  'The Sage':      'clean minimalism, white space, sharp focus, intellectual tone',
  'The Outlaw':    'dark moody lighting, high contrast, raw textures, edgy composition',
  'The Magician':  'mystical light leaks, luminous particles, transformation visuals',
  'The Lover':     'warm candlelight, bokeh, intimate close-ups, rose gold tones',
  'The Everyman':  'natural daylight, authentic candid moments, documentary style',
  'The Jester':    'vibrant colors, dynamic angles, playful unexpected composition',
  'The Caregiver': 'soft warm light, nurturing hands, gentle textures, pastel tones',
  'The Explorer':  'vast landscapes, natural light, adventure textures, earth tones',
  'The Innocent':  'bright clean light, pure whites, simple joyful moments',
  'The Ruler':     'dramatic shadows, luxury materials, architectural precision',
}
const DEFAULT_STYLE = 'cinematic natural lighting, authentic emotion, premium quality'

// ─────────────────────────────────────────────
// TREND LAYER RESOLVER
// Merges seasonal/domain trend with live news visual hints
// ─────────────────────────────────────────────

interface TrendLayer {
  lighting:        string
  signifiers:      string
  colorNote:       string
  newsLayer:       string   // from live headline visual extraction
  trendInfluence:  string
  paletteOverride: string   // '' | 'ramadan' | 'winter' | 'summer' | 'sports' | 'tech' | ...
}

function resolveTrendLayer(context?: LateralThinkingContext): TrendLayer {
  if (!context?.currentTrends) {
    return { lighting: '', signifiers: '', colorNote: '', newsLayer: '', trendInfluence: '', paletteOverride: '' }
  }

  const { lightingAddition, visualSignifiers, colorMoodAddition, newsVisualLayer } =
    buildTrendVisualInjection(context.currentTrends)

  const trendName = context.currentTrends.primary.keyword
  const liveHead  = context.currentTrends.liveContext?.topHeadline

  // Palette override from news visual layer
  let paletteOverride = ''
  const newsLower = (newsVisualLayer + ' ' + (liveHead || '')).toLowerCase()
  if (/sport|stadium|match|goal|كرة|ملعب/.test(newsLower))        paletteOverride = 'sports'
  else if (/tech|ai|digital|ذكاء|تكنولوجيا/.test(newsLower))      paletteOverride = 'tech'
  else if (/ramadan|رمضان/.test(newsLower + trendName))            paletteOverride = 'ramadan'
  else if (/winter|شتاء/.test(newsLower + trendName))              paletteOverride = 'winter'
  else if (/summer|صيف/.test(newsLower + trendName))               paletteOverride = 'summer'

  const trendInfluence = [
    `Trend: "${trendName}" → ${lightingAddition}`,
    newsVisualLayer ? `Live news visual: ${newsVisualLayer}` : '',
    liveHead        ? `Headline: "${liveHead.slice(0, 60)}"` : '',
  ].filter(Boolean).join(' | ')

  return {
    lighting:       lightingAddition ? `, ${lightingAddition}` : '',
    signifiers:     visualSignifiers.length
      ? `, subtle contextual elements: ${visualSignifiers.slice(0, 3).join(', ')}` : '',
    colorNote:      colorMoodAddition ? ` with ${colorMoodAddition} palette influence` : '',
    newsLayer:      newsVisualLayer ? `, ${newsVisualLayer}` : '',
    trendInfluence,
    paletteOverride,
  }
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

export async function generateVisualPrompt(
  concept: ConceptInput,
  context?: LateralThinkingContext
): Promise<VisualPrompt> {

  const tl = resolveTrendLayer(context)

  // ── AI Path ──
  if (context?.useRealAI && context.provider) {
    const archetypeStyle = ARCHETYPE_STYLE[context.archetype || ''] || DEFAULT_STYLE
    const live = context.currentTrends?.liveContext

    const trendNote = context.currentTrends ? `
Trend context: "${context.currentTrends.primary.keywordEn}"
Lighting mood: ${context.currentTrends.primary.lightingMood}
Color mood: ${context.currentTrends.primary.colorMood}
Visual elements to subtly reference: ${context.currentTrends.primary.visualSignifiers.slice(0, 3).join(', ')}
${live ? `Live news element (weave in subtly): ${live.visualFromNews?.[0] || ''}` : ''}` : ''

    const systemPrompt = `You are a world-class visual art director for advertising campaigns.
You write Midjourney prompts that are cinematic, specific, and emotionally resonant.
Rules:
- English only
- Hyper-specific: light direction, lens type, texture, color temperature
- NEVER use: "beautiful", "amazing", "stunning", "gorgeous", "perfect"
- Weave trend and news visual elements naturally — never obviously branded
- Return ONLY valid JSON — no explanation, no markdown backticks`

    const userPrompt = `Create a Midjourney visual prompt for this concept:

Title: ${concept.title}
Tagline: ${concept.tagline}
Core Idea: ${concept.coreIdea}
Visual Notes: ${concept.visualNotes || 'none'}
Emotional Arc: ${concept.emotionalArc || 'none'}
Brand Archetype Style: ${archetypeStyle}
${trendNote}

Return this exact JSON:
{
  "midjourneyPrompt": "One flowing paragraph: subject + environment + lighting direction + lens + textures + color temperature + mood — all unified",
  "negativePrompt": "comma-separated visual elements to exclude",
  "styleKeywords": ["3 to 5 precise descriptors"],
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "mood": "one-line visual emotional tone",
  "aspectRatio": "16:9",
  "version": "--v 6.1"
}`

    try {
      const res    = await context.provider.generateCreativeText(userPrompt, systemPrompt, context.providerConfig)
      const parsed = safeParseJson(res.text)

      if (parsed?.midjourneyPrompt) {
        const prompt = parsed.midjourneyPrompt.includes('--ar')
          ? parsed.midjourneyPrompt
          : `${parsed.midjourneyPrompt} --ar 16:9 ${parsed.version || '--v 6.1'}`

        return {
          midjourneyPrompt: prompt,
          negativePrompt:   parsed.negativePrompt || 'text, watermark, logo, blurry, low quality, stock photo',
          styleKeywords:    parsed.styleKeywords  || [],
          colorPalette:     parsed.colorPalette   || [],
          mood:             parsed.mood           || concept.emotionalArc || '',
          aspectRatio:      parsed.aspectRatio    || '16:9',
          version:          parsed.version        || '--v 6.1',
          trendInfluence:   tl.trendInfluence     || undefined,
        }
      }
    } catch (err) {
      console.warn('[generateVisualPrompt] AI failed, using fallback:', (err as any).message)
    }
  }

  // ── Fallback ──
  return buildFallbackPrompt(concept, context?.archetype, tl)
}

// ─────────────────────────────────────────────
// FALLBACK — Smart template with trend + news injection
// ─────────────────────────────────────────────

function buildFallbackPrompt(
  concept: ConceptInput,
  archetype: string | undefined,
  tl: TrendLayer
): VisualPrompt {

  const archetypeStyle = ARCHETYPE_STYLE[archetype || ''] || DEFAULT_STYLE

  const titleWords = concept.title
    .replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '')
    .split(' ').filter(w => w.length > 3)
  const sceneAnchor = titleWords.slice(0, 2).join(' ') || 'human moment'

  const arcText  = (concept.emotionalArc || '').toLowerCase()
  const isWarm   = /joy|arrival|clarity|warmth|hope|نور|دفء|أمل/.test(arcText)
  const baseTemp = isWarm
    ? 'warm amber and gold tones'
    : 'cool desaturated tones with selective warm highlights'

  // Compose the prompt in layers
  const parts = [
    `A cinematic advertising photograph capturing "${sceneAnchor}"`,
    `${archetypeStyle}${tl.lighting}`,              // archetype + trend lighting
    `${baseTemp}${tl.colorNote}`,                   // base + trend color
    `shallow depth of field with 85mm lens bokeh`,
    concept.visualNotes || 'authentic human emotion, premium quality',
    tl.signifiers ? tl.signifiers.replace(/^, /, '') : '',  // trend visual signifiers
    tl.newsLayer  ? tl.newsLayer.replace(/^, /, '')  : '',  // live news visual layer
    'film grain texture, editorial photography',
    '--ar 16:9 --v 6.1',
  ].filter(Boolean).join(', ')

  // ── Palette resolution — trend + news override ──
  const palettes: Record<string, string[]> = {
    warm:     ['#D4A574', '#C17B3A', '#2C1810', '#F5E6D3'],
    cool:     ['#2C3E50', '#34495E', '#ECF0F1', '#BDC3C7'],
    ramadan:  ['#C9A84C', '#1A1A2E', '#E8D5A3', '#4A3728'],
    winter:   ['#3D4F5C', '#8B9EA8', '#F2EFE9', '#B5863E'],
    summer:   ['#00B4D8', '#FFC300', '#FFFFFF', '#023E8A'],
    luxury:   ['#1A1A1A', '#C9A84C', '#FFFFFF', '#8B7355'],
    // ── NEW: live-event-driven palettes ──
    sports:   ['#FF4500', '#1A1A1A', '#FFFFFF', '#FFD700'],   // energy, stadium
    tech:     ['#00F5FF', '#0A0A1A', '#7B2FBE', '#E0E0E0'],   // neon, digital
  }

  let key = isWarm ? 'warm' : 'cool'
  if (tl.paletteOverride && palettes[tl.paletteOverride]) key = tl.paletteOverride
  else if (archetype === 'The Ruler' || archetype === 'The Magician') key = 'luxury'

  return {
    midjourneyPrompt: parts,
    negativePrompt:   'text, watermark, logo, blurry, low quality, oversaturated, stock photo look, artificial',
    styleKeywords:    [
      'cinematic', 'editorial', 'authentic',
      archetypeStyle.split(',')[0].trim(),
      tl.paletteOverride || 'natural',
    ].filter((v, i, a) => a.indexOf(v) === i),
    colorPalette:    palettes[key],
    mood:            concept.emotionalArc || 'Tension resolving into clarity',
    aspectRatio:     '16:9',
    version:         '--v 6.1',
    trendInfluence:  tl.trendInfluence || undefined,
  }
}

// ─────────────────────────────────────────────
// FORMAT: Copy-paste ready Midjourney string
// ─────────────────────────────────────────────

export function formatForMidjourney(vp: VisualPrompt): string {
  const negative = vp.negativePrompt ? ` --no ${vp.negativePrompt}` : ''
  return `${vp.midjourneyPrompt}${negative}`
}
