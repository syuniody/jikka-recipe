import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CommentSection } from './CommentSection'

// Recipe templates for cooking instructions
const recipeInstructions: Record<string, string[]> = {
  nikujaga: [
    '牛肉（または豚肉）を食べやすい大きさに切る',
    'じゃがいも、人参、玉ねぎを切る',
    '鍋に油を熱し、肉を炒める',
    '野菜を加えて炒める',
    'だし汁を加えて煮る',
    '調味料（醤油、砂糖、みりん）を加える',
    '落とし蓋をして20〜30分煮る',
  ],
  chikuzenni: [
    '鶏肉を一口大に切る',
    '野菜（れんこん、ごぼう、人参、こんにゃく）を切る',
    '鍋に油を熱し、鶏肉を炒める',
    '野菜を加えて炒める',
    'だし汁を加えて煮る',
    '調味料（醤油、砂糖、みりん）を加える',
    '煮汁が少なくなるまで煮る',
  ],
  misoshiru: [
    '具材を切る',
    '鍋に水とだしを入れて沸かす',
    '具材を入れて煮る',
    '火を弱めて味噌を溶き入れる',
    '沸騰直前で火を止める',
  ],
  tonjiru: [
    '豚肉と野菜を切る',
    '鍋にごま油を熱し、豚肉を炒める',
    '野菜を加えて炒める',
    'だし汁を加えて煮る',
    '火を弱めて味噌を溶き入れる',
  ],
  shogayaki: [
    '豚肉を広げる',
    '生姜をすりおろす',
    'たれ（醤油、みりん、酒、生姜）を合わせる',
    'フライパンで豚肉を焼く',
    'たれを加えて絡める',
  ],
  hamburg: [
    '玉ねぎをみじん切りにして炒める',
    'ひき肉、パン粉、牛乳、卵、塩コショウを混ぜる',
    '形を作る',
    'フライパンで両面を焼く',
    '蓋をして蒸し焼きにする',
    'ソースをかける',
  ],
  curry: [
    '野菜と肉を切る',
    '鍋で肉を炒める',
    '野菜を加えて炒める',
    '水を加えて煮る',
    'アクを取りながら煮込む',
    'ルーを加えて溶かす',
    'とろみがつくまで煮る',
  ],
  oyakodon: [
    '鶏肉を一口大に切る',
    '玉ねぎを薄切りにする',
    '卵を溶く',
    '鍋にだし汁と調味料を入れて煮立てる',
    '鶏肉と玉ねぎを入れて煮る',
    '溶き卵を回し入れる',
    '半熟状態でご飯にのせる',
  ],
  kinpira: [
    'ごぼうと人参を細切りにする',
    'フライパンにごま油を熱する',
    '野菜を炒める',
    '調味料（醤油、砂糖、みりん）を加える',
    '汁気がなくなるまで炒める',
    'ごまを振る',
  ],
  dashimaki: [
    '卵を溶く',
    'だし汁と調味料を加える',
    '卵焼き器を熱して油をひく',
    '卵液を少量入れて広げる',
    '巻いて端に寄せる',
    '繰り返して巻く',
  ],
}

// Taste adjustment tips
const tasteAdjustments: Record<string, { thin: string; thick: string }> = {
  default: {
    thin: '調味料を少し多めに、または煮詰める時間を長めにしてみてください。',
    thick: '水やだし汁を少し足して調整してみてください。',
  },
  misoshiru: {
    thin: '味噌を少し足してください。だしを濃くするのも効果的です。',
    thick: 'だし汁か水を足して薄めてください。',
  },
  curry: {
    thin: 'ルーを少し追加するか、煮詰めてみてください。',
    thick: '水を足して煮込み直してください。',
  },
}

