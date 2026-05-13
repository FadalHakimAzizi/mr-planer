import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { generateScript } from '@/lib/openrouter'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await request.json()
  if (!itemId) return NextResponse.json({ error: 'itemId diperlukan' }, { status: 400 })

  const service = createServiceClient()

  const { data: item } = await service
    .from('content_items')
    .select('*, content_plans(product_id, products(name, selling_points))')
    .eq('id', itemId)
    .single()

  if (!item) return NextResponse.json({ error: 'Content item tidak ditemukan' }, { status: 404 })

  const plan = Array.isArray(item.content_plans) ? item.content_plans[0] : item.content_plans as { products: { name: string; selling_points: string[] } } | null
  const productName = (plan?.products as { name: string } | null)?.name ?? 'Produk'
  const sellingPoints: string[] = (plan?.products as { selling_points: string[] } | null)?.selling_points ?? []

  const script = await generateScript({
    title: item.title ?? '',
    contentType: item.content_type ?? '',
    hook: item.hook ?? '',
    caption: item.caption ?? '',
    productName,
    sellingPoints,
  })

  await service.from('scripts').insert({
    item_id: item.id,
    user_id: user.id,
    ...script,
    docs_url: null,
  })

  await service.from('activity_logs').insert({
    user_id: user.id,
    action: 'generate_script',
    metadata: { item_id: item.id, title: item.title },
  })

  return NextResponse.json({ script })
}
