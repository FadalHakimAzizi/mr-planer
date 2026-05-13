import { createServiceClient } from '@/lib/supabase-server'

type SerpApiItem = {
  query: string
  value: string
  extracted_value: number
}

type SerpApiTrendsResponse = {
  related_queries?: {
    rising?: SerpApiItem[]
    top?: SerpApiItem[]
  }
  error?: string
}

export async function fetchAndSaveTrendKeywords(productId: string, searchTerm: string): Promise<void> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return

  console.log(`SerpAPI: fetching trends for "${searchTerm}" (product: ${productId})`)

  try {
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google_trends')
    url.searchParams.set('q', searchTerm)
    url.searchParams.set('geo', 'ID')
    url.searchParams.set('data_type', 'RELATED_QUERIES')
    url.searchParams.set('hl', 'id')
    url.searchParams.set('api_key', apiKey)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      console.error(`SerpAPI error ${res.status}:`, await res.text())
      return
    }

    const data = await res.json() as SerpApiTrendsResponse
    if (data.error) {
      console.error('SerpAPI response error:', data.error)
      return
    }

    type KeywordRow = { product_id: string; keyword: string; trend_score: number; region: string }
    const rows: KeywordRow[] = []

    const addRows = (items: SerpApiItem[] | undefined) => {
      for (const item of items ?? []) {
        // Skip irrelevant or malformed entries
        if (!item.query || item.query.length > 80) continue
        const score = typeof item.extracted_value === 'number' ? item.extracted_value : 0
        rows.push({ product_id: productId, keyword: item.query, trend_score: score, region: 'ID' })
      }
    }

    addRows(data.related_queries?.rising)
    addRows(data.related_queries?.top)

    if (rows.length === 0) {
      console.log(`SerpAPI: no related queries for "${searchTerm}"`)
      return
    }

    const service = createServiceClient()
    const { error } = await service.from('keywords').insert(rows)
    if (error) console.error('keywords insert error:', error.message)
    else console.log(`SerpAPI: saved ${rows.length} keywords for product ${productId}`)
  } catch (err) {
    console.error('fetchAndSaveTrendKeywords failed (non-fatal):', err)
  }
}
