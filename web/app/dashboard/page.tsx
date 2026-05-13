import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import {
  Package, CalendarDays, FileText, Zap, ArrowRight,
  TrendingUp, CheckCircle2, Clock, Activity, Flame,
  Image, Type,
} from 'lucide-react'

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '⟳ Berjalan' },
  done:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: '✓ Selesai' },
  error:   { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', label: '✗ Error' },
}

const actionLabel: Record<string, { icon: string; text: (m: Record<string, string>) => string }> = {
  generate_content_plan: { icon: '📅', text: m => `Generate plan · ${m.product_name ?? ''}` },
  generate_script:       { icon: '📝', text: m => `Generate script · ${m.title ?? ''}` },
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    profileRes,
    prodRes, planRes, scriptRes,
    recentPlansRes,
    activityRes,
  ] = await Promise.all([
    db.from('users').select('full_name, plan_type').eq('id', user.id).single(),
    db.from('products').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    db.from('content_plans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    db.from('scripts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    db.from('content_plans')
      .select('id, created_at, duration_days, status, products(name, image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
    db.from('activity_logs')
      .select('id, action, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const profile     = profileRes.data
  const prodCount   = prodRes.count ?? 0
  const planCount   = planRes.count ?? 0
  const scriptCount = scriptRes.count ?? 0
  const recentPlans = recentPlansRes.data ?? []
  const activities  = activityRes.data ?? []

  // Get user's plan IDs to correctly filter content_items
  const { data: userPlans } = await db.from('content_plans').select('id').eq('user_id', user.id)
  const planIds = userPlans?.map(p => p.id) ?? []

  // Get user's product IDs for keywords
  const { data: userProducts } = await db.from('products').select('id').eq('user_id', user.id)
  const productIds = userProducts?.map(p => p.id) ?? []

  // Content items count — filtered by user's plan IDs
  let doneItems = 0, pendingItems = 0
  let upcoming: { id: string; title: string; post_date: string; content_type: string; plan_id: string }[] = []
  if (planIds.length > 0) {
    const [doneRes, pendingRes, upcomingRes] = await Promise.all([
      db.from('content_items').select('id', { count: 'exact', head: true }).eq('status', 'done').in('plan_id', planIds),
      db.from('content_items').select('id', { count: 'exact', head: true }).eq('status', 'pending').in('plan_id', planIds),
      db.from('content_items')
        .select('id, title, post_date, content_type, plan_id')
        .eq('status', 'pending')
        .in('plan_id', planIds)
        .gte('post_date', today)
        .lte('post_date', nextWeek)
        .order('post_date', { ascending: true })
        .limit(5),
    ])
    doneItems    = doneRes.count ?? 0
    pendingItems = pendingRes.count ?? 0
    upcoming     = upcomingRes.data ?? []
  }

  const totalItems = doneItems + pendingItems

  // Keywords — filtered by user's product IDs
  let kwCount = 0
  let topKeywords: { keyword: string; trend_score: number | null }[] = []
  if (productIds.length > 0) {
    const [kwCountRes, tkRes] = await Promise.all([
      db.from('keywords').select('id', { count: 'exact', head: true }).in('product_id', productIds),
      db.from('keywords').select('keyword, trend_score').in('product_id', productIds).order('trend_score', { ascending: false }).limit(5),
    ])
    kwCount      = kwCountRes.count ?? 0
    topKeywords  = tkRes.data ?? []
  }

  const typeColors: Record<string, { bg: string; color: string }> = {
    Entertain:   { bg: 'rgba(167,139,250,0.12)', color: '#c4b5fd' },
    Softselling: { bg: 'rgba(96,165,250,0.12)',  color: '#93c5fd' },
    Edukasi:     { bg: 'rgba(52,211,153,0.12)',  color: '#6ee7b7' },
    Hardselling: { bg: 'rgba(251,113,133,0.12)', color: '#fda4af' },
    Trend:       { bg: 'rgba(251,191,36,0.12)',  color: '#fcd34d' },
  }

  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            Halo, <span className="gradient-text">{profile?.full_name?.split(' ')[0] ?? 'Affiliator'}</span> 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">Siap bikin konten viral hari ini?</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/generator?mode=text"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
            <Type size={15} /> Topik Teks
          </Link>
          <Link href="/dashboard/generator"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white glow-primary"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <Zap size={15} /> Generate Plan
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Produk', value: prodCount, icon: Package, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', href: '/dashboard/products' },
          { label: 'Content Plan', value: planCount, icon: CalendarDays, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', href: '/dashboard/plans' },
          { label: 'Script', value: scriptCount, icon: FileText, color: '#34d399', bg: 'rgba(52,211,153,0.1)', href: '/dashboard/scripts' },
          { label: 'Keywords', value: kwCount, icon: TrendingUp, color: '#fb7185', bg: 'rgba(251,113,133,0.1)', href: '/dashboard/keywords' },
        ].map(s => (
          <Link key={s.label} href={s.href}
            className="bento-card p-5 flex items-center gap-4 group transition-all hover:border-white/10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: s.bg }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Overall Progress */}
      {totalItems > 0 && (
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} style={{ color: '#34d399' }} />
              <span className="text-sm font-semibold text-white">Progress Konten Keseluruhan</span>
            </div>
            <span className="text-sm font-black" style={{ color: '#34d399' }}>{progressPct}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #34d399, #6ee7b7)' }} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span style={{ color: '#34d399' }}>✓ {doneItems} selesai</span>
            <span>· {pendingItems} menunggu ·</span>
            <span>{totalItems} total konten</span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Left: Recent Plans */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Plan Terbaru</h2>
            <Link href="/dashboard/plans"
              className="text-xs text-gray-500 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Lihat semua <ArrowRight size={11} />
            </Link>
          </div>

          {recentPlans.length === 0 ? (
            <div className="bento-card py-10 text-center text-gray-500">
              <CalendarDays size={28} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada plan.</p>
              <Link href="/dashboard/generator" className="text-xs mt-1 inline-block" style={{ color: '#a78bfa' }}>Buat sekarang →</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPlans.map((plan) => {
                const st = statusStyles[plan.status] ?? statusStyles.pending
                const product = (Array.isArray(plan.products) ? plan.products[0] : plan.products) as { name: string; image_url: string | null } | null
                const isPhoto = !!product?.image_url

                return (
                  <Link key={plan.id} href={`/dashboard/plans/${plan.id}`}
                    className="bento-card p-4 flex items-center gap-4 group hover:border-white/10 transition-all">
                    {/* Thumbnail */}
                    {isPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product!.image_url!} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0"
                        style={{ background: 'rgba(255,255,255,0.04)' }} />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
                        <Type size={16} style={{ color: '#60a5fa' }} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate group-hover:text-purple-300 transition-colors">
                        {product?.name ?? 'Content Plan'}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{plan.duration_days} hari</span>
                        <span>·</span>
                        <span>{new Date(plan.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        <span>·</span>
                        <span style={{ color: isPhoto ? '#a78bfa' : '#60a5fa' }}>
                          {isPhoto ? '📷 Foto' : '✍️ Teks'}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Upcoming Content */}
          {upcoming.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <h2 className="font-bold text-white">Konten Mendatang <span className="text-gray-500 font-normal text-sm">(7 hari ke depan)</span></h2>
                </div>
                <Link href="/dashboard/plans"
                  className="text-xs text-gray-500 hover:text-purple-300 flex items-center gap-1 transition-colors">
                  Lihat semua <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-2">
                {upcoming.map((item) => {
                  const tc = typeColors[item.content_type] ?? typeColors.Entertain
                  const isToday = item.post_date === today
                  return (
                    <Link key={item.id} href={`/dashboard/plans/${item.plan_id}`}
                      className="bento-card px-4 py-3 flex items-center gap-3 group hover:border-white/10 transition-all">
                      <div className="text-center shrink-0 w-10">
                        <div className="text-xs font-black" style={{ color: isToday ? '#34d399' : '#a78bfa' }}>
                          {isToday ? 'HARI\nINI' : new Date(item.post_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div className="w-px h-8 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: tc.bg, color: tc.color }}>
                        {item.content_type}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity + Keywords */}
        <div className="space-y-4">

          {/* Activity Feed */}
          <div className="bento-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <Activity size={13} className="text-gray-400" />
              <h2 className="text-sm font-bold text-white">Aktivitas</h2>
            </div>
            {activities.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-600 text-xs">Belum ada aktivitas.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {activities.map((log) => {
                  const meta = (log.metadata ?? {}) as Record<string, string>
                  const action = actionLabel[log.action] ?? { icon: '•', text: () => log.action }
                  return (
                    <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                      <span className="text-base shrink-0 mt-0.5">{action.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs text-gray-300 leading-snug truncate">{action.text(meta)}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top Keywords */}
          {topKeywords.length > 0 && (
            <div className="bento-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <Flame size={13} style={{ color: '#fb7185' }} />
                  <h2 className="text-sm font-bold text-white">Top Keywords</h2>
                </div>
                <Link href="/dashboard/keywords"
                  className="text-xs text-gray-500 hover:text-purple-300 transition-colors flex items-center gap-1">
                  Semua <ArrowRight size={11} />
                </Link>
              </div>
              <div className="p-4 space-y-3">
                {topKeywords.map((kw, i) => {
                  const score = kw.trend_score ?? 0
                  const pct = Math.min(100, (score / 5000) * 100)
                  const color = score >= 5000 ? '#fb7185' : score >= 500 ? '#34d399' : '#fcd34d'
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-300 truncate">{kw.keyword}</span>
                        <span className="text-xs font-semibold shrink-0" style={{ color }}>
                          {score >= 5000 ? '🔥' : score >= 500 ? `+${score}%` : score}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bento-card p-4 space-y-2">
            <h2 className="text-sm font-bold text-white mb-3">Aksi Cepat</h2>
            {[
              { href: '/dashboard/generator', icon: Image, label: 'Generate dari Foto', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
              { href: '/dashboard/generator?mode=text', icon: Type, label: 'Generate dari Teks', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
              { href: '/dashboard/plans', icon: CalendarDays, label: 'Lihat Content Plan', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
              { href: '/dashboard/keywords', icon: TrendingUp, label: 'Cek Trending Keywords', color: '#fb7185', bg: 'rgba(251,113,133,0.1)' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all group"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: a.bg }}>
                  <a.icon size={13} style={{ color: a.color }} />
                </div>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{a.label}</span>
                <ArrowRight size={11} className="text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
