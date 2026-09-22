# HanaFuda

HanaFudaは、相手との関係や過去の会話を踏まえて、次に話す内容を準備するAI会話デッキです。

## 構成

- `frontend/`: Next.jsの画面とAPIクライアント（フロントエンド担当）
- `backend/`: FastAPI、Supabase、OrcaRouter連携（バックエンド担当）
- `docs/`: 共有仕様とAPI契約

フロントエンドとバックエンドの結合点はHTTP APIとsnake_caseのJSONだけです。バックエンドから`frontend/`のコードは変更しません。

## バックエンドを始める

### 必要なもの

- Python 3.9以上
- [uv](https://docs.astral.sh/uv/)
- Supabaseプロジェクト
- デッキ生成を使う場合はOrcaRouterのAPIキー

### セットアップ

```bash
cd backend
cp .env.example .env
uv sync
```

`.env`へ`SUPABASE_URL`と`SUPABASE_SERVICE_ROLE_KEY`（または`SUPABASE_KEY`）を設定します。OrcaRouterを使う場合は`ORCAROUTER_API_KEY`も設定します。キーはコミットしません。

Supabase DashboardのSQL Editorで[`backend/supabase/migrations/0001_initial_schema.sql`](backend/supabase/migrations/0001_initial_schema.sql)を実行してください。任意でデモユーザーを作る場合は[`backend/supabase/seed.sql`](backend/supabase/seed.sql)を使います。

### 起動・確認

```bash
cd backend
uv run fastapi dev main.py
```

- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI JSON: <http://127.0.0.1:8000/openapi.json>
- Liveness: <http://127.0.0.1:8000/health/live>
- Readiness（Supabase接続確認）: <http://127.0.0.1:8000/health/ready>

Supabase未設定でもテストは実行できます。テストはインメモリリポジトリと外部APIモックを使います。

```bash
cd backend
uv run ruff check .
uv run pytest -q
```

## フロントエンドから接続する

`frontend/.env.local`に次を設定し、バックエンドとフロントエンドを別ターミナルで起動します。

```env
NEXT_PUBLIC_API_MODE=remote
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

開発環境の許可Originは`backend/.env`の`CORS_ORIGINS`で管理します。APIの詳細は[`docs/api/backend-api.md`](docs/api/backend-api.md)、デッキ生成の契約は[`docs/api/deck-generate.md`](docs/api/deck-generate.md)を参照してください。

## APIの概要

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` / `PATCH` | `/api/profile` | 自分のプロフィール |
| `GET` / `POST` | `/api/persons` | 相手一覧・登録 |
| `GET` / `PATCH` | `/api/persons/{person_id}` | 相手情報 |
| `GET` / `POST` | `/api/conversations` | 会話履歴・結果 |
| `POST` | `/api/persons/{person_id}/memories` | 確認済み記憶 |
| `POST` | `/api/deck/generate` | AI会話デッキ生成 |

認証方式が確定するまでのMVPでは、任意の`X-User-ID` UUIDヘッダー、または`DEFAULT_USER_ID`をデモ用識別子として使います。本番公開前にSupabase Auth JWT検証へ切り替えてください。詳しくは[`docs/backend/security.md`](docs/backend/security.md)を参照してください。

## 本番運用

Dockerを使わないPythonホスティング向けの設定例として[`render.yaml`](render.yaml)を用意しています。`SUPABASE_SERVICE_ROLE_KEY`、`ORCAROUTER_API_KEY`、`CORS_ORIGINS`、`ALLOWED_HOSTS`はホスティング側のSecretとして設定します。

Pull Requestと`develop`/`main`への変更では[Backend Actions](.github/workflows/backend.yml)が、ロック済み依存関係・Ruff・pytestを確認します。デプロイ手順は[`docs/backend/deployment.md`](docs/backend/deployment.md)を参照してください。

この作業範囲ではDockerfile・`.dockerignore`・Docker起動手順は追加していません。Docker対応はB6.1担当ブランチの範囲です。

## 仕様

プロダクト仕様は[`docs/talkdeck_spec_v0.2.md`](docs/talkdeck_spec_v0.2.md)、DB設計は[`docs/backend/database-schema.md`](docs/backend/database-schema.md)にあります。
