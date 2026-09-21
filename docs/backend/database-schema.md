# HanaFuda バックエンドDBスキーマ

Supabase PostgreSQLで管理するMVPの正規スキーマです。実際に適用するSQLは [`backend/supabase/migrations/0001_initial_schema.sql`](../../backend/supabase/migrations/0001_initial_schema.sql) にあります。

## テーブル

| テーブル | 役割 | 主なリレーション |
| --- | --- | --- |
| `users` | 自分のプロフィール | 1:N `persons`, `conversations` |
| `persons` | 会話相手 | N:1 `users`, 1:N `person_memories` |
| `conversations` | 会話条件・結果 | N:1 `users`, N:1 `persons` |
| `decks` | 生成した話題デッキ | N:1 `conversations` |
| `person_memories` | ユーザーが確認した記憶 | N:1 `persons`, 任意で `conversations` |

## 設計ルール

- すべての識別子はUUID、時刻はUTCの` timestamptz`です。
- `persons.user_id` と `conversations.user_id` でユーザー単位のデータ分離を行います。
- 相手を削除すると、その相手の記憶は削除されます。会話は相手削除後も履歴を残せるよう`person_id`をNULLにします。
- `conversations.rating` は `good` / `normal` / `poor` の3値です。
- `decks.cards` はAPI契約と同形のJSON配列を保存します。
- APIから受け付ける文字列長・必須条件は、`backend/schemas/` のPydanticモデルで検証します。

## 適用方法

Supabase DashboardのSQL Editorでマイグレーションを実行してください。運用環境ではSupabase CLIなど、実行履歴を管理できる方法で適用します。
