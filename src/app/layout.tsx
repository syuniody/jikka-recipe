import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '実家の味 - Jikka Recipe',
  description: '親の料理を再現できる形で保存するサービス',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
