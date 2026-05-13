'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f0f1a' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-black text-2xl gradient-text">✦ MR. PLANER</Link>
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
