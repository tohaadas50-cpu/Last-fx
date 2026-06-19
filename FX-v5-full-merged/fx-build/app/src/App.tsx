/**
 * TextFX v5 — Mobile-First Production Frontend
 * Features: ErrorBoundary · dark/light persistence · fetchWithRetry + AbortController
 *           auto-scroll refs · aria attributes · safe-area · no embedded secrets
 */
import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react'
import { jsPDF } from 'jspdf'
import { ApiKeySetup } from './ApiKeySetup'
import AgentSaaSPanel from './components/AgentSaaSPanel'

// ── Electron window.fx bridge type ───────────────────────────────────────────
declare global {
  interface Window {
    fx?: {
      getBackendInfo(): Promise<{ port: number; certFingerprint: string; protocol: string; host: string }>
      request(channel: string, payload?: unknown): Promise<unknown>
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message }
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(JSON.stringify({ level:'error', ts: new Date().toISOString(),
      msg: 'ErrorBoundary caught', error: err.message, componentStack: info.componentStack }))
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.message}</p>
          <button className="btn btn-primary" onClick={() => this.setState({ hasError:false, message:'' })}>
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface InsightData {
  mainInsight: string
  lateralThinkingBreakdown: {
    provocation:    { provocation:string; reversal:string; opportunity:string }
    analogies:      { sourceField:string; metaphor:string }[]
    randomStimulus: { randomWord:string; unexpectedAngle:string; visualMetaphor:string }
    oppositeThinking: { desirableMiddle:string; paradox:string }
  }
  constraints: string[]; opportunities: string[]
  metaphoricFraming:string; emotionalTruth:string; creativeMethod:string
}
interface ConceptData {
  title:string; tagline:string; coreIdea:string
  visualNotes:string; creativeDevice:string; emotionalArc:string; targetParadox:string
}
interface ScriptData {
  script:string; beats:string[]; cameraLanguage:string
  narrativeStrategy:string; emotionalTurning:string
}
type Iteration = {
  timestamp:number; brief:string; archetype:string
  brandVoice:{ formalLevel:number; metaphorLevel:number; intensity:number }
  language:'en'|'ar'
  insight:InsightData|null; concept:ConceptData|null; script:ScriptData|null
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helper — AbortController + 1 retry + 60s timeout
// ─────────────────────────────────────────────────────────────────────────────
async function apiFetch(url:string, options:RequestInit, retries=1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)
    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: text })
      }
      return res
    } catch (err: unknown) {
      clearTimeout(timer)
      if (attempt === retries) throw err
      const e = err as Error
      if (e.name === 'AbortError') throw Object.assign(new Error('TIMEOUT'), { code:'TIMEOUT' })
      await new Promise(r => setTimeout(r, 800))
    }
  }
  throw new Error('unreachable')
}

// ─────────────────────────────────────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  en: {
    title:'TEXTFX', tagline:'The Elite Creative Director for Lateral Thinking & Copywriting',
    brandPersonality:'Brand Soul & Archetype',
    tone:'Tone', languageStyle:'Metaphor Scale', intensity:'Intensity',
    briefTitle:'The Brief', briefPlaceholder:'Describe the product, human tension, and creative goal…',
    generateBtn:'Ignite Insight', thinking:'Deep Processing…', writing:'Manifesting…',
    insightTitle:'Strategic Insight', convertBtn:'Evolve to Concept',
    conceptTitle:'Creative Conception', writeScriptBtn:'Manifest Script', scriptTitle:'Cinematic Script',
    emotionalBeats:'Emotional Beats', cameraLanguage:'Visual Aesthetics',
    copyScript:'Copy Script', exportPdf:'Export PDF',
    reversals:'Logic Inversions', metaphors:'Symbolic Links',
    creativeDevice:'Strategic Device', emotionalArc:'The Arc',
    savedIterations:'Archive', clear:'Clear',
    formal:'Formal', casual:'Casual', balanced:'Balanced',
    metaphorical:'Metaphorical', literal:'Literal', mixed:'Mixed',
    high:'High', subtle:'Subtle', standard:'Standard',
    networkErr:'⚠️ Cannot reach server. Check your connection.',
    timeoutErr:'⏳ Request timed out — the AI is busy. Try again.',
    serverErr: '⚠️ Server error. Try again.',
    retry:'Retry',
  },
  ar: {
    title:'TEXTFX', tagline:'المحرك الإبداعي النخبوي للتفكير الجانبي وصناعة المحتوى',
    brandPersonality:'روح العلامة والشخصية',
    tone:'النبرة', languageStyle:'مقياس المجاز', intensity:'الحدة',
    briefTitle:'الملخص الإبداعي', briefPlaceholder:'حدد المنتج، التوتر الإنساني، والهدف الإبداعي…',
    generateBtn:'إشعال البصيرة', thinking:'جاري المعالجة العميقة…', writing:'جاري التجلي…',
    insightTitle:'البصيرة الاستراتيجية', convertBtn:'تطوير إلى مفهوم',
    conceptTitle:'التصور الإبداعي', writeScriptBtn:'تحويل لسيناريو', scriptTitle:'التجلي السينمائي',
    emotionalBeats:'النبضات العاطفية', cameraLanguage:'الجماليات البصرية',
    copyScript:'نسخ النص', exportPdf:'تصدير PDF',
    reversals:'انقلابات المنطق', metaphors:'الروابط الرمزية',
    creativeDevice:'الأداة الاستراتيجية', emotionalArc:'المسار العاطفي',
    savedIterations:'الأرشيف', clear:'مسح',
    formal:'رسمي', casual:'عفوي', balanced:'متوازن',
    metaphorical:'مجازي', literal:'حرفي', mixed:'مختلط',
    high:'مرتفع', subtle:'هادئ', standard:'قياسي',
    networkErr:'⚠️ لا يمكن الوصول للخادم. تحقق من الاتصال.',
    timeoutErr:'⏳ انتهت مهلة الطلب — الذكاء الاصطناعي مشغول. حاول مجدداً.',
    serverErr: '⚠️ خطأ في الخادم. حاول مجدداً.',
    retry:'إعادة المحاولة',
  }
} as const
type Lang = keyof typeof T

