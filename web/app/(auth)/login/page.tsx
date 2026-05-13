'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function translateAuthError(message: string): { text: string; needsVerify: boolean } {
  const m = message.toLowerCase()
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return { text: 'Email kamu belum terverifikasi. Cek inbox/spam untuk link verifikasi.', needsVerify: true }
  }
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return { text: 'Email atau password salah.', needsVerify: false }
  }
  if (m.includes('rate limit')) {
    return { text: 'Terlalu banyak percobaan login. Coba lagi beberapa menit.', needsVerify: false }
  }
  return { text: message, needsVerify: false }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNeedsVerify(false)
    setResendSuccess(false)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const t = translateAuthError(error.message)
      setError(t.text)
      setNeedsVerify(t.needsVerify)
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  async function handleResend() {
    setResending(true)
    setResendSuccess(false)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (!error) setResendSuccess(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f0f1a' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-black text-2xl gradient-text">✦ MR. PLANNER</Link>
          <p className="text-gray-400 mt-2 text-sm">Masuk ke akun kamu</p>
        </div>

        <div className="bento-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500"
              />
            </div>

            {error && (
              <div className="text-sm text-red-300 px-3 py-3 rounded-lg space-y-2" style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.2)' }}>
                <div>{error}</div>
                {needsVerify && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || resendSuccess}
                    className="text-xs font-semibold underline disabled:opacity-50"
                    style={{ color: '#fda4af' }}
                  >
                    {resending ? 'Mengirim ulang...' : resendSuccess ? '✓ Email verifikasi sudah dikirim ulang' : 'Kirim ulang email verifikasi'}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 glow-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{' '}
            <Link href="/register" className="font-semibold" style={{ color: '#a78bfa' }}>Daftar gratis</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
