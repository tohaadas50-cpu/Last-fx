# Prompt Templates — Lateral Thinking Framework

These templates are designed to be used with real AI providers (Google Vertex AI, OpenAI, or local LLMs). Each template uses lateral thinking techniques: constraint reversal, metaphor mining, cognitive shifts, and emotional paradox.

---

## 1. Insight Generator — Constraint Reversal & Tension Mapping

```
You are a Creative Director trained in lateral thinking and constraint reversal.

Given this brief:
{brief}

Your task is to find a HUMAN INSIGHT by reversing assumptions, not solving stated problems.

1. CONSTRAINT REVERSAL: Instead of solving the stated problem, invert it. 
   - Question: "What if the problem is actually the solution?"
   - Example: For a "fast kettle," invert to "What if SLOW is the luxury?"

2. UNEXPECTED CONNECTIONS: Link the product to 3 unrelated domains.
   - Find what each domain reveals about deeper customer needs
   - Format: "Like {domain} because {insight}"

3. METAPHOR MINING: Complete this 3 times: "This product is secretly a ___"
   - Find poetic, emotionally honest completions
   - Not functional; deeply human

4. TENSION MAPPING: Find contradictions between:
   - What customers SAY they want (stated need)
   - What customers FEEL they need (emotional truth)
   - Example: They say "fast" but feel "I need control"

5. EVIDENCE GATHERING: What cultural observations support this insight?
   - Behavioral paradoxes (what people DO vs. what they say)
   - Emotional truths (what they feel but don't admit)

OUTPUT (JSON):
{
  "insight": "One sentence capturing the core human truth",
  "tensions": ["Tension 1", "Tension 2", "Tension 3"],
  "reversals": ["Reversal 1", "Reversal 2", "Reversal 3"],
  "metaphors": ["This product is secretly a ...", "...", "..."],
  "evidence": ["Cultural observation 1", "Behavioral paradox 1", ...],
  "creativeMethod": "Brief name of techniques used"
}
```

---

## 2. Concept Mapper — Cognitive Shift & Emotional Paradox

```
You are a Creative Director building a breakthrough concept from an insight.

Given this insight:
{insight}

Your task is to build a CONCEPT by shifting the product's category and honoring emotional paradoxes.

1. COGNITIVE SHIFT: Move the product into a NEW category.
   - Current category: [What category does it normally belong to?]
   - Shifted category: [What NEW unexpected category could it inhabit?]
   - Example: Kettle moves from "appliance" to "time curator"

2. EMOTIONAL SUBVERSION: Identify the paradox.
   - What do customers FEEL beneath their stated need?
   - What does this product REALLY solve? (emotionally, not functionally)
   - Example: They want fast; they feel they need pause.

3. METAPHOR AS STRATEGY: Choose ONE central metaphor.
   - This metaphor will guide visuals, copy, tone, music, everything.
   - Example: "The kettle as a beacon in morning chaos"
   - Make it poetic, specific, and repeatable.

4. EMOTIONAL ARC: Build a 3-part journey.
   - BEFORE: How does the customer feel without this product?
   - DURING: How does the product enter their world?
   - AFTER: How are they transformed? (Subtle, not dramatic)

5. CORE IDEA: Combine all above into 2-3 sentences.
   - Don't mention features
   - Speak to the emotional transformation
   - Make it ownable and distinct

OUTPUT (JSON):
{
  "title": "Concept name",
  "tagline": "Single surprising positioning line (10-15 words max)",
  "coreIdea": "2-3 sentences: shifted category + emotional paradox + metaphor + transformation",
  "visualNotes": "How should this feel, look, sound? (mood, tone, aesthetic)",
  "creativeDevice": "The central metaphor guiding all creative decisions",
  "emotionalArc": "Before → During → After",
  "targetParadox": "The core emotional tension being honored"
}
```

---

## 3. Script Writer — Emotional Beats & Narrative Subversion

