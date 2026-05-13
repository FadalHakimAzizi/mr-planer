import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import PlanActions from '@/components/dashboard/PlanActions'
import { CalendarDays, ExternalLink, Plus, ChevronRight, Image, Type, LayoutList } from 'lucide-react'

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '⟳ Berjalan' },
  done:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: '✓ Selesai' },
  error:   { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', label: '✗ Error' },
}

type Product = { name: string; image_url: string | null } | null
type ModeFilter = 'all' | 'photo' | 'text'

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const activeMode = (['all', 'photo', 'text'].includes(mode ?? '') ? mode : 'all') as ModeFilter

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: allPlans } = await db
    .from('content_plans')
    .select('*, products(name, image_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const plans = allPlans ?? []

  // Classify each plan
  const classified = plans.map(plan => {
    const product = (Array.isArray(plan.products) ? plan.products[0] : plan.products) as Product
    return { ...plan, product, isPhoto: !!product?.image_url }
  })

  const photoPlans  = classified.filter(p => p.isPhoto)
  const textPlans   = classified.filter(p => !p.isPhoto)
  const donePlans   = classified.filter(p => p.status === 'done')

  const filtered = activeMode === 'photo' ? photoPlans
    : activeMode === 'text' ? textPlans
    : classified

  const tabs = [
    { key: 'all'   as ModeFilter, icon: LayoutList, label: 'Semua',  count: classified.length },
    { key: 'photo' as ModeFilter, icon: Image,      label: 'Foto',   count: photoPlans.length },
    { key: 'text'  as ModeFilter, icon: Type,       label: 'Teks',   count: textPlans.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">📅 Content Plan</h1>
          <p className="text-gray-400 text-sm mt-1">Semua content plan yang pernah dibuat.</p>
        </div>
        <Link href="/dashboard/generator"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white glow-primary"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Plus size={16} /> Buat Baru
        </Link>
      </div>

      {/* Stats */}
      {classified.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bento-card p-4">
            <div className="text-2xl font-black text-white">{classified.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Plan</div>
          </div>
          <div className="bento-card p-4">
            <div className="text-2xl font-black" style={{ color: '#34d399' }}>{donePlans.length}</div>
            <div className="text-xs text-gray-500 mt-1">Selesai</div>
          </div>
          <div className="bento-card p-4">
            <div className="text-2xl font-black" style={{ color: '#a78bfa' }}>{photoPlans.length}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Image size={10} /> Dari Foto
            </div>
          </div>
          <div className="bento-card p-4">
            <div className="text-2xl font-black" style={{ color: '#60a5fa' }}>{textPlans.length}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Type size={10} /> Dari Teks
            </div>
          </div>
        </div>
      )}

      {!classified.length ? (
        <div className="bento-card py-20 text-center text-gray-500">
          <CalendarDays size={40} className="mx-auto mb-4 opacity-20" />
          <p>Belum ada content plan.</p>
          <Link href="/dashboard/generator" className="text-sm mt-2 inline-block" style={{ color: '#a78bfa' }}>
            Buat sekarang →
          </Link>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {tabs.map(({ key, icon: Icon, label, count }) => (
              <Link
                key={key}
                href={`/dashboard/plans?mode=${key}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={activeMode === key
                  ? key === 'photo'
                    ? { background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)' }
                    : key === 'text'
                    ? { background: 'rgba(96,165,250,0.15)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.3)' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Icon size={12} />
                {label}
                <span className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {count}
                </span>
              </Link>
            ))}
          </div>

          {/* Plan List */}
          {filtered.length === 0 ? (
            <div className="bento-card py-16 text-center text-gray-500">
              {activeMode === 'photo'
                ? 'Belum ada plan dari foto produk.'
                : 'Belum ada plan dari topik teks.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((plan) => {
                const st = statusStyles[plan.status] ?? statusStyles.pending
                const { product, isPhoto } = plan
                const isDone = plan.status === 'done'

                return (
                  <div key={plan.id} className="bento-card p-4 transition-all"
                    style={isDone ? { opacity: 0.7 } : {}}>
                    <div className="flex items-start gap-4">

                      {/* Thumbnail */}
                      {isPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product!.image_url!}
                          alt={product?.name ?? ''}
                          className="w-16 h-16 rounded-xl object-cover shrink-0"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0"
                          style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
                          <Type size={18} style={{ color: '#60a5fa' }} />
                          <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>Teks</span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/dashboard/plans/${plan.id}`}
                              className="font-bold text-white hover:text-purple-300 transition-colors"
                              style={isDone ? { textDecoration: 'line-through', opacity: 0.7 } : {}}>
                              {product?.name ?? 'Content Plan'}
                            </Link>
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                              style={isPhoto
                                ? { background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }
                                : { background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                              {isPhoto ? '📷 Foto' : '✍️ Teks'}
                            </span>
                          </div>
                          <Link href={`/dashboard/plans/${plan.id}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <ChevronRight size={14} />
                          </Link>
                        </div>

                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          <span className="text-xs text-gray-600">{plan.duration_days} hari</span>
                          <span className="text-xs text-gray-600">·</span>
                          <span className="text-xs text-gray-600">
                            {new Date(plan.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {plan.spreadsheet_url && (
                            <>
                              <span className="text-xs text-gray-600">·</span>
                              <a href={plan.spreadsheet_url} download
                                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                                <ExternalLink size={11} /> CSV
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <PlanActions planId={plan.id} status={plan.status} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
