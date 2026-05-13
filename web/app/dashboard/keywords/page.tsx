import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { TrendingUp, Zap, LayoutList, Flame, ArrowUpRight, BarChart2 } from 'lucide-react'

type KeywordRow = {
  id: string
  keyword: string
  trend_score: number | null
  region: string
  fetched_at: string
  products: { id: string; name: string } | null
}

type TierFilter = 'all' | 'breakout' | 'rising' | 'top'

function getTier(score: number | null): TierFilter {
  if ((score ?? 0) >= 5000) return 'breakout'
  if ((score ?? 0) >= 500)  return 'rising'
  return 'top'
}

function TrendBadge({ score }: { score: number | null }) {
  const tier = getTier(score)
  if (tier === 'breakout') return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: 'rgba(251,113,133,0.15)', color: '#fb7185', border: '1px solid rgba(251,113,133,0.25)' }}>
      🔥 Breakout
    </span>
  )
  if (tier === 'rising') return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
      ↑ {(score ?? 0) >= 1000 ? Math.round((score ?? 0) / 100) + 'x' : '+' + score + '%'}
    </span>
  )
  return (
    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: 'rgba(251,191,36,0.08)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.15)' }}>
      {score ?? 0}
    </span>
  )
}

function ScoreBar({ score }: { score: number | null }) {
  const pct = Math.min(100, ((score ?? 0) / 5000) * 100)
  const tier = getTier(score)
  const color = tier === 'breakout' ? '#fb7185' : tier === 'rising' ? '#34d399' : '#fcd34d'
  return (
    <div className="h-1 rounded-full overflow-hidden w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; product?: string }>
}) {
  const { tier, product: productFilter } = await searchParams
  const activeTier = (['all', 'breakout', 'rising', 'top'].includes(tier ?? '') ? tier : 'all') as TierFilter

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const { data: userProducts } = await db
    .from('products')
    .select('id, name')
    .eq('user_id', user.id)

  const productIds = userProducts?.map(p => p.id) ?? []

  const { data: rawKeywords } = productIds.length > 0
    ? await db
        .from('keywords')
        .select('*, products(id, name)')
        .in('product_id', productIds)
        .order('trend_score', { ascending: false })
    : { data: null }

  const keywords = (rawKeywords ?? []) as KeywordRow[]

  // Counts per tier
  const breakoutCount = keywords.filter(k => getTier(k.trend_score) === 'breakout').length
  const risingCount   = keywords.filter(k => getTier(k.trend_score) === 'rising').length
  const topCount      = keywords.filter(k => getTier(k.trend_score) === 'top').length

  // Group by product
  const grouped = new Map<string, { productName: string; keywords: KeywordRow[] }>()
  for (const kw of keywords) {
    const pid = kw.products?.id ?? 'unknown'
    const name = kw.products?.name ?? 'Produk'
    if (!grouped.has(pid)) grouped.set(pid, { productName: name, keywords: [] })
    grouped.get(pid)!.keywords.push(kw)
  }

  const productList = Array.from(grouped.entries()).map(([pid, { productName, keywords: kws }]) => ({
    pid, productName, keywords: kws,
  }))

  // Apply filters
  const filterByTier = (kws: KeywordRow[]) =>
    activeTier === 'all' ? kws : kws.filter(k => getTier(k.trend_score) === activeTier)

  const filterByProduct = (list: typeof productList) =>
    productFilter ? list.filter(p => p.pid === productFilter) : list

  const visibleProducts = filterByProduct(productList)
    .map(p => ({ ...p, keywords: filterByTier(p.keywords) }))
    .filter(p => p.keywords.length > 0)

  const tierTabs = [
    { key: 'all'      as TierFilter, icon: LayoutList,   label: 'Semua',   count: keywords.length,  color: '' },
    { key: 'breakout' as TierFilter, icon: Flame,        label: 'Breakout', count: breakoutCount,    color: '#fb7185' },
    { key: 'rising'   as TierFilter, icon: ArrowUpRight, label: 'Rising',   count: risingCount,      color: '#34d399' },
    { key: 'top'      as TierFilter, icon: BarChart2,    label: 'Top',      count: topCount,         color: '#fcd34d' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">📈 Trending Keywords</h1>
          <p className="text-gray-400 text-sm mt-1">Data Google Trends · Region: Indonesia</p>
        </div>
        <Link href="/dashboard/generator"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
          <Zap size={14} /> Generate Plan Baru
        </Link>
      </div>

      {keywords.length === 0 ? (
        <div className="bento-card py-20 text-center text-gray-500">
          <TrendingUp size={40} className="mx-auto mb-4 opacity-20" />
          <p className="mb-1">Belum ada data trending.</p>
          <p className="text-xs text-gray-600 mb-4">Data otomatis terisi saat kamu generate Content Plan.</p>
          <Link href="/dashboard/generator"
            className="text-sm px-4 py-2 rounded-lg inline-block"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
            Generate Plan Sekarang →
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bento-card p-4">
              <div className="text-2xl font-black text-white">{keywords.length}</div>
              <div className="text-xs text-gray-500 mt-1">Total Keywords</div>
            </div>
            <div className="bento-card p-4">
              <div className="text-2xl font-black" style={{ color: '#fb7185' }}>{breakoutCount}</div>
              <div className="text-xs text-gray-500 mt-1">🔥 Breakout</div>
            </div>
            <div className="bento-card p-4">
              <div className="text-2xl font-black" style={{ color: '#34d399' }}>{risingCount}</div>
              <div className="text-xs text-gray-500 mt-1">↑ Rising</div>
            </div>
            <div className="bento-card p-4">
              <div className="text-2xl font-black" style={{ color: '#fcd34d' }}>{grouped.size}</div>
              <div className="text-xs text-gray-500 mt-1">Produk</div>
            </div>
          </div>

          {/* Tier Filter */}
          <div className="flex flex-wrap gap-2">
            {tierTabs.map(({ key, icon: Icon, label, count, color }) => (
              <Link
                key={key}
                href={`/dashboard/keywords?tier=${key}${productFilter ? `&product=${productFilter}` : ''}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={activeTier === key
                  ? color
                    ? { background: `${color}18`, color, border: `1px solid ${color}40` }
                    : { background: 'rgba(255,255,255,0.08)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.15)' }
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

          {/* Product Filter Pills */}
          {productList.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-600">Produk:</span>
              <Link
                href={`/dashboard/keywords?tier=${activeTier}`}
                className="text-xs px-2.5 py-1 rounded-full transition-all"
                style={!productFilter
                  ? { background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Semua
              </Link>
              {productList.map(({ pid, productName }) => (
                <Link
                  key={pid}
                  href={`/dashboard/keywords?tier=${activeTier}&product=${pid}`}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={productFilter === pid
                    ? { background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {productName.length > 20 ? productName.slice(0, 20) + '…' : productName}
                </Link>
              ))}
            </div>
          )}

          {/* Keywords grouped by product */}
          {visibleProducts.length === 0 ? (
            <div className="bento-card py-12 text-center text-gray-500 text-sm">
              Tidak ada keyword untuk filter yang dipilih.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleProducts.map(({ pid, productName, keywords: kws }) => (
                <div key={pid} className="bento-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#a78bfa' }} />
                    <h2 className="font-bold text-white text-sm truncate">{productName}</h2>
                    <span className="text-xs text-gray-600 ml-auto shrink-0">{kws.length} keywords</span>
                  </div>

                  <div className="space-y-2.5">
                    {kws.map(kw => (
                      <div key={kw.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-300 font-medium truncate">{kw.keyword}</span>
                          <TrendBadge score={kw.trend_score} />
                        </div>
                        <ScoreBar score={kw.trend_score} />
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-gray-700 mt-4">
                    Diperbarui: {new Date(kws[0]?.fetched_at ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
