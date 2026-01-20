import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notifyEditorsOfComment } from '@/lib/line'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, content } = await request.json()

    // Get session with dish info
    const { data: session, error: sessionError } = await supabase
      .from('cooking_sessions')
      .select(`
        *,
        dish:dishes(name),
        family_space_id
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get commenter info
    const { data: commenter } = await supabase
      .from('members')
      .select('display_name, family_space_id')
      .eq('user_id', user.id)
      .single()

    if (!commenter || commenter.family_space_id !== session.family_space_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all editors with LINE IDs in this family space
    const { data: editors } = await supabase
      .from('members')
      .select('line_user_id')
      .eq('family_space_id', session.family_space_id)
      .eq('role', 'editor')
      .not('line_user_id', 'is', null)

    const editorLineIds = editors?.map(e => e.line_user_id).filter((id): id is string => id !== null) || []

    if (editorLineIds.length > 0) {
      await notifyEditorsOfComment(
        editorLineIds,
        commenter.display_name,
        session.dish?.name || '料理',
        content
      )
    }

    return NextResponse.json({ success: true, notifiedCount: editorLineIds.length })
  } catch (error) {
    console.error('Error notifying editors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
