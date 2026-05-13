import { createServiceClient } from '@/lib/supabase-server'
import { extractPainPoints } from '@/lib/openrouter'

type SerperOrganicResult = {
  title?: string
  snippet?: string
  link?: string
}

type SerperResponse = {
  organic?: SerperOrganicResult[]
  error?: string
}

async function serperSearch(query: string, num = 5): Promise<SerperOrganicResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return []

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'id', hl: 'id', num }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) return []
  const data = await res.json() as SerperResponse
  return data.organic ?? []
}

export async function fetchAndSavePainPoints(
  productId: string,
  productName: string
): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    console.log('SERPER_API_KEY not set, skipping pain point mining')
    return []
  }

  try {
    const queries = [
      `${productName} kelebihan kekurangan review`,
      `${productName} kelemahan pengalaman pembeli`,
    ]

    const rawSnippets: string[] = []

    for (const query of queries) {
      const results = await serperSearch(query, 5)
      for (const r of results) {
        const text = `${r.title ?? ''} ${r.snippet ?? ''}`.trim()
        if (text.length > 20) rawSnippets.push(text.slice(0, 200))
      }
      if (rawSnippets.length >= 6) break
    }

    if (rawSnippets.length === 0) {
      console.log(`Pain points: no results for "${productName}"`)
      return []
    }

    const structured = await extractPainPoints(productName, rawSnippets)

    const service = createServiceClient()
    await service.from('products').update({ pain_points: structured }).eq('id', productId)

    console.log(`Pain points: saved ${structured.length} for product ${productId}`)
    return structured
  } catch (err) {
    console.error('fetchAndSavePainPoints failed (non-fatal):', err)
    return []
  }
}
