import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'MR. PLANNER — AI Content Planner untuk TikTok Affiliator',
  description:
    'Upload foto produk → AI analisis → Content plan 30 hari + script siap produksi. Otomatis, cepat, dan terstruktur.',
  keywords: ['tiktok affiliator', 'content plan', 'AI content planner', 'script tiktok', 'affiliasi'],
  openGraph: {
    title: 'MR. PLANNER',
    description: 'AI Content Planner untuk TikTok Affiliator Indonesia',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
