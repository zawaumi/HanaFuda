# 会話デッキ生成 API 契約

対象エンドポイントは `POST /api/deck/generate` です。FastAPI側は `DeckGenerateRequest` と `DeckGenerateResponse` を使用し、OpenAPIをフロントエンドとの正とします。

## リクエスト

```json
{
  "user": {
    "name": "田中",
    "status": "大学生",
    "interests": ["映画", "カフェ巡り"],
    "recent": "ハッカソンに参加している",
    "avoid_topics": ["政治"]
  },
  "person": {
    "id": "31a0e42d-7bc3-486f-b474-a376bd88d8e2",
    "name": "佐藤さん",
    "relationship": "同じイベントの参加者",
    "known_information": "Web開発をしている"
  },
  "context": {
    "purpose": "雑談",
    "situation": "ハッカソン会場で休憩中",
    "extra": "初対面なので、答えやすい話題から始めたい"
  },
  "history": [
    {
      "created_at": "2026-09-20T10:00:00+09:00",
      "purpose": "雑談",
      "situation": "大学のイベント",
      "extra": "",
      "rating": "good",
      "memo": "好きな映画について話した",
      "memories": [
        {
          "content": "SF映画が好き",
          "created_at": "2026-09-20T10:10:00+09:00"
        }
      ]
    }
  ]
}
```

- `person` は任意です。未指定なら「さくっと話題」用の生成として扱えます。
- `history` は過去の会話と確認済みの記憶だけを渡します。
- JSONキーはすべて snake_case です。

## レスポンス

```json
{
  "summary": "イベントという共通状況から入ると自然です。",
  "cards": [
    {
      "topic": "参加のきっかけ",
      "starter": "今回のハッカソンは、どんなきっかけで参加されたんですか？",
      "reason": "今いる場に関する話題なので初対面でも聞きやすいためです。",
      "branches": [
        {
          "condition": "相手が具体的な目的を話してくれた場合",
          "next": "そのために、どんなものを作ろうと考えているんですか？"
        }
      ]
    }
  ]
}
```

- `cards` は必ず3〜5枚です。
- 各カードは少なくとも1件の `branches` を持ちます。
- `reason` はAPIで返すものの、UIの初期表示では隠して構いません。
