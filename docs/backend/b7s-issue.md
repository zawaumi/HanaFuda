# B7.S - Supabase Auth認証・セキュリティ・パフォーマンス訂正

## 概要

B6.3までのセキュリティ対策とB7.1のパフォーマンス対策を見直し、Supabase Authを利用した本番認証へ進める。

## やること

- `Authorization: Bearer <access_token>` をSupabase Authで検証する
- 本番では`X-User-ID`と`DEFAULT_USER_ID`を認証に使わない
- ローカル互換用の`AUTH_MODE=legacy`を明示的な開発設定として残す
- 認証結果を短時間だけキャッシュし、毎回のAuth API問い合わせを避ける
- AuthorizationヘッダーをCORS許可対象へ追加する
- APIレスポンスへ基本的なセキュリティヘッダーを追加する
- 記憶一覧APIの欠落を修正し、取得件数上限を追加する
- Supabaseの一覧取得向け複合インデックスを追加する
- 最新フロントエンドのAPI契約とバックエンド仕様書を再照合する
- 得られた教訓をQiita記事用Markdownとして残す

## 完了条件

- JWTモードでBearer tokenがないリクエストは401になる
- Supabase Authで検証したユーザーIDだけがデータアクセスに使われる
- legacyモードはローカル互換用として明記され、本番設定がJWTモードになる
- API一覧取得が1〜100件に制限される
- 複合インデックスの追加マイグレーションが用意される
- セキュリティヘッダーとno-storeがAPIレスポンスに付く
- backendテスト、Ruff、compileallが成功する
- `frontend/` のソースコードを変更しない
