"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { dataSource, isApiError, type Conversation, type Person, type PersonMemory, type User } from "@/lib/api";
import { loadDeckContextForPerson, saveDeckDraft } from "@/lib/deck-flow";
import styles from "./conversation-setup.module.css";

type Loaded = { user: User; person: Person; history: Conversation[]; memories: PersonMemory[] };
type LoadState = { status: "loading" } | { status: "ready"; data: Loaded } | { status: "error"; message: string };

export function ConversationSetup({ personId, initialSituation, resumeDraft }: { personId: string; initialSituation: string; resumeDraft: boolean }) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [purpose, setPurpose] = useState("");
  const [situation, setSituation] = useState(initialSituation);
  const [extra, setExtra] = useState("");
  const [errors, setErrors] = useState<{ purpose?: string; situation?: string }>({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!resumeDraft) return;
    const context = loadDeckContextForPerson(personId);
    if (!context) return;
    queueMicrotask(() => {
      setPurpose(context.purpose);
      setSituation(context.situation);
      setExtra(context.extra);
    });
  }, [personId, resumeDraft]);

  useEffect(() => {
    let active = true;
    void Promise.all([dataSource.getProfile(), dataSource.getPerson(personId), dataSource.getConversations({ personId }), dataSource.getPersonMemories(personId)])
      .then(([user, person, history, memories]) => { if (active) setLoad({ status: "ready", data: { user, person, history, memories } }); })
      .catch((error: unknown) => { if (active) setLoad({ status: "error", message: isApiError(error) ? error.message : "情報を読み込めませんでした。" }); });
    return () => { active = false; };
  }, [personId, reload]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (load.status !== "ready") return;
    const next = { purpose: purpose.trim() ? undefined : "会話の目的を入力してください。", situation: situation.trim() ? undefined : "会う状況を入力してください。" };
    setErrors(next);
    if (next.purpose || next.situation) return;
    saveDeckDraft({ user: load.data.user, person: load.data.person, history: load.data.history, memories: load.data.memories, context: { purpose: purpose.trim(), situation: situation.trim(), extra: extra.trim() } });
    router.push("/deck/generating");
  }

  if (load.status === "loading") return <p className={styles.notice} aria-busy="true">会話設定を読み込み中…</p>;
  if (load.status === "error") return <div className={styles.notice} role="alert">{load.message} <button type="button" onClick={() => { setLoad({ status: "loading" }); setReload((value) => value + 1); }}>もう一度試す</button> <Link href="/connections">つながりへ戻る</Link></div>;

  return <div className={styles.page}>
    <header className="page-header"><p className="eyebrow">Conversation setup</p><h1>{load.data.person.name}との会話を準備</h1><p>{load.data.person.relationship}。分かる範囲で今回の状況を入力してください。</p></header>
    <form className={`${styles.form} surface`} onSubmit={submit} noValidate>
      <div className={styles.person}><strong>相手について知っていること</strong><p>{load.data.person.known_information || "まだ登録されていません。"}</p></div>
      <label>会話の目的<span>必須</span><input className="field" value={purpose} maxLength={300} onChange={(event) => setPurpose(event.target.value)} placeholder="例: 近況を聞く" aria-invalid={Boolean(errors.purpose)} aria-describedby="purpose-error" /></label>
      <p className={styles.error} id="purpose-error">{errors.purpose}</p>
      <label>会う場所・状況<span>必須</span><textarea className="field" value={situation} maxLength={500} onChange={(event) => setSituation(event.target.value)} placeholder="例: イベント会場で初めて会う" aria-invalid={Boolean(errors.situation)} aria-describedby="situation-error" /></label>
      <p className={styles.error} id="situation-error">{errors.situation}</p>
      <label>補足・避けたい話題<small>任意</small><textarea className="field" value={extra} maxLength={1000} onChange={(event) => setExtra(event.target.value)} placeholder="例: 質問攻めにしない。仕事の話は避ける" /></label>
      {load.data.user.avoid_topics.length > 0 && <p className={styles.hint}>プロフィールで設定した避けたい話題: {load.data.user.avoid_topics.join("、")}</p>}
      <div className={styles.actions}><Link href={`/connections/${personId}`}>戻る</Link><button className="button button-primary" type="submit">話題を生成する</button></div>
    </form>
  </div>;
}
