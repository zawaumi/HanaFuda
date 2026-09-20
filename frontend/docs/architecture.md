# フロントエンド構成

## 技術スタック

- Next.js 16（App Router）
- React 19
- TypeScript（strict）
- Tailwind CSS 4
- ESLint

## ディレクトリ方針

```text
frontend/
├─ docs/                 # フロントエンド固有のドキュメント
├─ public/               # 静的ファイル
├─ src/
│  ├─ app/               # ルート、レイアウト、ページ
│  ├─ components/        # 複数機能で共有するUI
│  ├─ features/          # 機能単位のUI・状態・処理
│  └─ lib/               # APIクライアント、データ取得境界、関連する型
├─ .env.example          # 環境変数のサンプル
└─ package.json
```

`components`、`features`、`lib` は必要になった時点で作成します。空の抽象化や、用途の決まっていない共通化は追加しません。API契約の型は利用箇所と変更理由が同じため、`src/lib/api/types.ts` にまとめます。

## 依存方向

```text
app → features → components
       └───────→ lib → FastAPI
API契約型は各層から参照可能
```

- ページは画面構成を担当し、複雑なロジックを持たせない
- 機能固有の処理は `features` に置く
- 再利用する表示部品だけを `components` に置く
- FastAPIへの通信処理は `lib` に集約する
- `backend/` のコードやDBへ直接依存しない

## ルーティング予定

| パス | 画面 |
|---|---|
| `/` | ホーム |
| `/connections` | つながり一覧 |
| `/connections/new` | 相手登録 |
| `/connections/[id]` | 相手詳細 |
| `/connections/[id]/deck/new` | 会話設定 |
| `/deck/[id]` | 会話デッキ |
| `/deck/[id]/feedback` | 会話記録 |
| `/history` | 会話履歴 |
| `/profile` | 自分のプロフィール |

URLは実装時の仮決定です。バックエンドAPIのパスとは独立して管理します。
