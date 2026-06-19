# TextFX — AI Creative Director (textfx.withgoogle)

## 🎬 **The Concept**

TextFX is a cross-platform (macOS & Windows) **Creative Director AI** that thinks like a seasoned pro. It doesn't generate linear solutions—it applies **lateral thinking** to break conventions and find breakthrough ideas.

**Your workflow:**
1. Write a **Brief** (product, target, challenge)
2. TextFX generates a **Real Insight** (using 5 lateral thinking techniques)
3. Maps it to a **Creative Concept** (cognitive shift + metaphor strategy)
4. Writes a **Production-Ready Script** (3-beat emotional arc)

---

## 🧠 **The 5 Advanced Lateral Thinking Techniques**

### 1. **Provocation (PO)**
Flip the assumption. "If the opposite were true, what would we discover?"
- Problem: "People forget to drink water"
- Provocation: "What if forgetting reveals the real opportunity?"
- Insight: Shift from reminder (annoying) to celebration (irresistible)

### 2. **Analogies** 
Link the product to unrelated domains.
- Water app = Coffee ceremony (ritual) + Luxury perfume (identity) + Strava (achievement)
- Result: 5 different positioning angles from unexpected connections

### 3. **Random Stimulus**
Pick a random word, force a connection.
- Random: "Compass"
- Connection: "Hydration is your internal compass to wellness"
- Angle: "When lost, wellness is always the right direction"

### 4. **Opposite Thinking**
Push to extremes, find the desirable middle.
- Extreme positive: Mandatory celebration
- Extreme negative: Completely voluntary, often forgotten
- Sweet spot: Voluntary yet irresistible, celebrated yet pressure-free

### 5. **Constraint Reversal**
Invert the problem, find hidden opportunity.
- Problem: "People forget to hydrate"
- Reversal: "People already hydrate unconsciously"
- Solution: Don't remind—sync with existing rituals and make them intentional

---

## 🎯 **Quick Start (Windows PowerShell)**

```powershell
# 1. Install dependencies
npm install

# 2. Run dev servers (Backend + UI)
npm run dev

# 3. Open UI in browser
# http://localhost:5173
```

**Backend runs on:** `http://localhost:4000`

---

## 🏗️ **Architecture**

```
textfx/
├── app/                    # React + Vite UI
├── backend/                # Node + Express API
│   ├── modules/
│   │   ├── insight-generator.ts          # 5-technique insight engine
│   │   ├── concept-mapper.ts             # Cognitive shift + metaphor
│   │   ├── script-writer.ts              # 3-beat emotional screenplays
│   │   └── lateral-thinking-agent.ts     # Core 5 techniques
│   └── src/index.ts        # API endpoints
├── docs/                   # Full documentation
│   ├── LATERAL_THINKING_FRAMEWORK.md
│   ├── ADVANCED_LATERAL_THINKING.md
│   ├── PROMPT_TEMPLATES.md
│   └── AR_QUICKSTART.md (عربي)
└── local_models/           # Local LLM setup guides
```

---

## 🚀 **API Endpoints**

### Generate Insight (All 5 Techniques)
```bash
POST /api/insight
Body: { "brief": "Product description and market context" }
```

**Response includes:**
- Main insight from all 5 techniques
- Provocation + reversal
- Analogies from 5 unrelated domains
- Random stimulus + unexpected angle
- Opposite thinking paradox
- Creative breakthrough statement

### Map to Concept
```bash
POST /api/concept
Body: { "insight": "<insight output from above>" }
```

**Response includes:**
- Reframed positioning (cognitive shift)
- Central metaphor (creative device)
- Emotional arc
- Visual notes
- Target paradox

### Write Script
```bash
POST /api/script
Body: { "concept": "<concept output from above>" }
```

**Response includes:**
- 30-second screenplay (3 emotional beats)
- Camera language + narrative strategy
- Emotional turning point for viewer

### Full Pipeline (Brief → Insight → Concept → Script)
```bash
POST /api/full-pipeline
Body: { "brief": "..." }
```

---

## 📚 **Documentation**

