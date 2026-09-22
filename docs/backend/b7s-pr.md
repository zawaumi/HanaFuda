# B7.S PR本文案

## 概要

Supabase Authを利用した本番向け認証境界をバックエンドへ追加し、既存のセキュリティ対策とパフォーマンス対策を訂正しました。

フロントエンド本体は変更せず、Bearer tokenを受け取れるバックエンド契約と、ローカル接続用の明示的な互換モードを整備しています。

## 変更内容

- Supabase Authの`Authorization: Bearer`トークン検証を追加
- 認証成功時のSupabaseユーザーIDをデータ分離へ利用
- 認証結果を短時間キャッシュし、Auth APIへの不要な反復問い合わせを削減
- 本番`AUTH_MODE=jwt`、ローカル互換`AUTH_MODE=legacy`を明確化
- `Authorization`をCORS許可ヘッダーへ追加
- TrustedHostと併用するセキュリティレスポンスヘッダーを追加
- APIレスポンスへ`Cache-Control: no-store`を追加
- B7.3リファクタリングで抜けていた記憶一覧GETを復元
- 記憶一覧を含むコレクション取得へ1〜100件の上限を追加
- Supabase一覧取得向け複合インデックスの追加マイグレーションを作成
- Pydantic Settingsのカンマ区切り環境変数の読み込みを修正
- Supabase認証・API契約・パフォーマンスのドキュメントを更新
- OrcaRouterの計測値を性能ベースラインとして記録
- Qiita記事用の学習記録を追加

## OrcaRouter計測値

計測時点の表示値を記録しています。`0.000026`の単位と、最後の`0%`の指標名は未確認です。

- Orcaの値: `0.000026`（単位未確認）
- Total tokens: `9.6K`
- Requests: `6`
- Average latency: `11.5s`
- Adoption: `83.3%`
- Fallback rate: `0%`
- 追加表示の`0%`: 指標名未提示

サンプルは6リクエストのため、確定評価ではなく初期ベースラインとして扱います。平均レイテンシ`11.5s`は今後の改善対象です。

## 動作確認

- [x] `uv run pytest -q`
- [x] `uv run ruff check .`
- [x] `uv run python -m compileall -q .`
- [x] `git diff --check`
- [x] JWTモードで未認証リクエストが401になることをテスト
- [x] Auth検証結果の短期キャッシュをテスト
- [x] 記憶一覧のlimitをテスト
- [x] APIセキュリティヘッダーをテスト
- [x] `frontend/` を変更していないことを確認
- [ ] 実Supabase Authのログイン済みアクセストークンによるE2E確認

## レビュー項目

レビュアーの方は、以下の項目をご確認ください。

- [ ] 本番で`AUTH_MODE=jwt`が設定される
- [ ] `X-User-ID`が本番認証の代替手段になっていない
- [ ] Supabaseのserver-only keyとユーザーアクセストークンをログへ出力しない
- [ ] 認証キャッシュのTTLと失効反映時間が許容範囲である
- [ ] Authorizationヘッダーを含むCORS設定が環境ごとに適切である
- [ ] APIレスポンスがブラウザキャッシュへ保存されない
- [ ] 記憶一覧GETが最新フロントエンドの契約と一致している
- [ ] 追加インデックスを本番DBへ順番どおり適用できる
- [ ] フロントエンド本体を変更していない
- [ ] OrcaRouterの値の単位、Adoptionの定義、追加表示の`0%`の指標名をダッシュボードで確認する
- [ ] 平均レイテンシ`11.5s`を許容できるか、タイムアウト値と合わせて確認する

## 関連Issue

B7.S - Supabase Auth認証・セキュリティ・パフォーマンス訂正
