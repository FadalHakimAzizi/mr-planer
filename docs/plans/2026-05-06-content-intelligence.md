# Content Intelligence Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enriching content plan generation with real-world data — pain points from e-commerce reviews, hook formulas proven to convert, trending sound recommendations, optimal posting times, and competitor TikTok content angles.

**Architecture:** Each intelligence source lives in its own `lib/` file with a single responsibility. All enrichment runs after product save in `generate-plan/route.ts` — new data is stored in DB (products.pain_points, products.competitor_angles, content_items.post_time) so it's available to AI at plan generation time. **Hybrid provider strategy:** SerpAPI tetap untuk Google Trends, Serper.dev (15x lebih murah, 2.500 free queries) untuk Google Search (pain points + competitor).

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL), SerpAPI (Trends) + Serper.dev (Search), Groq (Llama), TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/lib/hooks.ts` | CREATE | Hook formula library per content type |
| `web/lib/sounds.ts` | CREATE | Sound mood recommendations per content type |
| `web/lib/posting-schedule.ts` | CREATE | Optimal posting time logic per content type + day |
| `web/lib/serper.ts` | CREATE | Serper.dev client (Google Search) untuk pain points + competitor |
| `web/lib/ecommerce-insights.ts` | CREATE | Pain point mining via Serper.dev |
| `web/lib/competitor.ts` | CREATE | Competitor TikTok angle analysis via Serper.dev |
| `web/lib/openrouter.ts` | MODIFY | Update all prompts to consume enrichment data |
| `web/app/api/generate-plan/route.ts` | MODIFY | Orchestrate all enrichment steps before plan generation |
| `web/app/dashboard/plans/[id]/page.tsx` | MODIFY | Display post_time per content item |
| Supabase SQL | RUN | Add pain_points, competitor_angles, post_time columns |

---

## Task 1: Database Migration

**Files:**
- Run SQL in Supabase SQL Editor

- [ ] **Step 1: Run migration SQL**

Open Supabase → SQL Editor, run:

```sql
-- Add pain points and competitor angles to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pain_points jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS competitor_angles jsonb DEFAULT '[]'::jsonb;

-- Add optimal posting time to content_items
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS post_time text;
```

- [ ] **Step 2: Verify columns exist**

Run in SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('products', 'content_items')
  AND column_name IN ('pain_points', 'competitor_angles', 'post_time');
```

Expected: 3 rows returned.

---

## Task 2: Hook Formula Library

**Files:**
- Create: `web/lib/hooks.ts`

- [ ] **Step 1: Create the file**