const ARCHETYPES = [
  { name:'The Outlaw',   nameAr:'المتمرد',        icon:'💀', desc:'Rebellious, rule-breaking', descAr:'متمرد، يكسر القواعد' },
  { name:'The Magician', nameAr:'الساحر',         icon:'✨', desc:'Visionary, transformative',  descAr:'رؤيوي، تحويلي' },
  { name:'The Hero',     nameAr:'البطل',          icon:'🛡️', desc:'Courageous, masterful',      descAr:'شجاع، متمكن' },
  { name:'The Lover',    nameAr:'المحب',          icon:'❤️', desc:'Intimate, passionate',       descAr:'حميمي، شغوف' },
  { name:'The Jester',   nameAr:'المهرج',         icon:'🤡', desc:'Playful, disruptive',        descAr:'مرح، متمرد' },
  { name:'The Everyman', nameAr:'الإنسان العادي', icon:'🤝', desc:'Reliable, connected',        descAr:'موثوق، مرتبط بالناس' },
  { name:'The Caregiver',nameAr:'الراعي',         icon:'🤲', desc:'Nurturing, protective',      descAr:'حاضن، حامي' },
  { name:'The Ruler',    nameAr:'الحاكم',         icon:'👑', desc:'Authoritative, stable',      descAr:'سلطوي، مستقر' },
  { name:'The Creator',  nameAr:'المبدع',         icon:'🎨', desc:'Innovative, original',       descAr:'مبتكر، أصيل' },
  { name:'The Innocent', nameAr:'البريء',         icon:'☀️', desc:'Optimistic, pure',           descAr:'متفائل، نقي' },
  { name:'The Sage',     nameAr:'الحكيم',         icon:'🧠', desc:'Wise, analytical',           descAr:'حكيم، تحليلي' },
  { name:'The Explorer', nameAr:'المستكشف',       icon:'🧭', desc:'Adventurous, free',          descAr:'مغامر، حر' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Scroll helper
// ─────────────────────────────────────────────────────────────────────────────
function scrollTo(ref: React.RefObject<HTMLElement | null>) {
  setTimeout(() => {
    ref.current?.scrollIntoView({ behavior:'smooth', block:'start' })
    ref.current?.setAttribute('tabIndex','-1')
    ref.current?.focus({ preventScroll: true })
  }, 120)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  // ── Electron IPC backend bootstrap ─────────────────────────────────────────
  const [backendOrigin, setBackendOrigin] = useState<string>(
    () => {
      const url = import.meta.env.VITE_API_URL
      return url || 'http://localhost:4002'
    }
  )
  const [showKeySetup, setShowKeySetup] = useState(false)
  const API = backendOrigin

  // On startup: if running inside Electron, get the actual port from main process
  useEffect(() => {
    if (!window.fx) return
    window.fx.getBackendInfo().then(info => {
      const origin = `${info.protocol}://${info.host}:${info.port}`
      setBackendOrigin(origin)
      // Check if API key is already configured
      fetch(`${origin}/api/key-status`, { mode: 'no-cors' })
        .then(r => r.json())
        .then((data: { configured: boolean }) => {
          if (!data.configured) setShowKeySetup(true)
        })
        .catch(() => { /* no key check in non-Electron mode */ })
    }).catch(err => console.warn('window.fx.getBackendInfo failed:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [brief,  setBrief]  = useState('')
  const [insight, setInsight] = useState<InsightData|null>(null)
  const [concept, setConcept] = useState<ConceptData|null>(null)
  const [script,  setScript]  = useState<ScriptData|null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string|null>(null)
  const [iterations, setIterations] = useState<Iteration[]>([])

  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('textfx_dark') !== 'false'
  })
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return (localStorage.getItem('textfx_lang') as Lang) || 'en'
  })
  const [archetype,    setArchetype]    = useState('The Sage')
  const [formalLevel,  setFormalLevel]  = useState(5)
  const [metaphorLevel,setMetaphorLevel]= useState(5)
  const [intensity,    setIntensity]    = useState(5)

  const insightRef = useRef<HTMLElement>(null)
  const conceptRef = useRef<HTMLElement>(null)
  const scriptRef  = useRef<HTMLElement>(null)

  const t    = T[lang]
  const isRtl = lang === 'ar'

  useEffect(() => {
    document.documentElement.dir  = isRtl ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    localStorage.setItem('textfx_lang', lang)
  }, [lang, isRtl])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('textfx_dark', String(dark))
  }, [dark])

  useEffect(() => {
    const saved = localStorage.getItem('textfx_iterations')
    if (saved) { try { setIterations(JSON.parse(saved)) } catch { /* ignore */ } }
  }, [])

  function handleError(err: unknown) {
    const e = err as { code?:string; message?:string; status?:number }
    if (e?.code === 'TIMEOUT' || e?.message === 'TIMEOUT') return setError(t.timeoutErr)
    if (e?.message?.includes('NETWORK') || e?.message?.includes('Failed to fetch')) return setError(t.networkErr)
    setError(t.serverErr)
    console.error(JSON.stringify({ level:'error', ts:new Date().toISOString(), error: e?.message }))
  }

  const doGenerateInsight = async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch(`${API}/api/insight`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ brief, archetype, language:lang, brandVoice:{ formalLevel,metaphorLevel,intensity } })
      })
      setInsight(await res.json()); setConcept(null); setScript(null)
      scrollTo(insightRef)
    } catch (e) { handleError(e) }
    finally { setLoading(false) }
  }

  const doConvertConcept = async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch(`${API}/api/concept`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ insight, archetype, language:lang, brandVoice:{ formalLevel,metaphorLevel,intensity } })
      })
      setConcept(await res.json()); setScript(null)
      scrollTo(conceptRef)
    } catch (e) { handleError(e) }
    finally { setLoading(false) }
  }

  const doWriteScript = async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch(`${API}/api/script`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ concept, archetype, language:lang, brandVoice:{ formalLevel,metaphorLevel,intensity } })
      })
      const data: ScriptData = await res.json()
      setScript(data)
      const iter: Iteration = { timestamp:Date.now(), brief, archetype, language:lang, brandVoice:{formalLevel,metaphorLevel,intensity}, insight, concept, script:data }
      const updated = [iter, ...iterations].slice(0,10)
      setIterations(updated)
      localStorage.setItem('textfx_iterations', JSON.stringify(updated))
      scrollTo(scriptRef)
    } catch (e) { handleError(e) }
    finally { setLoading(false) }
  }

  const doExport = () => {
    const doc = new jsPDF()
    doc.setFontSize(16); doc.text('TextFX Masterpiece', 10, 15)
    doc.setFontSize(10); doc.text(`Brief: ${brief}`, 10, 28)
    if (insight) doc.text(`Insight: ${insight.mainInsight}`, 10, 40, { maxWidth:190 })
    if (concept) { doc.text(`Concept: ${concept.title} — ${concept.tagline}`, 10,55); doc.text(concept.coreIdea, 10,68,{maxWidth:190}) }
    if (script)  doc.text(script.script, 10, 90, { maxWidth:190 })
    doc.save('textfx-masterpiece.pdf')
  }

  return (
    <>
    {showKeySetup && (
      <ApiKeySetup
        backendPort={parseInt(backendOrigin.split(':').pop() || '4002', 10)}
        onKeyStored={() => setShowKeySetup(false)}
        onDismiss={() => setShowKeySetup(false)}
      />
    )}
    <div className={`app-root${dark ? ' dark' : ' light'}`} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Loading Overlay ───────────────────────────────────────────── */}
      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="loading-label">{t.thinking}</p>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="header" role="banner">
        <h1 className="header-title">{t.title}</h1>
        <p  className="header-tagline">{t.tagline}</p>
        <div className="header-actions" role="toolbar" aria-label="App controls">
          <button
            className="btn btn-ghost"
            aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
          >
            {lang === 'en' ? '🇸🇦 عربي' : '🇺🇸 English'}
          </button>
          <button
            className="btn btn-ghost"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={dark}
            onClick={() => setDark(d => !d)}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ── Error Banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="error-banner" role="alert" aria-live="assertive">
          <span>{error}</span>
          <div className="error-actions">
            <button className="btn btn-ghost" aria-label={t.retry} onClick={() => setError(null)}>{t.retry}</button>
            <button className="btn btn-ghost" aria-label="Dismiss" onClick={() => setError(null)}>✕</button>
          </div>
        </div>
      )}

      <main className="main" role="main">

        {/* ── Stage 01: Brand Identity ──────────────────────────────── */}
        <section className="stage" aria-labelledby="stage-01-title">
          <div className="stage-header">
            <span className="stage-number" aria-hidden="true">01</span>
            <h2 className="stage-title" id="stage-01-title">{t.brandPersonality}</h2>
          </div>
          <div className="pane">
            <div className="archetype-grid" role="radiogroup" aria-label="Brand Archetype">
              {ARCHETYPES.map(a => (
                <button
                  key={a.name}
                  role="radio"
                  aria-checked={archetype === a.name}
                  className={`arch-card${archetype === a.name ? ' active' : ''}`}
                  onClick={() => setArchetype(a.name)}
                  tabIndex={archetype === a.name ? 0 : -1}
                >
                  <span className="arch-icon" aria-hidden="true">{a.icon}</span>
                  <span className="arch-name">{isRtl ? a.nameAr : a.name}</span>
                  <span className="arch-desc">{isRtl ? a.descAr : a.desc}</span>
                </button>
              ))}
            </div>

            <div className="voice-grid" role="group" aria-label="Brand Voice Controls">
              {[
                { id:'tone',       label:t.tone,          val:formalLevel,   set:setFormalLevel,   lo:t.casual,     hi:t.formal,      mid:t.balanced },
                { id:'metaphor',   label:t.languageStyle,  val:metaphorLevel, set:setMetaphorLevel, lo:t.literal,    hi:t.metaphorical, mid:t.mixed },
                { id:'intensity',  label:t.intensity,      val:intensity,     set:setIntensity,     lo:t.subtle,     hi:t.high,         mid:t.standard },
              ].map(ctrl => (
                <div key={ctrl.id} className="slider-control">
                  <label className="slider-label" htmlFor={ctrl.id}>
                    <span>{ctrl.label}</span>
                    <span className="slider-val" aria-live="polite">
                      {ctrl.val > 7 ? ctrl.hi : ctrl.val < 3 ? ctrl.lo : ctrl.mid}
                    </span>
                  </label>
                  <input
                    id={ctrl.id} type="range" min="0" max="10"
                    value={ctrl.val} className="slider"
                    aria-valuenow={ctrl.val} aria-valuemin={0} aria-valuemax={10}
                    onChange={e => ctrl.set(parseInt(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stage 02: Brief ──────────────────────────────────────── */}
        <section className="stage" aria-labelledby="stage-02-title">
          <div className="stage-header">
            <span className="stage-number" aria-hidden="true">02</span>
            <h2 className="stage-title" id="stage-02-title">{t.briefTitle}</h2>
          </div>
          <div className="pane">
            <textarea
              className="textarea"
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder={t.briefPlaceholder}
              dir="auto" rows={6}
              aria-label={t.briefTitle}
              aria-required="true"
            />
            <div className="btn-row">
              <button
                className="btn btn-primary btn-full"
                onClick={doGenerateInsight}
                disabled={!brief.trim() || loading}
                aria-busy={loading}
              >
                {loading ? t.thinking : t.generateBtn}
              </button>
            </div>
          </div>
        </section>

        {/* ── Stage 03: Insight ──────────────────────────────────── */}
        {insight && (
          <section className="stage" ref={insightRef} aria-labelledby="stage-03-title" tabIndex={-1}>
            <div className="stage-header">
              <span className="stage-number" aria-hidden="true">03</span>
              <h2 className="stage-title" id="stage-03-title">{t.insightTitle}</h2>
            </div>
            <div className="pane">
              <blockquote className="insight-hero">{insight.mainInsight}</blockquote>
              <div className="two-col">
                <div className="technique">
                  <h3 className="technique-label">{t.reversals}</h3>
                  <ul className="technique-list">
                    <li>{insight.lateralThinkingBreakdown?.provocation?.reversal}</li>
                  </ul>
                </div>
                <div className="technique">
                  <h3 className="technique-label">{t.metaphors}</h3>
                  <ul className="technique-list">
                    {insight.lateralThinkingBreakdown?.analogies?.map((a,i) => <li key={i}>{a.metaphor}</li>)}
                  </ul>
                </div>
              </div>
              <div className="btn-row">
                <button
                  className="btn btn-secondary-accent btn-full"
                  onClick={doConvertConcept}
                  disabled={loading}
                  aria-busy={loading}
                >{loading ? t.thinking : t.convertBtn}</button>
              </div>
            </div>
          </section>
        )}

        {/* ── Stage 04: Concept ──────────────────────────────────── */}
        {concept && (
          <section className="stage" ref={conceptRef} aria-labelledby="stage-04-title" tabIndex={-1}>
            <div className="stage-header">
              <span className="stage-number" aria-hidden="true">04</span>
              <h2 className="stage-title" id="stage-04-title">{t.conceptTitle}</h2>
            </div>
            <div className="pane">
              <h3 className="concept-title">{concept.title}</h3>
              <p  className="concept-tagline">"{concept.tagline}"</p>
              <div className="concept-body"><p>{concept.coreIdea}</p></div>
              <div className="two-col">
                <div className="technique">
                  <h3 className="technique-label">{t.creativeDevice}</h3>
                  <p className="technique-text">{concept.creativeDevice}</p>
                </div>
                <div className="technique">
                  <h3 className="technique-label">{t.emotionalArc}</h3>
                  <p className="technique-text">{concept.emotionalArc}</p>
                </div>
              </div>
              <div className="btn-row">
                <button
                  className="btn btn-accent btn-full"
                  onClick={doWriteScript}
                  disabled={loading}
                  aria-busy={loading}
                >{loading ? t.writing : t.writeScriptBtn}</button>
              </div>
            </div>
          </section>
        )}

        {/* ── Stage 05: Script ───────────────────────────────────── */}
        {script && (
          <section className="stage" ref={scriptRef} aria-labelledby="stage-05-title" tabIndex={-1}>
            <div className="stage-header">
              <span className="stage-number" aria-hidden="true">05</span>
              <h2 className="stage-title" id="stage-05-title">{t.scriptTitle}</h2>
            </div>
            <div className="pane">
              <pre className="script-block" dir="auto" aria-label={t.scriptTitle}>{script.script}</pre>
              <div className="two-col" style={{marginTop:'24px'}}>
                <div className="technique">
                  <h3 className="technique-label">{t.emotionalBeats}</h3>
                  <ul className="technique-list">
                    {script.beats.map((b,i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
                <div className="technique">
                  <h3 className="technique-label">{t.cameraLanguage}</h3>
                  <p className="technique-text">{script.cameraLanguage}</p>
                </div>
              </div>
              <div className="btn-row btn-col">
                <button className="btn btn-secondary btn-full" onClick={() => navigator.clipboard.writeText(script.script)} aria-label={t.copyScript}>{t.copyScript}</button>
                <button className="btn btn-secondary btn-full" onClick={doExport} aria-label={t.exportPdf}>{t.exportPdf}</button>
              </div>
            </div>
          </section>
        )}

        <AgentSaaSPanel apiBase={API} />

        {/* ── Archive ─────────────────────────────────────────────── */}
        {iterations.length > 0 && (
          <section className="stage archive" aria-labelledby="archive-title">
            <div className="stage-header">
              <h2 className="stage-title" id="archive-title">{t.savedIterations}</h2>
              <button className="btn btn-ghost" aria-label={t.clear}
                onClick={() => { setIterations([]); localStorage.removeItem('textfx_iterations') }}>
                {t.clear}
              </button>
            </div>
            <div className="archive-grid">
              {iterations.map(it => (
                <button key={it.timestamp} className="archive-card"
                  onClick={() => { setBrief(it.brief); setInsight(it.insight); setConcept(it.concept); setScript(it.script) }}
                  aria-label={`Restore: ${it.brief.slice(0,40)}`}
                >
                  <span className="arc-time">{new Date(it.timestamp).toLocaleTimeString()}</span>
                  <span className="arc-brief">{it.brief.slice(0,40)}…</span>
                  <span className="arc-arch">{it.archetype}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
    </>
  )
}

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}
