# 開発手順

## 初回セットアップ

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShellでは `cp` の代わりに次を使います。

```powershell
Copy-Item .env.example .env.local
```

## 環境変数

| 変数 | 必須 | 説明 |
|---|---:|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | FastAPIのベースURL |

秘密情報やLLMのAPIキーはフロントエンドへ置きません。`NEXT_PUBLIC_` が付く値はブラウザから参照可能です。

## 日常の開発

1. `develop` の最新状態から機能ブランチを作る
2. `frontend/` 配下だけを変更する
3. 必要に応じてドキュメントも更新する
4. PR前に検査を実行する

```bash
npm run check
npm run build
```

## ブランチ名の例

- `feature/frontend-home`
- `feature/frontend-connections`
- `fix/frontend-deck-loading`
- `docs/frontend-api-contract`

## バックエンドが未完成の場合

- APIレスポンスと同じ型のモックデータを使う
- モックと実APIを画面コンポーネント内で分岐させない
- APIクライアントまたはデータ取得層で差し替える
- API契約の不明点は独自判断で固定せず、チームへ確認する
