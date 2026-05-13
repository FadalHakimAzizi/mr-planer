'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Trash2, Loader2 } from 'lucide-react'

export default function PlanActions({
  planId,
  status,
}: {
  planId: string
  status: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<'status' | 'delete' | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const isDone = status === 'done'

  async function toggleStatus() {
    setLoading('status')
    await fetch(`/api/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isDone ? 'pending' : 'done' }),
    })
    router.refresh()
    setLoading(null)
  }

  async function handleDelete() {
    setLoading('delete')
    await fetch(`/api/plans/${planId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(null)
    setShowConfirm(false)
  }

  return (
    <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={toggleStatus}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
        style={isDone
          ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
          : { background: 'rgba(255,255,255,0.04)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {loading === 'status'
          ? <Loader2 size={12} className="animate-spin" />
          : isDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
        {isDone ? 'Selesai' : 'Tandai Selesai'}
      </button>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ml-auto"
          style={{ background: 'rgba(251,113,133,0.06)', color: '#f87171', border: '1px solid rgba(251,113,133,0.15)' }}
        >
          <Trash2 size={12} /> Hapus
        </button>
      ) : (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">Hapus plan ini?</span>
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="px-2.5 py-1 rounded-lg text-xs font-bold disabled:opacity-40"
            style={{ background: 'rgba(251,113,133,0.15)', color: '#fb7185', border: '1px solid rgba(251,113,133,0.3)' }}
          >
            {loading === 'delete' ? <Loader2 size={12} className="animate-spin inline" /> : 'Ya, hapus'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Batal
          </button>
        </div>
      )}
    </div>
  )
}