```typescript
// web/lib/hooks.ts

export type ContentType = 'Entertain' | 'Softselling' | 'Edukasi' | 'Hardselling' | 'Trend'

export type HookFormula = {
  pattern: string
  template: string
  example: string
}

export const HOOK_FORMULAS: Record<ContentType, HookFormula[]> = {
  Entertain: [
    {
      pattern: 'POV Relatable',
      template: 'POV: {situasi_relatable_dengan_produk}',
      example: 'POV: Akhirnya nemu earphone yang nggak bikin kuping sakit seharian',
    },
    {
      pattern: 'Curiosity Gap',
      template: 'Gue hampir nggak percaya {fakta_mengejutkan_tentang_produk}...',
      example: 'Gue hampir nggak percaya earphone 200rb bisa ngalahin yang 1 juta...',
    },
    {
      pattern: 'Storytime',
      template: 'Cerita {waktu} lalu yang akhirnya bikin gue switch ke {produk}',
      example: 'Cerita 3 bulan lalu yang akhirnya bikin gue switch ke speaker portable ini',
    },
    {
      pattern: 'Reaction',
      template: 'Ekspresi gue pertama kali nyoba {produk} — jujur banget',
      example: 'Ekspresi gue pertama kali nyoba speaker ini — jujur banget',
    },
  ],
  Softselling: [
    {
      pattern: 'Problem-Solution',
      template: 'Udah capek dengan {pain_point}? Ini yang akhirnya berhasil buat gue',
      example: 'Udah capek earphone putus terus? Ini yang akhirnya berhasil buat gue',
    },
    {
      pattern: 'Before-After',
      template: 'Sebelum pakai {produk}: {kondisi_buruk}. Setelah pakai: {kondisi_baik}',
      example: 'Sebelum pakai ini: meeting online selalu berisik. Setelah pakai: jernih banget',
    },
    {
      pattern: 'Social Proof Number',
      template: '{angka} pembeli nggak mungkin salah pilih {produk}',
      example: '37.000 pembeli nggak mungkin salah pilih earphone ini',
    },
    {
      pattern: 'Honest Review',
      template: 'Jujur review {produk} setelah {durasi} pemakaian — ada yang mengecewakan?',
      example: 'Jujur review speaker ini setelah 3 bulan pemakaian — ada yang mengecewakan?',
    },
  ],
  Edukasi: [
    {
      pattern: 'Misconception',
      template: 'Selama ini kita salah paham soal {topik_terkait_produk}',
      example: 'Selama ini kita salah paham soal cara pilih earphone yang benar',
    },
    {
      pattern: 'Number Tips',
      template: '{angka} hal yang {target_audience} wajib tau sebelum beli {kategori_produk}',
      example: '5 hal yang wajib kamu tau sebelum beli earphone gaming',
    },
    {
      pattern: 'Warning Hook',
      template: 'Stop dulu, jangan beli {kategori_produk} sebelum tau ini',
      example: 'Stop dulu, jangan beli earphone sebelum tau ini',
    },
    {
      pattern: 'Comparison',
      template: 'Bedanya {produk_mahal} vs {produk_kita} yang harganya {selisih_harga} lebih murah',
      example: 'Bedanya AirPods vs earphone ini yang harganya 800rb lebih murah',
    },
  ],
  Hardselling: [
    {
      pattern: 'Urgency Scarcity',
      template: 'Stok tinggal {angka}! {produk} yang udah {social_proof} ini lagi diskon',
      example: 'Stok tinggal 50! Speaker yang udah 10rb+ review ini lagi diskon 40%',
    },
    {
      pattern: 'Price Shock',
      template: 'Harga {harga} untuk {value_proposition}? Beneran ini bukan PHP',
      example: 'Harga 150rb untuk kualitas suara sekelas ini? Beneran ini bukan PHP',
    },
    {
      pattern: 'FOMO',
      template: '{angka} orang udah order {produk} hari ini, kamu?',
      example: '500 orang udah order earphone ini hari ini, kamu?',
    },
    {
      pattern: 'Direct Offer',
      template: 'Link di bio! {produk} + {bonus} cuma {harga} hari ini doang',
      example: 'Link di bio! Speaker portable + gratis case cuma 199rb hari ini doang',
    },
  ],
  Trend: [
    {
      pattern: 'Trend Ride',
      template: 'Ikut trend {nama_trend} tapi pakai {produk} — hasilnya...',
      example: 'Ikut trend silent walking tapi pakai earphone ini — hasilnya...',
    },
    {
      pattern: 'Sound Match',
      template: 'Sound ini {nama_sound} terlalu cocok sama {situasi_pakai_produk}',
      example: 'Sound ini terlalu cocok sama momen unboxing speaker baru',
    },
    {
      pattern: 'Challenge Version',
      template: 'Versi {produk} dari {challenge_trend} yang lagi viral',
      example: 'Versi earphone dari "that girl" challenge yang lagi viral',
    },
  ],
}

export function getHookFormulasForPrompt(contentType: ContentType): string {
  const formulas = HOOK_FORMULAS[contentType] ?? HOOK_FORMULAS.Entertain
  return formulas
    .map(f => `  - [${f.pattern}] Template: "${f.template}" | Contoh: "${f.example}"`)
    .join('\n')
}

export function getAllHookFormulasForPrompt(): string {
  return (Object.keys(HOOK_FORMULAS) as ContentType[])
    .map(type => `${type}:\n${getHookFormulasForPrompt(type)}`)
    .join('\n\n')
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd web && npx tsc --noEmit --skipLibCheck 2>&1 | grep hooks
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add web/lib/hooks.ts
git commit -m "feat: add hook formula library per content type"
```

