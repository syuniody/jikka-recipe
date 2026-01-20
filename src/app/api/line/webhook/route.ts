import { NextResponse } from 'next/server'
import { WebhookEvent, validateSignature } from '@line/bot-sdk'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  lineClient,
  dishes,
  createDishSelectionMessage,
  createCookingButtonsMessage,
  createServingsMessage,
  createSeasoningLiffMessage,
  createPhotoRequestMessage,
} from '@/lib/line'

// Use service role for webhook (no user context)
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature') || ''

    // Validate signature
    if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { events } = JSON.parse(body) as { events: WebhookEvent[] }

    for (const event of events) {
      await handleEvent(event)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleEvent(event: WebhookEvent) {
  const userId = event.source.userId
  if (!userId) return

  // Get or create conversation state
  let { data: state } = await supabase
    .from('line_conversation_states')
    .select('*, member:members(*)')
    .eq('line_user_id', userId)
    .single()

  if (!state?.member) {
    // User not registered
    if (event.type === 'message' && event.message.type === 'text') {
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: 'まだ家族スペースに参加していません。\n招待リンクから参加してください。',
      })
    }
    return
  }

  switch (event.type) {
    case 'message':
      await handleMessage(event, state, userId)
      break
    case 'postback':
      await handlePostback(event, state, userId)
      break
  }
}

async function handleMessage(event: WebhookEvent & { type: 'message' }, state: { state: string; state_data: Record<string, unknown>; member: { id: string; family_space_id: string; display_name: string }; current_session_id: string | null }, userId: string) {
  if (event.message.type === 'text') {
    const text = event.message.text.toLowerCase()

    // Check if user wants to start cooking
    if (text === '開始' || text === 'はじめる' || text === 'start') {
      await startCookingFlow(event.replyToken, state.member.family_space_id)
      await updateState(userId, 'selecting_dish', {})
      return
    }

    // Handle comment reply (when in awaiting_reply state)
    if (state.state === 'awaiting_reply' && state.state_data?.sessionId) {
      const sessionId = state.state_data.sessionId as string
      
      // Save comment
      await supabase.from('comments').insert({
        session_id: sessionId,
        member_id: state.member.id,
        content: event.message.text,
        source: 'line',
      })

      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '返信を保存しました ✅',
      })

      await updateState(userId, 'idle', {})
      return
    }

    // Default response
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '「開始」と送信して料理を始めましょう！',
    })
  } else if (event.message.type === 'image') {
    // Handle photo upload
    if (state.state === 'awaiting_photo' && state.current_session_id) {
      const imageEvent = event as WebhookEvent & { type: 'message'; message: { type: 'image'; id: string }; replyToken: string }
      await handlePhotoUpload(imageEvent, state, userId)
    }
  }
}

async function handlePostback(event: WebhookEvent & { type: 'postback' }, state: { state: string; state_data: Record<string, unknown>; member: { id: string; family_space_id: string; display_name: string }; current_session_id: string | null }, userId: string) {
  const data = event.postback.data
  const [action, value] = data.split(':')

  switch (action) {
    case 'select_dish':
      await handleDishSelection(event.replyToken, state, userId, value)
      break
    case 'cooking':
      await handleCookingAction(event.replyToken, state, userId, value)
      break
    case 'servings':
      await handleServingsSelection(event.replyToken, state, userId, parseInt(value))
      break
  }
}

async function startCookingFlow(replyToken: string, familySpaceId: string) {
  // Get recent dishes for this family space
  const { data: recentSessions } = await supabase
    .from('cooking_sessions')
    .select('dish_id')
    .eq('family_space_id', familySpaceId)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentDishes = [...new Set(recentSessions?.map(s => s.dish_id) || [])]

  // Get frequent dishes
  const { data: frequentData } = await supabase
    .from('cooking_sessions')
    .select('dish_id')
    .eq('family_space_id', familySpaceId)
  
  const dishCounts: Record<string, number> = {}
  frequentData?.forEach(s => {
    dishCounts[s.dish_id] = (dishCounts[s.dish_id] || 0) + 1
  })
  const frequentDishes = Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)

  const message = createDishSelectionMessage(recentDishes, frequentDishes)
  await lineClient.replyMessage(replyToken, message)
}

async function handleDishSelection(replyToken: string, state: { member: { id: string; family_space_id: string } }, userId: string, dishId: string) {
  const dish = dishes.find(d => d.id === dishId)
  if (!dish) return

  // Create cooking session
  const { data: session, error } = await supabase
    .from('cooking_sessions')
    .insert({
      family_space_id: state.member.family_space_id,
      member_id: state.member.id,
      dish_id: dishId,
      status: 'cooking',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating session:', error)
    return
  }

  // Log start event
  await supabase.from('cooking_events').insert({
    session_id: session.id,
    event_type: 'start',
  })

  // Update state
  await updateState(userId, 'cooking', {}, session.id)

  // Send cooking buttons
  const message = createCookingButtonsMessage(dish.name)
  await lineClient.replyMessage(replyToken, message)
}

async function handleCookingAction(replyToken: string, state: { current_session_id: string | null; member: { id: string } }, userId: string, action: string) {
  if (!state.current_session_id) return

  const sessionId = state.current_session_id

  switch (action) {
    case 'seasoning_added':
      await supabase.from('cooking_events').insert({
        session_id: sessionId,
        event_type: 'seasoning_added',
      })
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: '調味料入れましたね！👍',
      })
      break

    case 'taste_thin':
    case 'taste_perfect':
    case 'taste_thick':
      const tasteStatus = action.replace('taste_', '') as 'thin' | 'perfect' | 'thick'
      await supabase
        .from('cooking_sessions')
        .update({ taste_status: tasteStatus })
        .eq('id', sessionId)
      
      await supabase.from('cooking_events').insert({
        session_id: sessionId,
        event_type: action,
      })

      const tasteMessages = {
        thin: '薄めですね。調整のポイントとして記録しておきます📝',
        perfect: 'ちょうどいい味付けですね！素晴らしい✨',
        thick: '濃いめですね。調整のポイントとして記録しておきます📝',
      }
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: tasteMessages[tasteStatus],
      })
      break

    case 'complete':
      await supabase.from('cooking_events').insert({
        session_id: sessionId,
        event_type: 'complete',
      })

      // Move to post-cooking flow
      await updateState(userId, 'selecting_servings', {})
      
      await lineClient.replyMessage(replyToken, [
        { type: 'text', text: '🎉 お疲れさまでした！\n\n最後にいくつか教えてください。' },
        createServingsMessage(),
      ])
      break
  }
}

