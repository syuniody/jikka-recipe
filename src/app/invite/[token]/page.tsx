'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Script from 'next/script'

interface InvitationInfo {
  familySpaceName: string
  expiresAt: string
}

interface LiffObject {
  init: (config: { liffId: string }) => Promise<void>
  isLoggedIn: () => boolean
  login: (config?: { redirectUri?: string }) => void
  getProfile: () => Promise<{ userId: string; displayName: string }>
  closeWindow: () => void
  isInClient: () => boolean
}

declare global {
  interface Window {
    liff?: LiffObject
  }
}

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string
  
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [liffReady, setLiffReady] = useState(false)
  const [liffError, setLiffError] = useState<string | null>(null)

  // Initialize LIFF
  useEffect(() => {
    const initLiff = async () => {
      if (typeof window === 'undefined' || !window.liff) return
      
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) {
          console.error('LIFF ID not configured')
          setLiffError('LIFF ID not configured')
          return
        }
        
        await window.liff.init({ liffId })
        console.log('LIFF initialized successfully')
        console.log('Is in LINE client:', window.liff.isInClient())
        console.log('Is logged in:', window.liff.isLoggedIn())
        setLiffReady(true)
      } catch (err) {
        console.error('LIFF init error:', err)
        setLiffError('LIFF初期化エラー')
      }
    }

    if (window.liff) {
      initLiff()
    }
  }, [])

  const handleLiffLoad = () => {
    const initLiff = async () => {
      if (!window.liff) return
      
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) {
          setLiffError('LIFF ID not configured')
          return
        }
        
        await window.liff.init({ liffId })
        console.log('LIFF initialized after script load')
        setLiffReady(true)
      } catch (err) {
        console.error('LIFF init error:', err)
        setLiffError('LIFF初期化エラー')
      }
    }
    
    initLiff()
  }

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

      if (liffReady && window.liff) {
        console.log('Using LIFF for authentication')
        
        if (!window.liff.isLoggedIn()) {
          console.log('Not logged in, redirecting to LINE login')
          window.liff.login({ redirectUri: window.location.href })
          return
        }

        const profile = await window.liff.getProfile()
        console.log('Got LINE profile:', profile.displayName, profile.userId)
        lineUserId = profile.userId
        displayName = profile.displayName
      } else {
        console.log('LIFF not available, using fallback')
        displayName = prompt('お名前を入力してください（LINEアプリから開くと自動取得されます）')
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

      if (liffReady && window.liff?.isInClient()) {
        setTimeout(() => {
          window.liff?.closeWindow()
        }, 2000)
      }
    } catch (err) {
      console.error('Accept error:', err)
      setError('参加に失敗しました')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Script 
          src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
          onLoad={handleLiffLoad}
        />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      </>
    )
  }

  if (error && !invitation) {
    return (
      <>
        <Script 
          src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
          onLoad={handleLiffLoad}
        />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900">招待リンクエラー</h1>
            <p className="mt-2 text-gray-600">{error}</p>
            <p className="mt-4 text-sm text-gray-500">
              新しい招待リンクを発行してもらってください
            </p>
          </div>
        </div>
      </>
    )
  }

  if (success) {
    return (
      <>
        <Script 
          src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
          onLoad={handleLiffLoad}
        />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-xl font-bold text-gray-900">参加完了！</h1>
            <p className="mt-2 text-gray-600">
              {invitation?.familySpaceName}に参加しました
            </p>
            <p className="mt-4 text-sm text-gray-500">
              LINEで「開始」と送信すると料理の記録を始められます
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Script 
        src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
        onLoad={handleLiffLoad}
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍳</div>
            <h1 className="text-2xl font-bold text-gray-900">実家の味</h1>
            <p className="mt-2 text-gray-600">家族の料理を保存するサービス</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-center mb-4">招待されています</h2>
            
            <div className="bg-orange-50 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm text-gray-600">家族スペース</p>
              <p className="text-xl font-bold text-orange-700">{invitation?.familySpaceName}</p>
            </div>

            <p className="text-sm text-gray-600 mb-6 text-center">
              この家族スペースに参加すると、料理の記録を
              LINEで行い、家族と共有できます。
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {liffError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                {liffError}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? '参加中...' : 'LINEで参加する'}
            </button>

            <p className="mt-4 text-xs text-gray-500 text-center">
              有効期限: {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('ja-JP') : '不明'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