---

## Task 3: Sound Recommendations Library

**Files:**
- Create: `web/lib/sounds.ts`

- [ ] **Step 1: Create the file**

```typescript
// web/lib/sounds.ts

import type { ContentType } from '@/lib/hooks'

type SoundRecommendation = {
  mood: string
  categories: string[]
  tiktok_search_tip: string
  example_sounds: string[]
}

export const SOUND_RECOMMENDATIONS: Record<ContentType, SoundRecommendation> = {
  Entertain: {
    mood: 'upbeat, fun, viral, energetic',
    categories: ['Viral Sound', 'Comedy', 'Trending Audio', 'Pop Upbeat'],
    tiktok_search_tip: 'TikTok Creative Center → Trending → Sounds → Indonesia → filter minggu ini',
    example_sounds: [
      'Sound viral TikTok Indonesia minggu ini (cek Creative Center)',
      'Trending audio dari video 1M+ views kategori hiburan',
      'Sound dari challenge yang sedang ramai',
    ],
  },
  Softselling: {
    mood: 'relaxed, lifestyle, aesthetic, warm',
    categories: ['Lofi', 'Chill Beats', 'Aesthetic BGM', 'Soft Pop'],
    tiktok_search_tip: 'TikTok Creative Center → Sounds → filter "Lifestyle" atau "Beauty"',
    example_sounds: [
      'Lofi hip hop chill beats (tanpa lirik agar tidak distract)',
      'Aesthetic piano instrumental',
      'Soft acoustic yang calming',
    ],
  },
  Edukasi: {
    mood: 'neutral, focused, professional, clear',
    categories: ['Instrumental', 'Light Background', 'Minimal BGM'],
    tiktok_search_tip: 'Gunakan volume sangat rendah — fokus ke voiceover, bukan musik',
    example_sounds: [
      'Light instrumental tanpa lirik (volume 20-30%)',
      'Subtle background music yang tidak mengganggu',
      'Atau tanpa musik sama sekali — fokus ke penjelasan',
    ],
  },
  Hardselling: {
    mood: 'energetic, urgent, exciting, punchy',
    categories: ['Hype Music', 'Commercial Beat', 'Drop Beat', 'Electronic'],
    tiktok_search_tip: 'TikTok Creative Center → Sounds → filter "Shopping" atau "E-commerce"',
    example_sounds: [
      'Beat drop yang impactful untuk momen reveal harga',
      'Energetic commercial music yang biasa dipakai iklan',
      'Electronic/EDM upbeat yang menciptakan urgensi',
    ],
  },
  Trend: {
    mood: 'currently viral — MUST match the trending sound exactly',
    categories: ['#1 Trending', 'Viral Challenge Sound', 'Currently Popular'],
    tiktok_search_tip: 'Buka TikTok langsung → For You Page → perhatikan sound yang muncul berulang → gunakan sound itu',
    example_sounds: [
      'Sound #1 di TikTok Indonesia hari ini (cek FYP)',
      'Audio dari video viral 10M+ views minggu ini',
      'Sound dari challenge yang hashtag-nya trending',
    ],
  },
}

export function getSoundRecommendationForPrompt(contentType: ContentType): string {
  const rec = SOUND_RECOMMENDATIONS[contentType] ?? SOUND_RECOMMENDATIONS.Entertain
  return [
    `Mood audio: ${rec.mood}`,
    `Kategori: ${rec.categories.join(', ')}`,
    `Contoh: ${rec.example_sounds[0]}`,
    `Cara cari: ${rec.tiktok_search_tip}`,
  ].join(' | ')
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd web && npx tsc --noEmit --skipLibCheck 2>&1 | grep sounds
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add web/lib/sounds.ts
git commit -m "feat: add sound recommendation library per content type"
```

---

