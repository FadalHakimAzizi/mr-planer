import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Package, Plus, Tag, Image, Type, LayoutList, CalendarDays, Zap } from 'lucide-react'

type ModeFilter = 'all' | 'photo' | 'text'

export default async function ProductsPage({
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
  const { data: rawProducts } = await db
    .from('products')
    .select('*, content_plans(id), pain_points, competitor_angles')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const products = (rawProducts ?? []).map(p => ({
    ...p,
    isPhoto: !!p.image_url,
    planCount: Array.isArray(p.content_plans) ? p.content_plans.length : 0,
    selling_points: Array.isArray(p.selling_points) ? p.selling_points as string[] : [],
    pain_points: Array.isArray(p.pain_points) ? p.pain_points as string[] : [],
    competitor_angles: Array.isArray(p.competitor_angles) ? p.competitor_angles as string[] : [],
  }))

  const photoProducts = products.filter(p => p.isPhoto)
  const textProducts  = products.filter(p => !p.isPhoto)

  const filtered = activeMode === 'photo' ? photoProducts
    : activeMode === 'text' ? textProducts
    : products

  const tabs = [
    { key: 'all'   as ModeFilter, icon: LayoutList, label: 'Semua', count: products.length },
    { key: 'photo' as ModeFilter, icon: Image,      label: 'Foto',  count: photoProducts.length },
    { key: 'text'  as ModeFilter, icon: Type,       label: 'Teks',  count: textProducts.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">📦 Produk Saya</h1>
          <p className="text-gray-400 text-sm mt-1">Produk yang telah dianalisis AI.</p>
        </div>
        <Link href="/dashboard/generator"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white glow-primary"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Plus size={16} /> Analyze Produk
        </Link>
      </div>

      {/* Stats */}
      {products.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bento-card p-4">
            <div className="text-2xl font-black text-white">{products.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Produk</div>
          </div>
          <div className="bento-card p-4">
            <div className="text-2xl font-black" style={{ color: '#a78bfa' }}>{photoProducts.length}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Image size={10} /> Dari Foto
            </div>
          </div>
          <div className="bento-card p-4">
            <div className="text-2xl font-black" style={{ color: '#60a5fa' }}>{textProducts.length}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Type size={10} /> Dari Teks
            </div>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="bento-card py-20 text-center text-gray-500">
          <Package size={40} className="mx-auto mb-4 opacity-20" />
          <p>Belum ada produk. Upload foto atau ketik topik untuk mulai.</p>
          <Link href="/dashboard/generator" className="text-sm mt-3 inline-block px-4 py-2 rounded-lg"
            style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
            Analyze Produk →
          </Link>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {tabs.map(({ key, icon: Icon, label, count }) => (
              <Link
                key={key}
                href={`/dashboard/products?mode=${key}`}
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
                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {count}
                </span>
              </Link>
            ))}
          </div>

          {/* Empty filtered state */}
          {filtered.length === 0 ? (
            <div className="bento-card py-16 text-center text-gray-500">
              {activeMode === 'photo' ? 'Belum ada produk dari foto.' : 'Belum ada produk dari teks.'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((product) => (
                <div key={product.id} className="bento-card p-5 flex flex-col gap-3">

                  {/* Thumbnail / Icon */}
                  {product.isPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-36 object-contain rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    />
                  ) : (
                    <div className="w-full h-36 rounded-lg flex flex-col items-center justify-center gap-2"
                      style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.12)' }}>
                      <Type size={28} style={{ color: '#60a5fa', opacity: 0.6 }} />
                      <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>Topik Teks</span>
                    </div>
                  )}

                  {/* Name + mode badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white leading-tight">{product.name}</h3>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                        style={product.isPhoto
                          ? { background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }
                          : { background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                        {product.isPhoto ? '📷' : '✍️'}
                      </span>
                    </div>
                    {product.target_market && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                        <Tag size={11} />
                        <span className="truncate">{product.target_market}</span>
                      </div>
                    )}
                  </div>

                  {/* Selling points */}
                  {product.selling_points.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.selling_points.slice(0, 3).map((p: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(167,139,250,0.08)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.15)' }}>
                          {p}
                        </span>
                      ))}
                      {product.selling_points.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-gray-500"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          +{product.selling_points.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pain points */}
                  {product.pain_points.length > 0 && (
                    <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Pain Points</div>
                      <div className="space-y-1">
                        {product.pain_points.slice(0, 2).map((p: string, i: number) => (
                          <div key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                            <span style={{ color: '#fb7185' }}>•</span>
                            <span className="leading-relaxed">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-2"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <CalendarDays size={11} />
                      {new Date(product.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {product.planCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                          {product.planCount} plan
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/generator`}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all"
                      style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)' }}
                    >
                      <Zap size={11} /> Buat Plan
                    </Link>
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
