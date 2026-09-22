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
| APIへ送る認証ヘッダー | `src/lib/api/auth-header.ts` |

公開ルートは `/login`、`/signup`、`/auth/*` の3つです。

## バックエンドとの認証契約

フロントエンドは API 呼び出しごとに `Authorization: Bearer <access token>` を送ります（`src/lib/api/auth-header.ts`）。トークンは Supabase のセッションから取得し、期限切れの場合は `getSession` が自動で更新します。

バックエンドは `backend/api/dependencies.py` の `get_current_user_id` でこれを検証し、Supabase のユーザー ID を取り出してデータを分離します。挙動は `AUTH_MODE` で変わります。

| `AUTH_MODE` | Bearer あり | Bearer なし |
| --- | --- | --- |
| `jwt`（既定） | トークンを検証して利用者を特定 | 401 |
| `legacy` | トークンを検証して利用者を特定 | `DEFAULT_USER_ID` として扱う |

`public.users` の行は、最初の `GET /api/profile` で遅延作成されます（`backend/api/routes/profile.py` の `_ensure_profile`）。サインアップ用のトリガーは不要です。

## 認証を外してローカル確認する

バックエンドと AI の疎通だけを確認したい場合は、アカウントを作らずに動かせます。

1. `frontend/.env.local` に `NEXT_PUBLIC_AUTH_ENABLED=false` を設定します。`src/proxy.ts` がルート保護を行わなくなり、`Authorization` ヘッダーも送られなくなります。
2. `backend/.env` に `AUTH_MODE=legacy` を設定します。**これを設定しないと `AUTH_MODE` は既定の `jwt` となり、全リクエストが 401 になります。**
3. 両方のサーバーを再起動します。

この状態では全員が `DEFAULT_USER_ID` として動作し、データは分離されません。デプロイ環境には絶対に設定しないでください。
