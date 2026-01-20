import { Client, TextMessage, FlexMessage, FlexBubble } from '@line/bot-sdk'

// LINE Client configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
}

export const lineClient = new Client(config)

// Dish data for Week 1
export const dishes = [
  { id: 'nikujaga', name: '肉じゃが', category: 'nimono' },
  { id: 'chikuzenni', name: '筑前煮', category: 'nimono' },
  { id: 'misoshiru', name: '味噌汁', category: 'soup' },
  { id: 'tonjiru', name: '豚汁', category: 'soup' },
  { id: 'shogayaki', name: '生姜焼き', category: 'itamemono' },
  { id: 'hamburg', name: 'ハンバーグ', category: 'hamburg' },
  { id: 'curry', name: 'カレー', category: 'curry' },
  { id: 'oyakodon', name: '親子丼', category: 'donburi' },
  { id: 'kinpira', name: 'きんぴらごぼう', category: 'itamemono' },
  { id: 'dashimaki', name: 'だし巻き卵', category: 'dashimaki' },
]

// Create dish selection Flex Message
export function createDishSelectionMessage(recentDishes: string[] = [], frequentDishes: string[] = []): FlexMessage {
  const allDishes = dishes
  
  // Recent and frequent sections
  const recentItems = recentDishes.slice(0, 3).map(id => {
    const dish = allDishes.find(d => d.id === id)
    return dish ? {
      type: 'button',
      action: { type: 'postback', label: `🕐 ${dish.name}`, data: `select_dish:${dish.id}` },
      style: 'secondary',
      height: 'sm',
    } : null
  }).filter(Boolean)

  const frequentItems = frequentDishes.slice(0, 3).map(id => {
    const dish = allDishes.find(d => d.id === id)
    return dish ? {
      type: 'button',
      action: { type: 'postback', label: `⭐ ${dish.name}`, data: `select_dish:${dish.id}` },
      style: 'secondary',
      height: 'sm',
    } : null
  }).filter(Boolean)

  // All dishes section
  const dishButtons = allDishes.map(dish => ({
    type: 'button',
    action: { type: 'postback', label: dish.name, data: `select_dish:${dish.id}` },
    style: 'primary',
    height: 'sm',
    margin: 'sm',
  }))

  // Build body contents dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyContents: any[] = []
  
  if (recentItems.length > 0) {
    bodyContents.push({ type: 'text', text: '最近作った料理', size: 'sm', color: '#888888' })
    bodyContents.push({ type: 'box', layout: 'vertical', spacing: 'sm', contents: recentItems })
    bodyContents.push({ type: 'separator', margin: 'md' })
  }
  
  if (frequentItems.length > 0) {
    bodyContents.push({ type: 'text', text: 'よく作る料理', size: 'sm', color: '#888888' })
    bodyContents.push({ type: 'box', layout: 'vertical', spacing: 'sm', contents: frequentItems })
    bodyContents.push({ type: 'separator', margin: 'md' })
  }
  
  bodyContents.push({ type: 'text', text: '定番メニュー', size: 'sm', color: '#888888' })
  bodyContents.push({ type: 'box', layout: 'vertical', spacing: 'sm', contents: dishButtons })

  const bubble: FlexBubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🍳 今日は何を作りますか？', weight: 'bold', size: 'lg' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: bodyContents
    }
  }

  return {
    type: 'flex',
    altText: '料理を選んでください',
    contents: bubble,
  }
}

// Create cooking buttons (4 taps)
export function createCookingButtonsMessage(dishName: string): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `🍳 ${dishName}を作っています`, weight: 'bold', size: 'md' }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'button',
          action: { type: 'postback', label: '🧂 調味料入れた', data: 'cooking:seasoning_added' },
          style: 'secondary',
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: { type: 'postback', label: '薄い', data: 'cooking:taste_thin' },
              style: 'secondary',
              flex: 1,
            },
            {
              type: 'button',
              action: { type: 'postback', label: 'ちょうど', data: 'cooking:taste_perfect' },
              style: 'primary',
              flex: 1,
            },
            {
              type: 'button',
              action: { type: 'postback', label: '濃い', data: 'cooking:taste_thick' },
              style: 'secondary',
              flex: 1,
            },
          ]
        },
        {
          type: 'button',
          action: { type: 'postback', label: '✅ 完成！', data: 'cooking:complete' },
          style: 'primary',
          color: '#00B900',
        },
      ]
    }
  }

  return {
    type: 'flex',
    altText: '調理中のアクション',
    contents: bubble,
  }
}

// Create servings selection message
export function createServingsMessage(): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '👨‍👩‍👧‍👦 何人分作りましたか？', weight: 'bold', size: 'md' }
      ]
    },
    body: {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: { type: 'postback', label: '2人', data: 'servings:2' },
          style: 'secondary',
          flex: 1,
        },
        {
          type: 'button',
          action: { type: 'postback', label: '3人', data: 'servings:3' },
          style: 'secondary',
          flex: 1,
        },
        {
          type: 'button',
          action: { type: 'postback', label: '4人', data: 'servings:4' },
          style: 'secondary',
          flex: 1,
        },
        {
          type: 'button',
          action: { type: 'postback', label: '5人+', data: 'servings:5' },
          style: 'secondary',
          flex: 1,
        },
      ]
    }
  }

  return {
    type: 'flex',
    altText: '人数を選んでください',
    contents: bubble,
  }
}

// Create photo request message
export function createPhotoRequestMessage(seasoningName: string): TextMessage {
  return {
    type: 'text',
    text: `📷 ${seasoningName}の写真を送ってください\n\n使った${seasoningName}のパッケージやボトルを撮影してください。`,
  }
}

// Create LIFF URL for seasoning selection
export function createSeasoningLiffMessage(sessionId: string): FlexMessage {
  const liffUrl = `${process.env.LIFF_URL}/seasoning?session=${sessionId}`
  
  const bubble: FlexBubble = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🧂 使った調味料を選んでください', weight: 'bold', size: 'md' },
        { type: 'text', text: '複数選択できます', size: 'sm', color: '#888888', margin: 'sm' },
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: { type: 'uri', label: '調味料を選ぶ', uri: liffUrl },
          style: 'primary',
        }
      ]
    }
  }

  return {
    type: 'flex',
    altText: '調味料を選んでください',
    contents: bubble,
  }
}

// Send push notification
export async function sendPushMessage(lineUserId: string, messages: (TextMessage | FlexMessage)[]) {
  try {
    await lineClient.pushMessage(lineUserId, messages)
  } catch (error) {
    console.error('Error sending push message:', error)
    throw error
  }
}

// Send comment notification to editors
export async function notifyEditorsOfComment(
  editorLineIds: string[],
  commenterName: string,
  dishName: string,
  commentContent: string
) {
  const message: TextMessage = {
    type: 'text',
    text: `💬 ${commenterName}さんが「${dishName}」について質問しました：\n\n「${commentContent}」\n\nLINEで返信すると、コメントに追加されます。`,
  }

  for (const lineUserId of editorLineIds) {
    try {
      await sendPushMessage(lineUserId, [message])
    } catch (error) {
      console.error(`Failed to notify ${lineUserId}:`, error)
    }
  }
}