async function handleServingsSelection(replyToken: string, state: { current_session_id: string | null }, userId: string, servings: number) {
  if (!state.current_session_id) return

  await supabase
    .from('cooking_sessions')
    .update({ servings })
    .eq('id', state.current_session_id)

  // Move to seasoning selection (LIFF)
  await updateState(userId, 'selecting_seasonings', {})

  await lineClient.replyMessage(replyToken, createSeasoningLiffMessage(state.current_session_id))
}

async function handlePhotoUpload(event: WebhookEvent & { type: 'message'; message: { type: 'image'; id: string } }, state: { current_session_id: string | null; state_data: Record<string, unknown> }, userId: string) {
  const sessionId = state.current_session_id
  if (!sessionId) return

  const photoQueue = (state.state_data?.photoQueue as string[]) || []
  const currentSeasoning = photoQueue[0]

  if (!currentSeasoning) {
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '写真ありがとうございます！',
    })
    return
  }

  try {
    // Get image content
    const stream = await lineClient.getMessageContent(event.message.id)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const imageBuffer = Buffer.concat(chunks)

    // Upload to Supabase Storage
    const fileName = `${sessionId}/${currentSeasoning}_${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('recipe-photos')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Save seasoning record
    await supabase.from('session_seasonings').insert({
      session_id: sessionId,
      seasoning_id: currentSeasoning,
      photo_path: fileName,
      is_slot_a: (state.state_data?.slotASeasonings as string[] | undefined)?.includes(currentSeasoning) || false,
      is_slot_b: (state.state_data?.slotBSeasonings as string[] | undefined)?.includes(currentSeasoning) || false,
    })

    // Move to next photo or complete
    const remainingQueue = photoQueue.slice(1)

    if (remainingQueue.length > 0) {
      // Get seasoning name
      const { data: seasoning } = await supabase
        .from('seasonings')
        .select('name')
        .eq('id', remainingQueue[0])
        .single()

      await updateState(userId, 'awaiting_photo', {
        ...state.state_data,
        photoQueue: remainingQueue,
      })

      await lineClient.replyMessage(event.replyToken, [
        { type: 'text', text: '📷 ありがとうございます！' },
        createPhotoRequestMessage(seasoning?.name || remainingQueue[0]),
      ])
    } else {
      // Check if light completion is achieved
      await checkAndUpdateCompletion(sessionId)
      await updateState(userId, 'idle', {}, null)

      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '✅ 記録完了しました！\n\nお子さんがWebで見られるようになりました。お疲れさまでした！',
      })
    }
  } catch (error) {
    console.error('Photo upload error:', error)
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '写真の保存に失敗しました。もう一度送ってください。',
    })
  }
}

async function checkAndUpdateCompletion(sessionId: string) {
  const { data: session } = await supabase
    .from('cooking_sessions')
    .select('*, dish:dishes(*)')
    .eq('id', sessionId)
    .single()

  if (!session) return

  // Get template requirements
  const { data: template } = await supabase
    .from('dish_templates')
    .select('*')
    .eq('dish_id', session.dish_id)
    .single()

  if (!template) {
    // No template, mark as light complete if basic info is filled
    if (session.servings && session.taste_status) {
      await supabase
        .from('cooking_sessions')
        .update({ status: 'completed_light', completed_at: new Date().toISOString() })
        .eq('id', sessionId)
    }
    return
  }

  // Check slot A satisfaction
  const { data: slotASeasonings } = await supabase
    .from('session_seasonings')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_slot_a', true)

  const slotASatisfied = (slotASeasonings?.length || 0) > 0

  // Check slot B satisfaction
  const { data: slotBSeasonings } = await supabase
    .from('session_seasonings')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_slot_b', true)

  const slotBSatisfied = (slotBSeasonings?.length || 0) > 0

  // Update session
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

async function updateState(
  lineUserId: string,
  newState: string,
  stateData: Record<string, unknown>,
  sessionId?: string | null
) {
  const update: {
    state: string
    state_data: Record<string, unknown>
    updated_at: string
    current_session_id?: string | null
  } = {
    state: newState,
    state_data: stateData,
    updated_at: new Date().toISOString(),
  }

  if (sessionId !== undefined) {
    update.current_session_id = sessionId
  }

  await supabase
    .from('line_conversation_states')
    .update(update)
    .eq('line_user_id', lineUserId)
}