async function getSignedUrl(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, path: string) {
  const { data } = await supabase.storage
    .from('recipe-photos')
    .createSignedUrl(path, 3600) // 1 hour
  return data?.signedUrl
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await requireMember()
  const supabase = await createClient()
  
  // Get session with related data
  const { data: session, error } = await supabase
    .from('cooking_sessions')
    .select(`
      *,
      dish:dishes(*),
      member:members(display_name)
    `)
    .eq('id', id)
    .eq('family_space_id', member.family_space_id)
    .single()
  
  if (error || !session) {
    notFound()
  }
  
  // Get seasonings with photos
  const { data: seasonings } = await supabase
    .from('session_seasonings')
    .select(`
      *,
      seasoning:seasonings(*)
    `)
    .eq('session_id', id)
  
  // Get signed URLs for photos
  const seasoningsWithUrls = await Promise.all(
    (seasonings || []).map(async (s) => ({
      ...s,
      signedUrl: s.photo_path ? await getSignedUrl(supabase, s.photo_path) : null,
    }))
  )
  
  // Get ingredients
  const { data: ingredients } = await supabase
    .from('session_ingredients')
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .eq('session_id', id)
  
  // Get comments
  const { data: comments } = await supabase
    .from('comments')
    .select(`
      *,
      member:members(display_name)
    `)
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  const instructions = recipeInstructions[session.dish_id] || recipeInstructions['nikujaga']
  const adjustmentTips = tasteAdjustments[session.dish_id] || tasteAdjustments['default']

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/recipes" className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{session.dish?.name}</h1>
          <p className="text-sm text-gray-500">
            {session.member?.display_name} · {new Date(session.created_at).toLocaleDateString('ja-JP')}
            {session.servings && ` · ${session.servings}人前`}
          </p>
        </div>
      </div>

      {/* Taste status */}
      {session.taste_status && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">味の記録</h3>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              session.taste_status === 'perfect' ? 'bg-green-100 text-green-700' :
              session.taste_status === 'thin' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
            }`}>
              {session.taste_status === 'perfect' ? '✓ ちょうどいい' :
               session.taste_status === 'thin' ? '↓ 薄め' : '↑ 濃いめ'}
            </span>
          </div>
          {session.taste_status !== 'perfect' && (
            <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              💡 {session.taste_status === 'thin' ? adjustmentTips.thin : adjustmentTips.thick}
            </p>
          )}
        </div>
      )}

      {/* Key seasonings (photos) */}
      {seasoningsWithUrls.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">味のキー（調味料）</h3>
          <div className="grid grid-cols-2 gap-3">
            {seasoningsWithUrls.map((s) => (
              <div key={s.id} className="bg-gray-50 rounded-lg overflow-hidden">
                {s.signedUrl ? (
                  <img
                    src={s.signedUrl}
                    alt={s.seasoning?.name || '調味料'}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-gray-400">
                    写真なし
                  </div>
                )}
                <div className="p-2">
                  <span className="text-sm font-medium text-gray-900">
                    {s.seasoning?.name || '調味料'}
                  </span>
                  {(s.is_slot_a || s.is_slot_b) && (
                    <span className="ml-2 text-xs text-primary-600">
                      {s.is_slot_a ? '(必須A)' : '(必須B)'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">材料</h3>
          <Link
            href={`/recipes/${id}/ingredients`}
            className="text-sm text-primary-600 font-medium hover:underline"
          >
            編集
          </Link>
        </div>
        
        {ingredients && ingredients.length > 0 ? (
          <ul className="space-y-2">
            {ingredients.map((ing) => (
              <li key={ing.id} className="flex items-center gap-2 text-gray-700">
                <span className="w-2 h-2 bg-primary-500 rounded-full" />
                <span>{ing.custom_name || ing.ingredient?.name}</span>
                {ing.amount && <span className="text-gray-500 text-sm">({ing.amount})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">材料が設定されていません</p>
            <Link
              href={`/recipes/${id}/ingredients`}
              className="inline-block mt-2 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600"
            >
              材料を追加する
            </Link>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">作り方</h3>
        <ol className="space-y-3">
          {instructions.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">コメント・質問</h3>
        <CommentSection
          sessionId={id}
          memberId={member.id}
          initialComments={comments || []}
        />
      </div>
    </div>
  )
}
