# 🤖 AI Provider Integration Guide

التطبيق يدعم **3 أوضاع** للـ AI:

## 1️⃣ Mock Mode (حالياً مفعّل)

**للتطوير والاختبار بدون API keys**

- جميع الـ endpoints تعمل بـ mock responses
- لا تحتاج credentials
- شغّل: `npm run dev`

```bash
curl -X POST http://localhost:4000/api/full-pipeline \
  -H "Content-Type: application/json" \
  -d '{"brief":"Your brief here"}'
```

---

## 2️⃣ Google Vertex AI Integration

### المتطلبات:

1. **Google Cloud Project**
   - اذهب إلى: https://console.cloud.google.com
   - أنشئ project جديد
   - فعّل "Vertex AI API"

2. **Authentication**
   ```bash
   # Setup gcloud CLI
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Environment Variables**
   ```bash
   export GOOGLE_CLOUD_PROJECT=your-project-id
   export VERTEX_PROJECT_ID=your-project-id
   export VERTEX_LOCATION=us-central1
   export VERTEX_MODEL=gemini-pro
   ```

4. **Install SDK**
   ```bash
   npm install @google-cloud/vertexai
   ```

### تفعيل في الـ Code

في `backend/src/modules/insight-generator.ts`:

```typescript
import { generateCreativeText, initializeVertexAI } from '../providers/googleVertexProvider'

// أضف في generateInsight():
const config = initializeVertexAI()
const systemPrompt = getLateralThinkingSystemPrompt()
const aiInsight = await generateCreativeText(prompt, systemPrompt, config)
```

### اختبار الـ Connection:

```bash
curl http://localhost:4000/api/providers/status
```

الـ response يجب تظهر:
```json
{
  "vertexAI": {
    "configured": true,
    "projectId": "your-project-id",
    "model": "gemini-pro"
  }
}
```

---

## 3️⃣ OpenAI Integration

### المتطلبات:

1. **OpenAI API Key**
   - اذهب إلى: https://platform.openai.com/api/keys
   - أنشئ secret key جديد
   - اختر GPT-4 (للـ creative) أو GPT-3.5-turbo (للـ speed)

2. **Environment Variables**
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   export OPENAI_MODEL=gpt-4
   export OPENAI_TEMPERATURE=0.8
   export OPENAI_MAX_TOKENS=2000
   ```

3. **Install SDK**
   ```bash
   npm install openai
   ```

### تفعيل في الـ Code

في `backend/src/modules/insight-generator.ts`:

```typescript
import { generateCreativeText, initializeOpenAI } from '../providers/openaiProvider'

// أضف في generateInsight():
const config = initializeOpenAI()
const systemPrompt = getLateralThinkingSystemPrompt()
const aiInsight = await generateCreativeText(prompt, systemPrompt, config)
```

### اختبار الـ Connection:

```bash
curl -X POST http://localhost:4000/api/full-pipeline \
  -H "Content-Type: application/json" \
  -d '{"brief":"Product: Smart app. Challenge: Users forget. Goal: Create habit."}'
```

---

## 📊 مقارنة الـ Providers

| الخاصية | Mock | Vertex AI | OpenAI |
|--------|------|-----------|--------|
| **التكلفة** | مجاني | رخيص-متوسط | متوسط-غالي |
| **الجودة** | جيد للتطوير | عالي جداً | عالي جداً |
| **السرعة** | فوري | سريع | متوسط |
| **للإنتاج** | ❌ | ✅ | ✅ |
| **Setup** | ✅ | معقد قليلاً | سهل |

---

## 🔄 التبديل بين الـ Providers

### Priority Order (الترتيب الافتراضي):
1. إذا `OPENAI_API_KEY` موجود → استخدم OpenAI
2. إذا `GOOGLE_CLOUD_PROJECT` موجود → استخدم Vertex AI
3. وإلا → استخدم Mock Mode

### اختبر الـ Current Provider:

```bash
curl http://localhost:4000/api/providers/status | jq '.currentMode'
```

---

## 💡 نصائح للإنتاج

### Vertex AI (الأفضل للـ Arabic + Creative)
- استخدم `gemini-pro` للـ best quality
- أرخص من OpenAI لـ high volume
- أفضل support للـ multilingual

### OpenAI (الأفضل للـ Reliability)
- GPT-4 للـ premium creative
- GPT-3.5-turbo للـ budget-conscious
- أسرع للـ real-time applications

### Mock Mode (للـ Development)
- جيد للاختبار والتطوير
- لا تحتاج credentials
- أداء سريع جداً

---

## 🚀 الخطوة التالية

بعد تثبيت credentials:

1. شغّل البرنامج:
   ```bash
   npm run dev
   ```

2. اختبر الـ full pipeline:
   ```bash
   curl -X POST http://localhost:4000/api/full-pipeline \
     -H "Content-Type: application/json" \
     -d '{"brief":"Premium water bottle for health-conscious millennials. Challenge: Hydration is boring. Goal: Make it celebratory."}'
   ```

3. شوف الـ system prompt:
   ```bash
   curl http://localhost:4000/api/system-prompt | jq '.systemPrompt'
   ```

---

## ⚠️ Troubleshooting

### "Cannot read properties of undefined"
- تأكد من تثبيت جميع الـ dependencies: `npm install`

### "OPENAI_API_KEY is required"
- Set the environment variable: `export OPENAI_API_KEY=sk-your-key`

### "GOOGLE_CLOUD_PROJECT not found"
- تأكد من تشغيل: `gcloud auth application-default login`

### Response بطيئة جداً؟
- استخدم `gpt-3.5-turbo` بدل `gpt-4`
- أو استخدم `gemini-pro` في Vertex AI

---

## 📚 الموارد

- [Google Vertex AI Docs](https://cloud.google.com/vertex-ai/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [TextFX Lateral Thinking Guide](./ADVANCED_LATERAL_THINKING.md)
- [System Prompt Details](./PROMPT_TEMPLATES.md)
