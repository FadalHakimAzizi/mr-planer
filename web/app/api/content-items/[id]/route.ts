import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await request.json() as { status: 'pending' | 'done' }
  if (!['pending', 'done'].includes(status)) {
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verify item belongs to this user via plan ownership
  const { data: item } = await service
    .from('content_items')
    .select('id, content_plans(user_id)')
    .eq('id', id)
    .single()

  const cp = item?.content_plans as unknown as { user_id: string } | { user_id: string }[] | null | undefined
  const planUserId = Array.isArray(cp) ? cp[0]?.user_id : cp?.user_id

  if (!item || planUserId !== user.id) {
    return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })
  }

  await service.from('content_items').update({ status }).eq('id', id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()

  // Verify item belongs to this user via plan ownership
  const { data: item } = await service
    .from('content_items')
    .select('id, content_plans(user_id)')
    .eq('id', id)
    .single()

  const cp = item?.content_plans as unknown as { user_id: string } | { user_id: string }[] | null | undefined
  const planUserId = Array.isArray(cp) ? cp[0]?.user_id : cp?.user_id

  if (!item || planUserId !== user.id) {
    return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })
  }

  await service.from('content_items').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
