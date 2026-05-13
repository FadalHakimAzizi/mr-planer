import type { ContentType } from '@/lib/hooks'

const PEAK_HOURS: Record<ContentType, string[]> = {
  Entertain:   ['19:00', '20:00', '21:00', '22:00'],
  Softselling: ['11:00', '12:00', '20:00', '21:00'],
  Edukasi:     ['07:00', '08:00', '12:00', '16:00'],
  Hardselling: ['12:00', '13:00', '19:00', '20:00'],
  Trend:       ['18:00', '19:00', '20:00', '21:00'],
}

const DAY_MULTIPLIER: Record<number, number> = {
  0: 1, 1: 0, 2: 0, 3: 1, 4: 0, 5: 1, 6: 2,
}

export function getOptimalPostTime(contentType: string, postDateStr: string): string {
  const type = contentType as ContentType
  const hours = PEAK_HOURS[type] ?? PEAK_HOURS.Entertain
  const date = new Date(postDateStr)
  const dayOfWeek = date.getDay()
  const multiplier = DAY_MULTIPLIER[dayOfWeek] ?? 0
  const hourIndex = multiplier % hours.length
  return hours[hourIndex]
}

export function getPostingScheduleContext(): string {
  return `Peak posting hours TikTok Indonesia berdasarkan jenis konten:
- Entertain: 19:00–22:00 WIB (prime time hiburan malam)
- Softselling: 11:00–13:00 dan 20:00–21:00 WIB (browse saat makan siang + malam)
- Edukasi: 07:00–08:00 dan 12:00 WIB (pagi sebelum aktivitas + istirahat)
- Hardselling: 12:00–13:00 dan 19:00–20:00 WIB (impulse buying moment)
- Trend: 18:00–21:00 WIB (scrolling setelah kerja/sekolah)`.trim()
}
