'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Ingredient {
  id: string
  name: string
}

interface SessionIngredient {
  id: string
  ingredient_id: string | null
  custom_name: string | null
  amount: string | null
}

export default function IngredientsEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [dishId, setDishId] = useState<string | null>(null)
  const [presetIngredients, setPresetIngredients] = useState<Ingredient[]>([])
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
  const [customIngredients, setCustomIngredients] = useState<string[]>([])
  const [newCustom, setNewCustom] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Get session to find dish_id
        const { data: session, error: sessionError } = await supabase
          .from('cooking_sessions')
          .select('dish_id')
          .eq('id', id)
          .single()

        if (sessionError || !session) {
          setError('レシピが見つかりません')
          return
        }

        setDishId(session.dish_id)

        // Get preset ingredients for this dish
        const { data: presets } = await supabase
          .from('dish_ingredient_presets')
          .select(`
            ingredient_id,
            ingredient:ingredients(id, name)
          `)
          .eq('dish_id', session.dish_id)

        const presetList = (presets || [])
          .map((p: { ingredient: Ingredient | Ingredient[] | null }) => {
            if (Array.isArray(p.ingredient)) {
              return p.ingredient[0]
            }
            return p.ingredient
          })
          .filter((i): i is Ingredient => i !== null)

        setPresetIngredients(presetList)

        // Get current session ingredients
        const { data: currentIngredients } = await supabase
          .from('session_ingredients')
          .select('*')
          .eq('session_id', id)

        const selected = new Set<string>()
        const custom: string[] = []

        ;(currentIngredients || []).forEach((ing: SessionIngredient) => {
          if (ing.ingredient_id) {
            selected.add(ing.ingredient_id)
          } else if (ing.custom_name) {
            custom.push(ing.custom_name)
          }
        })

        setSelectedIngredients(selected)
        setCustomIngredients(custom)
      } catch {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, supabase])

  const toggleIngredient = (ingredientId: string) => {
    const newSelected = new Set(selectedIngredients)
    if (newSelected.has(ingredientId)) {
      newSelected.delete(ingredientId)
    } else {
      newSelected.add(ingredientId)
    }
    setSelectedIngredients(newSelected)
  }

  const addCustomIngredient = () => {
    if (newCustom.trim() && !customIngredients.includes(newCustom.trim())) {
      setCustomIngredients([...customIngredients, newCustom.trim()])
      setNewCustom('')
    }
  }

  const removeCustomIngredient = (name: string) => {
    setCustomIngredients(customIngredients.filter((c) => c !== name))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      // Delete existing ingredients
      await supabase
        .from('session_ingredients')
        .delete()
        .eq('session_id', id)

      // Insert new ingredients
      const toInsert = [
        ...Array.from(selectedIngredients).map((ingredientId) => ({
          session_id: id,
          ingredient_id: ingredientId,
        })),
        ...customIngredients.map((name) => ({
          session_id: id,
          custom_name: name,
        })),
      ]

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('session_ingredients')
          .insert(toInsert)

        if (insertError) throw insertError
      }

      router.push(`/recipes/${id}`)
      router.refresh()
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/recipes/${id}`} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">材料を編集</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Preset ingredients */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">基本の材料</h3>
        <div className="space-y-2">
          {presetIngredients.map((ing) => (
            <label
              key={ing.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIngredients.has(ing.id)}
                onChange={() => toggleIngredient(ing.id)}
                className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
              />
              <span className="text-gray-700">{ing.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom ingredients */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">追加の材料</h3>
        
        {customIngredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {customIngredients.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
              >
                {name}
                <button
                  onClick={() => removeCustomIngredient(name)}
                  className="hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newCustom}
            onChange={(e) => setNewCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomIngredient())}
            placeholder="材料名を入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
          <button
            onClick={addCustomIngredient}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium"
          >
            追加
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="fixed bottom-20 left-0 right-0 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        ※ 材料を編集しても親には通知されません
      </p>
    </div>
  )
}
