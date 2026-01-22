'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface InvitationInfo {
    familySpaceName: string
    expiresAt: string
}

export default function InvitePage() {
    const params = useParams()
    const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [accepting, setAccepting] = useState(false)
    const [success, setSuccess] = useState(false)

  useEffect(() => {
        async function loadInvitation() {
                if (!token) return

          try {
                    const res = await fetch(`/api/invitations/${token}`)
                    if (!res.ok) {
                                if (res.status === 404) {
                                              setError('この招待リンクは無効または期限切れです')
                                } else {
                                              throw new Error('Failed to load invitation')
                                }
                                return
                    }

                  const data = await res.json()
                    setInvitation(data)
          } catch {
                    setError('招待情報の読み込みに失敗しました')
          } finally {
                    setLoading(false)
          }
        }

                loadInvitation()
  }, [token])

  const handleAccept = async () => {
        setAccepting(true)
        setError(null)

        try {
                let lineUserId: string | null = null
                let displayName: string | null = null

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const windowWithLiff = window as any
                if (typeof window !== 'undefined' && windowWithLiff.liff) {
                          const liff = windowWithLiff.liff as { 
                                      isLoggedIn: () => boolean;
                                      login: () => void;
                                      getProfile: () => Promise<{ userId: string; displayName: string }>
                          }

                  if (!liff.isLoggedIn()) {
                              liff.login()
                              return
                  }

                  const profile = await liff.getProfile()
                          lineUserId = profile.userId
                          displayName = profile.displayName
                } else {
                          displayName = prompt('お名前を入力してください（LINE連携時は自動取得されます）')
                          if (!displayName) {
                                      setError('名前を入力してください')
                                      setAccepting(false)
                                      return
                          }
                          lineUserId = `test_${Date.now()}`
                }

          const res = await fetch(`/api/invitations/${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lineUserId, displayName }),
          })

          if (!res.ok) {
                    const data = await res.json()
                    if (data.error === 'Already a member') {
                                setError('すでに参加済みです')
                    } else {
                                throw new Error(data.error || 'Failed to accept invitation')
                    }
                    return
          }

          setSuccess(true)

          if (typeof window !== 'undefined' && (window as { liff?: { closeWindow: () => void } }).liff) {
                    setTimeout(() => {
                                (window as { liff?: { closeWindow: () => void } }).liff?.closeWindow()
                    }, 2000)
          }
        } catch {
                setError('参加に失敗しました')
        } finally {
                setAccepting(false)
        }
  }

  if (loading) {
        return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>div>
              )
  }
  
    if (error && !invitation) {
          return (
                  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
                          <div className="text-center">
                                    <div className="text-6xl mb-4">❌</div>div>
                                    <h1 className="text-xl font-bold text-gray-900">招待リンクエラー</h1>h1>
                                    <p className="mt-2 text-gray-600">{error}</p>p>
                                    <p className="mt-4 text-sm text-gray-500">
                                                新しい招待リンクを発行してもらってください
                                    </p>p>
                          </div>div>
                  </div>div>
                )
    }
  
    if (success) {
          return (
                  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
                          <div className="text-center">
                                    <div className="text-6xl mb-4">🎉</div>div>
                                    <h1 className="text-xl font-bold text-gray-900">参加完了！</h1>h1>
                                    <p className="mt-2 text-gray-600">
                                      {invitation?.familySpaceName}に参加しました
                                    </p>p>
                                    <p className="mt-4 text-sm text-gray-500">
                                                LINEで「開始」と送信すると料理の記録を始められます
                                    </p>p>
                          </div>div>
                  </div>div>
                )
    }
  
    return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
                <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                                  <div className="text-6xl mb-4">🍳</div>div>
                                  <h1 className="text-2xl font-bold text-gray-900">実家の味</h1>h1>
                                  <p className="mt-2 text-gray-600">家族の料理を保存するサービス</p>p>
                        </div>div>
                
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                                  <h2 className="text-xl font-semibold text-center mb-4">招待されています</h2>h2>
                                  
                                  <div className="bg-orange-50 rounded-xl p-4 mb-6 text-center">
                                              <p className="text-sm text-gray-600">家族スペース</p>p>
                                              <p className="text-xl font-bold text-orange-700">{invitation?.familySpaceName}</p>p>
                                  </div>div>
                        
                                  <p className="text-sm text-gray-600 mb-6 text-center">
                                              この家族スペースに参加すると、料理の記録を
                                              LINEで行い、家族と共有できます。
                                  </p>p>
                        
                          {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                          {error}
                        </div>div>
                                  )}
                        
                                  <button
                                                onClick={handleAccept}
                                                disabled={accepting}
                                                className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                    {accepting ? '参加中...' : 'LINEで参加する'}
                                  </button>button>
                        
                                  <p className="mt-4 text-xs text-gray-500 text-center">
                                              有効期限: {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('ja-JP') : '不明'}
                                  </p>p>
                        </div>div>
                </div>div>
          </div>div>
        )
}</div>
