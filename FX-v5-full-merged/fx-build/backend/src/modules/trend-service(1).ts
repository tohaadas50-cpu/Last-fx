/**
 * Trend Service v4 — Live Intelligence Engine
 *
 * Resolver Chain (first success wins):
 *   1. SerpApi News Search    → real headlines from today
 *   2. SerpApi Google Trends  → rising queries
 *   3. Mock Seasonal          → month + region awareness
 *   4. Mock Domain Library    → industry archetypes
 *
 * Env vars:
 *   SERPAPI_KEY       → enables live mode
 *   TRENDS_REGION     → geo (default: EG)
 *   NEWS_LANGUAGE     → hl param (default: ar)
 *   NEWS_MAX_RESULTS  → how many headlines to fetch (default: 5)
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface LiveNewsItem {
  title: string
  source: string
  date: string
  snippet: string
  link: string
  visualHint?: string   // extracted visual element (sport/nature/urban/etc.)
}

export interface TrendTopic {
  keyword: string
  keywordEn: string
  type: 'seasonal' | 'cultural' | 'tech' | 'social' | 'economic' | 'news' | 'live'
  heat: number                // 0–100
  emotionalCharge: string
  visualSignifiers: string[]
  copyAngles: string[]
  colorMood: string
  lightingMood: string
  // ── NEW: Live news ──
  liveHeadlines?: LiveNewsItem[]
  currentEventSummary?: string   // 1-line synthesis for the debate prompt
  visualFromNews?: string[]      // visual elements extracted from headlines
}

export interface TrendBundle {
  primary: TrendTopic
  supporting: TrendTopic[]
  culturalMoment: string
  creativeOpportunity: string
  injectionSummary: string
  // ── NEW ──
  liveContext?: {
    topHeadline: string
    source: string
    date: string
    strategicAngle: string      // "بما إن النهاردة حصل..."
    visualFromNews: string[]
  }
  fetchedAt: Date
  source: 'serpapi-news' | 'serpapi-trends' | 'mock-seasonal' | 'mock-domain' | 'mock-universal'
}

// ─────────────────────────────────────────────
// LIVE NEWS FETCHER  (SerpApi /search — news type)
// Docs: https://serpapi.com/news-results
// ─────────────────────────────────────────────

async function fetchLiveNews(
  domain: string,
  region: string,
  language: 'en' | 'ar'
): Promise<LiveNewsItem[] | null> {

  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return null

  try {
    const geo = region.toUpperCase()
    const hl  = language === 'ar' ? 'ar' : 'en'
    const gl  = geo.toLowerCase()
    const maxResults = parseInt(process.env.NEWS_MAX_RESULTS || '5', 10)

    // Build query: domain-aware, geo-specific, time-bounded to today
    const query = language === 'ar'
      ? `${domain} أخبار اليوم`
      : `${domain} news today`

    const url = [
      'https://serpapi.com/search.json',
      `?engine=google`,
      `&q=${encodeURIComponent(query)}`,
      `&tbm=nws`,           // News tab
      `&tbs=qdr:d`,         // Past 24 hours
      `&gl=${gl}`,
      `&hl=${hl}`,
      `&num=${maxResults}`,
      `&api_key=${apiKey}`,
    ].join('')

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),   // 5s hard timeout
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) {
      console.warn(`[TrendService] SerpApi news returned ${response.status}`)
      return null
    }

    const data = await response.json()
    const results = data?.news_results || []

    if (!results.length) return null

    return results.slice(0, maxResults).map((item: any) => ({
      title:       item.title   || '',
      source:      item.source  || '',
      date:        item.date    || 'today',
      snippet:     item.snippet || '',
      link:        item.link    || '',
      visualHint:  extractVisualHintFromHeadline(item.title + ' ' + item.snippet),
    }))

  } catch (err: any) {
    // Timeout or network failure — graceful fallback
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.warn('[TrendService] News fetch timed out, using cached intelligence.')
    } else {
      console.warn('[TrendService] SerpApi news failed:', err.message)
    }
    return null
  }
}

// ─────────────────────────────────────────────
// VISUAL HINT EXTRACTOR
// Scans a headline for visual keywords → used in Midjourney injection
// ─────────────────────────────────────────────

function extractVisualHintFromHeadline(text: string): string {
  const lower = text.toLowerCase()

  const visualMap: [RegExp, string][] = [
    // Sports
    [/كرة|مباراة|بطول|رياض|ملعب|لاعب|goal|match|stadium|sport|champion/i, 'sports energy, stadium lights, motion blur, athletic movement'],
    // Nature / Environment
    [/طقس|مناخ|أمطار|فيضان|حريق|جفاف|weather|climate|flood|fire|storm/i, 'dramatic natural forces, extreme weather atmosphere'],
    // Technology / AI
    [/ذكاء|تكنولوجيا|هاتف|تطبيق|AI|tech|digital|robot|startup|launch/i, 'neon data streams, glowing interfaces, tech minimalism'],
    // Economy / Finance
    [/اقتصاد|بورصة|أسعار|تضخم|استثمار|economy|market|price|inflation|invest/i, 'sharp financial graphics, ascending charts, confident suits'],
    // Construction / Real Estate
    [/بناء|عقار|مشروع|طريق|جسر|construction|building|project|infrastructure/i, 'architectural scale, concrete and glass, urban development'],
    // Politics / Government
    [/حكومة|قرار|وزير|رئيس|government|minister|president|policy|election/i, 'formal settings, official environments, measured tones'],
    // Health / Medical
    [/صحة|مستشفى|دواء|فيروس|health|hospital|medicine|vaccine|virus/i, 'clinical clean whites, medical precision, hopeful recovery'],
    // Culture / Art / Ramadan
    [/رمضان|فن|موسيقى|مهرجان|ثقافة|ramadan|art|music|festival|culture/i, 'warm cultural textures, festive atmosphere, heritage details'],
  ]

  for (const [pattern, hint] of visualMap) {
    if (pattern.test(lower)) return hint
  }

  return ''
}

// ─────────────────────────────────────────────
// LIVE TRENDS FETCHER  (SerpApi /search?engine=google_trends)
// ─────────────────────────────────────────────

async function fetchRealTrends(
  domain: string,
  region: string,
  language: 'en' | 'ar'
): Promise<TrendTopic[] | null> {

  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return null

  try {
    const geo = region.toUpperCase()
    const hl  = language === 'ar' ? 'ar' : 'en'

    const url = [
      'https://serpapi.com/search.json',
      `?engine=google_trends`,
      `&q=${encodeURIComponent(domain)}`,
      `&geo=${geo}`,
      `&hl=${hl}`,
      `&data_type=RELATED_QUERIES`,
      `&api_key=${apiKey}`,
    ].join('')

    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return null

    const data = await response.json()
    const rising = data?.related_queries?.rising || []
    if (!rising.length) return null

    return rising.slice(0, 3).map((item: any, i: number) => ({
      keyword:          item.query,
      keywordEn:        item.query,
      type:             'live' as const,
      heat:             Math.max(50, 100 - i * 12),
      emotionalCharge:  'rising interest',
      visualSignifiers: ['current moment', 'what people search right now'],
      copyAngles:       [`Connect to: ${item.query}`],
      colorMood:        'follow domain palette',
      lightingMood:     'fresh and current',
    }))
  } catch (err) {
    console.warn('[TrendService] Google Trends fetch failed:', (err as any).message)
    return null
  }
}

// ─────────────────────────────────────────────
// CURRENT EVENT SYNTHESIZER
// Converts raw headlines → one debate-ready sentence
// ─────────────────────────────────────────────

function synthesizeCurrentEvent(
  headlines: LiveNewsItem[],
  domain: string,
  language: 'en' | 'ar'
): string {

  if (!headlines.length) return ''

  const top = headlines[0]
  const dateLabel = top.date === 'today' ? (language === 'ar' ? 'النهاردة' : 'today') : top.date

  if (language === 'ar') {
    return `بما إن ${dateLabel} حصل: "${top.title}" (${top.source}) — ده يخلي الفكرة دي ضربة معلم لأن الناس شاغل بالها بالموضوع ده بالظبط.`
  }

  return `Considering that ${dateLabel}: "${top.title}" (${top.source}) — this makes the idea a perfect timing play since people are actively thinking about this right now.`
}

// ─────────────────────────────────────────────
// SEASONAL INTELLIGENCE
// ─────────────────────────────────────────────

function getSeasonalTrends(month: number, region: string): TrendTopic[] {
  const isArabic = ['EG','SA','AE','KW','QA','BH','JO','LB'].includes(region.toUpperCase())

  // Ramadan (approximate window — adjust by year)
  if (isArabic && [9, 10].includes(month)) return [{
    keyword: 'رمضان', keywordEn: 'Ramadan', type: 'cultural', heat: 98,
    emotionalCharge: 'nostalgia + spiritual anticipation + family warmth',
    visualSignifiers: ['fanous lanterns', 'crescent moon', 'iftar table', 'warm amber light', 'dates and water'],
    copyAngles: ['العودة للأصل — رمضان بيفضّل اللي بيفضّل', 'مش بس صيام — ده وقت إعادة اكتشاف نفسك'],
    colorMood: 'warm amber, deep gold, midnight blue with starlight',
    lightingMood: 'golden hour candlelight, soft shadows, warm lantern glow',
  }]

  if ([6, 7, 8].includes(month)) return [{
    keyword: isArabic ? 'الصيف والسفر' : 'summer travel', keywordEn: 'summer travel',
    type: 'seasonal', heat: 82,
    emotionalCharge: 'freedom + escape + energy',
    visualSignifiers: ['bright sunlight', 'open road', 'turquoise water', 'ice cold drinks'],
    copyAngles: [isArabic ? 'الصيف مش إجازة — ده حالة ذهنية' : 'Summer is a state of mind'],
    colorMood: 'vivid cyan, electric yellow, crisp white',
    lightingMood: 'harsh midday sun, lens flare, bleached whites',
  }]

  if ([12, 1, 2].includes(month)) return [{
    keyword: isArabic ? 'الشتاء والدفء' : 'winter comfort', keywordEn: 'winter comfort',
    type: 'seasonal', heat: 75,
    emotionalCharge: 'warmth + introspection + comfort',
    visualSignifiers: ['coffee steam', 'knit textures', 'window condensation', 'soft blankets'],
    copyAngles: [isArabic ? 'الشتاء بيعلمنا إن الدفء مش درجة حرارة' : 'Warmth isn\'t a temperature'],
    colorMood: 'deep charcoal, burnt sienna, cream, fog grey',
    lightingMood: 'overcast diffused light, moody shadows, warm indoor glow',
  }]

  return [{
    keyword: isArabic ? 'البداية الجديدة' : 'fresh start', keywordEn: 'fresh start',
    type: 'cultural', heat: 70,
    emotionalCharge: 'optimism + renewal + potential',
    visualSignifiers: ['clean slate', 'sunrise', 'open windows', 'green shoots'],
    copyAngles: [isArabic ? 'البداية دايماً دلوقتي' : 'The beginning is always now'],
    colorMood: 'fresh green, soft white, pale gold',
    lightingMood: 'crisp morning light, soft diffusion',
  }]
}

// ─────────────────────────────────────────────
// DOMAIN LIBRARY
// ─────────────────────────────────────────────

const DOMAIN_LIBRARY: Record<string, TrendTopic> = {
  food:        mkDomain('طعام وصحة',   'food & wellness',    'social',   85, 'health anxiety + pleasure guilt',       ['minimalist plating','natural ingredients close-up','hands cooking'],         ['مش أكل — ده قرار','كل أكلة بتقول حاجة عن اللي بتاكلها'],              'earthy terracotta, fresh green, cream'),
  beverage:    mkDomain('مشروبات',     'beverages',          'social',   80, 'exhaustion + desire for real energy',   ['condensation on glass','ice refraction','pouring ritual'],                  ['الطاقة الحقيقية مش من علبة'],                                          'electric blue, icy white, deep navy'),
  tech:        mkDomain('ذكاء اصطناعي','AI & productivity',  'tech',     95, 'overwhelm + fear of irrelevance',       ['glowing screens at night','human hands on keyboard','data flows'],          ['مش الـ AI هو المستقبل — إنت اللي بتحدده'],                             'neon cyan on deep black, electric purple'),
  skincare:    mkDomain('العناية',     'skincare',           'social',   88, 'self-worth + authenticity pressure',    ['dewy skin close-up','morning ritual','natural light bathroom'],              ['البشرة مش ماسك — دي قصتك'],                                            'blush pink, translucent white, warm nude'),
  fitness:     mkDomain('رياضة',       'fitness & wellness', 'social',   87, 'burnout + desire for balance',          ['motion blur athlete','quiet gym morning','outdoor movement'],                ['مش عشان تبقى أحسن — عشان تبقى إنت'],                                  'bold orange, deep black, clean white'),
  finance:     mkDomain('مال',         'financial security', 'economic', 79, 'anxiety + desire for control',          ['hands holding coins','family planning'],                                     ['مش مجرد فلوس — ده استقرار'],                                           'deep navy, gold, confident white'),
  realestate:  mkDomain('عقارات',      'real estate',        'cultural', 83, 'belonging + aspiration + stability',    ['morning light through window','keys in hand','first day in new home'],       ['مش مجرد شقة — ده مكانك في الدنيا'],                                   'warm terracotta, soft cream, sage green'),
  automotive:  mkDomain('سيارات',      'automotive',         'social',   76, 'freedom vs. responsibility + status',   ['empty road at golden hour','hands on wheel','city lights at speed'],         ['مش بتشتري عربية — بتشتري وقتك'],                                      'sleek black, chrome silver, night blue'),
  default:     mkDomain('تسويق',       'brand culture',      'social',   72, 'authenticity hunger + ad skepticism',   ['real people unposed','candid documentary','behind the scenes'],              ['مش إعلان — ده حقيقة'],                                                 'honest neutrals, natural grain'),
}

function mkDomain(
  keyword: string, keywordEn: string, type: TrendTopic['type'], heat: number,
  emotionalCharge: string, visualSignifiers: string[], copyAngles: string[], colorMood: string
): TrendTopic {
  return {
    keyword, keywordEn, type, heat, emotionalCharge,
    visualSignifiers, copyAngles, colorMood,
    lightingMood: 'cinematic natural lighting with contextual atmosphere',
  }
}

function matchDomain(domain: string): TrendTopic {
  const d = domain.toLowerCase()
  const checks: [string[], string][] = [
    [['food','eat','restaurant','مطعم','أكل'],   'food'],
    [['drink','bever','coffee','juice','مشروب'],  'beverage'],
    [['tech','app','software','ai','digital'],     'tech'],
    [['skin','beauty','cosmetic','cream','بشرة'], 'skincare'],
    [['fit','gym','sport','health','رياضة'],       'fitness'],
    [['bank','finance','invest','insurance','مال'],'finance'],
    [['real estate','property','شقة','عقار'],     'realestate'],
    [['car','auto','vehicle','سيارة','عربية'],    'automotive'],
  ]
  for (const [keywords, key] of checks) {
    if (keywords.some(k => d.includes(k))) return DOMAIN_LIBRARY[key]
  }
  return DOMAIN_LIBRARY['default']
}

// ─────────────────────────────────────────────
// SYNTHESIZE — Merge all signals into TrendBundle
// ─────────────────────────────────────────────

function buildBundle(
  seasonal: TrendTopic,
  domain: TrendTopic,
  liveNews: LiveNewsItem[] | null,
  liveTrends: TrendTopic[] | null,
  language: 'en' | 'ar'
): TrendBundle {

  // Inject live headlines into the highest-heat topic
  const enrichedSeasonal: TrendTopic = liveNews?.length
    ? {
        ...seasonal,
        heat:    Math.min(100, seasonal.heat + 5),  // bump heat when we have live data
        liveHeadlines: liveNews,
        currentEventSummary: synthesizeCurrentEvent(liveNews, seasonal.keyword, language),
        visualFromNews: [...new Set(liveNews.map(n => n.visualHint).filter(Boolean) as string[])],
      }
    : seasonal

  // Rank all candidates
  const all = [
    ...(liveTrends || []),
    enrichedSeasonal,
    domain,
  ].sort((a, b) => b.heat - a.heat)

  const primary    = all[0]
  const supporting = all.slice(1, 3)

  // Determine source
  const source: TrendBundle['source'] = liveNews?.length
    ? 'serpapi-news'
    : liveTrends?.length
    ? 'serpapi-trends'
    : 'mock-seasonal'

  // Live context block for the debate
  const liveContext = liveNews?.length
    ? {
        topHeadline:    liveNews[0].title,
        source:         liveNews[0].source,
        date:           liveNews[0].date,
        strategicAngle: primary.currentEventSummary || '',
        visualFromNews: primary.visualFromNews || [],
      }
    : undefined

  const culturalMoment = language === 'ar'
    ? `الناس دلوقتي بتفكر في "${primary.keyword}" — وبتحس بـ ${primary.emotionalCharge}${liveNews?.length ? `. آخر الأخبار: "${liveNews[0].title}"` : ''}`
    : `People are thinking about "${primary.keywordEn}" — feeling: ${primary.emotionalCharge}${liveNews?.length ? `. Latest: "${liveNews[0].title}"` : ''}`

  const creativeOpportunity = language === 'ar'
    ? `الفرصة: ربط الـ Brief بالحالة الثقافية الحالية (${primary.keyword}) لتعميق الـ Relevance${liveContext ? ` — مدعومة بحدث حقيقي من اليوم` : ''}`
    : `Opportunity: anchor the brief to current cultural moment (${primary.keywordEn})${liveContext ? ' — backed by a real event from today' : ''}`

  const injectionSummary = language === 'ar'
    ? [
        `التريند الحالي: "${primary.keyword}" (حرارة ${primary.heat}/100).`,
        `الشحنة العاطفية: ${primary.emotionalCharge}.`,
        liveContext ? `حدث اليوم: "${liveContext.topHeadline}" — ${liveContext.source}.` : null,
        `زوايا إبداعية: ${primary.copyAngles.slice(0, 2).join(' / ')}`,
      ].filter(Boolean).join(' ')
    : [
        `Trend: "${primary.keywordEn}" (heat ${primary.heat}/100).`,
        `Charge: ${primary.emotionalCharge}.`,
        liveContext ? `Today's event: "${liveContext.topHeadline}" — ${liveContext.source}.` : null,
        `Angles: ${primary.copyAngles.slice(0, 2).join(' / ')}`,
      ].filter(Boolean).join(' ')

  return {
    primary,
    supporting,
    culturalMoment,
    creativeOpportunity,
    injectionSummary,
    liveContext,
    fetchedAt: new Date(),
    source,
  }
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

export interface GetTrendsOptions {
  domain: string
  region?: string
  language?: 'en' | 'ar'
}

export async function getTrends(options: GetTrendsOptions): Promise<TrendBundle> {
  const { domain, region = process.env.TRENDS_REGION || 'EG', language = 'ar' } = options

  const month = new Date().getMonth() + 1

  // Run ALL resolvers in parallel — take what we get in 5s
  const [seasonal, domainTopic, liveNews, liveTrends] = await Promise.all([
    Promise.resolve(getSeasonalTrends(month, region)[0]),
    Promise.resolve(matchDomain(domain)),
    fetchLiveNews(domain, region, language),
    fetchRealTrends(domain, region, language),
  ])

  const bundle = buildBundle(seasonal, domainTopic, liveNews, liveTrends, language)

  // Log what fired
  console.log(`[TrendService] source=${bundle.source} | trend="${bundle.primary.keyword}" | live_headlines=${liveNews?.length || 0}`)

  return bundle
}

// ─────────────────────────────────────────────
// PROMPT INJECTION HELPERS  (unchanged interface)
// ─────────────────────────────────────────────

export function buildTrendInjectionBlock(bundle: TrendBundle, language: 'en' | 'ar'): string {
  const { primary, culturalMoment, creativeOpportunity, liveContext } = bundle

  const liveBlock = liveContext
    ? language === 'ar'
      ? `\n[حدث حقيقي اليوم] "${liveContext.topHeadline}" — ${liveContext.source} (${liveContext.date})\n[الزاوية الاستراتيجية] ${liveContext.strategicAngle}`
      : `\n[Live Event Today] "${liveContext.topHeadline}" — ${liveContext.source} (${liveContext.date})\n[Strategic Angle] ${liveContext.strategicAngle}`
    : ''

  if (language === 'ar') {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 TREND INTELLIGENCE — ما يحدث الآن
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[التريند الرئيسي] ${primary.keyword} — حرارة ${primary.heat}/100
[الشحنة العاطفية] ${primary.emotionalCharge}
[زوايا إبداعية] ${primary.copyAngles.join(' | ')}${liveBlock}

[اللحظة الثقافية] ${culturalMoment}
[الفرصة] ${creativeOpportunity}

INSTRUCTION: اجعل أفكارك تلامس هذه اللحظة. استخدم الحدث الحقيقي إن وُجد كطبقة مصداقية — لا تقتبسه حرفياً.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  }

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 TREND INTELLIGENCE — What's happening now
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Primary Trend] ${primary.keywordEn} — Heat ${primary.heat}/100
[Emotional Charge] ${primary.emotionalCharge}
[Creative Angles] ${primary.copyAngles.join(' | ')}${liveBlock}

[Cultural Moment] ${culturalMoment}
[Opportunity] ${creativeOpportunity}

INSTRUCTION: Use the real event (if present) as a credibility layer — don't quote it literally.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}

export function buildTrendVisualInjection(bundle: TrendBundle): {
  lightingAddition: string
  visualSignifiers: string[]
  colorMoodAddition: string
  newsVisualLayer: string   // ← NEW: from live headlines
} {
  const { primary, supporting, liveContext } = bundle

  const allSignifiers = [
    ...primary.visualSignifiers,
    ...(supporting[0]?.visualSignifiers || []),
  ].slice(0, 4)

  // Layer from live news (if any)
  const newsVisualLayer = liveContext?.visualFromNews?.length
    ? liveContext.visualFromNews[0]   // top visual hint from today's news
    : ''

  return {
    lightingAddition:   primary.lightingMood,
    visualSignifiers:   allSignifiers,
    colorMoodAddition:  primary.colorMood,
    newsVisualLayer,
  }
}
