"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dataSource, isApiError, type Conversation, type Person, type PersonMemory } from "@/lib/api";
import styles from "./conversation-history.module.css";

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; conversations: Conversation[]; persons: Map<string, Person>; memories: PersonMemory[] };

async function loadHistory(): Promise<Extract<HistoryState, { status: "ready" }>> {
  const [conversations, persons] = await Promise.all([
    dataSource.getConversations(),
    dataSource.getPersons(),
  ]);
  const personIds = [...new Set(conversations.map((item) => item.person_id).filter((id): id is string => Boolean(id)))];
  const memories = (await Promise.all(personIds.map((id) => dataSource.getPersonMemories(id)))).flat();
  return {
    status: "ready",
    conversations: conversations.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    persons: new Map(persons.map((person) => [person.id, person])),
    memories,
  };
}

function ratingLabel(rating: Conversation["rating"]) {
  if (rating === "good") return "よかった";
  if (rating === "normal") return "ふつう";
  if (rating === "poor") return "難しかった";
  return "未評価";
}

export function ConversationHistory() {
  const [state, setState] = useState<HistoryState>({ status: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadHistory().then((result) => {
      if (!cancelled) setState(result);
    }).catch((error: unknown) => {
      if (!cancelled) setState({ status: "error", message: isApiError(error) ? error.message : "履歴を読み込めませんでした。" });
    });
    return () => { cancelled = true; };
  }, [reload]);

  return (
    <div className="page-stack">
      <h1 className="visually-hidden">会話履歴</h1>
      {state.status === "loading" ? <section className="surface empty-state" aria-busy="true"><h2>履歴を読み込み中…</h2></section> : null}
      {state.status === "error" ? (
        <section className="surface empty-state" role="alert">
          <h2>読み込みに失敗しました</h2><p>{state.message}</p>
          <button className="button button-primary" onClick={() => { setState({ status: "loading" }); setReload((value) => value + 1); }}>もう一度試す</button>
        </section>
      ) : null}
      {state.status === "ready" && state.conversations.length === 0 ? (
        <section className="surface empty-state">
          <h2>会話履歴はまだありません</h2>
          <p>相手との会話を記録すると、ここに表示されます。</p>
          <Link className="button button-primary" href="/connections">つながりを見る</Link>
        </section>
      ) : null}
      {state.status === "ready" && state.conversations.length > 0 ? (
        <ol className={styles.list} aria-label="会話履歴">
          {state.conversations.map((conversation) => {
            const person = conversation.person_id ? state.persons.get(conversation.person_id) : undefined;
            const memories = state.memories.filter((memory) => memory.source_conversation_id === conversation.id && memory.confirmed);
            return <li className={`${styles.item} surface`} key={conversation.id}>
              <div className={styles.heading}>
                <div><time dateTime={conversation.created_at}>{new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(conversation.created_at))}</time><h2>{person?.name ?? "相手未設定"}</h2></div>
                <span className={styles.rating}>{ratingLabel(conversation.rating)}</span>
              </div>
              <dl className={styles.details}>
                <div><dt>話題・目的</dt><dd>{conversation.purpose || "記録なし"}</dd></div>
                {conversation.memo ? <div><dt>振り返り</dt><dd>{conversation.memo}</dd></div> : null}
                {memories.length > 0 ? <div><dt>新しく記録したこと</dt><dd><ul>{memories.map((memory) => <li key={memory.id}>{memory.content}</li>)}</ul></dd></div> : null}
              </dl>
              {person ? <Link className={styles.link} href={`/connections/${person.id}`}>{person.name}さんの詳細を見る <span aria-hidden="true">›</span></Link> : null}
            </li>;
          })}
        </ol>
      ) : null}
    </div>
  );
}
