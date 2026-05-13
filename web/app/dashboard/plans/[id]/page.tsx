import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import GenerateScriptButton from '@/components/dashboard/GenerateScriptButton'
import ContentItemActions from '@/components/dashboard/ContentItemActions'
import { ArrowLeft, Download, CheckCircle2, Circle, LayoutList } from 'lucide-react'

const typeColors: Record<string, { bg: string; color: string }> = {
  Entertain:   { bg: 'rgba(167,139,250,0.12)', color: '#c4b5fd' },
  Softselling: { bg: 'rgba(96,165,250,0.12)',  color: '#93c5fd' },
  Edukasi:     { bg: 'rgba(52,211,153,0.12)',  color: '#6ee7b7' },
  Hardselling: { bg: 'rgba(251,113,133,0.12)', color: '#fda4af' },
  Trend:       { bg: 'rgba(251,191,36,0.12)',  color: '#fcd34d' },
}

type FilterTab = 'all' | 'pending' | 'done'

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filter?: string }>
}) {
  const { id } = await params
  const { filter } = await searchParams
  const activeFilter = (['all', 'pending', 'done'].includes(filter ?? '') ? filter : 'all') as FilterTab

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: plan } = await db
    .from('content_plans')
    .select('*, products(name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!plan) notFound()

  const { data: allItems } = await db
    .from('content_items')
    .select('*')
    .eq('plan_id', id)
    .order('row_number', { ascending: true })

  const items = allItems ?? []
  const doneCount = items.filter(i => i.status === 'done').length
  const pendingCount = items.filter(i => i.status === 'pending').length

  const filteredItems = activeFilter === 'all' ? items
    : items.filter(i => i.status === activeFilter)

  const productName = Array.isArray(plan.products)
    ? plan.products[0]?.name
    : (plan.products as { name: string } | null)?.name

  const tabs: { key: FilterTab; label: string; icon: typeof LayoutList; count: number }[] = [
    { key: 'all',     label: 'Semua',    icon: LayoutList,   count: items.length },
    { key: 'pending', label: 'Menunggu', icon: Circle,       count: pendingCount },
    { key: 'done',    label: 'Selesai',  icon: CheckCircle2, count: doneCount },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/plans"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">{productName ?? 'Content Plan'}</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {plan.duration_days} hari · {new Date(plan.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        {plan.spreadsheet_url && (
          <a href={plan.spreadsheet_url} download
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
            <Download size={14} /> Download CSV
          </a>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="bento-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Progress konten</span>
            <span className="text-xs font-bold" style={{ color: '#34d399' }}>
              {doneCount}/{items.length} selesai
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${items.length ? (doneCount / items.length) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #34d399, #6ee7b7)',
              }}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {items.length > 0 && (
        <div className="flex gap-2">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <Link
              key={key}
              href={`/dashboard/plans/${id}?filter=${key}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={activeFilter === key
                ? { background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Icon size={12} />
              {label}
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {count}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Items */}
      {!filteredItems.length ? (
        <div className="bento-card py-16 text-center text-gray-500">
          {activeFilter === 'done'
            ? 'Belum ada konten yang selesai.'
            : activeFilter === 'pending'
            ? 'Semua konten sudah selesai! 🎉'
            : 'Tidak ada konten ditemukan.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const tc = typeColors[item.content_type] ?? typeColors.Entertain
            const isDone = item.status === 'done'
            return (
              <div key={item.id} className="bento-card p-5 transition-all"
                style={isDone ? { opacity: 0.65 } : {}}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                      style={isDone
                        ? { background: 'rgba(52,211,153,0.12)', color: '#34d399' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                      {isDone ? <CheckCircle2 size={15} /> : item.row_number}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm leading-tight"
                        style={isDone ? { textDecoration: 'line-through', opacity: 0.7 } : {}}>
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.post_date}
                        {item.post_time && <span className="ml-1 font-semibold" style={{ color: '#a78bfa' }}>· {item.post_time} WIB</span>}
                        · {item.post_type}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: tc.bg, color: tc.color }}>
                    {item.content_type}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Hook</div>
                    <div className="text-sm text-gray-300 leading-relaxed">{item.hook}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Caption</div>
                    <div className="text-sm text-gray-300 leading-relaxed">{item.caption}</div>
                  </div>
                </div>

                {item.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.hashtags.map((tag: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <GenerateScriptButton itemId={item.id} />
                <ContentItemActions itemId={item.id} status={item.status ?? 'pending'} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
