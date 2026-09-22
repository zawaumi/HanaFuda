"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type CSSProperties, type FormEvent } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SeasonMark, seasonForIndex } from "@/lib/season";
import styles from "./auth-form.module.css";

type Mode = "login" | "signup";

const copy = {
  login: {
    season: 0,
    title: "おかえりなさい",
    lead: "メールアドレスとパスワードでログインします。",
    submit: "ログイン",
    pending: "ログイン中…",
    switchLead: "アカウントがまだありませんか？",
    switchLabel: "新規登録",
    switchHref: "/signup",
  },
  signup: {
    season: 2,
    title: "アカウントを作る",
    lead: "会話の相手と記録を、次回から引き継げるようになります。",
    submit: "登録する",
    pending: "登録中…",
    switchLead: "すでにアカウントをお持ちですか？",
    switchLabel: "ログイン",
    switchHref: "/login",
  },
} as const;

function messageFor(error: unknown) {
  if (!(error instanceof Error)) return "処理できませんでした。時間をおいて再度お試しください。";
  const text = error.message;
  if (text.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。";
  }
  if (text.includes("User already registered")) {
    return "このメールアドレスは登録済みです。ログインしてください。";
  }
  if (text.includes("Email not confirmed")) {
    return "メールの確認が済んでいません。届いたリンクを開いてください。";
  }
  if (text.includes("rate limit")) {
    return "試行が続いたため制限されました。しばらく待ってから再度お試しください。";
  }
  if (text.includes("Failed to fetch") || text.includes("NetworkError")) {
    return "Supabaseへ接続できませんでした。URLとネットワークを確認してください。";
  }
  return text;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = copy[mode];
  const season = seasonForIndex(text.season);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (!password) {
      setError("パスワードを入力してください。");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        // With email confirmation enabled Supabase returns no session.
        if (!data.session) {
          setCheckInbox(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }

      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setPending(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className={styles.page}>
        <section className={`${styles.card} ${styles.setup}`} role="alert">
          <h1>Supabaseが設定されていません</h1>
          <p>
            <code>frontend/.env.local</code> に <code>NEXT_PUBLIC_SUPABASE_URL</code> と
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> を設定し、開発サーバーを再起動してください。
          </p>
          <p className={styles.setupNote}>
            設定するまで、ログインが必要な画面は開けません。手順は <code>frontend/docs/auth.md</code> にあります。
          </p>
        </section>
      </div>
    );
  }

  if (checkInbox) {
    return (
      <div className={styles.page}>
        <section className={styles.card} aria-live="polite">
          <span className={styles.mark} aria-hidden="true"><SeasonMark season={season} /></span>
          <h1>確認メールを送りました</h1>
          <p>{email} 宛のリンクを開くと、登録が完了します。</p>
          <p className={styles.switch}>
            確認が済んだら <Link href="/login">ログイン</Link>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form
        className={styles.card}
        style={{ "--suit": season.color } as CSSProperties}
        onSubmit={handleSubmit}
        noValidate
      >
        <span className={styles.frame} aria-hidden="true" />
        <span className={styles.mark} aria-hidden="true"><SeasonMark season={season} /></span>

        <h1>{text.title}</h1>
        <p className={styles.lead}>{text.lead}</p>

        <label className={styles.field} htmlFor="auth-email">
          <span>メールアドレス</span>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setError(null); }}
            placeholder="you@example.com"
            disabled={pending}
          />
        </label>

        <label className={styles.field} htmlFor="auth-password">
          <span>パスワード</span>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => { setPassword(event.target.value); setError(null); }}
            placeholder={mode === "signup" ? "8文字以上" : "パスワード"}
            disabled={pending}
          />
        </label>

        <p className={styles.error} role="alert">{error ?? ""}</p>

        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? text.pending : text.submit}
        </button>

        <p className={styles.switch}>
          {text.switchLead} <Link href={text.switchHref}>{text.switchLabel}</Link>
        </p>
      </form>
    </div>
  );
}
