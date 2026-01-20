import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Get invitation info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
        family_space:family_spaces(name)
      `)
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      familySpaceName: invitation.family_space?.name,
      expiresAt: invitation.expires_at,
    })
  } catch (error) {
    console.error('Error getting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Accept invitation (for LINE users)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const { lineUserId, displayName } = await request.json()

    if (!lineUserId || !displayName) {
      return NextResponse.json(
        { error: 'Missing lineUserId or displayName' },
        { status: 400 }
      )
    }

    // Get and validate invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Check if LINE user already exists in this family space
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'Already a member' },
        { status: 400 }
      )
    }

    // Create member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        family_space_id: invitation.family_space_id,
        line_user_id: lineUserId,
        display_name: displayName,
        role: invitation.role,
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error creating member:', memberError)
      return NextResponse.json(
        { error: 'Failed to create member' },
        { status: 500 }
      )
    }

    // Mark invitation as used
    await supabase
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // Initialize LINE conversation state
    await supabase
      .from('line_conversation_states')
      .upsert({
        line_user_id: lineUserId,
        member_id: member.id,
        state: 'idle',
        state_data: {},
      })

    return NextResponse.json({
      success: true,
      memberId: member.id,
      familySpaceId: invitation.family_space_id,
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
