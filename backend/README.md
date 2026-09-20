# BackEnd
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