-- Jikka Recipe Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Core Tables
-- ============================================

-- Family Spaces (家族スペース)
CREATE TABLE IF NOT EXISTS family_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members (メンバー)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_space_id UUID REFERENCES family_spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_space_id, user_id),
  UNIQUE(line_user_id)
);

-- Invitations (招待リンク)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_space_id UUID REFERENCES family_spaces(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Master Data Tables
-- ============================================

-- Dishes (料理マスタ)
CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  template_key TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- Seasonings (調味料マスタ)
CREATE TABLE IF NOT EXISTS seasonings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  requires_photo BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

-- Dish Templates (料理テンプレート - 必須枠定義)
CREATE TABLE IF NOT EXISTS dish_templates (
  id TEXT PRIMARY KEY,
  dish_id TEXT REFERENCES dishes(id) ON DELETE CASCADE,
  slot_a_categories TEXT[] NOT NULL,
  slot_a_requires_photo BOOLEAN DEFAULT true,
  slot_b_categories TEXT[] NOT NULL,
  slot_b_requires_photo BOOLEAN DEFAULT false,
  seasoning_candidates TEXT[] NOT NULL
);

-- Ingredients (材料マスタ)
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- Dish Ingredient Presets (料理別材料プリセット)
CREATE TABLE IF NOT EXISTS dish_ingredient_presets (
  dish_id TEXT REFERENCES dishes(id) ON DELETE CASCADE,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT true,
  PRIMARY KEY (dish_id, ingredient_id)
);

-- ============================================
-- Session Tables
-- ============================================

-- Cooking Sessions (調理セッション)
CREATE TABLE IF NOT EXISTS cooking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_space_id UUID REFERENCES family_spaces(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) NOT NULL,
  dish_id TEXT REFERENCES dishes(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'cooking' 
    CHECK (status IN ('cooking', 'pending_photo', 'completed_light', 'completed_full')),
  servings INT,
  taste_status TEXT CHECK (taste_status IN ('thin', 'perfect', 'thick')),
  slot_a_satisfied BOOLEAN DEFAULT false,
  slot_b_satisfied BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cooking Events (調理イベントログ)
CREATE TABLE IF NOT EXISTS cooking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cooking_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Session Seasonings (セッション別調味料)
CREATE TABLE IF NOT EXISTS session_seasonings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cooking_sessions(id) ON DELETE CASCADE NOT NULL,
  seasoning_id TEXT REFERENCES seasonings(id) NOT NULL,
  photo_path TEXT,
  is_slot_a BOOLEAN DEFAULT false,
  is_slot_b BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Ingredients (セッション別材料)
CREATE TABLE IF NOT EXISTS session_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cooking_sessions(id) ON DELETE CASCADE NOT NULL,
  ingredient_id TEXT REFERENCES ingredients(id),
  custom_name TEXT,
  amount TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments (コメント)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cooking_sessions(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) NOT NULL,
  content TEXT NOT NULL,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'line')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Followup Questions (翌日質問 - 将来拡張用)
CREATE TABLE IF NOT EXISTS followup_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES cooking_sessions(id) ON DELETE CASCADE NOT NULL,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LINE Conversation States (LINE会話状態管理)
CREATE TABLE IF NOT EXISTS line_conversation_states (
  line_user_id TEXT PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  current_session_id UUID REFERENCES cooking_sessions(id),
  state TEXT NOT NULL DEFAULT 'idle',
  state_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_members_family_space ON members(family_space_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_line_user_id ON members(line_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_family ON cooking_sessions(family_space_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_member ON cooking_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_status ON cooking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_seasonings_session ON session_seasonings(session_id);
CREATE INDEX IF NOT EXISTS idx_session_ingredients_session ON session_ingredients(session_id);
CREATE INDEX IF NOT EXISTS idx_comments_session ON comments(session_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE family_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_seasonings ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_questions ENABLE ROW LEVEL SECURITY;

-- Family spaces: Users can see family spaces they belong to
CREATE POLICY "Users can view their family spaces" ON family_spaces
  FOR SELECT USING (
    id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create family spaces" ON family_spaces
  FOR INSERT WITH CHECK (true);

-- Members: Users can see members of their family space
CREATE POLICY "Users can view family members" ON members
  FOR SELECT USING (
    family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert themselves as members" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Invitations: Admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON invitations
  FOR ALL USING (
    family_space_id IN (
      SELECT family_space_id FROM members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view valid invitations by token" ON invitations
  FOR SELECT USING (
    used_at IS NULL AND expires_at > NOW()
  );

-- Cooking sessions: Family members can view
CREATE POLICY "Family members can view sessions" ON cooking_sessions
  FOR SELECT USING (
    family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Family members can create sessions" ON cooking_sessions
  FOR INSERT WITH CHECK (
    family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
  );

-- Session seasonings: Family members can view
CREATE POLICY "Family members can view session seasonings" ON session_seasonings
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM cooking_sessions 
      WHERE family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
    )
  );

-- Session ingredients: Family members can view and edit
CREATE POLICY "Family members can view session ingredients" ON session_ingredients
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM cooking_sessions 
      WHERE family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Family members can manage session ingredients" ON session_ingredients
  FOR ALL USING (
    session_id IN (
      SELECT id FROM cooking_sessions 
      WHERE family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
    )
  );

-- Comments: Family members can view and create
CREATE POLICY "Family members can view comments" ON comments
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM cooking_sessions 
      WHERE family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Family members can create comments" ON comments
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM cooking_sessions 
      WHERE family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
    )
  );

-- Cooking events: Family members can view
CREATE POLICY "Family members can view cooking events" ON cooking_events
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM cooking_sessions 
      WHERE family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
    )
  );

-- Followup questions: Family members can view
CREATE POLICY "Family members can view followup questions" ON followup_questions
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM cooking_sessions 
      WHERE family_space_id IN (SELECT family_space_id FROM members WHERE user_id = auth.uid())
    )
  );
