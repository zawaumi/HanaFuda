"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { dataSource, isApiError, type User } from "@/lib/api";
import styles from "./profile-editor.module.css";

type Values = { status: string; interests: string; recent: string; avoidTopics: string };
type State = "loading" | "ready" | "saving" | "error";

function toValues(user: User): Values {
  return {
    status: user.status,
    interests: user.interests.join("、"),
    recent: user.recent,
    avoidTopics: user.avoid_topics.join("、"),
  };
}

function splitList(value: string) {
  return value.split(/[、,\n]/).map((part) => part.trim()).filter(Boolean);
}

export function ProfileEditor() {
  const [state, setState] = useState<State>("loading");
  const [values, setValues] = useState<Values>({ status: "", interests: "", recent: "", avoidTopics: "" });
  const [saved, setSaved] = useState<Values | null>(null);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    void dataSource.getProfile().then((user) => {
      if (!active) return;
      const loaded = toValues(user);
      setValues(loaded);
      setSaved(loaded);
      setState("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      setMessage(isApiError(error) ? error.message : "プロフィールを読み込めませんでした。");
      setState("error");
    });
    return () => { active = false; };
  }, [reload]);

  const dirty = saved !== null && JSON.stringify(values) !== JSON.stringify(saved);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !dirty) return;
    const interests = splitList(values.interests);
    const avoid_topics = splitList(values.avoidTopics);
    if (values.status.length > 200 || values.recent.length > 500 || interests.length > 20 || avoid_topics.length > 20) {
      setMessage("文字数または項目数を確認してください。");
      return;
    }
    pending.current = true;
    setMessage("");
    setState("saving");
    try {
      const user = await dataSource.updateProfile({
        status: values.status.trim(), interests, recent: values.recent.trim(), avoid_topics,
      });
      const next = toValues(user);
      setValues(next);
      setSaved(next);
      setMessage("保存しました。");
    } catch (error) {
      setMessage(isApiError(error) ? error.message : "保存できませんでした。もう一度お試しください。");
    } finally {
      pending.current = false;
      setState("ready");
    }
  }

  if (state === "loading") return <p className={styles.notice} aria-busy="true">プロフィールを読み込み中…</p>;
  if (state === "error") return <div className={styles.notice} role="alert">{message} <button type="button" onClick={() => { setState("loading"); setReload((value) => value + 1); }}>もう一度試す</button></div>;

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">自分のプロフィール</h1>
      <form className={`${styles.form} surface`} onSubmit={submit}>
        <label>所属・立場<input className="field" value={values.status} maxLength={200} onChange={(event) => setValues({ ...values, status: event.target.value })} placeholder="例: 学生" disabled={state === "saving"} /></label>
        <label>興味 <small>読点またはカンマで区切る</small><textarea className="field" value={values.interests} onChange={(event) => setValues({ ...values, interests: event.target.value })} placeholder="例: 音楽、旅行" disabled={state === "saving"} /></label>
        <label>最近の活動<textarea className="field" value={values.recent} maxLength={500} onChange={(event) => setValues({ ...values, recent: event.target.value })} disabled={state === "saving"} /></label>
        <label>避けたい話題 <small>読点またはカンマで区切る</small><textarea className="field" value={values.avoidTopics} onChange={(event) => setValues({ ...values, avoidTopics: event.target.value })} disabled={state === "saving"} /></label>
        <div className={styles.footer}>
          <p aria-live="polite" role={message && message !== "保存しました。" ? "alert" : undefined}>{message || (dirty ? "未保存の変更があります。" : "変更はありません。")}</p>
          <button className="button button-primary" disabled={!dirty || state === "saving"} type="submit">{state === "saving" ? "保存中…" : "保存する"}</button>
        </div>
      </form>
    </div>
  );
}
