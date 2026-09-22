# B7.S レビュー記録

## 対象

- ブランチ: `feature/backend-b7s-auth-security-performance`
- 最新フロントエンド: `feature/frontend-person-detail`
- フロントエンド本体の変更: なし

## 確認結果

- Supabase AuthのBearer tokenを使うJWTモードを追加
- JWTモードでBearer tokenがない場合は401を返す
- 無効なtokenをユーザーIDへ変換しない
- legacyモードは`X-User-ID`と`DEFAULT_USER_ID`をローカル互換用途に限定
- 認証結果はtoken本文ではなくハッシュをキーに短時間だけキャッシュ
- APIへ基本セキュリティヘッダーと`Cache-Control: no-store`を追加
- `Authorization`をCORS許可ヘッダーへ追加
- 記憶一覧GETを復元し、`limit=1〜100`を追加
- Supabase一覧取得向け複合インデックスを追加
- Pydantic Settingsのカンマ区切り環境変数を読み込めることを確認

## 自動確認

- [x] `uv run pytest -q` — 17 passed
- [x] `uv run ruff check .`
- [x] `uv run python -m compileall -q .`
- [x] `git diff --check`
- [x] JWTモード未認証 — 401 / `WWW-Authenticate: Bearer`
- [x] legacyモードのローカルUUID — 正常
- [x] 認証結果キャッシュ — 同一tokenでAuth API呼び出し1回
- [x] 記憶一覧の取得上限 — 1件指定を確認
- [x] APIセキュリティヘッダー — `nosniff`、`DENY`、`no-store`

## 残る確認

- [ ] 実Supabaseユーザーのログインから得たaccess tokenでのE2E
- [ ] 複数インスタンス環境での認証キャッシュ運用
- [ ] 100件を超える履歴のcursor pagination
- [ ] 最新フロントエンドの会話設定画面（現ブランチでは未実装）

## 判定

バックエンドの担当範囲ではpassです。実Supabase Auth tokenによるE2Eと、フロントエンドの未実装画面は別タスクとして残します。
