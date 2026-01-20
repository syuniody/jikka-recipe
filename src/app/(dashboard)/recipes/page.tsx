import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function getStatusBadge(status: string, hasIngredients: boolean) {
  if (!hasIngredients) {
    return { text: '材料未設定', color: 'bg-orange-100 text-orange-700', icon: '🥕' }
  }
  
  switch (status) {
    case 'completed_light':
      return { text: 'ライト完成', color: 'bg-green-100 text-green-700', icon: '✓' }
    case 'completed_full':
      return { text: '完成', color: 'bg-green-500 text-white', icon: '✓✓' }
    case 'pending_photo':
      return { text: '写真待ち', color: 'bg-yellow-100 text-yellow-700', icon: '📷' }
    case 'cooking':
      return { text: '調理中', color: 'bg-blue-100 text-blue-700', icon: '🍳' }
    default:
      return { text: '情報回収中', color: 'bg-gray-100 text-gray-700', icon: '⏳' }
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

export default async function RecipesPage() {
  const member = await requireMember()
  const supabase = await createClient()
  
  // Get all sessions
  const { data: sessions } = await supabase
    .from('cooking_sessions')
    .select(`
      *,
      dish:dishes(*),
      member:members(display_name)
    `)
    .eq('family_space_id', member.family_space_id)
    .order('created_at', { ascending: false })
  
  // Check which sessions have ingredients
  const sessionIds = sessions?.map(s => s.id) || []
  const { data: ingredientCounts } = await supabase
    .from('session_ingredients')
    .select('session_id')
    .in('session_id', sessionIds.length > 0 ? sessionIds : [''])
  
  const sessionsWithIngredients = new Set(ingredientCounts?.map(i => i.session_id) || [])

  // Group sessions by dish
  const sessionsByDish = sessions?.reduce((acc, session) => {
    const dishName = session.dish?.name || '不明'
    if (!acc[dishName]) {
      acc[dishName] = []
    }
    acc[dishName].push(session)
    return acc
  }, {} as Record<string, typeof sessions>)

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">レシピ一覧</h2>
        <span className="text-sm text-gray-500">{sessions?.length || 0}件</span>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => {
            const hasIngredients = sessionsWithIngredients.has(session.id)
            const badge = getStatusBadge(session.status, hasIngredients)
            
            return (
              <Link
                key={session.id}
                href={`/recipes/${session.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{session.dish?.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.icon} {badge.text}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      <span>{session.member?.display_name}</span>
                      <span>·</span>
                      <span>{formatDate(session.created_at)}</span>
                      {session.servings && (
                        <>
                          <span>·</span>
                          <span>{session.servings}人前</span>
                        </>
                      )}
                    </div>
                    {session.taste_status && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm">味：</span>
                        <span className={`text-sm font-medium ${
                          session.taste_status === 'perfect' ? 'text-green-600' :
                          session.taste_status === 'thin' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {session.taste_status === 'perfect' ? 'ちょうどいい' :
                           session.taste_status === 'thin' ? '薄め' : '濃いめ'}
                        </span>
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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
    </div>
  )
}
