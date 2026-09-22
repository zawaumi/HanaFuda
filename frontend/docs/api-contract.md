# FastAPI連携方針

## 境界

フロントエンドとバックエンドの結合点はHTTP APIとJSONだけです。フロントエンドからSupabaseやLLM APIを直接呼び出しません。

## ベースURL

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_MODE=mock
```

`NEXT_PUBLIC_API_MODE` は `mock` または `remote` を指定します。未指定時は `mock` です。公開環境変数はビルド時に固定されるため、接続先ごとにビルド設定を分けます。

画面は `src/lib/api` の `dataSource` を利用し、直接 `fetch` を呼びません。`mock` と `remote` は同じ `HanaFudaDataSource` インターフェースと型を返します。

```ts
import { dataSource } from "@/lib/api";

const persons = await dataSource.getPersons({ search: "佐藤" });
```

## 通信ルール

- APIパスは `/api` から始める
- JSONのキー名はsnake_caseで受け取る
- リクエストには `Content-Type: application/json` を指定する
- 認証方式決定後はAPIクライアントで認証情報を一括付与する
- タイムアウト、ネットワークエラー、非2xxレスポンスを区別する
- 画面には利用者が次の操作を判断できる日本語メッセージを出す

通信エラーは `ApiError.kind` で判定します。主な値は `validation`、`not_found`、`server`、`network`、`timeout` です。FastAPIの422レスポンス本文は `ApiError.details` に保持します。

## 想定ステータス

| Status | フロントエンドの扱い |
|---:|---|
| 200/201 | 正常データを表示 |
| 401 | ログイン導線へ移動、または認証エラーを表示 |
| 404 | 対象が見つからない画面を表示 |
| 422 | 入力項目ごとのエラーを表示 |
| 500以上 | 再試行可能な共通エラーを表示 |

## MVP API

| Method | Path | 用途 |
|---|---|---|
| `POST` | `/api/deck/generate` | 会話デッキ生成 |
| `GET` / `POST` | `/api/persons` | 相手一覧・登録 |
| `GET` / `PATCH` | `/api/persons/{person_id}` | 相手詳細・更新 |
| `GET` / `POST` | `/api/conversations` | 会話履歴・結果保存 |
| `GET` / `POST` | `/api/persons/{person_id}/memories` | 記憶一覧・保存 |
| `GET` / `PATCH` | `/api/profile` | 自分のプロフィール |

## 実装との照合（2026-09-22）

`origin/develop` の FastAPI `schemas/models.py`・`schemas/deck.py`・`api/routers.py` と照合済み。相手・会話・記憶のIDはUUID文字列、日時はISO 8601文字列で扱います。デッキ生成は `user`、`person`、`context`、`history` を送信し、履歴ごとに確認済み記憶を紐づけます。生成レスポンスは `summary` と3〜5枚の `cards` です。

実API利用時は `NEXT_PUBLIC_API_MODE=remote`、`NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`。FastAPIのCORS既定値は `http://localhost:3000` と `http://127.0.0.1:3000` です。別ポート・別ホストのフロントを使う場合はバックエンドの `CORS_ORIGINS` にそのoriginを追加してください。認証は現状デモ用既定ユーザーで、ブラウザから秘密鍵やSupabase/LLMへ直接接続しません。

API呼び出しはタイムアウトを区別し、デッキ生成のみ60秒、通常リクエストは10秒とします。401/404/422/5xxは日本語の案内に統一し、422の詳細は `ApiError.details` に保持します。

結合実行にはバックエンドのDB接続設定とデッキ生成プロバイダーが必要です。ローカルに `backend/.env` がないため、実サービスを使った登録〜履歴反映の通し確認は未実施です。バックエンド環境が揃い次第、#24 のPRで実データのスモーク確認を行います。
