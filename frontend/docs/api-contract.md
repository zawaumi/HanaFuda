# FastAPI連携方針

## 境界

フロントエンドとバックエンドの結合点はHTTP APIとJSONだけです。フロントエンドからSupabaseやLLM APIを直接呼び出しません。

## ベースURL

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 通信ルール

- APIパスは `/api` から始める
- JSONのキー名はsnake_caseで受け取る
- リクエストには `Content-Type: application/json` を指定する
- 認証方式決定後はAPIクライアントで認証情報を一括付与する
- タイムアウト、ネットワークエラー、非2xxレスポンスを区別する
- 画面には利用者が次の操作を判断できる日本語メッセージを出す

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
| `POST` | `/api/persons/{person_id}/memories` | 記憶保存 |
| `GET` / `PATCH` | `/api/profile` | 自分のプロフィール |

FastAPIのOpenAPIが利用可能になったら、リクエスト・レスポンスの型を照合し、この文書との差分を解消してから画面へ接続します。
