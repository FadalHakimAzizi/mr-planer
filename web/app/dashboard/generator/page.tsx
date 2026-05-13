'use client'

import { useState, useRef } from 'react'
import { Upload, Zap, ExternalLink, Loader2, X, Image, Type } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type GenerateResult = {
  spreadsheetUrl: string
  itemCount: number
  productName: string
}

type Mode = 'photo' | 'text'

export default function GeneratorPage() {
  const [mode, setMode] = useState<Mode>('photo')

  // Photo mode state
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  // Text mode state
  const [topic, setTopic] = useState('')
  const [targetMarket, setTargetMarket] = useState('')

  // Shared state
  const [duration, setDuration] = useState<7 | 30>(7)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(file: File | null) {
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setResult(null)
    setError('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFileChange(file)
  }

  function handleReset() {
    setPhoto(null)
    setPhotoPreview(null)
    setDescription('')
    setTopic('')
    setTargetMarket('')
    setResult(null)
    setError('')
  }

  async function handleGenerate() {
    if (mode === 'photo' && !photo) { setError('Upload foto dulu ya!'); return }
    if (mode === 'text' && !topic.trim()) { setError('Isi topik konten dulu ya!'); return }

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('mode', mode)
    formData.append('duration', String(duration))

    if (mode === 'photo') {
      formData.append('photo', photo!)
      formData.append('description', description)
    } else {
      formData.append('topic', topic)
      formData.append('target_market', targetMarket)
    }

    try {
      const res = await fetch('/api/generate-plan', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal generate')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = mode === 'photo' ? !!photo : !!topic.trim()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">⚡ Web Generator</h1>
        <p className="text-gray-400 text-sm mt-1">Buat content plan TikTok otomatis dengan AI.</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {([
          { key: 'photo', icon: Image, label: 'Foto Produk' },
          { key: 'text',  icon: Type,  label: 'Topik Bebas' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setResult(null); setError('') }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              mode === key ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            )}
            style={mode === key ? { background: 'rgba(167,139,250,0.2)', color: '#c4b5fd' } : {}}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-5">

          {mode === 'photo' ? (
            <>
              {/* Photo Upload */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">1. Foto Produk / Properti</Label>
                <div
                  className={cn('relative border-2 border-dashed rounded-xl transition-all cursor-pointer',
                    photoPreview ? 'border-purple-500/50' : 'border-white/10 hover:border-purple-500/30'
                  )}
                  style={{ minHeight: 180 }}
                  onClick={() => inputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {photoPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Preview" className="w-full rounded-xl object-contain max-h-48" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null) }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                        style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-44 gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                        <Upload size={20} style={{ color: '#a78bfa' }} />
                      </div>
                      <div className="text-sm text-gray-400">Drag & drop atau klik untuk upload</div>
                      <div className="text-xs text-gray-600">Produk, properti, makanan, dll · JPG PNG WEBP</div>
                    </div>
                  )}
                  <input ref={inputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">2. Info Tambahan <span className="text-gray-600">(opsional)</span></Label>
                <Textarea
                  placeholder="Harga, lokasi, keunggulan khusus, target pembeli..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none focus:border-purple-500"
                />
              </div>
            </>
          ) : (
            <>
              {/* Topic Input */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">1. Topik / Niche Konten</Label>
                <Textarea
                  placeholder={'Contoh:\n• Developer properti, rumah Type 45 di Serpong\n• Konten edukasi investasi saham untuk pemula\n• Review skincare lokal untuk kulit berminyak\n• Ide konten lifestyle mahasiswa hemat'}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={5}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none focus:border-purple-500"
                />
              </div>

              {/* Target Market */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">2. Target Market <span className="text-gray-600">(opsional)</span></Label>
                <Input
                  placeholder="Contoh: Keluarga muda usia 25-35, pasangan baru menikah"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500"
                />
              </div>
            </>
          )}

          {/* Duration */}
          <div>
            <Label className="text-gray-300 text-sm mb-2 block">{mode === 'photo' ? '3' : '3'}. Durasi Content Plan</Label>
            <div className="flex gap-3">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn('flex-1 py-3 rounded-xl text-sm font-bold transition-all border',
                    duration === d ? 'text-purple-300' : 'text-gray-400 hover:text-gray-200'
                  )}
                  style={duration === d
                    ? { background: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.4)' }
                    : { borderColor: 'rgba(255,255,255,0.08)', background: 'transparent' }}
                >
                  {d} Hari
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 px-3 py-2 rounded-lg" style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.2)' }}>
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 glow-primary"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Generating...</>
              : <><Zap size={18} /> Generate Content Plan</>}
          </button>
        </div>

        {/* Result Panel */}
        <div className="bento-card p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Hasil</h3>
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
              <Loader2 size={32} className="animate-spin" style={{ color: '#a78bfa' }} />
              <div className="text-sm text-center">
                <p className="font-medium text-white">AI sedang bekerja...</p>
                <p className="text-gray-500 mt-1">
                  {mode === 'photo' ? 'Menganalisis foto & ' : 'Memproses topik & '}
                  generating {duration} konten
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#34d399' }}>✓ Content Plan Selesai</div>
                <div className="text-2xl font-black text-white mt-1">{result.itemCount} Konten</div>
                <div className="text-sm text-gray-400 mt-1">{result.productName}</div>
              </div>

              {result.spreadsheetUrl ? (
                <a
                  href={result.spreadsheetUrl}
                  download
                  className="flex items-center justify-between w-full p-4 rounded-xl transition-all group"
                  style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📊</span>
                    <div>
                      <div className="text-sm font-semibold text-white">Download CSV</div>
                      <div className="text-xs text-gray-500">Buka dengan Google Sheets / Excel</div>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                </a>
              ) : (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-xs text-gray-500">Data tersimpan — buka Content Plan untuk lihat detail.</div>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Buat Plan Baru
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
              <div className="text-4xl">✦</div>
              <p className="text-sm text-center">
                {mode === 'photo'
                  ? 'Upload foto produk lalu klik Generate'
                  : 'Ketik topik konten lalu klik Generate'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
