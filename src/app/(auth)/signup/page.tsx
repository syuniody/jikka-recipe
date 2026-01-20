'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [familySpaceName, setFamilySpaceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('ユーザー作成に失敗しました')
        return
      }

      // 2. Create family space
      const { data: familySpace, error: fsError } = await supabase
        .from('family_spaces')
        .insert({ name: familySpaceName })
        .select()
        .single()

      if (fsError) {
        setError('家族スペースの作成に失敗しました: ' + fsError.message)
        return
      }

      // 3. Add user as admin member
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          family_space_id: familySpace.id,
          user_id: authData.user.id,
          display_name: displayName,
          role: 'admin',
        })

      if (memberError) {
        setError('メンバー登録に失敗しました: ' + memberError.message)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🍳 実家の味</h1>
          <p className="mt-2 text-gray-600">家族の料理を保存しよう</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-center mb-6">新規登録</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                あなたの名前
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="太郎"
                required
              />
            </div>

            <div>
              <label htmlFor="familySpaceName" className="block text-sm font-medium text-gray-700 mb-1">
                家族スペースの名前
              </label>
              <input
                id="familySpaceName"
                type="text"
                value={familySpaceName}
                onChange={(e) => setFamilySpaceName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="山田家"
                required
              />
              <p className="mt-1 text-xs text-gray-500">後から親を招待できます</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="8文字以上"
                minLength={8}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '登録中...' : '登録して始める'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              すでにアカウントをお持ちの方は
              <Link href="/login" className="text-primary-600 font-medium hover:underline ml-1">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
