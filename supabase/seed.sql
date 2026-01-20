-- Jikka Recipe Seed Data
-- Run this after schema.sql

-- ============================================
-- Dishes (料理マスタ) - Week 1の10品
-- ============================================

INSERT INTO dishes (id, name, category, template_key, sort_order) VALUES
  ('nikujaga', '肉じゃが', 'nimono', 'nimono', 1),
  ('chikuzenni', '筑前煮', 'nimono', 'nimono', 2),
  ('misoshiru', '味噌汁', 'soup', 'soup', 3),
  ('tonjiru', '豚汁', 'soup', 'soup', 4),
  ('shogayaki', '生姜焼き', 'itamemono', 'itamemono', 5),
  ('hamburg', 'ハンバーグ', 'hamburg', 'hamburg', 6),
  ('curry', 'カレー', 'curry', 'curry', 7),
  ('oyakodon', '親子丼', 'donburi', 'donburi', 8),
  ('kinpira', 'きんぴらごぼう', 'itamemono', 'itamemono', 9),
  ('dashimaki', 'だし巻き卵', 'dashimaki', 'dashimaki', 10)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- Seasonings (調味料マスタ)
-- ============================================

INSERT INTO seasonings (id, name, category, requires_photo, sort_order) VALUES
  -- 味噌
  ('miso_red', '赤味噌', 'miso', true, 1),
  ('miso_white', '白味噌', 'miso', true, 2),
  ('miso_awase', '合わせ味噌', 'miso', true, 3),
  -- だし
  ('dashi_powder', '顆粒だし', 'dashi', true, 10),
  ('dashi_pack', 'だしパック', 'dashi', true, 11),
  ('dashi_stock', 'だし汁', 'dashi', true, 12),
  ('no_dashi', 'だしなし', 'dashi', false, 13),
  -- 醤油・基本
  ('soy_sauce', '醤油', 'soy_sauce', true, 20),
  ('mirin', 'みりん', 'sweetness', true, 21),
  ('sake', '料理酒', 'sake', true, 22),
  ('sugar', '砂糖', 'sweetness', false, 23),
  ('no_sweetness', '甘みなし', 'sweetness', false, 24),
  -- 油
  ('sesame_oil', 'ごま油', 'oil', true, 30),
  -- ソース
  ('ketchup', 'ケチャップ', 'sauce', true, 40),
  ('chuno_sauce', '中濃ソース', 'sauce', true, 41),
  ('worcester', 'ウスターソース', 'sauce', true, 42),
  ('commercial_sauce', '市販ソース', 'sauce', true, 43),
  ('soy_sauce_sauce', '醤油ベースソース', 'sauce', true, 44),
  -- つなぎ
  ('breadcrumbs', 'パン粉', 'binder', false, 50),
  ('milk', '牛乳', 'binder', false, 51),
  ('egg', '卵', 'binder', false, 52),
  ('no_binder', 'つなぎなし', 'binder', false, 53),
  -- カレールー
  ('roux_vermont', 'バーモントカレー', 'roux', true, 60),
  ('roux_java', 'ジャワカレー', 'roux', true, 61),
  ('roux_kokumaro', 'こくまろカレー', 'roux', true, 62),
  ('roux_other', 'その他ルー', 'roux', true, 63),
  -- 隠し味
  ('secret_chocolate', '隠し味：チョコ', 'secret', false, 70),
  ('secret_coffee', '隠し味：コーヒー', 'secret', false, 71),
  ('secret_honey', '隠し味：はちみつ', 'secret', false, 72),
  ('secret_none', '隠し味なし', 'secret', false, 73),
  -- 丼物ベース
  ('mentsuyu', 'めんつゆ', 'base', true, 80),
  ('mentsuyu_complete', 'めんつゆで完結', 'dashi', false, 81),
  -- だし巻き卵
  ('salt_seasoning', '塩', 'seasoning', false, 90),
  ('soy_seasoning', '醤油', 'seasoning', false, 91),
  ('no_seasoning', '味付けなし', 'seasoning', false, 92)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- Dish Templates (料理テンプレート)
-- ============================================

