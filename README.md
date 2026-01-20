# 実家の味 (Jikka Recipe)

親の料理を再現できる形で保存するサービス。親はLINEで入力、子はWebで閲覧・補完・質問できます。

## 🎯 プロジェクト概要

- **目的**: 実家の味（親の料理）を再現できる形で保存する
- **親向け**: LINEで料理セッションを開始し、料理中は4タップだけ。料理後は当日フローで簡単に記録
- **子向け**: スマホ最適化Webでレシピ一覧/詳細を閲覧、材料編集、コメントで親に質問
- **通知**: コメントが投稿されたら親のLINEに通知（材料編集は通知しない）

## 🔧 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロント | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| バックエンド | Next.js API Routes |
| 認証 | Supabase Auth (メール+パスワード) |
| DB | Supabase PostgreSQL |
| Storage | Supabase Storage (署名付きURL) |
| LINE連携 | LINE Messaging API + LIFF |
| デプロイ | Vercel |

## 📱 画面構成

### 子Web（スマホ最適化）

1. **ホーム/ダッシュボード** (`/`): 未回収一覧、最新レシピ
2. **レシピ一覧** (`/recipes`): 料理名、日付、作った人、バッジ
3. **レシピ詳細** (`/recipes/[id]`): 味のキー、材料、作り方、味調整、コメント
4. **材料編集** (`/recipes/[id]/ingredients`): チェックリスト＋自由追加
5. **設定/家族管理** (`/settings`): メンバー一覧、招待リンク発行

### LINE（親向け）

1. **招待リンク受諾** → 家族スペースに紐付け
2. **料理選択** → 最近/よく作る + 定番10品
3. **4タップ操作** → 調味料入れた / 味見 / 完成
4. **当日フロー** → 人数 → LIFF調味料選択 → 写真送信

## 🚀 セットアップ手順

### 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com)でプロジェクト作成
2. Project Settings > API から以下を取得:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - anon/public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - service_role key (`SUPABASE_SERVICE_ROLE_KEY`)

### 2. データベースセットアップ

```bash
# Supabase SQL Editorで実行
# 1. supabase/schema.sql を実行
# 2. supabase/seed.sql を実行
```

### 3. Storage設定

1. Supabase Dashboard > Storage
2. 新しいバケット `recipe-photos` を作成
3. バケットをprivateに設定（署名付きURLでアクセス）

### 4. LINE設定

1. [LINE Developers Console](https://developers.line.biz/)でプロバイダー作成
2. Messaging APIチャネルを作成
   - Channel access token (long-lived)を発行 → `LINE_CHANNEL_ACCESS_TOKEN`
   - Channel secret → `LINE_CHANNEL_SECRET`
3. LIFFアプリを作成
   - LIFF IDを取得 → `NEXT_PUBLIC_LIFF_ID`
   - エンドポイントURL: `https://your-app.vercel.app/liff`

### 5. 環境変数設定

```bash
cp .env.example .env.local
# .env.localを編集して各値を設定
```

### 6. 開発サーバー起動

```bash
npm install
npm run dev
```

### 7. Vercelデプロイ

1. GitHubリポジトリにpush
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

### 8. LINE Webhook設定

デプロイ後、LINE Developers Consoleで:
1. Webhook URL: `https://your-app.vercel.app/api/line/webhook`
2. Use webhookを有効化
3. Webhook URLの検証

## 📝 受け入れ条件チェックリスト

### 親（LINE）側

- [ ] 招待リンクをタップ → 家族スペースに参加できる
- [ ] 「開始」を送信 → 料理選択画面が表示される
- [ ] 料理を選択 → 4タップボタンが表示される
- [ ] 「調味料入れた」タップ → 記録される
- [ ] 「味見」タップ（薄い/ちょうど/濃い） → 記録される
- [ ] 「完成」タップ → 人数選択画面が表示される
- [ ] 人数を選択 → LIFF調味料選択画面が開く
- [ ] 調味料を選択して送信 → 写真要求が来る（必須のみ）
- [ ] 写真を送信 → 次の写真要求 or 完了メッセージ
- [ ] 子からコメントがあったらLINE通知が来る

### 子（Web）側

- [ ] メール+パスワードで新規登録できる
- [ ] 新規登録時に家族スペースを作成できる
- [ ] ログイン/ログアウトできる
- [ ] ホーム画面で未回収一覧と最新レシピが見られる
- [ ] レシピ一覧でバッジ（ライト完成/情報回収中/材料未設定）が見られる
- [ ] レシピ詳細で調味料写真、材料、作り方、味調整が見られる
- [ ] 材料を編集できる（チェック + 自由追加）
- [ ] 材料編集しても親に通知されない
- [ ] コメントを投稿できる
- [ ] コメント投稿すると親にLINE通知される
- [ ] 招待リンクを発行できる（admin権限）

### データ・セキュリティ

- [ ] 家族スペース外からのアクセスは拒否される
- [ ] 画像は署名付きURLでのみアクセス可能
- [ ] 招待リンクは7日で失効
- [ ] 招待リンクは1回使用で無効化

## 📊 DBスキーマ概要

```
family_spaces (家族スペース)
  └── members (メンバー)
      ├── user_id (Supabase Auth)
      └── line_user_id (LINE連携)

cooking_sessions (調理セッション)
  ├── dish_id → dishes (料理マスタ)
  ├── session_seasonings (使用調味料)
  ├── session_ingredients (材料)
  ├── cooking_events (イベントログ)
  └── comments (コメント)

invitations (招待リンク)
line_conversation_states (LINE会話状態)
```

## 🔮 将来拡張（MVP範囲外）

- Week2: 唐揚げ等の追加料理
- 翌日質問の完全実装
- リマインド通知
- レシピ学習ループ

## 📁 ディレクトリ構成

```
webapp/
├── src/
│   ├── app/
│   │   ├── (auth)/           # 認証関連
│   │   ├── (dashboard)/      # メイン画面
│   │   ├── api/              # API Routes
│   │   ├── invite/           # 招待ページ
│   │   └── liff/             # LIFF画面
│   ├── components/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth.ts
│   │   └── line.ts
│   └── types/
├── supabase/
│   ├── schema.sql
│   └── seed.sql
├── public/
└── .env.example
```

## 🐛 トラブルシューティング

### LINE Webhookが動かない

1. Webhook URLが正しいか確認
2. Channel secretが正しいか確認
3. Use webhookが有効か確認
4. Vercelのログを確認

### 画像がアップロードできない

1. Supabase Storageのバケットが存在するか確認
2. service_role keyが正しいか確認
3. ファイルサイズ制限を確認

### 認証エラー

1. Supabase URLとキーが正しいか確認
2. RLSポリシーを確認
3. ブラウザのCookieを確認
