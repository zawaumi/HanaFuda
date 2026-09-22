"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepCards, type StepCard } from "@/components/step-cards";
import { dataSource, isApiError, type Conversation, type Person, type PersonMemory, type User } from "@/lib/api";
import { loadDeckContextForPerson, saveDeckDraft } from "@/lib/deck-flow";
import styles from "./conversation-setup.module.css";

type Loaded = { user: User; person: Person; history: Conversation[]; memories: PersonMemory[] };
type LoadState = { status: "loading" } | { status: "ready"; data: Loaded } | { status: "error"; message: string };

const steps: StepCard[] = [
  {
    id: "purpose",
    prompt: "今回の会話で、何をしたいですか？",
    label: "会話の目的",
    helper: "話したいこと、聞きたいことを一言で。",
    placeholder: "例: 近況を聞く",
    maxLength: 300,
    required: true,
  },
  {
    id: "situation",
    prompt: "どんな場所・状況で会いますか？",
    label: "会う場所・状況",
    helper: "場の雰囲気や、話せる時間の長さも書けます。",
    placeholder: "例: イベント会場で初めて会う",
    maxLength: 500,
    required: true,
    multiline: true,
  },
  {
    id: "extra",
    prompt: "避けたい話題や、補足はありますか？",
    label: "補足・避けたい話題",
    helper: "空欄でも進めます。",
    placeholder: "例: 質問攻めにしない。仕事の話は避ける",
    maxLength: 1000,
    required: false,
    multiline: true,
  },
];

const requiredMessages: Record<string, string> = {
  purpose: "会話の目的を入力してください。",
  situation: "会う状況を入力してください。",
};

export function ConversationSetup({ personId, initialSituation, resumeDraft }: { personId: string; initialSituation: string; resumeDraft: boolean }) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [values, setValues] = useState<Record<string, string>>({ situation: initialSituation });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!resumeDraft) return;
    const context = loadDeckContextForPerson(personId);
    if (!context) return;
    queueMicrotask(() => {
      setValues({ purpose: context.purpose, situation: context.situation, extra: context.extra });
    });
  }, [personId, resumeDraft]);

  useEffect(() => {
    let active = true;
    void Promise.all([dataSource.getProfile(), dataSource.getPerson(personId), dataSource.getConversations({ personId }), dataSource.getPersonMemories(personId)])
      .then(([user, person, history, memories]) => { if (active) setLoad({ status: "ready", data: { user, person, history, memories } }); })
      .catch((error: unknown) => { if (active) setLoad({ status: "error", message: isApiError(error) ? error.message : "情報を読み込めませんでした。" }); });
    return () => { active = false; };
  }, [personId, reload]);

  function handleChange(id: string, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => ({ ...current, [id]: undefined }));
  }

  function checkStep(id: string) {
    const message = (values[id] ?? "").trim() ? undefined : requiredMessages[id];
    setErrors((current) => ({ ...current, [id]: message }));
    return message;
  }

  function complete() {
    if (load.status !== "ready") return;
    saveDeckDraft({
      user: load.data.user,
      person: load.data.person,
      history: load.data.history,
      memories: load.data.memories,
      context: {
        purpose: (values.purpose ?? "").trim(),
        situation: (values.situation ?? "").trim(),
        extra: (values.extra ?? "").trim(),
      },
    });
    router.push("/deck/generating");
  }

  if (load.status === "loading") return <p className={styles.notice} aria-busy="true">会話設定を読み込み中…</p>;
  if (load.status === "error") return <div className={styles.notice} role="alert">{load.message} <button type="button" onClick={() => { setLoad({ status: "loading" }); setReload((value) => value + 1); }}>もう一度試す</button> <Link href="/connections">つながりへ戻る</Link></div>;

  return <div className={styles.page}>
    <h1 className="visually-hidden">{load.data.person.name}との会話を準備</h1>
    <StepCards
      steps={steps}
      values={values}
      errors={errors}
      onChange={handleChange}
      checkStep={checkStep}
      onComplete={complete}
      submitting={false}
      submitLabel="話題を生成する"
      cancel={<Link className={styles.textLink} href={`/connections/${personId}`}>戻る</Link>}
      leading={<div className={styles.person}>
        <strong>{load.data.person.name}について知っていること</strong>
        <p>{load.data.person.known_information || "まだ登録されていません。"}</p>
      </div>}
      banner={load.data.user.avoid_topics.length > 0
        ? <p className={styles.hint}>プロフィールで設定した避けたい話題: {load.data.user.avoid_topics.join("、")}</p>
        : null}
    />
  </div>;
}
