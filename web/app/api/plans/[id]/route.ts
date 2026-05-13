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
  const { error } = await service
    .from('content_plans')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()

  // Verify ownership before delete
  const { data: plan } = await service
    .from('content_plans')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan tidak ditemukan' }, { status: 404 })

  await service.from('content_plans').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