- **`docs/LATERAL_THINKING_FRAMEWORK.md`** — Core philosophy (philosophy + 4 basic techniques)
- **`docs/ADVANCED_LATERAL_THINKING.md`** — The 5 advanced techniques (Provocation, Analogies, Random, Opposite, Reversal)
- **`docs/PROMPT_TEMPLATES.md`** — System prompts for Google Vertex AI, OpenAI, local LLMs
- **`docs/AR_QUICKSTART.md`** — Quick start in Arabic (عربي)

---

## 🤖 **Next Steps**

### Option A: Connect Real AI
Add Google Vertex AI or OpenAI API keys to unlock **real creative generation**:

```bash
export VERTEX_API_KEY=<your-key>
export OPENAI_API_KEY=<your-key>
```

See `docs/PROMPT_TEMPLATES.md` for integration code.

### Option B: Local LLM
Run a local model (text-generation-webui, llama.cpp) for **offline creativity**:

See `local_models/README.md` for setup.

### Option C: Electron Desktop App
Package as macOS (.dmg) and Windows (.exe) desktop app:

```bash
npm run build
```

---

## 💡 **Example: Water Reminder App**

### Input Brief
```
Product: Water reminder app + smart bottle
Target: Urban professionals, 25-40
Challenge: People know water is important but forget in daily rush
Goal: Make hydration irresistible
```

### Output Pipeline

#### 1. Insight (5 Techniques)
- **Provocation:** Reminders aren't the problem—invisibility is
- **Analogies:** Like coffee ritual, luxury item, fitness achievement, meditation
- **Random (compass):** "Hydration is your internal compass to wellness"
- **Opposite:** Make voluntary yet inevitable, celebrated yet pressure-free
- **Reversal:** People already hydrate—just make it visible and intentional

#### 2. Concept (Cognitive Shift)
```
From: "Health app"
To: "Ritual anchor for self-love"

Tagline: "One sip. You choose yourself."
Creative Device: Hydration as compass, pulse, high-five to yourself
Paradox: Make choosing yourself feel like you have no choice
```

#### 3. Script (3-Beat Story)
```
INT. EARLY MORNING
[RECOGNITION] Hand reaches for water. Not a tool—a choice.

CUT TO: Water pours. Light catches it—ethereal.
[SURRENDER] "One sip. You choose yourself."
Person drinks. Everything shifts internally.

[ARRIVAL] The moment ends. Everything changed.

SUPER: "[Brand]. One sip. You choose yourself."
```

---

## 🎓 **Philosophy**

TextFX is built on this principle:

> **Creativity isn't about more ideas. It's about BETTER questions.**
> 
> Instead of "How do we remind people?" ask "How do we make forgetting impossible by making remembering irresistible?"
>
> Instead of selling features, sell the transformation.
> Instead of solving the problem, reframe it as an opportunity.

---

## 🛠️ **Tech Stack**

- **Frontend:** React 18, Vite, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Desktop:** Electron (scaffolded, ready to implement)
- **AI Providers:** Google Vertex AI, OpenAI, Local LLMs
- **Build:** Electron-builder (macOS + Windows)

---

## 📖 **For Copywriters**

TextFX is built FOR you. It's designed to work like a Creative Director partner:

1. **Faster ideation** — 10 minutes instead of hours
2. **Breakthrough insights** — Using proven lateral thinking techniques
3. **Professional output** — Scripts ready for production
4. **Iteration** — Quickly test different approaches
5. **Brand consistency** — Add brand voice profiles and templates

---

## 🌍 **Multilingual Support**

- English: Full documentation and UI
- Arabic: `docs/AR_QUICKSTART.md` + UI translations (in progress)

---

## 📄 **License**

Open for creative use. Designed to empower copywriters and creative teams.

---

## 🔗 **Resources**

- Edward de Bono — "Lateral Thinking" (foundational)
- John Hegarty — "Hegarty on Advertising" (creative philosophy)
- Simon Sinek — "Start With Why" (emotional positioning)
- David Ogilvy — "Ogilvy on Advertising" (timeless principles)

---

**TextFX:** Where creative directors and AI think together. 🚀
