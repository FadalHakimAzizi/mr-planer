import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { createContentPlanSpreadsheet } from '@/lib/google-api'
import { createScriptDoc } from '@/lib/google-api'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action } = body

  const service = createServiceClient()

  if (action === 'create_spreadsheet') {
    const { planId, items, productName, durationDays } = body
    const spreadsheetUrl = await createContentPlanSpreadsheet({
      title: `Content Plan - ${productName} - ${durationDays} Hari`,
      items,
    })
    await service.from('content_plans').update({ spreadsheet_url: spreadsheetUrl, status: 'done' }).eq('id', planId)
    return NextResponse.json({ spreadsheetUrl })
  }

  if (action === 'create_doc') {
    const { itemId, userId, title, productName, script } = body
    const docsUrl = await createScriptDoc({ title, productName, script })
    await service.from('scripts').insert({ item_id: itemId, user_id: userId, ...script, docs_url: docsUrl })
    return NextResponse.json({ docsUrl })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
