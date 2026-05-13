import { createServiceClient } from '@/lib/supabase-server'
import { Users, Package, CalendarDays, FileText, ShieldCheck } from 'lucide-react'

type UserRow = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  plan_type: string | null
  created_at: string
}

export default async function AdminPage() {
  const service = createServiceClient()

  const [userCount, productCount, planCount, scriptCount, recentUsers] = await Promise.all([
    service.from('users').select('id', { count: 'exact', head: true }),
    service.from('products').select('id', { count: 'exact', head: true }),
    service.from('content_plans').select('id', { count: 'exact', head: true }),
    service.from('scripts').select('id', { count: 'exact', head: true }),
    service.from('users').select('id, full_name, email, role, plan_type, created_at').order('created_at', { ascending: false }).limit(20),
  ])

  const stats = [
    { label: 'Total User', value: userCount.count ?? 0, icon: Users, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
    { label: 'Total Produk', value: productCount.count ?? 0, icon: Package, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
    { label: 'Content Plan', value: planCount.count ?? 0, icon: CalendarDays, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
    { label: 'Script Dibuat', value: scriptCount.count ?? 0, icon: FileText, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  ]

  const users = (recentUsers.data ?? []) as UserRow[]

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck size={28} style={{ color: '#f59e0b' }} />
        <div>
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm">Overview sistem MR. PLANNER</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bento-card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div className="text-3xl font-black text-white">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bento-card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="font-bold text-white">User Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {['Nama', 'Email', 'Role', 'Plan', 'Bergabung'].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-white">{u.full_name ?? '—'}</td>
                  <td className="px-6 py-3.5 text-gray-400">{u.email ?? '—'}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={u.role === 'admin'
                        ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                      {u.role ?? 'user'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={u.plan_type === 'pro'
                        ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }
                        : { background: 'rgba(255,255,255,0.04)', color: '#6b7280' }}>
                      {u.plan_type ?? 'free'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
