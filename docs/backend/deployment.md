# バックエンドのデプロイ

このリポジトリでは、Dockerを使わずにPythonランタイムを提供するホスティングへデプロイできる設定例として `render.yaml` を用意しています。実際のサービス作成・ドメイン設定・Secret登録は運用者のRenderアカウントで行います。

## 必須設定

ホスティングのSecretとして次を登録します。

- `CORS_ORIGINS`: 公開フロントエンドのOriginのみ
- `ALLOWED_HOSTS`: 公開APIホスト名のみ
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ORCAROUTER_API_KEY`

`SUPABASE_SERVICE_ROLE_KEY` と `ORCAROUTER_API_KEY` はログやリポジトリへ保存しません。

## 確認

- `GET /health/live`: プロセスが起動しているか
- `GET /health/ready`: Supabaseまで到達できるか
- `/docs`: OpenAPI/Swagger UI

デプロイ後は、公開OriginからCORS preflight、プロフィール取得、デッキ生成を確認します。外部API障害時にデプロイ済みのAPIが機密情報を返さないことも確認してください。
