# Supabaseファイル

- `migrations/0001_initial_schema.sql`: HanaFuda MVPのテーブル・制約・更新日時トリガー・RLS
- `migrations/0002_performance_indexes.sql`: B7.Sの一覧取得向け複合インデックス
- `seed.sql`: ローカルまたはデモ環境向けの任意の初期ユーザー

本番環境では、マイグレーションを適用した後に管理画面または安全な運用手順でユーザーを作成してください。`seed.sql` は本番データへ無条件に適用しないでください。