INSERT INTO dish_templates (id, dish_id, slot_a_categories, slot_a_requires_photo, slot_b_categories, slot_b_requires_photo, seasoning_candidates) VALUES
  -- 汁物（味噌汁/豚汁）
  ('template_soup', 'misoshiru', ARRAY['miso'], true, ARRAY['dashi'], true, 
   ARRAY['miso_red', 'miso_white', 'miso_awase', 'dashi_powder', 'dashi_pack', 'no_dashi']),
  ('template_soup_tonjiru', 'tonjiru', ARRAY['miso'], true, ARRAY['dashi'], true, 
   ARRAY['miso_red', 'miso_white', 'miso_awase', 'dashi_powder', 'dashi_pack', 'no_dashi']),
  -- 煮物（肉じゃが/筑前煮）
  ('template_nimono', 'nikujaga', ARRAY['soy_sauce'], true, ARRAY['sweetness'], false,
   ARRAY['soy_sauce', 'mirin', 'sugar', 'sake', 'no_sweetness']),
  ('template_nimono_chikuzen', 'chikuzenni', ARRAY['soy_sauce'], true, ARRAY['sweetness'], false,
   ARRAY['soy_sauce', 'mirin', 'sugar', 'sake', 'no_sweetness']),
  -- 炒め物（生姜焼き/きんぴら）
  ('template_itamemono', 'shogayaki', ARRAY['soy_sauce'], true, ARRAY['sweetness'], false,
   ARRAY['soy_sauce', 'mirin', 'sugar', 'sake', 'no_sweetness']),
  ('template_itamemono_kinpira', 'kinpira', ARRAY['soy_sauce'], true, ARRAY['sweetness'], false,
   ARRAY['soy_sauce', 'mirin', 'sugar', 'sake', 'sesame_oil', 'no_sweetness']),
  -- ハンバーグ
  ('template_hamburg', 'hamburg', ARRAY['sauce'], true, ARRAY['binder'], false,
   ARRAY['ketchup', 'chuno_sauce', 'worcester', 'commercial_sauce', 'soy_sauce_sauce', 'breadcrumbs', 'milk', 'egg', 'no_binder']),
  -- カレー
  ('template_curry', 'curry', ARRAY['roux'], true, ARRAY['secret'], false,
   ARRAY['roux_vermont', 'roux_java', 'roux_kokumaro', 'roux_other', 'secret_chocolate', 'secret_coffee', 'secret_honey', 'secret_none']),
  -- 親子丼
  ('template_donburi', 'oyakodon', ARRAY['base'], true, ARRAY['dashi'], false,
   ARRAY['soy_sauce', 'mentsuyu', 'dashi_powder', 'mentsuyu_complete']),
  -- だし巻き卵
  ('template_dashimaki', 'dashimaki', ARRAY['dashi'], true, ARRAY['seasoning'], false,
   ARRAY['dashi_powder', 'dashi_stock', 'no_dashi', 'salt_seasoning', 'soy_seasoning', 'no_seasoning'])
ON CONFLICT (id) DO UPDATE SET seasoning_candidates = EXCLUDED.seasoning_candidates;

-- ============================================
-- Ingredients (材料マスタ)
-- ============================================

INSERT INTO ingredients (id, name, sort_order) VALUES
  -- 肉
  ('beef', '牛肉', 1),
  ('pork', '豚肉', 2),
  ('pork_belly', '豚バラ肉', 3),
  ('chicken_thigh', '鶏もも肉', 4),
  ('chicken_breast', '鶏むね肉', 5),
  ('ground_beef', '牛ひき肉', 6),
  ('ground_pork', '豚ひき肉', 7),
  ('ground_mixed', '合挽き肉', 8),
  -- 野菜
  ('potato', 'じゃがいも', 20),
  ('onion', '玉ねぎ', 21),
  ('carrot', '人参', 22),
  ('shirataki', 'しらたき', 23),
  ('daikon', '大根', 24),
  ('gobo', 'ごぼう', 25),
  ('renkon', 'れんこん', 26),
  ('konnyaku', 'こんにゃく', 27),
  ('shiitake', '椎茸', 28),
  ('green_onion', 'ねぎ', 29),
  ('cabbage', 'キャベツ', 30),
  ('ginger', '生姜', 31),
  ('garlic', 'にんにく', 32),
  ('tofu', '豆腐', 33),
  ('aburaage', '油揚げ', 34),
  ('wakame', 'わかめ', 35),
  ('egg', '卵', 36),
  ('rice', 'ご飯', 37),
  ('sesame', 'ごま', 38),
  ('tougarashi', '唐辛子', 39)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- Dish Ingredient Presets (料理別材料プリセット)
-- ============================================

-- 肉じゃが
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('nikujaga', 'beef', true),
  ('nikujaga', 'potato', true),
  ('nikujaga', 'onion', true),
  ('nikujaga', 'carrot', true),
  ('nikujaga', 'shirataki', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- 筑前煮
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('chikuzenni', 'chicken_thigh', true),
  ('chikuzenni', 'carrot', true),
  ('chikuzenni', 'gobo', true),
  ('chikuzenni', 'renkon', true),
  ('chikuzenni', 'konnyaku', true),
  ('chikuzenni', 'shiitake', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- 味噌汁
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('misoshiru', 'tofu', true),
  ('misoshiru', 'wakame', true),
  ('misoshiru', 'green_onion', true),
  ('misoshiru', 'aburaage', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- 豚汁
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('tonjiru', 'pork_belly', true),
  ('tonjiru', 'daikon', true),
  ('tonjiru', 'carrot', true),
  ('tonjiru', 'gobo', true),
  ('tonjiru', 'konnyaku', true),
  ('tonjiru', 'tofu', true),
  ('tonjiru', 'green_onion', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- 生姜焼き
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('shogayaki', 'pork', true),
  ('shogayaki', 'onion', true),
  ('shogayaki', 'ginger', true),
  ('shogayaki', 'cabbage', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- ハンバーグ
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('hamburg', 'ground_mixed', true),
  ('hamburg', 'onion', true),
  ('hamburg', 'egg', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- カレー
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('curry', 'beef', true),
  ('curry', 'onion', true),
  ('curry', 'potato', true),
  ('curry', 'carrot', true),
  ('curry', 'rice', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- 親子丼
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('oyakodon', 'chicken_thigh', true),
  ('oyakodon', 'onion', true),
  ('oyakodon', 'egg', true),
  ('oyakodon', 'rice', true),
  ('oyakodon', 'green_onion', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- きんぴらごぼう
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('kinpira', 'gobo', true),
  ('kinpira', 'carrot', true),
  ('kinpira', 'sesame', true),
  ('kinpira', 'tougarashi', true)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- だし巻き卵
INSERT INTO dish_ingredient_presets (dish_id, ingredient_id, is_default) VALUES
  ('dashimaki', 'egg', true),
  ('dashimaki', 'green_onion', false)
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;
