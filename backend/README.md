# BackEnd

## AI（OrcaRouter）接続設定

AI連携の設定は `backend/.env` に保存します。APIキーはGitへ登録しません。

```CMD
cd backend
copy .env.example .env
```

作成した `.env` の `ORCAROUTER_API_KEY` を、OrcaRouter dashboardで発行した値に置き換えてください。通常は `ORCAROUTER_BASE_URL` と `ORCAROUTER_MODEL` は変更不要です。

設定後、次のコマンドでOrcaRouterに短いテストメッセージを1回だけ送れます。このコマンドは外部APIを呼ぶため、利用料金または利用回数の制限が適用される場合があります。

Windowsでは既存の `uvloop` 依存が非対応のため、現時点では次の最小依存を使った確認コマンドを使用してください。

```powershell
uv run --no-project --python 3.12 --with httpx==0.28.1 --with pydantic-settings==2.11.0 python scripts/check_orca_router.py
```

AI連携コードは `ai/orca_client.py` にあります。FastAPIのルートから利用する処理は、API実装時にこのクライアントを呼び出します。

## FastAPIの起動方法

### 1. バックエンドディレクトリへ移動
```CMD
cd backend
```
### 2. 依存関係をインストール

本プロジェクトでは、Pythonのパッケージ管理に uv を使用しています。
```CMD
uv sync
```
### 3. FastAPIを起動
```CMD
uv run fastapi dev
```
起動後、以下からAPIドキュメント（Swagger UI）を確認できます。

http://127.0.0.1:8000/docs

サーバーを終了する場合は、ターミナルで Ctrl + C を入力してください。