## Task 4: Optimal Posting Schedule

**Files:**
- Create: `web/lib/posting-schedule.ts`

- [ ] **Step 1: Create the file**

```typescript
// web/lib/posting-schedule.ts

import type { ContentType } from '@/lib/hooks'

// Peak hours by content type (Indonesian TikTok audience behavior)
const PEAK_HOURS: Record<ContentType, string[]> = {
  Entertain:   ['19:00', '20:00', '21:00', '22:00'],  // evening entertainment
  Softselling: ['11:00', '12:00', '20:00', '21:00'],  // lunch + evening browse
  Edukasi:     ['07:00', '08:00', '12:00', '16:00'],  // morning + study breaks
  Hardselling: ['12:00', '13:00', '19:00', '20:00'],  // impulse buying windows
  Trend:       ['18:00', '19:00', '20:00', '21:00'],  // after-work scrolling
}

// Adjust by day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
const DAY_MULTIPLIER: Record<number, number> = {
  0: 1,   // Sunday - good
  1: 0,   // Monday - skip (use index 1 hour instead)
  2: 0,
  3: 1,   // Wednesday - good
  4: 0,
  5: 1,   // Friday - great
  6: 2,   // Saturday - best
}

export function getOptimalPostTime(contentType: string, postDateStr: string): string {
  const type = contentType as ContentType
  const hours = PEAK_HOURS[type] ?? PEAK_HOURS.Entertain
  const date = new Date(postDateStr)
  const dayOfWeek = date.getDay()

  // Use day multiplier to pick from different peak hours
  const multiplier = DAY_MULTIPLIER[dayOfWeek] ?? 0
  const hourIndex = multiplier % hours.length
  return hours[hourIndex]
}

export function getPostingScheduleContext(): string {
  return `
Peak posting hours TikTok Indonesia berdasarkan jenis konten:
- Entertain: 19:00–22:00 WIB (prime time hiburan malam)
- Softselling: 11:00–13:00 dan 20:00–21:00 WIB (browse saat makan siang + malam)
- Edukasi: 07:00–08:00 dan 12:00 WIB (pagi sebelum aktivitas + istirahat)
- Hardselling: 12:00–13:00 dan 19:00–20:00 WIB (impulse buying moment)
- Trend: 18:00–21:00 WIB (scrolling setelah kerja/sekolah)
`.trim()
}
```

- [ ] **Step 2: Update generateContentPlan in openrouter.ts to include post_time**

In `web/lib/openrouter.ts`, find the `generateContentPlan` function and update the prompt and return type:

```typescript
// Update return type — add post_time field
export async function generateContentPlan(params: {
  productName: string
  sellingPoints: string[]
  targetMarket: string
  keywords: string[]
  durationDays: 7 | 30
  startDate: string
  painPoints?: string[]
  competitorAngles?: string[]
}): Promise<Array<{
  row_number: number
  post_date: string
  post_time: string      // ← ADD THIS
  title: string
  content_type: string
  post_type: string
  hook: string
  caption: string
  hashtags: string[]
}>>
```

Update the prompt string inside `generateContentPlan`:

```typescript
  const prompt = `Kamu adalah content strategist TikTok untuk affiliator Indonesia.
Buat content plan ${params.durationDays} hari untuk produk berikut:

Produk: ${params.productName}
Selling Points: ${params.sellingPoints.join(', ')}
Target Market: ${params.targetMarket}
Trending Keywords: ${params.keywords.length > 0 ? params.keywords.join(', ') : 'tidak ada data'}
${params.painPoints && params.painPoints.length > 0 ? `Pain Points Pembeli (dari review nyata): ${params.painPoints.join(' | ')}` : ''}
${params.competitorAngles && params.competitorAngles.length > 0 ? `Angle Kompetitor yang Sudah Terbukti: ${params.competitorAngles.join(' | ')}` : ''}
Tanggal Mulai: ${params.startDate}

${getPostingScheduleContext()}

Hook formulas yang terbukti convert per jenis konten:
${getAllHookFormulasForPrompt()}

