import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { FileText, ChevronRight, ChevronLeft, LayoutList } from 'lucide-react'

const PER_PAGE = 5

type ScriptRow = {
  id: string
  created_at: string
  hook_text: string | null
  problem: string | null
  solution: string | null
  cta: string | null
  visual_direction: string | null
  audio_cue: string | null
  content_items: { title: string | null; content_type: string | null } | { title: string | null; content_type: string | null }[] | null
}

const typeColors: Record<string, { bg: string; color: string }> = {
  Entertain:   { bg: 'rgba(167,139,250,0.12)', color: '#c4b5fd' },
  Softselling: { bg: 'rgba(96,165,250,0.12)',  color: '#93c5fd' },
  Edukasi:     { bg: 'rgba(52,211,153,0.12)',  color: '#6ee7b7' },
  Hardselling: { bg: 'rgba(251,113,133,0.12)', color: '#fda4af' },
  Trend:       { bg: 'rgba(251,191,36,0.12)',  color: '#fcd34d' },
}

const CONTENT_TYPES = ['Entertain', 'Softselling', 'Edukasi', 'Hardselling', 'Trend'] as const

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const { type, page: pageParam } = await searchParams
  const activeType = type ?? 'all'
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: scripts } = await db
    .from('scripts')
    .select('*, content_items(title, content_type)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (scripts ?? []) as ScriptRow[]

  const getItem = (s: ScriptRow) =>
    Array.isArray(s.content_items) ? s.content_items[0] : s.content_items

  const countByType = Object.fromEntries(
    CONTENT_TYPES.map(t => [t, rows.filter(s => getItem(s)?.content_type === t).length])
  )

  const filtered = activeType === 'all'
    ? rows
    : rows.filter(s => getItem(s)?.content_type === activeType)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  function pageUrl(p: number) {
    return `/dashboard/scripts?type=${activeType}&page=${p}`
  }

  const tabs = [
    { key: 'all', label: 'Semua', count: rows.length },
    ...CONTENT_TYPES.map(t => ({ key: t, label: t, count: countByType[t] })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">📝 Script Saya</h1>
          <p className="text-gray-400 text-sm mt-1">Semua script yang telah digenerate.</p>
        </div>
        <Link href="/dashboard/plans"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'rgba(167,139,250,0.1)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)' }}>
          Buat Script Baru <ChevronRight size={14} />
        </Link>
      </div>

      {!rows.length ? (
        <div className="bento-card py-20 text-center text-gray-500">
          <FileText size={40} className="mx-auto mb-4 opacity-20" />
          <p className="mb-3">Belum ada script.</p>
          <Link href="/dashboard/plans"
            className="text-sm px-4 py-2 rounded-lg inline-block"
            style={{ background: 'rgba(167,139,250,0.1)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)' }}>
            Pilih Content Plan →
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            <div className="bento-card p-4">
              <div className="text-2xl font-black text-white">{rows.length}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
            {CONTENT_TYPES.map(t => (
              <div key={t} className="bento-card p-4">
                <div className="text-2xl font-black" style={{ color: typeColors[t].color }}>{countByType[t]}</div>
                <div className="text-xs text-gray-500 mt-1">{t}</div>
              </div>
            ))}
          </div>

          {/* Filter Tabs — reset page to 1 on type change */}
          <div className="flex flex-wrap gap-2">
            {tabs.map(({ key, label, count }) => {
              const tc = key === 'all' ? null : typeColors[key]
              const isActive = activeType === key
              return (
                <Link
                  key={key}
                  href={`/dashboard/scripts?type=${key}&page=1`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={isActive
                    ? tc
                      ? { background: tc.bg, color: tc.color, border: `1px solid ${tc.color}40` }
                      : { background: 'rgba(255,255,255,0.08)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.15)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {label}
                  <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {count}
                  </span>
                </Link>
              )
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="bento-card py-12 text-center text-gray-500 text-sm">
              Belum ada script jenis {activeType}.
            </div>
          ) : (
            <>
              {/* Page info */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Menampilkan {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} dari {filtered.length} script
                </span>
                <span>Halaman {currentPage} / {totalPages}</span>
              </div>

              {/* Scripts List */}
              <div className="space-y-4">
                {paginated.map((script) => {
                  const item = getItem(script)
                  const tc = typeColors[item?.content_type ?? ''] ?? typeColors.Entertain

                  return (
                    <div key={script.id} className="bento-card p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-white leading-tight">{item?.title ?? 'Script'}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            {item?.content_type && (
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                                style={{ background: tc.bg, color: tc.color }}>
                                {item.content_type}
                              </span>
                            )}
                            <span className="text-xs text-gray-600">
                              {new Date(script.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        {[
                          { label: 'Hook (0-5 detik)', value: script.hook_text, accent: '#a78bfa' },
                          { label: 'Problem',           value: script.problem,   accent: '#fb7185' },
                          { label: 'Solusi / Produk',   value: script.solution,  accent: '#34d399' },
                          { label: 'Call to Action',    value: script.cta,       accent: '#60a5fa' },
                        ].map(({ label, value, accent }) => value ? (
                          <div key={label} className="p-3 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${accent}40` }}>
                            <div className="text-xs font-semibold mb-1" style={{ color: accent }}>{label}</div>
                            <div className="text-sm text-gray-300 leading-relaxed">{value}</div>
                          </div>
                        ) : null)}
                      </div>

                      {(script.visual_direction || script.audio_cue) && (
                        <div className="grid md:grid-cols-2 gap-3">
                          {script.visual_direction && (
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Visual Direction</div>
                              <div className="text-sm text-gray-400 leading-relaxed">{script.visual_direction}</div>
                            </div>
                          )}
                          {script.audio_cue && (
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Audio / Sound</div>
                              <div className="text-sm text-gray-400 leading-relaxed">{script.audio_cue}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {/* Prev */}
                  {currentPage > 1 ? (
                    <Link href={pageUrl(currentPage - 1)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all text-gray-400 hover:text-white"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <ChevronLeft size={15} />
                    </Link>
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center opacity-25 cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <ChevronLeft size={15} className="text-gray-600" />
                    </div>
                  )}

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    const isCurrentPage = p === currentPage
                    const nearCurrent = Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages
                    if (!nearCurrent) {
                      if (p === 2 && currentPage > 3) return <span key={p} className="text-gray-600 text-sm">…</span>
                      if (p === totalPages - 1 && currentPage < totalPages - 2) return <span key={p} className="text-gray-600 text-sm">…</span>
                      return null
                    }
                    return (
                      <Link key={p} href={pageUrl(p)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold transition-all"
                        style={isCurrentPage
                          ? { background: 'rgba(167,139,250,0.2)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.4)' }
                          : { background: 'rgba(255,255,255,0.04)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {p}
                      </Link>
                    )
                  })}

                  {/* Next */}
                  {currentPage < totalPages ? (
                    <Link href={pageUrl(currentPage + 1)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all text-gray-400 hover:text-white"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <ChevronRight size={15} />
                    </Link>
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center opacity-25 cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <ChevronRight size={15} className="text-gray-600" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
