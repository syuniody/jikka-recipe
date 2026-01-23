import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { familySpaceId } = await request.json()

    // Verify user is admin of this family space
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('family_space_id', familySpaceId)
      .eq('user_id', user.id)
      .single()

    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex')
    
    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        family_space_id: familySpaceId,
        token,
        role: 'editor',
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating invitation:', insertError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

        // Build invitation URL using LIFF URL for LINE app
        // This ensures LINE users open the invite in LINE's browser with LIFF support
        const INVITE_LIFF_ID = '2008939410-SzrbXSdf'
        const inviteUrl = `https://liff.line.me/${INVITE_LIFF_ID}/${token}`

        // Return success response with invitation and URL
        return NextResponse.json({ invitation, url: inviteUrl }, { status: 201 })
  } catch (error) {

    console.error('Error in POST /api/invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

