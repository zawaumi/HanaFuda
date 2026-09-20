# HanaFuda Frontend

HanaFudaのフロントエンドです。バックエンドとは独立して起動し、HTTP APIを通してのみ連携します。

## 必要な環境

- Node.js 22
- npm 10以上

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShellの場合:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。FastAPIは既定で `http://localhost:8000` を想定しています。

## コマンド

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバーを起動 |
| `npm run lint` | ESLintを実行 |
| `npm run typecheck` | TypeScriptの型検査 |
| `npm run check` | lintと型検査をまとめて実行 |
| `npm run build` | 本番ビルド |
| `npm run start` | ビルド済みアプリを起動 |

## ドキュメント

- [ドキュメント一覧](docs/README.md)
- [構成と責務](docs/architecture.md)
- [開発手順](docs/development.md)
- [API連携方針](docs/api-contract.md)

## 担当境界

このプロジェクトの作業範囲は `frontend/` 配下です。`backend/` は変更せず、API仕様の変更が必要な場合はチームで合意して共有仕様を更新します。
