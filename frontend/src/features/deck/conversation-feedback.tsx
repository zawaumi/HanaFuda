"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { dataSource, isApiError, type Conversation, type ConversationRating, type GenerateDeckInput } from "@/lib/api";
import { loadDeckDraft, loadDeckResult } from "@/lib/deck-flow";
import styles from "./conversation-feedback.module.css";

const ratings: { value: ConversationRating; label: string }[] = [
  { value: "good", label: "よかった" }, { value: "normal", label: "ふつう" }, { value: "poor", label: "難しかった" },
];

export function ConversationFeedback() {
  const [draft, setDraft] = useState<GenerateDeckInput | null>(null);
  const [ready, setReady] = useState(false);
  const [rating, setRating] = useState<ConversationRating | null>(null);
  const [memo, setMemo] = useState("");
  const [candidate, setCandidate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const pending = useRef(false);
  const savedConversation = useRef<Conversation | null>(null);

  useEffect(() => { queueMicrotask(() => { setDraft(loadDeckDraft()); setReady(true); }); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !draft) return;
    if (!rating) { setRatingError("評価を選択してください。"); return; }
    if (confirmed && !candidate.trim()) { setError("保存する記憶の内容を入力してください。"); return; }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      if (!savedConversation.current) {
        savedConversation.current = await dataSource.createConversation({
          person_id: draft.person?.id ?? null,
          purpose: draft.context.purpose,
          situation: draft.context.situation,
          extra: draft.context.extra,
          rating,
          memo: memo.trim() || null,
        });
      }
      if (confirmed && draft.person) {
        await dataSource.createPersonMemory(draft.person.id, {
          content: candidate.trim(), source_conversation_id: savedConversation.current.id, confirmed: true,
        });
      }
      setSaved(true);
    } catch (reason) {
      setError(isApiError(reason) ? reason.message : "保存できませんでした。もう一度お試しください。");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  if (!ready) return <p aria-busy="true">会話記録を読み込み中…</p>;
  if (!draft || !loadDeckResult()) return <section className={`${styles.panel} surface`}><h1>会話デッキがありません</h1><Link href="/connections">つながりへ戻る</Link></section>;
  if (saved) return <section className={`${styles.panel} surface`} aria-live="polite"><h1>会話を記録しました</h1><p>次の会話の準備に、この記録を使えます。</p><div className={styles.actions}><Link className="button button-primary" href="/">ホームへ戻る</Link>{draft.person && <Link href={`/connections/${draft.person.id}`}>相手の詳細を見る</Link>}</div></section>;

  return <div className={styles.page}>
    <h1 className="visually-hidden">会話を振り返る</h1>
    <form className={`${styles.form} surface`} onSubmit={submit} noValidate>
      <fieldset disabled={saving}><legend>会話はどうでしたか？</legend><div className={styles.ratings}>{ratings.map((option) => <label key={option.value}><input type="radio" name="rating" checked={rating === option.value} onChange={() => { setRating(option.value); setRatingError(""); }} /><span>{option.label}</span></label>)}</div></fieldset>
      {ratingError && <p className={styles.error} role="alert">{ratingError}</p>}
      <label className={styles.field}>会話のメモ <small>任意</small><textarea className="field" value={memo} maxLength={2000} onChange={(event) => setMemo(event.target.value)} placeholder="話したことや、次回聞きたいこと" disabled={saving} /></label>
      {draft.person && <div className={styles.memory}><label className={styles.field}>相手について新しく覚えたこと <small>任意</small><textarea className="field" value={candidate} maxLength={1000} onChange={(event) => setCandidate(event.target.value)} placeholder="例: 最近ギターを始めた" disabled={saving} /></label><label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={saving} />内容を確認し、相手の記憶として保存する</label></div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><Link href="/deck/session">デッキへ戻る</Link><button className="button button-primary" type="submit" disabled={saving}>{saving ? "保存中…" : "会話を保存する"}</button></div>
    </form>
  </div>;
}
