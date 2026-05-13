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
