import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { createContentPlanSpreadsheet } from '@/lib/google-api'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-n8n-secret')
    if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const planId = body?.planId
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ error: 'planId required' }, { status: 400 })
    }

    const service = createServiceClient()

    const { data: plan, error: planErr } = await service
      .from('content_plans')
      .select('id, duration_days, product_id')
      .eq('id', planId)
      .single()

    if (planErr || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const { data: product } = await service
      .from('products')
      .select('name')
      .eq('id', plan.product_id)
      .single()

    const { data: items, error: itemsErr } = await service
      .from('content_items')
      .select('row_number, post_date, post_time, product_name, title, content_type, post_type, hook, caption, hashtags')
      .eq('plan_id', planId)
      .order('row_number', { ascending: true })

    if (itemsErr || !items) {
      return NextResponse.json({ error: 'Items not found' }, { status: 404 })
    }

    const productName = product?.name ?? 'Produk'
    const title = `MR. PLANNER - ${productName} - ${plan.duration_days} hari - ${new Date().toISOString().slice(0, 10)}`

    const spreadsheetUrl = await createContentPlanSpreadsheet({
      title,
      items: items.map(i => ({
        row_number: i.row_number,
        post_date: i.post_date,
        post_time: i.post_time,
        product_name: i.product_name,
        title: i.title,
        content_type: i.content_type,
        post_type: i.post_type,
        hook: i.hook,
        caption: i.caption,
        hashtags: i.hashtags ?? [],
      })),
    })

    await service
      .from('content_plans')
      .update({ spreadsheet_url: spreadsheetUrl, status: 'done' })
      .eq('id', planId)

    return NextResponse.json({ spreadsheetUrl, planId })
  } catch (err) {
    console.error('spreadsheet/from-plan error:', err)
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
