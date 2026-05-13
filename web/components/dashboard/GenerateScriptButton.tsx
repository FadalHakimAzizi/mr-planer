'use client'

import { useState } from 'react'
import { Loader2, Wand2, ChevronDown, ChevronUp } from 'lucide-react'

type Script = {
  hook_text: string
  problem: string
  solution: string
  cta: string
  visual_direction: string
  audio_cue: string
}

export default function GenerateScriptButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false)
  const [script, setScript] = useState<Script | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal generate script')
      setScript(data.script)
      setOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  if (script) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
          style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}
        >
          <span>✓ Script Selesai</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {open && (
          <div className="p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
            {[
              { label: 'Hook (0-5 detik)', value: script.hook_text },
              { label: 'Problem / Pain Point', value: script.problem },
              { label: 'Solusi / Produk', value: script.solution },
              { label: 'Call to Action', value: script.cta },
              { label: 'Visual Direction', value: script.visual_direction },
              { label: 'Audio / Sound', value: script.audio_cue },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
                <div className="text-sm text-gray-300 leading-relaxed">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3">
      {error && (
        <div className="text-xs text-red-400 mb-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.15)' }}>
          {error}
        </div>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
        style={{ background: 'rgba(167,139,250,0.1)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)' }}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
        {loading ? 'Generating...' : 'Generate Script'}
      </button>
    </div>
  )
}
