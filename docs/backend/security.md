# バックエンドセキュリティ方針

- Supabaseキー、OrcaRouterキーは `SecretStr` で読み込み、レスポンス・ログ・リポジトリへ出力しません。
- `backend/.env` はGit管理対象外です。CIやホスティングではSecretとして設定します。
- SupabaseのテーブルはRLSを有効化し、直接クライアントからアクセスする場合は`auth.uid()`単位で制限します。バックエンドの書き込みにはserver-only keyを使用します。
- CORSの許可Origin、Host、HTTPメソッド、ヘッダーは環境変数で明示指定します。ワイルドカードOriginは使用しません。
- 入力値はPydanticで検証し、予期しない例外の詳細はクライアントへ返しません。
- 本番では`Authorization: Bearer <access_token>`を必須とし、Supabase Authの`get_user`でトークンを検証してユーザーIDを決定します。認証失敗時は401を返し、`X-User-ID`へフォールバックしません。
- `X-User-ID`と`DEFAULT_USER_ID`はローカル接続用の`AUTH_MODE=legacy`でだけ有効です。本番の`AUTH_MODE`は`jwt`に固定します。
- 認証結果はトークン本文ではなくハッシュをキーとして最大30秒・最大1024件までメモリキャッシュします。失効反映までの時間を短く保ちつつ、リクエストごとのAuth API呼び出しを避けます。
- APIレスポンスには`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`を付与し、APIデータは`Cache-Control: no-store`でキャッシュさせません。本番ではHSTSも付与します。