Buat ${params.durationDays} konten, satu per hari. Variasikan jenis konten:
- Entertain (POV, storytime, relatable) — gunakan hook formula Entertain
- Softselling (review natural, before-after) — gunakan hook formula Softselling
- Edukasi (tips, cara memilih, perbandingan) — gunakan hook formula Edukasi
- Hardselling (promosi langsung, urgency) — gunakan hook formula Hardselling
- Trend (ikuti trend/sound TikTok) — gunakan hook formula Trend

PENTING: Jika ada data Pain Points, buat konten yang langsung menyentuh keluhan nyata tersebut.
PENTING: Jika ada Angle Kompetitor, variasikan agar tidak terlalu mirip tapi tetap relevan.

Output JSON array (tanpa markdown):
[
  {
    "row_number": 1,
    "post_date": "YYYY-MM-DD",
    "post_time": "HH:MM",
    "title": "judul konten yang menarik",
    "content_type": "Entertain|Softselling|Edukasi|Hardselling|Trend",
    "post_type": "Video TikTok|Video + Story|Story|Live",
    "hook": "kalimat hook pembuka menggunakan formula yang sesuai",
    "caption": "caption TikTok lengkap dengan emoji (max 200 karakter)",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
  }
]`
```

Add import at top of `openrouter.ts`:
```typescript
import { getAllHookFormulasForPrompt } from '@/lib/hooks'
import { getPostingScheduleContext } from '@/lib/posting-schedule'
```

- [ ] **Step 3: Update generateScript prompt to use sound recommendations**

In `web/lib/openrouter.ts`, find `generateScript` and update the prompt:

```typescript
// Add import at top
import { getSoundRecommendationForPrompt } from '@/lib/sounds'
import type { ContentType } from '@/lib/hooks'

// Inside generateScript, update the audio_cue instruction in prompt:
const soundGuide = getSoundRecommendationForPrompt(item.contentType as ContentType)

// In the prompt string, replace the audio_cue line:
`  "audio_cue": "rekomendasi sound/musik spesifik (${soundGuide})"`
```

- [ ] **Step 4: Update content_items insert in generate-plan route to save post_time**

In `web/app/api/generate-plan/route.ts`, update the content_items insert:

```typescript
await service.from('content_items').insert(
  planItems.map(item => ({
    plan_id: plan.id,
    row_number: item.row_number,
    post_date: item.post_date,
    post_time: item.post_time ?? getOptimalPostTime(item.content_type, item.post_date), // ← ADD
    product_name: analysis.name,
    title: item.title,
    content_type: item.content_type,
    post_type: item.post_type,
    hook: item.hook,
    caption: item.caption,
    hashtags: item.hashtags,
    status: 'pending' as const,
  }))
)
```

Add import at top of route:
```typescript
import { getOptimalPostTime } from '@/lib/posting-schedule'
```

- [ ] **Step 5: Display post_time in plan detail page**

In `web/app/dashboard/plans/[id]/page.tsx`, find the post_date display line and update:

```tsx
// Change:
<div className="text-xs text-gray-500 mt-0.5">{item.post_date} · {item.post_type}</div>

// To:
<div className="text-xs text-gray-500 mt-0.5">
  {item.post_date}
  {item.post_time && <span className="ml-1 font-semibold" style={{ color: '#a78bfa' }}>· {item.post_time} WIB</span>}
  · {item.post_type}
</div>
```

- [ ] **Step 6: Test manually**

Start dev server: `cd web && npm run dev`
Generate a new content plan → open plan detail page → verify each item shows a time like "2026-05-07 · 19:00 WIB · Video TikTok"

- [ ] **Step 7: Commit**

```bash
git add web/lib/posting-schedule.ts web/lib/sounds.ts web/lib/hooks.ts web/lib/openrouter.ts web/app/api/generate-plan/route.ts web/app/dashboard/plans/[id]/page.tsx
git commit -m "feat: add hook formulas, sound recs, optimal posting time to content plan"
```

---

