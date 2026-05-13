'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, CalendarDays, FileText, Zap, LogOut, ShieldCheck, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/generator', icon: Zap, label: 'Generator' },
  { href: '/dashboard/products', icon: Package, label: 'Produk' },
  { href: '/dashboard/plans', icon: CalendarDays, label: 'Content Plan' },
  { href: '/dashboard/scripts', icon: FileText, label: 'Script' },
  { href: '/dashboard/keywords', icon: TrendingUp, label: 'Keywords' },
]

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen border-r py-6 px-3 shrink-0"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <Link href="/" className="font-black text-base gradient-text px-3 mb-8 block">✦ MR. PLANNER</Link>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'text-purple-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
              style={active ? { background: 'rgba(167,139,250,0.12)', color: '#c4b5fd' } : {}}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}

        {role === 'admin' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mt-2',
              pathname.startsWith('/admin')
                ? 'text-amber-300'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
            style={pathname.startsWith('/admin') ? { background: 'rgba(245,158,11,0.12)' } : {}}
          >
            <ShieldCheck size={16} />
            Admin
          </Link>
        )}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all mt-4"
      >
        <LogOut size={16} />
        Keluar
      </button>
    </aside>
  )
}
