import { getAllHookFormulasForPrompt } from '@/lib/hooks'
import { getPostingScheduleContext } from '@/lib/posting-schedule'
import { getSoundRecommendationForPrompt } from '@/lib/sounds'
import type { ContentType } from '@/lib/hooks'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

export const MODELS = {
  vision: 'meta-llama/llama-4-scout-17b-16e-instruct',
  text: 'llama-3.3-70b-versatile',
} as const

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type CompletionOptions = {
  model?: string
  temperature?: number
  max_tokens?: number
}

async function callModel(model: string, messages: Message[], options: CompletionOptions) {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content as string
}

function extractJSON<T>(raw: string): T {
  // Strip markdown code fences
  let s = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

  // Find outermost JSON object or array by bracket matching
  const firstBrace = s.indexOf('{')
  const firstBracket = s.indexOf('[')

  let start = -1
  let isArray = false
  if (firstBrace === -1 && firstBracket === -1) throw new Error('No JSON found in AI response')
  if (firstBrace === -1) { start = firstBracket; isArray = true }
  else if (firstBracket === -1) { start = firstBrace }
  else if (firstBracket < firstBrace) { start = firstBracket; isArray = true }
  else { start = firstBrace }

  const open = isArray ? '[' : '{'
  const close = isArray ? ']' : '}'
  let depth = 0
  let end = -1
  for (let i = start; i < s.length; i++) {
    if (s[i] === open) depth++
    else if (s[i] === close) { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('Malformed JSON: unmatched brackets')
  return JSON.parse(s.slice(start, end + 1)) as T
}

async function complete(messages: Message[], options: CompletionOptions = {}) {
  const model = options.model ?? MODELS.text
  return await callModel(model, messages, options)
}

export async function analyzeProductImage(imageUrl: string, description?: string): Promise<{
  name: string
  selling_points: string[]
  target_market: string
  use_cases: string[]
}> {
  const prompt = `Kamu adalah AI product analyst untuk affiliator TikTok Indonesia.
Analisis gambar produk ini dan berikan output dalam format JSON berikut (tanpa markdown):
{
  "name": "nama produk lengkap",
  "selling_points": ["keunggulan 1", "keunggulan 2", "keunggulan 3", "keunggulan 4", "keunggulan 5"],
  "target_market": "deskripsi target pengguna/pembeli",
  "use_cases": ["use case 1", "use case 2", "use case 3"]
}
${description ? `Informasi tambahan dari user: ${description}` : ''}
Gunakan bahasa Indonesia. Fokus pada value proposition yang menarik untuk konten TikTok.`

  const content = await complete([
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: prompt },
      ],
    },
  ], { model: MODELS.vision })

  return extractJSON(content)
}

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
  post_time: string
  title: string
  content_type: string
  post_type: string
  hook: string
  caption: string
  hashtags: string[]
}>> {
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

  const content = await complete([{ role: 'user', content: prompt }], {
    model: MODELS.text,
    max_tokens: 8192,
  })

  return extractJSON(content)
}

export async function analyzeTopicText(topic: string, targetMarket?: string): Promise<{
  name: string
  selling_points: string[]
  target_market: string
  use_cases: string[]
}> {
  const prompt = `Kamu adalah content strategist TikTok Indonesia.
Berdasarkan topik/produk/niche berikut, buat informasi untuk content planning TikTok:

Topik: ${topic}
${targetMarket ? `Target Market: ${targetMarket}` : ''}

Output JSON (tanpa markdown):
{
  "name": "nama topik atau brand yang menarik dan singkat",
  "selling_points": ["poin konten 1", "poin konten 2", "poin konten 3", "poin konten 4", "poin konten 5"],
  "target_market": "deskripsi target audiens TikTok yang spesifik",
  "use_cases": ["angle konten 1", "angle konten 2", "angle konten 3"]
}

Contoh: untuk topik "developer properti rumah Type 45 Serpong", selling_points bisa berupa: lokasi strategis, desain modern, cicilan ringan, fasilitas lengkap, investasi menguntungkan.
Gunakan bahasa Indonesia.`

  const content = await complete([{ role: 'user', content: prompt }], {
    model: MODELS.text,
    max_tokens: 1024,
  })

  return extractJSON(content)
}

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

export async function generateScript(item: {
  title: string
  contentType: string
  hook: string
  caption: string
  productName: string
  sellingPoints: string[]
}): Promise<{
  hook_text: string
  problem: string
  solution: string
  cta: string
  visual_direction: string
  audio_cue: string
}> {
  const soundGuide = getSoundRecommendationForPrompt(item.contentType as ContentType)

  const prompt = `Kamu adalah script writer konten TikTok untuk affiliator Indonesia.
Buat script video TikTok berdasarkan brief berikut:

Judul: ${item.title}
Jenis Konten: ${item.contentType}
Hook: ${item.hook}
Caption: ${item.caption}
Produk: ${item.productName}
Selling Points: ${item.sellingPoints.join(', ')}

Buat script dalam format JSON (tanpa markdown):
{
  "hook_text": "teks hook 3-5 detik pertama (harus langsung menarik perhatian)",
  "problem": "narasi problem/pain point yang relatable (10-15 detik)",
  "solution": "narasi solusi dengan produk (15-20 detik)",
  "cta": "call-to-action yang kuat di akhir (5-10 detik)",
  "visual_direction": "panduan visual: angle kamera, props, setting, transisi",
  "audio_cue": "rekomendasi sound/musik spesifik — ${soundGuide}"
}`

  const content = await complete([{ role: 'user', content: prompt }], {
    model: MODELS.text,
    max_tokens: 2048,
  })

  return extractJSON(content)
}
