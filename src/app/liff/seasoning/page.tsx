'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Seasoning {
  id: string
  name: string
  category: string
  requires_photo: boolean
}

// Seasoning data (templates)
const seasoningsByCategory: Record<string, Seasoning[]> = {
  soup: [
    { id: 'miso_red', name: '赤味噌', category: 'miso', requires_photo: true },
    { id: 'miso_white', name: '白味噌', category: 'miso', requires_photo: true },
    { id: 'miso_awase', name: '合わせ味噌', category: 'miso', requires_photo: true },
    { id: 'dashi_powder', name: '顆粒だし', category: 'dashi', requires_photo: true },
    { id: 'dashi_pack', name: 'だしパック', category: 'dashi', requires_photo: true },
    { id: 'no_dashi', name: 'だしなし', category: 'dashi', requires_photo: false },
  ],
  nimono: [
    { id: 'soy_sauce', name: '醤油', category: 'soy_sauce', requires_photo: true },
    { id: 'mirin', name: 'みりん', category: 'sweetness', requires_photo: true },
    { id: 'sugar', name: '砂糖', category: 'sweetness', requires_photo: false },
    { id: 'sake', name: '料理酒', category: 'sake', requires_photo: true },
    { id: 'no_sweetness', name: '甘みなし', category: 'sweetness', requires_photo: false },
  ],
  itamemono: [
    { id: 'soy_sauce', name: '醤油', category: 'soy_sauce', requires_photo: true },
    { id: 'mirin', name: 'みりん', category: 'sweetness', requires_photo: true },
    { id: 'sugar', name: '砂糖', category: 'sweetness', requires_photo: false },
    { id: 'sake', name: '料理酒', category: 'sake', requires_photo: true },
    { id: 'sesame_oil', name: 'ごま油', category: 'oil', requires_photo: true },
  ],
  hamburg: [
    { id: 'ketchup', name: 'ケチャップ', category: 'sauce', requires_photo: true },
    { id: 'chuno_sauce', name: '中濃ソース', category: 'sauce', requires_photo: true },
    { id: 'worcester', name: 'ウスターソース', category: 'sauce', requires_photo: true },
    { id: 'commercial_sauce', name: '市販ソース', category: 'sauce', requires_photo: true },
    { id: 'soy_sauce_sauce', name: '醤油ベースソース', category: 'sauce', requires_photo: true },
    { id: 'breadcrumbs', name: 'パン粉', category: 'binder', requires_photo: false },
    { id: 'milk', name: '牛乳', category: 'binder', requires_photo: false },
    { id: 'egg', name: '卵', category: 'binder', requires_photo: false },
    { id: 'no_binder', name: 'つなぎなし', category: 'binder', requires_photo: false },
  ],
  curry: [
    { id: 'roux_vermont', name: 'バーモントカレー', category: 'roux', requires_photo: true },
    { id: 'roux_java', name: 'ジャワカレー', category: 'roux', requires_photo: true },
    { id: 'roux_kokumaro', name: 'こくまろカレー', category: 'roux', requires_photo: true },
    { id: 'roux_other', name: 'その他ルー', category: 'roux', requires_photo: true },
    { id: 'secret_chocolate', name: '隠し味：チョコ', category: 'secret', requires_photo: false },
    { id: 'secret_coffee', name: '隠し味：コーヒー', category: 'secret', requires_photo: false },
    { id: 'secret_honey', name: '隠し味：はちみつ', category: 'secret', requires_photo: false },
    { id: 'secret_none', name: '隠し味なし', category: 'secret', requires_photo: false },
  ],
  donburi: [
    { id: 'soy_sauce', name: '醤油', category: 'base', requires_photo: true },
    { id: 'mentsuyu', name: 'めんつゆ', category: 'base', requires_photo: true },
    { id: 'dashi_powder', name: '顆粒だし', category: 'dashi', requires_photo: true },
    { id: 'mentsuyu_complete', name: 'めんつゆで完結', category: 'dashi', requires_photo: false },
  ],
  dashimaki: [
    { id: 'dashi_powder', name: '顆粒だし', category: 'dashi', requires_photo: true },
    { id: 'dashi_stock', name: 'だし汁', category: 'dashi', requires_photo: true },
    { id: 'no_dashi', name: 'だしなし', category: 'dashi', requires_photo: false },
    { id: 'salt_seasoning', name: '塩', category: 'seasoning', requires_photo: false },
    { id: 'soy_seasoning', name: '醤油', category: 'seasoning', requires_photo: false },
    { id: 'no_seasoning', name: '味付けなし', category: 'seasoning', requires_photo: false },
  ],
}

// Dish category mapping
const dishCategories: Record<string, string> = {
  nikujaga: 'nimono',
  chikuzenni: 'nimono',
  misoshiru: 'soup',
  tonjiru: 'soup',
  shogayaki: 'itamemono',
  hamburg: 'hamburg',
  curry: 'curry',
  oyakodon: 'donburi',
  kinpira: 'itamemono',
  dashimaki: 'dashimaki',
}

function SeasoningPageContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  
  const [dishCategory, setDishCategory] = useState<string>('')
  const [seasonings, setSeasonings] = useState<Seasoning[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        setError('セッションが見つかりません')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/sessions/${sessionId}`)
        if (!res.ok) throw new Error('Session not found')
        
        const data = await res.json()
        const category = dishCategories[data.dish_id] || 'nimono'
        setDishCategory(category)
        setSeasonings(seasoningsByCategory[category] || [])
      } catch {
        setError('セッションの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [sessionId])

  const toggleSeasoning = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleSubmit = async () => {
    if (selected.size === 0) {
      setError('少なくとも1つ選択してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/liff/seasonings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          seasonings: Array.from(selected),
        }),
      })

      if (!res.ok) throw new Error('Submit failed')

      setSuccess(true)
      
      // Close LIFF if available
      if (typeof window !== 'undefined' && (window as { liff?: { closeWindow: () => void } }).liff) {
        setTimeout(() => {
          (window as { liff?: { closeWindow: () => void } }).liff?.closeWindow()
        }, 1500)
      }
    } catch {
      setError('送信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900">送信完了！</h1>
          <p className="mt-2 text-gray-600">LINEに戻って写真を送ってください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">🧂 使った調味料を選んでください</h1>
          <p className="text-sm text-gray-600 mt-1">複数選択できます</p>
        </div>
      </header>

      <main className="px-4 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {seasonings.map((seasoning) => (
            <button
              key={seasoning.id}
              onClick={() => toggleSeasoning(seasoning.id)}
              className={`w-full p-4 rounded-xl text-left transition ${
                selected.has(seasoning.id)
                  ? 'bg-primary-100 border-2 border-primary-500'
                  : 'bg-white border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{seasoning.name}</span>
                  {seasoning.requires_photo && (
                    <span className="ml-2 text-xs text-gray-500">📷 写真必要</span>
                  )}
                </div>
                {selected.has(seasoning.id) && (
                  <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={submitting || selected.size === 0}
          className="w-full py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '送信中...' : `選択した調味料を送信 (${selected.size}件)`}
        </button>
      </div>
    </div>
  )
}

export default function SeasoningPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    }>
      <SeasoningPageContent />
    </Suspense>
  )
}
