import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Member } from '@/types/database'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return { user }
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  return session
}

export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  return member
}

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember()
  
  if (!member) {
    redirect('/login')
  }
  
  return member
}
