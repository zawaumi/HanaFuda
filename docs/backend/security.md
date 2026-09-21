# バックエンドセキュリティ方針

- Supabaseキー、OrcaRouterキーは `SecretStr` で読み込み、レスポンス・ログ・リポジトリへ出力しません。
- `backend/.env` はGit管理対象外です。CIやホスティングではSecretとして設定します。
- SupabaseのテーブルはRLSを有効化し、直接クライアントからアクセスする場合は`auth.uid()`単位で制限します。バックエンドの書き込みにはserver-only keyを使用します。
- CORSの許可Origin、Host、HTTPメソッド、ヘッダーは環境変数で明示指定します。ワイルドカードOriginは使用しません。
- 入力値はPydanticで検証し、予期しない例外の詳細はクライアントへ返しません。
- 現在のMVPは認証方式の決定前のため、`X-User-ID`または`DEFAULT_USER_ID`をデモ用ユーザー識別子として利用します。本番公開前にSupabase Auth JWT検証へ切り替え、デモ識別子を無効化してください。
