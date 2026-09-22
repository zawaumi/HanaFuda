# 認証（Supabase Auth）

フロントエンドはメールアドレスとパスワードによる Supabase Auth を使います。セッションは Cookie に保存され、`src/proxy.ts` が未ログインのアクセスを `/login` へ送ります。

## 設定手順

1. Supabase Dashboard > Connect / Settings > API Keys から `Project URL` と `publishable` キーを取得します。
2. `frontend/.env.local` を作成し、次の2行を設定します。値は `.env.example` を参照してください。

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. 開発サーバーを再起動します。環境変数は起動時にのみ読み込まれます。
4. Supabase Dashboard > Authentication > URL Configuration の `Site URL` に `http://localhost:3000` を設定します。
5. メール確認を有効にしている場合は、Email テンプレートのリンク先を次の形式にします。

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```

`service role` キーはブラウザーへ配布されるため、`NEXT_PUBLIC_` の変数には絶対に設定しないでください。

## 未設定のときの動作

環境変数が揃っていない場合、ログインが必要な画面はすべて `/login` へ送られ、`/login` は設定手順を表示します。認証を素通りさせる分岐は置いていません。

## 画面とファイル

| 役割 | ファイル |
| --- | --- |
| ログイン・新規登録の画面 | `src/features/auth/auth-form.tsx` |
| ルート保護とセッション更新 | `src/proxy.ts` |
| ブラウザー用クライアント | `src/lib/supabase/browser.ts` |
| サーバー用クライアント | `src/lib/supabase/server.ts` |
| メール確認リンクの受け口 | `src/app/auth/confirm/route.ts` |

公開ルートは `/login`、`/signup`、`/auth/*` の3つです。

## 既知の問題: バックエンドがユーザーを検証していない

**この状態のまま本番で使わないでください。**

現在の FastAPI は `X-User-Id` ヘッダーをそのまま信用します。JWT の検証は行われず、ヘッダーが無い場合は `DEFAULT_USER_ID` にフォールバックします（`backend/api/dependencies.py` の `get_current_user_id`）。さらに `backend/main.py` の CORS 設定が許可するヘッダーは `Content-Type` と `X-User-Id` のみで、`Authorization` を送ることができません。

そのためフロントエンドは、ログイン中のユーザーの Supabase UUID を `X-User-Id` に入れて送っています（`src/lib/api/user-header.ts`）。**この方式では、誰でもヘッダーを他人の UUID に書き換えることで、他人のデータを読み書きできます。**

### 解消に必要なバックエンド側の変更

フロントエンド担当は `backend/` を変更しない取り決めのため、以下はバックエンド担当への依頼事項です。

1. CORS の `allow_headers` に `Authorization` を追加する。
2. `get_current_user_id` を、`Authorization: Bearer <token>` の Supabase JWT を検証して `sub` クレームを返す実装に置き換える。検証には Supabase プロジェクトの JWT secret、または JWKS を使う。
3. `DEFAULT_USER_ID` へのフォールバックを廃止し、トークンが無い場合は 401 を返す。
4. `public.users` を `auth.users(id)` と対応付ける。サインアップ時に行が作られるよう、`auth.users` への insert トリガーか、バックエンド側での upsert を用意する。現在の `public.users` は `gen_random_uuid()` で独自に発番しており、Supabase のアカウントと紐づいていない（`backend/supabase/migrations/0001_initial_schema.sql`）。
5. 各テーブルに RLS を設定する。

バックエンドが Bearer トークンを検証するようになったら、フロントエンドは `src/lib/api/user-header.ts` を削除し、`Authorization` ヘッダーを送る実装へ差し替えます。
