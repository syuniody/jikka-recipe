import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed_light':
      return { text: 'ライト完成', color: 'bg-green-100 text-green-700' }
    case 'completed_full':
      return { text: '完成', color: 'bg-green-500 text-white' }
    case 'pending_photo':
      return { text: '写真待ち', color: 'bg-yellow-100 text-yellow-700' }
    case 'cooking':
      return { text: '調理中', color: 'bg-blue-100 text-blue-700' }
    default:
      return { text: '情報回収中', color: 'bg-gray-100 text-gray-700' }
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 7) return `${days}日前`
  
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default async function HomePage() {
  const member = await requireMember()
  const supabase = await createClient()
  
  // Get pending sessions (need attention)
  const { data: pendingSessions } = await supabase
    .from('cooking_sessions')
    .select(`
      *,
      dish:dishes(*),
      member:members(display_name)
    `)
    .eq('family_space_id', member.family_space_id)
    .in('status', ['cooking', 'pending_photo'])
    .order('created_at', { ascending: false })
    .limit(5)
  
  // Get recent completed sessions
  const { data: recentSessions } = await supabase
    .from('cooking_sessions')
    .select(`
      *,
      dish:dishes(*),
      member:members(display_name)
    `)
    .eq('family_space_id', member.family_space_id)
    .in('status', ['completed_light', 'completed_full'])
    .order('completed_at', { ascending: false })
    .limit(10)

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold">こんにちは、{member.display_name}さん</h2>
        <p className="mt-1 text-primary-100">実家の味を見つけましょう</p>
      </div>

      {/* Pending sessions */}
      {pendingSessions && pendingSessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              情報回収中
            </h3>
          </div>
          <div className="space-y-2">
            {pendingSessions.map((session) => {
              const badge = getStatusBadge(session.status)
              return (
                <Link
                  key={session.id}
                  href={`/recipes/${session.id}`}
                  className="block bg-white rounded-xl p-4 shadow-sm border border-yellow-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{session.dish?.name}</h4>
                      <p className="text-sm text-gray-500">
                        {session.member?.display_name} · {formatDate(session.created_at)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent recipes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">最近のレシピ</h3>
          <Link href="/recipes" className="text-sm text-primary-600 font-medium">
            すべて見る →
          </Link>
        </div>
        
        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.slice(0, 5).map((session) => {
              const badge = getStatusBadge(session.status)
              return (
                <Link
                  key={session.id}
                  href={`/recipes/${session.id}`}
                  className="block bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{session.dish?.name}</h4>
                      <p className="text-sm text-gray-500">
                        {session.member?.display_name} · {formatDate(session.completed_at || session.created_at)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-gray-600">まだレシピがありません</p>
            <p className="text-sm text-gray-500 mt-1">親がLINEで料理を記録すると、ここに表示されます</p>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h3 className="font-bold text-gray-900 mb-3">クイックアクション</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/settings"
            className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center text-center"
          >
            <span className="text-2xl mb-2">👨‍👩‍👧</span>
            <span className="font-medium text-gray-900">親を招待</span>
            <span className="text-xs text-gray-500 mt-1">LINEで招待リンクを送る</span>
          </Link>
          <Link
            href="/recipes"
            className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center text-center"
          >
            <span className="text-2xl mb-2">📚</span>
            <span className="font-medium text-gray-900">レシピを見る</span>
            <span className="text-xs text-gray-500 mt-1">保存されたレシピ一覧</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