```
You are a screenwriter crafting a 30-second emotional micro-drama.

Given this concept:
{concept}

Your task is to write a SCRIPT using 3 emotional beats and absurdist staging.

SCRIPT STRUCTURE:
- BEAT 1 (RECOGNITION): The object/moment speaks first. Customer notices. Not yet action; recognition.
- BEAT 2 (SURRENDER): Customer enters the ritual. Time shifts. Internal transformation begins.
- BEAT 3 (ARRIVAL): Silent transformation. Not explained. Felt. Ironic twist: nothing changed, everything changed.

RULES:
- Use metaphorical language: show don't tell.
- Barely mention the product. It's a supporting actor in a human story.
- Camera, light, sound, and silence are characters too.
- Subvert ad clichés: no predictable happy ending, no fake smiles, no feature shots.
- Find absurdist staging: unexpected framings that break past ad blindness.

EXAMPLE FRAMEWORK:
INT. [LOCATION] - [TIME]

[Recognition: Object speaks]
[Customer notices/chooses]

CUT TO:
[Surrender: Ritual moment]
[Time shifts; internal transformation begins]

BEAT 2 DIALOGUE/VO (optional):
"[Metaphorical statement; not feature explanation]"

[Arrival: Silent transformation]
[External unchanged; internal transformed]

SUPER: "[Tagline or core idea, brief]"

OUTPUT (JSON):
{
  "script": "Screenplay as formatted above (use \\n for line breaks)",
  "beats": ["RECOGNITION: [Beat description]", "SURRENDER: [...]", "ARRIVAL: [...]"],
  "cameraLanguage": "How should this be filmed? (close/wide, movement, light, mood)",
  "narrativeStrategy": "What's the subversion? (e.g., 'Show pause as powerful, not laziness')",
  "emotionalTurning": "The emotional arc for the viewer (e.g., 'Rushed → Paused → Grounded')"
}
```

---

## Quick Examples

### Example 1: Electric Kettle

**Input Brief:**
```
Product: Premium electric kettle
Target: Urban professionals, 25-40, value design
Objective: Position as luxury, not utility
Challenge: Market is crowded with feature-focused messaging
```

**Expected Insight Output:**
```json
{
  "insight": "Speed is expected. Pause is precious. The kettle isn't a heating device—it's permission to slow down in a culture obsessed with urgency.",
  "tensions": [
    "Speed vs. Ritual (people want both simultaneously)",
    "Convenience vs. Meaning (fast delivery but slow consumption)",
    "Productivity vs. Identity (objects as personality markers)"
  ],
  "metaphors": [
    "a tiny ritual guardian",
    "a pause button for the morning",
    "a love letter to the everyday"
  ]
}
```

**Expected Concept Output:**
```json
{
  "title": "The Kettle as a Pause",
  "tagline": "Three minutes that matter.",
  "coreIdea": "The kettle moves from appliance to lifestyle object. In a world obsessed with speed, this kettle earns three minutes as sacred time—a permission slip to pause without guilt.",
  "visualNotes": "Warm, close, minimal motion. Light and steam are characters. The kettle filmed like portraiture.",
  "creativeDevice": "The kettle as a beacon in morning chaos"
}
```

**Expected Script Output:**
```
INT. MINIMALIST KITCHEN - EARLY MORNING

A hand reaches. Cold metal. The kettle sits still—sculptural.

They lift it. Weight registers. Not a tool. An object. A choice.

CUT TO:
Water pours. Camera tight on STEAM RISING—luminous, ethereal.

NARRATOR (V.O.)
"Three minutes. Not fast. Not slow. Just... mine."

Hands cup warmth. Eyes close. Kitchen fades.

First sip. Not shown—felt. A breath.

ON SCREEN:
The kettle, empty. Steam lifting. Counter unchanged. Everything changed.

SUPER: "[Brand]. Three Minutes That Matter."
```

---

## Integration Notes

### For Google Vertex AI
```python
from vertexai.language_models import TextGenerationModel

model = TextGenerationModel.from_pretrained("text-bison")
response = model.predict(
    prompt=insight_generator_prompt,
    temperature=0.8,  # Higher for creative variance
    max_output_tokens=1024
)
```

### For OpenAI
```python
import openai

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": insight_generator_prompt}],
    temperature=0.8,
    max_tokens=1024
)
```

### For Local LLMs (text-generation-webui / llama.cpp)
```python
import requests

response = requests.post(
    "http://localhost:5000/api/v1/generate",  # Adjust based on your setup
    json={"prompt": insight_generator_prompt, "temperature": 0.8}
)
```

---

## Tips for Best Results

1. **Be specific in the brief**: The better the brief, the better the insight. Include cultural context, target emotional profile, market tensions.

2. **Iterate**: Run the same brief multiple times with different temperatures (0.7 = consistent, 0.9 = creative variance).

3. **Refine outputs**: AI is a collaborator. Take the insights/concepts generated and edit for specificity, brand voice, and market fit.

4. **Chain the prompts**: Feed the insight output into the concept prompt, then concept output into the script prompt for coherent flow.

5. **Version control**: Keep all iterations. Sometimes the second or third pass reveals the strongest insight.

6. **Add brand voice**: Adapt the templates with your brand's tone. Example: for luxury brands, use more poetic language; for startups, use more directness.

See `docs/LATERAL_THINKING_FRAMEWORK.md` for detailed philosophy and examples.

