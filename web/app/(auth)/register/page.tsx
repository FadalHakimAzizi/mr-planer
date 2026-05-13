'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // If session is null, email confirmation required
    if (!data.session) {
      setSubmittedEmail(email)
      setLoading(false)
      return
    }
    // Session active (auto-confirm enabled) → go to dashboard
    window.location.href = '/dashboard'
  }

  if (submittedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f0f1a' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="font-black text-2xl gradient-text">✦ MR. PLANNER</Link>
          </div>
          <div className="bento-card p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(52,211,153,0.15)' }}>
              ✉️
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Cek email kamu</h1>
            <p className="text-sm text-gray-400 mb-6">
              Kami sudah kirim link verifikasi ke<br />
              <span className="text-purple-300 font-semibold">{submittedEmail}</span>
            </p>
            <div className="text-xs text-gray-500 mb-6 px-3 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              Klik link di email untuk aktifkan akun. Setelah itu kamu bisa langsung login.
              <br /><br />
              Tidak menemukan email? Cek folder <strong>Spam</strong> atau <strong>Promotions</strong>.
            </div>
            <Link
              href="/login"
              className="inline-block w-full py-3 rounded-xl font-bold text-white transition-all glow-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              Ke Halaman Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f0f1a' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-black text-2xl gradient-text">✦ MR. PLANNER</Link>
          <p className="text-gray-400 mt-2 text-sm">Buat akun gratis</p>
        </div>

        <div className="bento-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-300 text-sm">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nama kamu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="kamu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 px-3 py-2 rounded-lg" style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.2)' }}>
                {error}
              </div>
            )}

            <div className="text-xs text-gray-500 px-3 py-2 rounded-lg" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
              ℹ️ Setelah daftar, kamu perlu <strong>verifikasi email</strong> dulu sebelum bisa login.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 glow-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              {loading ? 'Mendaftar...' : 'Daftar Gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold" style={{ color: '#a78bfa' }}>Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
