import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const service = createServiceClient()

  // Check all tables with service role (bypass RLS)
  const [userRow, products, plans, items, scripts] = await Promise.all([
    service.from('users').select('id, email, role').eq('id', user.id).single(),
    service.from('products').select('id, name, user_id').eq('user_id', user.id),
    service.from('content_plans').select('id, status, user_id').eq('user_id', user.id),
    service.from('content_items').select('id, title', { count: 'exact', head: true }),
    service.from('scripts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  // Try a test insert
  const testInsert = await service.from('products').insert({
    user_id: user.id,
    name: '__debug_test__',
    selling_points: [],
    target_market: 'test',
  }).select('id').single()

  // Clean up test insert
  if (testInsert.data?.id) {
    await service.from('products').delete().eq('id', testInsert.data.id)
  }

  return NextResponse.json({
    auth_user_id: user.id,
    auth_email: user.email,
    public_user: userRow.data,
    public_user_error: userRow.error?.message,
    products_count: products.data?.length ?? 0,
    products_error: products.error?.message,
    plans_count: plans.data?.length ?? 0,
    plans_error: plans.error?.message,
    items_count: items.count ?? 0,
    scripts_count: scripts.count ?? 0,
    test_insert_ok: !testInsert.error,
    test_insert_error: testInsert.error?.message,
  })
}
