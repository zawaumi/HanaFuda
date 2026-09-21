# HanaFuda Backend API

バックエンドとフロントエンドの結合点は、FastAPIが公開するJSON APIです。フロントエンドはSupabaseやOrcaRouterへ直接接続しません。

## 開発環境

```env
# frontend/.env.local
NEXT_PUBLIC_API_MODE=remote
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

バックエンドは `cd backend && uv run fastapi dev main.py` で起動します。開発Originは `CORS_ORIGINS` で指定し、カンマ区切りで複数指定できます。

認証を導入するまでのMVPでは、任意の `X-User-ID: <UUID>` ヘッダーでユーザーを切り替えます。省略時は `DEFAULT_USER_ID` が使われます。これはデモ用の境界であり、本番ではSupabase AuthのJWT検証へ置き換える必要があります。

## エンドポイント

| Method | Path | 成功レスポンス |
| --- | --- | --- |
| `GET` / `PATCH` | `/api/profile` | プロフィール |
| `GET` / `POST` | `/api/persons` | 相手一覧 / 登録した相手 |
| `GET` / `PATCH` | `/api/persons/{person_id}` | 相手情報 |
| `GET` / `POST` | `/api/conversations` | 会話履歴 / 保存した会話 |
| `POST` | `/api/persons/{person_id}/memories` | 保存した記憶 |
| `POST` | `/api/deck/generate` | `{summary, cards}` |

詳細なリクエスト・レスポンス型は `/docs` のOpenAPIと [`deck-generate.md`](./deck-generate.md) を正とします。JSONキーはすべてsnake_caseです。

## ステータスとエラー

エラー本文は最低限 `{"detail":"利用者向けメッセージ"}` を持ちます。

| Status | 用途 |
| ---: | --- |
| 200 / 201 | 成功 |
| 400 | ヘッダーなどの形式不正 |
| 404 | ユーザーのデータが存在しない |
| 422 | Pydanticによる入力検証失敗 |
| 502 | AI・外部サービスの失敗 |
| 503 | DB・サーバー設定の失敗 |

フロントエンド側は、通信中・タイムアウト・ネットワーク失敗と上記HTTPエラーを区別して表示します。
