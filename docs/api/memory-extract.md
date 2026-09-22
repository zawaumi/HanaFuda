# 記憶候補のAI抽出契約

会話後の評価とメモから、ユーザーが確認して保存するための記憶候補を最大1件生成するAI担当の契約です。AIはDBへ保存しません。候補の保存は、既存の `POST /api/persons/{person_id}/memories` を使います。

## AIサービスの入出力

AIサービスは `MemoryExtractionRequest` を受け、`MemoryExtractionResponse` を返します。

```json
{
  "person": {
    "name": "佐藤さん",
    "known_information": "映画が好き"
  },
  "conversation": {
    "purpose": "雑談",
    "situation": "大学の交流会",
    "extra": "初対面に近い",
    "rating": "good",
    "memo": "佐藤さんは最近ギターを始めたと話していた。"
  }
}
```

```json
{
  "candidate": "最近ギターを始めた"
}
```

保存に適した内容がなければ、候補は `null` です。

```json
{
  "candidate": null
}
```

## 抽出ルール

- 候補は最大1件です。A担当のフィードバック画面にある単一の確認欄へそのまま表示できます。
- AIはメモなど入力に明示された事実だけを使います。推測、既知情報との重複、会話の評価だけの内容は候補にしません。
- 健康・政治・宗教・金融・住所など、保存に慎重さが必要な内容は候補にしません。
- ユーザーの確認なしに保存しません。

## B担当の接続手順

FastAPIルートはB担当が実装します。推奨パスは `POST /api/persons/{person_id}/memories/extract` です。

1. `person_id` から本人の `name` と `known_information` を取得する。
2. リクエスト本文の会話フィードバックと合わせ、`MemoryExtractionRequest` を組み立てる。
3. `OrcaRouterMemoryExtractor().extract(request)` を呼ぶ。
4. `MemoryExtractionResponse` をそのまま返す。`MemoryExtractionError` は既存のAI生成と同様に `502` とする。
5. A担当が候補を表示・編集し、確認済みの場合だけ既存の記憶保存APIへ `content` と会話IDを送る。

この抽出APIは候補の生成だけを担い、会話・記憶のDB保存は行いません。