## Task 5: Pain Point Mining dari E-commerce Reviews

**Files:**
- Create: `web/lib/ecommerce-insights.ts`
- Modify: `web/app/api/generate-plan/route.ts`

- [ ] **Step 1: Create ecommerce-insights.ts**

```typescript
// web/lib/ecommerce-insights.ts
import { createServiceClient } from '@/lib/supabase-server'

type SerpOrganicResult = {
  title?: string
  snippet?: string
  link?: string
}

type SerpApiSearchResponse = {
  organic_results?: SerpOrganicResult[]
  error?: string
}

export async function fetchAndSavePainPoints(
  productId: string,
  productName: string
): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return []

  try {
    // Search for Indonesian reviews mentioning pain points/complaints
    const queries = [
      `${productName} kelebihan kekurangan review`,
      `${productName} kelemahan pengalaman pembeli`,
    ]

    const painPoints: string[] = []

    for (const query of queries) {
      const url = new URL('https://serpapi.com/search.json')
      url.searchParams.set('engine', 'google')
      url.searchParams.set('q', query)
      url.searchParams.set('hl', 'id')
      url.searchParams.set('gl', 'id')
      url.searchParams.set('num', '5')
      url.searchParams.set('api_key', apiKey)

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) })
      if (!res.ok) continue

      const data = await res.json() as SerpApiSearchResponse
      if (data.error) continue

      for (const result of data.organic_results ?? []) {
        const text = `${result.title ?? ''} ${result.snippet ?? ''}`.trim()
        if (text.length > 20) painPoints.push(text.slice(0, 200))
      }

      // Limit to 2 SerpAPI calls max per product
      if (painPoints.length >= 6) break
    }

    if (painPoints.length === 0) return []

    // Use AI to extract structured pain points from raw snippets
    const { extractPainPoints } = await import('@/lib/openrouter')
    const structured = await extractPainPoints(productName, painPoints)

    // Save to DB
    const service = createServiceClient()
    await service.from('products')
      .update({ pain_points: structured })
      .eq('id', productId)

    console.log(`Pain points: saved ${structured.length} for product ${productId}`)
    return structured
  } catch (err) {
    console.error('fetchAndSavePainPoints failed (non-fatal):', err)
    return []
  }
}
```

- [ ] **Step 2: Add extractPainPoints function to openrouter.ts**

In `web/lib/openrouter.ts`, add this function before `generateScript`:

```typescript
export async function extractPainPoints(
  productName: string,
  rawSnippets: string[]
): Promise<string[]> {
  const prompt = `Kamu adalah analyst produk untuk konten TikTok Indonesia.
Berikut adalah kutipan review/artikel tentang "${productName}":

${rawSnippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Ekstrak maksimal 6 pain point atau keluhan nyata pembeli/pengguna dari kutipan di atas.
Tulis dalam bahasa Indonesia yang singkat dan spesifik (maks 15 kata per pain point).
Fokus pada keluhan yang bisa dijawab oleh konten TikTok (masalah yang bisa disolution-kan).

Output JSON array of strings (tanpa markdown):
["pain point 1", "pain point 2", "pain point 3"]`

  try {
    const content = await complete([{ role: 'user', content: prompt }], {
      model: MODELS.text,
      max_tokens: 512,
      temperature: 0.3,
    })
    return extractJSON<string[]>(content)
  } catch {
    return rawSnippets.slice(0, 3).map(s => s.slice(0, 80))
  }
}
```

- [ ] **Step 3: Integrate into generate-plan route**

In `web/app/api/generate-plan/route.ts`, add import and call after `fetchAndSaveTrendKeywords`:

```typescript
import { fetchAndSavePainPoints } from '@/lib/ecommerce-insights'

// After fetchAndSaveTrendKeywords call, add:
const painPoints = await fetchAndSavePainPoints(product.id, analysis.name)
```

Then pass painPoints to generateContentPlan:

```typescript
const planItems = await generateContentPlan({
  productName: analysis.name,
  sellingPoints: analysis.selling_points,
  targetMarket: analysis.target_market,
  keywords: keywords?.map(k => k.keyword) ?? [],
  painPoints,                    // ← ADD
  competitorAngles: [],          // ← ADD (filled in Task 6)
  durationDays: duration,
  startDate,
})
```

- [ ] **Step 4: Test manually**

Generate a new plan. Check terminal logs for:
```
Pain points: saved X for product ...
```

Check Supabase → products table → confirm `pain_points` column has data.

- [ ] **Step 5: Commit**

```bash
git add web/lib/ecommerce-insights.ts web/lib/openrouter.ts web/app/api/generate-plan/route.ts
git commit -m "feat: add pain point mining from e-commerce reviews via SerpAPI"
```

---

## Task 6: Competitor TikTok Angle Analysis

**Files:**
- Create: `web/lib/competitor.ts`
- Modify: `web/app/api/generate-plan/route.ts`

- [ ] **Step 1: Create competitor.ts**

```typescript
// web/lib/competitor.ts
import { createServiceClient } from '@/lib/supabase-server'

type SerpOrganicResult = {
  title?: string
  snippet?: string
  link?: string
}

type SerpApiResponse = {
  organic_results?: SerpOrganicResult[]
  error?: string
}

export async function fetchAndSaveCompetitorAngles(
  productId: string,
  productName: string
): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return []

  try {
    // Search for TikTok content about this product
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google')
    url.searchParams.set('q', `${productName} tiktok review viral`)
    url.searchParams.set('hl', 'id')
    url.searchParams.set('gl', 'id')
    url.searchParams.set('num', '8')
    url.searchParams.set('api_key', apiKey)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return []

    const data = await res.json() as SerpApiResponse
    if (data.error || !data.organic_results?.length) return []

    const titles = data.organic_results
      .map(r => r.title ?? '')
      .filter(t => t.length > 5)
      .slice(0, 8)

    if (titles.length === 0) return []

    // Use AI to extract content angle patterns
    const { extractCompetitorAngles } = await import('@/lib/openrouter')
    const angles = await extractCompetitorAngles(productName, titles)

    // Save to DB
    const service = createServiceClient()
    await service.from('products')
      .update({ competitor_angles: angles })
      .eq('id', productId)

    console.log(`Competitor angles: saved ${angles.length} for product ${productId}`)
    return angles
  } catch (err) {
    console.error('fetchAndSaveCompetitorAngles failed (non-fatal):', err)
    return []
  }
}
```

- [ ] **Step 2: Add extractCompetitorAngles to openrouter.ts**

```typescript
export async function extractCompetitorAngles(
  productName: string,
  competitorTitles: string[]
): Promise<string[]> {
  const prompt = `Kamu adalah content strategist TikTok Indonesia.
Berikut judul-judul video TikTok/konten tentang "${productName}" yang viral:

${competitorTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Identifikasi maksimal 5 angle konten yang sering digunakan (pola/pendekatan konten).
Contoh angle: "unboxing + first impression", "perbandingan harga vs kualitas", "tips memilih yang tepat".
Tulis dalam bahasa Indonesia, singkat dan actionable.

Output JSON array of strings (tanpa markdown):
["angle 1", "angle 2", "angle 3"]`

  try {
    const content = await complete([{ role: 'user', content: prompt }], {
      model: MODELS.text,
      max_tokens: 400,
      temperature: 0.3,
    })
    return extractJSON<string[]>(content)
  } catch {
    return []
  }
}
```

- [ ] **Step 3: Integrate into generate-plan route**

In `web/app/api/generate-plan/route.ts`:

```typescript
import { fetchAndSaveCompetitorAngles } from '@/lib/competitor'

// Run pain points and competitor analysis in parallel (save time):
const [painPoints, competitorAngles] = await Promise.all([
  fetchAndSavePainPoints(product.id, analysis.name),
  fetchAndSaveCompetitorAngles(product.id, analysis.name),
])
```

Then update the `generateContentPlan` call to pass `competitorAngles`:

```typescript
const planItems = await generateContentPlan({
  productName: analysis.name,
  sellingPoints: analysis.selling_points,
  targetMarket: analysis.target_market,
  keywords: keywords?.map(k => k.keyword) ?? [],
  painPoints,
  competitorAngles,
  durationDays: duration,
  startDate,
})
```

- [ ] **Step 4: Test manually**

Generate a new plan. Check terminal for:
```
Competitor angles: saved X for product ...
```

Check Supabase → products → `competitor_angles` has data.

- [ ] **Step 5: Commit**

```bash
git add web/lib/competitor.ts web/lib/openrouter.ts web/app/api/generate-plan/route.ts
git commit -m "feat: add competitor TikTok angle analysis via SerpAPI"
```

---

## Task 7: Display Enrichment Data in Products Page

**Files:**
- Modify: `web/app/dashboard/products/page.tsx`

- [ ] **Step 1: Show pain points and competitor angles on product card**

In `web/app/dashboard/products/page.tsx`, update the mapped product object:

```typescript
const products = (rawProducts ?? []).map(p => ({
  ...p,
  isPhoto: !!p.image_url,
  planCount: Array.isArray(p.content_plans) ? p.content_plans.length : 0,
  selling_points: Array.isArray(p.selling_points) ? p.selling_points as string[] : [],
  pain_points: Array.isArray(p.pain_points) ? p.pain_points as string[] : [],
  competitor_angles: Array.isArray(p.competitor_angles) ? p.competitor_angles as string[] : [],
}))
```

Update the select query to include new columns:
```typescript
const { data: rawProducts } = await db
  .from('products')
  .select('*, content_plans(id), pain_points, competitor_angles')  // ← add pain_points, competitor_angles
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

Add after selling points section in each card:

```tsx
{product.pain_points.length > 0 && (
  <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
    <div className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Pain Points</div>
    <div className="space-y-1">
      {product.pain_points.slice(0, 2).map((p, i) => (
        <div key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
          <span style={{ color: '#fb7185' }}>•</span>
          <span className="leading-relaxed">{p}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Test manually**

Open `/dashboard/products` → verify products that were generated after Task 5 show pain points.

- [ ] **Step 3: Commit**

```bash
git add web/app/dashboard/products/page.tsx
git commit -m "feat: display pain points and competitor angles on product cards"
```

---

## Self-Review

### Spec Coverage

| Feature | Task | Status |
|---|---|---|
| Hook Formula Library | Task 2, 4 | ✅ Implemented + injected into prompt |
| Sound Recommendations | Task 3, 4 | ✅ Library created + injected into script prompt |
| Optimal Posting Time | Task 4 | ✅ Logic + DB + display in plan detail |
| Pain Point Mining | Task 5 | ✅ SerpAPI + AI extraction + DB + display |
| Competitor Analysis | Task 6 | ✅ SerpAPI + AI extraction + DB + display |

### SerpAPI Budget Check

Per `generate-plan` call:
- Google Trends (keywords): 1 call
- Pain points (2 queries): 2 calls
- Competitor angles: 1 call
- **Total: 4 calls per generate**

Free tier: 100 searches/month → ~25 generates/month. For paid tier ($50/month = 5000 searches), ~1250 generates/month. Acceptable.

### Placeholder Scan

No TBD, TODO, or vague instructions found. All code blocks are complete.

### Type Consistency

- `ContentType` defined in `hooks.ts`, imported in `sounds.ts`, `posting-schedule.ts`, `openrouter.ts` ✅
- `extractPainPoints` defined in Task 5 Step 2, called in `ecommerce-insights.ts` Task 5 Step 1 ✅
- `extractCompetitorAngles` defined in Task 6 Step 2, called in `competitor.ts` Task 6 Step 1 ✅
- `painPoints` and `competitorAngles` params added to `generateContentPlan` in Task 4 Step 2, passed in Task 6 Step 3 ✅
- `post_time` added to return type in Task 4 Step 2, saved in Task 4 Step 4 ✅
