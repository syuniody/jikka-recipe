// Database types for Supabase

export type Role = 'admin' | 'editor' | 'viewer'
export type SessionStatus = 'cooking' | 'pending_photo' | 'completed_light' | 'completed_full'
export type TasteStatus = 'thin' | 'perfect' | 'thick'
export type CommentSource = 'web' | 'line'

export interface FamilySpace {
  id: string
  name: string
  created_at: string
}

export interface Member {
  id: string
  family_space_id: string
  user_id: string | null
  line_user_id: string | null
  display_name: string
  role: Role
  created_at: string
}

export interface Invitation {
  id: string
  family_space_id: string
  token: string
  role: Role
  expires_at: string
  used_at: string | null
  created_by: string
  created_at: string
}

export interface Dish {
  id: string
  name: string
  category: string
  template_key: string
  sort_order: number
}

export interface Seasoning {
  id: string
  name: string
  category: string | null
  requires_photo: boolean
  sort_order: number
}

export interface DishTemplate {
  id: string
  dish_id: string
  slot_a_categories: string[]
  slot_a_requires_photo: boolean
  slot_b_categories: string[]
  slot_b_requires_photo: boolean
  seasoning_candidates: string[]
}

export interface Ingredient {
  id: string
  name: string
  sort_order: number
}

export interface DishIngredientPreset {
  dish_id: string
  ingredient_id: string
  is_default: boolean
}

export interface CookingSession {
  id: string
  family_space_id: string
  member_id: string
  dish_id: string
  status: SessionStatus
  servings: number | null
  taste_status: TasteStatus | null
  slot_a_satisfied: boolean
  slot_b_satisfied: boolean
  started_at: string
  completed_at: string | null
  created_at: string
  // Joined fields
  dish?: Dish
  member?: Member
}

export interface CookingEvent {
  id: string
  session_id: string
  event_type: string
  timestamp: string
}

export interface SessionSeasoning {
  id: string
  session_id: string
  seasoning_id: string
  photo_path: string | null
  is_slot_a: boolean
  is_slot_b: boolean
  created_at: string
  // Joined
  seasoning?: Seasoning
}

export interface SessionIngredient {
  id: string
  session_id: string
  ingredient_id: string | null
  custom_name: string | null
  amount: string | null
  created_at: string
  // Joined
  ingredient?: Ingredient
}

export interface Comment {
  id: string
  session_id: string
  member_id: string
  content: string
  source: CommentSource
  created_at: string
  // Joined
  member?: Member
}

export interface FollowupQuestion {
  id: string
  session_id: string
  question_key: string
  question_text: string
  answer: string | null
  answered_at: string | null
  created_at: string
}

export interface LineConversationState {
  line_user_id: string
  member_id: string | null
  current_session_id: string | null
  state: string
  state_data: Record<string, unknown>
  updated_at: string
}
