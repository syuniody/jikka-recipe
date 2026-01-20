'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  content: string
  source: 'web' | 'line'
  created_at: string
  member?: {
    display_name: string
  }
}

interface CommentSectionProps {
  sessionId: string
  memberId: string
  initialComments: Comment[]
}

export function CommentSection({ sessionId, memberId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Insert comment
      const { data: newComment, error: insertError } = await supabase
        .from('comments')
        .insert({
          session_id: sessionId,
          member_id: memberId,
          content: content.trim(),
          source: 'web',
        })
        .select(`
          *,
          member:members(display_name)
        `)
        .single()

      if (insertError) throw insertError

      // Notify via API (to send LINE notification)
      await fetch('/api/comments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          commentId: newComment.id,
          content: content.trim(),
        }),
      })

      setComments([...comments, newComment])
      setContent('')
    } catch {
      setError('コメントの投稿に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg ${
                comment.source === 'line' ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">
                  {comment.member?.display_name || '不明'}
                </span>
                <span className="text-xs text-gray-500">{formatTime(comment.created_at)}</span>
                {comment.source === 'line' && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    LINE
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-sm">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm mb-4">まだコメントがありません</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="質問やコメントを入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? '...' : '送信'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          ※ コメントを投稿すると、親にLINEで通知されます
        </p>
      </form>
    </div>
  )
}
