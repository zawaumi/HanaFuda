# HanaFuda Backend API

バックエンドとフロントエンドの結合点は、FastAPIが公開するJSON APIです。フロントエンドはSupabaseやOrcaRouterへ直接接続しません。

## 開発環境

```env
# frontend/.env.local
NEXT_PUBLIC_API_MODE=remote
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

バックエンドは `cd backend && uv run fastapi dev main.py` で起動します。開発Originは `CORS_ORIGINS` で指定し、カンマ区切りで複数指定できます。

本番の認証方式はSupabase Authのアクセストークンです。`Authorization: Bearer <access_token>` を送ると、バックエンドがSupabase Authで検証し、トークンのユーザーIDをデータ分離に使用します。検証結果は短時間だけメモリへキャッシュします。

ローカルで最新フロントエンドを接続する場合だけ、バックエンドの `AUTH_MODE=legacy` を明示して `X-User-ID: <UUID>` または `DEFAULT_USER_ID` を利用できます。`AUTH_MODE=legacy` を本番へ持ち込んではいけません。

## エンドポイント

| Method | Path | 成功レスポンス |
| --- | --- | --- |
| `GET` / `PATCH` | `/api/profile` | プロフィール |
| `GET` / `POST` | `/api/persons` | 相手一覧 / 登録した相手 |
| `GET` / `PATCH` | `/api/persons/{person_id}` | 相手情報 |
| `GET` / `POST` | `/api/conversations` | 会話履歴 / 保存した会話 |
| `GET` / `POST` | `/api/persons/{person_id}/memories` | 記憶一覧 / 保存した記憶 |
| `POST` | `/api/deck/generate` | `{summary, cards}` |

コレクション取得APIの `limit` は1〜100で、既定値は100です。詳細なリクエスト・レスポンス型は `/docs` のOpenAPIと [`deck-generate.md`](./deck-generate.md) を正とします。JSONキーはすべてsnake_caseです。

## ステータスとエラー

エラー本文は最低限 `{"detail":"利用者向けメッセージ"}` を持ちます。

| Status | 用途 |
| ---: | --- |
| 200 / 201 | 成功 |
| 401 | Bearer tokenがない、または無効 |
| 400 | ヘッダーなどの形式不正 |
| 404 | 対象リソースが存在しない |
| 422 | Pydanticによる入力検証失敗 |
| 502 | AI・外部サービスの失敗 |
| 503 | DB・サーバー設定の失敗 |

フロントエンド側は、通信中・タイムアウト・ネットワーク失敗と上記HTTPエラーを区別して表示します。
