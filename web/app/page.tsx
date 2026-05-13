import Link from 'next/link'
import { ArrowRight, Zap, BarChart3, FileText, TrendingUp, Star, CheckCircle } from 'lucide-react'

const features = [
  { icon: '📸', title: 'Analisis Produk AI', desc: 'Upload foto produk, AI langsung identifikasi nama, keunggulan, dan target market.', color: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)' },
  { icon: '📅', title: 'Content Plan Otomatis', desc: '7 atau 30 hari konten terstruktur dengan hook, caption, dan hashtag siap pakai.', color: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)' },
  { icon: '📝', title: 'Script Generator', desc: 'Script video lengkap: hook, problem, solusi, CTA, visual direction, dan audio cue.', color: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
  { icon: '📈', title: 'Google Trends', desc: 'Keyword konten diambil dari tren terkini, bukan asal tebak.', color: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  { icon: '📊', title: 'Google Spreadsheet', desc: 'Output content plan rapi di Google Sheets, langsung bisa dipakai tim.', color: 'rgba(251,113,133,0.15)', border: 'rgba(251,113,133,0.3)' },
  { icon: '🤖', title: 'Telegram Bot', desc: 'Akses semua fitur langsung dari Telegram — tanpa buka laptop sekalipun.', color: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)' },
]

const steps = [
  { num: '01', title: 'Upload Foto Produk', desc: 'Kirim foto + deskripsi opsional ke bot atau web generator.' },
  { num: '02', title: 'AI Analisis & Generate', desc: 'AI identifikasi produk, ambil tren, buat content plan + script lengkap.' },
  { num: '03', title: 'Output Siap Produksi', desc: 'Terima link Google Spreadsheet dan Docs, langsung mulai bikin konten.' },
]

const stats = [
  { value: '30x', label: 'Lebih cepat dari manual' },
  { value: '100%', label: 'AI-powered planning' },
  { value: '7/30', label: 'Hari content plan' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a' }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'rgba(15,15,26,0.8)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-black text-lg tracking-tight gradient-text">✦ MR. PLANNER</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Fitur</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Cara Kerja</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Masuk</Link>
            <Link
              href="/register"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all glow-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}
            >
              Coba Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>
            <Zap size={12} />
            AI Content Planner untuk TikTok Affiliator Indonesia
          </div>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 text-white">
            Ubah Produk Jadi{' '}
            <span className="gradient-text">Konten Viral</span>{' '}
            Otomatis
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload foto produk → AI analisis → Content plan 30 hari + script siap produksi.
            Hemat waktu, tingkatkan konsistensi posting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all glow-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              Mulai Gratis Sekarang <ArrowRight size={18} />
            </Link>
            <Link
              href="/dashboard/generator"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
            >
              Lihat Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid Preview */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bento-card p-5 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Content Plan</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>✓ Selesai</span>
              </div>
              <div className="text-3xl font-black text-white mb-1">30 Konten <span className="gradient-text">✦</span></div>
              <div className="text-sm text-gray-500">Powerbank Baseus · Mei 2026</div>
            </div>
            <div className="bento-card p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Trending</div>
              <TrendingUp size={24} className="mb-2" style={{ color: '#34d399' }} />
              <div className="text-2xl font-black" style={{ color: '#34d399' }}>↑ 89%</div>
              <div className="text-xs text-gray-500 mt-1">vs minggu lalu</div>
            </div>
            <div className="bento-card p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Script</div>
              <FileText size={24} className="mb-2" style={{ color: '#60a5fa' }} />
              <div className="text-2xl font-black text-white">Siap</div>
              <div className="text-xs text-gray-500 mt-1">Google Docs</div>
            </div>
            <div className="bento-card p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Hashtag</div>
              <div className="text-lg font-bold" style={{ color: '#a78bfa' }}>#Viral</div>
              <div className="text-xs text-gray-500 mt-1">#TikTokShop</div>
            </div>
            <div className="bento-card p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Google Trends</div>
              <BarChart3 size={24} className="mb-2" style={{ color: '#f59e0b' }} />
              <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>✦ Hot</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6">
          {stats.map((s) => (
            <div key={s.value} className="text-center bento-card py-8 px-4">
              <div className="text-4xl font-black gradient-text mb-2">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>Fitur Lengkap</div>
            <h2 className="text-3xl font-black text-white">Semua yang Kamu Butuhkan</h2>
            <p className="text-gray-400 mt-3">Satu platform, dari analisis produk sampai script siap shoot.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bento-card p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{ background: f.color, border: `1px solid ${f.border}` }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>Cara Kerja</div>
            <h2 className="text-3xl font-black text-white">3 Langkah Sederhana</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="bento-card p-6">
                <div className="text-4xl font-black gradient-text mb-4">{s.num}</div>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto text-center bento-card py-16 px-8">
          <Star size={32} className="mx-auto mb-6" style={{ color: '#a78bfa' }} />
          <h2 className="text-3xl font-black text-white mb-4">Mulai Bikin Konten Lebih Cerdas</h2>
          <p className="text-gray-400 mb-8">Daftar gratis, tidak perlu kartu kredit.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white glow-primary"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            Daftar Sekarang <ArrowRight size={18} />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-500">
            {['Gratis untuk mulai', 'Tanpa kartu kredit', 'Setup dalam menit'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={14} style={{ color: '#34d399' }} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-black gradient-text">✦ MR. PLANNER</span>
          <p className="text-xs text-gray-500">© 2026 MR. PLANNER. AI Content Planning untuk Affiliator TikTok.</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privasi</a>
            <a href="#" className="hover:text-white transition-colors">Syarat</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
