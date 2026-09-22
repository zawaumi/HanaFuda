# Supabaseファイル

- `migrations/0001_initial_schema.sql`: HanaFuda MVPのテーブル・制約・更新日時トリガー
- `migrations/0002_performance_indexes.sql`: B7.Sの一覧取得向け複合インデックス
- `migrations/0003_row_level_security.sql`: 既存環境にも適用できるRLS有効化とポリシー
- `seed.sql`: ローカルまたはデモ環境向けの任意の初期ユーザー

本番環境では、マイグレーションを適用した後に管理画面または安全な運用手順でユーザーを作成してください。`seed.sql` は本番データへ無条件に適用しないでください。
