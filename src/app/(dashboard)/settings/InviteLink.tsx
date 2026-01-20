'use client'

import { useState } from 'react'

export function InviteLink({ familySpaceId }: { familySpaceId: string }) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateLink = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familySpaceId }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate invitation')
      }

      const data = await res.json()
      setInviteUrl(data.url)
    } catch {
      setError('招待リンクの生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = inviteUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareViaLine = () => {
    if (!inviteUrl) return
    const text = `実家の味アプリに招待します！\n以下のリンクから参加してください：\n${inviteUrl}`
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`
    window.open(lineUrl, '_blank')
  }

  if (!inviteUrl) {
    return (
      <div>
        <button
          onClick={generateLink}
          disabled={loading}
          className="w-full py-3 px-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : '招待リンクを発行'}
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm text-gray-700 break-all">{inviteUrl}</p>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={copyToClipboard}
          className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
        >
          {copied ? '✓ コピーしました' : 'コピー'}
        </button>
        <button
          onClick={shareViaLine}
          className="flex-1 py-2 px-4 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .195-.107.378-.275.478l-2.155 1.378 2.176 1.404c.163.096.268.279.268.473 0 .346-.281.631-.63.631-.117 0-.227-.031-.322-.089l-2.858-1.841c-.163-.104-.268-.279-.268-.473v-.14c0-.195.107-.378.275-.478l2.858-1.885c.095-.058.205-.089.301-.089zm-7.283 0c.349 0 .63.285.63.631v4.052c0 .346-.281.631-.63.631-.349 0-.63-.285-.63-.631v-4.052c0-.346.281-.631.63-.631zm-3.163 0c.349 0 .63.285.63.631v2.569l2.094-3.051c.084-.12.214-.192.355-.201h.012c.349 0 .63.285.63.631v4.052c0 .346-.281.631-.63.631-.349 0-.63-.285-.63-.631v-2.569l-2.094 3.051c-.084.12-.214.192-.355.201h-.012c-.349 0-.63-.285-.63-.631v-4.052c0-.346.281-.631.63-.631zm-4.736 0h2.544c.349 0 .63.285.63.631 0 .346-.281.631-.63.631h-1.914v1.018h1.914c.349 0 .63.285.63.631 0 .346-.281.631-.63.631h-1.914v1.14h1.914c.349 0 .63.285.63.631 0 .346-.281.631-.63.631h-2.544c-.349 0-.63-.285-.63-.631v-4.682c0-.346.281-.631.63-.631zM12 1.5c6.351 0 10.5 4.149 10.5 10.5s-4.149 10.5-10.5 10.5c-6.351 0-10.5-4.149-10.5-10.5S5.649 1.5 12 1.5z"/>
          </svg>
          LINEで送る
        </button>
      </div>

      <button
        onClick={generateLink}
        className="w-full py-2 text-sm text-primary-600 hover:underline"
      >
        新しいリンクを発行
      </button>
    </div>
  )
}
