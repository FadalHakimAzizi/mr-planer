import { createServiceClient } from '@/lib/supabase-server'
import { extractCompetitorAngles } from '@/lib/openrouter'

type SerperOrganicResult = {
  title?: string
  snippet?: string
  link?: string
}

type SerperResponse = {
  organic?: SerperOrganicResult[]
}

export async function fetchAndSaveCompetitorAngles(
  productId: string,
  productName: string
): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    console.log('SERPER_API_KEY not set, skipping competitor analysis')
    return []
  }

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${productName} tiktok review viral`, gl: 'id', hl: 'id', num: 8 }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return []
    const data = await res.json() as SerperResponse

    const titles = (data.organic ?? [])
      .map(r => r.title ?? '')
      .filter(t => t.length > 5)
      .slice(0, 8)

    if (titles.length === 0) {
      console.log(`Competitor angles: no results for "${productName}"`)
      return []
    }

    const angles = await extractCompetitorAngles(productName, titles)

    const service = createServiceClient()
    await service.from('products').update({ competitor_angles: angles }).eq('id', productId)

    console.log(`Competitor angles: saved ${angles.length} for product ${productId}`)
    return angles
  } catch (err) {
    console.error('fetchAndSaveCompetitorAngles failed (non-fatal):', err)
    return []
  }
}
