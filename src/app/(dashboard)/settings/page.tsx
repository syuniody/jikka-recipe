import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { InviteLink } from './InviteLink'
import { LogoutButton } from './LogoutButton'

export default async function SettingsPage() {
  const member = await requireMember()
  const supabase = await createClient()
  
  // Get family space
  const { data: familySpace } = await supabase
    .from('family_spaces')
    .select('*')
    .eq('id', member.family_space_id)
    .single()
  
  // Get all members
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('family_space_id', member.family_space_id)
    .order('created_at', { ascending: true })

  const roleLabels: Record<string, { text: string; color: string }> = {
    admin: { text: '管理者', color: 'bg-purple-100 text-purple-700' },
    editor: { text: '記録者（親）', color: 'bg-green-100 text-green-700' },
    viewer: { text: '閲覧者', color: 'bg-gray-100 text-gray-700' },
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">設定</h2>

      {/* Family space info */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">家族スペース</h3>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-2xl">
            🏠
          </div>
          <div>
            <p className="font-medium text-gray-900">{familySpace?.name}</p>
            <p className="text-sm text-gray-500">{members?.length || 0}人のメンバー</p>
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">メンバー</h3>
        <div className="space-y-3">
          {members?.map((m) => {
            const role = roleLabels[m.role] || roleLabels.viewer
            const isMe = m.id === member.id
            
            return (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {m.line_user_id ? '📱' : '👤'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {m.display_name}
                      {isMe && <span className="text-xs text-gray-500 ml-2">(あなた)</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${role.color}`}>
                        {role.text}
                      </span>
                      {m.line_user_id && (
                        <span className="text-xs text-green-600">LINE連携済み</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite section */}
      {member.role === 'admin' && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">親を招待</h3>
          <p className="text-sm text-gray-600 mb-4">
            招待リンクをLINEで送って、親を家族スペースに招待しましょう。
            リンクは7日間有効で、1回のみ使用できます。
          </p>
          <InviteLink familySpaceId={member.family_space_id} />
        </div>
      )}

      {/* Account */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">アカウント</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>名前: {member.display_name}</p>
          <p>役割: {roleLabels[member.role]?.text}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
