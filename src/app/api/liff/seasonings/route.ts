import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { lineClient, createPhotoRequestMessage } from '@/lib/line'

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Template definitions for slot requirements
const templateSlots: Record<string, { slotA: string[]; slotB: string[] }> = {
  soup: {
    slotA: ['miso_red', 'miso_white', 'miso_awase'],
    slotB: ['dashi_powder', 'dashi_pack', 'no_dashi'],
  },
  nimono: {
    slotA: ['soy_sauce'],
    slotB: ['mirin', 'sugar', 'no_sweetness'],
  },
  itamemono: {
    slotA: ['soy_sauce'],
    slotB: ['mirin', 'sugar', 'no_sweetness'],
  },
  hamburg: {
    slotA: ['ketchup', 'chuno_sauce', 'worcester', 'commercial_sauce', 'soy_sauce_sauce'],
    slotB: ['breadcrumbs', 'milk', 'egg', 'no_binder'],
  },
  curry: {
    slotA: ['roux_vermont', 'roux_java', 'roux_kokumaro', 'roux_other'],
    slotB: ['secret_chocolate', 'secret_coffee', 'secret_honey', 'secret_none'],
  },
  donburi: {
    slotA: ['soy_sauce', 'mentsuyu'],
    slotB: ['dashi_powder', 'mentsuyu_complete'],
  },
  dashimaki: {
    slotA: ['dashi_powder', 'dashi_stock', 'no_dashi'],
    slotB: ['salt_seasoning', 'soy_seasoning', 'no_seasoning'],
  },
}

// Dish to template mapping
const dishTemplates: Record<string, string> = {
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

// Seasonings that require photos
const photoRequiredSeasonings = [
  'miso_red', 'miso_white', 'miso_awase',
  'dashi_powder', 'dashi_pack',
  'soy_sauce', 'mirin', 'sake', 'sesame_oil',
  'ketchup', 'chuno_sauce', 'worcester', 'commercial_sauce', 'soy_sauce_sauce',
  'roux_vermont', 'roux_java', 'roux_kokumaro', 'roux_other',
  'mentsuyu', 'dashi_stock',
]

// Seasoning names
const seasoningNames: Record<string, string> = {
  miso_red: '赤味噌',
  miso_white: '白味噌',
  miso_awase: '合わせ味噌',
  dashi_powder: '顆粒だし',
  dashi_pack: 'だしパック',
  dashi_stock: 'だし汁',
  soy_sauce: '醤油',
  mirin: 'みりん',
  sake: '料理酒',
  sesame_oil: 'ごま油',
  ketchup: 'ケチャップ',
  chuno_sauce: '中濃ソース',
  worcester: 'ウスターソース',
  commercial_sauce: '市販ソース',
  soy_sauce_sauce: '醤油ベースソース',
  roux_vermont: 'バーモントカレー',
  roux_java: 'ジャワカレー',
  roux_kokumaro: 'こくまろカレー',
  roux_other: 'カレールー',
  mentsuyu: 'めんつゆ',
}

export async function POST(request: Request) {
  try {
    const { sessionId, seasonings } = await request.json()

    if (!sessionId || !seasonings || !Array.isArray(seasonings)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('cooking_sessions')
      .select('*, member:members(line_user_id)')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const lineUserId = session.member?.line_user_id
    if (!lineUserId) {
      return NextResponse.json({ error: 'LINE user not found' }, { status: 400 })
    }

    // Determine template and slots
    const template = dishTemplates[session.dish_id] || 'nimono'
    const slots = templateSlots[template]

    // Categorize selected seasonings
    const slotASeasonings = seasonings.filter((s: string) => slots.slotA.includes(s))
    const slotBSeasonings = seasonings.filter((s: string) => slots.slotB.includes(s))

    // Save seasonings that don't require photos
    for (const seasoningId of seasonings) {
      if (!photoRequiredSeasonings.includes(seasoningId)) {
        await supabase.from('session_seasonings').insert({
          session_id: sessionId,
          seasoning_id: seasoningId,
          is_slot_a: slotASeasonings.includes(seasoningId),
          is_slot_b: slotBSeasonings.includes(seasoningId),
        })
      }
    }

    // Build photo queue (only seasonings that require photos)
    const photoQueue = seasonings.filter((s: string) => photoRequiredSeasonings.includes(s))

    if (photoQueue.length > 0) {
      // Update LINE conversation state
      await supabase
        .from('line_conversation_states')
        .update({
          state: 'awaiting_photo',
          state_data: {
            photoQueue,
            slotASeasonings,
            slotBSeasonings,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('line_user_id', lineUserId)

      // Send first photo request
      const firstName = seasoningNames[photoQueue[0]] || photoQueue[0]
      await lineClient.pushMessage(lineUserId, [createPhotoRequestMessage(firstName)])

      return NextResponse.json({
        success: true,
        message: 'Photo request sent',
        photoQueueLength: photoQueue.length,
      })
    } else {
      // No photos needed, check completion
      await checkAndUpdateCompletion(sessionId)

      // Update LINE conversation state to idle
      await supabase
        .from('line_conversation_states')
        .update({
          state: 'idle',
          state_data: {},
          current_session_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('line_user_id', lineUserId)

      await lineClient.pushMessage(lineUserId, [{
        type: 'text',
        text: '✅ 記録完了しました！\n\nお子さんがWebで見られるようになりました。',
      }])

      return NextResponse.json({
        success: true,
        message: 'Completed without photos',
      })
    }
  } catch (error) {
    console.error('Error processing seasonings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkAndUpdateCompletion(sessionId: string) {
  const { data: session } = await supabase
    .from('cooking_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) return

  // Get all seasonings for this session
  const { data: sessionSeasonings } = await supabase
    .from('session_seasonings')
    .select('*')
    .eq('session_id', sessionId)

  const slotASatisfied = sessionSeasonings?.some(s => s.is_slot_a) || false
  const slotBSatisfied = sessionSeasonings?.some(s => s.is_slot_b) || false

  // Check if light complete
  const isLightComplete = session.servings && session.taste_status && slotASatisfied && slotBSatisfied

  await supabase
    .from('cooking_sessions')
    .update({
      slot_a_satisfied: slotASatisfied,
      slot_b_satisfied: slotBSatisfied,
      status: isLightComplete ? 'completed_light' : 'pending_photo',
      completed_at: isLightComplete ? new Date().toISOString() : null,
    })
    .eq('id', sessionId)
}
