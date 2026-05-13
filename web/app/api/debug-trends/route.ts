import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const service = createServiceClient()
  const apiKey = process.env.SERPAPI_KEY

  // 1. Check keywords table
  const { data: kwRows, error: kwErr } = await service
    .from('keywords')
    .select('id, keyword, trend_score, product_id')
    .limit(10)

  // 2. Raw SerpAPI call with simple term
  let serpResult: unknown = null
  let serpError: string | null = null
  if (apiKey) {
    try {
      const url = new URL('https://serpapi.com/search.json')
      url.searchParams.set('engine', 'google_trends')
      url.searchParams.set('q', 'properti')
      url.searchParams.set('geo', 'ID')
      url.searchParams.set('data_type', 'RELATED_QUERIES')
      url.searchParams.set('hl', 'id')
      url.searchParams.set('api_key', apiKey)

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) })
      const text = await res.text()
      serpResult = { status: res.status, body: JSON.parse(text) }
    } catch (e) {
      serpError = String(e)
    }
  }

  // 3. Test insert to keywords table
  const { data: products } = await service
    .from('products')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  let insertTest: unknown = null
  if (products?.[0]) {
    const { data, error } = await service
      .from('keywords')
      .insert({ product_id: products[0].id, keyword: '__debug_test__', trend_score: 1, region: 'ID' })
      .select('id')
      .single()
    insertTest = { ok: !error, error: error?.message, id: data?.id }
    if (data?.id) {
      await service.from('keywords').delete().eq('id', data.id)
    }
  }

  return NextResponse.json({
    serpapi_key_set: !!apiKey,
    keywords_in_db: kwRows ?? [],
    keywords_error: kwErr?.message,
    serp_result: serpResult,
    serp_error: serpError,
    insert_test: insertTest,
  })
}
